/* mock-checkout — wire_mode=mock үед WIRE-гүйгээр урсгалыг бүтнээр турших «банкны хуудас».
   GET: хуудас, POST: төлсөн/цуцалсан гэж тэмдэглээд pay_done.html руу буцаана.
   verify_jwt = false (хөтчөөс шууд нээгдэнэ); линкийн sig-ээр хамгаална. test/live горимд 404. */
import { admin, getSetting } from "../_shared/http.ts";
import { PRODUCTS, getPayment, markPaid, mockSig, wireMode, useWire } from "../_shared/payments.ts";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export const handler = async (req: Request): Promise<Response> => {
  if (useWire(await wireMode())) return new Response("mock checkout is disabled in test/live mode", { status: 404 });
  const url = new URL(req.url);
  let pid = url.searchParams.get("pid") ?? "", sig = url.searchParams.get("sig") ?? "", action = "";
  if (req.method === "POST") {
    const form = await req.formData().catch(() => null);
    if (form) { pid = String(form.get("pid") ?? pid); sig = String(form.get("sig") ?? sig); action = String(form.get("action") ?? "pay"); }
  }
  if (!pid || sig !== await mockSig(pid)) return new Response("bad link", { status: 403 });
  const p = await getPayment(pid);
  if (!p) return new Response("payment not found", { status: 404 });
  const site = await getSetting("site_url", "https://businessbi.mn");
  if (req.method === "POST") {
    if (action === "pay") { await markPaid(p, { paid_via: "mock" }); return Response.redirect(`${site}/pay_done.html?pid=${pid}&ok=1`, 302); }
    await admin().from("payments").update({ status: "failed", provider_status: "mock_cancel" }).eq("id", pid);
    return Response.redirect(`${site}/pay_done.html?pid=${pid}&ok=0`, 302);
  }
  const html = `<!doctype html><html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Тест төлбөр — WIRE.mn (mock)</title>
<style>body{font-family:Inter,system-ui,sans-serif;background:#f4f6f5;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center}
.c{background:#fff;border:1px solid #e3e7e4;border-radius:16px;padding:28px 30px;width:min(420px,92vw);box-shadow:0 10px 40px rgba(0,0,0,.08)}
h1{font-size:18px;margin:0 0 6px}.m{color:#6b7670;font-size:13px;margin:0 0 18px}.a{font-size:30px;font-weight:800;color:#1a4d38;margin:0 0 18px}
button{width:100%;padding:13px;border-radius:10px;border:none;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px}
.p{background:#216a4c;color:#fff}.x{background:#fff;color:#c0492b;border:1.5px solid #e6c0b5}
.t{display:inline-block;background:#fff4d6;color:#8a6410;font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;margin-bottom:12px}</style></head>
<body><div class="c"><span class="t">ТЕСТ ГОРИМ — жинхэнэ мөнгө шилжихгүй</span>
<h1>BusinessBI төлбөр</h1><p class="m">${esc(PRODUCTS[p.tool]?.title ?? p.tool)} · ${esc(p.email)}</p>
<div class="a">${p.amount.toLocaleString("en-US")} ₮</div>
${p.status === "paid" ? `<p class="m">✓ Энэ нэхэмжлэл аль хэдийн төлөгдсөн.</p>` : `
<form method="post"><input type="hidden" name="pid" value="${esc(pid)}"><input type="hidden" name="sig" value="${esc(sig)}">
<button class="p" name="action" value="pay">Төлөх (тест)</button>
<button class="x" name="action" value="cancel">Цуцлах</button></form>`}
<p class="m" style="margin-top:16px">Жинхэнэ горимд энэ хуудсыг WIRE.mn-ийн checkout (pay.wire.mn — QR, банкны апп) орлоно.</p>
</div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
};
