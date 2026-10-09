// Бүтэн урсгалын тест (эмулятор, сүлжээгүй): firebase-admin-ийг санах ойн Firestore-оор орлуулж
// createPayment → mockCheckout(POST pay) → checkPayment(consume) → webhook (live маяг) шалгана.
//   node test/flow.test.js
const assert = require("assert");
const Module = require("module");
const crypto = require("crypto");
process.env.GCLOUD_PROJECT = "businessbi";
process.env.WIRE_MODE = "mock"; process.env.SITE_URL = "https://businessbi.mn";

// ── Санах ойн Firestore ─────────────────────────────────────
class Ts { constructor(ms) { this.ms = ms; } toMillis() { return this.ms; } static now() { return new Ts(Date.now()); } static fromMillis(ms) { return new Ts(ms); } }
const store = {};
const INC = Symbol("inc");
function applyUpd(doc, upd) { for (const k of Object.keys(upd)) { const v = upd[k]; if (v && v[INC] !== undefined) doc[k] = (doc[k] || 0) + v[INC]; else doc[k] = v; } }
const val = (x) => (x && typeof x.toMillis === "function") ? x.toMillis() : x;
class Query {
  constructor(col) { this.col = col; this.f = []; this.o = null; this.l = 0; }
  where(k, op, v) { const q = this._c(); q.f.push([k, op, v]); return q; }
  orderBy(k, d) { const q = this._c(); q.o = [k, d]; return q; }
  limit(n) { const q = this._c(); q.l = n; return q; }
  _c() { const q = new Query(this.col); q.f = this.f.slice(); q.o = this.o; q.l = this.l; return q; }
  async get() {
    let rows = Object.entries(store[this.col] || {}).map(([id, d]) => ({ id, data: () => d, ref: new DocRef(this.col, id) }));
    for (const [k, op, v] of this.f) rows = rows.filter(r => { const xv = val(r.data()[k]), vv = val(v); return op === "==" ? xv === vv : op === ">=" ? xv >= vv : op === "<=" ? xv <= vv : true; });
    if (this.o) { const [k, d] = this.o; rows.sort((a, b) => { const av = val(a.data()[k]), bv = val(b.data()[k]); return (av < bv ? -1 : av > bv ? 1 : 0) * (d === "desc" ? -1 : 1); }); }
    if (this.l) rows = rows.slice(0, this.l);
    return { empty: rows.length === 0, docs: rows };
  }
}
class DocRef {
  constructor(col, id) { this.col = col; this.id = id; }
  async get() { const d = (store[this.col] || {})[this.id]; return { exists: !!d, data: () => (d ? { ...d } : undefined), ref: this, id: this.id }; }
  async set(d) { (store[this.col] = store[this.col] || {})[this.id] = { ...d }; }
  async update(u) { const d = store[this.col][this.id]; if (!d) throw new Error("no doc"); applyUpd(d, u); }
}
class ColRef extends Query {
  doc(id) { return new DocRef(this.col, id || crypto.randomBytes(10).toString("hex")); }
  async add(d) { const r = this.doc(); await r.set(d); return r; }
}
const fakeAdmin = { initializeApp() {}, firestore() { return { collection: c => new ColRef(c) }; } };
fakeAdmin.firestore.Timestamp = Ts;
fakeAdmin.firestore.FieldValue = { increment: n => ({ [INC]: n }) };
const origLoad = Module._load;
Module._load = function (req, ...rest) { if (req === "firebase-admin") return fakeAdmin; return origLoad.call(this, req, ...rest); };

const fns = require("../index.js");
const auth = { uid: "u1", token: { email: "test@example.com" } };
const mkRes = () => { const r = { code: 200, headers: {}, body: "", redirectTo: null }; r.status = c => { r.code = c; return r; }; r.send = b => { r.body = b; return r; }; r.set = (k, v) => { r.headers[k] = v; return r; }; r.redirect = (c, u) => { r.code = c; r.redirectTo = u; }; return r; };

(async () => {
  // 1. нэвтрээгүй → unauthenticated
  await assert.rejects(fns.createPayment.run({ data: { tool: "ndsh_hhoat" }, auth: null }), e => e.code === "unauthenticated");
  // 2. буруу хэрэгсэл
  await assert.rejects(fns.createPayment.run({ data: { tool: "xxx" }, auth }), e => e.code === "invalid-argument");
  // 3. createPayment (mock)
  const c1 = await fns.createPayment.run({ data: { tool: "ndsh_hhoat", meta: { period: "2026 1-р улирал", secret: "x".repeat(500) } }, auth });
  assert.strictEqual(c1.status, "pending"); assert.strictEqual(c1.amount, 5000); assert.ok(c1.checkoutUrl.includes("/mockCheckout?pid=" + c1.paymentId));
  assert.strictEqual(store.payments[c1.paymentId].meta.secret.length, 120, "meta урт тасрах ёстой");
  // 4. дахин дуудвал ижил pending-ийг буцаана (reuse)
  const c2 = await fns.createPayment.run({ data: { tool: "ndsh_hhoat" }, auth });
  assert.strictEqual(c2.paymentId, c1.paymentId); assert.strictEqual(c2.reused, true);
  // 5. өөр хэрэглэгч шалгах гэвэл permission-denied
  await assert.rejects(fns.checkPayment.run({ data: { paymentId: c1.paymentId }, auth: { uid: "u2", token: {} } }), e => e.code === "permission-denied");
  // 6. төлөгдөөгүй
  let s = await fns.checkPayment.run({ data: { paymentId: c1.paymentId }, auth }); assert.strictEqual(s.paid, false);
  // 7. mockCheckout — буруу гарын үсэг
  const u = new URL(c1.checkoutUrl); const pid = u.searchParams.get("pid"), sig = u.searchParams.get("sig");
  let res = mkRes(); await fns.mockCheckout({ method: "GET", query: { pid, sig: "bad" }, body: {}, headers: {} }, res); assert.strictEqual(res.code, 403);
  // 8. mockCheckout GET хуудас
  res = mkRes(); await fns.mockCheckout({ method: "GET", query: { pid, sig }, body: {}, headers: {} }, res); assert.strictEqual(res.code, 200); assert.ok(res.body.includes("5,000"));
  // 9. mockCheckout POST pay → paid, redirect pay_done ok=1
  res = mkRes(); await fns.mockCheckout({ method: "POST", query: {}, body: { pid, sig, action: "pay" }, headers: {} }, res);
  assert.strictEqual(res.code, 302); assert.ok(res.redirectTo.endsWith(`/pay_done.html?pid=${pid}&ok=1`));
  // 10. checkPayment → paid, consume → downloads++
  s = await fns.checkPayment.run({ data: { paymentId: pid, consume: true }, auth }); assert.strictEqual(s.paid, true); assert.strictEqual(s.downloads, 1);
  assert.ok(s.expiresAt - s.paidAt === 24 * 3600 * 1000, "24 цаг хүчинтэй");
  s = await fns.checkPayment.run({ data: { paymentId: pid, consume: true }, auth }); assert.strictEqual(s.downloads, 2);
  // 11. төлсний дараа шинэ createPayment → шинэ нэхэмжлэл (pending байхгүй тул)
  const c3 = await fns.createPayment.run({ data: { tool: "ndsh_hhoat" }, auth }); assert.notStrictEqual(c3.paymentId, pid); assert.strictEqual(c3.reused, false);
  // 12. хугацаа дууссан тасалбар → paid=false
  store.payments[pid].expiresAt = Ts.fromMillis(Date.now() - 1000);
  s = await fns.checkPayment.run({ data: { paymentId: pid }, auth }); assert.strictEqual(s.paid, false); assert.strictEqual(s.status, "paid");
  // 13. webhook — гарын үсэггүй → 401
  process.env.WIRE_WEBHOOK_SECRET = "whsec_abc";
  res = mkRes(); await fns.wireWebhook({ method: "POST", headers: {}, rawBody: Buffer.from("{}"), body: {} }, res); assert.strictEqual(res.code, 401);
  // 14. webhook — зөв гарын үсэгтэй, reference(metadata.paymentId)-ээр олж paid болгоно
  store.payments[c3.paymentId].provider = "wire"; store.payments[c3.paymentId].providerIntentId = "pi_777";
  const evBody = Buffer.from(JSON.stringify({ type: "payment_intent.succeeded", data: { object: { id: "pi_777", status: "succeeded", metadata: { paymentId: c3.paymentId } } } }));
  const hex = crypto.createHmac("sha256", "whsec_abc").update(evBody).digest("hex");
  res = mkRes(); await fns.wireWebhook({ method: "POST", headers: { "wire-signature": hex }, rawBody: evBody, body: JSON.parse(evBody) }, res);
  assert.strictEqual(res.code, 200, "webhook body=" + res.body);
  assert.strictEqual(store.payments[c3.paymentId].status, "paid"); assert.strictEqual(store.payments[c3.paymentId].paidVia, "webhook");
  assert.ok(Object.keys(store.paymentEvents || {}).length >= 1, "эвент аудит хадгалагдсан");
  // 15. webhook — intentId-гаар олох (reference байхгүй), өөр толгой/бүтэц
  const c4 = await fns.createPayment.run({ data: { tool: "ndsh_hhoat" }, auth: { uid: "u9", token: {} } });
  store.payments[c4.paymentId].provider = "wire"; store.payments[c4.paymentId].providerIntentId = "pi_888";
  const ev2 = Buffer.from(JSON.stringify({ event: "payment.completed", data: { id: "pi_888", state: "PAID" } }));
  res = mkRes(); await fns.wireWebhook({ method: "POST", headers: { "x-wire-signature": crypto.createHmac("sha256", "whsec_abc").update(ev2).digest("hex") }, rawBody: ev2, body: JSON.parse(ev2) }, res);
  assert.strictEqual(store.payments[c4.paymentId].status, "paid");
  // 16. live горимд mockCheckout хаалттай
  process.env.WIRE_MODE = "live";
  res = mkRes(); await fns.mockCheckout({ method: "GET", query: { pid, sig }, body: {}, headers: {} }, res); assert.strictEqual(res.code, 404);
  console.log("flow.test.js: ALL OK (16 шалгалт)");
})().catch(e => { console.error("FAIL", e); process.exit(1); });
