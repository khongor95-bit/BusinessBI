/* ============================================================
   wire.js — WIRE.mn төлбөрийн гарцын адаптер (сервер тал)
   ------------------------------------------------------------
   docs.wire.mn (2026-10-10-нд тулгасан):
     Base URL      https://api.wire.mn/v1
     Auth          Authorization: Bearer sk_test_… | sk_live_…
     Idempotency   бүх POST-д "Idempotency-Key" толгой ЗААВАЛ
     Дүн           бага нэгжээр: 50000 = 500.00₮  (⇒ 5,000₮ = 500000)
     1) POST /payment_intents {amount,currency:"MNT",description,
          allowed_operators:[…],metadata}  → {id:"pi_…",status:"requires_payment_method",…}
     2) POST /checkout/sessions {payment_intent, success_url, cancel_url}
          → {id:"cs_…", url:"https://pay.wire.mn/c/…"}   (hosted checkout: QR + банкны deeplink)
     Төлөв         GET /payment_intents/{id} → status:
          new | requires_payment_method | requires_action | requires_capture |
          processing | succeeded | canceled
     Intent TTL    10 минут (төлөгдөөгүй бол автоматаар canceled)
     Webhook       POST /webhook_endpoints {url, enabled_events[]} → secret "whsec_…" (зөвхөн нэг удаа)
                   Толгой: WirePayment-Signature: t=<unix sec>,v1=<hex>
                   v1 = HMAC-SHA256(secret, t + "." + rawBody), 300 сек tolerance
                   Эвент: {id, type:"payment_intent.succeeded", data:<PaymentIntent>, livemode, created}
                   "endpoint.verification" ping-д 2xx буцаахад endpoint verified болно
     Тест          sk_test_ түлхүүр + allowed_operators:["sandbox"]; amount=42 → amount_too_small,
                   amount=42424 → timeout, бусад → succeeded. Webhook тест горимд ч ирнэ.
   ============================================================ */
"use strict";
const crypto = require("crypto");

const WIRE = {
  baseUrl: process.env.WIRE_BASE_URL || "https://api.wire.mn/v1",
  // Дүнг бага нэгжээр явуулна (₮ × 100)
  amountMultiplier: 100,
  // Тест горимд "sandbox"; live-д dashboard дээр идэвхжүүлсэн операторын id (хоосон бол WIRE өөрөө сонгоно)
  operators: (process.env.WIRE_OPERATORS || "").split(",").map(s => s.trim()).filter(Boolean),
  signatureHeader: "wirepayment-signature",
  toleranceSec: 300,
  paidStatuses: ["succeeded"],
  failedStatuses: ["canceled", "cancelled", "failed", "expired"],
};

async function wireFetch(secretKey, method, path, body, idemKey) {
  const headers = { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${secretKey}` };
  if (idemKey) headers["Idempotency-Key"] = String(idemKey).slice(0, 255);
  const res = await fetch(WIRE.baseUrl + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) { json = { raw: text }; }
  if (!res.ok) {
    const code = json && (json.code || (json.error && (json.error.code || json.error.type)));
    const err = new Error(`WIRE ${method} ${path} → HTTP ${res.status}${code ? " " + code : ""}: ${text.slice(0, 300)}`);
    err.status = res.status; err.body = json; err.code = code || null;
    throw err;
  }
  return json;
}

/**
 * Нэхэмжлэл + hosted checkout үүсгэх.
 * amount — төгрөгөөр (5000). metadata.paymentId — манай Firestore id (webhook-оор буцаж ирнэ).
 * → { intentId, checkoutUrl, sessionId, status, raw }
 */
async function createIntent(secretKey, { amount, currency, description, metadata, successUrl, cancelUrl, operators }) {
  const idem = (metadata && metadata.paymentId) || crypto.randomUUID();
  const ops = operators && operators.length ? operators : (secretKey.startsWith("sk_test_") ? ["sandbox"] : WIRE.operators);
  const body = {
    amount: Math.round(amount * WIRE.amountMultiplier),
    currency: currency || "MNT",
    description: String(description || "").slice(0, 500),
    metadata: metadata || {},
  };
  if (ops.length) body.allowed_operators = ops;
  const intent = await wireFetch(secretKey, "POST", "/payment_intents", body, "pi-" + idem);
  if (!intent || !intent.id) {
    const err = new Error("WIRE: payment_intent хариунд id алга: " + JSON.stringify(intent).slice(0, 300)); err.body = intent; throw err;
  }
  const sess = { payment_intent: intent.id };
  if (successUrl) sess.success_url = successUrl;
  if (cancelUrl) sess.cancel_url = cancelUrl;
  const session = await wireFetch(secretKey, "POST", "/checkout/sessions", sess, "cs-" + idem);
  if (!session || !session.url) {
    const err = new Error("WIRE: checkout session хариунд url алга: " + JSON.stringify(session).slice(0, 300)); err.body = session; throw err;
  }
  return { intentId: String(intent.id), checkoutUrl: String(session.url), sessionId: session.id ? String(session.id) : null,
    status: normalizeStatus(intent.status).status, expiresAt: intent.expires_at || null, raw: { intent, session } };
}

/** Төлөв шалгах → {status:'paid'|'pending'|'failed', rawStatus} */
async function getIntentStatus(secretKey, intentId) {
  const pi = await wireFetch(secretKey, "GET", `/payment_intents/${encodeURIComponent(intentId)}`);
  return normalizeStatus(pi && pi.status);
}

/** Webhook endpoint бүртгэх (нэг төсөлд нэг л идэвхтэй endpoint). → {id, url, secret, status} */
async function registerWebhook(secretKey, url, events) {
  const body = { url, enabled_events: events && events.length ? events : ["payment_intent.succeeded"] };
  const r = await wireFetch(secretKey, "POST", "/webhook_endpoints", body, "wh-" + crypto.createHash("sha256").update(url).digest("hex").slice(0, 24));
  return { id: r.id, url: r.url, secret: r.secret || null, status: r.status || null, raw: r };
}
async function listWebhooks(secretKey) {
  const r = await wireFetch(secretKey, "GET", "/webhook_endpoints");
  return Array.isArray(r) ? r : (r.data || []);
}
async function deleteWebhook(secretKey, id) {
  return wireFetch(secretKey, "DELETE", `/webhook_endpoints/${encodeURIComponent(id)}`);
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (WIRE.paidStatuses.includes(v)) return { status: "paid", rawStatus: v };
  if (WIRE.failedStatuses.includes(v)) return { status: "failed", rawStatus: v };
  return { status: "pending", rawStatus: v };
}

/**
 * Webhook гарын үсэг: WirePayment-Signature: t=<sec>,v1=<hex>; v1 = HMAC-SHA256(secret, t + "." + rawBody).
 * rawBody — задлаагүй Buffer байх ЁСТОЙ (req.rawBody). now — тестэд зориулсан.
 */
function verifyWebhookSignature(headers, rawBody, secret, now) {
  if (!secret) return false;
  let sig = null;
  for (const k of Object.keys(headers || {})) if (k.toLowerCase() === WIRE.signatureHeader) { sig = String(headers[k]); break; }
  if (!sig) return false;
  const t = /(?:^|,)\s*t=(\d+)/.exec(sig), v = /(?:^|,)\s*v1=([a-f0-9]+)/i.exec(sig);
  if (!t || !v) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const expected = crypto.createHmac("sha256", secret).update(Buffer.concat([Buffer.from(t[1] + "."), body])).digest("hex");
  const A = Buffer.from(expected), B = Buffer.from(v[1].toLowerCase());
  if (A.length !== B.length || !crypto.timingSafeEqual(A, B)) return false;
  const nowSec = now != null ? now : Math.floor(Date.now() / 1000);
  return Math.abs(nowSec - Number(t[1])) <= WIRE.toleranceSec;
}

/** Эвентээс intent, төлөв, metadata → {eventId, type, intentId, status, rawStatus, metadata, reference, verification} */
function parseWebhookEvent(event) {
  const type = String((event && event.type) || "").toLowerCase();
  if (type === "endpoint.verification") return { eventId: event.id || null, type, verification: true, intentId: null, status: "pending", rawStatus: "", metadata: {}, reference: null };
  // data = PaymentIntent өөрөө (docs); хуучин Stripe маягийн data.object-ийг ч хүлээж авна
  let obj = event && event.data && typeof event.data === "object" ? event.data : (event || {});
  if (obj.object === undefined && obj.data && typeof obj.data === "object") obj = obj.data;
  if (obj && obj.object && typeof obj.object === "object") obj = obj.object;
  const intentId = obj && obj.id ? String(obj.id) : null;
  let st = normalizeStatus(obj && obj.status);
  if (st.status === "pending") {
    if (type === "payment_intent.succeeded") st = { status: "paid", rawStatus: type };
    else if (/canceled|cancelled|failed/.test(type)) st = { status: "failed", rawStatus: type };
  }
  const metadata = obj && obj.metadata && typeof obj.metadata === "object" ? obj.metadata : {};
  return { eventId: (event && event.id) || null, type, verification: false, intentId, status: st.status, rawStatus: st.rawStatus, metadata, reference: metadata.paymentId || null };
}

module.exports = { WIRE, createIntent, getIntentStatus, registerWebhook, listWebhooks, deleteWebhook, verifyWebhookSignature, parseWebhookEvent, normalizeStatus };
