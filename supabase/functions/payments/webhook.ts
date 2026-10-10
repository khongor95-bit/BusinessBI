/* wire-webhook — WIRE.mn-ээс ирэх гарын үсэгтэй мэдэгдэл → payments.status='paid'
   URL: https://<project>.supabase.co/functions/v1/payments/webhook   (гарын үсгээр хамгаална)
   Signing secret: app_secrets.wire_webhook_secret (wire-admin register_webhook хадгалдаг). */
import { admin, getSecret } from "../_shared/http.ts";
import { markPaid, type Payment } from "../_shared/payments.ts";
import { parseWebhookEvent, verifyWebhookSignature } from "../_shared/wire.ts";

export const handler = async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const raw = new Uint8Array(await req.arrayBuffer());
  const secret = await getSecret("wire_webhook_secret");
  if (!(await verifyWebhookSignature(req.headers, raw, secret))) {
    console.warn("webhook: bad signature", [...req.headers.keys()]);
    return new Response("invalid signature", { status: 401 });
  }
  let event: any = {};
  try { event = JSON.parse(new TextDecoder().decode(raw)); } catch { event = {}; }
  const ev = parseWebhookEvent(event);
  if (ev.verification) return new Response("verified", { status: 200 });
  const db = admin();
  // давхардал: нэг эвент хэд хэдэн удаа ирж болно → id-гаар нэг л удаа
  const evId = ev.eventId ? String(ev.eventId).slice(0, 120) : crypto.randomUUID();
  const { error: insErr } = await db.from("payment_events").insert({ id: evId, type: ev.type, intent_id: ev.intentId, status: ev.status, livemode: ev.livemode, raw: event });
  if (insErr && /duplicate|unique/i.test(insErr.message)) return new Response("duplicate", { status: 200 });

  let p: Payment | null = null;
  if (ev.reference && /^[0-9a-f-]{36}$/i.test(ev.reference)) {
    const { data } = await db.from("payments").select("*").eq("id", ev.reference).maybeSingle(); p = data as Payment | null;
  }
  if (!p && ev.intentId) {
    const { data } = await db.from("payments").select("*").eq("provider_intent_id", ev.intentId).limit(1); p = (data && data[0]) as Payment | null;
  }
  if (!p) { console.warn("webhook: payment not found", ev); return new Response("ignored", { status: 200 }); }
  if (ev.status === "paid") await markPaid(p, { paid_via: "webhook", provider_status: ev.rawStatus });
  else if (ev.status === "failed" && p.status === "pending") await db.from("payments").update({ status: "failed", provider_status: ev.rawStatus }).eq("id", p.id);
  return new Response("ok", { status: 200 });
};
