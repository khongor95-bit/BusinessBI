/* ============================================================
   tax.js — BusinessBI татвар, шимтгэлийн НЭГДСЭН параметр
   ------------------------------------------------------------
   Зарчим (Nyabo-ийн дүрэм = дата хандлагаас):
   - Хувь, босго, шатлал бүр ЭНД, огноотой (valid_from / valid_to),
     эх сурвалж, хуулийн ишлэлтэй. Хэрэгслийн кодонд тоо бичихгүй.
   - Хайлт тухайн ГҮЙЛГЭЭ/ТАЙЛАНТ ҮЕИЙН огноогоор: BBITax.get(key, date).
     Огноонд таарах мөр байхгүй бол алдаа шиднэ — өмнөх жилийнхийг
     чимээгүй ашиглахгүй.
   - verified:false мөр = хуулийн эцсийн эхээр баталгаажаагүй (2027-ийн
     багц). Ийм мөр хүчинтэй огноонд хэрэгсэл бүр BBITax.banner(date)-ийг
     харуулна. Баталгаажуулсан бол verified:true болгоод source-ийг засна.

   Хэрэглэх:  <script src="tax.js"></script>
     BBITax.get('vat.rate', '2026-03-01')        → 10
     BBITax.ndshEmployee('22011', date)          → 0.8
     BBITax.hhoatAnnual(taxable, date)           → шатлалт татвар
     BBITax.hhoatMonthlyCredit(ozc, date)        → 23.1 хөнгөлөлт
     BBITax.cit(base, date, 'standard'|'simple1')
     BBITax.pending(date)                        → баталгаажаагүй мөрүүд
     BBITax.banner(date)                         → анхааруулгын HTML ('' бол алга)
   ============================================================ */
(function (root) {
  'use strict';

  var LAW_HHOAT = 'Хувь хүний орлогын албан татварын тухай хууль (2019.03.22, 2020.01.01-ээс)';
  var LAW_NDSH  = 'Нийгмийн даатгалын ерөнхий хууль (2023.07.07, 2024.01.01-ээс)';
  var LAW_VAT   = 'Нэмэгдсэн өртгийн албан татварын тухай хууль (2015.07.09)';
  var LAW_CIT   = 'Аж ахуйн нэгжийн орлогын албан татварын тухай хууль (2019.03.22)';
  var PKG_2027  = '2027.01.01-ээс мөрдөх татварын багц — nyabo.mn судалгаа (docs/mn-rules-reference.md), хуулийн эцсийн эхээр ШАЛГААГҮЙ';

  /* ── Параметрууд ─────────────────────────────────────────── */
  var PARAMS = [
    /* НДШ — даатгуулагч (ажилтан) */
    { key:'ndsh.employee.default', label:'Даатгуулагчийн НДШ (ердийн)', unit:'%', value:11.5,
      valid_from:'2024-01-01', valid_to:null, verified:true,
      source:LAW_NDSH, citation:'Тэтгэвэр 8.5 + тэтгэмж 0.8 + ажилгүйдэл 0.2 + ЭМД 2.0',
      components:{ pension:8.5, benefit:0.8, unemployment:0.2, health:2.0 } },
    { key:'ndsh.employee.by_code', label:'Даатгуулагчийн НДШ — төрлийн кодоор', unit:'%',
      value:{ '22011':0.8,'22031':0.8,'25022':0.8,'34011':0.8,'39012':0.8,'70011':0.8,
              '22001':9.3,'22021':9.3,'25012':9.3,'34001':9.3,'38002':9.3,'39002':9.3,'70001':9.3 },
      valid_from:'2024-01-01', valid_to:null, verified:true,
      source:LAW_NDSH, citation:'Тэтгэвэр тогтоолгосон, шимтгэл төлөхгүй → зөвхөн тэтгэмж 0.8; төлдөг → 8.5+0.8=9.3',
      note:'9.3%-ийн кодуудыг НДЕГ/нягтлангаар баталгаажуулах' },

    /* НДШ — ажил олгогч */
    { key:'ndsh.employer.components', label:'Ажил олгогчийн НДШ бүрэлдэхүүн', unit:'%',
      value:{ pension:8.5, benefit:1.0, unemployment:0.2, health:2.0, accident_tiers:[0.8,1.8,2.8] },
      valid_from:'2024-01-01', valid_to:'2026-12-31', verified:true,
      source:LAW_NDSH, citation:'ҮОМШӨ-ийн даатгал салбарын ангиллаар 0.8 / 1.8 / 2.8' },
    { key:'ndsh.employer.components', label:'Ажил олгогчийн НДШ бүрэлдэхүүн', unit:'%',
      value:{ pension:8.5, benefit:1.0, unemployment:0.2, health:2.0, accident_tiers:[0.3,1.2,2.2] },
      valid_from:'2027-01-01', valid_to:null, verified:false,
      source:PKG_2027, citation:'ҮОМШӨ-ийн хувь 2027.01.01-ээс өөрчлөгдөнө (VERIFY)' },
    { key:'ndsh.employer.default', label:'Ажил олгогчийн НДШ (анхдагч, 1-р ангилал)', unit:'%', value:12.5,
      valid_from:'2024-01-01', valid_to:'2026-12-31', verified:true,
      source:LAW_NDSH, citation:'8.5+1.0+0.2+2.0+0.8' },
    { key:'ndsh.employer.default', label:'Ажил олгогчийн НДШ (анхдагч, 1-р ангилал)', unit:'%', value:12.0,
      valid_from:'2027-01-01', valid_to:null, verified:false,
      source:PKG_2027, citation:'8.5+1.0+0.2+2.0+0.3 (VERIFY)' },

    /* ХХОАТ */
    { key:'hhoat.annual_tiers', label:'ХХОАТ-ын шатлал (жилийн татвар ногдох орлого)', unit:'₮',
      value:[ {upto:120000000, rate:0.10}, {upto:180000000, rate:0.15}, {upto:null, rate:0.20} ],
      valid_from:'2023-01-01', valid_to:null, verified:true,
      source:LAW_HHOAT, citation:'21.1 — 0–120 сая 10%, 120–180 сая 15%, 180 саяас дээш 20%' },
    { key:'hhoat.nonresident_rate', label:'Оршин суугч бус хувь хүний ХХОАТ', unit:'%', value:20,
      valid_from:'2020-01-01', valid_to:null, verified:true,
      source:LAW_HHOAT, citation:'21.2 — хөнгөлөлтгүй 20%' },
    { key:'hhoat.monthly_credit', label:'Сард ногдох хөнгөлөлт (ОЗЦ-ийн шатлалаар)', unit:'₮',
      value:[ {upto:500000, credit:20000}, {upto:1000000, credit:18000}, {upto:1500000, credit:16000},
              {upto:2000000, credit:14000}, {upto:2500000, credit:12000}, {upto:3000000, credit:10000}, {upto:null, credit:0} ],
      valid_from:'2020-01-01', valid_to:null, verified:true,
      source:LAW_HHOAT, citation:'23.1 — ОЗЦ = НДШ хассан сарын орлого' },
    { key:'hhoat.monthly_zero_threshold', label:'ХХОАТ 0%-ийн сарын босго', unit:'₮', value:792000,
      valid_from:'2027-01-01', valid_to:null, verified:false,
      source:PKG_2027, citation:'Сарын ТНО ≤ 792,000₮ → 0%; 2028-аас 792,000–2,000,000₮ → 1% (VERIFY)',
      note:'Босго давсан орлогод бүх дүнд эсвэл зөвхөн илүүд ногдуулах нь хуулийн эхээр тодорхойгүй — энд босго давбал бүх дүнд ердийн шатлалаар бодно' },

    /* НӨАТ */
    { key:'vat.rate', label:'НӨАТ-ын хувь', unit:'%', value:10,
      valid_from:'2016-01-01', valid_to:null, verified:true, source:LAW_VAT, citation:'11.1' },
    { key:'vat.registration_threshold', label:'НӨАТ суутган төлөгчөөр бүртгүүлэх борлуулалтын босго (жил)', unit:'₮', value:50000000,
      valid_from:'2016-01-01', valid_to:'2026-12-31', verified:true, source:LAW_VAT, citation:'6.1' },
    { key:'vat.registration_threshold', label:'НӨАТ суутган төлөгчөөр бүртгүүлэх борлуулалтын босго (жил)', unit:'₮', value:400000000,
      valid_from:'2027-01-01', valid_to:null, verified:false, source:PKG_2027, citation:'50 сая → 400 сая (VERIFY)' },

    /* ААНОАТ */
    { key:'cit.tiers', label:'ААНОАТ-ын шатлал (жилийн татвар ногдох орлого)', unit:'₮',
      value:[ {upto:6000000000, rate:0.10}, {upto:null, rate:0.25} ],
      valid_from:'2020-01-01', valid_to:null, verified:true,
      source:LAW_CIT, citation:'20.1 — 6 тэрбум хүртэл 10%, давсан хэсэгт 25%' },
    { key:'cit.simple_rate', label:'Хялбаршуулсан горимын ААНОАТ', unit:'%', value:1,
      valid_from:'2020-01-01', valid_to:null, verified:true, source:LAW_CIT, citation:'20.2.7' },
    { key:'cit.simple_threshold', label:'Хялбаршуулсан 1%-ийн горимын борлуулалтын босго (жил)', unit:'₮', value:50000000,
      valid_from:'2020-01-01', valid_to:'2026-12-31', verified:true, source:LAW_CIT, citation:'20.2.7 — 50 сая хүртэл, жилээр тайлагнана' },
    { key:'cit.simple_threshold', label:'Хялбаршуулсан 1%-ийн горимын борлуулалтын босго (жил)', unit:'₮', value:400000000,
      valid_from:'2027-01-01', valid_to:null, verified:false, source:PKG_2027, citation:'400 сая хүртэл, улирлаар тайлагнана (VERIFY)' },
    { key:'cit.credit90_threshold', label:'ААНОАТ-ын 90% хөнгөлөлтийн борлуулалтын босго (жил)', unit:'₮', value:1500000000,
      valid_from:'2020-01-01', valid_to:'2026-12-31', verified:true, source:LAW_CIT, citation:'22.1 — 1.5 тэрбум хүртэл («1% effective»)' },
    { key:'cit.credit90_threshold', label:'ААНОАТ-ын 90% хөнгөлөлтийн борлуулалтын босго (жил)', unit:'₮', value:2500000000,
      valid_from:'2027-01-01', valid_to:null, verified:false, source:PKG_2027, citation:'1.5 → 2.5 тэрбум (VERIFY)' },

    /* Тайлангийн хугацаа */
    { key:'filing.sme_annual', label:'ЖДҮ-ийн санхүүгийн тайлан — жилийн', value:'02-10',
      valid_from:'2016-01-01', valid_to:null, verified:true, source:'Нягтлан бодох бүртгэлийн тухай хууль', citation:'10.2 — дараа оны 2-р сарын 10' },
    { key:'filing.vat_monthly', label:'НӨАТ-ын тайлан — сар бүр', value:'10',
      valid_from:'2016-01-01', valid_to:null, verified:true, source:LAW_VAT, citation:'Дараа сарын 10-ны дотор' },
    { key:'filing.cit_quarterly', label:'ААНОАТ-ын тайлан — улирал бүр', value:'20',
      valid_from:'2020-01-01', valid_to:null, verified:true, source:LAW_CIT, citation:'Дараа улирлын эхний сарын 20; жилийн — 2-р сарын 10' }
  ];

  /* ── Хөдөлгүүр ──────────────────────────────────────────── */
  function iso(d) {
    if (!d) return new Date().toISOString().slice(0, 10);
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    var s = String(d);
    if (/^\d{4}-\d{2}$/.test(s)) return s + '-01';          // YYYY-MM → сарын эхний өдөр
    if (/^\d{4}$/.test(s)) return s + '-01-01';             // YYYY   → жилийн эхний өдөр
    return s.slice(0, 10);
  }
  function rows(key) { return PARAMS.filter(function (p) { return p.key === key; }); }
  function row(key, date) {
    var d = iso(date);
    var hit = rows(key).filter(function (p) { return p.valid_from <= d && (!p.valid_to || d <= p.valid_to); });
    if (!hit.length) {
      if (!rows(key).length) throw new Error('BBITax: «' + key + '» параметр байхгүй');
      throw new Error('BBITax: «' + key + '» параметр ' + d + ' огноонд хүчингүй — tax.js-д тухайн үеийн мөр нэмнэ үү');
    }
    return hit[hit.length - 1];
  }
  function get(key, date) { return row(key, date).value; }
  function r2(n) { return Math.round((n || 0) * 100) / 100; }

  /* Даатгуулагчийн НДШ — төрлийн кодоор (цалин бодогч, хөрвүүлэгч, журнал ижил) */
  function ndshEmployee(code, date, fallback) {
    var map = get('ndsh.employee.by_code', date);
    var r = map[String(code || '').trim()];
    if (r !== undefined) return r;
    return (fallback != null) ? fallback : get('ndsh.employee.default', date);
  }
  /* Ажил олгогчийн НДШ — ҮОМШӨ-ийн ангилал (1..3) */
  function ndshEmployer(date, accidentTier) {
    var c = get('ndsh.employer.components', date);
    var t = Math.min(Math.max((accidentTier || 1) - 1, 0), c.accident_tiers.length - 1);
    return r2(c.pension + c.benefit + c.unemployment + c.health + c.accident_tiers[t]);
  }
  /* ХХОАТ — жилийн шатлалт татвар (21.1); 2027-оос сарын 0%-ийн босго (баталгаажаагүй) */
  function hhoatAnnual(taxable, date) {
    if (taxable <= 0) return 0;
    var tiers = get('hhoat.annual_tiers', date), tax = 0, prev = 0;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i], top = t.upto == null ? Infinity : t.upto;
      if (taxable > top) { tax += (top - prev) * t.rate; prev = top; }
      else { tax += (taxable - prev) * t.rate; break; }
    }
    return tax;
  }
  function hhoatTierNo(taxable, date) {
    var tiers = get('hhoat.annual_tiers', date);
    for (var i = 0; i < tiers.length; i++) if (tiers[i].upto == null || taxable <= tiers[i].upto) return i + 1;
    return tiers.length;
  }
  function hhoatMonthly(taxableMonthly, date) {
    if (taxableMonthly <= 0) return 0;
    var zero = rows('hhoat.monthly_zero_threshold').length ? (function () { try { return get('hhoat.monthly_zero_threshold', date); } catch (e) { return null; } })() : null;
    if (zero != null && taxableMonthly <= zero) return 0;
    return hhoatAnnual(taxableMonthly, date);
  }
  function hhoatMonthlyCredit(ozc, date) {
    var tiers = get('hhoat.monthly_credit', date);
    for (var i = 0; i < tiers.length; i++) if (tiers[i].upto == null || ozc <= tiers[i].upto) return tiers[i].credit;
    return 0;
  }
  function hhoatCreditLabel(ozc, date) {
    var tiers = get('hhoat.monthly_credit', date), lo = 0;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i];
      if (t.upto == null || ozc <= t.upto) {
        var range = t.upto == null ? fmt(lo + 1) + '+' : (lo ? fmt(lo + 1) : '0') + '–' + fmt(t.upto);
        return range + ' → ' + (t.credit ? fmt(t.credit) + '₮' : 'хөнгөлөлтгүй');
      }
      lo = t.upto;
    }
    return '';
  }
  /* ААНОАТ — 20.1 шатлал эсвэл 20.2.7 хялбаршуулсан 1% */
  function cit(base, date, mode) {
    if (base <= 0) return 0;
    if (mode === 'simple1') return r2(base * get('cit.simple_rate', date) / 100);
    var tiers = get('cit.tiers', date), tax = 0, prev = 0;
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i], top = t.upto == null ? Infinity : t.upto;
      if (base > top) { tax += (top - prev) * t.rate; prev = top; }
      else { tax += (base - prev) * t.rate; break; }
    }
    return r2(tax);
  }
  function fmt(n) { return Math.round(n || 0).toLocaleString('en-US'); }

  /* Тухайн огноонд хүчинтэй, баталгаажаагүй параметрууд */
  function pending(date) {
    var d = iso(date), out = [], seen = {};
    PARAMS.forEach(function (p) {
      if (p.verified || seen[p.key]) return;
      if (p.valid_from <= d && (!p.valid_to || d <= p.valid_to)) { out.push(p); seen[p.key] = true; }
    });
    return out;
  }
  /* Ирэх өөрчлөлт: огнооноос хойш хүчин төгөлдөр болох мөрүүд (анхааруулга) */
  function upcoming(date, days) {
    var d = iso(date), lim = new Date(d); lim.setDate(lim.getDate() + (days || 120));
    var l = lim.toISOString().slice(0, 10);
    return PARAMS.filter(function (p) { return p.valid_from > d && p.valid_from <= l; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function banner(date) {
    var p = pending(date);
    if (!p.length) return '';
    return '<div class="bbi-tax-warn" style="margin:10px 0;padding:10px 14px;border:1px solid #e0a800;border-left:4px solid #e0a800;background:#fff8e1;border-radius:8px;font-size:12.5px;line-height:1.55;color:#5c4400">'
      + '<b>⚠ Татварын параметр баталгаажаагүй</b> — ' + esc(iso(date)) + ' огноонд хүчинтэй ' + p.length + ' параметр хуулийн эцсийн эхээр шалгагдаагүй (2027-ийн багц): '
      + p.map(function (x) { return '<b>' + esc(x.label) + '</b> (' + esc(x.citation) + ')'; }).join('; ')
      + '. Тооцоо эдгээр утгаар хийгдэнэ; баталгаажуулсны дараа <code>tax.js</code>-д verified:true болгоно.</div>';
  }
  function describe(key, date) {
    var p = row(key, date);
    return p.label + ' — ' + (typeof p.value === 'object' ? JSON.stringify(p.value) : p.value + (p.unit || '')) + ' · ' + p.source + ' · ' + p.citation + (p.verified ? '' : ' · БАТАЛГААЖААГҮЙ');
  }

  var api = { PARAMS: PARAMS, get: get, row: row, rows: rows, iso: iso,
    ndshEmployee: ndshEmployee, ndshEmployer: ndshEmployer,
    hhoatAnnual: hhoatAnnual, hhoatTierNo: hhoatTierNo, hhoatMonthly: hhoatMonthly,
    hhoatMonthlyCredit: hhoatMonthlyCredit, hhoatCreditLabel: hhoatCreditLabel,
    cit: cit, pending: pending, upcoming: upcoming, banner: banner, describe: describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BBITax = api;
})(typeof window !== 'undefined' ? window : globalThis);
