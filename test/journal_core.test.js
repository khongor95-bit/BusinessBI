// node test/journal_core.test.js — санхүүгийн програмын тооцооллын хөдөлгүүрийн тест (DOM-гүй)
const assert = require('assert');
const JC = require('../journal_core.js');
const r2 = JC.r2;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const eq = (a, b, m) => { assert.strictEqual(a, b, m + ' (' + a + ' ≠ ' + b + ')'); n++; };

/* ── Жишээ компани: стандарт данс + эхний үлдэгдэл + бичилтүүд ── */
function fixture() {
  const acc = (code, name, cat, obDt, obKt) => ({ code, name, cat, obDt: obDt || 0, obKt: obKt || 0 });
  const db = {
    settings: { from: '2026-01-01', to: '2026-12-31', citMode: 'standard', accSummary: '920101', accTaxExp: '910101', accTaxPay: '311003', accProfit: '910201', accRetained: '440101', accVatIn: '121001', accVatOut: '311002', accPayable: '310101', accReceivable: '120100', tt02: {} },
    accounts: [
      acc('100101', 'Касс', '11', 500000), acc('110101', 'Харилцах данс', '11', 5000000), acc('120100', 'Дансны авлага', '12', 800000), acc('121001', 'НӨАТ-ын авлага', '12'),
      acc('150101', 'Бараа материал', '15', 1200000), acc('200101', 'Тоног төхөөрөмж', '21', 6000000), acc('220101', 'Хуримтлагдсан элэгдэл', '22', 0, 1000000),
      acc('310101', 'Дансны өглөг', '31', 0, 700000), acc('311001', 'НДШ-ийн өглөг', '32'), acc('311002', 'НӨАТ-ын өглөг', '32'), acc('311003', 'ААНОАТ-ын өглөг', '32'), acc('311004', 'ХХОАТ-ын өглөг', '32'),
      acc('313001', 'Цалингийн өглөг', '33'), acc('340101', 'Богино хугацаат зээл', '34', 0, 2000000), acc('410101', 'Өмч', '41', 0, 5000000), acc('440101', 'Хуримтлагдсан ашиг', '44', 0, 4800000),
      acc('510101', 'Борлуулалтын орлого', '51'), acc('520101', 'Хүүгийн орлого', '52'), acc('610101', 'ББӨ', '61'), acc('700101', 'Цалингийн зардал', '70'), acc('700103', 'НДШ-ийн зардал', '70'),
      acc('700105', 'Түрээсийн зардал', '70'), acc('701014', 'Элэгдлийн зардал', '70'), acc('750101', 'Банкны шимтгэл, хүүгийн зардал', '75'), acc('910101', 'Орлогын татварын зардал', '91'), acc('910201', 'Тайлант үеийн ашиг', '91'), acc('920101', 'Нэгдсэн данс', '92'),
    ],
    journal: [], assets: [], payroll: [],
  };
  const J = (doc, date, desc, partner, dt, kt, amt, source, extra) => db.journal.push(Object.assign({ doc, date, desc, partner, dt, kt, amt, source, batch: 'B' }, extra || {}));
  J('0', '2025-12-28', 'Өмнөх үеийн өглөг төлөлт', '', '310101', '110101', 100000, 'manual');          // → эхний үлдэгдэлд нугална (балансын данс)
  J('1', '2026-01-10', 'Борлуулалт', 'Ган ХХК', '120100', '510101', 3000000, 'vatsale');
  J('1', '2026-01-10', 'Борлуулалт — НӨАТ', 'Ган ХХК', '120100', '311002', 300000, 'vatsale');
  J('2', '2026-01-12', 'ББӨ', '', '610101', '150101', 1200000, 'manual');
  J('3', '2026-01-15', 'Түрээс', 'Оффис ХХК', '700105', '310101', 500000, 'vatbuy');
  J('3', '2026-01-15', 'Түрээс — НӨАТ', 'Оффис ХХК', '121001', '310101', 50000, 'vatbuy');
  J('4', '2026-01-20', 'Авлага орлого', 'Ган ХХК', '110101', '120100', 2500000, 'import');
  J('5', '2026-01-25', 'Өглөг төлөв', 'Оффис ХХК', '310101', '110101', 550000, 'manual', { kind: 'settle' });
  J('ЦАЛИН-2026-01', '2026-01-31', 'Цалин', 'Ажилчид', '700101', '313001', 1000000, 'salary');
  J('ЦАЛИН-2026-01', '2026-01-31', 'АО НДШ', 'Ажилчид', '700103', '311001', 125000, 'salary');
  J('ЦАЛИН-2026-01', '2026-01-31', 'Ажилтны НДШ', 'Ажилчид', '313001', '311001', 115000, 'salary');
  J('ЦАЛИН-2026-01', '2026-01-31', 'ХХОАТ', 'Ажилчид', '313001', '311004', 70500, 'salary');
  J('6', '2026-02-02', 'Цалин олгов', '', '313001', '110101', 814500, 'manual');
  J('7', '2026-02-05', 'Банкны шимтгэл', '', '750101', '110101', 2000, 'import');
  J('8', '2026-02-10', 'Хүүгийн орлого', '', '110101', '520101', 30000, 'import');
  J('ЭЛЭГДЭЛ-2026-03', '2026-03-31', 'Элэгдэл', '', '701014', '220101', 100000, 'depr', { ref: 'a1' });
  J('9', '2026-04-01', 'Зээл төлөв', '', '340101', '110101', 500000, 'import');
  J('10', '2027-01-05', 'Дараагийн үеийн бичилт', '', '700105', '110101', 999999, 'manual');            // → тайлант үеэс гадуур, тоологдохгүй
  db.assets = [{ id: 'a1', name: 'Тоног', acc: '200101', deprAcc: '220101', cost: 6000000, years: 5, start: '2025-01-01', accumStart: 1000000 }];
  return db;
}

/* ── Гүйлгээ баланс ── */
{
  const db = fixture(); const b = JC.computeBalance(db);
  ok(b.balanced, 'гүйлгээ баланс тэнцэнэ'); eq(b.unknown.length, 0, 'бүртгэлгүй данс алга');
  const row = c => b.rows.find(r => r.acc.code === c);
  eq(row('310101').obDt, 100000, 'өмнөх үеийн бичилт → эхний үлдэгдэл');
  eq(row('110101').obKt, 100000, 'өмнөх үеийн кредит → эхний үлдэгдэл');
  eq(row('110101').mvDt, 2530000, 'банк орлого (2027 он ороогүй)');
  eq(row('110101').mvKt, 1866500, 'банк зарлага');
  eq(row('110101').clDt, 5563500, 'банкны эцсийн үлдэгдэл');
  eq(JC.catClosing(b, ['11']), 6063500, 'мөнгөний эцсийн үлдэгдэл (касс + банк)');
  eq(JC.catOpening(db, ['44']), -4800000, 'хуримтлагдсан ашгийн эхний үлдэгдэл (кредит → сөрөг)');
  eq(JC.balanceAsOf(db, '110101', '2026-01-21'), 7400000, 'огноо хүртэлх үлдэгдэл');
}
/* ── Орлогын тайлан, ААНОАТ ── */
{
  const db = fixture(); const is = JC.incomeStatementData(db);
  eq(is.sales, 3000000, 'борлуулалт'); eq(is.other, 30000, 'бусад орлого'); eq(is.cogs, 1200000, 'ББӨ');
  eq(is.opex, 1725000, 'үйл ажиллагааны зардал = 500000+1000000+125000+100000');
  eq(is.finex, 2000, 'санхүүгийн зардал'); eq(is.grossProfit, 1800000, 'нийт ашиг'); eq(is.opProfit, 103000, 'татварын өмнөх ашиг');
  eq(is.cit, 10300, 'ААНОАТ 10% (tax.js)'); eq(is.netProfit, 92700, 'цэвэр ашиг');
  db.settings.citMode = 'simple1'; eq(JC.incomeStatementData(db).cit, 1030, 'ААНОАТ 1% горим');
  eq(JC.citLabel(db), 'ААНОАТ 10% − 90% хөнгөлөлт ≈ ашгийн 1% (хуулийн 22.1)', 'горимын нэр');
  db.settings.citMode = 'standard'; eq(JC.citTax(db, 7e9), 850000000, '6 тэрбумаас дээш 25%');
}
/* ── СТ-1: хөрөнгө = өр төлбөр + эздийн өмч (нээлт, хаалт хоёулаа) ── */
{
  const db = fixture(); const v = JC.st1Data(db);
  eq(v.o['1.3'], v.o['2.4'], 'СТ-1 нээлтийн тэнцэл'); eq(v.c['1.3'], v.c['2.4'], 'СТ-1 хаалтын тэнцэл');
  eq(v.c['1.1.1'], 6063500, 'СТ-1 мөнгө'); eq(v.c['1.2.1'], 4900000, 'СТ-1 үндсэн хөрөнгө (цэвэр)');
  eq(v.c['2.3.9'], r2(4800000 + 103000 - 10300), 'хуримтлагдсан ашиг + тайлант үеийн цэвэр ашиг (бичигдээгүй ААНОАТ хасагдана)'); eq(v.c['2.1.1.3'] >= 10300, true, 'бичигдээгүй ААНОАТ өр төлбөрт');
  eq(JC.st1LineOf({ cat: '32', code: '311001' }), '2.1.1.4', 'НДШ-ийн өглөг тусдаа мөр');
  eq(JC.st1LineOf({ cat: '99', code: 'x' }), null, 'хамаарахгүй данс');
}
/* ── СТ-2, СТ-3, СТ-4 ── */
{
  const db = fixture(); const L = JC.st2Data(db); const is = JC.incomeStatementData(db);
  eq(L[3], is.grossProfit, 'СТ-2 нийт ашиг'); eq(L[20], is.netProfit, 'СТ-2 цэвэр ашиг'); eq(L[24], L[22], 'СТ-2 нийт дэлгэрэнгүй орлого');
  const s3 = JC.st3Data(db); eq(s3.retC, r2(4800000 + is.netProfit), 'СТ-3 хуримтлагдсан ашгийн хаалт'); eq(s3.ownC, 5000000, 'СТ-3 өмч');
  const F = JC.st4Data(db);
  eq(F.op_sales, 2530000, 'СТ-4 борлуулалт + бусад (52) мөнгөн орлого'); eq(F.op_in_other, 0, 'СТ-4 бусад орлого (52 ангилал борлуулалтад тоологдоно)');
  eq(F.op_goods, 550000, 'СТ-4 өглөг төлөлт'); eq(F.op_staff, 814500, 'СТ-4 цалин'); eq(F.op_opex, 0, 'зардлын шууд мөнгөн төлөлт алга'); eq(F.op_interest, 2000, 'СТ-4 75 ангилал «хүү» нэртэй → хүүгийн төлбөр'); eq(F.op_out_other, 0, 'бусад зарлага алга');
  eq(F.fin_loan_out, 500000, 'СТ-4 зээл төлөлт');
  eq(F.open, 5400000, 'СТ-4 мөнгөний эхний үлдэгдэл (өмнөх үеийн бичилт нугалсан)'); eq(F.close, 6063500, 'СТ-4 эцсийн = гүйлгээ балансын мөнгө');
}
/* ── ТТ-02 — улирлаар өссөн дүн ── */
{
  const db = fixture();
  const q1 = JC.tt02Data(db, '2026-03-31'), q4 = JC.tt02Data(db, '2026-12-31');
  eq(q1.L[6], 3000000, 'ТТ-02 Q1 борлуулалт'); eq(q1.L[11], 30000, 'ТТ-02 хүүгийн орлого → 11-р мөр (нэрэнд «хүү»)'); eq(q1.L[18], 1200000, 'ТТ-02 ББӨ');
  eq(q1.L[19], 1725000, 'ТТ-02 Q1 үйл ажиллагааны зардал'); eq(q4.L[19], 1725000, 'Q4 ижил (2027 ороогүй)');
  eq(q1.L[28], 103000, 'татвар ногдох орлого'); eq(q1.L[29], 10300, 'ногдуулсан ААНОАТ');
  eq(db.settings.from, '2026-01-01', 'withPeriod тайлант үеийг буцаана'); eq(db.settings.to, '2026-12-31', 'withPeriod to буцаана');
  db.settings.tt02 = { rel30: 300 }; eq(JC.tt02Data(db, '2026-12-31').L[31], 10000, 'хөнгөлөлт хасагдана');
}
/* ── Хаалтын төлөвлөгөө ── */
{
  const db = fixture(); const c = JC.closingPlan(db);
  eq(c.profit, 103000, 'хаалт: ашиг'); eq(c.tax, 10300, 'хаалт: татвар'); eq(c.net, 92700, 'хаалт: цэвэр');
  const inc = c.plan.filter(p => p.kt === '920101' && p.dt !== '910101').reduce((s, p) => s + p.amt, 0);
  const exp = c.plan.filter(p => p.dt === '920101' && !['910101', '910201'].includes(p.kt)).reduce((s, p) => s + p.amt, 0);
  eq(r2(inc - exp), 103000, 'орлого − зардал хаалт = ашиг');
  ok(c.plan.some(p => p.dt === '910101' && p.kt === '311003' && p.amt === 10300), 'ААНОАТ нэмж тооцох бичилт');
  ok(c.plan.some(p => p.dt === '910201' && p.kt === '440101' && p.amt === 92700), 'цэвэр ашиг → хуримтлагдсан ашиг');
  // Татвар аль хэдийн бичигдсэн бол зөвхөн зөрүү
  db.journal.push({ doc: 'T', date: '2026-04-20', desc: 'ААНОАТ урьдчилгаа', partner: '', dt: '910101', kt: '311003', amt: 4000, source: 'manual', batch: 'B' });
  const c2 = JC.closingPlan(db); ok(c2.plan.some(p => p.dt === '910101' && p.amt === 6300), 'бичигдсэн 4000 → зөрүү 6300'); eq(c2.tax, 10300, 'нийт татвар хэвээр');
  // Алдагдалтай үе
  const db2 = fixture(); db2.journal.push({ doc: 'L', date: '2026-05-01', desc: 'Их зардал', partner: '', dt: '700105', kt: '110101', amt: 5000000, source: 'manual', batch: 'B' });
  const c3 = JC.closingPlan(db2); ok(c3.net < 0 && c3.plan.some(p => p.dt === '440101' && p.kt === '910201'), 'алдагдлыг хуримтлагдсан дүнд');
  eq(JC.periodClosed(db2), false, 'хаагдаагүй'); db2.journal.push({ doc: '99999-ХААЛТ', date: '2026-12-31', desc: 'x', dt: '920101', kt: '910201', amt: 1, source: 'closing', batch: 'B' }); eq(JC.periodClosed(db2), true, 'хаагдсан');
}
/* ── Харилцагчийн тооцоо, тодруулга ── */
{
  const db = fixture(); const led = JC.partnerLedger(db, '310101', true);
  eq(led['Оффис ХХК'].inv, 550000, 'өглөг үүссэн'); eq(led['Оффис ХХК'].pay, 550000, 'өглөг төлөгдсөн');
  const nt = JC.notesData(db);
  eq(nt.money.length, 2, 'мөнгөний 2 данс'); eq(nt.pay.rows.length, 1, 'өглөгийн харилцагч'); eq(nt.pay.rows[0].bal, 0, 'өглөгийн үлдэгдэл 0');
  eq(nt.recv.rows[0].bal, 800000, 'авлагын үлдэгдэл = 3.3 сая − 2.5 сая');
  eq(nt.assets.nbv.close, 4900000, 'үндсэн хөрөнгийн цэвэр дүн'); eq(nt.expense[0].amt, 1200000, 'хамгийн том зардал ББӨ');
}
/* ── Элэгдэл ── */
{
  const db = fixture(); const a = db.assets[0];
  eq(JC.monthlyDepr(a), 100000, 'сарын элэгдэл 6 сая / 60'); eq(JC.postedDepr(db, 'a1'), 100000, 'бичигдсэн элэгдэл'); eq(JC.assetRemaining(db, a), 4900000, 'үлдэгдэл өртөг');
  eq(JC.monthlyDepr({ cost: 100, years: 0 }), 0, 'хугацаагүй → 0');
}
/* ── Цалин (tax.js-тэй) ── */
{
  const d = '2026-03-01';
  const c = JC.calcEmp({ type: '01001', gross: 2000000, ndshE: 230000, credit: 14000 }, d);
  eq(c.taxable, 1770000, 'ОЗЦ'); eq(c.raw, 177000, 'ХХОАТ 10%'); eq(c.hhoat, 163000, 'хөнгөлөлтийн дараах'); eq(c.net, 1607000, 'гарт олгох');
  eq(JC.calcEmp({ type: '70001', gross: 1000000, ndshE: 93000, credit: 18000 }, d).hhoat, 0, '70 код — чөлөөлнө');
  eq(JC.calcEmp({ type: '40001', gross: 1000000, ndshE: 115000, credit: 18000 }, d).hhoat, 88500, '40 код — хөнгөлөлтгүй');
  eq(JC.autoCredit({ type: '01001', gross: 1200000, ndshE: 138000 }, d), 16000, 'автомат хөнгөлөлт ОЗЦ 1,062,000 → 16,000');
  eq(JC.autoCredit({ type: '40001', gross: 1200000, ndshE: 138000 }, d), 0, '40 код автомат 0');
  eq(JC.ndshRate('22011', d), 0.8, 'тэтгэвэртэй код'); eq(JC.ndshRate('01001', d, 11.5), 11.5, 'ердийн');
  eq(JC.coOf({ gross: 1000000, ndshCo: 0 }, 12.5), 125000, 'АО НДШ хувиар'); eq(JC.coOf({ gross: 1000000, ndshCo: 130000 }, 12.5), 130000, 'АО НДШ бодит');
  const t = JC.payrollTotals({ coPct: 12.5, rows: [{ type: '01001', gross: 2000000, ndshE: 230000, credit: 14000 }, { type: '01001', gross: 1000000, ndshE: 115000, credit: 18000 }] }, d);
  eq(t.gross, 3000000, 'нийт цалин'); eq(t.ndshE, 345000, 'ажилтны НДШ'); eq(t.hhoat, 163000 + 70500, 'нийт ХХОАТ'); eq(t.ndshCo, 375000, 'АО НДШ');
}
/* ── Тайлант үе, туслахууд ── */
{
  const db = fixture();
  ok(JC.inPeriod(db, '2026-06-01') && !JC.inPeriod(db, '2027-01-01'), 'inPeriod'); ok(JC.prePeriod(db, '2025-12-31') && !JC.prePeriod(db, 'x'), 'prePeriod'); ok(JC.postPeriod(db, '2027-01-01'), 'postPeriod');
  eq(JC.accLabel(db, '110101'), '110101 — Харилцах данс', 'accLabel'); eq(JC.accLabel(db, '999'), '999', 'бүртгэлгүй код'); eq(JC.catByCode('51').group, 'income', 'ангилал'); eq(JC.CATS.length, 23, 'ангиллын тоо');
  const b2 = JC.computeBalance({ settings: db.settings, accounts: db.accounts, journal: [{ doc: 'u', date: '2026-02-01', dt: '999999', kt: '110101', amt: 5, source: 'manual' }] });
  eq(b2.unknown[0], '999999', 'бүртгэлгүй данс илэрнэ'); eq(b2.balanced, false, 'тэнцэхгүй');
}
/* ── Гадаад валют: ханшийн тэгшитгэл ── */
{
  const db = fixture();
  db.settings.accFxGain = '520201'; db.settings.accFxLoss = '750201';
  db.accounts.push({ code: '110201', name: 'Харилцах данс USD', cat: '11', obDt: 3400000, obKt: 0, cur: 'USD', obFcy: 1000 });
  db.accounts.push({ code: '310201', name: 'Гадаад өглөг USD', cat: '31', obDt: 0, obKt: 0, cur: 'USD', obFcy: 0 });
  db.accounts.push({ code: '410201', name: 'Нэмэлт өмч', cat: '41', obDt: 0, obKt: 3400000 }, { code: '520201', name: 'Ханшийн зөрүүний бодит бус олз', cat: '52' }, { code: '750201', name: 'Ханшийн зөрүүний бодит бус гарз', cat: '75' });
  db.fx = { rates: [{ date: '2025-12-31', cur: 'USD', rate: 3400 }, { date: '2026-03-01', cur: 'USD', rate: 3450 }, { date: '2026-06-30', cur: 'USD', rate: 3500 }] };
  eq(JC.fxRateOn(db, 'USD', '2026-05-15'), 3450, 'хамгийн ойрын өмнөх ханш'); eq(JC.fxRateOn(db, 'USD', '2025-01-01'), 0, 'ханш алга'); eq(JC.fxRateOn(db, 'MNT', '2026-01-01'), 1, 'MNT=1');
  // 500$ бараа зээлээр авав @3450 (MNT данс ← USD өглөг), 200$ орлого @3450
  db.journal.push({ doc: 'F1', date: '2026-03-05', desc: 'Импорт', dt: '150101', kt: '310201', amt: 1725000, cur: 'USD', fcy: 500, rate: 3450, source: 'manual' });
  db.journal.push({ doc: 'F2', date: '2026-03-10', desc: 'USD орлого', dt: '110201', kt: '120100', amt: 690000, cur: 'USD', fcy: 200, rate: 3450, source: 'manual' });
  const fb = JC.fxBalances(db, '2026-06-30');
  eq(fb['110201'].fcy, 1200, 'USD дансны валютын үлдэгдэл'); eq(fb['110201'].mnt, 4090000, '₮ үлдэгдэл'); eq(fb['310201'].fcy, -500, 'өглөг (КТ) сөрөг');
  const plan = JC.fxRevalPlan(db, '2026-06-30');
  const rb = plan.rows.find(r => r.code === '110201'), rp = plan.rows.find(r => r.code === '310201');
  eq(rb.target, 4200000, 'тэгшитгэсэн дүн 1200×3500'); eq(rb.diff, 110000, 'мөнгөний олз'); eq(rp.diff, -25000, 'өглөгийн гарз (ханш өсөхөд)');
  eq(plan.gain, 110000, 'нийт олз'); eq(plan.loss, 25000, 'нийт гарз'); eq(plan.entries.length, 2, '2 бичилт');
  const eG = plan.entries.find(e => e.kt === '520201'), eL = plan.entries.find(e => e.dt === '750201');
  ok(eG && eG.dt === '110201' && eG.amt === 110000, 'олзын бичилт ДТ мөнгө / КТ олз'); ok(eL && eL.kt === '310201' && eL.amt === 25000, 'гарзын бичилт ДТ гарз / КТ өглөг');
  const before = JC.incomeStatementData(db).opProfit;
  for (const e of plan.entries) db.journal.push({ doc: 'FX', date: '2026-06-30', desc: e.why, dt: e.dt, kt: e.kt, amt: e.amt, source: 'fxreval' });
  const is = JC.incomeStatementData(db);
  eq(is.fx, 85000, 'СТ-2 ханшийн цэвэр олз'); eq(r2(is.opProfit - before), 85000, 'ашигт нөлөө'); eq(JC.st2Data(db)[13], 85000, 'СТ-2 13-р мөр');
  eq(is.other, 30000, 'бусад орлогоос FX хасагдсан'); eq(is.finex, 2000, 'санхүүгийн зардлаас FX хасагдсан');
  const again = JC.fxRevalPlan(db, '2026-06-30'); eq(again.entries.length, 0, 'дахин тэгшитгэхэд зөрүүгүй');
  ok(JC.computeBalance(db).balanced, 'тэгшитгэлийн дараа баланс тэнцэнэ');
  const tt = JC.tt02Data(db, '2026-12-31'); eq(tt.L[4], 110000, 'ТТ-02 1.3 бодит бус олз');
  const db2 = fixture(); db2.accounts.push({ code: '110301', name: 'CNY', cat: '11', obDt: 480000, cur: 'CNY', obFcy: 1000 }); db2.fx = { rates: [] };
  eq(JC.fxRevalPlan(db2, '2026-06-30').missing[0], 'CNY', 'ханшгүй валют мэдэгдэнэ');
}
/* ── Аудитын засварууд ── */
{
  // Хаалт тухайн жилийнх: 2026 хаагдсан ч 2027 нээлттэй
  const db = fixture();
  const P = JC.closingPlan(db);
  for (const p of P.plan) db.journal.push({ doc: 'ХААЛТ-2026-12-31', date: '2026-12-31', desc: p.why, dt: p.dt, kt: p.kt, amt: p.amt, source: 'closing' });
  ok(JC.periodClosed(db), '2026 хаагдсан');
  const is26 = JC.incomeStatementData(db);
  eq(is26.netProfit, P.net, 'хаалтын дараа СТ-2 цэвэр ашиг = хаалтын цэвэр ашиг');
  eq(JC.st3Data(db).retC, JC.st1Data(db).c['2.3.9'], 'СТ-3 хуримтлагдсан ашиг = СТ-1');
  db.settings.from = '2027-01-01'; db.settings.to = '2027-12-31';
  ok(!JC.periodClosed(db), '2027 хаалтгүй — нээлттэй');
  eq(JC.closingPlan(db).plOpening.length, 0, '2026 хаалтын дараа орлого/зардлын эхний үлдэгдэлгүй');
}
{
  // Өмнөх жилийн хаагдаагүй орлого 2026-ын хаалтад орохгүй
  const db = fixture();
  db.journal.push({ doc: 'P', date: '2025-06-01', desc: 'Өмнөх жилийн борлуулалт', dt: '110101', kt: '510101', amt: 5000000, source: 'manual' });
  const P = JC.closingPlan(db), is = JC.incomeStatementData(db);
  eq(P.profit, is.opProfit, 'хаалтын ашиг = СТ-2 ашиг'); ok(P.plOpening.includes('510101'), 'өмнөх жилийн хаагдаагүй орлогыг анхааруулна');
}
{
  // Жилийн дунд урьдчилж бичсэн ААНОАТ — ногдох татвараас бага бол хуулийн дүнгээр
  const db = fixture();
  db.journal.push({ doc: 'T', date: '2026-06-30', desc: 'ААНОАТ урьдчилгаа', dt: '910101', kt: '311003', amt: 3000, source: 'manual' });
  const is = JC.incomeStatementData(db), P = JC.closingPlan(db);
  eq(is.cit, P.tax, 'СТ-2 татвар = хаалтын татвар'); eq(is.cit, 10300, 'ногдох татвар');
  // ТТ-02: 91 зардал хасагдахгүй
  eq(JC.tt02Data(db, '2026-12-31').L[28], 103000, 'ТТ-02 татвар ногдох орлого ААНОАТ-ын зардлаар буурахгүй');
  // Ногдол ашиг хаагдсан үед ч СТ-3-д тусна
  db.journal.push({ doc: 'D', date: '2026-07-01', desc: 'Ногдол ашиг', dt: '440101', kt: '110101', amt: 40000, source: 'manual' });
  eq(JC.st3Data(db).divid, 40000, 'ногдол ашиг (хаалтаас өмнө)');
  for (const p of JC.closingPlan(db).plan) db.journal.push({ doc: 'C', date: '2026-12-31', desc: p.why, dt: p.dt, kt: p.kt, amt: p.amt, source: 'closing' });
  eq(JC.st3Data(db).divid, 40000, 'ногдол ашиг (хаалтын дараа)'); eq(JC.st3Data(db).retC, JC.st1Data(db).c['2.3.9'], 'СТ-3 = СТ-1 (ногдол ашигтай)');
}
{
  // Борлуулалтын 1% горим
  const db = fixture(); db.settings.citMode = 'turnover1';
  eq(JC.incomeStatementData(db).cit, 30300, 'борлуулалтын (51+52) 1%');
  db.settings.citMode = 'simple1'; const tt = JC.tt02Data(db, '2026-12-31');
  eq(tt.L[29], 10300, 'ТТ-02 ногдуулсан 10%'); eq(tt.L[30], 9270, '90% хөнгөлөлт'); eq(tt.L[31], 1030, 'төлөх 1%');
  // ХХОАТ сөрөг гарахгүй
  const e = JC.calcEmp({ type: '01001', gross: 200000, ndshE: 23000, credit: 20000 }, new Date('2026-06-01'));
  ok(e.hhoat >= 0 && e.usedCredit <= e.raw, 'ХХОАТ сөрөг биш, хөнгөлөлт татвараас хэтрэхгүй');
}
console.log('journal_core.test.js: ' + n + ' шалгалт OK');
