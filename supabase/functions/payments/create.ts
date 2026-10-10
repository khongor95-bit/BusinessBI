/* create-payment — {tool, meta:{…}} → {paymentId, checkoutUrl, amount, reused, …}
   Нэвтэрсэн хэрэглэгчид нэхэмжлэл үүсгэж WIRE checkout URL (эсвэл mock хуудас) буцаана.
   8 минутын дотор үүссэн төлөгдөөгүй нэхэмжлэл байвал түүнийг дахин ашиглана. */
import { admin, callable, getSetting, HttpsError } from "../_shared/http.ts";
import { PRODUCTS, REUSE_PENDING_MS, publicView, mockSig, wireMode, useWire, functionsBase, type Payment } from "../_shared/payments.ts";
import { createIntent, WireError } from "../_shared/wire.ts";

export const handler = callable(async (data, { user }) => {
  const tool = String(data.tool ?? "");
  const product = PRODUCTS[tool];
  if (!product) throw new HttpsError("invalid-argument", "Тодорхойгүй хэрэгсэл: " + tool);
  const metaIn = (data.meta && typeof data.meta === "object") ? data.meta as Record<string, unknown> : {};
  const meta: Record<string, string> = {};
  for (const k of Object.keys(metaIn).slice(0, 8)) meta[String(k).slice(0, 32)] = String(metaIn[k]).slice(0, 120);
  const uid = user!.id, email = user!.email ?? "";
  const db = admin();

  const since = new Date(Date.now() - REUSE_PENDING_MS).toISOString();
  const { data: pend } = await db.from("payments").select("*").eq("uid", uid).eq("tool", tool).eq("status", "pending")
    .gte("created_at", since).order("created_at", { ascending: false }).limit(1);
  if (pend && pend[0]) return { ...publicView(pend[0] as Payment), reused: true };

  const mode = await wireMode();
  const site = await getSetting("site_url", "https://businessbi.mn");
  const row: Record<string, unknown> = {
    uid, email, tool, amount: product.amount, currency: product.currency, status: "pending",
    provider: useWire(mode) ? "wire" : "mock", livemode: mode === "live", meta,
  };
  // id-г урьдчилан гаргана: success_url, metadata, Idempotency-Key-д хэрэгтэй
  const id = crypto.randomUUID();
  row.id = id;
  const successUrl = `${site}/pay_done.html?pid=${id}&ok=1`;
  const cancelUrl = `${site}/pay_done.html?pid=${id}&ok=0`;

  if (useWire(mode)) {
    const key = Deno.env.get("WIRE_SECRET_KEY") ?? "";
    if (!key) throw new HttpsError("failed-precondition", "WIRE_SECRET_KEY тохируулаагүй (Supabase → Edge Functions → Secrets).");
    if (mode === "live" && !key.startsWith("sk_live_")) throw new HttpsError("failed-precondition", "Live горимд sk_live_ түлхүүр хэрэгтэй.");
    try {
      const ops = (await getSetting("wire_operators", "")).split(",").map((s) => s.trim()).filter(Boolean);
      const intent = await createIntent(key, {
        amount: product.amount, currency: product.currency, description: `BusinessBI — ${product.title}`,
        metadata: { paymentId: id, uid, tool }, successUrl, cancelUrl, operators: mode === "test" ? ["sandbox"] : ops,
      });
      row.provider_intent_id = intent.intentId; row.provider_session_id = intent.sessionId;
      row.checkout_url = intent.checkoutUrl; row.provider_raw = intent.raw;
    } catch (e) {
      console.error("WIRE createIntent failed", (e as Error).message, (e as WireError).body);
      const code = (e as WireError).code;
      const hint = code === "connector_required" || code === "settlement_account_required"
        ? " (WIRE dashboard → Холболтууд дээр оператор идэвхжүүлж, орлого хүлээн авах данс холбоно уу)" : "";
      throw new HttpsError("unavailable", "WIRE.mn-тэй холбогдож чадсангүй. Дараа дахин оролдоно уу." + hint);
    }
  } else {
    row.provider_intent_id = "mock_" + id;
    row.checkout_url = `${functionsBase()}/payments/mock?pid=${id}&sig=${await mockSig(id)}`;
  }
  const { data: ins, error } = await db.from("payments").insert(row).select().single();
  if (error) { console.error(error); throw new HttpsError("internal", "Төлбөр бүртгэж чадсангүй"); }
  return { ...publicView(ins as Payment), reused: false };
}, { auth: "user" });
