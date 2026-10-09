/* ============================================================
   mp.js — Нягтлангийн сүлжээ (marketplace) + Supabase нэвтрэлтийн
   нэгдсэн туслах. accountants / partner / my / contract /
   accountant_signup хуудсууд энэ файлыг ашиглана.
   ------------------------------------------------------------
   Нэвтрэлт: Supabase Auth (Google OAuth эсвэл имэйл OTP) — журналын
   cloud-тай ИЖИЛ бүртгэл тул нягтлангийн гэрээ ↔ журналын компани
   нэг хэрэглэгчээр холбогдоно.
   Схем: supabase/schema.sql (mp_accountants, mp_requests, mp_contracts,
   mp_contract_events, mp_sign_contract())
   ============================================================ */
(function () {
  "use strict";
  const CFG = window.SUPABASE_CONFIG || (window.SUPABASE_CONFIG = {
    url: "https://mpfjceziasadnswwnkpc.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZmpjZXppYXNhZG5zd3dua3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MDY3MDMsImV4cCI6MjA5ODI4MjcwM30.LJ1Fh2TGjyPDv6EeTDzlhcR0S3WkUHhy2yRxnop940A"
  });
  const SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

  let sb = null, user = null, readyP = null;
  const listeners = [];

  function loadSdk() {
    if (window.supabase) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = SDK; s.onload = res; s.onerror = () => rej(new Error("Supabase SDK ачаалагдсангүй")); document.head.appendChild(s); });
  }
  function ready() {
    if (readyP) return readyP;
    readyP = loadSdk().then(async () => {
      sb = window.supabase.createClient(CFG.url, CFG.anonKey);
      const { data } = await sb.auth.getSession();
      user = data && data.session ? data.session.user : null;
      sb.auth.onAuthStateChange((_e, s) => { user = s && s.user ? s.user : null; listeners.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } }); });
      return sb;
    });
    return readyP;
  }
  function onAuth(fn) { listeners.push(fn); ready().then(() => fn(user)).catch(e => { console.error("Supabase холболт:", e); fn(null, e); }); }
  async function signInGoogle(returnTo) {
    await ready();
    const to = returnTo || location.href.split("#")[0];
    return sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: to } });
  }
  async function signInEmail(email, returnTo) {
    await ready();
    const to = returnTo || location.href.split("#")[0];
    return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: to } });
  }
  async function signOut() { await ready(); await sb.auth.signOut(); location.reload(); }

  // ── Нэвтрэх modal (Google + имэйл линк) ──────────────────
  function loginModal(opts) {
    opts = opts || {};
    let ov = document.getElementById("mpLoginOv");
    if (!ov) {
      const st = document.createElement("style");
      st.textContent = `.mp-ov{position:fixed;inset:0;z-index:99990;background:rgba(17,30,23,.55);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif}
        .mp-ov.show{display:flex}.mp-box{background:#fff;border-radius:18px;width:min(420px,100%);padding:28px;box-shadow:0 24px 70px -20px rgba(0,0,0,.45);position:relative;color:#1a2b25}
        .mp-box h3{margin:0 0 6px;font-size:20px}.mp-box p{margin:0 0 18px;color:#6b7670;font-size:14px;line-height:1.5}
        .mp-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border:none;background:#f0f3f1;border-radius:50%;cursor:pointer;font-size:18px;color:#6b7670}
        .mp-gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:12px;border:1.5px solid #e3e7e4;border-radius:10px;background:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
        .mp-gbtn:hover{border-color:#216a4c}.mp-or{text-align:center;color:#9aa39d;font-size:12px;margin:14px 0}
        .mp-box input{width:100%;padding:12px 14px;border:1.5px solid #e3e7e4;border-radius:10px;font:inherit;font-size:15px;box-sizing:border-box}
        .mp-ebtn{width:100%;margin-top:8px;padding:12px;border:none;border-radius:10px;background:#216a4c;color:#fff;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
        .mp-ebtn:disabled{background:#c7cdc9}.mp-msg{font-size:13px;margin-top:10px;min-height:18px}.mp-msg.ok{color:#216a4c}.mp-msg.err{color:#c0492b}`;
      document.head.appendChild(st);
      ov = document.createElement("div"); ov.id = "mpLoginOv"; ov.className = "mp-ov";
      ov.innerHTML = `<div class="mp-box"><button class="mp-x" id="mpLoginX">×</button>
        <h3 id="mpLoginT">Нэвтрэх</h3><p id="mpLoginP">Нягтлангийн сүлжээ, гэрээ, журнал нэг бүртгэлээр.</p>
        <button class="mp-gbtn" id="mpLoginG"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Google-ээр үргэлжлүүлэх</button>
        <div class="mp-or">эсвэл имэйлээр нэвтрэх линк авах</div>
        <input type="email" id="mpLoginE" placeholder="name@example.mn" autocomplete="email">
        <button class="mp-ebtn" id="mpLoginEb">Линк илгээх</button>
        <div class="mp-msg" id="mpLoginM"></div></div>`;
      document.body.appendChild(ov);
      ov.querySelector("#mpLoginX").onclick = () => ov.classList.remove("show");
      ov.addEventListener("click", e => { if (e.target === ov) ov.classList.remove("show"); });
      ov.querySelector("#mpLoginG").onclick = () => signInGoogle(ov.dataset.returnTo || undefined);
      ov.querySelector("#mpLoginEb").onclick = async () => {
        const em = ov.querySelector("#mpLoginE").value.trim(), m = ov.querySelector("#mpLoginM"), b = ov.querySelector("#mpLoginEb");
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { m.className = "mp-msg err"; m.textContent = "Имэйл хаягаа зөв оруулна уу."; return; }
        b.disabled = true; m.className = "mp-msg"; m.textContent = "Илгээж байна…";
        const { error } = await signInEmail(em, ov.dataset.returnTo || undefined);
        if (error) { m.className = "mp-msg err"; m.textContent = "Илгээж чадсангүй: " + error.message; b.disabled = false; }
        else { m.className = "mp-msg ok"; m.textContent = "✓ " + em + " хаяг руу нэвтрэх линк илгээлээ — имэйлээ шалгана уу."; }
      };
    }
    if (opts.title) ov.querySelector("#mpLoginT").textContent = opts.title;
    if (opts.text) ov.querySelector("#mpLoginP").textContent = opts.text;
    ov.dataset.returnTo = opts.returnTo || "";
    ov.classList.add("show");
  }
  /** Нэвтрээгүй бол modal нээж, нэвтэрмэгц cb(user) ажиллуулна */
  function requireLogin(cb, opts) {
    ready().then(() => {
      if (user) { cb(user); return; }
      loginModal(opts);
      const h = u => { if (u) { const i = listeners.indexOf(h); if (i >= 0) listeners.splice(i, 1); const ov = document.getElementById("mpLoginOv"); if (ov) ov.classList.remove("show"); cb(u); } };
      listeners.push(h);
    });
  }

  // ── Туслахууд ────────────────────────────────────────────
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtMNT = n => (Number(n) || 0).toLocaleString("en-US") + "₮";
  const fmtDate = d => { if (!d) return "—"; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleDateString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit" }); };
  const fmtDT = d => { if (!d) return "—"; const x = new Date(d); return isNaN(x) ? String(d) : x.toLocaleString("mn-MN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); };
  const SERVICES = ["Татварын тайлан", "Цалин, НДШ", "Санхүүгийн тайлан", "НӨАТ", "Банк, касс, авлага өглөг", "Аудитын бэлтгэл", "Бүртгэл хөтлөх (бүрэн)"];
  const REQ_STATUS = { new: "Шинэ", offered: "Санал илгээсэн", contracted: "Гэрээ байгуулсан", declined: "Татгалзсан", closed: "Хаагдсан" };
  const CON_STATUS = { draft: "Ноорог", sent: "Нягтлангийн гарын үсэг хүлээж байна", signed_accountant: "Компанийн гарын үсэг хүлээж байна", signed_client: "Нягтлангийн гарын үсэг хүлээж байна", active: "Хүчинтэй", terminated: "Цуцлагдсан", declined: "Татгалзсан" };
  const CON_COLOR = { draft: "#6b7670", sent: "#b8862f", signed_accountant: "#b8862f", signed_client: "#b8862f", active: "#216a4c", terminated: "#c0492b", declined: "#c0492b" };
  function badge(text, color) { return `<span style="display:inline-block;padding:3px 10px;border-radius:50px;font-size:11.5px;font-weight:700;color:#fff;background:${color || "#6b7670"}">${esc(text)}</span>`; }
  function conBadge(st) { return badge(CON_STATUS[st] || st, CON_COLOR[st]); }

  /** Нэвтэрсэн хэрэглэгчийн нягтлангийн профайл (байхгүй бол null) */
  async function myAccountant() {
    await ready(); if (!user) return null;
    const { data } = await sb.from("mp_accountants").select("*").eq("user_id", user.id).maybeSingle();
    return data || null;
  }
  function contractUrl(id) { return location.origin + location.pathname.replace(/[^/]*$/, "") + "contract.html?id=" + id; }

  window.BBIMP = { ready, onAuth, get sb() { return sb; }, get user() { return user; }, signInGoogle, signInEmail, signOut, loginModal, requireLogin,
    esc, fmtMNT, fmtDate, fmtDT, SERVICES, REQ_STATUS, CON_STATUS, CON_COLOR, badge, conBadge, myAccountant, contractUrl };
})();
