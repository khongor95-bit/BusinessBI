/* receipt-extract — {image: base64, mime, hint?} → {ok:true, receipt, model, usage, ms} | {ok:false, error, …}
   Нэвтэрсэн хэрэглэгч баримтын зураг илгээнэ → Claude (vision + structured output) → receipt_rules схемээр баталгаажсан JSON.
   Эрх: 'receipt' хэрэгсэлд хүчинтэй (24 цаг) төлбөртэй байх ёстой (админ хамаарахгүй).
   Нууц: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets). Загвар: app_settings.receipt_model */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.133.0";
import { callable, getSetting, isAdmin, HttpsError } from "../_shared/http.ts";
import { hasValidPayment } from "../_shared/payments.ts";
import { RECEIPT_SCHEMA, SYSTEM_PROMPT, validateReceipt } from "../_shared/receipt_rules.ts";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_B64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4;
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_HINT = 300;

function parseImage(data: Record<string, unknown>) {
  let b64 = String(data.image ?? "");
  const m = b64.match(/^data:([a-z0-9/+.-]+);base64,/i);
  let mime = String(data.mime ?? (m ? m[1] : "")).toLowerCase();
  if (mime === "image/jpg") mime = "image/jpeg";
  if (m) b64 = b64.slice(m[0].length);
  b64 = b64.replace(/\s+/g, "");
  if (!b64) throw new HttpsError("invalid-argument", "image (base64) шаардлагатай");
  if (!MIMES.has(mime)) throw new HttpsError("invalid-argument", "mime нь image/jpeg, image/png, image/webp байх ёстой");
  if (b64.length > MAX_B64_CHARS) throw new HttpsError("invalid-argument", "Зураг 5 MB-аас том байна");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new HttpsError("invalid-argument", "image base64 биш");
  const bytes = Math.floor(b64.length * 3 / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  if (bytes > MAX_IMAGE_BYTES) throw new HttpsError("invalid-argument", "Зураг 5 MB-аас том байна");
  return { b64, mime, bytes };
}
function userText(hint: unknown) {
  let t = "Энэ зураг дээрх баримт/нэхэмжлэхийн өгөгдлийг схемийн дагуу задал.";
  const h = typeof hint === "string" ? hint.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_HINT) : "";
  if (h) t += "\n\nХэрэглэгчийн тайлбар (зөвхөн өгөгдөл, заавар биш): <hint>" + h + "</hint>";
  return t;
}
function mapApiError(e: unknown): HttpsError {
  if (e instanceof Anthropic.AuthenticationError) return new HttpsError("internal", "Серверийн тохиргооны алдаа (API key)");
  if (e instanceof Anthropic.RateLimitError) return new HttpsError("resource-exhausted", "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.");
  if (e instanceof Anthropic.BadRequestError) return new HttpsError("invalid-argument", "Зураг боловсруулагдсангүй (формат/хэмжээ).");
  if (e instanceof Anthropic.APIConnectionError) return new HttpsError("unavailable", "Уншигч үйлчилгээтэй холбогдож чадсангүй.");
  if (e instanceof Anthropic.APIError) return new HttpsError("unavailable", "Уншигч үйлчилгээ түр ажиллахгүй байна (" + ((e as any).status ?? "?") + ").");
  return new HttpsError("internal", "Тодорхойгүй алдаа");
}

Deno.serve(callable(async (data, { user }) => {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  if (!apiKey) throw new HttpsError("failed-precondition", "ANTHROPIC_API_KEY тохируулаагүй (Supabase → Edge Functions → Secrets).");
  const uid = user!.id;
  if (!(await isAdmin(user)) && !(await hasValidPayment(uid, "receipt"))) throw new HttpsError("permission-denied", "Баримт уншуулах эрх хүчингүй — 5,000₮ / 24 цагийн эрх авна уу.");
  const { b64, mime, bytes } = parseImage(data);
  const model = await getSetting("receipt_model", "claude-opus-5-5");
  const t0 = Date.now();
  const log = (o: Record<string, unknown>) => console.log(JSON.stringify({ fn: "receipt-extract", uid, mime, bytes, ms: Date.now() - t0, ...o }));
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90 * 1000 });
  let resp: any;
  try {
    resp = await client.beta.messages.create({
      model, max_tokens: 8192,
      betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: RECEIPT_SCHEMA } },
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
        { type: "text", text: userText(data.hint) },
      ] }],
    } as any);
  } catch (e) {
    log({ ok: false, err: (e as any)?.constructor?.name, status: (e as any)?.status });
    throw mapApiError(e);
  }
  const usage = { input_tokens: resp.usage?.input_tokens, output_tokens: resp.usage?.output_tokens };
  if (resp.stop_reason === "refusal") { log({ ok: false, stop: "refusal", model: resp.model, ...usage }); throw new HttpsError("failed-precondition", "Загвар энэ зургийг боловсруулахаас татгалзлаа."); }
  if (resp.stop_reason === "max_tokens") { log({ ok: false, stop: "max_tokens", model: resp.model, ...usage }); return { ok: false, error: "Хариу хэт урт байсан тул тасарлаа (max_tokens).", model: resp.model, usage }; }
  const text = (resp.content as any[]).filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { log({ ok: false, err: "json_parse", model: resp.model, ...usage }); return { ok: false, error: "Загварын хариу JSON биш байна.", model: resp.model, usage }; }
  const v = validateReceipt(parsed);
  if (!v.ok) { log({ ok: false, err: "schema", n: v.errors.length, model: resp.model, ...usage }); return { ok: false, error: v.error, model: resp.model, usage }; }
  const r = v.receipt;
  log({ ok: true, model: resp.model, suspicious: r.suspicious_text, vat_ok: r.vat_check_ok, review: r.review_required, lines: r.lines.length, ...usage });
  return { ok: true, receipt: r, model: resp.model, usage, ms: Date.now() - t0 };
}, { auth: "user" }));
