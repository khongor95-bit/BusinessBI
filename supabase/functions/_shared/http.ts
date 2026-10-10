/* ============================================================
   http.ts — Edge Function-ийн нийтлэг хэсэг: CORS, "callable" протокол, нэвтрэлт
   ------------------------------------------------------------
   Клиент (pay.js, ebarimt.js, receipt.js) Firebase callable маягийн протоколоор ярьдаг:
     POST  body {data:{…}}  →  200 {result:{…}}  |  4xx/5xx {error:{status, message}}
   Нэвтрэлт: Authorization: Bearer <Supabase access token> → auth.getUser(token)
   ============================================================ */
import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGINS = [/^https?:\/\/(www\.)?businessbi\.mn$/, /^https?:\/\/[a-z0-9-]+\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

let adminClient: SupabaseClient | null = null;
/** Service role клиент (RLS-ийг алгасна) — зөвхөн сервер талд */
export function admin(): SupabaseClient {
  if (!adminClient) adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

export class HttpsError extends Error {
  status: string; http: number;
  constructor(status: string, message: string) { super(message); this.status = status; this.http = HTTP_OF[status] ?? 500; }
}
const HTTP_OF: Record<string, number> = {
  "invalid-argument": 400, "unauthenticated": 401, "permission-denied": 403, "not-found": 404,
  "failed-precondition": 412, "resource-exhausted": 429, "unavailable": 503, "internal": 500,
};

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const ok = ALLOWED_ORIGINS.some((re) => re.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin : "https://businessbi.mn",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}
export function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(req), ...extra } });
}

/** Bearer token → хэрэглэгч (null = нэвтрээгүй). anon key JWT-г хэрэглэгч гэж үзэхгүй. */
export async function getUser(req: Request): Promise<User | null> {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  const token = m[1].trim();
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
export async function adminEmails(): Promise<string[]> {
  const { data } = await admin().from("app_settings").select("value").eq("key", "admin_emails").maybeSingle();
  return String(data?.value ?? "khongor95@gmail.com").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user?.email) return false;
  return (await adminEmails()).includes(user.email.toLowerCase());
}

type Handler = (data: Record<string, unknown>, ctx: { user: User | null; req: Request }) => Promise<unknown>;
/**
 * callable(handler, {auth}) → Deno.serve-д өгөх функц.
 * auth: 'none' | 'user' (нэвтэрсэн байх) | 'admin' (admin_emails-д байх)
 */
export function callable(handler: Handler, opts: { auth: "none" | "user" | "admin" } = { auth: "user" }) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, { error: { status: "invalid-argument", message: "POST only" } }, 405);
    try {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { body = {}; }
      const data = (body && typeof body.data === "object" && body.data) ? body.data as Record<string, unknown> : {};
      const user = opts.auth === "none" ? await getUser(req).catch(() => null) : await getUser(req);
      if (opts.auth !== "none" && !user) throw new HttpsError("unauthenticated", "Эхлээд нэвтэрнэ үү.");
      if (opts.auth === "admin" && !(await isAdmin(user))) throw new HttpsError("permission-denied", "Зөвхөн админ.");
      const result = await handler(data, { user, req });
      return json(req, { result });
    } catch (e) {
      if (e instanceof HttpsError) return json(req, { error: { status: e.status, message: e.message } }, e.http);
      console.error("callable error", (e as Error)?.message, (e as Error)?.stack);
      return json(req, { error: { status: "internal", message: "Серверийн алдаа" } }, 500);
    }
  };
}

/** app_settings-ээс утга (байхгүй бол default) */
export async function getSetting(key: string, def = ""): Promise<string> {
  const { data } = await admin().from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value != null && data.value !== "" ? String(data.value) : def;
}
export async function setSetting(key: string, value: string): Promise<void> {
  await admin().from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() });
}
export async function getSecret(key: string): Promise<string> {
  const { data } = await admin().from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ? String(data.value) : "";
}
export async function setSecret(key: string, value: string): Promise<void> {
  await admin().from("app_secrets").upsert({ key, value, updated_at: new Date().toISOString() });
}
