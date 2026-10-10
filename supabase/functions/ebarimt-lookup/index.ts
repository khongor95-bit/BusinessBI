/* ebarimt-lookup — {reg?: "АА12345678", tin?: "12345678"} → {tin, reg, name, vatPayer, found, cachedAt}
   ebarimt.mn-ийн нийтийн API-г прокси (хөтөч CORS-оор шууд дуудаж чадахгүй), 30 хоног кэшлэнэ.
   Нэвтрэлт шаардахгүй (verify_jwt = false). Upstream алдаа үед {found:false, error:"upstream"}.
     GET https://api.ebarimt.mn/api/info/check/getTinInfo?regNo=<РД> → ТТД
     GET https://api.ebarimt.mn/api/info/check/getInfo?tin=<ТТД>     → {name, vatPayer, found} */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { admin, callable, HttpsError } from "../_shared/http.ts";

const BASE = Deno.env.get("EBARIMT_BASE_URL") ?? "https://api.ebarimt.mn/api/info/check";
const TTL_MS = 30 * 24 * 3600 * 1000;
const TIMEOUT_MS = 8000;

function normalizeInput(d: Record<string, unknown>) {
  const reg = String(d.reg ?? "").replace(/\s+/g, "").toUpperCase().replace(/[^A-ZА-ЯӨҮЁ0-9]/g, "").slice(0, 20);
  const tin = String(d.tin ?? "").replace(/\D/g, "").slice(0, 20);
  return { reg, tin };
}
function unwrap(obj: any): any {
  let o = obj;
  for (let i = 0; i < 3 && o && typeof o === "object"; i++) {
    const inner = o.data !== undefined ? o.data : (o.result !== undefined ? o.result : (o.response !== undefined ? o.response : undefined));
    if (inner === undefined || inner === null) break;
    o = inner; if (typeof o !== "object") break;
  }
  return o;
}
const pick = (o: any, keys: string[]) => { for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k]; return undefined; };
const toBool = (v: unknown) => typeof v === "boolean" ? v : typeof v === "number" ? v !== 0 : ["true", "1", "yes", "y", "тийм"].includes(String(v ?? "").trim().toLowerCase());
function mapInfo(payload: any) {
  const o = unwrap(payload) ?? {};
  const name = String(pick(o, ["name", "fullName", "companyName", "taxpayerName", "nameMn"]) ?? "").trim();
  const vatRaw = pick(o, ["vatPayer", "vatpayer", "isVatPayer", "vat_payer", "vatPayerStatus"]);
  const foundRaw = pick(o, ["found", "isFound", "exists", "status"]);
  const found = foundRaw !== undefined ? toBool(foundRaw) : !!name;
  return { name, vatPayer: found && toBool(vatRaw), found };
}
function mapTin(payload: any): string {
  if (typeof payload === "string" || typeof payload === "number") return String(payload).replace(/\D/g, "");
  const o = unwrap(payload);
  if (typeof o === "string" || typeof o === "number") return String(o).replace(/\D/g, "");
  const v = pick(o ?? {}, ["tin", "TIN", "ttd", "tinNo", "tin_no", "value"]);
  return v === undefined ? "" : String(v).replace(/\D/g, "");
}
async function fetchJson(url: string): Promise<any> {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const text = await r.text();
    if (!r.ok) throw new Error("ebarimt HTTP " + r.status + " " + text.slice(0, 200));
    try { return JSON.parse(text); } catch { return text; }
  } finally { clearTimeout(t); }
}
const resolveTin = async (reg: string) => mapTin(await fetchJson(`${BASE}/getTinInfo?regNo=${encodeURIComponent(reg)}`));
const fetchInfo = async (tin: string) => mapInfo(await fetchJson(`${BASE}/getInfo?tin=${encodeURIComponent(tin)}`));

type Row = { key: string; tin: string; reg: string; name: string; vat_payer: boolean; found: boolean; fetched_at: string };
async function cacheGet(key: string): Promise<Row | null> {
  const { data } = await admin().from("ebarimt_cache").select("*").eq("key", key).maybeSingle();
  if (!data) return null;
  return (Date.now() - new Date(data.fetched_at).getTime() < TTL_MS) ? data as Row : null;
}
async function cacheSet(key: string, v: Partial<Row>) {
  await admin().from("ebarimt_cache").upsert({ key, tin: "", reg: "", name: "", vat_payer: false, found: false, ...v, fetched_at: new Date().toISOString() });
}

Deno.serve(callable(async (data) => {
  const { reg, tin: tinIn } = normalizeInput(data);
  if (!reg && !tinIn) throw new HttpsError("invalid-argument", "reg (РД) эсвэл tin (ТТД) шаардлагатай");
  let tin = tinIn;
  try {
    if (!tin && reg) {
      const c = await cacheGet("r" + reg);
      tin = c ? c.tin : await resolveTin(reg);
      if (!tin && /^\d+$/.test(reg)) tin = reg;
      if (!tin) return { tin: "", reg, name: "", vatPayer: false, found: false, cachedAt: null };
      if (!c) await cacheSet("r" + reg, { tin, reg });
    }
    const hit = await cacheGet("t" + tin);
    if (hit) return { tin, reg: hit.reg || reg, name: hit.name, vatPayer: hit.vat_payer, found: hit.found, cachedAt: new Date(hit.fetched_at).getTime() };
    const info = await fetchInfo(tin);
    const out = { tin, reg, name: info.name, vatPayer: info.vatPayer, found: info.found };
    if (info.found) await cacheSet("t" + tin, { tin, reg, name: info.name, vat_payer: info.vatPayer, found: true });
    return { ...out, cachedAt: null };
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    console.warn("ebarimt upstream failed", (e as Error).message);
    return { tin: tin || "", reg, name: "", vatPayer: false, found: false, error: "upstream" };
  }
}, { auth: "none" }));
