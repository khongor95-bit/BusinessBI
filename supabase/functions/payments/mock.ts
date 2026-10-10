/* mock — wire_mode=mock үед WIRE-гүйгээр урсгалыг турших тест төлбөрийн JSON API.
   Хуудас нь өөрөө сайт дээр (mock_checkout.html): Supabase edge gateway HTML-ийг text/plain болгож,
   CSP sandbox тавьдаг тул энд HTML буцаахгүй.
   POST {data:{pid, sig, action:'info'|'pay'|'cancel'}} → {ok, payment:{…}} | {ok, redirect}
   Линкийн sig (HMAC) — хэн дуртай нь "төлсөн" болгохоос хамгаална. test/live горимд хаалттай. */
import { admin, callable, getSetting, HttpsError } from "../_shared/http.ts";
import { PRODUCTS, getPayment, markPaid, mockSig, wireMode, useWire } from "../_shared/payments.ts";

export const handler = callable(async (data) => {
  if (useWire(await wireMode())) throw new HttpsError("failed-precondition", "Тест төлбөр зөвхөн mock горимд ажиллана.");
  const pid = String(data.pid ?? ""), sig = String(data.sig ?? ""), action = String(data.action ?? "info");
  if (!/^[0-9a-f-]{36}$/i.test(pid) || sig !== await mockSig(pid)) throw new HttpsError("permission-denied", "Линк буруу.");
  const p = await getPayment(pid);
  if (!p) throw new HttpsError("not-found", "Төлбөр олдсонгүй");
  const site = await getSetting("site_url", "https://businessbi.mn");
  const view = { paymentId: p.id, title: PRODUCTS[p.tool]?.title ?? p.tool, email: p.email, amount: p.amount, currency: p.currency, status: p.status };
  if (action === "info") return { ok: true, payment: view };
  if (action === "pay") { if (p.status !== "paid") await markPaid(p, { paid_via: "mock" }); return { ok: true, redirect: `${site}/pay_done.html?pid=${pid}&ok=1` }; }
  if (action === "cancel") {
    if (p.status === "pending") await admin().from("payments").update({ status: "failed", provider_status: "mock_cancel" }).eq("id", pid);
    return { ok: true, redirect: `${site}/pay_done.html?pid=${pid}&ok=0` };
  }
  throw new HttpsError("invalid-argument", "action: info | pay | cancel");
}, { auth: "none" });
