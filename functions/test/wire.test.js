// WIRE адаптерийн тест (сүлжээгүй): гарын үсэг шалгах, эвент задлах, төлөв хэвийн болгох
const assert=require('assert');
const crypto=require('crypto');
const wire=require('../wire');
const secret='whsec_test_123';
const body=Buffer.from(JSON.stringify({type:'payment_intent.succeeded',data:{object:{id:'pi_1',status:'succeeded',metadata:{paymentId:'abc'}}}}));
// 1) энгийн hex HMAC
const hex=crypto.createHmac('sha256',secret).update(body).digest('hex');
assert.ok(wire.verifyWebhookSignature({'wire-signature':hex},body,secret),'hex sig');
assert.ok(wire.verifyWebhookSignature({'X-Wire-Signature':hex.toUpperCase()},body,secret),'hex sig case-insens header');
assert.ok(!wire.verifyWebhookSignature({'wire-signature':'deadbeef'},body,secret),'bad sig rejected');
assert.ok(!wire.verifyWebhookSignature({},body,secret),'missing header rejected');
assert.ok(!wire.verifyWebhookSignature({'wire-signature':hex},body,''),'empty secret rejected');
// 2) t=..,v1=.. маяг
const ts=Math.floor(Date.now()/1000);
const v1=crypto.createHmac('sha256',secret).update(Buffer.concat([Buffer.from(ts+'.'),body])).digest('hex');
assert.ok(wire.verifyWebhookSignature({'wire-signature':`t=${ts},v1=${v1}`},body,secret),'t/v1 sig');
const old=ts-3600, v1old=crypto.createHmac('sha256',secret).update(Buffer.concat([Buffer.from(old+'.'),body])).digest('hex');
assert.ok(!wire.verifyWebhookSignature({'wire-signature':`t=${old},v1=${v1old}`},body,secret),'replay (1h old) rejected');
// 3) base64
const b64=crypto.createHmac('sha256',secret).update(body).digest('base64');
assert.ok(wire.verifyWebhookSignature({'signature':b64},body,secret),'base64 sig');
// 4) эвент задлах — янз бүрийн бүтэц
let ev=wire.parseWebhookEvent(JSON.parse(body));
assert.deepStrictEqual([ev.intentId,ev.status,ev.reference],['pi_1','paid','abc']);
ev=wire.parseWebhookEvent({event:'payment.failed',data:{payment_intent_id:'pi_2',state:'FAILED'}});
assert.deepStrictEqual([ev.intentId,ev.status],['pi_2','failed']);
ev=wire.parseWebhookEvent({id:'pi_3',status:'pending',reference:'xyz'});
assert.deepStrictEqual([ev.intentId,ev.status,ev.reference],['pi_3','pending','xyz']);
ev=wire.parseWebhookEvent({type:'payment_intent.succeeded',data:{object:{id:'pi_4'}}}); // төлөвгүй, зөвхөн type
assert.deepStrictEqual([ev.intentId,ev.status],['pi_4','paid']);
// 5) normalize
assert.strictEqual(wire.normalizeStatus('Paid').status,'paid');
assert.strictEqual(wire.normalizeStatus('CANCELLED').status,'failed');
assert.strictEqual(wire.normalizeStatus('processing').status,'pending');
console.log('wire.test.js: ALL OK');
