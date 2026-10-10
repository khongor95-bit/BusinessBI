/* ============================================================
   receipt.js — ebarimt/НӨАТ баримтын зураг → бүртгэлийн санал (клиент модуль)
   ------------------------------------------------------------
   Хэрэглэх (mp.js-ийн ДАРАА залгана — Supabase нэвтрэлт):
     <script src="mp.js"></script>
     <script src="receipt.js"></script>
     ...
     const res = await BBIReceipt.extract(fileInput.files[0], { hint: "Оффисын хангамж" });
     // res = { ok:true, receipt:{...}, model, usage:{input_tokens,output_tokens}, ms }
     //     | { ok:false, error }   (загварын хариу схемд нийцээгүй)
     // Алдаа: throw Error { code: "unauthenticated" | "invalid-argument" | ... , message }

   Урсгал:
     1. Зургийг canvas-аар урт тал ≤1600px, JPEG q=0.85 болгож багасгана (5 MB хязгаарт багтаана)
     2. base64 → Edge Function руу POST (callable протокол: body {data}, хариу {result}|{error})
        Authorization: Bearer <Supabase access token>  (BBIGate.getUser().getIdToken() — mp.js-ийн shim)
   URL: https://<project>.supabase.co/functions/v1/receipt-extract
   Эрх: сервер дээр 'receipt' хэрэгслийн төлбөр (5,000₮ / 24 цаг) шалгагдана.
   ============================================================ */
(function () {
  "use strict";
  const SUPABASE_URL = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || "https://mpfjceziasadnswwnkpc.supabase.co";
  const MAX_SIDE = 1600, JPEG_QUALITY = 0.85;
  const MAX_BYTES = 5 * 1024 * 1024;                // серверийн хязгаартай ижил
  const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

  function callableUrl(name) { return SUPABASE_URL + "/functions/v1/" + name; }

  function err(code, message, details) { const e = new Error(message); e.code = code; if (details !== undefined) e.details = details; return e; }

  // ── Нэвтрэлт: ID token ────────────────────────────────────
  function waitUser() {
    return new Promise((res) => {
      if (window.BBIGate && BBIGate.onReady) BBIGate.onReady(res);
      else res((window.BBIGate && BBIGate.getUser && BBIGate.getUser()) || null);
    });
  }
  async function getIdToken(opts) {
    if (opts && opts.idToken) return opts.idToken;
    const u = await waitUser();
    if (!u || typeof u.getIdToken !== "function") throw err("unauthenticated", "Эхлээд нэвтэрнэ үү.");
    return u.getIdToken();
  }

  // ── Зураг багасгах ────────────────────────────────────────
  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(err("invalid-argument", "Зураг уншигдсангүй (JPEG/PNG/WebP оруулна уу).")); };
      img.src = url;
    });
  }
  function canvasToBlob(canvas, type, q) {
    return new Promise((res, rej) => {
      if (canvas.toBlob) canvas.toBlob((b) => b ? res(b) : rej(err("internal", "Зураг хөрвүүлэгдсэнгүй")), type, q);
      else {
        try { const d = canvas.toDataURL(type, q); res(dataUrlToBlob(d)); } catch (e) { rej(e); }
      }
    });
  }
  function dataUrlToBlob(d) {
    const [h, b64] = d.split(","); const mime = (h.match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    const bin = atob(b64); const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }
  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] || "");
      r.onerror = () => rej(err("internal", "Файл уншигдсангүй"));
      r.readAsDataURL(blob);
    });
  }
  /** File/Blob → { base64, mime, bytes, width, height }. Урт тал ≤ MAX_SIDE, JPEG q=0.85. */
  async function downscale(file, opts) {
    const maxSide = (opts && opts.maxSide) || MAX_SIDE;
    const quality = (opts && opts.quality) || JPEG_QUALITY;
    let img;
    try { img = await loadImage(file); }
    catch (e) {
      // Canvas-аар уншигдахгүй (ж: HEIC) — жижиг бол шууд, эс бол алдаа
      if (ACCEPT.includes(file.type) && file.size <= MAX_BYTES) return { base64: await blobToBase64(file), mime: file.type, bytes: file.size, width: 0, height: 0 };
      throw e;
    }
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale)), h = Math.max(1, Math.round(h0 * scale));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);            // PNG-ийн тунгалаг дэвсгэр → цагаан
    ctx.drawImage(img, 0, 0, w, h);
    let q = quality, blob = await canvasToBlob(c, "image/jpeg", q);
    while (blob.size > MAX_BYTES && q > 0.4) { q -= 0.15; blob = await canvasToBlob(c, "image/jpeg", q); }
    if (blob.size > MAX_BYTES) throw err("invalid-argument", "Зураг 5 MB-аас том байна");
    return { base64: await blobToBase64(blob), mime: "image/jpeg", bytes: blob.size, width: w, height: h };
  }

  // ── Edge Function дуудлага (raw HTTP, callable протокол) ──
  async function callFunction(name, data, idToken) {
    let res;
    try {
      res = await fetch(callableUrl(name), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
        body: JSON.stringify({ data }),
      });
    } catch (e) { throw err("unavailable", "Сервертэй холбогдож чадсангүй. Интернэтээ шалгана уу."); }
    let body = null;
    try { body = await res.json(); } catch (_) { body = null; }
    if (body && body.error) {
      const code = String(body.error.status || "INTERNAL").toLowerCase().replace(/_/g, "-");
      throw err(code, body.error.message || "Серверийн алдаа", body.error.details);
    }
    if (!res.ok) throw err("unavailable", "Серверийн алдаа (HTTP " + res.status + ")");
    return body ? body.result : null;
  }

  /**
   * BBIReceipt.extract(file, { idToken?, hint?, maxSide?, quality?, onProgress? })
   * → { ok, receipt, model, usage, ms, image:{bytes,width,height} }
   */
  async function extract(file, opts) {
    opts = opts || {};
    if (!file) throw err("invalid-argument", "Зураг сонгоно уу.");
    const prog = typeof opts.onProgress === "function" ? opts.onProgress : () => {};
    prog("auth");
    const idToken = await getIdToken(opts);
    prog("resize");
    const img = await downscale(file, opts);
    prog("upload");
    const data = { image: img.base64, mime: img.mime };
    if (opts.hint) data.hint = String(opts.hint).slice(0, 300);
    const result = await callFunction("receipt-extract", data, idToken);
    prog("done");
    try { if (window.BBIGate && BBIGate.logActivity) BBIGate.logActivity("receipt_extract", { ok: !!(result && result.ok), review: !!(result && result.receipt && result.receipt.review_required) }); } catch (_) {}
    return Object.assign({}, result, { image: { bytes: img.bytes, width: img.width, height: img.height } });
  }

  window.BBIReceipt = { extract, downscale, callableUrl, MAX_SIDE, JPEG_QUALITY, MAX_BYTES };
})();
