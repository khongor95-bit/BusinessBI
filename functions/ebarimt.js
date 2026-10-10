/* ============================================================
   ebarimt.js — ebarimt.mn татвар төлөгчийн лавлагаа (сервер тал)
   ------------------------------------------------------------
   Хөтөч ebarimt API-г шууд дуудаж чадахгүй (CORS) тул энэ функц
   прокси болж, хариуг Firestore-д 30 хоног кэшлэнэ.

   ebarimtLookup (callable) — {reg?: "АА12345678", tin?: "12345678"}
     → {tin, reg, name, vatPayer, found, cachedAt}
     → upstream алдаа үед {found:false, error:"upstream"} (throw хийхгүй)

   Дээд талын API (нийтийн, нэвтрэлтгүй):
     GET https://api.ebarimt.mn/api/info/check/getTinInfo?regNo=<РД> → ТТД
     GET https://api.ebarimt.mn/api/info/check/getInfo?tin=<ТТД>     → {name, vatPayer, found}
   Хариуны бүтэц өөрчлөгдөж болзошгүй тул талбаруудыг mapInfo/mapTin-д
   уян хатан уншина — засах бол зөвхөн тэр хоёр функцийг.

   Firestore: ebarimt_cache/{tin}  — {tin, reg, name, vatPayer, found, fetchedAt}
              ebarimt_cache/reg_{РД} — {tin, fetchedAt}   (РД → ТТД)
   ============================================================ */
"use strict";
// firebase-functions-ийг зөөлөн ачаална: тест (node test/ebarimt.test.js) node_modules-гүй ч ажиллана
let HttpsError;
try { ({ HttpsError } = require("firebase-functions/v2/https")); }
catch (_) { HttpsError = class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }; }

const EBARIMT_BASE = process.env.EBARIMT_BASE_URL || "https://api.ebarimt.mn/api/info/check";
const TTL_MS = 30 * 24 * 3600 * 1000;   // 30 хоног
const TIMEOUT_MS = 8000;

// ── Оролт хэвийн болгох ──────────────────────────────────────
// reg: хоосон зай арилгаж, том үсэг (кирилл/латин), зөвхөн үсэг+тоо
// tin: зөвхөн цифр
function normalizeInput(data) {
  const d = (data && typeof data === "object") ? data : {};
  const reg = String(d.reg || "").replace(/\s+/g, "").toUpperCase().replace(/[^A-ZА-ЯӨҮЁ0-9]/g, "").slice(0, 20);
  const tin = String(d.tin || "").replace(/\D/g, "").slice(0, 20);
  return { reg, tin };
}

// Объект дотроос эхний олдсон түлхүүрийг авна (data/result/response давхаргыг ч үзнэ)
function unwrap(obj) {
  let o = obj;
  for (let i = 0; i < 3 && o && typeof o === "object"; i++) {
    const inner = o.data !== undefined ? o.data : (o.result !== undefined ? o.result : (o.response !== undefined ? o.response : undefined));
    if (inner === undefined || inner === null) break;
    o = inner;
    if (typeof o !== "object") break;   // data:"<ттд>" гэх мэт энгийн утга
  }
  return o;
}
function pick(obj, keys) {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  return undefined;
}
function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v || "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "тийм";
}

// getInfo хариу → {name, vatPayer, found}
function mapInfo(payload) {
  const o = unwrap(payload) || {};
  const name = String(pick(o, ["name", "fullName", "companyName", "taxpayerName", "nameMn"]) || "").trim();
  const vatRaw = pick(o, ["vatPayer", "vatpayer", "isVatPayer", "vat_payer", "vatPayerStatus"]);
  const foundRaw = pick(o, ["found", "isFound", "exists", "status"]);
  const found = foundRaw !== undefined ? toBool(foundRaw) : !!name;
  return { name, vatPayer: found && toBool(vatRaw), found };
}
// getTinInfo хариу → ТТД (string) эсвэл ""
function mapTin(payload) {
  if (typeof payload === "string" || typeof payload === "number") return String(payload).replace(/\D/g, "");
  const o = unwrap(payload);
  if (typeof o === "string" || typeof o === "number") return String(o).replace(/\D/g, "");
  const v = pick(o || {}, ["tin", "TIN", "ttd", "tinNo", "tin_no", "value"]);
  return v === undefined ? "" : String(v).replace(/\D/g, "");
}

// ── Дээд талын API дуудах (8с timeout) ───────────────────────
async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const text = await r.text();
    if (!r.ok) { const e = new Error("ebarimt HTTP " + r.status); e.body = text.slice(0, 300); throw e; }
    try { return JSON.parse(text); } catch (_) { return text; }
  } finally { clearTimeout(t); }
}
const resolveTin = async (reg) => mapTin(await fetchJson(`${EBARIMT_BASE}/getTinInfo?regNo=${encodeURIComponent(reg)}`));
const fetchInfo = async (tin) => mapInfo(await fetchJson(`${EBARIMT_BASE}/getInfo?tin=${encodeURIComponent(tin)}`));

// ── Кэш (Firestore) ──────────────────────────────────────────
function cacheStore(db) {
  const col = db.collection("ebarimt_cache");
  const fresh = (s) => s.exists && (Date.now() - (+s.data().fetchedAt || 0)) < TTL_MS;
  return {
    async get(id) { const s = await col.doc(id).get(); return fresh(s) ? s.data() : null; },
    async set(id, v) { await col.doc(id).set({ ...v, fetchedAt: Date.now() }); },
  };
}

// ── Гол урсгал (db-г параметрээр авна: тест хийхэд амар) ─────
async function lookup(db, input) {
  const { reg, tin: tinIn } = normalizeInput(input);
  if (!reg && !tinIn) throw new HttpsError("invalid-argument", "reg (РД) эсвэл tin (ТТД) шаардлагатай");
  const cache = cacheStore(db);
  let tin = tinIn;
  try {
    if (!tin && reg) {
      const c = await cache.get("reg_" + reg);
      tin = c ? c.tin : await resolveTin(reg);
      if (!tin && /^\d+$/.test(reg)) tin = reg;   // хэрэглэгч "Регистр" талбарт ТТД бичсэн байж болно
      if (!tin) return { tin: "", reg, name: "", vatPayer: false, found: false, cachedAt: null };
      if (!c) await cache.set("reg_" + reg, { tin, reg });
    }
    const hit = await cache.get(tin);
    if (hit) return { tin, reg: hit.reg || reg, name: hit.name || "", vatPayer: !!hit.vatPayer, found: !!hit.found, cachedAt: hit.fetchedAt };
    const info = await fetchInfo(tin);
    const out = { tin, reg, name: info.name, vatPayer: info.vatPayer, found: info.found };
    if (info.found) await cache.set(tin, out);   // олдоогүйг кэшлэхгүй (шинээр бүртгүүлсэн байж болно)
    return { ...out, cachedAt: null };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.warn("ebarimt upstream failed", e.message, e.body || "");
    return { tin: tin || "", reg, name: "", vatPayer: false, found: false, error: "upstream" };
  }
}

// index.js-д: exports.ebarimtLookup = ebarimt.makeHandler(db, { cors: ALLOWED_ORIGINS })
function makeHandler(db, opts) {
  const { onCall } = require("firebase-functions/v2/https");
  return onCall({ ...(opts || {}), timeoutSeconds: 20, memory: "128MiB" }, (req) => lookup(db, req.data));
}

module.exports = { makeHandler, lookup, normalizeInput, mapInfo, mapTin, TTL_MS };
