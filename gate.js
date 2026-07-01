/* ============================================================
   gate.js — BusinessBI хэрэгслүүдийн нэвтрэлт-хаалга + үйлдэл логлох
   ------------------------------------------------------------
   Хэрэглэх заавар (хэрэгсэл болгонд):
   1) </body>-ийн өмнө энэ файлыг залгана:
        <script src="gate.js"></script>
   2) Гол үр дүнгийн товчийг (татах/тооцоолох) BBIGate.protect-оор боож өгнө.
        Жишээ:
          const realDownload = () => buildExcel();
          $('dlBtn').onclick = BBIGate.protect(realDownload, {
            tool: 'НДШ/ХХОАТ хөрвүүлэгч',
            action: 'download'
          });
   ------------------------------------------------------------
   Ажиллах зарчим:
   - Нэвтрээгүй бол: гол товч дарахад auth.html modal гарч ирнэ.
     Нэвтэрмэгц анхны үйлдэл автоматаар үргэлжилнэ.
   - Нэвтэрсэн бол: үйлдэл шууд ажиллаад, activityLogs-д бичигдэнэ.
   ============================================================ */
(function () {
  "use strict";

  // ─── Firebase SDK-г нэг удаа ачаалах ─────────────────────────────
  const SDK = [
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"
  ];
  const firebaseConfig = {
    apiKey: "AIzaSyAXslBVU1__Ibhk3P7TEeJRS2oi-8fi6Jc",
    authDomain: "businessbi.firebaseapp.com",
    projectId: "businessbi",
    storageBucket: "businessbi.firebasestorage.app",
    messagingSenderId: "84765528435",
    appId: "1:84765528435:web:edf7066e6399dbc76af506",
    measurementId: "G-R1PJ3P6FHM"
  };

  let auth = null, db = null, currentUser = null, ready = false;
  let pendingAction = null;          // нэвтрэлтийн дараа үргэлжлүүлэх үйлдэл
  const readyCbs = [];

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  async function init() {
    for (const src of SDK) await loadScript(src);
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    auth.onAuthStateChanged(u => {
      currentUser = u || null;
      ready = true;
      readyCbs.splice(0).forEach(cb => cb(currentUser));
      // Нэвтрэлт болсны дараа хүлээгдэж байсан үйлдлийг үргэлжлүүлэх
      if (currentUser && pendingAction) {
        const fn = pendingAction; pendingAction = null;
        setTimeout(fn, 100);
      }
    });
    buildModal();
  }

  // ─── Нэвтрэлтийн modal (auth.html iframe) ────────────────────────
  function buildModal() {
    if (document.getElementById("bbiGateOverlay")) return;
    const o = document.createElement("div");
    o.id = "bbiGateOverlay";
    o.style.cssText =
      "display:none;position:fixed;inset:0;z-index:99999;background:rgba(17,17,17,.55);" +
      "backdrop-filter:blur(3px);align-items:center;justify-content:center;padding:16px";
    o.innerHTML =
      '<div style="position:relative;width:100%;max-width:460px;height:640px;max-height:92vh">' +
        '<button id="bbiGateClose" aria-label="Хаах" style="position:absolute;top:-14px;right:-14px;' +
        'z-index:2;width:38px;height:38px;border-radius:50%;border:none;background:#fff;' +
        'box-shadow:0 4px 16px rgba(0,0,0,.2);cursor:pointer;font-size:20px;line-height:1;color:#111">×</button>' +
        '<iframe id="bbiGateFrame" title="Нэвтрэх" style="width:100%;height:100%;border:none;' +
        'border-radius:20px;background:#fff;box-shadow:0 20px 60px -20px rgba(0,0,0,.4)"></iframe>' +
      "</div>";
    document.body.appendChild(o);

    document.getElementById("bbiGateClose").onclick = closeModal;
    o.addEventListener("click", e => { if (e.target === o) closeModal(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && o.style.display === "flex") closeModal();
    });
    // auth.html-ээс нэвтэрлээ гэсэн дохио ирвэл modal хаана
    window.addEventListener("message", e => {
      if (e.data && e.data.type === "bbi-auth-success") closeModal();
      // onAuthStateChanged өөрөө pendingAction-ийг үргэлжлүүлнэ
    });
  }
  function openModal() {
    const o = document.getElementById("bbiGateOverlay");
    const f = document.getElementById("bbiGateFrame");
    f.src = "auth.html";
    o.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    const o = document.getElementById("bbiGateOverlay");
    const f = document.getElementById("bbiGateFrame");
    o.style.display = "none";
    f.src = "about:blank";
    document.body.style.overflow = "";
  }

  // ─── Үйлдэл логлох ───────────────────────────────────────────────
  function logActivity(action, details) {
    if (!db || !currentUser) return;
    db.collection("activityLogs").add({
      userId: currentUser.uid,
      userEmail: currentUser.email || "",
      action: action,
      details: details || {},
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      device: navigator.userAgent
    }).catch(e => console.warn("log fail", e));
  }

  // ─── Гол товчийг хамгаалах ───────────────────────────────────────
  // fn: жинхэнэ үйлдэл (жишээ: () => buildExcel())
  // opts: { tool: 'нэр', action: 'download'|'calculate'|... }
  function protect(fn, opts) {
    opts = opts || {};
    return function (ev) {
      const runNow = () => {
        logActivity(opts.action || "use_tool", { toolName: opts.tool || document.title });
        fn.call(this, ev);
      };
      if (!ready) {
        // Firebase хараахан ачаалагдаагүй — бэлэн болтол хүлээнэ
        readyCbs.push(() => protect(fn, opts).call(this, ev));
        return;
      }
      if (currentUser) {
        runNow();
      } else {
        // Нэвтрээгүй — modal нээгээд, нэвтэрсний дараа үйлдлээ үргэлжлүүлнэ
        pendingAction = runNow;
        openModal();
      }
    };
  }

  // ─── Нэвтрэлтийн төлвийг мэдэх туслахууд ────────────────────────
  function onReady(cb) { if (ready) cb(currentUser); else readyCbs.push(cb); }
  function isLoggedIn() { return !!currentUser; }
  function getUser() { return currentUser; }
  function signOut() { if (auth) return auth.signOut(); }

  // ─── Гадагш нээх API ─────────────────────────────────────────────
  window.BBIGate = { protect, logActivity, onReady, isLoggedIn, getUser, signOut, openLogin: openModal };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else
    init();
})();
