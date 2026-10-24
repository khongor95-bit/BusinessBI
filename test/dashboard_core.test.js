// node test/dashboard_core.test.js — дашбоардын тооцооллын тест (DOM-гүй)
const assert = require('assert');
const DC = require('../dashboard_core.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ' (' + a + ' ≠ ' + b + ')'); n++; };

function fixture() {
  const acc = (code, name, cat, obDt, obKt) => ({ code, name, cat, obDt: obDt || 0, obKt: obKt || 0 });
  const db = {
    settings: { from: '2026-01-01', to: '2026-12-31', citMode: 'standard', accVatIn: '121001', accVatOut: '311002', accPayable: '310101', accReceivable: '120100', accTaxPay: '311003' },
    accounts: [
      acc('100101', 'Касс', '11', 500000), acc('110101', 'Харилцах данс', '11', 5000000), acc('120100', 'Дансны авлага', '12', 800000), acc('121001', 'НӨАТ-ын авлага', '13'),
      acc('310101', 'Дансны өглөг', '31', 0, 700000), acc('311001', 'НДШ-ийн өглөг', '32'), acc('311002', 'НӨАТ-ын өглөг', '32'), acc('311003', 'ААНОАТ-ын өглөг', '32'), acc('311004', 'ХХОАТ-ын өглөг', '32'),
      acc('510101', 'Борлуулалтын орлого', '51'), acc('520101', 'Бусад орлого', '52'), acc('610101', 'ББӨ', '61'), acc('700105', 'Түрээсийн зардал', '70'), acc('750101', 'Банкны шимтгэл', '75'),
      acc('920101', 'Нэгдсэн данс', '92'), acc('440101', 'Хуримтлагдсан ашиг', '44'),
    ],
    journal: [],
  };
  const J = (doc, date, desc, partner, dt, kt, amt, source, at) => db.journal.push({ doc, date, desc, partner, dt, kt, amt, source, batch: 'B', at: at || date + 'T10:00:00Z' });
  // 9-р сар (өмнөх үе)
  J('1', '2026-09-05', 'Борлуулалт', 'Ган ХХК', '120100', '510101', 2000000, 'vatsale');
  J('2', '2026-09-20', 'Түрээс', 'Оффис ХХК', '700105', '310101', 500000, 'vatbuy');
  // 10-р сар (тайлант үе)
  J('3', '2026-10-03', 'Борлуулалт', 'Ган ХХК', '120100', '510101', 3000000, 'vatsale');
  J('3', '2026-10-03', 'Борлуулалт — НӨАТ', 'Ган ХХК', '120100', '311002', 300000, 'vatsale');
  J('4', '2026-10-10', 'Хүүгийн орлого', '', '110101', '520101', 100000, 'import');
  J('5', '2026-10-12', 'ББӨ', '', '610101', '110101', 1200000, 'manual');
  J('6', '2026-10-15', 'Түрээс', 'Оффис ХХК', '700105', '310101', 500000, 'vatbuy');
  J('6', '2026-10-15', 'Түрээс — НӨАТ', 'Оффис ХХК', '121001', '310101', 50000, 'vatbuy');
  J('7', '2026-10-20', 'Авлага орлого', 'Ган ХХК', '110101', '120100', 2500000, 'import');
  J('8', '2026-10-21', 'Банкны шимтгэл', '', '750101', '110101', 10000, 'import', '2026-10-21T09:00:00Z');
  J('9', '2026-10-21', 'Борлуулалт', 'Монос ХХК', '120100', '510101', 700000, 'manual', '2026-10-21T15:00:00Z');
  J('10', '2026-10-31', 'Хаалт', '', '510101', '920101', 3800000, 'closing');   // хаалт — тооцоонд орохгүй
  return db;
}

/* ── Тайлант үе ── */
{
  const p = DC.period('month', '2026-10');
  eq(p.from, '2026-10-01', 'сар эхлэл'); eq(p.to, '2026-10-31', 'сар төгсгөл'); eq(p.prevFrom, '2026-09-01', 'өмнөх сар эхлэл'); eq(p.prevTo, '2026-09-30', 'өмнөх сар төгсгөл'); eq(p.bucket, 'day', 'сар → өдрөөр');
  const j = DC.period('month', '2026-01'); eq(j.prevFrom, '2025-12-01', '1-р сарын өмнөх = 12-р сар'); eq(j.prevTo, '2025-12-31', '12-р сар төгсгөл');
  const f = DC.period('month', '2028-02'); eq(f.to, '2028-02-29', 'өндөр жил');
  const q = DC.period('quarter', '2026-11'); eq(q.from, '2026-10-01', 'IV улирал эхлэл'); eq(q.to, '2026-12-31', 'IV улирал төгсгөл'); eq(q.prevFrom, '2026-07-01', 'өмнөх = III улирал'); eq(q.bucket, 'month', 'улирал → сараар');
  const q1 = DC.period('quarter', '2026-02'); eq(q1.prevFrom, '2025-10-01', 'I улирлын өмнөх = өмнөх оны IV');
  const h = DC.period('half', '2026-10'); eq(h.from, '2026-07-01', 'II хагас эхлэл'); eq(h.prevFrom, '2026-01-01', 'өмнөх = I хагас'); eq(h.label, '2026 оны II хагас жил', 'хагас жилийн нэр');
  const yr = DC.period('year', '2026-05'); eq(yr.from, '2026-01-01', 'жил'); eq(yr.prevFrom, '2025-01-01', 'өмнөх жил'); eq(yr.prevTo, '2025-12-31', 'өмнөх жил төгсгөл');
  eq(DC.shiftAnchor('month', '2026-12', 1), '2027-01', 'сар урагш'); eq(DC.shiftAnchor('quarter', '2026-02', -1), '2025-11', 'улирал хойш'); eq(DC.shiftAnchor('year', '2026-06', 1), '2027-06', 'жил урагш');
  eq(DC.defaultAnchor(fixture(), '2026-11-03'), '2026-10', 'анхдагч үе = бичилттэй сүүлийн сар (хаалтын бичилт тооцохгүй)');
  eq(DC.defaultAnchor({ journal: [] }, '2026-11-03'), '2026-11', 'хоосон журнал → өнөөдрийн сар');
  eq(DC.defaultAnchor({ journal: [{ date: '2027-03-01' }] }, '2026-11-03'), '2027-03', 'ирээдүйн бичилт л байвал түүний сар');
}

/* ── KPI ── */
{
  const db = fixture(); const p = DC.period('month', '2026-10'); const k = DC.kpis(db, p);
  eq(k.income.value, 3800000, 'орлого = 3,000,000 + 100,000 + 700,000 (НӨАТ, хаалт орохгүй)');
  eq(k.expense.value, 1710000, 'зардал = 1,200,000 + 500,000 + 10,000 (НӨАТ-ын авлага зардал биш)');
  eq(k.profit.value, 2090000, 'ашиг'); eq(k.profit.margin, 55, 'маржин %');
  eq(k.income.prev, 2000000, 'өмнөх сарын орлого'); eq(k.income.pct, 90, 'өсөлт %');
  eq(k.expense.prev, 500000, 'өмнөх сарын зардал'); eq(k.expense.pct, 242, 'зардлын өсөлт %');
  // мөнгө: 5,500,000 эхний + 100,000 − 1,200,000 + 2,500,000 − 10,000 = 6,890,000 (10-р сарын эцэст)
  eq(k.cash.value, 6890000, 'мөнгөн үлдэгдэл 10.31');
  eq(k.cash.prev, 5500000, 'мөнгөн үлдэгдэл 09.30 (9-р сард мөнгөн гүйлгээгүй)');
  const z = DC.kpis({ settings: {}, accounts: db.accounts, journal: [] }, p);
  eq(z.income.pct, null, 'өмнөх 0 → хувь байхгүй'); eq(z.profit.margin, null, 'орлогогүй → маржин байхгүй');
  // Тайлант үеийн тохиргоо (settings.from/to) өөрчлөгдөлгүй үлдэх ёстой
  eq(db.settings.from, '2026-01-01', 'withPeriod settings.from сэргээсэн'); eq(db.settings.to, '2026-12-31', 'withPeriod settings.to сэргээсэн');
}

/* ── Цуваа ── */
{
  const db = fixture(); const p = DC.period('month', '2026-10'); const s = DC.series(db, p);
  eq(s.length, 31, '10-р сар 31 өдөр'); eq(s[0].key, '2026-10-01', 'эхний өдөр'); eq(s[0].label, '1', 'өдрийн шошго'); eq(s[30].key, '2026-10-31', 'сүүлийн өдөр');
  eq(s[2].income, 3000000, '10.03 орлого (НӨАТ орохгүй)'); eq(s[20].income, 700000, '10.21 орлого'); eq(s[20].expense, 10000, '10.21 зардал');
  eq(s.reduce((a, b) => a + b.income, 0), 3800000, 'цувааны нийлбэр = KPI орлого'); eq(s.reduce((a, b) => a + b.expense, 0), 1710000, 'цувааны нийлбэр = KPI зардал');
  const q = DC.series(db, DC.period('quarter', '2026-10'));
  eq(q.length, 3, 'улирал 3 сар'); eq(q[0].key, '2026-10', 'сарын түлхүүр'); eq(q[0].label, '10-р сар', 'сарын шошго'); eq(q[0].income, 3800000, '10-р сарын нийлбэр'); eq(q[1].income, 0, '11-р сар хоосон');
  const dec = DC.series(db, DC.period('quarter', '2025-11')); eq(dec.length, 3, 'өмнөх оны улирал'); eq(dec[2].key, '2025-12', 'жил давсан сарын түлхүүр');
  const cur = DC.series(db, p, '2026-10-25'); eq(cur[24].future, false, '10.25 өнөөдөр — ирээдүй биш'); eq(cur[25].future, true, '10.26 ирээдүй'); eq(cur.filter(b => !b.future).length, 25, 'өнөөдөр хүртэл 25 өдөр');
  const qf = DC.series(db, DC.period('quarter', '2026-10'), '2026-10-25'); eq(qf[0].future, false, '10-р сар одоо'); eq(qf[1].future, true, '11-р сар ирээдүй');
  ok(DC.series(db, p, '2026-12-01').every(b => !b.future), 'өнгөрсөн сар бүхэлдээ ирээдүй биш');
}

/* ── Авлага, өглөг ── */
{
  const db = fixture(); const rp = DC.receivablesPayables(db, DC.period('month', '2026-10'));
  // авлага: 800,000 + 2,000,000 + 3,000,000 + 300,000 − 2,500,000 + 700,000 = 4,300,000
  eq(rp.receivable, 4300000, 'дансны авлага 10.31');
  // өглөг: 700,000 + 500,000 (9-р) + 500,000 + 50,000 = 1,750,000
  eq(rp.payable, 1750000, 'дансны өглөг 10.31');
  eq(rp.recvShare, 71.07, 'авлагын хувь');
  eq(rp.topReceivable[0].name, 'Ган ХХК', 'топ авлагатан'); eq(rp.topReceivable[0].balance, 2800000, 'Ган ХХК үлдэгдэл = 2,000,000+3,300,000−2,500,000');
  eq(rp.topReceivable[1].name, 'Монос ХХК', '2-р авлагатан'); eq(rp.recvPartners, 2, 'авлагатай харилцагчийн тоо');
  eq(rp.topPayable[0].name, 'Оффис ХХК', 'топ өглөг'); eq(rp.topPayable[0].balance, 1050000, 'Оффис ХХК өглөг = 500,000+550,000'); eq(rp.payPartners, 1, 'өглөгтэй харилцагч');
  // Өмнөх сарын харагдац: харилцагчийн үлдэгдэл ч тухайн үеийн эцсийн байдлаар байх ёстой
  const sep = DC.receivablesPayables(db, DC.period('month', '2026-09'));
  eq(sep.receivable, 2800000, 'авлага 09.30 = 800,000 + 2,000,000'); eq(sep.topReceivable.length, 1, '09.30-д зөвхөн Ган ХХК'); eq(sep.topReceivable[0].balance, 2000000, 'Ган ХХК 09.30'); eq(sep.recvPartners, 1, '09.30 харилцагчийн тоо');
  eq(sep.payable, 1200000, 'өглөг 09.30 = 700,000 + 500,000'); eq(sep.topPayable[0].balance, 500000, 'Оффис ХХК 09.30');
}

/* ── Сүүлийн гүйлгээ ── */
{
  const r = DC.recent(fixture(), 4);
  eq(r.length, 4, '4 мөр'); eq(r[0].doc, '9', 'огноо адил бол сүүлд бүртгэсэн нь эхэнд'); eq(r[1].doc, '8', 'дараагийнх'); eq(r[2].doc, '7', '10.20');
  ok(!r.some(x => x.desc === 'Хаалт'), 'хаалтын бичилт жагсаалтад орохгүй');
  eq(r[0].source, 'Гар', 'эх сурвалжийн нэр'); eq(r[1].source, 'Банк', 'import → Банк'); eq(r[0].dtName, 'Дансны авлага', 'дебет дансны нэр');
  eq(DC.sourceLabel('vatbuy'), 'e-Barimt', 'vatbuy → e-Barimt'); eq(DC.sourceLabel('salary'), 'Цалин', 'salary'); eq(DC.sourceLabel(undefined), 'Гар', 'хоосон → Гар');
}

/* ── Тайлангийн хуанли ── */
{
  const db = fixture(); const d = DC.deadlines(db, '2026-10-25'); const by = {}; d.forEach(x => { by[x.key] = x; });
  eq(by.ndsh.due, '2026-11-05', 'НДШ — дараа сарын 5'); eq(by.ndsh.sub, '10-р сар', 'НДШ тайлагнах сар'); eq(by.ndsh.daysLeft, 11, 'НДШ хоног');
  eq(by.vat.due, '2026-11-10', 'НӨАТ — дараа сарын 10 (tax.js)'); eq(by.vat.amount, 250000, 'НӨАТ төлөх = 300,000 өглөг − 50,000 авлага');
  eq(by.hhoat.due, '2026-11-10', 'ХХОАТ — сарын 10');
  eq(by.cit.due, '2027-02-10', 'IV улиралд → жилийн ААНОАТ 02-10'); eq(by.cit.sub, '2026 оны жилийн', 'ААНОАТ нэр');
  eq(by.fs.due, '2027-02-10', 'санхүүгийн тайлан — жилийн'); eq(by.fs.sub, '2026 оны жилийн', 'СТ нэр');
  eq(d[0].key, 'ndsh', 'огноогоор эрэмбэлсэн');
  const e = DC.deadlines(db, '2026-11-07'); const eb = {}; e.forEach(x => { eb[x.key] = x; });
  eq(eb.ndsh.due, '2026-12-05', 'НДШ 11.05 өнгөрсөн → 12.05'); eq(eb.ndsh.sub, '11-р сар', 'тайлагнах сар'); eq(eb.vat.due, '2026-11-10', 'НӨАТ хэвээр'); eq(eb.vat.daysLeft, 3, 'НӨАТ 3 хоног');
  const m = DC.deadlines(db, '2026-05-02'); const mb = {}; m.forEach(x => { mb[x.key] = x; });
  eq(mb.cit.due, '2026-07-20', 'II улирлын ААНОАТ 07-20'); eq(mb.cit.sub, '2026 оны 2-р улирал', 'улирлын нэр'); eq(mb.fs.due, '2026-07-20', 'хагас жилийн СТ'); eq(mb.fs.sub, '2026 оны хагас жил', 'СТ хагас жил');
  const jan = DC.deadlines(db, '2027-01-15'); const jb = {}; jan.forEach(x => { jb[x.key] = x; });
  eq(jb.ndsh.due, '2027-02-05', '1-р сард НДШ → 02.05'); eq(jb.ndsh.sub, '1-р сар', 'тайлагнах сар'); eq(jb.cit.due, '2027-02-10', '1-р сард → өмнөх оны жилийн ААНОАТ'); eq(jb.fs.sub, '2026 оны жилийн', '1-р сард → өмнөх оны жилийн СТ');
}

/* ── Нэгтгэл, товчлол ── */
{
  const c = DC.compute(fixture(), { today: '2026-11-03' });
  eq(c.period.anchor, '2026-10', 'анхдагч үе'); eq(c.kpis.income.value, 3800000, 'нэгтгэлийн орлого'); eq(c.prevSeries.length, 30, 'өмнөх сар 30 өдөр'); eq(c.entryCount, 11, 'хаалтгүй бичилтийн тоо'); eq(c.deadlines.length, 5, '5 хугацаа');
  eq(DC.short(37163000), '37.2 сая', 'сая'); eq(DC.short(1250000000), '1.25 тэрбум', 'тэрбум'); eq(DC.short(850000), '850 мян', 'мянга'); eq(DC.short(-3200000), '−3.2 сая', 'сөрөг'); eq(DC.short(0), '0', 'тэг'); eq(DC.short(120000000), '120 сая', 'зуун сая бутархайгүй');
}

console.log('dashboard_core: ' + n + ' шалгалт OK');
