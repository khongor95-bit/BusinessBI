/* ============================================================
   BusinessBI — төлбөртэй хэрэгслийн сервер тал (Firebase Functions v2)
   ------------------------------------------------------------
   Функцүүд (бүгд asia-northeast1 бүсэд):
     createPayment  (callable) — нэвтэрсэн хэрэглэгчид WIRE.mn нэхэмжлэл үүсгэж checkout URL буцаана
     checkPayment   (callable) — төлбөрийн төлөв; pending бол WIRE-ээс шууд лавлана (webhook хоцорсон ч ажиллана)
     wireWebhook    (https)    — WIRE.mn-ээс ирэх гарын үсэгтэй мэдэгдэл → payments/{id}.status='paid'
     mockCheckout   (https)    — WIRE_MODE=mock үед жинхэнэ WIRE-гүйгээр урсгалыг бүтнээр нь турших хуудас

   Firestore: payments/{paymentId}
     uid, email, tool, amount, currency, status: pending|paid|failed,
     provider: wire|mock, providerIntentId, checkoutUrl, meta,
     createdAt, paidAt, expiresAt (= paidAt + 24ц: энэ хугацаанд дахин татах үнэгүй), downloads

   Нууц утгууд (firebase functions:secrets:set):
     WIRE_SECRET_KEY, WIRE_WEBHOOK_SECRET
   Параметр (.env):  WIRE_MODE = mock | live,  SITE_URL = https://businessbi.mn
   ============================================================ */
"use strict";
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const crypto = require("crypto");
const wire = require("./wire");

setGlobalOptions({ region: "asia-northeast1", maxInstances: 10 });
admin.initializeApp();
const db = admin.firestore();

const WIRE_SECRET_KEY = defineSecret("WIRE_SECRET_KEY");
const WIRE_WEBHOOK_SECRET = defineSecret("WIRE_WEBHOOK_SECRET");
const WIRE_MODE = defineString("WIRE_MODE", { default: "mock" });      // mock | live
const SITE_URL = defineString("SITE_URL", { default: "https://businessbi.mn" });

// ── Үнийн жагсаалт (сервер эрх мэдэлтэй; клиент дээрх тоо зөвхөн харуулахад) ──
const PRODUCTS = {
  ndsh_hhoat: { amount: 5000, currency: "MNT", title: "НДШ → ХХОАТ маягт (1 тайлан татах)", validHours: 24 },
};
const ALLOWED_ORIGINS = [/^https?:\/\/(www\.)?businessbi\.mn$/, /^https?:\/\/[a-z0-9-]+\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const CALL_OPTS = { cors: ALLOWED_ORIGINS, secrets: [WIRE_SECRET_KEY, WIRE_WEBHOOK_SECRET] };

const nowTs = () => admin.firestore.Timestamp.now();
const toMs = (ts) => (ts && typeof ts.toMillis === "function") ? ts.toMillis() : (ts ? +ts : 0);

function requireAuth(req) {
  if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "Эхлээд нэвтэрнэ үү.");
  return req.auth;
}
function functionsBase() {
  // mockCheckout болон webhook-ийн URL-ийг өөрөө гаргах
  const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "businessbi";
  return `https://asia-northeast1-${project}.cloudfunctions.net`;
}
function publicView(id, p) {
  const paid = p.status === "paid" && toMs(p.expiresAt) > Date.now();
  return {
    paymentId: id, status: p.status, paid,
    amount: p.amount, currency: p.currency, tool: p.tool,
    checkoutUrl: p.status === "pending" ? (p.checkoutUrl || null) : null,
    paidAt: toMs(p.paidAt) || null, expiresAt: toMs(p.expiresAt) || null,
    downloads: p.downloads || 0, provider: p.provider,
  };
}
async function markPaid(ref, p, extra) {
  if (p.status === "paid") return p;
  const validHours = (PRODUCTS[p.tool] || {}).validHours || 24;
  const paidAt = nowTs();
  const expiresAt = admin.firestore.Timestamp.fromMillis(paidAt.toMillis() + validHours * 3600 * 1000);
  const upd = { status: "paid", paidAt, expiresAt, ...(extra || {}) };
  await ref.update(upd);
  return { ...p, ...upd };
}

// ─────────────────────────────────────────────────────────────
// 1) createPayment — {tool, meta:{period,...}} → {paymentId, checkoutUrl, amount, reused}
// ─────────────────────────────────────────────────────────────
exports.createPayment = onCall(CALL_OPTS, async (req) => {
  const auth = requireAuth(req);
  const tool = String((req.data && req.data.tool) || "");
  const product = PRODUCTS[tool];
  if (!product) throw new HttpsError("invalid-argument", "Тодорхойгүй хэрэгсэл: " + tool);
  const meta = (req.data && typeof req.data.meta === "object" && req.data.meta) ? req.data.meta : {};
  // meta-г цэвэрлэх: зөвхөн богино текст (хувийн өгөгдөл явуулахгүй)
  const cleanMeta = {};
  for (const k of Object.keys(meta).slice(0, 8)) cleanMeta[String(k).slice(0, 32)] = String(meta[k]).slice(0, 120);

  // Сүүлийн 30 минутад үүссэн, төлөгдөөгүй нэхэмжлэл байвал дахин ашиглана (intent бөөгнөрөхөөс сэргийлнэ)
  const since = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 60 * 1000);
  const pend = await db.collection("payments")
    .where("uid", "==", auth.uid).where("tool", "==", tool).where("status", "==", "pending")
    .where("createdAt", ">=", since).orderBy("createdAt", "desc").limit(1).get();
  if (!pend.empty) {
    const d = pend.docs[0];
    return { ...publicView(d.id, d.data()), reused: true };
  }

  const ref = db.collection("payments").doc();
  const mode = WIRE_MODE.value();
  const base = {
    uid: auth.uid, email: (auth.token && auth.token.email) || "", tool,
    amount: product.amount, currency: product.currency, status: "pending",
    provider: mode === "live" ? "wire" : "mock", providerIntentId: null, checkoutUrl: null,
    meta: cleanMeta, createdAt: nowTs(), paidAt: null, expiresAt: null, downloads: 0,
  };
  const successUrl = `${SITE_URL.value()}/pay_done.html?pid=${ref.id}&ok=1`;
  const cancelUrl = `${SITE_URL.value()}/pay_done.html?pid=${ref.id}&ok=0`;

  if (mode === "live") {
    let intent;
    try {
      intent = await wire.createIntent(WIRE_SECRET_KEY.value(), {
        amount: product.amount, currency: product.currency,
        description: `BusinessBI — ${product.title}`,
        metadata: { paymentId: ref.id, uid: auth.uid, tool },
        successUrl, cancelUrl,
      });
    } catch (e) {
      console.error("WIRE createIntent failed", e.message, e.body);
      throw new HttpsError("unavailable", "WIRE.mn-тэй холбогдож чадсангүй. Дараа дахин оролдоно уу.");
    }
    base.providerIntentId = intent.intentId;
    base.checkoutUrl = intent.checkoutUrl;
    base.providerRaw = JSON.stringify(intent.raw).slice(0, 2000);
  } else {
    // MOCK: өөрийн тест хуудас. Гарын үсэг — хэн дуртай нь "төлсөн" болгохоос хамгаална.
    const sig = crypto.createHmac("sha256", mockSecret()).update(ref.id).digest("hex").slice(0, 32);
    base.providerIntentId = "mock_" + ref.id;
    base.checkoutUrl = `${functionsBase()}/mockCheckout?pid=${ref.id}&sig=${sig}`;
  }
  await ref.set(base);
  return { ...publicView(ref.id, base), reused: false };
});

function mockSecret() {
  // Тусдаа нууц шаардахгүй: webhook secret байвал түүнийг, үгүй бол project id-г ашиглана (зөвхөн тест горим)
  try { return WIRE_WEBHOOK_SECRET.value() || ("mock-" + (process.env.GCLOUD_PROJECT || "businessbi")); }
  catch (_) { return "mock-" + (process.env.GCLOUD_PROJECT || "businessbi"); }
}

// ─────────────────────────────────────────────────────────────
// 2) checkPayment — {paymentId, consume?:bool} → publicView
//    consume=true: татаж авсан тоог нэгээр нэмнэ (статистик)
// ─────────────────────────────────────────────────────────────
exports.checkPayment = onCall(CALL_OPTS, async (req) => {
  const auth = requireAuth(req);
  const paymentId = String((req.data && req.data.paymentId) || "");
  if (!paymentId) throw new HttpsError("invalid-argument", "paymentId шаардлагатай");
  const ref = db.collection("payments").doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Төлбөр олдсонгүй");
  let p = snap.data();
  if (p.uid !== auth.uid) throw new HttpsError("permission-denied", "Энэ төлбөр таных биш");

  // Webhook хоцорсон/ирээгүй бол WIRE-ээс шууд лавлана
  if (p.status === "pending" && p.provider === "wire" && p.providerIntentId) {
    try {
      const st = await wire.getIntentStatus(WIRE_SECRET_KEY.value(), p.providerIntentId);
      if (st.status === "paid") p = await markPaid(ref, p, { paidVia: "poll", providerStatus: st.rawStatus });
      else if (st.status === "failed") { await ref.update({ status: "failed", providerStatus: st.rawStatus }); p.status = "failed"; }
    } catch (e) { console.warn("WIRE status poll failed", e.message); }
  }
  if (req.data && req.data.consume && p.status === "paid" && toMs(p.expiresAt) > Date.now()) {
    await ref.update({ downloads: admin.firestore.FieldValue.increment(1), lastDownloadAt: nowTs() });
    p.downloads = (p.downloads || 0) + 1;
  }
  return publicView(paymentId, p);
});

// ─────────────────────────────────────────────────────────────
// 3) wireWebhook — WIRE.mn dashboard-д бүртгэх URL:
//    https://asia-northeast1-<project>.cloudfunctions.net/wireWebhook
// ─────────────────────────────────────────────────────────────
exports.wireWebhook = onRequest({ secrets: [WIRE_SECRET_KEY, WIRE_WEBHOOK_SECRET] }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("POST only"); return; }
  const secret = WIRE_WEBHOOK_SECRET.value();
  if (!wire.verifyWebhookSignature(req.headers, req.rawBody, secret)) {
    console.warn("webhook: bad signature", Object.keys(req.headers));
    res.status(401).send("invalid signature"); return;
  }
  let event = req.body;
  if (Buffer.isBuffer(event) || typeof event === "string") { try { event = JSON.parse(String(event)); } catch (_) { event = {}; } }
  const ev = wire.parseWebhookEvent(event || {});
  // Эвентийг хадгалах (аудит)
  await db.collection("paymentEvents").add({ receivedAt: nowTs(), type: ev.type, intentId: ev.intentId, status: ev.status, raw: JSON.stringify(event).slice(0, 4000) });

  let ref = null, p = null;
  if (ev.reference) { const s = await db.collection("payments").doc(String(ev.reference)).get(); if (s.exists) { ref = s.ref; p = s.data(); } }
  if (!ref && ev.intentId) {
    const q = await db.collection("payments").where("providerIntentId", "==", ev.intentId).limit(1).get();
    if (!q.empty) { ref = q.docs[0].ref; p = q.docs[0].data(); }
  }
  if (!ref) { console.warn("webhook: payment not found", ev); res.status(200).send("ignored"); return; }
  if (ev.status === "paid") await markPaid(ref, p, { paidVia: "webhook", providerStatus: ev.rawStatus });
  else if (ev.status === "failed" && p.status === "pending") await ref.update({ status: "failed", providerStatus: ev.rawStatus });
  res.status(200).send("ok");
});

// ─────────────────────────────────────────────────────────────
// 4) mockCheckout — тест горимын "банкны хуудас". GET: хуудас, POST: төлсөн гэж тэмдэглэнэ.
//    WIRE_MODE=live үед идэвхгүй.
// ─────────────────────────────────────────────────────────────
exports.mockCheckout = onRequest({ secrets: [WIRE_WEBHOOK_SECRET] }, async (req, res) => {
  if (WIRE_MODE.value() === "live") { res.status(404).send("mock checkout is disabled in live mode"); return; }
  const pid = String(req.query.pid || (req.body && req.body.pid) || "");
  const sig = String(req.query.sig || (req.body && req.body.sig) || "");
  const expect = crypto.createHmac("sha256", mockSecret()).update(pid).digest("hex").slice(0, 32);
  if (!pid || sig !== expect) { res.status(403).send("bad link"); return; }
  const ref = db.collection("payments").doc(pid);
  const snap = await ref.get();
  if (!snap.exists) { res.status(404).send("payment not found"); return; }
  const p = snap.data();
  const site = SITE_URL.value();
  if (req.method === "POST") {
    const action = String(req.body && req.body.action || "pay");
    if (action === "pay") { await markPaid(ref, p, { paidVia: "mock" }); res.redirect(302, `${site}/pay_done.html?pid=${pid}&ok=1`); }
    else { await ref.update({ status: "failed", providerStatus: "mock_cancel" }); res.redirect(302, `${site}/pay_done.html?pid=${pid}&ok=0`); }
    return;
  }
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Тест төлбөр — WIRE.mn (mock)</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#f4f6f5;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.c{background:#fff;border:1px solid #e3e7e4;border-radius:16px;padding:28px 30px;width:min(420px,92vw);box-shadow:0 10px 40px rgba(0,0,0,.08)}
h1{font-size:18px;margin:0 0 6px}.m{color:#6b7670;font-size:13px;margin:0 0 18px}.a{font-size:30px;font-weight:800;color:#1a4d38;margin:0 0 18px}
button{width:100%;padding:13px;border-radius:10px;border:none;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px}
.p{background:#216a4c;color:#fff}.x{background:#fff;color:#c0492b;border:1.5px solid #e6c0b5}
.t{display:inline-block;background:#fff4d6;color:#8a6410;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;margin-bottom:12px}</style></head>
<body><div class="c"><span class="t">ТЕСТ ГОРИМ — жинхэнэ мөнгө шилжихгүй</span>
<h1>BusinessBI төлбөр</h1><p class="m">${(PRODUCTS[p.tool] || {}).title || p.tool} · ${p.email || ""}</p>
<div class="a">${p.amount.toLocaleString("en-US")} ₮</div>
${p.status === "paid" ? `<p class="m">✓ Энэ нэхэмжлэл аль хэдийн төлөгдсөн.</p>` : `
<form method="post"><input type="hidden" name="pid" value="${pid}"><input type="hidden" name="sig" value="${sig}">
<button class="p" name="action" value="pay">Төлөх (тест)</button>
<button class="x" name="action" value="cancel">Цуцлах</button></form>`}
<p class="m" style="margin-top:16px">Жинхэнэ горимд энэ хуудсыг WIRE.mn-ийн checkout орлоно (банкны апп / QR / хэтэвч).</p>
</div></body></html>`);
});
