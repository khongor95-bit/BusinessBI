/* ============================================================
   site.js — BusinessBI нэгдсэн nav + footer (бүх олон нийтийн хуудас)
   ------------------------------------------------------------
   Хэрэглэх: <head>-д
     <link rel="stylesheet" href="site.css">
     <script src="site.js" defer></script>
   Хуудсанд хуучин header/nav/footer байвал (header#bbi-old, nav.ubbi-nav,
   nav .nav-inner, footer) тэдгээрийг СОЛИНО — хуудас бүрт markup хуулахгүй.
   Нэвтрэлтийн төлөв: Supabase (mp.js) — байхгүй бол өөрөө ачаална; data-auth="firebase" хуудсанд gate.js.
   Хуудасны гарчгийг nav-д харуулах бол <body data-nav-title="…">.
   ============================================================ */
(function () {
  "use strict";
  const ADMIN_EMAIL = "khongor95@gmail.com";
  const MENU = [
    ["tools.html", "Хэрэгслүүд"],
    ["businessbi_journal.html", "Санхүүгийн програм"],
    ["accountants.html", "Нягтлангийн сүлжээ"],
    ["pricing.html", "Үнэ"],
    ["contact.html", "Холбоо барих"],
  ];
  const CONTACT = { email: "hello@businessbi.mn", phone: "+976 9911-2233", phoneHref: "tel:+97699112233" };
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isActive = (href) => page === href || (href === "accountants.html" && /accountant_signup|partner|my\.html|contract/.test(page)) || (href === "tools.html" && /converter|matcher|invoice|dashboard|payroll|budget/.test(page));

  const USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  function navHTML() {
    const sub = document.body.dataset.navTitle ? `<span class="bbi-logo-sub">${esc(document.body.dataset.navTitle)}</span>` : "";
    return `<nav class="bbi-nav" id="bbiNav" aria-label="Үндсэн цэс">
      <div class="bbi-nav-in">
        <a href="index.html" class="bbi-logo"><span>Business<b>BI</b></span>${sub}</a>
        <div class="bbi-menu" id="bbiMenu">
          ${MENU.map(([h, t]) => `<a href="${h}"${isActive(h) ? ' class="active"' : ""}>${t}</a>`).join("")}
          <a href="businessbi_journal.html" class="bbi-cta">Программ турших</a>
        </div>
        <div class="bbi-nav-right">
          <a href="auth.html" class="bbi-login" id="bbiLogin">${USER_ICON}<span>Нэвтрэх</span></a>
          <a href="businessbi_journal.html" class="bbi-cta">Программ турших</a>
          <button class="bbi-burger" id="bbiBurger" aria-label="Цэс"><span></span><span></span><span></span></button>
        </div>
      </div>
    </nav>`;
  }
  function footerHTML() {
    const y = new Date().getFullYear();
    return `<footer class="bbi-footer" id="bbiFooter">
      <div class="bbi-footer-in">
        <div class="bbi-foot-grid">
          <div class="bbi-foot-col">
            <a href="index.html" class="bbi-logo"><span>Business<b>BI</b></span></a>
            <p class="bbi-foot-tag">Монголын нягтлан бодогч, жижиг бизнест зориулсан санхүүгийн програм, автоматжуулалтын хэрэгслүүд.</p>
          </div>
          <div class="bbi-foot-col">
            <h5>Бүтээгдэхүүн</h5>
            <a href="businessbi_journal.html">Санхүүгийн програм</a>
            <a href="ndsh_hhoat_converter.html">НДШ / ХХОАТ хөрвүүлэгч</a>
            <a href="noat_matcher.html">НӨАТ тулгагч</a>
            <a href="payroll.html">Цалин бодогч</a>
            <a href="budget.html">Бизнес төлөвлөлт</a>
            <a href="invoice_generator.html">Нэхэмжлэх үүсгэгч</a>
            <a href="financial_dashboard.html">Санхүүгийн шинжилгээ</a>
          </div>
          <div class="bbi-foot-col">
            <h5>Үйлчилгээ</h5>
            <a href="accountants.html">Нягтлангийн сүлжээ</a>
            <a href="accountant_signup.html">Нягтлан болж элсэх</a>
            <a href="my.html">Миний самбар (компани)</a>
            <a href="partner.html">Нягтлангийн самбар</a>
            <a href="pricing.html">Үнэ</a>
            <a href="contact.html">Холбоо барих</a>
          </div>
          <div class="bbi-foot-col">
            <h5>Холбоо барих</h5>
            <a href="mailto:${CONTACT.email}">${CONTACT.email}</a>
            <a href="${CONTACT.phoneHref}">${CONTACT.phone}</a>
            <a href="contact.html">Улаанбаатар, Монгол</a>
          </div>
        </div>
        <div class="bbi-foot-bottom">
          <span>© ${y} BusinessBI.mn. Бүх эрх хуулиар хамгаалагдсан.</span>
          <span><a href="terms.html">Үйлчилгээний нөхцөл</a><a href="privacy.html">Нууцлалын бодлого</a><a href="refund.html">Буцаалтын нөхцөл</a></span>
        </div>
      </div>
    </footer>`;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function mount() {
    const body = document.body;
    // 1) Хуучин толгой/цэсийг олж солино
    const old = [];
    body.querySelectorAll("header").forEach(h => { if (h.querySelector("#menu, .navbar, .nav-inner, .ubbi-nav") || h.id === "bbi-old") old.push(h); });
    body.querySelectorAll("nav.ubbi-nav").forEach(n => old.push(n));
    body.querySelectorAll("body > nav").forEach(n => { if (n.querySelector(".nav-inner") && !n.classList.contains("bbi-nav")) old.push(n); });
    const tpl = document.createElement("template"); tpl.innerHTML = navHTML();
    const nav = tpl.content.firstElementChild;
    if (old.length) { old[0].replaceWith(nav); old.slice(1).forEach(o => o.remove()); }
    else body.insertBefore(nav, body.firstChild);

    // 2) Footer: хуучин footer байвал солино, үгүй бол төгсгөлд нэмнэ (data-no-footer бол алгасна)
    if (!body.dataset.noFooter) {
      const ft = document.createElement("template"); ft.innerHTML = footerHTML();
      const foot = ft.content.firstElementChild;
      const oldF = body.querySelector("footer:not(.bbi-footer)");
      if (oldF) oldF.replaceWith(foot); else body.appendChild(foot);
      // CTA зурвас footer-ийн дараа байвал өмнө нь зөөнө
      body.querySelectorAll(".bbi-band").forEach(b => { if (b.compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_PRECEDING) foot.before(b); });
    }

    // 3) Burger
    const burger = document.getElementById("bbiBurger"), menu = document.getElementById("bbiMenu");
    burger.addEventListener("click", () => { burger.classList.toggle("open"); menu.classList.toggle("open"); });
    menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { burger.classList.remove("open"); menu.classList.remove("open"); }));

    // 4) Нэвтрэлтийн төлөв
    const loginEl = document.getElementById("bbiLogin");
    if (body.dataset.auth !== "firebase") {
      // Бүх хуудас: Supabase Auth (mp.js). Firebase gate зөвхөн data-auth="firebase" гэж заасан хуучин хуудсанд.
      const wireSb = () => {
        loginEl.addEventListener("click", e => { if (!BBIMP.user) { e.preventDefault(); BBIMP.loginModal(); } });
        BBIMP.onAuth(async u => {
          if (!u) { loginEl.innerHTML = USER_ICON + "<span>Нэвтрэх</span>"; loginEl.href = "#"; return; }
          const name = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email || "").split("@")[0];
          loginEl.innerHTML = USER_ICON + "<span>" + esc(name) + "</span>";
          loginEl.href = "my.html"; loginEl.title = "Миний самбар";
          if (!menu.querySelector(".bbi-dash")) {
            const acc = await BBIMP.myAccountant();
            const a = document.createElement("a"); a.className = "bbi-dash"; a.href = acc ? "partner.html" : "my.html"; a.textContent = acc ? "Нягтлангийн самбар" : "Миний самбар";
            menu.insertBefore(a, menu.querySelector(".bbi-cta"));
            if ((u.email || "").toLowerCase() === ADMIN_EMAIL) { const ad = document.createElement("a"); ad.className = "bbi-dash bbi-admin"; ad.href = "marketplace_admin.html"; ad.textContent = "⚙ Админ"; menu.insertBefore(ad, menu.querySelector(".bbi-cta")); }
            const o = document.createElement("a"); o.className = "bbi-dash"; o.href = "#"; o.textContent = "Гарах"; o.onclick = e => { e.preventDefault(); if (confirm("Гарах уу?")) BBIMP.signOut(); };
            menu.insertBefore(o, menu.querySelector(".bbi-cta"));
          }
        });
      };
      if (window.BBIMP) wireSb(); else { const s = document.createElement("script"); s.src = "mp.js"; s.onload = wireSb; document.head.appendChild(s); }
      return;
    }
    loginEl.addEventListener("click", e => {
      if (window.BBIGate && !BBIGate.isLoggedIn()) { e.preventDefault(); BBIGate.openLogin(); }
    });
    const wire = () => {
      BBIGate.onReady(user => {
        if (!user) return;
        const name = user.displayName || (user.email || "").split("@")[0];
        loginEl.innerHTML = USER_ICON + "<span>" + esc(name) + "</span>";
        loginEl.removeAttribute("href");
        loginEl.title = "Гарах";
        loginEl.onclick = e => { e.preventDefault(); if (confirm(name + " — гарах уу?")) BBIGate.signOut().then(() => location.reload()); };
        if (user.email === ADMIN_EMAIL && !menu.querySelector(".bbi-admin")) {
          const a = document.createElement("a"); a.href = "admin.html"; a.className = "bbi-admin"; a.textContent = "⚙ Админ";
          menu.insertBefore(a, menu.querySelector(".bbi-cta"));
        }
      });
      // нэвтрэлт амжилттай болбол (gate modal) хуудсаа шинэчилнэ
      window.addEventListener("message", e => { if (e.data && e.data.type === "bbi-auth-success") setTimeout(() => location.reload(), 300); });
    };
    if (window.BBIGate) wire();
    else { const s = document.createElement("script"); s.src = "gate.js"; s.onload = wire; document.head.appendChild(s); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
