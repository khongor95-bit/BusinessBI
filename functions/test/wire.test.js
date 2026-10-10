// WIRE адаптерийн тест (сүлжээгүй): docs.wire.mn-ийн гарын үсэг, эвент, төлөв, дүнгийн нэгж
const assert = require('assert');
const crypto = require('crypto');
const wire = require('../wire');
const secret = 'whsec_test_123';
const sign = (ts, body) => crypto.createHmac('sha256', secret).update(Buffer.concat([Buffer.from(ts + '.'), body])).digest('hex');
const body = Buffer.from(JSON.stringify({ id: 'evt_1', object: 'event', type: 'payment_intent.succeeded', livemode: false, created: 1717000000,
  data: { id: 'pi_1', object: 'payment_intent', amount: 500000, currency: 'MNT', status: 'succeeded', metadata: { paymentId: 'abc', uid: 'u1', tool: 'ndsh_hhoat' } } }));
const ts = Math.floor(Date.now() / 1000);

// 1) WirePayment-Signature: t=..,v1=..  (HMAC-SHA256(secret, t + "." + rawBody))
assert.ok(wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${ts},v1=${sign(ts, body)}` }, body, secret), 't/v1 sig');
assert.ok(wire.verifyWebhookSignature({ 'wirepayment-signature': `t=${ts},v1=${sign(ts, body).toUpperCase()}` }, body, secret), 'lowercase header, uppercase hex');
assert.ok(!wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${ts},v1=deadbeef` }, body, secret), 'bad sig rejected');
assert.ok(!wire.verifyWebhookSignature({ 'X-Signature': `t=${ts},v1=${sign(ts, body)}` }, body, secret), 'wrong header name rejected');
assert.ok(!wire.verifyWebhookSignature({}, body, secret), 'missing header rejected');
assert.ok(!wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${ts},v1=${sign(ts, body)}` }, body, ''), 'empty secret rejected');
assert.ok(!wire.verifyWebhookSignature({ 'WirePayment-Signature': sign(ts, body) }, body, secret), 'plain hex (no t/v1) rejected');
const old = ts - 600;
assert.ok(!wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${old},v1=${sign(old, body)}` }, body, secret), 'replay (10 min old) rejected — tolerance 300s');
assert.ok(wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${old},v1=${sign(old, body)}` }, body, secret, old + 100), 'inside tolerance ok');
const tampered = Buffer.from(String(body).replace('"amount":500000', '"amount":1'));
assert.ok(!wire.verifyWebhookSignature({ 'WirePayment-Signature': `t=${ts},v1=${sign(ts, body)}` }, tampered, secret), 'tampered body rejected');

// 2) эвент задлах — data = PaymentIntent (docs)
let ev = wire.parseWebhookEvent(JSON.parse(body));
assert.deepStrictEqual([ev.eventId, ev.type, ev.intentId, ev.status, ev.reference, ev.verification], ['evt_1', 'payment_intent.succeeded', 'pi_1', 'paid', 'abc', false]);
// data.object маяг (Stripe-style) ч уншигдана
ev = wire.parseWebhookEvent({ id: 'evt_2', type: 'payment_intent.succeeded', data: { object: { id: 'pi_2', status: 'succeeded', metadata: { paymentId: 'xyz' } } } });
assert.deepStrictEqual([ev.intentId, ev.status, ev.reference], ['pi_2', 'paid', 'xyz']);
// төлөвгүй, зөвхөн type
ev = wire.parseWebhookEvent({ id: 'evt_3', type: 'payment_intent.succeeded', data: { id: 'pi_3' } });
assert.deepStrictEqual([ev.intentId, ev.status], ['pi_3', 'paid']);
ev = wire.parseWebhookEvent({ id: 'evt_4', type: 'payment_intent.canceled', data: { id: 'pi_4', status: 'canceled' } });
assert.deepStrictEqual([ev.intentId, ev.status], ['pi_4', 'failed']);
// endpoint.verification ping
ev = wire.parseWebhookEvent({ id: 'evt_5', type: 'endpoint.verification' });
assert.strictEqual(ev.verification, true);

// 3) төлөв хэвийн болгох (PaymentIntent.status утгууд)
for (const s of ['new', 'requires_payment_method', 'requires_action', 'requires_capture', 'processing']) assert.strictEqual(wire.normalizeStatus(s).status, 'pending', s);
assert.strictEqual(wire.normalizeStatus('succeeded').status, 'paid');
assert.strictEqual(wire.normalizeStatus('canceled').status, 'failed');

// 4) createIntent — 2 алхам, бага нэгж, Idempotency-Key (fetch-ийг орлуулж шалгана)
(async () => {
  const calls = [];
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null });
    if (/payment_intents$/.test(url)) return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'pi_9', object: 'payment_intent', status: 'requires_payment_method', expires_at: 1717000600 }) };
    if (/checkout\/sessions$/.test(url)) return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'cs_9', object: 'checkout.session', url: 'https://pay.wire.mn/c/tok', payment_intent: 'pi_9' }) };
    if (/payment_intents\/pi_9$/.test(url)) return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'pi_9', status: 'succeeded' }) };
    return { ok: false, status: 404, text: async () => '{"code":"not_found"}' };
  };
  try {
    const r = await wire.createIntent('sk_test_abc', { amount: 5000, currency: 'MNT', description: 'x', metadata: { paymentId: 'P1' }, successUrl: 'https://businessbi.mn/pay_done.html?pid=P1&ok=1', cancelUrl: 'https://businessbi.mn/pay_done.html?pid=P1&ok=0' });
    assert.deepStrictEqual([r.intentId, r.checkoutUrl, r.sessionId, r.status], ['pi_9', 'https://pay.wire.mn/c/tok', 'cs_9', 'pending']);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].url, 'https://api.wire.mn/v1/payment_intents');
    assert.strictEqual(calls[0].body.amount, 500000, '5,000₮ = 500000 бага нэгж');
    assert.strictEqual(calls[0].body.currency, 'MNT');
    assert.deepStrictEqual(calls[0].body.allowed_operators, ['sandbox'], 'sk_test → sandbox');
    assert.strictEqual(calls[0].body.metadata.paymentId, 'P1');
    assert.strictEqual(calls[0].headers['Idempotency-Key'], 'pi-P1');
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer sk_test_abc');
    assert.strictEqual(calls[1].url, 'https://api.wire.mn/v1/checkout/sessions');
    assert.deepStrictEqual(calls[1].body, { payment_intent: 'pi_9', success_url: 'https://businessbi.mn/pay_done.html?pid=P1&ok=1', cancel_url: 'https://businessbi.mn/pay_done.html?pid=P1&ok=0' });
    assert.strictEqual(calls[1].headers['Idempotency-Key'], 'cs-P1');
    // live түлхүүр + оператор заагаагүй → allowed_operators илгээхгүй (WIRE өөрөө сонгоно)
    calls.length = 0;
    await wire.createIntent('sk_live_abc', { amount: 5000, metadata: { paymentId: 'P2' } });
    assert.strictEqual(calls[0].body.allowed_operators, undefined);
    calls.length = 0;
    await wire.createIntent('sk_live_abc', { amount: 5000, metadata: { paymentId: 'P3' }, operators: ['qpay'] });
    assert.deepStrictEqual(calls[0].body.allowed_operators, ['qpay']);
    // төлөв
    const st = await wire.getIntentStatus('sk_test_abc', 'pi_9');
    assert.deepStrictEqual(st, { status: 'paid', rawStatus: 'succeeded' });
    // алдааны код дамжина
    global.fetch = async () => ({ ok: false, status: 400, text: async () => JSON.stringify({ code: 'connector_required', message: 'no operator' }) });
    await assert.rejects(() => wire.createIntent('sk_live_abc', { amount: 5000, metadata: { paymentId: 'P4' } }), e => e.code === 'connector_required' && e.status === 400);
  } finally { global.fetch = realFetch; }
  console.log('wire.test.js: ALL OK');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
