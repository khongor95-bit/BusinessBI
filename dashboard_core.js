/* ============================================================
   dashboard_core.js — Дашбоардын ТООЦООЛОЛ (DOM-гүй, цэвэр)
   ------------------------------------------------------------
   dashboard.html-ийн KPI, өдөр/сарын цуваа, авлага-өглөгийн задаргаа,
   сүүлийн гүйлгээ, тайлангийн хуанли энд. Функц бүр журналын төлөв `db`-г
   (settings, accounts, journal) аргументаар авна — глобал уншихгүй, DOM
   хөндөхгүй, тул node дээр тест хийгдэнэ (test/dashboard_core.test.js).

   Хөтөч:  <script src="tax.js"></script><script src="journal_core.js"></script>
           <script src="dashboard_core.js"></script>
           DashboardCore.compute(DB, {kind:'month', anchor:'2026-10'})
   Node:   const DC=require('./dashboard_core.js');
   ============================================================ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./journal_core.js'), require('./tax.js'));
  else root.DashboardCore = factory(root.JournalCore, root.BBITax);
})(typeof window !== 'undefined' ? window : globalThis, function (JC, BBITax) {
  'use strict';
  const r2 = JC.r2;
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const lastDay = (y, m) => new Date(y, m, 0).getDate();           // m: 1..12

  /* ── Эх сурвалжийн нэр (журналын `source` талбар) ── */
  const SOURCE_LABEL = { import: 'Банк', vatbuy: 'e-Barimt', vatsale: 'e-Barimt', salary: 'Цалин', manual: 'Гар', depr: 'Элэгдэл', closing: 'Хаалт', receipt: 'Баримт' };
  const sourceLabel = s => SOURCE_LABEL[s] || (s ? String(s) : 'Гар');

  /* ── Тайлант үе ──
     kind: month | quarter | half | year;  anchor: 'YYYY-MM' (тухайн үеийг агуулсан сар)
     Буцаана: {kind, anchor, from, to, label, prevFrom, prevTo, prevLabel, bucket:'day'|'month'} */
  const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  function period(kind, anchor) {
    const m = /^(\d{4})-(\d{2})/.exec(anchor || '');
    const y = m ? +m[1] : new Date().getFullYear(), mo = m ? +m[2] : new Date().getMonth() + 1;
    let fromM, toM, label, prev;
    if (kind === 'quarter') { const q = Math.floor((mo - 1) / 3); fromM = q * 3 + 1; toM = fromM + 2; label = y + ' оны ' + (q + 1) + '-р улирал'; prev = { y: fromM === 1 ? y - 1 : y, mo: fromM === 1 ? 10 : fromM - 3 }; }
    else if (kind === 'half') { const h = mo <= 6 ? 0 : 1; fromM = h * 6 + 1; toM = fromM + 5; label = y + ' оны ' + (h ? 'II' : 'I') + ' хагас жил'; prev = { y: h ? y : y - 1, mo: h ? 1 : 7 }; }
    else if (kind === 'year') { fromM = 1; toM = 12; label = y + ' он'; prev = { y: y - 1, mo: 1 }; }
    else { kind = 'month'; fromM = toM = mo; label = y + ' оны ' + MONTHS[mo - 1] + '-р сар'; prev = { y: mo === 1 ? y - 1 : y, mo: mo === 1 ? 12 : mo - 1 }; }
    const from = y + '-' + pad(fromM) + '-01', to = y + '-' + pad(toM) + '-' + pad(lastDay(y, toM));
    const p = period0(kind, prev.y + '-' + pad(prev.mo));
    return { kind, anchor: y + '-' + pad(mo), from, to, label, prevFrom: p.from, prevTo: p.to, prevLabel: p.label, bucket: kind === 'month' ? 'day' : 'month' };
  }
  function period0(kind, anchor) {       // prevFrom/prevTo-гүй (рекурс зогсоох)
    const m = /^(\d{4})-(\d{2})/.exec(anchor); const y = +m[1], mo = +m[2];
    let fromM, toM, label;
    if (kind === 'quarter') { const q = Math.floor((mo - 1) / 3); fromM = q * 3 + 1; toM = fromM + 2; label = y + ' оны ' + (q + 1) + '-р улирал'; }
    else if (kind === 'half') { const h = mo <= 6 ? 0 : 1; fromM = h * 6 + 1; toM = fromM + 5; label = y + ' оны ' + (h ? 'II' : 'I') + ' хагас жил'; }
    else if (kind === 'year') { fromM = 1; toM = 12; label = y + ' он'; }
    else { fromM = toM = mo; label = y + ' оны ' + MONTHS[mo - 1] + '-р сар'; }
    return { from: y + '-' + pad(fromM) + '-01', to: y + '-' + pad(toM) + '-' + pad(lastDay(y, toM)), label };
  }
  /* Үеийг нэг алхам урагш/хойш */
  function shiftAnchor(kind, anchor, dir) {
    const m = /^(\d{4})-(\d{2})/.exec(anchor); let y = +m[1], mo = +m[2];
    const step = kind === 'year' ? 12 : kind === 'half' ? 6 : kind === 'quarter' ? 3 : 1;
    mo += dir * step; while (mo > 12) { mo -= 12; y++; } while (mo < 1) { mo += 12; y--; }
    return y + '-' + pad(mo);
  }
  /* Анхдагч үе: бичилттэй хамгийн сүүлийн сар (хаалтын бичилт тооцохгүй), байхгүй бол өнөөдрийн сар */
  function defaultAnchor(db, today) {
    let best = '';
    for (const j of db.journal) { if (j.source === 'closing') continue; const k = String(j.date || '').slice(0, 7); if (/^\d{4}-\d{2}$/.test(k) && k > best) best = k; }
    const t = today ? String(today).slice(0, 7) : iso(new Date()).slice(0, 7);
    return best && best <= t ? best : (best || t);
  }

  /* ── Ангиллаар хөдөлгөөн (хугацаа [from,to], хаалтгүй) ── */
  function netByCat(db, from, to) {
    const mv = JC.withPeriod(db, from, to, () => JC.movementsByCat(db));
    const net = (cats, credit) => { let s = 0; for (const c of cats) { const m = mv[c]; if (!m) continue; s = r2(s + (credit ? m.kt - m.dt : m.dt - m.kt)); } return s; };
    return { income: net(['51', '52'], true), sales: net(['51'], true), expense: net(['61', '70', '75'], false), cogs: net(['61'], false), opex: net(['70'], false), finex: net(['75'], false) };
  }
  /* Ангиллын эцсийн үлдэгдэл `to` өдрийн байдлаар (эхний үлдэгдэл + бүх бичилт ≤ to, хаалт орохгүй) */
  function balanceOfCats(db, cats, to, creditNature) {
    let v = 0;
    for (const a of db.accounts) {
      if (!cats.includes(a.cat)) continue;
      let dt = a.obDt || 0, kt = a.obKt || 0;
      for (const j of db.journal) { if (j.source === 'closing' || !j.date || j.date > to) continue; if (j.dt === a.code) dt += j.amt; if (j.kt === a.code) kt += j.amt; }
      v = r2(v + (creditNature ? kt - dt : dt - kt));
    }
    return v;
  }
  const pct = (cur, prev) => (prev ? r2((cur - prev) / Math.abs(prev) * 100) : null);

  /* ── KPI ── */
  function kpis(db, p) {
    const cur = netByCat(db, p.from, p.to), prev = netByCat(db, p.prevFrom, p.prevTo);
    const profit = r2(cur.income - cur.expense), prevProfit = r2(prev.income - prev.expense);
    const cash = balanceOfCats(db, ['11'], p.to, false), prevCash = balanceOfCats(db, ['11'], p.prevTo, false);
    return {
      income: { value: cur.income, prev: prev.income, pct: pct(cur.income, prev.income) },
      expense: { value: cur.expense, prev: prev.expense, pct: pct(cur.expense, prev.expense) },
      profit: { value: profit, prev: prevProfit, pct: pct(profit, prevProfit), margin: cur.income ? r2(profit / cur.income * 100) : null },
      cash: { value: cash, prev: prevCash, pct: pct(cash, prevCash) },
    };
  }

  /* ── Цуваа: орлого/зардал өдрөөр (сар) эсвэл сараар (улирал+) ──
     Буцаана: [{key, label, income, expense, future}] — хоосон өдөр/сар 0-тэй орно;
     `future` = өнөөдрөөс хойших өдөр/сар (график шугамаа тэнд тасална) */
  function series(db, p, today) {
    const t = String(today || iso(new Date())).slice(0, 10), tm = t.slice(0, 7);
    const buckets = [];
    if (p.bucket === 'day') {
      for (let d = p.from; d <= p.to; d = addDays(d, 1)) buckets.push({ key: d, label: d.slice(8, 10).replace(/^0/, ''), income: 0, expense: 0, future: d > t });
    } else {
      for (let k = p.from.slice(0, 7); k <= p.to.slice(0, 7); k = shiftAnchor('month', k, 1)) buckets.push({ key: k, label: MONTHS[+k.slice(5, 7) - 1] + '-р сар', income: 0, expense: 0, future: k > tm });
    }
    const idx = {}; buckets.forEach((b, i) => { idx[b.key] = i; });
    const catOf = {}; for (const a of db.accounts) catOf[a.code] = a.cat;
    for (const j of db.journal) {
      if (j.source === 'closing' || !j.date || j.date < p.from || j.date > p.to) continue;
      const b = buckets[idx[p.bucket === 'day' ? j.date.slice(0, 10) : j.date.slice(0, 7)]]; if (!b) continue;
      const cd = catOf[j.dt], ck = catOf[j.kt];
      if (ck === '51' || ck === '52') b.income = r2(b.income + j.amt); if (cd === '51' || cd === '52') b.income = r2(b.income - j.amt);   // буцаалт
      if (cd === '61' || cd === '70' || cd === '75') b.expense = r2(b.expense + j.amt); if (ck === '61' || ck === '70' || ck === '75') b.expense = r2(b.expense - j.amt);
    }
    return buckets;
  }

  /* ── Авлага, өглөг: үлдэгдэл + харилцагчаар топ (бүгд `p.to` өдрийн байдлаар) ── */
  function receivablesPayables(db, p) {
    const recv = balanceOfCats(db, ['12', '14'], p.to, false), pay = balanceOfCats(db, ['31'], p.to, true);
    const tot = r2(recv + pay);
    const top = (acc, credit) => {
      const m = {};
      for (const j of db.journal) {
        if (j.source === 'closing' || !j.date || j.date > p.to) continue;
        const name = (j.partner || '').trim(); if (!name) continue;
        const e = m[name] || (m[name] = 0);
        if (credit) { if (j.kt === acc) m[name] = r2(e + j.amt); else if (j.dt === acc) m[name] = r2(e - j.amt); }
        else { if (j.dt === acc) m[name] = r2(e + j.amt); else if (j.kt === acc) m[name] = r2(e - j.amt); }
      }
      const rows = [];
      for (const name of Object.keys(m)) if (m[name] > 0.005) rows.push({ name, balance: m[name] });
      rows.sort((a, b) => b.balance - a.balance);
      return rows;
    };
    const recvRows = top(db.settings.accReceivable || '120100', false), payRows = top(db.settings.accPayable || '310101', true);
    return { receivable: recv, payable: pay, recvShare: tot ? r2(recv / tot * 100) : 50, recvPartners: recvRows.length, payPartners: payRows.length, topReceivable: recvRows.slice(0, 3), topPayable: payRows.slice(0, 3) };
  }

  /* ── Сүүлийн гүйлгээ: огноо, бүртгэсэн цагаар буурахаар ── */
  function recent(db, n) {
    const rows = db.journal.filter(j => j.source !== 'closing' && j.date).slice();
    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.at || '').localeCompare(String(a.at || '')));
    return rows.slice(0, n || 6).map(j => ({ date: j.date, doc: j.doc || '', desc: j.desc || '', partner: j.partner || '', dt: j.dt, kt: j.kt, dtName: nameOf(db, j.dt), ktName: nameOf(db, j.kt), amt: j.amt, source: sourceLabel(j.source) }));
  }
  const nameOf = (db, c) => { const a = JC.accByCode(db, c); return a ? a.name : ''; };

  /* ── Тайлангийн хуанли: өнөөдрөөс хойших хамгийн ойрын хугацаанууд ──
     НДШ — дараа сарын 5 (Нийгмийн даатгалын тухай хууль; tax.js-д параметр байхгүй тул энд);
     НӨАТ — tax.js filing.vat_monthly; ААНОАТ улирал — filing.cit_quarterly; санхүүгийн тайлан — filing.sme_annual + хагас жил 07-20 */
  function deadlines(db, today) {
    const t = String(today || iso(new Date())).slice(0, 10), d0 = parse(t);
    const y = d0.getFullYear(), mo = d0.getMonth() + 1;
    const prevMo = mo === 1 ? 12 : mo - 1, prevY = mo === 1 ? y - 1 : y;
    // Сар бүрийн тайлан: өнөөдрөөс хойших хамгийн ойрын `day` — тайлагнах сар нь түүний өмнөх сар
    const nextMonthly = day => { let m = mo, yy = y, dd = yy + '-' + pad(m) + '-' + pad(day); if (dd < t) { m++; if (m > 12) { m = 1; yy++; } dd = yy + '-' + pad(m) + '-' + pad(day); } return { due: dd, sub: MONTHS[(+dd.slice(5, 7) + 10) % 12] + '-р сар' }; };
    // Хувилбаруудаас өнөөдрөөс хойших хамгийн ойрыг сонгоно
    const nextOf = cands => cands.filter(c => c.due >= t).sort((a, b) => a.due.localeCompare(b.due))[0];
    const vatDay = +BBITax.get('filing.vat_monthly', t), citDay = +BBITax.get('filing.cit_quarterly', t), annual = BBITax.get('filing.sme_annual', t);
    const bal = code => { const a = JC.accByCode(db, code); if (!a) return 0; let dt = a.obDt || 0, kt = a.obKt || 0; for (const j of db.journal) { if (j.source === 'closing' || !j.date || j.date > t) continue; if (j.dt === code) dt += j.amt; if (j.kt === code) kt += j.amt; } return r2(kt - dt); };
    const s = db.settings;
    const out = [];
    const ndsh = nextMonthly(5);       out.push({ key: 'ndsh', name: 'НДШ тайлан', sub: ndsh.sub, due: ndsh.due, amount: bal('311001') });
    const vat = nextMonthly(vatDay);   out.push({ key: 'vat', name: 'НӨАТ тайлан', sub: vat.sub, due: vat.due, amount: r2(bal(s.accVatOut || '311002') + bal(s.accVatIn || '121001')) });  // өглөг − авлага (авлагын данс дебет шинжтэй тул bal() нь сөрөг)
    const hhoat = nextMonthly(vatDay); out.push({ key: 'hhoat', name: 'ХХОАТ суутгал (ТТ-11)', sub: hhoat.sub, due: hhoat.due, amount: bal('311004') });
    // ААНОАТ: I–III улирлын дараах сарын 20; жилийн (IV улирал орсон) — дараа оны 2-р сарын 10
    const citC = [];
    for (const yy of [y - 1, y]) { for (let q = 1; q <= 3; q++) citC.push({ due: yy + '-' + pad(q * 3 + 1) + '-' + pad(citDay), sub: yy + ' оны ' + q + '-р улирал' }); citC.push({ due: (yy + 1) + '-' + annual, sub: yy + ' оны жилийн' }); }
    const cit = nextOf(citC);          out.push({ key: 'cit', name: 'ААНОАТ тайлан (ТТ-02)', sub: cit.sub, due: cit.due, amount: bal(s.accTaxPay || '311003') });
    // Санхүүгийн тайлан: хагас жилийн 07-20, жилийн 02-10
    const fs = nextOf([{ due: y + '-' + annual, sub: (y - 1) + ' оны жилийн' }, { due: y + '-07-20', sub: y + ' оны хагас жил' }, { due: (y + 1) + '-' + annual, sub: y + ' оны жилийн' }]);
    out.push({ key: 'fs', name: 'Санхүүгийн тайлан (СТ-1–4)', sub: fs.sub, due: fs.due, amount: null });
    for (const o of out) o.daysLeft = Math.round((parse(o.due) - d0) / 86400000);
    out.sort((a, b) => a.due.localeCompare(b.due));
    return out;
  }

  /* ── Нэгтгэл ── */
  function compute(db, opts) {
    opts = opts || {};
    const today = opts.today || iso(new Date());
    const anchor = opts.anchor || defaultAnchor(db, today);
    const p = period(opts.kind || 'month', anchor);
    return { period: p, kpis: kpis(db, p), series: series(db, p, today), prevSeries: series(db, Object.assign({}, p, { from: p.prevFrom, to: p.prevTo }), today), rp: receivablesPayables(db, p), recent: recent(db, opts.recent || 6), deadlines: deadlines(db, today), entryCount: db.journal.filter(j => j.source !== 'closing').length };
  }

  /* ── Дүн товчлол: 37.2 сая ₮ / 1.25 тэрбум ₮ / 850 мян ₮ ── */
  function short(n) {
    const a = Math.abs(n || 0), sign = n < 0 ? '−' : '';
    if (a >= 1e9) return sign + (a / 1e9).toFixed(a >= 1e10 ? 1 : 2).replace(/\.?0+$/, '') + ' тэрбум';
    if (a >= 1e6) return sign + (a / 1e6).toFixed(a >= 1e8 ? 0 : 1).replace(/\.0$/, '') + ' сая';
    if (a >= 1e3) return sign + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + ' мян';
    return sign + String(Math.round(a));
  }

  return { period, shiftAnchor, defaultAnchor, netByCat, balanceOfCats, kpis, series, receivablesPayables, recent, deadlines, compute, short, sourceLabel, MONTHS };
});
