/* payments — BusinessBI төлбөрийн сервер тал (WIRE.mn), нэг Edge Function, замаар салгана:
     POST /functions/v1/payments/create    {data:{tool, meta}}        → нэхэмжлэл + checkout URL   (нэвтэрсэн)
     POST /functions/v1/payments/check     {data:{paymentId, consume}} → төлөв                     (нэвтэрсэн)
     POST /functions/v1/payments/webhook   WIRE.mn-ээс (WirePayment-Signature)                     (нийтийн)
     POST /functions/v1/payments/mock      {data:{pid,sig,action}}    → тест төлбөрийн JSON (хуудас: mock_checkout.html)
     POST /functions/v1/payments/admin     {data:{action,…}}          → горим, webhook бүртгэл    (админ)
   verify_jwt = false: нэвтрэлтийг _shared/http.ts callable() өөрөө шалгана (webhook/mock-д JWT байхгүй).
   Тохиргоо: app_settings (wire_mode, site_url, wire_operators); нууц: env WIRE_SECRET_KEY, app_secrets.wire_webhook_secret */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/http.ts";
import { handler as create } from "./create.ts";
import { handler as check } from "./check.ts";
import { handler as webhook } from "./webhook.ts";
import { handler as mock } from "./mock.ts";
import { handler as admin } from "./admin.ts";

const ROUTES: Record<string, (req: Request) => Promise<Response>> = { create, check, webhook, mock, admin };

Deno.serve((req: Request) => {
  const url = new URL(req.url);
  const seg = url.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  const h = ROUTES[seg];
  if (!h) {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    return new Response(JSON.stringify({ error: { status: "not-found", message: "unknown route: " + seg } }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders(req) } });
  }
  return h(req);
});
