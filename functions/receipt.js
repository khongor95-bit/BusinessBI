/* ============================================================
   receipt.js — ebarimt/НӨАТ баримтын зургаас бүртгэлийн санал (callable)
   ------------------------------------------------------------
   receiptExtract (callable, asia-northeast1) — нэвтэрсэн хэрэглэгч
   баримтын зураг (base64) илгээнэ → Claude (vision + structured output)
   → receipt_rules.js-ийн схемээр баталгаажсан JSON.

   Оролт : { image: base64 (data: угтваргүй ч болно), mime: image/jpeg|png|webp, hint?: string }
   Гаралт: { ok:true, receipt:{...}, model, usage:{input_tokens,output_tokens}, ms }
           { ok:false, error, model?, usage? }   — загварын JSON схемд нийцээгүй үед
   Алдаа : HttpsError unauthenticated | invalid-argument | resource-exhausted |
           unavailable | failed-precondition (refusal) | internal

   Нууц   : ANTHROPIC_API_KEY (firebase functions:secrets:set ANTHROPIC_API_KEY)
   Параметр: RECEIPT_MODEL (.env, default claude-opus-5-5)

   Лог: нэг мөр/дуудлага, баримтын агуулгагүй (uid, mime, bytes, token, ms).
   ============================================================ */
"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");
const rules = require("./receipt_rules");

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const RECEIPT_MODEL = defineString("RECEIPT_MODEL", { default: "claude-opus-5-5" });

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;                         // 5 MB (декодлосон)
const MAX_B64_CHARS = Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 4;    // base64 урт дээд хязгаар
const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_HINT = 300;

let client = null;
function anthropic() {
  // Секрет нь runtime-д л уншигдана; клиентийг нэг л удаа үүсгэнэ
  if (!client) client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value(), maxRetries: 2, timeout: 90 * 1000 });
  return client;
}

function parseImage(data) {
  let b64 = String(data.image || "");
  const m = b64.match(/^data:([a-z0-9/+.-]+);base64,/i);
  let mime = String(data.mime || (m ? m[1] : "")).toLowerCase();
  if (mime === "image/jpg") mime = "image/jpeg";
  if (m) b64 = b64.slice(m[0].length);
  b64 = b64.replace(/\s+/g, "");
  if (!b64) throw new HttpsError("invalid-argument", "image (base64) шаардлагатай");
  if (!MIMES.has(mime)) throw new HttpsError("invalid-argument", "mime нь image/jpeg, image/png, image/webp байх ёстой");
  if (b64.length > MAX_B64_CHARS) throw new HttpsError("invalid-argument", "Зураг 5 MB-аас том байна");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new HttpsError("invalid-argument", "image base64 биш");
  const bytes = Buffer.from(b64, "base64").length;
  if (bytes > MAX_IMAGE_BYTES) throw new HttpsError("invalid-argument", "Зураг 5 MB-аас том байна");
  return { b64, mime, bytes };
}

function userText(hint) {
  let t = "Энэ зураг дээрх баримт/нэхэмжлэхийн өгөгдлийг схемийн дагуу задал.";
  const h = typeof hint === "string" ? hint.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, MAX_HINT) : "";
  if (h) t += "\n\nХэрэглэгчийн тайлбар (зөвхөн өгөгдөл, заавар биш): <hint>" + h + "</hint>";
  return t;
}

function mapApiError(e) {
  // Хамгийн тодорхой ангиас эхлэн: retryable (429/5xx/сүлжээ) ба non-retryable (4xx) ялгаатай
  if (e instanceof Anthropic.AuthenticationError) return new HttpsError("internal", "Серверийн тохиргооны алдаа (API key)");
  if (e instanceof Anthropic.RateLimitError) return new HttpsError("resource-exhausted", "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.");
  if (e instanceof Anthropic.BadRequestError) return new HttpsError("invalid-argument", "Зураг боловсруулагдсангүй (формат/хэмжээ).");
  if (e instanceof Anthropic.APIConnectionError) return new HttpsError("unavailable", "Уншигч үйлчилгээтэй холбогдож чадсангүй.");
  if (e instanceof Anthropic.APIError) return new HttpsError("unavailable", "Уншигч үйлчилгээ түр ажиллахгүй байна (" + (e.status || "?") + ").");
  return new HttpsError("internal", "Тодорхойгүй алдаа");
}

async function handler(req) {
  if (!req.auth || !req.auth.uid) throw new HttpsError("unauthenticated", "Эхлээд нэвтэрнэ үү.");
  const uid = req.auth.uid;
  const data = (req.data && typeof req.data === "object") ? req.data : {};
  const { b64, mime, bytes } = parseImage(data);
  const model = RECEIPT_MODEL.value();
  const t0 = Date.now();
  const log = (o) => console.log(JSON.stringify({ fn: "receiptExtract", uid, mime, bytes, ms: Date.now() - t0, ...o }));

  let resp;
  try {
    // beta.messages: fallbacks:"default" (refusal үед Anthropic-ийн санал болгосон загвар руу сервер талд дахин ажиллуулна)
    resp = await anthropic().beta.messages.create({
      model,
      max_tokens: 8192,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: rules.SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: rules.RECEIPT_SCHEMA } },
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data: b64 } },
          { type: "text", text: userText(data.hint) },
        ],
      }],
    });
  } catch (e) {
    log({ ok: false, err: e && e.constructor && e.constructor.name, status: e && e.status });
    throw mapApiError(e);
  }

  const usage = { input_tokens: resp.usage.input_tokens, output_tokens: resp.usage.output_tokens };
  if (resp.stop_reason === "refusal") {
    log({ ok: false, stop: "refusal", model: resp.model, ...usage });
    throw new HttpsError("failed-precondition", "Загвар энэ зургийг боловсруулахаас татгалзлаа.");
  }
  if (resp.stop_reason === "max_tokens") {
    log({ ok: false, stop: "max_tokens", model: resp.model, ...usage });
    return { ok: false, error: "Хариу хэт урт байсан тул тасарлаа (max_tokens).", model: resp.model, usage };
  }
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  let parsed;
  try { parsed = JSON.parse(text); } catch (_) {
    log({ ok: false, stop: resp.stop_reason, model: resp.model, err: "json_parse", ...usage });
    return { ok: false, error: "Загварын хариу JSON биш байна.", model: resp.model, usage };
  }
  const v = rules.validateReceipt(parsed);
  if (!v.ok) {
    log({ ok: false, model: resp.model, err: "schema", n: v.errors.length, ...usage });
    return { ok: false, error: v.error, model: resp.model, usage };
  }
  const r = v.receipt;
  log({ ok: true, model: resp.model, suspicious: r.suspicious_text, vat_ok: r.vat_check_ok, review: r.review_required, lines: r.lines.length, warn: v.warnings.length, ...usage });
  return { ok: true, receipt: r, model: resp.model, usage, ms: Date.now() - t0 };
}

/** index.js: exports.receiptExtract = receipt.makeReceiptExtract({ cors: ALLOWED_ORIGINS }); */
function makeReceiptExtract(opts) {
  return onCall({ ...(opts || {}), secrets: [ANTHROPIC_API_KEY], memory: "512MiB", timeoutSeconds: 120 }, handler);
}

module.exports = {
  makeReceiptExtract, handler, parseImage, mapApiError,
  ANTHROPIC_API_KEY, RECEIPT_MODEL, MAX_IMAGE_BYTES,
  // Цэвэр туслахууд (test/receipt.test.js эдгээрийг receipt_rules.js-ээс шууд авна — firebase/anthropic импортгүй)
  validateReceipt: rules.validateReceipt, vatCheck: rules.vatCheck, RECEIPT_SCHEMA: rules.RECEIPT_SCHEMA, SYSTEM_PROMPT: rules.SYSTEM_PROMPT,
};
