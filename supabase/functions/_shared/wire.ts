/* ============================================================
   wire.ts — WIRE.mn төлбөрийн гарцын адаптер (Deno / Edge Function)
   ------------------------------------------------------------
   docs.wire.mn (2026-10-10-нд тулгасан):
     Base URL      https://api.wire.mn/v1
     Auth          Authorization: Bearer sk_test_… | sk_live_…
     Idempotency   бүх POST-д "Idempotency-Key" толгой ЗААВАЛ
     Дүн           бага нэгжээр: 50000 = 500.00₮  (⇒ 5,000₮ = 500000)
     1) POST /payment_intents {amount,currency:"MNT",description,allowed_operators,metadata}
          → {id:"pi_…",status:"requires_payment_method",…}
     2) POST /checkout/sessions {payment_intent, success_url, cancel_url} → {id:"cs_…", url}
     Төлөв         GET /payment_intents/{id} → status: new | requires_payment_method | requires_action |
                   requires_capture | processing | succeeded | canceled
     Intent TTL    10 минут
     Webhook       POST /webhook_endpoints {url, enabled_events[]} → secret "whsec_…" (зөвхөн нэг удаа);
                   толгой WirePayment-Signature: t=<sec>,v1=<hex>; v1 = HMAC-SHA256(secret, t + "." + rawBody)
                   эвент {id, type:"payment_intent.succeeded", data:<PaymentIntent>}; "endpoint.verification" → 2xx
     Тест          sk_test_ + allowed_operators:["sandbox"]; дүн 42 → amount_too_small, 42424 → timeout
   ============================================================ */
const BASE_URL = Deno.env.get("WIRE_BASE_URL") ?? "https://api.wire.mn/v1";
const AMOUNT_MULT = 100;
const SIG_HEADER = "wirepayment-signature";
const TOLERANCE_SEC = 300;

export class WireError extends Error {
  status: number; code: string | null; body: unknown;
  constructor(msg: string, status: number, code: string | null, body: unknown) { super(msg); this.status = status; this.code = code; this.body = body; }
}

async function wireFetch(secretKey: string, method: string, path: string, body?: unknown, idemKey?: string): Promise<any> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${secretKey}` };
  if (idemKey) headers["Idempotency-Key"] = idemKey.slice(0, 255);
  const res = await fetch(BASE_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const code = json?.code ?? json?.error?.code ?? json?.error?.type ?? null;
    throw new WireError(`WIRE ${method} ${path} → HTTP ${res.status}${code ? " " + code : ""}: ${text.slice(0, 300)}`, res.status, code, json);
  }
  return json;
}

export type Norm = { status: "paid" | "pending" | "failed"; rawStatus: string };
export function normalizeStatus(s: unknown): Norm {
  const v = String(s ?? "").toLowerCase();
  if (v === "succeeded") return { status: "paid", rawStatus: v };
  if (["canceled", "cancelled", "failed", "expired"].includes(v)) return { status: "failed", rawStatus: v };
  return { status: "pending", rawStatus: v };
}

/** Нэхэмжлэл + hosted checkout. amount — төгрөгөөр. */
export async function createIntent(secretKey: string, p: { amount: number; currency?: string; description?: string; metadata: Record<string, string>; successUrl?: string; cancelUrl?: string; operators?: string[] }) {
  const idem = p.metadata?.paymentId || crypto.randomUUID();
  const ops = p.operators && p.operators.length ? p.operators : (secretKey.startsWith("sk_test_") ? ["sandbox"] : []);
  const body: Record<string, unknown> = { amount: Math.round(p.amount * AMOUNT_MULT), currency: p.currency ?? "MNT", description: String(p.description ?? "").slice(0, 500), metadata: p.metadata ?? {} };
  if (ops.length) body.allowed_operators = ops;
  const intent = await wireFetch(secretKey, "POST", "/payment_intents", body, "pi-" + idem);
  if (!intent?.id) throw new WireError("WIRE: payment_intent хариунд id алга", 502, null, intent);
  const sess: Record<string, string> = { payment_intent: intent.id };
  if (p.successUrl) sess.success_url = p.successUrl;
  if (p.cancelUrl) sess.cancel_url = p.cancelUrl;
  const session = await wireFetch(secretKey, "POST", "/checkout/sessions", sess, "cs-" + idem);
  if (!session?.url) throw new WireError("WIRE: checkout session хариунд url алга", 502, null, session);
  return { intentId: String(intent.id), checkoutUrl: String(session.url), sessionId: session.id ? String(session.id) : null,
    status: normalizeStatus(intent.status).status, expiresAt: intent.expires_at ?? null, raw: { intent, session } };
}

export async function getIntentStatus(secretKey: string, intentId: string): Promise<Norm> {
  const pi = await wireFetch(secretKey, "GET", `/payment_intents/${encodeURIComponent(intentId)}`);
  return normalizeStatus(pi?.status);
}

export async function registerWebhook(secretKey: string, url: string, events?: string[]) {
  const body = { url, enabled_events: events?.length ? events : ["payment_intent.succeeded"] };
  const raw = await wireFetch(secretKey, "POST", "/webhook_endpoints", body, "wh-" + await sha256hex(url + Date.now()));
  const r = raw?.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : raw;   // {data:{…}} боож ирвэл
  const secret = r?.secret ?? r?.signing_secret ?? r?.webhook_secret ?? r?.secret_key ?? (typeof r?.secret === "object" ? r.secret?.value : null) ?? null;
  console.log("registerWebhook: response keys", Object.keys(r ?? {}).join(","), "secret:", secret ? "yes" : "no");
  return { id: r?.id as string, url: r?.url as string, secret: secret ? String(secret) : null, status: (r?.status as string) ?? null, keys: Object.keys(r ?? {}), raw: r };
}
export async function listWebhooks(secretKey: string): Promise<any[]> {
  const r = await wireFetch(secretKey, "GET", "/webhook_endpoints");
  return Array.isArray(r) ? r : (r?.data ?? []);
}
export async function deleteWebhook(secretKey: string, id: string) {
  return wireFetch(secretKey, "DELETE", `/webhook_endpoints/${encodeURIComponent(id)}`);
}

async function hmacHex(secret: string, data: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function sha256hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}
function timingEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** WirePayment-Signature: t=<sec>,v1=<hex>; rawBody — задлаагүй bytes */
export async function verifyWebhookSignature(headers: Headers, rawBody: Uint8Array<ArrayBuffer>, secret: string, now?: number): Promise<boolean> {
  if (!secret) return false;
  const sig = headers.get(SIG_HEADER);
  if (!sig) return false;
  const t = /(?:^|,)\s*t=(\d+)/.exec(sig), v = /(?:^|,)\s*v1=([a-f0-9]+)/i.exec(sig);
  if (!t || !v) return false;
  const prefix = new TextEncoder().encode(t[1] + ".");
  const data = new Uint8Array(new ArrayBuffer(prefix.length + rawBody.length)); data.set(prefix, 0); data.set(rawBody, prefix.length);
  const expected = await hmacHex(secret, data);
  if (!timingEqual(expected, v[1].toLowerCase())) return false;
  const nowSec = now ?? Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - Number(t[1])) <= TOLERANCE_SEC;
}

export type ParsedEvent = { eventId: string | null; type: string; verification: boolean; intentId: string | null; status: Norm["status"]; rawStatus: string; metadata: Record<string, string>; reference: string | null; livemode: boolean };
export function parseWebhookEvent(event: any): ParsedEvent {
  const type = String(event?.type ?? "").toLowerCase();
  const livemode = !!event?.livemode;
  if (type === "endpoint.verification") return { eventId: event?.id ?? null, type, verification: true, intentId: null, status: "pending", rawStatus: "", metadata: {}, reference: null, livemode };
  let obj = event?.data && typeof event.data === "object" ? event.data : (event ?? {});
  if (obj?.object === undefined && obj?.data && typeof obj.data === "object") obj = obj.data;
  if (obj?.object && typeof obj.object === "object") obj = obj.object;
  const intentId = obj?.id ? String(obj.id) : null;
  let st = normalizeStatus(obj?.status);
  if (st.status === "pending") {
    if (type === "payment_intent.succeeded") st = { status: "paid", rawStatus: type };
    else if (/canceled|cancelled|failed/.test(type)) st = { status: "failed", rawStatus: type };
  }
  const metadata = obj?.metadata && typeof obj.metadata === "object" ? obj.metadata : {};
  return { eventId: event?.id ?? null, type, verification: false, intentId, status: st.status, rawStatus: st.rawStatus, metadata, reference: metadata.paymentId ?? null, livemode };
}
