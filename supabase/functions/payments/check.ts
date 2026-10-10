/* check-payment — {paymentId, consume?:bool} → publicView
   pending + wire бол WIRE-ээс шууд лавлана (webhook хоцорсон ч ажиллана).
   consume=true: татаж авсан тоог нэгээр нэмнэ (статистик). */
import { admin, callable, HttpsError } from "../_shared/http.ts";
import { getPayment, markPaid, publicView } from "../_shared/payments.ts";
import { getIntentStatus } from "../_shared/wire.ts";

export const handler = callable(async (data, { user }) => {
  const paymentId = String(data.paymentId ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(paymentId)) throw new HttpsError("invalid-argument", "paymentId шаардлагатай");
  let p = await getPayment(paymentId);
  if (!p) throw new HttpsError("not-found", "Төлбөр олдсонгүй");
  if (p.uid !== user!.id) throw new HttpsError("permission-denied", "Энэ төлбөр таных биш");

  if (p.status === "pending" && p.provider === "wire" && p.provider_intent_id) {
    const key = Deno.env.get("WIRE_SECRET_KEY") ?? "";
    if (key) {
      try {
        const st = await getIntentStatus(key, p.provider_intent_id);
        if (st.status === "paid") p = await markPaid(p, { paid_via: "poll", provider_status: st.rawStatus });
        else if (st.status === "failed") {
          await admin().from("payments").update({ status: "failed", provider_status: st.rawStatus }).eq("id", p.id);
          p = { ...p, status: "failed", provider_status: st.rawStatus };
        }
      } catch (e) { console.warn("WIRE status poll failed", (e as Error).message); }
    }
  }
  const expMs = p.expires_at ? new Date(p.expires_at).getTime() : 0;
  if (data.consume && p.status === "paid" && expMs > Date.now()) {
    const { data: upd } = await admin().from("payments").update({ downloads: (p.downloads ?? 0) + 1, last_download_at: new Date().toISOString() }).eq("id", p.id).select().single();
    if (upd) p = upd as typeof p;
  }
  return publicView(p);
}, { auth: "user" });
