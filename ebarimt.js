/* ============================================================
   ebarimt.js — ebarimt.mn татвар төлөгчийн лавлагаа (клиент модуль)
   ------------------------------------------------------------
   Хэрэглэх (бие даасан — нэвтрэлт шаардахгүй):
     <script src="ebarimt.js"></script>
     ...
     BBIEbarimt.lookup({reg:'6183689'}).then(r => r.name)   // {tin,reg,name,vatPayer,found}
     BBIEbarimt.attach($('toReg'), { name: $('toName'), onResult: r => {
       const b = BBIEbarimt.badge(r);  // {text:'НӨАТ төлөгч'|'НӨАТ төлөгч биш'|'Олдсонгүй', cls}
     }});

   Урсгал:
     1. localStorage-д 30 хоногийн кэш (bbi_eb_<reg|tin>) байвал шууд буцаана
     2. Үгүй бол Supabase Edge Function ebarimt-lookup-ийг fetch-ээр дуудна (SDK шаардахгүй):
        POST https://<project>.supabase.co/functions/v1/ebarimt-lookup  {data:{reg,tin}}
     3. Сервер ebarimt.mn-д хүрч чадаагүй (error:"upstream") бол хөтчөөс шууд оролдоно
        (api.ebarimt.mn гадаад IP-д хаалттай байж болзошгүй; CORS зөвшөөрвөл ажиллана).
   ============================================================ */
(function () {
  "use strict";
  const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || "https://mpfjceziasadnswwnkpc.supabase.co";
  const EBARIMT_DIRECT = "https://api.ebarimt.mn/api/info/check";
  const TTL_MS = 30 * 24 * 3600 * 1000;
  const TIMEOUT_MS = 12000;
  const endpoint = () => SUPABASE_URL + "/functions/v1/ebarimt-lookup";

  // Оролт хэвийн болгох (сервертэй ижил дүрэм)
  function norm(q) {
    const d = q || {};
    return {
      reg: String(d.reg || "").replace(/\s+/g, "").toUpperCase().replace(/[^A-ZА-ЯӨҮЁ0-9]/g, "").slice(0, 20),
      tin: String(d.tin || "").replace(/\D/g, "").slice(0, 20),
    };
  }
  const ckey = (q) => "bbi_eb_" + (q.tin ? "t" + q.tin : "r" + q.reg);
  function cacheGet(k) {
    try { const v = JSON.parse(localStorage.getItem(k) || "null"); if (v && v.at && Date.now() - v.at < TTL_MS) return v.r; } catch (_) {}
    return null;
  }
  function cacheSet(k, r) { try { localStorage.setItem(k, JSON.stringify({ at: Date.now(), r })); } catch (_) {} }

  // Callable протокол: body {data}, хариу {result} эсвэл {error:{message,status}}
  async function callFn(data) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data }), signal: ctrl.signal });
      const j = await res.json().catch(() => ({}));
      if (j.error) throw new Error(j.error.message || j.error.status || "ebarimt-lookup error");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const r = j.result || {};
      if (r.error === "upstream") { const d = await directLookup(data).catch(() => null); if (d) return d; }
      return r;
    } finally { clearTimeout(t); }
  }
  // Сервер ebarimt.mn-д хүрээгүй үед хөтчөөс шууд (Монголын IP). CORS хаалттай бол TypeError → null.
  async function directLookup(q) {
    const get = async (u) => { const r = await fetch(u, { headers: { Accept: "application/json" } }); if (!r.ok) throw new Error("HTTP " + r.status); const tx = await r.text(); try { return JSON.parse(tx); } catch (_) { return tx; } };
    const unwrap = (o) => { for (let i = 0; i < 3 && o && typeof o === "object"; i++) { const inner = o.data !== undefined ? o.data : (o.result !== undefined ? o.result : undefined); if (inner === undefined || inner === null) break; o = inner; if (typeof o !== "object") break; } return o; };
    let tin = q.tin;
    if (!tin && q.reg) { const o = unwrap(await get(`${EBARIMT_DIRECT}/getTinInfo?regNo=${encodeURIComponent(q.reg)}`)); tin = String(typeof o === "object" ? (o.tin || o.value || "") : (o || "")).replace(/\D/g, ""); if (!tin && /^\d+$/.test(q.reg)) tin = q.reg; }
    if (!tin) return { tin: "", reg: q.reg, name: "", vatPayer: false, found: false };
    const o = unwrap(await get(`${EBARIMT_DIRECT}/getInfo?tin=${encodeURIComponent(tin)}`)) || {};
    const name = String(o.name || o.fullName || o.companyName || "").trim();
    const found = o.found !== undefined ? !!o.found : !!name;
    return { tin, reg: q.reg, name, vatPayer: found && !!(o.vatPayer || o.vatpayer || o.isVatPayer), found, via: "direct" };
  }

  const inflight = {};
  function lookup(q) {
    const n = norm(q);
    if (!n.reg && !n.tin) return Promise.reject(new Error("reg эсвэл tin шаардлагатай"));
    const k = ckey(n);
    const hit = cacheGet(k);
    if (hit) return Promise.resolve(hit);
    if (inflight[k]) return inflight[k];
    inflight[k] = callFn(n).then((r) => {
      const out = { tin: r.tin || n.tin || "", reg: r.reg || n.reg || "", name: r.name || "", vatPayer: !!r.vatPayer, found: !!r.found };
      if (r.error) out.error = r.error;
      if (r.via) out.via = r.via;
      if (out.found) { cacheSet(k, out); if (out.tin) cacheSet(ckey({ tin: out.tin }), out); }
      return out;
    }).finally(() => { delete inflight[k]; });
    return inflight[k];
  }

  // Үр дүн → тэмдэг (badge) текст/класс
  function badge(r) {
    if (!r) return { text: "", cls: "" };
    if (r.pending) return { text: "Шалгаж байна…", cls: "wait" };
    if (r.error === "upstream") return { text: "ebarimt.mn-тэй холбогдсонгүй", cls: "none" };
    if (r.error === "network") return { text: "Шалгаж чадсангүй", cls: "none" };
    if (!r.found) return { text: "Олдсонгүй", cls: "none" };
    return r.vatPayer ? { text: "НӨАТ төлөгч", cls: "vat" } : { text: "НӨАТ төлөгч биш", cls: "novat" };
  }

  // Регистрийн input-д залгах: blur/change (+ бичиж дууссаны дараа) → нэр бөглөх, onResult дуудах
  // Нэрийн талбарыг зөвхөн хоосон (эсвэл өмнө нь өөрөө бөглөсөн) үед л бичнэ — хэрэглэгчийн гараар бичсэнийг дарж бичихгүй
  function attach(regEl, opts) {
    if (!regEl) return;
    const o = opts || {};
    const nameEl = o.name || null;
    const wait = o.debounce || 700;
    let timer = null, last = "";
    const fire = (val) => {
      const n = norm({ reg: val });
      const key = n.reg;
      if (!key || key.length < 5) { if (!key) { last = ""; o.onResult && o.onResult(null); } return; }
      if (key === last) return;
      last = key;
      o.onResult && o.onResult({ pending: true });
      lookup({ reg: key }).then((r) => {
        if (last !== key) return;   // хэрэглэгч аль хэдийн өөр утга бичсэн
        if (nameEl && r.found && r.name) {
          const cur = (nameEl.value || "").trim();
          if (!cur || cur === nameEl.dataset.bbiAutofill) {
            nameEl.value = r.name; nameEl.dataset.bbiAutofill = r.name;
            nameEl.dispatchEvent(new Event("input", { bubbles: true }));   // preview дахин зурагдана
          }
        }
        o.onResult && o.onResult(r);
      }).catch((e) => { console.warn("BBIEbarimt", e); if (last === key) o.onResult && o.onResult({ found: false, error: "network" }); });
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(() => fire(regEl.value), wait); };
    const now = () => { clearTimeout(timer); fire(regEl.value); };
    regEl.addEventListener("input", later);
    regEl.addEventListener("change", now);
    regEl.addEventListener("blur", now);
    return { refresh: now };
  }

  window.BBIEbarimt = { lookup, attach, badge, endpoint, normalize: norm };
})();
