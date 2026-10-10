/* wire-admin — зөвхөн админ (app_settings.admin_emails). {action, …}
   status            → горим, түлхүүр байгаа эсэх, webhook бүртгэл, сүүлийн төлбөрүүдийн тоо
   set_mode          {mode: mock|test|live}
   set_setting       {key, value}   (site_url, wire_operators, receipt_model)
   register_webhook  {replace?: bool} → WIRE-д endpoint бүртгэж, whsec-ийг app_secrets-д хадгална (хэзээ ч буцаахгүй)
   list_webhooks     → WIRE дээрх endpoint-ууд
   test_wire         → WIRE API-тай холбогдож байгаа эсэх (GET /payment_intents?limit=1) */
import { admin, callable, getSecret, getSetting, setSecret, setSetting, HttpsError } from "../_shared/http.ts";
import { functionsBase } from "../_shared/payments.ts";
import { deleteWebhook, listWebhooks, registerWebhook, WireError } from "../_shared/wire.ts";

const key = () => Deno.env.get("WIRE_SECRET_KEY") ?? "";
const keyKind = () => { const k = key(); return !k ? "none" : k.startsWith("sk_live_") ? "live" : k.startsWith("sk_test_") ? "test" : "unknown"; };

export const handler = callable(async (data) => {
  const action = String(data.action ?? "status");
  const db = admin();
  if (action === "status") {
    const { count: total } = await db.from("payments").select("*", { count: "exact", head: true });
    const { count: paid } = await db.from("payments").select("*", { count: "exact", head: true }).eq("status", "paid");
    const { data: last } = await db.from("payments").select("id,tool,amount,status,provider,livemode,paid_via,created_at,paid_at,email").order("created_at", { ascending: false }).limit(20);
    let wire_endpoints: unknown = null;
    if (key()) { try { wire_endpoints = (await listWebhooks(key())).map((e: any) => ({ id: e.id, url: e.url, status: e.status, livemode: e.livemode, enabled_events: e.enabled_events })); } catch (e) { wire_endpoints = { error: (e as Error).message }; } }
    return {
      wire_endpoints,
      mode: await getSetting("wire_mode", "mock"), site_url: await getSetting("site_url", ""), wire_operators: await getSetting("wire_operators", ""),
      receipt_model: await getSetting("receipt_model", ""), key: keyKind(), anthropic_key: !!Deno.env.get("ANTHROPIC_API_KEY"),
      webhook_secret: !!(await getSecret("wire_webhook_secret")), webhook_url: functionsBase() + "/payments/webhook",
      webhook_registered_for: await getSetting("wire_webhook_key_kind", ""),
      counts: { total: total ?? 0, paid: paid ?? 0 }, last: last ?? [],
    };
  }
  if (action === "set_mode") {
    const mode = String(data.mode ?? "");
    if (!["mock", "test", "live"].includes(mode)) throw new HttpsError("invalid-argument", "mode: mock | test | live");
    if (mode === "test" && keyKind() !== "test") throw new HttpsError("failed-precondition", "test горимд sk_test_ түлхүүр хэрэгтэй (WIRE_SECRET_KEY).");
    if (mode === "live" && keyKind() !== "live") throw new HttpsError("failed-precondition", "live горимд sk_live_ түлхүүр хэрэгтэй (WIRE_SECRET_KEY).");
    if (mode !== "mock" && !(await getSecret("wire_webhook_secret"))) throw new HttpsError("failed-precondition", "Эхлээд webhook бүртгэнэ үү (register_webhook).");
    await setSetting("wire_mode", mode);
    return { ok: true, mode };
  }
  if (action === "set_setting") {
    const k = String(data.key ?? ""), v = String(data.value ?? "").slice(0, 500);
    if (!["site_url", "wire_operators", "receipt_model", "admin_emails"].includes(k)) throw new HttpsError("invalid-argument", "key зөвшөөрөгдөөгүй");
    await setSetting(k, v);
    return { ok: true };
  }
  if (action === "register_webhook" || action === "list_webhooks" || action === "test_wire") {
    const k = key();
    if (!k) throw new HttpsError("failed-precondition", "WIRE_SECRET_KEY тохируулаагүй (Supabase → Edge Functions → Secrets).");
    try {
      if (action === "list_webhooks") return { key: keyKind(), endpoints: await listWebhooks(k) };
      if (action === "test_wire") { const eps = await listWebhooks(k); return { ok: true, key: keyKind(), endpoints: eps.length }; }
      const url = functionsBase() + "/payments/webhook";
      if (data.replace) for (const ep of await listWebhooks(k)) { if (ep?.id) await deleteWebhook(k, ep.id); }
      const r = await registerWebhook(k, url, ["payment_intent.succeeded", "payment_intent.canceled"]);
      if (!r.secret) throw new HttpsError("unavailable", "WIRE хариунд signing secret ирсэнгүй (талбарууд: " + r.keys.join(", ") + "). Endpoint үүссэн бол дахин «Webhook бүртгэх» дарна — хуучныг устгаад шинээр авна.");
      await setSecret("wire_webhook_secret", r.secret);
      await setSetting("wire_webhook_key_kind", keyKind());
      return { ok: true, id: r.id, url: r.url, status: r.status, key: keyKind() };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      const we = e as WireError;
      throw new HttpsError("unavailable", "WIRE: " + (we.message ?? "алдаа"));
    }
  }
  throw new HttpsError("invalid-argument", "Тодорхойгүй action: " + action);
}, { auth: "admin" });
