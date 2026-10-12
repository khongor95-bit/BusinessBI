/* ============================================================
   pay.js — BusinessBI төлбөртэй хэрэгслийн клиент модуль (WIRE.mn, Supabase Edge Functions)
   ------------------------------------------------------------
   Хэрэглэх (mp.js-ийн ДАРАА залгана — mp.js нь BBIGate-тэй нийцтэй API-г Supabase дээр өгнө):
     <script src="mp.js"></script>
     <script src="pay.js"></script>
     ...
     $('dlBtn').onclick = BBIGate.protect(
        BBIPay.require({ tool:'ndsh_hhoat', meta:{period:'2026 Q1'} }, () => buildExcel()),
        { tool:'НДШ/ХХОАТ хөрвүүлэгч', action:'download' });

   Урсгал:
     1. localStorage-д хүчинтэй тасалбар (24 цаг) байвал → сервер дээр баталгаажуулж → шууд cb()
     2. Үгүй бол төлбөрийн modal → payments/create:
        а) qr ирвэл (WIRE inline) — QR + банкны аппын товчнуудыг ЭНЭ modal дотор харуулна (шинэ цонхгүй;
           хуудсыг солихгүй — хэрэглэгчийн PDF-ээс уншсан өгөгдөл санах ойд байдаг тул)
        б) checkoutUrl ирвэл (hosted fallback / mock) — шинэ цонхонд нээнэ, нээгдэхгүй бол линк
     3. 3 сек тутам payments/check-ээр шалгана; pay_done.html-ээс postMessage ирвэл шууд шалгана
     4. Төлөгдмөгц тасалбар хадгалж, modal хааж, cb() ажиллуулна
   ============================================================ */
(function () {
  "use strict";
  const PRICES = { ndsh_hhoat: { amount: 5000, label: "1 тайлан татах", validHours: 24 }, receipt: { amount: 5000, label: "24 цагийн эрх — баримтын зураг уншуулах", validHours: 24 } };
  const POLL_MS = 3000, POLL_MAX_MS = 20 * 60 * 1000;

  // Сервер тал: Supabase Edge Function "payments" (supabase/functions/payments) — mp.js-ийн callFn-ээр дуудна
  let loading = null;
  function ensureMp() {
    if (window.BBIMP && BBIMP.callFn) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "mp.js"; s.onload = () => res(); s.onerror = () => rej(new Error("mp.js ачаалагдсангүй")); document.head.appendChild(s); });
    return loading;
  }
  const ROUTE = { createPayment: "payments/create", checkPayment: "payments/check" };
  const call = async (name, data) => { await ensureMp(); return BBIMP.callFn(ROUTE[name] || name, data); };

  // ── Тасалбар (localStorage) ─────────────────────────────────
  const tkey = tool => "bbi_pay_ticket_" + tool;
  function getTicket(tool) {
    try {
      const t = JSON.parse(localStorage.getItem(tkey(tool)) || "null");
      if (!t || !t.paymentId || !t.expiresAt) return null;
      if (t.expiresAt <= Date.now()) { localStorage.removeItem(tkey(tool)); return null; }
      const u = window.BBIGate && BBIGate.getUser && BBIGate.getUser();
      if (u && t.uid && t.uid !== u.uid) return null;
      return t;
    } catch (_) { return null; }
  }
  function saveTicket(tool, v) {
    try { const u = BBIGate.getUser(); localStorage.setItem(tkey(tool), JSON.stringify({ paymentId: v.paymentId, expiresAt: v.expiresAt, uid: u ? u.uid : "" })); } catch (_) {}
  }
  const fmtMNT = n => Number(n).toLocaleString("en-US") + "₮";
  const fmtLeft = ms => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h} цаг ${m} мин` : `${m} мин`; };

  // ── Modal ──────────────────────────────────────────────────
  let modal = null, pollTimer = null, pollStart = 0, current = null;
  function buildModal() {
    if (modal) return modal;
    const st = document.createElement("style");
    st.textContent = `
      .bbipay-ov{position:fixed;inset:0;z-index:99998;background:rgba(17,30,23,.55);backdrop-filter:blur(3px);display:none;align-items:center;justify-content:center;padding:16px;font-family:Inter,system-ui,sans-serif}
      .bbipay-ov.show{display:flex}
      .bbipay{background:#fff;border-radius:18px;width:min(440px,100%);box-shadow:0 24px 70px -20px rgba(0,0,0,.45);overflow:hidden;position:relative;color:#1a2b25}
      .bbipay-x{position:absolute;top:12px;right:12px;width:34px;height:34px;border:none;background:#f0f3f1;border-radius:50%;cursor:pointer;font-size:18px;color:#6b7670}
      .bbipay-x:hover{background:#e3e7e4;color:#1a2b25}
      .bbipay-h{padding:26px 28px 0}
      .bbipay-h .k{font-size:10.5px;letter-spacing:1.2px;text-transform:uppercase;color:#6b7670;font-weight:600}
      .bbipay-h h3{font-size:20px;margin:6px 0 2px;font-weight:700}
      .bbipay-h .d{font-size:13px;color:#6b7670;line-height:1.5}
      .bbipay-b{padding:18px 28px 26px}
      .bbipay-price{display:flex;align-items:baseline;gap:8px;margin:6px 0 14px}
      .bbipay-price b{font-size:34px;font-weight:800;color:#1a4d38;letter-spacing:-.5px}
      .bbipay-price span{font-size:13px;color:#6b7670}
      .bbipay-list{list-style:none;padding:0;margin:0 0 18px;font-size:13px;line-height:1.7;color:#243b30}
      .bbipay-list li::before{content:'✓';color:#2e8b62;font-weight:700;margin-right:8px}
      .bbipay-btn{width:100%;padding:14px;border-radius:11px;border:none;background:#216a4c;color:#fff;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px}
      .bbipay-btn:hover{background:#1a5840}.bbipay-btn:disabled{background:#c7cdc9;cursor:wait}
      .bbipay-wire{font-size:11px;background:#fff;color:#216a4c;border-radius:5px;padding:2px 7px;font-weight:800;letter-spacing:.5px}
      .bbipay-st{margin-top:14px;font-size:12.5px;color:#6b7670;line-height:1.55;min-height:18px}
      .bbipay-st a{color:#216a4c;font-weight:600}
      .bbipay-st.ok{color:#216a4c;font-weight:600}.bbipay-st.err{color:#c0492b}
      .bbipay-spin{display:inline-block;width:12px;height:12px;border:2px solid #cfd8d2;border-top-color:#216a4c;border-radius:50%;animation:bbipay-r .8s linear infinite;vertical-align:-2px;margin-right:6px}
      @keyframes bbipay-r{to{transform:rotate(360deg)}}
      .bbipay-f{padding:12px 28px;background:#f7f9f8;border-top:1px solid #eef1ef;font-size:11.5px;color:#6b7670;line-height:1.5}
      .bbipay-sec{margin-top:10px;font-size:12px;text-align:center}.bbipay-sec button{background:none;border:none;color:#6b7670;text-decoration:underline;cursor:pointer;font-size:12px}
      .bbipay-qr{display:none;text-align:center}
      .bbipay-qr.show{display:block}
      .bbipay-qr .amt{font-size:28px;font-weight:800;color:#1a4d38;letter-spacing:-.5px;margin:2px 0 4px}
      .bbipay-qr .hint{font-size:12.5px;color:#6b7670;margin-bottom:10px}
      .bbipay-qr .img{display:inline-block;padding:8px;border:1px solid #e3e7e4;border-radius:14px;background:#fff}
      .bbipay-qr .img img,.bbipay-qr .img canvas{display:block;width:200px;height:200px}
      .bbipay-qr .timer{font-size:11.5px;color:#6b7670;margin-top:8px}
      .bbipay-banks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px;max-height:230px;overflow:auto;padding:2px}
      .bbipay-banks a{display:flex;align-items:center;gap:8px;padding:9px 10px;min-width:0;border:1px solid #e3e7e4;border-radius:10px;font-size:12.5px;color:#1a2b25;text-decoration:none;background:#fff;text-align:left}
      .bbipay-banks a:hover{border-color:#216a4c;background:#f3f8f5}
      .bbipay-banks img{width:24px;height:24px;border-radius:6px;object-fit:cover;flex:none}
      .bbipay-banks span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .bbipay-or{font-size:11.5px;color:#6b7670;margin:12px 0 0}
      .bbipay-mobile .bbipay-qr .img img{width:150px;height:150px}
      .bbipay-toggle{margin-top:8px;font-size:12px}.bbipay-toggle button{background:none;border:none;color:#216a4c;text-decoration:underline;cursor:pointer;font-size:12px}
    `;
    document.head.appendChild(st);
    modal = document.createElement("div");
    modal.className = "bbipay-ov";
    modal.innerHTML = `<div class="bbipay" role="dialog" aria-modal="true">
      <button class="bbipay-x" id="bbipayClose" aria-label="Хаах">×</button>
      <div class="bbipay-h"><div class="k">Төлбөртэй үйлчилгээ</div><h3 id="bbipayTitle">Тайлан татах</h3><div class="d" id="bbipayDesc"></div></div>
      <div class="bbipay-b">
        <div class="bbipay-price"><b id="bbipayAmt"></b><span id="bbipayPer"></span></div>
        <ul class="bbipay-list" id="bbipayList"></ul>
        <button class="bbipay-btn" id="bbipayGo"><span class="bbipay-wire">WIRE</span> Банкны аппаар төлөх →</button>
        <div class="bbipay-qr" id="bbipayQr">
          <div class="amt" id="bbipayQrAmt"></div>
          <div class="hint" id="bbipayQrHint">Банкны аппаараа QR-ийг уншуулна уу</div>
          <div class="img" id="bbipayQrBox"><img id="bbipayQrImg" alt="Төлбөрийн QR"></div>
          <div class="timer" id="bbipayQrTimer"></div>
          <div class="bbipay-or" id="bbipayOr">эсвэл банкны аппаа сонгоно уу</div>
          <div class="bbipay-banks" id="bbipayBanks"></div>
          <div class="bbipay-toggle" id="bbipayQrToggle"></div>
        </div>
        <div class="bbipay-st" id="bbipaySt"></div>
        <div class="bbipay-sec" id="bbipayAlt" style="display:none"><button id="bbipayRecheck">Төлбөр хийсэн — дахин шалгах</button></div>
      </div>
      <div class="bbipay-f">Төлбөрийг WIRE.mn гарцаар банкны апп, QR, цахим хэтэвчээр хийнэ. Таны PDF өгөгдөл хөтчөөс гадагш явахгүй — серверт зөвхөн төлбөрийн бүртгэл (хэрэгсэл, тайлант үе, дүн) хадгалагдана.</div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector("#bbipayClose").onclick = close;
    modal.addEventListener("click", e => { if (e.target === modal) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("show")) close(); });
    modal.querySelector("#bbipayGo").onclick = startPayment;
    modal.querySelector("#bbipayRecheck").onclick = () => { if (current && current.paymentId) pollOnce(true); };
    window.addEventListener("message", e => { if (e.data && e.data.type === "bbi-pay-success" && current) pollOnce(true); });
    return modal;
  }
  function $(id) { return modal.querySelector("#" + id); }
  function setStatus(html, cls) { const el = $("bbipaySt"); el.className = "bbipay-st" + (cls ? " " + cls : ""); el.innerHTML = html; }
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isMobile = () => (window.matchMedia && matchMedia("(pointer:coarse)").matches) || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // ── Inline QR (WIRE next_action.qr) — шинэ цонхгүй, хуудсан дээрээ ───────────
  let qrTimer = null;
  function hideQr() {
    if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
    $("bbipayQr").classList.remove("show");
    modal.classList.remove("bbipay-mobile");
    [".bbipay-price", ".bbipay-list", "#bbipayGo"].forEach(s => { const e = modal.querySelector(s); if (e) e.style.display = ""; });
  }
  function showQr(r) {
    const qr = r.qr, mobile = isMobile();
    [".bbipay-price", ".bbipay-list", "#bbipayGo"].forEach(s => { const e = modal.querySelector(s); if (e) e.style.display = "none"; });
    modal.classList.toggle("bbipay-mobile", mobile);
    $("bbipayQrAmt").textContent = fmtMNT(r.amount);
    const img = $("bbipayQrImg");
    if (qr.image) img.src = qr.image;
    else { // image ирээгүй бол текстийг нь өөрөө QR болгоно (qrcode lib байвал), үгүй бол зөвхөн банкны аппууд
      img.removeAttribute("src"); $("bbipayQrBox").style.display = "none";
    }
    const banks = $("bbipayBanks");
    banks.innerHTML = (qr.deeplinks || []).map(d => `<a href="${esc(d.link)}" rel="noopener"><img src="${esc(d.logo)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><span>${esc(d.name)}</span></a>`).join("");
    const hasBanks = !!(qr.deeplinks && qr.deeplinks.length);
    // Утсан дээр: банкны аппын товчнууд гол нь (deeplink тухайн төхөөрөмж дээрээ л нээгдэнэ), QR-ийг хураана.
    // Компьютер дээр: QR гол нь; deeplink ажиллахгүй тул банкны жагсаалтыг нуун.
    const tog = $("bbipayQrToggle");
    if (mobile && hasBanks) {
      $("bbipayQrHint").textContent = "Банкны аппаа сонгоод төлбөрөө баталгаажуулна уу";
      $("bbipayQrBox").style.display = "none"; $("bbipayOr").style.display = "none"; banks.style.display = "";
      tog.innerHTML = '<button type="button">Өөр утсаар уншуулах бол QR харуулах</button>';
      tog.querySelector("button").onclick = () => { const b = $("bbipayQrBox"); const on = b.style.display === "none"; b.style.display = on ? "" : "none"; tog.querySelector("button").textContent = on ? "QR нуух" : "Өөр утсаар уншуулах бол QR харуулах"; };
    } else {
      $("bbipayQrHint").textContent = "Утсан дээрх банкны аппаараа QR-ийг уншуулна уу";
      $("bbipayOr").style.display = "none"; banks.style.display = "none"; tog.innerHTML = "";
    }
    $("bbipayQr").classList.add("show");
    // Хугацаа (WIRE intent ~15 мин)
    if (qrTimer) clearInterval(qrTimer);
    const exp = r.intentExpiresAt || 0, tEl = $("bbipayQrTimer");
    const tick = () => {
      if (!exp) { tEl.textContent = ""; return; }
      const left = exp - Date.now();
      if (left <= 0) { clearInterval(qrTimer); qrTimer = null; tEl.textContent = "QR-ийн хугацаа дууслаа."; stopPoll();
        setStatus('<button type="button" class="bbipay-btn" id="bbipayRenew" style="margin-top:4px">Шинэ QR авах</button>', "");
        $("bbipayRenew").onclick = () => { hideQr(); setStatus(""); startPayment(); }; return; }
      tEl.textContent = "QR хүчинтэй: " + Math.floor(left / 60000) + ":" + String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
    };
    tick(); qrTimer = setInterval(tick, 1000);
  }

  function open(req) {
    buildModal();
    current = { tool: req.tool, meta: req.meta || {}, onPaid: req.onPaid, paymentId: null, checkoutUrl: null, win: null };
    hideQr();
    const pr = PRICES[req.tool] || { amount: 0, label: "", validHours: 24 };
    $("bbipayTitle").textContent = req.title || "Тайлан татах";
    $("bbipayDesc").textContent = req.desc || "";
    $("bbipayAmt").textContent = fmtMNT(pr.amount);
    $("bbipayPer").textContent = "/ " + pr.label;
    $("bbipayList").innerHTML = (req.bullets || [
      "etax-д бэлэн ХХОАТ маягт (Excel, 4 хуудас)",
      `Төлснөөс хойш ${pr.validHours} цагийн дотор дахин татах үнэгүй`,
      "Урьдчилан харах, ТТД тулгах — үнэгүй хэвээр",
    ]).map(b => `<li>${b}</li>`).join("");
    $("bbipayGo").disabled = false;
    $("bbipayAlt").style.display = "none";
    setStatus("");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function close() {
    if (!modal) return;
    modal.classList.remove("show");
    document.body.style.overflow = "";
    stopPoll();
    if (qrTimer) { clearInterval(qrTimer); qrTimer = null; }
  }
  function stopPoll() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }

  async function startPayment() {
    if (!current) return;
    const btn = $("bbipayGo");
    btn.disabled = true;
    setStatus('<span class="bbipay-spin"></span>Нэхэмжлэл үүсгэж байна…');
    try {
      const r = await call("createPayment", { tool: current.tool, meta: current.meta });
      current.paymentId = r.paymentId; current.checkoutUrl = r.checkoutUrl;
      if (r.paid) { await onPaid(r); return; }
      if (r.qr && r.qr.text) {
        // Inline QR — энэ modal дотор, шинэ цонхгүй
        showQr(r);
        setStatus('<span class="bbipay-spin"></span>Төлбөр хүлээж байна… Төлсний дараа автоматаар үргэлжилнэ.');
      } else {
        if (!r.checkoutUrl) throw new Error("checkout URL ирсэнгүй");
        // Hosted checkout (fallback) — popup click-ийн дараа нээгдэж байгаа тул хориглогдож болно → линк үзүүлнэ
        let win = null;
        try { win = window.open(r.checkoutUrl, "bbipay_checkout", "popup=yes,width=520,height=760"); } catch (_) {}
        current.win = win;
        const link = `<a href="${r.checkoutUrl}" target="bbipay_checkout" rel="noopener">энд дарж</a>`;
        setStatus(`<span class="bbipay-spin"></span>Төлбөрийн цонх нээгдлээ — тэнд төлбөрөө хийнэ үү. Энэ хуудсыг хаахгүй. ` +
                  (win ? `Цонх харагдахгүй бол ${link} нээнэ үү.` : `Цонх нээгдсэнгүй (popup хориглосон байж магадгүй) — ${link} нээнэ үү.`));
      }
      $("bbipayAlt").style.display = "block";
      pollStart = Date.now();
      schedulePoll();
    } catch (e) {
      console.error(e);
      const msg = (e && e.message) || "алдаа";
      const code = (e && e.code) || "";
      let text;
      if (/unauthenticated|нэвтэрнэ/i.test(msg + code)) text = "Эхлээд нэвтэрнэ үү.";
      else if (/failed-precondition/i.test(code)) text = msg;
      else if (/not-found|mp\.js ачаалагдсангүй|Failed to fetch|NetworkError|aborted/i.test(msg + code)) text = "Төлбөрийн системтэй холбогдож чадсангүй — интернэтээ шалгаад дахин оролдоно уу.";
      else text = "Төлбөр эхлүүлж чадсангүй: " + msg;
      setStatus(text, "err");
      btn.disabled = false;
    }
  }
  function schedulePoll() {
    stopPoll();
    if (Date.now() - pollStart > POLL_MAX_MS) { setStatus("Хүлээх хугацаа дууслаа. Төлбөр хийсэн бол «дахин шалгах» дарна уу.", "err"); return; }
    pollTimer = setTimeout(() => pollOnce(false), POLL_MS);
  }
  async function pollOnce(manual) {
    if (!current || !current.paymentId) return;
    try {
      const r = await call("checkPayment", { paymentId: current.paymentId });
      if (r.paid) { await onPaid(r); return; }
      if (r.status === "failed") { hideQr(); setStatus("Төлбөр цуцлагдсан/амжилтгүй. Дахин оролдоно уу.", "err"); $("bbipayGo").disabled = false; stopPoll(); return; }
      if (manual) setStatus('<span class="bbipay-spin"></span>Төлбөр хараахан бүртгэгдээгүй — банкны аппаа шалгаад хэдэн секундын дараа дахин үзнэ үү.');
    } catch (e) { console.warn("poll", e); }
    if (modal.classList.contains("show")) schedulePoll();
  }
  async function onPaid(r) {
    stopPoll();
    saveTicket(current.tool, r);
    if (current.win && !current.win.closed) { try { current.win.close(); } catch (_) {} }
    setStatus("✓ Төлбөр баталгаажлаа — файл бэлдэж байна…", "ok");
    const cb = current.onPaid, tool = current.tool, pid = r.paymentId;
    setTimeout(() => { close(); runPaid(tool, pid, cb); }, 600);
  }
  async function runPaid(tool, paymentId, cb) {
    try { call("checkPayment", { paymentId, consume: true }).catch(() => {}); } catch (_) {}
    try { if (window.BBIGate) BBIGate.logActivity("paid_download", { tool, paymentId }); } catch (_) {}
    cb();
  }

  // ── Гадагш нээх API ───────────────────────────────────────
  /**
   * require(opts, cb) → onclick handler.
   * opts: { tool, meta, title, desc, bullets }
   */
  function require(opts, cb) {
    return async function () {
      const tool = opts.tool;
      const t = getTicket(tool);
      if (t) {
        try {
          const r = await call("checkPayment", { paymentId: t.paymentId });
          if (r.paid) { saveTicket(tool, r); runPaid(tool, r.paymentId, cb); return; }
        } catch (e) { console.warn("ticket verify", e); }
        try { localStorage.removeItem(tkey(tool)); } catch (_) {}
      }
      const meta = typeof opts.meta === "function" ? opts.meta() : (opts.meta || {});
      open({ ...opts, meta, onPaid: cb });
    };
  }
  /** Хүчинтэй тасалбарын мэдээлэл (UI-д "24 цаг үнэгүй" гэж харуулахад) */
  function ticketInfo(tool) { const t = getTicket(tool); return t ? { ...t, leftText: fmtLeft(t.expiresAt - Date.now()) } : null; }

  window.BBIPay = { require, ticketInfo, PRICES, open: (o) => open(o), close };
})();
