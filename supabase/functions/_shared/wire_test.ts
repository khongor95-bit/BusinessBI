// deno test --allow-env --minimum-dependency-age 0 supabase/functions/_shared/wire_test.ts
// WIRE адаптерийн тест (сүлжээгүй): гарын үсэг, эвент, төлөв, 2 алхамт нэхэмжлэл (fetch-ийг орлуулж)
import nodeAssert from "node:assert/strict";
const assert = (v: unknown, msg?: string) => nodeAssert.ok(v, msg);
const assertEquals = (a: unknown, b: unknown, msg?: string) => nodeAssert.deepEqual(a, b, msg);
const assertRejects = async (fn: () => Promise<unknown>, cls: any, msgIncludes?: string) => {
  let threw = false;
  try { await fn(); } catch (e) { threw = true; nodeAssert.ok(e instanceof cls, "wrong error class"); if (msgIncludes) nodeAssert.ok(String((e as Error).message).includes(msgIncludes), "message: " + (e as Error).message); }
  nodeAssert.ok(threw, "did not reject");
};
import { createIntent, getIntentStatus, normalizeStatus, parseWebhookEvent, verifyWebhookSignature, WireError } from "./wire.ts";

const secret = "whsec_test_123";
const enc = new TextEncoder();
async function sign(ts: number, body: Uint8Array<ArrayBuffer>): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const pre = enc.encode(ts + "."); const d = new Uint8Array(new ArrayBuffer(pre.length + body.length)); d.set(pre); d.set(body, pre.length);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, d))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const bodyObj = { id: "evt_1", object: "event", type: "payment_intent.succeeded", livemode: false, created: 1717000000,
  data: { id: "pi_1", object: "payment_intent", amount: 500000, currency: "MNT", status: "succeeded", metadata: { paymentId: "abc", uid: "u1", tool: "ndsh_hhoat" } } };
const body = enc.encode(JSON.stringify(bodyObj)) as Uint8Array<ArrayBuffer>;
const H = (v: string) => new Headers({ "WirePayment-Signature": v });

Deno.test("signature t/v1 ok", async () => {
  const ts = Math.floor(Date.now() / 1000);
  assert(await verifyWebhookSignature(H(`t=${ts},v1=${await sign(ts, body)}`), body, secret));
  assert(await verifyWebhookSignature(H(`t=${ts},v1=${(await sign(ts, body)).toUpperCase()}`), body, secret));
});
Deno.test("signature rejects", async () => {
  const ts = Math.floor(Date.now() / 1000);
  assert(!(await verifyWebhookSignature(H(`t=${ts},v1=deadbeef`), body, secret)));
  assert(!(await verifyWebhookSignature(new Headers({ "X-Signature": `t=${ts},v1=${await sign(ts, body)}` }), body, secret)));
  assert(!(await verifyWebhookSignature(new Headers(), body, secret)));
  assert(!(await verifyWebhookSignature(H(`t=${ts},v1=${await sign(ts, body)}`), body, "")));
  assert(!(await verifyWebhookSignature(H(await sign(ts, body)), body, secret)), "plain hex rejected");
  const old = ts - 600;
  assert(!(await verifyWebhookSignature(H(`t=${old},v1=${await sign(old, body)}`), body, secret)), "replay 10 min rejected");
  assert(await verifyWebhookSignature(H(`t=${old},v1=${await sign(old, body)}`), body, secret, old + 100), "inside tolerance");
  const tampered = enc.encode(JSON.stringify({ ...bodyObj, data: { ...bodyObj.data, amount: 1 } })) as Uint8Array<ArrayBuffer>;
  assert(!(await verifyWebhookSignature(H(`t=${ts},v1=${await sign(ts, body)}`), tampered, secret)));
});
Deno.test("parse events", () => {
  let ev = parseWebhookEvent(bodyObj);
  assertEquals([ev.eventId, ev.type, ev.intentId, ev.status, ev.reference, ev.verification], ["evt_1", "payment_intent.succeeded", "pi_1", "paid", "abc", false]);
  ev = parseWebhookEvent({ id: "evt_2", type: "payment_intent.succeeded", data: { object: { id: "pi_2", status: "succeeded", metadata: { paymentId: "xyz" } } } });
  assertEquals([ev.intentId, ev.status, ev.reference], ["pi_2", "paid", "xyz"]);
  ev = parseWebhookEvent({ id: "evt_3", type: "payment_intent.succeeded", data: { id: "pi_3" } });
  assertEquals([ev.intentId, ev.status], ["pi_3", "paid"]);
  ev = parseWebhookEvent({ id: "evt_4", type: "payment_intent.canceled", data: { id: "pi_4", status: "canceled" } });
  assertEquals([ev.intentId, ev.status], ["pi_4", "failed"]);
  assertEquals(parseWebhookEvent({ id: "evt_5", type: "endpoint.verification" }).verification, true);
});
Deno.test("normalize status", () => {
  for (const s of ["new", "requires_payment_method", "requires_action", "requires_capture", "processing"]) assertEquals(normalizeStatus(s).status, "pending");
  assertEquals(normalizeStatus("succeeded").status, "paid");
  assertEquals(normalizeStatus("canceled").status, "failed");
});
Deno.test("createIntent: 2 алхам, бага нэгж, Idempotency-Key", async () => {
  const calls: { url: string; method: string; headers: Record<string, string>; body: any }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, opts: any) => {
    calls.push({ url, method: opts.method, headers: opts.headers, body: opts.body ? JSON.parse(opts.body) : null });
    const ok = (o: unknown) => new Response(JSON.stringify(o), { status: 200 });
    if (/payment_intents$/.test(url)) return ok({ id: "pi_9", object: "payment_intent", status: "requires_payment_method", expires_at: 1717000600 });
    if (/checkout\/sessions$/.test(url)) return ok({ id: "cs_9", object: "checkout.session", url: "https://pay.wire.mn/c/tok", payment_intent: "pi_9" });
    if (/payment_intents\/pi_9$/.test(url)) return ok({ id: "pi_9", status: "succeeded" });
    return new Response('{"code":"not_found"}', { status: 404 });
  }) as typeof fetch;
  try {
    const r = await createIntent("sk_test_abc", { amount: 5000, currency: "MNT", description: "x", metadata: { paymentId: "P1" }, successUrl: "https://businessbi.mn/pay_done.html?pid=P1&ok=1", cancelUrl: "https://businessbi.mn/pay_done.html?pid=P1&ok=0" });
    assertEquals([r.intentId, r.checkoutUrl, r.sessionId, r.status], ["pi_9", "https://pay.wire.mn/c/tok", "cs_9", "pending"]);
    assertEquals(calls.length, 2);
    assertEquals(calls[0].url, "https://api.wire.mn/v1/payment_intents");
    assertEquals(calls[0].body.amount, 500000);
    assertEquals(calls[0].body.allowed_operators, ["sandbox"]);
    assertEquals(calls[0].body.metadata.paymentId, "P1");
    assertEquals(calls[0].headers["Idempotency-Key"], "pi-P1");
    assertEquals(calls[0].headers.Authorization, "Bearer sk_test_abc");
    assertEquals(calls[1].url, "https://api.wire.mn/v1/checkout/sessions");
    assertEquals(calls[1].body, { payment_intent: "pi_9", success_url: "https://businessbi.mn/pay_done.html?pid=P1&ok=1", cancel_url: "https://businessbi.mn/pay_done.html?pid=P1&ok=0" });
    calls.length = 0;
    await createIntent("sk_live_abc", { amount: 5000, metadata: { paymentId: "P2" } });
    assertEquals(calls[0].body.allowed_operators, undefined);
    calls.length = 0;
    await createIntent("sk_live_abc", { amount: 5000, metadata: { paymentId: "P3" }, operators: ["qpay"] });
    assertEquals(calls[0].body.allowed_operators, ["qpay"]);
    assertEquals(await getIntentStatus("sk_test_abc", "pi_9"), { status: "paid", rawStatus: "succeeded" });
    globalThis.fetch = (async () => new Response(JSON.stringify({ code: "connector_required" }), { status: 400 })) as typeof fetch;
    await assertRejects(() => createIntent("sk_live_abc", { amount: 5000, metadata: { paymentId: "P4" } }), WireError, "connector_required");
  } finally { globalThis.fetch = realFetch; }
});
