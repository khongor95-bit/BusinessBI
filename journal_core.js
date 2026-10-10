/* ============================================================
   journal_core.js — Санхүүгийн програмын ТООЦООЛЛЫН ХӨДӨЛГҮҮР (DOM-гүй, цэвэр)
   ------------------------------------------------------------
   businessbi_journal.html-ийн гүйлгээ баланс, орлогын тайлан, СТ-1…СТ-4,
   ТТ-02, тодруулга, хаалтын төлөвлөгөө, харилцагчийн тооцоо, элэгдэл,
   цалингийн тооцоо энд. Функц бүр `db` (журналын төлөв: settings, accounts,
   journal, assets, …)-ийг аргументаар авна — глобал уншихгүй, DOM хөндөхгүй,
   тул node дээр тест хийгдэнэ (test/journal_core.test.js).

   Хөтөч:  <script src="tax.js"></script><script src="journal_core.js"></script>
           JournalCore.computeBalance(DB) …
   Node:   const JC=require('./journal_core.js');
   ============================================================ */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('./tax.js'));
  else root.JournalCore = factory(root.BBITax);
})(typeof window !== 'undefined' ? window : globalThis, function (BBITax) {
  'use strict';
  const r2 = n => Math.round((Number(n) || 0) * 100) / 100;
  const fmtZ = n => Number(n || 0).toLocaleString('mn-MN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  /* ── Дансны ангилал (Сангийн сайдын 116-р тушаалын 2 оронтой анги) ── */
  const CATS = [
    { code: '11', name: 'Мөнгө, түүнтэй адилтгах хөрөнгө', group: 'asset' },
    { code: '12', name: 'Дансны авлага', group: 'asset' },
    { code: '13', name: 'Татвар, НДШ-ийн авлага', group: 'asset' },
    { code: '14', name: 'Бусад авлага', group: 'asset' },
    { code: '15', name: 'Бараа материал', group: 'asset' },
    { code: '18', name: 'Урьдчилж төлсөн зардал', group: 'asset' },
    { code: '21', name: 'Үндсэн хөрөнгө', group: 'asset' },
    { code: '22', name: 'Хуримтлагдсан элэгдэл (-)', group: 'asset-contra' },
    { code: '23', name: 'Биет бус хөрөнгө', group: 'asset' },
    { code: '31', name: 'Дансны өглөг', group: 'liab' },
    { code: '32', name: 'Татварын өглөг', group: 'liab' },
    { code: '33', name: 'Цалин, НДШ-ийн өглөг', group: 'liab' },
    { code: '34', name: 'Богино хугацаат зээл', group: 'liab' },
    { code: '35', name: 'Урт хугацаат өр төлбөр', group: 'liab' },
    { code: '41', name: 'Өмч (хувь нийлүүлсэн хөрөнгө)', group: 'equity' },
    { code: '44', name: 'Хуримтлагдсан ашиг (алдагдал)', group: 'equity' },
    { code: '51', name: 'Борлуулалтын орлого', group: 'income' },
    { code: '52', name: 'Бусад орлого', group: 'income' },
    { code: '61', name: 'Борлуулсан бүтээгдэхүүний өртөг', group: 'expense' },
    { code: '70', name: 'Үйл ажиллагааны зардал', group: 'expense' },
    { code: '75', name: 'Санхүүгийн зардал', group: 'expense' },
    { code: '91', name: 'Орлогын татварын зардал', group: 'tax-expense' },
    { code: '92', name: 'Орлого зардлын нэгдсэн данс', group: 'summary' },
  ];
  const catByCode = c => CATS.find(x => x.code === c);
  const accByCode = (db, c) => db.accounts.find(a => a.code === String(c));
  const accLabel = (db, c) => { const a = accByCode(db, c); return a ? a.code + ' — ' + a.name : String(c); };

  /* ── Тайлант үе ── */
  const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d);
  const inPeriod = (db, d) => d >= db.settings.from && d <= db.settings.to;
  const prePeriod = (db, d) => { const f = db.settings.from; return !!(f && validDate(d) && d < f); };
  const postPeriod = (db, d) => { const t = db.settings.to; return !!(t && validDate(d) && d > t); };
  const periodClosed = db => db.journal.some(j => j.source === 'closing');
  function withPeriod(db, from, to, fn) {
    const s = db.settings, of = s.from, ot = s.to;
    s.from = from; s.to = to;
    try { return fn(); } finally { s.from = of; s.to = ot; }
  }

  /* ── ААНОАТ: tax.js-ээс, тайлант үеийн эцсийн огноогоор ── */
  const citTax = (db, base) => BBITax.cit(base, db.settings.to || new Date(), db.settings.citMode);
  const citLabel = db => db.settings.citMode === 'simple1' ? 'ААНОАТ 1% (хуулийн 20.2.7)' : 'ААНОАТ 10%/25% (хуулийн 20.1)';

  /* ── Гүйлгээ баланс ── */
  function computeBalance(db) {
    const map = {};
    for (const a of db.accounts) map[a.code] = { acc: a, obDt: a.obDt || 0, obKt: a.obKt || 0, mvDt: 0, mvKt: 0 };
    const unknown = new Set();
    for (const j of db.journal) {
      if (postPeriod(db, j.date)) continue;               // тайлант үеийн ДАРААХ бичилт энэ үед хамаарахгүй
      const toOb = prePeriod(db, j.date);                 // тайлант үеийн ӨМНӨХ → эхний үлдэгдэлд нугална
      if (map[j.dt]) { if (toOb) map[j.dt].obDt = r2(map[j.dt].obDt + j.amt); else map[j.dt].mvDt = r2(map[j.dt].mvDt + j.amt); } else unknown.add(j.dt);
      if (map[j.kt]) { if (toOb) map[j.kt].obKt = r2(map[j.kt].obKt + j.amt); else map[j.kt].mvKt = r2(map[j.kt].mvKt + j.amt); } else unknown.add(j.kt);
    }
    const rows = [];
    let tObDt = 0, tObKt = 0, tMvDt = 0, tMvKt = 0, tClDt = 0, tClKt = 0;
    for (const code of Object.keys(map).sort()) {
      const r = map[code];
      const net = r2((r.obDt + r.mvDt) - (r.obKt + r.mvKt));
      r.clDt = net > 0 ? net : 0; r.clKt = net < 0 ? -net : 0;
      tObDt = r2(tObDt + r.obDt); tObKt = r2(tObKt + r.obKt);
      tMvDt = r2(tMvDt + r.mvDt); tMvKt = r2(tMvKt + r.mvKt);
      tClDt = r2(tClDt + r.clDt); tClKt = r2(tClKt + r.clKt);
      rows.push(r);
    }
    return { rows, totals: { tObDt, tObKt, tMvDt, tMvKt, tClDt, tClKt }, unknown: [...unknown],
      balanced: Math.abs(tClDt - tClKt) < 0.01 && Math.abs(tObDt - tObKt) < 0.01 && Math.abs(tMvDt - tMvKt) < 0.01 };
  }
  function catClosing(b, cats) {
    let dt = 0, kt = 0;
    for (const r of b.rows) { if (cats.includes(r.acc.cat)) { dt = r2(dt + r.clDt); kt = r2(kt + r.clKt); } }
    return r2(dt - kt);
  }
  function catOpening(db, cats) {
    let v = 0;
    for (const a of db.accounts) { if (cats.includes(a.cat)) v = r2(v + (a.obDt || 0) - (a.obKt || 0)); }
    return v;
  }
  function balanceAsOf(db, code, beforeDate) {
    const a = accByCode(db, code);
    let bal = r2((a.obDt || 0) - (a.obKt || 0));
    for (const j of db.journal) {
      if (j.date >= beforeDate) continue;
      if (j.dt === code) bal = r2(bal + j.amt);
      if (j.kt === code) bal = r2(bal - j.amt);
    }
    return bal;
  }
  /* Ангиллаар (хаалтын бичилтгүй, тайлант үед) дансны хөдөлгөөн */
  function movementsByCat(db) {
    const mv = {};
    for (const j of db.journal) {
      if (j.source === 'closing') continue;
      if (prePeriod(db, j.date) || postPeriod(db, j.date)) continue;
      const add = (code, dt, kt) => {
        const a = accByCode(db, code); if (!a) return;
        if (!mv[a.cat]) mv[a.cat] = { dt: 0, kt: 0 };
        mv[a.cat].dt = r2(mv[a.cat].dt + dt); mv[a.cat].kt = r2(mv[a.cat].kt + kt);
      };
      add(j.dt, j.amt, 0); add(j.kt, 0, j.amt);
    }
    return mv;
  }
  function movementsByAcc(db) {
    const mv = {};
    for (const j of db.journal) {
      if (j.source === 'closing') continue;
      if (prePeriod(db, j.date) || postPeriod(db, j.date)) continue;
      const add = (code, dt, kt) => { if (!mv[code]) mv[code] = { dt: 0, kt: 0 }; mv[code].dt = r2(mv[code].dt + dt); mv[code].kt = r2(mv[code].kt + kt); };
      add(j.dt, j.amt, 0); add(j.kt, 0, j.amt);
    }
    return mv;
  }

  /* ── Орлогын тайлан ── */
  function incomeStatementData(db) {
    const mv = movementsByCat(db);
    const net = (cat, creditNature) => { const m = mv[cat] || { dt: 0, kt: 0 }; return creditNature ? r2(m.kt - m.dt) : r2(m.dt - m.kt); };
    const sales = net('51', true), other = net('52', true);
    const cogs = net('61', false), opex = net('70', false), finex = net('75', false);
    const grossProfit = r2(sales - cogs);
    const opProfit = r2(grossProfit + other - opex - finex);
    const taxBooked = net('91', false);
    const cit = taxBooked > 0 ? taxBooked : citTax(db, opProfit);
    const netProfit = r2(opProfit - cit);
    return { sales, other, cogs, opex, finex, grossProfit, opProfit, cit, taxBooked, netProfit };
  }

  /* ── СТ-1 (Сангийн сайдын 2017 оны 361-р тушаалын маягт) ── */
  function st1LineOf(a) {
    if (a.cat === '11') return '1.1.1';
    if (a.cat === '12') return '1.1.2';
    if (a.cat === '13') return '1.1.3';
    if (a.cat === '14') return '1.1.4';
    if (a.cat === '15') return '1.1.6';
    if (a.cat === '18') return '1.1.7';
    if (a.cat === '21' || a.cat === '22') return '1.2.1';
    if (a.cat === '23') return '1.2.2';
    if (a.cat === '31') return '2.1.1.1';
    if (a.cat === '33') return '2.1.1.2';
    if (a.cat === '32') return a.code === '311001' ? '2.1.1.4' : '2.1.1.3';
    if (a.cat === '34') return '2.1.1.5';
    if (a.cat === '35') return '2.1.2.1';
    if (a.cat === '41') return '2.3.2';
    if (a.cat === '44') return '2.3.9';
    return null;
  }
  const ST1_ROWS = [
    ['1', 'ХӨРӨНГӨ', 'head'],
    ['1.1', 'Эргэлтийн хөрөнгө', 'head'],
    ['1.1.1', 'Мөнгө, түүнтэй адилтгах хөрөнгө'],
    ['1.1.2', 'Дансны авлага'],
    ['1.1.3', 'Татвар, НДШ-ийн авлага'],
    ['1.1.4', 'Бусад авлага'],
    ['1.1.5', 'Бусад санхүүгийн хөрөнгө'],
    ['1.1.6', 'Бараа материал'],
    ['1.1.7', 'Урьдчилж төлсөн зардал/тооцоо'],
    ['1.1.8', 'Бусад эргэлтийн хөрөнгө'],
    ['1.1.9', 'Борлуулах зорилгоор эзэмшиж буй эргэлтийн бус хөрөнгө'],
    ['1.1.11', 'Эргэлтийн хөрөнгийн дүн', 'sum', ['1.1.1', '1.1.2', '1.1.3', '1.1.4', '1.1.5', '1.1.6', '1.1.7', '1.1.8', '1.1.9']],
    ['1.2', 'Эргэлтийн бус хөрөнгө', 'head'],
    ['1.2.1', 'Үндсэн хөрөнгө'],
    ['1.2.2', 'Биет бус хөрөнгө'],
    ['1.2.3', 'Биологийн хөрөнгө'],
    ['1.2.4', 'Урт хугацаат хөрөнгө оруулалт'],
    ['1.2.5', 'Хайгуул ба үнэлгээний хөрөнгө'],
    ['1.2.6', 'Хойшлогдсон татварын хөрөнгө'],
    ['1.2.7', 'Хөрөнгө оруулалтын зориулалттай үл хөдлөх хөрөнгө'],
    ['1.2.8', 'Бусад эргэлтийн бус хөрөнгө'],
    ['1.2.10', 'Эргэлтийн бус хөрөнгийн дүн', 'sum', ['1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6', '1.2.7', '1.2.8']],
    ['1.3', 'НИЙТ ХӨРӨНГИЙН ДҮН', 'sum', ['1.1.11', '1.2.10']],
    ['2', 'ӨР ТӨЛБӨР БА ЭЗДИЙН ӨМЧ', 'head'],
    ['2.1.1', 'Богино хугацаат өр төлбөр', 'head'],
    ['2.1.1.1', 'Дансны өглөг'],
    ['2.1.1.2', 'Цалингийн өглөг'],
    ['2.1.1.3', 'Татварын өр'],
    ['2.1.1.4', 'НДШ-ийн өглөг'],
    ['2.1.1.5', 'Богино хугацаат зээл'],
    ['2.1.1.6', 'Хүүний өглөг'],
    ['2.1.1.7', 'Ногдол ашгийн өглөг'],
    ['2.1.1.8', 'Урьдчилж орсон орлого'],
    ['2.1.1.9', 'Нөөц /өр төлбөр/'],
    ['2.1.1.10', 'Бусад богино хугацаат өр төлбөр'],
    ['2.1.1.13', 'Богино хугацаат өр төлбөрийн дүн', 'sum', ['2.1.1.1', '2.1.1.2', '2.1.1.3', '2.1.1.4', '2.1.1.5', '2.1.1.6', '2.1.1.7', '2.1.1.8', '2.1.1.9', '2.1.1.10']],
    ['2.1.2', 'Урт хугацаат өр төлбөр', 'head'],
    ['2.1.2.1', 'Урт хугацаат зээл'],
    ['2.1.2.4', 'Бусад урт хугацаат өр төлбөр'],
    ['2.1.2.6', 'Урт хугацаат өр төлбөрийн дүн', 'sum', ['2.1.2.1', '2.1.2.4']],
    ['2.2', 'Өр төлбөрийн нийт дүн', 'sum', ['2.1.1.13', '2.1.2.6']],
    ['2.3', 'Эздийн өмч', 'head'],
    ['2.3.2', 'Өмч: хувийн'],
    ['2.3.5', 'Нэмж төлөгдсөн капитал'],
    ['2.3.6', 'Хөрөнгийн дахин үнэлгээний нэмэгдэл'],
    ['2.3.9', 'Хуримтлагдсан ашиг'],
    ['2.3.11', 'Эздийн өмчийн дүн', 'sum', ['2.3.2', '2.3.5', '2.3.6', '2.3.9']],
    ['2.4', 'ӨР ТӨЛБӨР БА ЭЗДИЙН ӨМЧИЙН ДҮН', 'sum', ['2.2', '2.3.11']],
  ];
  function st1Data(db) {
    const b = computeBalance(db);
    const open = {}, close = {};
    const isLiab = ln => ln.startsWith('2');
    for (const r of b.rows) {
      const ln = st1LineOf(r.acc); if (!ln) continue;
      const o = isLiab(ln) ? r2(r.obKt - r.obDt) : r2(r.obDt - r.obKt);
      const c = isLiab(ln) ? r2(r.clKt - r.clDt) : r2(r.clDt - r.clKt);
      open[ln] = r2((open[ln] || 0) + o);
      close[ln] = r2((close[ln] || 0) + c);
    }
    // Хаагдаагүй үед тайлант үеийн ашгийг хуримтлагдсан ашигт нэгтгэнэ (СТ-1 тэнцэхийн тулд)
    let plNet = 0;
    for (const r of b.rows) {
      if (['51', '52'].includes(r.acc.cat)) plNet = r2(plNet + (r.clKt - r.clDt));
      if (['61', '70', '75', '91'].includes(r.acc.cat)) plNet = r2(plNet - (r.clDt - r.clKt));
    }
    close['2.3.9'] = r2((close['2.3.9'] || 0) + plNet);
    const val = { o: { ...open }, c: { ...close } };
    for (const row of ST1_ROWS) {
      if (row[2] === 'sum') {
        val.o[row[0]] = r2(row[3].reduce((s, k) => s + (val.o[k] || 0), 0));
        val.c[row[0]] = r2(row[3].reduce((s, k) => s + (val.c[k] || 0), 0));
      }
    }
    return val;
  }
  /* ── СТ-2 ── */
  function st2Data(db) {
    const is = incomeStatementData(db);
    const L = {};
    L[1] = is.sales; L[2] = is.cogs; L[3] = is.grossProfit;
    L[4] = 0; L[5] = 0; L[6] = 0; L[7] = 0; L[8] = is.other;
    L[9] = 0; L[10] = is.opex; L[11] = is.finex; L[12] = 0;
    L[13] = 0; L[14] = 0; L[15] = 0; L[16] = 0; L[17] = 0;
    L[18] = is.opProfit; L[19] = is.cit; L[20] = r2(is.opProfit - is.cit);
    L[21] = 0; L[22] = L[20]; L[23] = 0; L[24] = L[22]; L[25] = 0;
    return L;
  }
  /* ── СТ-3 ── */
  function st3Data(db) {
    const b = computeBalance(db);
    const eq = cat => {
      let o = 0, c = 0, mvK = 0, mvD = 0;
      for (const r of b.rows) if (r.acc.cat === cat) { o = r2(o + (r.obKt - r.obDt)); c = r2(c + (r.clKt - r.clDt)); mvK = r2(mvK + r.mvKt); mvD = r2(mvD + r.mvDt); }
      return { o, c, mvK, mvD };
    };
    const own = eq('41'), ret = eq('44');
    const is = incomeStatementData(db);
    // Хаалт хийгдсэн бол 44-ийн mv-д ашиг орсон; тайлант ашгийг тусад нь мөрөөр харуулна
    const closed = periodClosed(db);
    const ownChange = r2(own.mvK - own.mvD);
    const divid = closed ? 0 : r2(ret.mvD - 0); // хаагдаагүй үед 44-ийн ДТ хөдөлгөөн = ногдол ашиг гэж үзнэ
    return { ownO: own.o, retO: ret.o, net: is.netProfit, ownChange, divid, ownC: r2(own.o + ownChange), retC: r2(ret.o + is.netProfit - divid) };
  }
  /* ── СТ-4: мөнгөн гүйлгээ, шууд арга ── */
  function st4Data(db) {
    const F = { op_sales: 0, op_tax_ref: 0, op_in_other: 0, op_staff: 0, op_ndsh: 0, op_goods: 0, op_opex: 0,
      op_interest: 0, op_taxpaid: 0, op_out_other: 0, inv_in: 0, inv_out: 0,
      fin_loan_in: 0, fin_eq_in: 0, fin_loan_out: 0, fin_div_out: 0 };
    const isMoney = c => { const a = accByCode(db, c); return a && a.cat === '11'; };
    for (const j of db.journal) {
      if (j.source === 'closing') continue;
      if (prePeriod(db, j.date) || postPeriod(db, j.date)) continue;
      const dIn = isMoney(j.dt), dOut = isMoney(j.kt);
      if (dIn === dOut) continue;            // мөнгө оролцоогүй, эсвэл дотоод шилжүүлэг
      const other = accByCode(db, dIn ? j.kt : j.dt);
      const cat = other ? other.cat : '', code = other ? other.code : '';
      const nm = other ? other.name.toLowerCase() : '';
      if (dIn) { // мөнгөн орлого
        if (['12', '51', '52'].includes(cat)) F.op_sales = r2(F.op_sales + j.amt);
        else if (cat === '13') F.op_tax_ref = r2(F.op_tax_ref + j.amt);
        else if (['21', '23'].includes(cat)) F.inv_in = r2(F.inv_in + j.amt);
        else if (['34', '35'].includes(cat)) F.fin_loan_in = r2(F.fin_loan_in + j.amt);
        else if (cat === '41') F.fin_eq_in = r2(F.fin_eq_in + j.amt);
        else F.op_in_other = r2(F.op_in_other + j.amt);
      } else { // мөнгөн зарлага
        if (code === '311001') F.op_ndsh = r2(F.op_ndsh + j.amt);
        else if (cat === '33') F.op_staff = r2(F.op_staff + j.amt);
        else if (cat === '32') F.op_taxpaid = r2(F.op_taxpaid + j.amt);
        else if (['15', '31', '18'].includes(cat)) F.op_goods = r2(F.op_goods + j.amt);
        else if (cat === '70' || cat === '61') F.op_opex = r2(F.op_opex + j.amt);
        else if (cat === '75') { if (nm.includes('хүү')) F.op_interest = r2(F.op_interest + j.amt); else F.op_out_other = r2(F.op_out_other + j.amt); }
        else if (['21', '23'].includes(cat)) F.inv_out = r2(F.inv_out + j.amt);
        else if (['34', '35'].includes(cat)) F.fin_loan_out = r2(F.fin_loan_out + j.amt);
        else if (cat === '44') F.fin_div_out = r2(F.fin_div_out + j.amt);
        else F.op_out_other = r2(F.op_out_other + j.amt);
      }
    }
    F.in1 = r2(F.op_sales + F.op_tax_ref + F.op_in_other);
    F.out1 = r2(F.op_staff + F.op_ndsh + F.op_goods + F.op_opex + F.op_interest + F.op_taxpaid + F.op_out_other);
    F.net1 = r2(F.in1 - F.out1);
    F.net2 = r2(F.inv_in - F.inv_out);
    F.net3 = r2(F.fin_loan_in + F.fin_eq_in - F.fin_loan_out - F.fin_div_out);
    F.net5 = r2(F.net1 + F.net2 + F.net3);
    const bals = computeBalance(db);
    F.open = r2(bals.rows.filter(r => r.acc.cat === '11').reduce((s, r) => s + (r.obDt - r.obKt), 0));
    F.close = r2(F.open + F.net5);
    return F;
  }

  /* ── ТТ-02: улирлын эцэс (qEnd) хүртэлх өссөн дүнгээр; adj = гараар бөглөх мөрүүд ── */
  const TT02_ADJ_DEF = { ex2: 0, sp3: 0, oth4: 0, inc22: 0, dec23: 0, vol25: 0, loss27: 0, rel30: 0, wh52: 0, fo53: 0, rr57: 0, er58: 0 };
  function tt02Data(db, qEnd) {
    return withPeriod(db, db.settings.from, qEnd, () => {
      const mv = movementsByAcc(db);
      const L = {}; for (let i = 1; i <= 59; i++) L[i] = 0;
      const incRows = [], expRows = { 18: [], 19: [], 20: [] };
      for (const a of db.accounts) {
        const m = mv[a.code]; if (!m) continue;
        if (a.cat === '51' || a.cat === '52') {
          const amt = r2(m.kt - m.dt); if (Math.abs(amt) < 0.005) continue;
          let line = 6;
          if (a.cat === '52') {
            const n = a.name.toLowerCase();
            if (n.includes('түрээс')) line = 8;
            else if (n.includes('ханш')) line = 15;
            else if (/хүү|торгуул|алданги|анз|хохир/.test(n)) line = 11;
            else line = 16;
          }
          L[line] = r2(L[line] + amt);
          incRows.push({ line, name: a.code + ' — ' + a.name, amt });
        }
        if (['61', '70', '75', '91'].includes(a.cat)) {
          const amt = r2(m.dt - m.kt); if (Math.abs(amt) < 0.005) continue;
          const bucket = a.cat === '61' ? 18 : a.cat === '70' ? 19 : 20;
          L[bucket] = r2(L[bucket] + amt);
          expRows[bucket].push({ name: a.code + ' — ' + a.name, amt });
        }
      }
      const adj = Object.assign({ ...TT02_ADJ_DEF }, db.settings.tt02 || {});
      L[2] = adj.ex2; L[3] = adj.sp3; L[4] = adj.oth4;
      L[5] = r2(L[6] + L[7] + L[8] + L[9] + L[10] + L[11] + L[12] + L[13] + L[14] + L[15] + L[16]);
      L[1] = r2(L[2] + L[3] + L[4] + L[5]);
      L[17] = r2(L[18] + L[19] + L[20]);
      L[21] = r2(L[1] - L[17]);
      L[22] = adj.inc22; L[23] = adj.dec23;
      L[24] = r2(L[21] + L[22] - L[23]);
      L[25] = adj.vol25;
      L[26] = r2(L[24] + L[25]);
      L[27] = adj.loss27;
      L[28] = r2(L[26] - L[27]);
      L[29] = L[28] > 0 ? citTax(db, L[28]) : 0;
      L[30] = adj.rel30;
      L[31] = r2(L[29] - L[30]);
      L[51] = 0; // Тусгай хувь хэмжээ — системд одоогоор 0
      L[52] = adj.wh52; L[53] = adj.fo53;
      L[54] = r2(L[31] + L[51] - L[52] - L[53]);
      L[57] = adj.rr57; L[58] = adj.er58;
      L[59] = r2(L[31] - (L[57] + L[58]) + L[51] - L[52] - L[53]);
      return { L, adj, incRows, expRows, qEnd };
    });
  }

  /* ── Харилцагчийн тооцоо ── */
  function partnerLedger(db, accCode, creditNature) {
    const m = {};
    for (const j of db.journal) {
      const p = (j.partner || '').trim(); if (!p) continue;
      const e = m[p] || (m[p] = { inv: 0, pay: 0 });
      if (creditNature) { if (j.kt === accCode) e.inv = r2(e.inv + j.amt); if (j.dt === accCode) e.pay = r2(e.pay + j.amt); }
      else { if (j.dt === accCode) e.inv = r2(e.inv + j.amt); if (j.kt === accCode) e.pay = r2(e.pay + j.amt); }
    }
    return m;
  }

  /* ── Тодруулга ── */
  function notesData(db) {
    const b = computeBalance(db);
    const s = db.settings;
    const row = code => b.rows.find(r => r.acc.code === code);
    const catRows = cats => b.rows.filter(r => cats.includes(r.acc.cat) && (r.obDt || r.obKt || r.mvDt || r.mvKt));
    const money = catRows(['11']).map(r => ({ name: r.acc.code + ' — ' + r.acc.name, open: r2(r.obDt - r.obKt), inflow: r.mvDt, outflow: r.mvKt, close: r2(r.clDt - r.clKt) }));
    const partnerTbl = (acc, credit) => {
      const led = partnerLedger(db, acc, credit);
      return Object.entries(led).map(([p, e]) => ({ p, inv: e.inv, pay: e.pay, bal: r2(e.inv - e.pay) })).filter(r => r.inv || r.pay).sort((a, b2) => b2.bal - a.bal);
    };
    const recv = { open: (() => { const r = row(s.accReceivable); return r ? r2(r.obDt - r.obKt) : 0; })(), rows: partnerTbl(s.accReceivable, false) };
    const pay = { open: (() => { const r = row(s.accPayable); return r ? r2(r.obKt - r.obDt) : 0; })(), rows: partnerTbl(s.accPayable, true) };
    const taxes = catRows(['32', '33']).map(r => ({ name: r.acc.code + ' — ' + r.acc.name, open: r2(r.obKt - r.obDt), accrued: r.mvKt, paid: r.mvDt, close: r2(r.clKt - r.clDt) }));
    const cost = catRows(['21', '23']).map(r => ({ name: r.acc.code + ' — ' + r.acc.name, open: r2(r.obDt - r.obKt), add: r.mvDt, sub: r.mvKt, close: r2(r.clDt - r.clKt) }));
    const depr = catRows(['22']).map(r => ({ name: r.acc.code + ' — ' + r.acc.name, open: r2(r.obKt - r.obDt), add: r.mvKt, sub: r.mvDt, close: r2(r.clKt - r.clDt) }));
    const sum = (arr, k) => r2(arr.reduce((x, r) => x + r[k], 0));
    const assets = { cost, depr,
      tCost: { open: sum(cost, 'open'), add: sum(cost, 'add'), sub: sum(cost, 'sub'), close: sum(cost, 'close') },
      tDepr: { open: sum(depr, 'open'), add: sum(depr, 'add'), sub: sum(depr, 'sub'), close: sum(depr, 'close') } };
    assets.nbv = { open: r2(assets.tCost.open - assets.tDepr.open), close: r2(assets.tCost.close - assets.tDepr.close) };
    const mv = movementsByAcc(db);
    const brk = (cats, credit) => db.accounts
      .filter(a => cats.includes(a.cat) && mv[a.code])
      .map(a => ({ name: a.code + ' — ' + a.name, amt: credit ? r2(mv[a.code].kt - mv[a.code].dt) : r2(mv[a.code].dt - mv[a.code].kt) }))
      .filter(r => Math.abs(r.amt) > 0.004).sort((a, b2) => b2.amt - a.amt);
    const income = brk(['51', '52'], true);
    const expense = brk(['61', '70', '75', '91'], false);
    return { money, recv, pay, taxes, assets, income, expense };
  }

  /* ── Хаалтын төлөвлөгөө ── */
  function closingPlan(db) {
    const b = computeBalance(db);
    const s = db.settings;
    const plan = [];
    for (const r of b.rows) {
      const cat = r.acc.cat, g = (catByCode(cat) || {}).group;
      if (g === 'income') {
        const bal = r2(r.clKt - r.clDt);
        if (bal > 0.004) plan.push({ dt: r.acc.code, kt: s.accSummary, amt: bal, why: 'Орлого хаах: ' + r.acc.name });
        else if (bal < -0.004) plan.push({ dt: s.accSummary, kt: r.acc.code, amt: -bal, why: 'Орлогын дансны дебит үлдэгдэл хаах: ' + r.acc.name });
      } else if (g === 'expense') {
        const bal = r2(r.clDt - r.clKt);
        if (bal > 0.004) plan.push({ dt: s.accSummary, kt: r.acc.code, amt: bal, why: 'Зардал хаах: ' + r.acc.name });
        else if (bal < -0.004) plan.push({ dt: r.acc.code, kt: s.accSummary, amt: -bal, why: 'Зардлын дансны кредит үлдэгдэл хаах: ' + r.acc.name });
      }
    }
    const income = plan.filter(p => p.kt === s.accSummary).reduce((x, p) => x + p.amt, 0);
    const expense = plan.filter(p => p.dt === s.accSummary).reduce((x, p) => x + p.amt, 0);
    const profit = r2(income - expense);
    // Тайлант үед аль хэдийн бичигдсэн ААНОАТ (91 данс) давхар тооцогдохгүй: зөвхөн ЗӨРҮҮГ нэмнэ
    const taxAcc = b.rows.find(r => r.acc.code === s.accTaxExp);
    const taxBooked = taxAcc ? r2(taxAcc.clDt - taxAcc.clKt) : 0;
    let tax = 0;
    if (profit > 0) {
      const due = citTax(db, profit);
      const extra = r2(due - taxBooked);
      if (extra > 0.004) plan.push({ dt: s.accTaxExp, kt: s.accTaxPay, amt: extra, why: citLabel(db) + ' нэмж тооцох (бичигдсэн ' + fmtZ(taxBooked) + ')' });
      tax = r2(Math.max(due, taxBooked));
    } else tax = r2(Math.max(0, taxBooked));
    if (tax > 0.004) plan.push({ dt: s.accSummary, kt: s.accTaxExp, amt: tax, why: 'Татварын зардлыг нэгдсэн дансанд хаах' });
    const net = r2(profit - tax);
    if (net > 0.004) {
      plan.push({ dt: s.accSummary, kt: s.accProfit, amt: net, why: 'Цэвэр ашгийг тайлант үеийн ашиг руу' });
      plan.push({ dt: s.accProfit, kt: s.accRetained, amt: net, why: 'Тайлант үеийн ашгийг хуримтлагдсан ашиг руу' });
    } else if (net < -0.004) {
      plan.push({ dt: s.accProfit, kt: s.accSummary, amt: -net, why: 'Алдагдлыг тайлант үеийн данс руу' });
      plan.push({ dt: s.accRetained, kt: s.accProfit, amt: -net, why: 'Алдагдлыг хуримтлагдсан дүнд шилжүүлэх' });
    }
    return { plan, profit, tax, net };
  }

  /* ── Үндсэн хөрөнгө: шулуун шугамын элэгдэл ── */
  const monthlyDepr = a => a.years > 0 ? r2(a.cost / (a.years * 12)) : 0;
  const postedDepr = (db, id) => r2(db.journal.filter(j => j.source === 'depr' && j.ref === id).reduce((s, j) => s + j.amt, 0));
  const assetRemaining = (db, a) => r2(Math.max(0, a.cost - (a.accumStart || 0) - postedDepr(db, a.id)));

  /* ── Цалин: НДШ-ийн тайлангаас ирсэн мөр бүрийн ХХОАТ (хөрвүүлэгчтэй ижил логик) ── */
  const NDSH_CODE_RE_EXEMPT = /^70/, NDSH_CODE_RE_NOCREDIT = /^40/;
  function ndshRate(code, date, fallback) { return BBITax.ndshEmployee(code, date, fallback); }
  function autoCredit(e, date) {
    const code = String(e.type || '').trim();
    if (NDSH_CODE_RE_EXEMPT.test(code) || NDSH_CODE_RE_NOCREDIT.test(code)) return 0;
    const ozc = r2(Math.max(0, (e.gross || 0) - (e.ndshE || 0)));
    return BBITax.hhoatMonthlyCredit(ozc, date);
  }
  function calcEmp(e, date) {
    const gross = r2(e.gross), ndshE = r2(e.ndshE), credit = r2(e.credit);
    const code = String(e.type || '').trim();
    const exempt = NDSH_CODE_RE_EXEMPT.test(code);   // ХХОАТ 22.1.2 — чөлөөлнө
    const noCredit = NDSH_CODE_RE_NOCREDIT.test(code); // 23.1 хөнгөлөлт эдлэхгүй
    const taxable = r2(Math.max(0, gross - ndshE));      // ОЗЦ = цалин − НДШ (бодит шимтгэлээр)
    const raw = exempt ? 0 : r2(BBITax.hhoatMonthly(taxable, date));
    const eff = (exempt || noCredit) ? 0 : credit;
    const usedCredit = r2(eff);
    const hhoat = r2(raw - eff);                         // хөнгөлөлтийн дараах татвар (clamp хийхгүй — хөрвүүлэгчтэй ижил)
    const net = r2(gross - ndshE - hhoat);
    return { taxable, raw, usedCredit, hhoat, net, exempt, noCredit };
  }
  const coOf = (e, coPct) => r2(e.ndshCo > 0 ? e.ndshCo : (e.gross || 0) * coPct / 100);
  /* Цалингийн хүснэгтээс журналын бичилтийн дүнгүүд */
  function payrollTotals(p, date) {
    let tG = 0, tN = 0, tH = 0, co = 0;
    p.rows.forEach(e => { const c = calcEmp(e, date); tG = r2(tG + e.gross); tN = r2(tN + e.ndshE); tH = r2(tH + c.hhoat); co = r2(co + coOf(e, p.coPct)); });
    return { gross: tG, ndshE: tN, hhoat: tH, ndshCo: co };
  }

  return { r2, fmtZ, CATS, catByCode, accByCode, accLabel, validDate, inPeriod, prePeriod, postPeriod, periodClosed, withPeriod,
    citTax, citLabel, computeBalance, catClosing, catOpening, balanceAsOf, movementsByCat, movementsByAcc, incomeStatementData,
    st1LineOf, ST1_ROWS, st1Data, st2Data, st3Data, st4Data, TT02_ADJ_DEF, tt02Data, partnerLedger, notesData, closingPlan,
    monthlyDepr, postedDepr, assetRemaining, ndshRate, autoCredit, calcEmp, coOf, payrollTotals };
});
