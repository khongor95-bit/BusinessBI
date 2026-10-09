/* ============================================================
   wire.js — WIRE.mn төлбөрийн гарцын адаптер (сервер тал)
   ------------------------------------------------------------
   WIRE.mn нүүр хуудсанд зарлагдсан бүтэц:
     POST /v1/payment_intents  → checkout URL
     гарын үсэгтэй (signed) webhook, test mode, SDK
   Яг талбарын нэрс docs.wire.mn-ээс баталгаажаагүй тул бүх
   "тохируулах" зүйлийг энэ файлын ДЭЭД ХЭСЭГТ нэг дор гаргав.
   docs.wire.mn-тэй тулгаад зөвхөн энэ хэсгийг засна — index.js-д
   гар хүрэх шаардлагагүй.
   ============================================================ */
"use strict";
const crypto = require("crypto");

// ── ШАЛГАХ: docs.wire.mn ─────────────────────────────────────
const WIRE = {
  baseUrl: process.env.WIRE_BASE_URL || "https://api.wire.mn/v1",
  // Нэхэмжлэл (payment intent) үүсгэх
  createPath: "/payment_intents",
  // Төлөв шалгах (GET baseUrl + statusPath + /{id})
  statusPath: "/payment_intents",
  // Authorization толгой: "Bearer <secret>"  (эсвэл "X-API-Key" байж болно)
  authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
  // Хүсэлтийн талбарууд
  req: {
    amount: "amount",            // бүхэл төгрөгөөр (5000). Хэрэв мөнгөөр (500000) шаардвал amountMultiplier=100
    amountMultiplier: 1,
    currency: "currency",        // "MNT"
    description: "description",
    metadata: "metadata",        // {paymentId, uid, tool} — webhook-оор буцаж ирэх ёстой
    successUrl: "success_url",
    cancelUrl: "cancel_url",
    reference: "reference",      // манай paymentId-г давхар энд ч өгнө (metadata дэмжихгүй бол)
  },
  // Хариуны талбарууд
  res: {
    id: ["id", "payment_intent_id", "intent_id"],
    checkoutUrl: ["checkout_url", "checkoutUrl", "url", "payment_url"],
    status: ["status", "state"],
  },
  // Амжилттай төлөв гэж тооцох утгууд (жижиг үсгээр)
  paidStatuses: ["succeeded", "success", "paid", "completed", "captured"],
  failedStatuses: ["failed", "canceled", "cancelled", "expired", "declined"],
  // Webhook гарын үсэг
  webhook: {
    // Толгойн нэрийн боломжит хувилбарууд — эхний олдсоныг ашиглана
    signatureHeaders: ["wire-signature", "x-wire-signature", "x-signature", "signature"],
    // Схем: "hex"  → HMAC-SHA256(rawBody, secret) hex;
    //       "t_v1" → Stripe маяг "t=<ts>,v1=<hex>" ба HMAC(ts + "." + rawBody)
    //       "auto" → хоёуланг нь үзнэ
    scheme: "auto",
    // Эвент дотроос intent-ийг олох замууд
    eventTypeKeys: ["type", "event", "event_type"],
    objectPaths: [["data", "object"], ["data"], ["payment_intent"], ["object"], []],
  },
};
// ────────────────────────────────────────────────────────────

function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return undefined;
}
function dig(obj, path) {
  let cur = obj;
  for (const k of path) { if (!cur || typeof cur !== "object") return undefined; cur = cur[k]; }
  return cur;
}

async function wireFetch(secretKey, method, path, body) {
  const res = await fetch(WIRE.baseUrl + path, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", ...WIRE.authHeader(secretKey) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`WIRE ${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status; err.body = json;
    throw err;
  }
  return json;
}

/** Нэхэмжлэл үүсгэх → {intentId, checkoutUrl, raw} */
async function createIntent(secretKey, { amount, currency, description, metadata, successUrl, cancelUrl }) {
  const r = WIRE.req;
  const body = {};
  body[r.amount] = Math.round(amount * r.amountMultiplier);
  body[r.currency] = currency;
  body[r.description] = description;
  body[r.metadata] = metadata;
  body[r.reference] = metadata.paymentId;
  if (successUrl) body[r.successUrl] = successUrl;
  if (cancelUrl) body[r.cancelUrl] = cancelUrl;
  const raw = await wireFetch(secretKey, "POST", WIRE.createPath, body);
  // Хариу "data" дотор боож ирж болно
  const obj = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : raw;
  const intentId = pick(obj, WIRE.res.id);
  const checkoutUrl = pick(obj, WIRE.res.checkoutUrl);
  if (!intentId || !checkoutUrl) {
    const err = new Error("WIRE хариунд id/checkout_url олдсонгүй — wire.js → WIRE.res тохиргоог docs.wire.mn-тэй тулгана уу. Хариу: " + JSON.stringify(raw).slice(0, 400));
    err.body = raw; throw err;
  }
  return { intentId: String(intentId), checkoutUrl: String(checkoutUrl), raw };
}

/** Төлөв шалгах → {status:'paid'|'pending'|'failed', rawStatus} */
async function getIntentStatus(secretKey, intentId) {
  const raw = await wireFetch(secretKey, "GET", `${WIRE.statusPath}/${encodeURIComponent(intentId)}`);
  const obj = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data : raw;
  return normalizeStatus(pick(obj, WIRE.res.status));
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (WIRE.paidStatuses.includes(v)) return { status: "paid", rawStatus: v };
  if (WIRE.failedStatuses.includes(v)) return { status: "failed", rawStatus: v };
  return { status: "pending", rawStatus: v };
}

/** Webhook гарын үсэг шалгах. rawBody: Buffer. Буцаана: true/false */
function verifyWebhookSignature(headers, rawBody, secret) {
  if (!secret) return false;
  const lower = {};
  for (const k of Object.keys(headers || {})) lower[k.toLowerCase()] = headers[k];
  let sig = null;
  for (const h of WIRE.webhook.signatureHeaders) if (lower[h]) { sig = String(lower[h]); break; }
  if (!sig) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");
  const hmacHex = (data) => crypto.createHmac("sha256", secret).update(data).digest("hex");
  const safeEq = (a, b) => {
    const A = Buffer.from(String(a).toLowerCase()), B = Buffer.from(String(b).toLowerCase());
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  };
  const scheme = WIRE.webhook.scheme;
  // t=...,v1=... маяг
  if (scheme === "t_v1" || scheme === "auto") {
    const m = /t=(\d+)/.exec(sig), v = /v1=([a-f0-9]+)/i.exec(sig);
    if (m && v) {
      const expected = hmacHex(Buffer.concat([Buffer.from(m[1] + "."), body]));
      if (safeEq(expected, v[1])) {
        // 10 минутаас хуучин эвентийг хүлээж авахгүй (replay хамгаалалт)
        const ts = Number(m[1]); const now = Math.floor(Date.now() / 1000);
        const age = Math.abs(now - (ts > 1e11 ? Math.floor(ts / 1000) : ts));
        return age <= 600;
      }
      if (scheme === "t_v1") return false;
    }
  }
  // Энгийн hex (эсвэл base64) HMAC
  const expectedHex = hmacHex(body);
  if (safeEq(expectedHex, sig)) return true;
  const expectedB64 = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return sig === expectedB64;
}

/** Webhook эвентээс intent объект + төлөв + metadata гаргах */
function parseWebhookEvent(event) {
  const type = String(pick(event, WIRE.webhook.eventTypeKeys) || "").toLowerCase();
  let obj = null;
  for (const p of WIRE.webhook.objectPaths) {
    const o = p.length ? dig(event, p) : event;
    if (o && typeof o === "object" && (pick(o, WIRE.res.id) || pick(o, WIRE.res.status))) { obj = o; break; }
  }
  obj = obj || event;
  const intentId = pick(obj, WIRE.res.id);
  let st = normalizeStatus(pick(obj, WIRE.res.status));
  // Төлөв талбар байхгүй, эвентийн төрлөөр л мэдэгдэж байвал
  if (st.status === "pending" && type) {
    if (/succeed|success|paid|complete|captur/.test(type)) st = { status: "paid", rawStatus: type };
    else if (/fail|cancel|expire|declin/.test(type)) st = { status: "failed", rawStatus: type };
  }
  const metadata = (obj.metadata && typeof obj.metadata === "object") ? obj.metadata : {};
  const reference = obj[WIRE.req.reference] || metadata.paymentId || null;
  return { type, intentId: intentId ? String(intentId) : null, status: st.status, rawStatus: st.rawStatus, metadata, reference };
}

module.exports = { WIRE, createIntent, getIntentStatus, verifyWebhookSignature, parseWebhookEvent, normalizeStatus };
