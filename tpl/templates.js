/* ============================================================
   tpl/templates.js — BusinessBI-ийн 10 Excel загвар (генератор)
   BBITpl.LIST — каталог;  BBITpl.build(id, {ExcelJS, JSZip}) → Promise<Uint8Array>
   Татварын хувь хэмжээ tax.js (2026)-тай ижил; загварын «Тохиргоо» хуудсанд засах боломжтой.
   ============================================================ */
(function (root) {
  'use strict';
  const K = (typeof module !== 'undefined' && module.exports) ? require('./core.js') : root.BBITplCore;
  const { C, MONEY, MONEY2, PCT, MONTHS, S, fill, box, colL, newBook, sheet, title, header, inputCell, calcCell, totalRow, note, kpi, guide, listValidation, finish, rng } = K;

  const LIST = [
    { id: 'payroll', name: 'Цалин бодох загвар', price: 29000, cat: 'Цалин, ХН', short: 'НДШ, ХХОАТ, хөнгөлөлт, гарт олгох цалин, цалингийн хуудас — 2026 оны хувиар.', sheets: ['Цалин', 'Цалингийн хуудас', 'Хураангуй', 'Тохиргоо'] },
    { id: 'payslip', name: 'Цалингийн задаргаа мэйлдэх', price: 39000, cat: 'Цалин, ХН', short: 'Цалин бодоод ажилтан бүрт цалингийн хуудсыг PDF-ээр нэг товчоор мэйлдэнэ — Outlook эсвэл Gmail.', sheets: ['Цалин', 'Цалингийн хуудас', 'Мэйл', 'Хураангуй', 'Тохиргоо'], zip: true },
    { id: 'vat', name: 'НӨАТ-ын бүртгэл, тооцоо', price: 19000, cat: 'Татвар', short: 'Борлуулалт, худалдан авалтын падаан, сар бүрийн төлөх / илүү төлсөн НӨАТ.', sheets: ['Борлуулалт', 'Худалдан авалт', 'Сарын тооцоо'] },
    { id: 'fs', name: 'Санхүүгийн тайлан (СТ-1, СТ-2)', price: 39000, cat: 'НББ', short: 'Гүйлгээ балансаас баланс, орлогын тайлан, санхүүгийн харьцаа автоматаар.', sheets: ['Гүйлгээ баланс', 'СТ-1 Баланс', 'СТ-2 Орлого', 'Харьцаа'] },
    { id: 'depr', name: 'Үндсэн хөрөнгийн элэгдэл', price: 19000, cat: 'НББ', short: 'Хөрөнгийн бүртгэл, шулуун шугамын элэгдэл, сар бүрийн хуваарь, үлдэгдэл өртөг.', sheets: ['Хөрөнгө', 'Сарын хуваарь', 'Ангиллаар', 'Тохиргоо'] },
    { id: 'cashflow', name: 'Мөнгөн урсгалын төлөвлөгөө', price: 25000, cat: 'Санхүү', short: '12 сарын орлого, зарлага, үлдэгдэл, мөнгө дутах сарыг улаанаар анхааруулна.', sheets: ['Мөнгөн урсгал', 'График'] },
    { id: 'budget', name: 'Төсөв ба гүйцэтгэл', price: 25000, cat: 'Санхүү', short: 'Сар бүрийн төсөв, гүйцэтгэл, зөрүү, гүйцэтгэлийн хувь — сонгосон сар хүртэл өссөн дүнгээр.', sheets: ['Төсөв', 'Гүйцэтгэл', 'Харьцуулалт'] },
    { id: 'inventory', name: 'Агуулахын бүртгэл', price: 19000, cat: 'Үйл ажиллагаа', short: 'Бараа, орлого зарлагын хөдөлгөөн, үлдэгдэл, үнэлгээ, дахин захиалах анхааруулга.', sheets: ['Бараа', 'Хөдөлгөөн', 'Үлдэгдэл'] },
    { id: 'sales', name: 'Борлуулалтын дашбоард', price: 29000, cat: 'Дашбоард', short: 'Өгөгдлөө хуулаад л KPI, сар, салбар, бүтээгдэхүүн, борлуулагчаар график.', sheets: ['Дашбоард', 'Өгөгдөл'] },
    { id: 'feasibility', name: 'ТЭЗҮ — 5 жилийн санхүүгийн загвар', price: 49000, cat: 'Бизнес төлөвлөгөө', short: 'Хөрөнгө оруулалт, зээл, орлого зардлын төсөөлөл, NPV, IRR, өгөөжийн хугацаа, хугарлын цэг.', sheets: ['Таамаглал', 'Төсөөлөл', 'Мөнгөн урсгал', 'Зээл', 'Үр ашиг'] },
    { id: 'aging', name: 'Авлагын насжилт', price: 19000, cat: 'НББ', short: 'Нэхэмжлэх бүрийн хугацаа хэтрэлт, харилцагчаар 0–30 / 31–60 / 61–90 / 90+ хоног.', sheets: ['Нэхэмжлэх', 'Насжилт', 'Тохиргоо'] }
  ];
  const BUNDLE = { id: 'all', name: 'Бүх 11 загвар — багц', price: 149000 };

  /* ═════════ 1. ЦАЛИН ═════════ */
  async function payroll(ExcelJS, JSZip, mail) {
    const TITLE = mail ? 'Цалингийн задаргаа мэйлдэх загвар' : 'Цалин бодох загвар';
    const wb = newBook(ExcelJS, TITLE);
    if (mail) guide(wb, TITLE, [
      'Энэ загвар нь «Цалин бодох загвар» дээр суурилсан: «Цалин» хуудсанд цалингаа бодож, «И-мэйл» баганад ажилтан бүрийн мэйл хаягийг бичнэ.',
      '«Тохиргоо» хуудсын «Мэйл» хэсэгт илгээх аргаа сонгоно: Outlook (компьютер дээр Outlook суусан бол) эсвэл Gmail (Gmail-ийн App Password хэрэгтэй). Мэйлийн гарчиг, бичвэрийн загварыг тэнд засна.',
      'Файлыг ZIP-ээс задлаад Excel-ээр нээнэ → Alt+F11 → File → Import File… → TsalinMail.bas сонгоно → хаагаад файлаа «Excel Macro-Enabled Workbook (.xlsm)» хэлбэрээр хадгална.',
      'Alt+F8 → TsSendTest — эхний ажилтны цалингийн хуудсыг зөвхөн «Тест хаяг» руу илгээж шалгана. Зөв ирвэл TsSendAll — бүх ажилтанд тус бүрийн цалингийн хуудсыг PDF хавсралттай илгээнэ.',
      '«Мэйл» хуудсын «Илгээх» баганад 0 бичвэл тухайн ажилтанд илгээхгүй. «Төлөв» баганад OK / алдаа, илгээсэн цаг бичигдэнэ. TsSavePdf — мэйл илгээлгүйгээр зөвхөн PDF-үүдийг хадгална.'
    ], ['Макро зөвхөн Windows-ийн Excel дээр ажиллана (Mac Excel-д Outlook/CDO холболт өөр).',
      'Gmail ашиглах бол Google бүртгэлдээ 2 шаттай баталгаажуулалт идэвхжүүлж «App password» үүсгэнэ — энгийн нууц үг ажиллахгүй. Нууц үгээ «Тохиргоо»-нд хадгалахгүй бол хоосон орхиход илгээх үед асууна.',
      'Анх удаа заавал TsSendTest-ээр шалгаад дараа нь бүгдэд нь илгээнэ үү — илгээсэн мэйлийг буцаах боломжгүй.']);
    else guide(wb, TITLE, [
      '«Тохиргоо» хуудсанд НДШ, ХХОАТ-ын хувь, хөнгөлөлтийн шатлал 2026 оны хуулиар бөглөгдсөн. Хууль өөрчлөгдвөл зөвхөн тэнд засна.',
      '«Цалин» хуудсанд сар, ажлын өдрийн нормоо оруулаад ажилтан бүрийн үндсэн цалин, ажилласан өдөр, нэмэгдэл, урамшуулал, суутгалыг шар нүдэнд бичнэ.',
      'НДШ, ХХОАТ, хөнгөлөлт, гарт олгох цалин, ажил олгогчийн НДШ автоматаар бодогдоно. Мөр нэмэх бол сүүлийн ажилтны мөрийг хуулж доор нь буулгана.',
      '«Цалингийн хуудас» хуудсанд ажилтны дугаарыг сонгоход тухайн хүний цалингийн задаргаа гарна — хэвлэж гарын үсэг зуруулна.',
      '«Хураангуй» хуудсанд нийт цалингийн зардал, бүтэц график харагдана.'
    ], ['Хувь хэмжээ: даатгуулагчийн НДШ 11.5%, ажил олгогчийн 12.5% (ҮОМШӨ 0.8%-ийн ангилал), ХХОАТ 10% (жилийн 120 саяас дээш шатлалтай), сарын хөнгөлөлт 20,000₮–0₮ (НДШ хассан орлогоор).',
      'НДШ ногдуулах дээд хязгаар: хөдөлмөрийн хөлсний доод хэмжээний 10 дахин. Доод хэмжээг «Тохиргоо»-нд шалгаж шинэчилнэ үү.',
      'Тэтгэвэр тогтоолгосон ажилтны НДШ-ийн хувь өөр (0.8% / 9.3%) — «НДШ %» баганад гараар солино.']);

    const W = sheet(wb, 'Цалин', { freeze: 6, xFreeze: 2, widths: [5, 22, 13, 18, 14, 9, 9, 14, 12, 12, 14, 3, 13, 14, 11, 12, 13, 14, 14, 28], zoom: 90, tab: C.gold });
    const H = sheet(wb, 'Цалингийн хуудас', { widths: [3, 30, 20, 3, 30, 20] });
    const ML = mail ? sheet(wb, 'Мэйл', { freeze: 5, widths: [5, 24, 28, 14, 40, 9, 22, 18], tab: C.gold }) : null;
    const Z = sheet(wb, 'Хураангуй', { widths: [3, 14, 14, 14, 14, 14, 14, 14, 14, 3] });
    // Тохиргоо
    const T = sheet(wb, 'Тохиргоо', { widths: [36, 16, 50], tab: C.grey });
    title(T, 'Тохиргоо — хувь хэмжээ', 'Хууль өөрчлөгдвөл зөвхөн шар нүдийг засна', 3);
    const P = [['Даатгуулагчийн НДШ', 0.115, PCT, 'Тэтгэвэр 8.5 + тэтгэмж 0.8 + ажилгүйдэл 0.2 + ЭМД 2.0'], ['Ажил олгогчийн НДШ', 0.125, PCT, '8.5 + 1.0 + 0.2 + 2.0 + ҮОМШӨ 0.8 (салбараар 0.8/1.8/2.8)'], ['ХХОАТ-ын хувь', 0.10, PCT, 'Жилийн 120 сая хүртэлх орлогод'], ['Хөдөлмөрийн хөлсний доод хэмжээ', 792000, MONEY, 'Сарын — шалгаж шинэчилнэ үү'], ['НДШ ногдуулах дээд хязгаар', null, MONEY, '= доод хэмжээ × 10']];
    header(T, 4, ['Үзүүлэлт', 'Утга', 'Тайлбар']);
    P.forEach((p, i) => { const r = 5 + i; T.getCell('A' + r).value = p[0]; const v = T.getCell('B' + r); if (p[1] == null) { v.value = { formula: 'B8*10' }; calcCell(v, p[2]); } else { v.value = p[1]; inputCell(v, p[2]); } T.getCell('C' + r).value = p[3]; T.getCell('C' + r).font = { size: 9, color: { argb: C.grey } }; });
    header(T, 11, ['ОЗЦ доод хязгаар (НДШ хассан орлого)', 'Сарын хөнгөлөлт', 'Тайлбар']);
    const BR = [[0, 20000, '500,000₮ хүртэл'], [500000.01, 18000, '500,001 – 1,000,000₮'], [1000000.01, 16000, '1,000,001 – 1,500,000₮'], [1500000.01, 14000, '1,500,001 – 2,000,000₮'], [2000000.01, 12000, '2,000,001 – 2,500,000₮'], [2500000.01, 10000, '2,500,001 – 3,000,000₮'], [3000000.01, 0, '3,000,000₮-өөс дээш']];
    BR.forEach((b, i) => { const r = 12 + i; inputCell(T.getCell('A' + r), MONEY2); T.getCell('A' + r).value = b[0]; inputCell(T.getCell('B' + r), MONEY); T.getCell('B' + r).value = b[1]; T.getCell('C' + r).value = b[2]; });
    const TS = S('Тохиргоо');

    // Цалин
    W.mergeCells('A1:S1'); W.getCell('A1').value = 'Цалингийн тооцоо'; W.getCell('A1').font = { bold: true, size: 18, color: { argb: C.ink } }; W.getRow(1).height = 32;
    W.getCell('A2').value = 'Байгууллага:'; W.mergeCells('C2:F2'); inputCell(W.getCell('C2')); W.getCell('C2').value = 'Жишээ ХХК';
    W.getCell('A3').value = 'Тайлант сар:'; inputCell(W.getCell('C3'), 'yyyy-mm'); W.getCell('C3').value = new Date(Date.UTC(2026, 9, 1));
    W.getCell('E3').value = 'Ажлын өдөр (норм):'; W.getCell('E3').alignment = { horizontal: 'right' }; W.mergeCells('E3:F3'); inputCell(W.getCell('G3')); W.getCell('G3').value = 22;
    ['A2', 'A3'].forEach(a => W.getCell(a).font = { bold: true });
    header(W, 5, ['№', 'Овог нэр', 'Регистр', 'Албан тушаал', 'Үндсэн цалин', 'Ажилласан өдөр', 'НДШ %', 'Бодогдсон цалин', 'Нэмэгдэл', 'Урамшуулал', 'Нийт цалин', '', 'НДШ (ажилтан)', 'НДШ хассан орлого', 'Хөнгөлөлт', 'ХХОАТ', 'Бусад суутгал', 'Гарт олгох', 'НДШ (ажил олгогч)'].concat(mail ? ['И-мэйл'] : []));
    W.getRow(6).height = 4;
    const R = rng(77);
    const names = ['Бат-Эрдэнэ Ганболд', 'Сарангэрэл Түвшин', 'Энхжаргал Цэцэг', 'Мөнх-Очир Тэмүүлэн', 'Оюунчимэг Номин', 'Ганзориг Билгүүн', 'Нарантуяа Сүрэн', 'Төмөрбаатар Анар', 'Цолмон Хулан', 'Даваадорж Мандах', 'Солонго Ариунаа', 'Пүрэвсүрэн Тэргэл'];
    const pos = ['Захирал', 'Ерөнхий нягтлан', 'Нягтлан', 'Борлуулалтын менежер', 'Борлуулагч', 'Борлуулагч', 'Агуулахын эрхлэгч', 'Жолооч', 'Нярав', 'Маркетинг', 'Оператор', 'Туслах ажилтан'];
    const base = [4800000, 3500000, 2200000, 2600000, 1500000, 1450000, 1700000, 1300000, 1350000, 1900000, 1100000, 850000];
    const r0 = 7, N = names.length, rL = r0 + N - 1;
    names.forEach((nm, i) => {
      const r = r0 + i;
      W.getCell('A' + r).value = i + 1; calcCell(W.getCell('A' + r));
      [['B', nm], ['C', 'УБ' + String(90000000 + Math.floor(R() * 9999999)).slice(0, 8)], ['D', pos[i]], ['E', base[i]], ['F', i === 6 ? 20 : 22], ['G', 0.115], ['I', i % 3 === 0 ? 150000 : 0], ['J', i === 3 || i === 4 ? 300000 : 0], ['Q', i === 8 ? 200000 : 0]].forEach(([c, v]) => { const x = W.getCell(c + r); x.value = v; inputCell(x, c === 'G' ? PCT : (['E', 'I', 'J', 'Q'].includes(c) ? MONEY : null)); });
      const f = (c, fm, fmt) => { const x = W.getCell(c + r); x.value = { formula: fm }; calcCell(x, fmt || MONEY); };
      f('H', `ROUND(E${r}*F${r}/$G$3,0)`);
      f('K', `H${r}+I${r}+J${r}`);
      f('M', `ROUND(MIN(K${r},${TS}$B$9)*G${r},0)`);
      f('N', `K${r}-M${r}`);
      f('O', `IF(N${r}<=0,0,LOOKUP(N${r},${TS}$A$12:$A$18,${TS}$B$12:$B$18))`);
      f('P', `MAX(0,ROUND(N${r}*${TS}$B$7-O${r},0))`);
      f('R', `K${r}-M${r}-P${r}-Q${r}`);
      f('S', `ROUND(MIN(K${r},${TS}$B$9)*${TS}$B$6,0)`);
      W.getCell('R' + r).font = { bold: true };
      if (mail) { const e = W.getCell('T' + r); e.value = 'ajiltan' + (i + 1) + '@example.mn'; inputCell(e); }
    });
    const tr = rL + 1;
    W.getCell('B' + tr).value = 'НИЙТ'; ['E', 'H', 'I', 'J', 'K', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'].forEach(c => { const x = W.getCell(c + tr); x.value = { formula: `SUM(${c}${r0}:${c}${rL})` }; x.numFmt = MONEY; });
    totalRow(W, tr, 1, 19);
    note(W, 'B' + (tr + 2), 'Шар нүдийг бөглөнө. НДШ = MIN(нийт цалин, дээд хязгаар) × НДШ%. ХХОАТ = (НДШ хассан орлого × 10%) − хөнгөлөлт. Мөр нэмэх бол сүүлийн мөрийг хуулж буулгаад НИЙТ мөрийн томьёоны хүрээг сунгана.', `B${tr + 2}:K${tr + 3}`);
    W.getRow(tr + 2).height = 30;

    // Цалингийн хуудас
    H.mergeCells('B2:F2'); H.getCell('B2').value = 'ЦАЛИНГИЙН ХУУДАС'; H.getCell('B2').font = { bold: true, size: 18 }; H.getCell('B2').alignment = { horizontal: 'center' };
    H.mergeCells('B3:F3'); H.getCell('B3').value = { formula: `'Цалин'!C2&" · "&YEAR('Цалин'!C3)&" оны "&MONTH('Цалин'!C3)&"-р сар"` }; H.getCell('B3').alignment = { horizontal: 'center' }; H.getCell('B3').font = { color: { argb: C.grey } };
    H.getCell('B5').value = 'Ажилтны №'; H.getCell('B5').font = { bold: true };
    const sel = H.getCell('C5'); sel.value = 1; inputCell(sel); sel.font = { bold: true, size: 14 }; sel.alignment = { horizontal: 'center' };
    sel.dataValidation = { type: 'whole', operator: 'between', allowBlank: false, formulae: [1, N], showErrorMessage: true, error: '1–' + N + ' хооронд' };
    const ix = (col) => `INDEX('Цалин'!$${col}$${r0}:$${col}$${rL},$C$5)`;
    const rowsL = [['Овог нэр', 'B', '@'], ['Регистр', 'C', '@'], ['Албан тушаал', 'D', '@'], ['Ажилласан өдөр', 'F', '0']];
    rowsL.forEach(([l, c, fm], i) => { const r = 7 + i; H.getCell('B' + r).value = l; H.getCell('B' + r).font = { color: { argb: C.grey } }; const x = H.getCell('C' + r); x.value = { formula: ix(c) }; x.font = { bold: true }; x.numFmt = fm; });
    const left = [['Үндсэн цалин', 'E'], ['Бодогдсон цалин', 'H'], ['Нэмэгдэл', 'I'], ['Урамшуулал', 'J'], ['НИЙТ ЦАЛИН', 'K']];
    const right = [['НДШ (11.5%)', 'M'], ['ХХОАТ', 'P'], ['  — үүнээс хөнгөлөлт', 'O'], ['Бусад суутгал', 'Q'], ['ГАРТ ОЛГОХ', 'R']];
    H.getCell('B12').value = 'Олголт'; H.getCell('E12').value = 'Суутгал'; ['B12', 'E12'].forEach(a => { H.getCell(a).font = { bold: true, color: { argb: C.goldD } }; });
    left.forEach(([l, c], i) => { const r = 13 + i; H.getCell('B' + r).value = l; const x = H.getCell('C' + r); x.value = { formula: ix(c) }; x.numFmt = MONEY; x.border = box; if (i === 4) { H.getCell('B' + r).font = { bold: true }; x.font = { bold: true }; x.fill = fill(C.goldL); } });
    right.forEach(([l, c], i) => { const r = 13 + i; H.getCell('E' + r).value = l; const x = H.getCell('F' + r); x.value = { formula: ix(c) }; x.numFmt = MONEY; x.border = box; if (i === 4) { H.getCell('E' + r).font = { bold: true }; x.font = { bold: true, size: 13 }; x.fill = fill(C.goldL); } });
    H.getCell('B21').value = 'Ажил олгогчийн төлөх НДШ:'; H.getCell('C21').value = { formula: ix('S') }; H.getCell('C21').numFmt = MONEY; H.getCell('B21').font = { color: { argb: C.grey }, size: 9 }; H.getCell('C21').font = { color: { argb: C.grey }, size: 9 };
    H.getCell('B24').value = 'Хүлээн авсан: ____________________'; H.getCell('E24').value = 'Нягтлан: ____________________';

    // Хураангуй
    title(Z, 'Цалингийн зардлын хураангуй', '«Цалин» хуудаснаас автоматаар', 9);
    const W_ = S('Цалин');
    kpi(Z, 4, 2, 'Нийт цалин', `${W_}K${tr}`); kpi(Z, 4, 4, 'Гарт олгох', `${W_}R${tr}`); kpi(Z, 4, 6, 'Татвар, НДШ (ажилтан)', `${W_}M${tr}+${W_}P${tr}`); kpi(Z, 4, 8, 'Байгууллагын нийт зардал', `${W_}K${tr}+${W_}S${tr}`);
    const comp = [['Гарт олгох', `${W_}R${tr}`], ['НДШ (ажилтан)', `${W_}M${tr}`], ['ХХОАТ', `${W_}P${tr}`], ['Бусад суутгал', `${W_}Q${tr}`], ['НДШ (ажил олгогч)', `${W_}S${tr}`]];
    header(Z, 8, ['Бүрэлдэхүүн', '', 'Дүн'], 2); Z.mergeCells('B8:C8');
    comp.forEach(([l, f], i) => { const r = 9 + i; Z.mergeCells(`B${r}:C${r}`); Z.getCell('B' + r).value = l; Z.getCell('B' + r).border = box; const x = Z.getCell('D' + r); x.value = { formula: f }; calcCell(x, MONEY); });
    const zt = 9 + comp.length; Z.mergeCells(`B${zt}:C${zt}`); Z.getCell('B' + zt).value = 'Нийт'; Z.getCell('D' + zt).value = { formula: `SUM(D9:D${zt - 1})` }; Z.getCell('D' + zt).numFmt = MONEY; totalRow(Z, zt, 2, 4);
    const charts = {
      4: [{ type: 'doughnut', title: 'Цалингийн зардлын бүтэц', cats: { ref: `'Хураангуй'!$B$9:$B$13`, vals: comp.map(c => c[0]) }, series: [{ name: 'Дүн', ref: `'Хураангуй'!$D$9:$D$13`, vals: [] }], at: { c1: 5, r1: 7, c2: 9, r2: 22 } },
        { type: 'bar', title: 'Ажилтан тус бүрийн нийт цалин', cats: { ref: `'Цалин'!$B$${r0}:$B$${rL}`, vals: names }, series: [{ name: 'Нийт цалин', ref: `'Цалин'!$K$${r0}:$K$${rL}`, vals: [] }], at: { c1: 1, r1: 23, c2: 9, r2: 44 } }]
    };
    if (mail) mailParts(wb, W, H, ML, T, r0, rL);
    return done(wb, JSZip, { 'Хураангуй': charts[4] });
  }

  // Мэйл хэсэг: Тохиргоо-нд мэйлийн тохиргоо, «Мэйл» хуудас, VBA-д зориулсан ASCII нэртэй range-үүд
  function mailParts(wb, W, H, ML, T, r0, rL) {
    const N = rL - r0 + 1;
    H.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, printArea: 'B2:F25', margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 } };
    // Тохиргоо — мэйл
    header(T, 21, ['Мэйл тохиргоо', 'Утга', 'Тайлбар']);
    const MS = [['Илгээх арга', 'Outlook', 'Outlook эсвэл Gmail', 'BBI_Mode', ['Outlook', 'Gmail']], ['Outlook: илгээхийн өмнө харуулах (1/0)', 1, '1 бол мэйл бүр нээгдэж та өөрөө «Send» дарна; 0 бол шууд илгээнэ', 'BBI_Display'],
      ['Gmail хаяг', '', 'ж: hr@company.mn (Google Workspace) эсвэл ...@gmail.com', 'BBI_GmailUser'], ['Gmail App password', '', 'Хоосон орхивол илгээх үед асууна (аюулгүй)', 'BBI_GmailPass'],
      ['Илгээгчийн нэр', 'Жишээ ХХК — Нягтлан', 'Мэйлийн «From» нэр', 'BBI_FromName'], ['Тест хаяг', 'test@example.mn', 'TsSendTest зөвхөн энэ хаяг руу илгээнэ', 'BBI_TestTo'],
      ['Гарчгийн загвар', '{COMPANY} — {MONTH}ын цалингийн задаргаа', '{NAME} {MONTH} {NET} {COMPANY} орлуулна', 'BBI_SubjectTpl'],
      ['Бичвэрийн загвар', 'Сайн байна уу, {NAME}.\n\n{MONTH}ын цалингийн задаргааг хавсралтаар илгээж байна. Гарт олгох дүн: {NET}₮.\n\nАсуух зүйл байвал хариу бичээрэй.\n\nХүндэтгэсэн,\n{COMPANY}', 'Шинэ мөр: Alt+Enter', 'BBI_BodyTpl']];
    MS.forEach((m, i) => { const r = 22 + i; T.getCell('A' + r).value = m[0]; T.getCell('A' + r).border = box; const v = T.getCell('B' + r); v.value = m[1]; inputCell(v); if (m[4]) listValidation(v, m[4]); T.getCell('C' + r).value = m[2]; T.getCell('C' + r).font = { size: 9, color: { argb: C.grey } }; wb.definedNames.add(`'Тохиргоо'!$B$${r}`, m[3]); });
    T.getRow(29).height = 60; T.getCell('B29').alignment = { wrapText: true, vertical: 'top' }; T.getCell('B28').alignment = { wrapText: true };
    T.getColumn(2).width = 40;
    // Макронд харуулах мессежүүд (VBA-д кирилл бичихгүйн тулд энд)
    header(T, 32, ['Макроны мессеж', 'Текст', '']);
    const MSG = [['Батлах', 'Бүх ажилтанд цалингийн задаргаа илгээх үү? Тоо:', 'BBI_MsgConfirm'], ['Дууссан', 'Илгээсэн мэйл:', 'BBI_MsgDone'], ['Алдаатай', 'Алдаатай:', 'BBI_MsgErr'], ['Нууц үг', 'Gmail App password-оо оруулна уу:', 'BBI_MsgPass'], ['PDF хадгалсан', 'PDF хадгалсан хавтас:', 'BBI_MsgPdf'], ['Тест', 'Тест мэйл илгээгдлээ:', 'BBI_MsgTest']];
    MSG.forEach((m, i) => { const r = 33 + i; T.getCell('A' + r).value = m[0]; T.getCell('B' + r).value = m[1]; T.getCell('B' + r).font = { size: 9 }; wb.definedNames.add(`'Тохиргоо'!$B$${r}`, m[2]); });
    wb.definedNames.add(`'Цалингийн хуудас'!$C$5`, 'BBI_SlipSel');
    wb.definedNames.add(`'Цалингийн хуудас'!$B$2:$F$25`, 'BBI_Slip');
    // Мэйл хуудас
    ML.mergeCells('A1:H1'); ML.getCell('A1').value = 'Цалингийн задаргаа мэйлдэх'; ML.getCell('A1').font = { bold: true, size: 18, color: { argb: C.ink } }; ML.getRow(1).height = 32;
    ML.mergeCells('A2:H2'); ML.getCell('A2').value = 'Alt+F8 → TsSendTest (тест) → TsSendAll (бүгд). «Илгээх» = 0 бол алгасна.'; ML.getCell('A2').font = { size: 10, color: { argb: C.grey } };
    ML.getCell('A3').value = 'Сар:'; ML.getCell('A3').font = { bold: true }; ML.getCell('B3').value = { formula: `YEAR('Цалин'!C3)&" оны "&MONTH('Цалин'!C3)&"-р сар"` };
    header(ML, 5, ['№', 'Овог нэр', 'И-мэйл', 'Гарт олгох', 'Гарчиг', 'Илгээх', 'Төлөв', 'Илгээсэн']);
    const sub = (tpl, r) => `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${tpl},"{NAME}",B${r}),"{MONTH}",$B$3),"{NET}",TEXT(D${r},"#,##0")),"{COMPANY}",'Цалин'!$C$2)`;
    for (let i = 0; i < N; i++) {
      const r = 6 + i, sr = r0 + i;
      ML.getCell('A' + r).value = i + 1; calcCell(ML.getCell('A' + r));
      ML.getCell('B' + r).value = { formula: `'Цалин'!B${sr}` }; calcCell(ML.getCell('B' + r));
      ML.getCell('C' + r).value = { formula: `IF('Цалин'!T${sr}="","",'Цалин'!T${sr})` }; calcCell(ML.getCell('C' + r));
      ML.getCell('D' + r).value = { formula: `'Цалин'!R${sr}` }; calcCell(ML.getCell('D' + r), MONEY);
      ML.getCell('E' + r).value = { formula: sub('BBI_SubjectTpl', r) }; calcCell(ML.getCell('E' + r)); ML.getCell('E' + r).font = { size: 9, color: { argb: C.grey } };
      const s = ML.getCell('F' + r); s.value = 1; inputCell(s, '0'); s.alignment = { horizontal: 'center' }; s.dataValidation = { type: 'whole', operator: 'between', formulae: [0, 1], showErrorMessage: true };
      calcCell(ML.getCell('G' + r)); calcCell(ML.getCell('H' + r), 'yyyy-mm-dd hh:mm');
      ML.getCell('I' + r).value = { formula: sub('BBI_BodyTpl', r) }; ML.getCell('I' + r).font = { size: 8, color: { argb: 'FFBBBBBB' } }; ML.getCell('I' + r).alignment = { wrapText: false, vertical: 'top' }; ML.getRow(r).height = 18;
    }
    ML.getColumn(9).hidden = true;
    wb.definedNames.add(`'Мэйл'!$A$6:$I$${5 + N}`, 'BBI_MailTable');
    ML.addConditionalFormatting({ ref: `G6:G${5 + N}`, rules: [{ type: 'beginsWith', operator: 'beginsWith', text: 'OK', style: { font: { color: { argb: C.green }, bold: true } } }, { type: 'beginsWith', operator: 'beginsWith', text: 'ERR', style: { font: { color: { argb: C.red }, bold: true } } }] });
  }

  // График шигтгэнэ: {хуудасны нэр: [spec]} → sheet{id}.xml (хуудсыг үүсгэсэн дарааллаар)
  function done(wb, JSZip, chartsByName) {
    const charts = {};
    Object.keys(chartsByName || {}).forEach(n => { const ws = wb.getWorksheet(n); if (ws) charts[ws.id] = chartsByName[n]; });
    return finish(wb, JSZip, charts);
  }

  /* ═════════ 2. НӨАТ ═════════ */
  async function vat(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'НӨАТ-ын бүртгэл, тооцоо');
    guide(wb, 'НӨАТ-ын бүртгэл, тооцоо', [
      '«Борлуулалт» хуудсанд гаргасан баримт (ДДТД), «Худалдан авалт» хуудсанд хүлээн авсан баримтаа мөр мөрөөр бичнэ. eBarimt-аас Excel-ээр татаад багануудыг нь хуулж буулгаж болно.',
      'НӨАТ-тай нийт дүнг бичихэд НӨАТ-гүй дүн, НӨАТ автоматаар задарна (НӨАТ = нийт × 10/110).',
      'Худалдан авалтын «Хасагдах» баганад «Үгүй» сонговол тухайн баримтын НӨАТ-ыг хасахгүй (жишээ нь хувийн хэрэгцээ, хөнгөлөгдөх бараа).',
      '«Сарын тооцоо» хуудсанд тайлант оноо бичихэд сар бүрийн борлуулалтын НӨАТ, хасагдах НӨАТ, төлөх буюу дараагийн сард шилжих илүү төлөлт гарна.'
    ], ['НӨАТ-ын хувь 10%. Тайланг дараа сарын 10-ны дотор илгээнэ.', 'Энэ загвар нь удирдлагын тооцоо — албан ёсны тайланг e-tax системээр илгээнэ.']);
    const M = sheet(wb, 'Сарын тооцоо', { widths: [12, 18, 18, 18, 18, 18, 18], tab: C.gold });
    const mk = (name, rows, deduct) => {
      const ws = sheet(wb, name, { freeze: 4, widths: [12, 22, 28, 13, 16, 14, 14, 10, 30], tab: deduct ? C.grey : C.gold });
      title(ws, name === 'Борлуулалт' ? 'Борлуулалт — гаргасан баримт' : 'Худалдан авалт — хүлээн авсан баримт', 'НӨАТ-тай нийт дүнг бичихэд задаргаа автоматаар', 9);
      header(ws, 4, ['Огноо', 'ДДТД / баримтын №', name === 'Борлуулалт' ? 'Худалдан авагч' : 'Нийлүүлэгч', 'ТТД', 'НӨАТ-тай нийт', 'НӨАТ-гүй дүн', 'НӨАТ', deduct ? 'Хасагдах' : '', 'Тайлбар']);
      for (let i = 0; i < 300; i++) {
        const r = 5 + i, d = rows[i];
        ['A', 'B', 'C', 'D', 'E', 'I'].forEach(c => inputCell(ws.getCell(c + r), c === 'A' ? 'yyyy-mm-dd' : (c === 'E' ? MONEY : null)));
        if (deduct) { inputCell(ws.getCell('H' + r)); listValidation(ws.getCell('H' + r), ['Тийм', 'Үгүй']); }
        if (d) { ws.getCell('A' + r).value = d[0]; ws.getCell('B' + r).value = d[1]; ws.getCell('C' + r).value = d[2]; ws.getCell('D' + r).value = d[3]; ws.getCell('E' + r).value = d[4]; if (deduct) ws.getCell('H' + r).value = d[5] || 'Тийм'; }
        ws.getCell('F' + r).value = { formula: `IF(E${r}="","",E${r}-G${r})` }; calcCell(ws.getCell('F' + r), MONEY2);
        ws.getCell('G' + r).value = { formula: `IF(E${r}="","",ROUND(E${r}*10/110,2))` }; calcCell(ws.getCell('G' + r), MONEY2);
      }
      return ws;
    };
    const R = rng(11), cust = ['Номин Холдинг ХХК', 'Тэсо Корпораци ХХК', 'Говь ХК', 'Мон Лаа ХХК', 'Хүнс Трейд ХХК', 'Эрдэнэт Сервис ХХК', 'Сүү ХК'], sup = ['Таваг Трейд ХХК', 'Петровис ХХК', 'Юнител ХХК', 'Оффис Плаза ХХК', 'Ариг Ресурс ХХК'];
    const tin = () => String(2000000 + Math.floor(R() * 7999999));
    const sales = [], purch = [];
    for (let m = 0; m < 10; m++) for (let k = 0; k < 6; k++) sales.push([new Date(Date.UTC(2026, m, 2 + Math.floor(R() * 26))), 'S' + (26000 + sales.length), cust[Math.floor(R() * cust.length)], tin(), Math.round((800000 + R() * 6000000) / 1000) * 1000]);
    for (let m = 0; m < 10; m++) for (let k = 0; k < 5; k++) purch.push([new Date(Date.UTC(2026, m, 2 + Math.floor(R() * 26))), 'P' + (51000 + purch.length), sup[Math.floor(R() * sup.length)], tin(), Math.round((400000 + R() * 5200000) / 1000) * 1000, R() < 0.08 ? 'Үгүй' : 'Тийм']);
    sales.sort((a, b) => a[0] - b[0]); purch.sort((a, b) => a[0] - b[0]);
    mk('Борлуулалт', sales, false); mk('Худалдан авалт', purch, true);
    title(M, 'НӨАТ — сарын тооцоо', 'Борлуулалт, худалдан авалтын хуудаснаас автоматаар', 7);
    M.getCell('A3').value = 'Тайлант он:'; M.getCell('A3').font = { bold: true }; inputCell(M.getCell('B3')); M.getCell('B3').value = 2026; M.getRow(3).height = 20;
    header(M, 5, ['Сар', 'Борлуулалт (НӨАТ-гүй)', 'Борлуулалтын НӨАТ', 'Хасагдах НӨАТ', 'Өмнөх сарын илүү', 'Төлөх НӨАТ', 'Дараа сард шилжих илүү']);
    const SB = "'Борлуулалт'!", PB = "'Худалдан авалт'!", rr = '$5:$', e = 304;
    MONTHS.forEach((mn, i) => {
      const r = 6 + i; M.getCell('A' + r).value = mn; M.getCell('A' + r).border = box;
      const yr = (sh) => `(YEAR(${sh}$A$5:$A$${e})=$B$3)*(MONTH(${sh}$A$5:$A$${e})=${i + 1})`;
      const set = (c, f) => { const x = M.getCell(c + r); x.value = { formula: f }; calcCell(x, MONEY); };
      set('B', `SUMPRODUCT(${yr(SB)}*N(+${SB}$F$5:$F$${e}))`);
      set('C', `SUMPRODUCT(${yr(SB)}*N(+${SB}$G$5:$G$${e}))`);
      set('D', `SUMPRODUCT(${yr(PB)}*(${PB}$H$5:$H$${e}<>"Үгүй")*N(+${PB}$G$5:$G$${e}))`);
      set('E', i === 0 ? '0' : `G${r - 1}`);
      set('F', `MAX(0,C${r}-D${r}-E${r})`);
      set('G', `MAX(0,D${r}+E${r}-C${r})`);
      M.getCell('F' + r).font = { bold: true };
    });
    M.getCell('A18').value = 'Нийт'; ['B', 'C', 'D', 'F'].forEach(c => { M.getCell(c + 18).value = { formula: `SUM(${c}6:${c}17)` }; M.getCell(c + 18).numFmt = MONEY; }); totalRow(M, 18, 1, 7);
    note(M, 'A20', 'Анхаар: НӨАТ-гүй дүн, НӨАТ баганууд хоосон мөрт "" буцаадаг тул N(+…)-ээр тоо болгож нэмдэг.', 'A20:G20');
    return done(wb, JSZip, {
      'Сарын тооцоо': [{ type: 'col', title: 'Борлуулалтын ба хасагдах НӨАТ — сараар', cats: { ref: `'Сарын тооцоо'!$A$6:$A$17`, vals: MONTHS }, series: [{ name: 'Борлуулалтын НӨАТ', ref: `'Сарын тооцоо'!$C$6:$C$17`, vals: [], color: '#c9a470' }, { name: 'Хасагдах НӨАТ', ref: `'Сарын тооцоо'!$D$6:$D$17`, vals: [], color: '#171717' }], at: { c1: 0, r1: 21, c2: 7, r2: 40 } }]
    });
  }

  /* ═════════ 3. САНХҮҮГИЙН ТАЙЛАН ═════════ */
  async function fs(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Санхүүгийн тайлан (СТ-1, СТ-2)');
    guide(wb, 'Санхүүгийн тайлан (СТ-1, СТ-2)', [
      '«Гүйлгээ баланс» хуудсанд дансны код, нэр, эхний үлдэгдэл, тайлант үеийн гүйлгээг (дебет, кредит) бичнэ. Санхүүгийн програмаасаа гүйлгээ балансаа Excel-ээр гаргаад хуулж буулгаж болно.',
      'Данс бүрийн «СТ мөр» баганаас тухайн данс тайлангийн аль мөрөнд орохыг сонгоно (жагсаалт баруун талд). Шинэ данс нэмбэл мөрөө сонгоход л болно.',
      '«СТ-1 Баланс», «СТ-2 Орлого» хуудас автоматаар бүрдэнэ. Баланс тэнцэж буй эсэхийг «Шалгалт» мөр харуулна (0 байх ёстой).',
      '«Харьцаа» хуудсанд төлбөрийн чадвар, ашигт ажиллагааны гол харьцаа, график гарна.'
    ], ['Гүйлгээ балансыг ХААЛТЫН БИЧИЛТ ХИЙХЭЭС ӨМНӨ оруулна — орлого, зардлын дансны үлдэгдлээр СТ-2 бодогдоно, тайлант үеийн ашиг СТ-1-д автоматаар орно.',
      'Энэ нь удирдлагын тайлан; албан ёсны тайланг e-balance системээр илгээнэ.']);
    const TB = sheet(wb, 'Гүйлгээ баланс', { freeze: 5, widths: [9, 30, 30, 15, 15, 15, 15, 15, 15, 3, 34], tab: C.gold });
    const B1 = sheet(wb, 'СТ-1 Баланс', { widths: [3, 44, 18, 3], tab: C.gold });
    const B2 = sheet(wb, 'СТ-2 Орлого', { widths: [3, 44, 18, 3], tab: C.gold });
    const RT = sheet(wb, 'Харьцаа', { widths: [3, 36, 14, 50] });
    const LA = ['Мөнгө ба түүнтэй адилтгах хөрөнгө', 'Дансны авлага', 'Бараа материал', 'Урьдчилж төлсөн зардал', 'Бусад эргэлтийн хөрөнгө', 'Үндсэн хөрөнгө (цэвэр)', 'Биет бус хөрөнгө', 'Бусад эргэлтийн бус хөрөнгө'];
    const LL = ['Дансны өглөг', 'Цалингийн өглөг', 'Татварын өр', 'Богино хугацаат зээл', 'Бусад богино хугацаат өр', 'Урт хугацаат зээл'];
    const LE = ['Өмч (хувь нийлүүлсэн)', 'Хуримтлагдсан ашиг (эхний)'];
    const LI = ['Борлуулалтын орлого', 'Бусад орлого'];
    const LX = ['Борлуулсан бүтээгдэхүүний өртөг', 'Борлуулалт, маркетингийн зардал', 'Ерөнхий ба удирдлагын зардал', 'Санхүүгийн зардал', 'Бусад зардал', 'Орлогын албан татвар'];
    const ALL = LA.concat(LL, LE, LI, LX);
    title(TB, 'Гүйлгээ баланс', 'Хаалтын бичилтээс өмнөх үлдэгдэл, гүйлгээ', 9);
    TB.getCell('A3').value = 'Тайлант үе:'; TB.getCell('A3').font = { bold: true }; TB.mergeCells('B3:C3'); inputCell(TB.getCell('B3')); TB.getCell('B3').value = '2026 оны 1–9 сар';
    header(TB, 5, ['Код', 'Дансны нэр', 'СТ мөр', 'Эхний Дт', 'Эхний Кт', 'Гүйлгээ Дт', 'Гүйлгээ Кт', 'Эцсийн Дт', 'Эцсийн Кт']);
    header(TB, 5, ['СТ мөрүүд (жагсаалт)'], 11);
    ALL.forEach((l, i) => { const c = TB.getCell('K' + (6 + i)); c.value = l; c.font = { size: 9, color: { argb: C.grey } }; c.border = box; });
    const listRef = `$K$6:$K$${5 + ALL.length}`;
    const acc = [['1101', 'Касс', LA[0], 3e6, 0], ['1102', 'Харилцах данс', LA[0], 45e6, 0], ['1201', 'Дансны авлага', LA[1], 28e6, 0], ['1301', 'Бараа материал', LA[2], 60e6, 0], ['1401', 'Урьдчилж төлсөн зардал', LA[3], 2e6, 0], ['1601', 'Үндсэн хөрөнгө', LA[5], 120e6, 0], ['1602', 'Хуримтлагдсан элэгдэл', LA[5], 0, 30e6], ['1701', 'Биет бус хөрөнгө', LA[6], 8e6, 0],
      ['2101', 'Дансны өглөг', LL[0], 0, 22e6], ['2201', 'Цалингийн өглөг', LL[1], 0, 6e6], ['2301', 'Татварын өр', LL[2], 0, 4e6], ['2401', 'Богино хугацаат зээл', LL[3], 0, 20e6], ['2601', 'Урт хугацаат зээл', LL[5], 0, 50e6],
      ['3101', 'Өмч', LE[0], 0, 80e6], ['3401', 'Хуримтлагдсан ашиг', LE[1], 0, 54e6],
      ['5101', 'Борлуулалтын орлого', LI[0], 0, 0], ['5201', 'Бусад орлого', LI[1], 0, 0],
      ['6101', 'Борлуулсан барааны өртөг', LX[0], 0, 0], ['7101', 'Цалингийн зардал', LX[2], 0, 0], ['7102', 'Түрээсийн зардал', LX[2], 0, 0], ['7103', 'Элэгдлийн зардал', LX[2], 0, 0], ['7201', 'Маркетингийн зардал', LX[1], 0, 0], ['8101', 'Хүүгийн зардал', LX[3], 0, 0], ['8201', 'Бусад зардал', LX[4], 0, 0], ['9101', 'Орлогын албан татварын зардал', LX[5], 0, 0]];
    const tx = [['1201', '5101', 420e6], ['1102', '1201', 400e6], ['1301', '2101', 260e6], ['2101', '1102', 250e6], ['6101', '1301', 250e6], ['7101', '2201', 60e6], ['2201', '1102', 58e6], ['7102', '1102', 18e6], ['7103', '1602', 12e6], ['7201', '1102', 9e6], ['8101', '1102', 6.5e6], ['1102', '5201', 3e6], ['8201', '1101', 1.2e6], ['1101', '1102', 4e6], ['2401', '1102', 8e6], ['1401', '1102', 1.5e6], ['1601', '1102', 15e6], ['9101', '2301', 6.63e6], ['2301', '1102', 7e6]];
    const turn = {}; acc.forEach(a => turn[a[0]] = [0, 0]); tx.forEach(([d, c, v]) => { turn[d][0] += v; turn[c][1] += v; });
    const t0 = 6, N = 60, tl = t0 + N - 1;
    for (let i = 0; i < N; i++) {
      const r = t0 + i, a = acc[i];
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(c => inputCell(TB.getCell(c + r), 'DEFG'.includes(c) ? MONEY : null));
      listValidation(TB.getCell('C' + r), listRef);
      if (a) { TB.getCell('A' + r).value = a[0]; TB.getCell('B' + r).value = a[1]; TB.getCell('C' + r).value = a[2]; TB.getCell('D' + r).value = a[3] || null; TB.getCell('E' + r).value = a[4] || null; TB.getCell('F' + r).value = turn[a[0]][0] || null; TB.getCell('G' + r).value = turn[a[0]][1] || null; }
      TB.getCell('H' + r).value = { formula: `IF(COUNT(D${r}:G${r})=0,"",MAX(0,N(D${r})-N(E${r})+N(F${r})-N(G${r})))` }; calcCell(TB.getCell('H' + r), MONEY);
      TB.getCell('I' + r).value = { formula: `IF(COUNT(D${r}:G${r})=0,"",MAX(0,N(E${r})-N(D${r})+N(G${r})-N(F${r})))` }; calcCell(TB.getCell('I' + r), MONEY);
    }
    const tt = tl + 1; TB.getCell('B' + tt).value = 'НИЙТ'; ['D', 'E', 'F', 'G', 'H', 'I'].forEach(c => { TB.getCell(c + tt).value = { formula: `SUM(${c}${t0}:${c}${tl})` }; TB.getCell(c + tt).numFmt = MONEY; }); totalRow(TB, tt, 1, 9);
    TB.getCell('B' + (tt + 1)).value = 'Тэнцэл (Дт − Кт)'; ['D', 'F', 'H'].forEach((c, i) => { const n = ['E', 'G', 'I'][i]; TB.getCell(c + (tt + 1)).value = { formula: `${c}${tt}-${n}${tt}` }; TB.getCell(c + (tt + 1)).numFmt = MONEY; TB.getCell(c + (tt + 1)).font = { color: { argb: C.grey } }; });
    const G = S('Гүйлгээ баланс');
    const dr = l => `(SUMIF(${G}$C$${t0}:$C$${tl},"${l}",${G}$H$${t0}:$H$${tl})-SUMIF(${G}$C$${t0}:$C$${tl},"${l}",${G}$I$${t0}:$I$${tl}))`;
    // СТ-2 first (needed for СТ-1 profit)
    title(B2, 'СТ-2 Орлогын дэлгэрэнгүй тайлан', { formula: `${G}B3` } && '', 3);
    B2.getCell('B2').value = { formula: `${G}B3` }; B2.getCell('B2').font = { color: { argb: C.grey } };
    let r = 4; const line2 = (label, f, bold) => { B2.getCell('B' + r).value = label; const x = B2.getCell('C' + r); x.value = { formula: f }; calcCell(x, MONEY); B2.getCell('B' + r).border = box; if (bold) { totalRow(B2, r, 2, 3); } r++; return r - 1; };
    header(B2, r, ['Үзүүлэлт', 'Дүн'], 2); r++;
    const rv = line2('Борлуулалтын орлого', `-${dr(LI[0])}`);
    const cg = line2('Борлуулсан бүтээгдэхүүний өртөг', `${dr(LX[0])}`);
    const gp = line2('НИЙТ АШИГ', `C${rv}-C${cg}`, true);
    const sm = line2('Борлуулалт, маркетингийн зардал', dr(LX[1]));
    const ga = line2('Ерөнхий ба удирдлагын зардал', dr(LX[2]));
    const op = line2('ҮНДСЭН ҮЙЛ АЖИЛЛАГААНЫ АШИГ', `C${gp}-C${sm}-C${ga}`, true);
    const oi = line2('Бусад орлого', `-${dr(LI[1])}`);
    const fe = line2('Санхүүгийн зардал', dr(LX[3]));
    const oe = line2('Бусад зардал', dr(LX[4]));
    const pbt = line2('ТАТВАР ТӨЛӨХИЙН ӨМНӨХ АШИГ', `C${op}+C${oi}-C${fe}-C${oe}`, true);
    const tax = line2('Орлогын албан татварын зардал', dr(LX[5]));
    const np = line2('ТАЙЛАНТ ҮЕИЙН ЦЭВЭР АШИГ', `C${pbt}-C${tax}`, true);
    B2.getCell('C' + np).font = { bold: true, size: 13, color: { argb: C.ink } };
    const P2 = S('СТ-2 Орлого');
    // СТ-1
    title(B1, 'СТ-1 Санхүүгийн байдлын тайлан (баланс)', '', 3); B1.getCell('B2').value = { formula: `${G}B3` }; B1.getCell('B2').font = { color: { argb: C.grey } };
    r = 4; const line1 = (label, f, kind) => { B1.getCell('B' + r).value = label; const x = B1.getCell('C' + r); x.value = { formula: f }; calcCell(x, MONEY); B1.getCell('B' + r).border = box; if (kind === 't') totalRow(B1, r, 2, 3); if (kind === 'h') { B1.getCell('B' + r).font = { bold: true, color: { argb: C.goldD } }; B1.getCell('C' + r).value = null; B1.getCell('C' + r).border = undefined; B1.getCell('B' + r).border = undefined; } r++; return r - 1; };
    header(B1, r, ['ХӨРӨНГӨ', 'Дүн'], 2); r++;
    line1('Эргэлтийн хөрөнгө', '', 'h'); const a1 = r; LA.slice(0, 5).forEach(l => line1(l, dr(l)));
    const ca = line1('Эргэлтийн хөрөнгийн дүн', `SUM(C${a1}:C${r - 1})`, 't');
    line1('Эргэлтийн бус хөрөнгө', '', 'h'); const a2 = r; LA.slice(5).forEach(l => line1(l, dr(l)));
    const nca = line1('Эргэлтийн бус хөрөнгийн дүн', `SUM(C${a2}:C${r - 1})`, 't');
    const ta = line1('НИЙТ ХӨРӨНГӨ', `C${ca}+C${nca}`, 't'); B1.getCell('C' + ta).font = { bold: true, size: 13 };
    r++; header(B1, r, ['ӨР ТӨЛБӨР, ЭЗДИЙН ӨМЧ', 'Дүн'], 2); r++;
    line1('Богино хугацаат өр төлбөр', '', 'h'); const l1 = r; LL.slice(0, 5).forEach(l => line1(l, `-${dr(l)}`));
    const cl = line1('Богино хугацаат өр төлбөрийн дүн', `SUM(C${l1}:C${r - 1})`, 't');
    const ltl = line1('Урт хугацаат зээл', `-${dr(LL[5])}`);
    const tl_ = line1('НИЙТ ӨР ТӨЛБӨР', `C${cl}+C${ltl}`, 't');
    line1('Эздийн өмч', '', 'h'); const e1 = r; LE.forEach(l => line1(l, `-${dr(l)}`)); line1('Тайлант үеийн цэвэр ашиг', `${P2}C${np}`);
    const te = line1('ЭЗДИЙН ӨМЧИЙН ДҮН', `SUM(C${e1}:C${r - 1})`, 't');
    const tle = line1('НИЙТ ӨР ТӨЛБӨР, ЭЗДИЙН ӨМЧ', `C${tl_}+C${te}`, 't'); B1.getCell('C' + tle).font = { bold: true, size: 13 };
    r++; B1.getCell('B' + r).value = 'Шалгалт (0 байх ёстой)'; B1.getCell('C' + r).value = { formula: `ROUND(C${ta}-C${tle},0)` }; B1.getCell('C' + r).numFmt = MONEY;
    B1.addConditionalFormatting({ ref: `C${r}`, rules: [{ type: 'expression', formulae: [`C${r}<>0`], style: { font: { color: { argb: C.red }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDE8E8' } } } }, { type: 'expression', formulae: [`C${r}=0`], style: { font: { color: { argb: C.green }, bold: true } } }] });
    const P1 = S('СТ-1 Баланс');
    // Харьцаа
    title(RT, 'Санхүүгийн харьцаа', 'СТ-1, СТ-2-оос автоматаар', 4);
    header(RT, 4, ['Харьцаа', 'Утга', 'Тайлбар'], 2);
    const inv = a1 + 2;
    const RS = [['Эргэлтийн хөрөнгийн харьцаа', `IFERROR(${P1}C${ca}/${P1}C${cl},0)`, '0.00', '1.5–2-оос их бол богино хугацааны өрөө төлөх чадвартай'],
      ['Түргэн харьцаа', `IFERROR((${P1}C${ca}-${P1}C${inv})/${P1}C${cl},0)`, '0.00', 'Бараа материалгүйгээр өрөө төлөх чадвар (≥1)'],
      ['Өр / өмчийн харьцаа', `IFERROR(${P1}C${tl_}/${P1}C${te},0)`, '0.00', 'Зээлийн ачаалал — 1-ээс бага бол тогтвортой'],
      ['Нийт ашгийн хувь', `IFERROR(${P2}C${gp}/${P2}C${rv},0)`, PCT, 'Борлуулалтаас үлдэх нийт ашиг'],
      ['Үндсэн үйл ажиллагааны ашгийн хувь', `IFERROR(${P2}C${op}/${P2}C${rv},0)`, PCT, ''],
      ['Цэвэр ашгийн хувь', `IFERROR(${P2}C${np}/${P2}C${rv},0)`, PCT, ''],
      ['Хөрөнгийн өгөөж (ROA)', `IFERROR(${P2}C${np}/${P1}C${ta},0)`, PCT, 'Тайлант үеийн (жилийн биш)'],
      ['Өмчийн өгөөж (ROE)', `IFERROR(${P2}C${np}/${P1}C${te},0)`, PCT, 'Тайлант үеийн (жилийн биш)']];
    RS.forEach((x, i) => { const rr = 5 + i; RT.getCell('B' + rr).value = x[0]; RT.getCell('B' + rr).border = box; const v = RT.getCell('C' + rr); v.value = { formula: x[1] }; calcCell(v, x[2]); v.font = { bold: true }; RT.getCell('D' + rr).value = x[3]; RT.getCell('D' + rr).font = { size: 9, color: { argb: C.grey } }; });
    return done(wb, JSZip, {
      'Харьцаа': [{ type: 'doughnut', title: 'Хөрөнгийн бүтэц', cats: { ref: `'СТ-1 Баланс'!$B$${a1}:$B$${a1 + 4}`, vals: LA.slice(0, 5) }, series: [{ name: 'Хөрөнгө', ref: `'СТ-1 Баланс'!$C$${a1}:$C$${a1 + 4}`, vals: [] }], at: { c1: 1, r1: 14, c2: 3, r2: 32 } }],
      'СТ-2 Орлого': [{ type: 'bar', title: 'Орлого, зардал, ашиг', cats: { ref: `'СТ-2 Орлого'!$B$${rv}:$B$${np}`, vals: [] }, series: [{ name: 'Дүн', ref: `'СТ-2 Орлого'!$C$${rv}:$C$${np}`, vals: [] }], at: { c1: 1, r1: np + 1, c2: 4, r2: np + 22 } }]
    });
  }

  /* ═════════ 4. ЭЛЭГДЭЛ ═════════ */
  async function depr(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Үндсэн хөрөнгийн элэгдэл');
    guide(wb, 'Үндсэн хөрөнгийн элэгдэл', [
      '«Тохиргоо» хуудсанд тайлант оноо, хөрөнгийн ангилал бүрийн ашиглах хугацааг (жил) шалгана.',
      '«Хөрөнгө» хуудсанд хөрөнгө бүрийн нэр, ангилал, ашиглалтад орсон огноо, анхны өртөг, үлдэх өртгийг бичнэ. Ашиглах хугацаа ангиллаас автоматаар ирнэ (өөр бол гараар солино).',
      'Шулуун шугамын аргаар сарын элэгдэл, оны эхний хуримтлагдсан элэгдэл, тайлант оны элэгдэл, үлдэгдэл өртөг бодогдоно. Элэгдэл ашиглалтад орсон сарын дараа сараас эхэлнэ.',
      '«Сарын хуваарь» хуудас сар бүрийн элэгдлийн бичилтийн дүнг, «Ангиллаар» хуудас ангилал тус бүрийн дүнг харуулна.'
    ], ['Ашиглах хугацааг ААНОАТ-ын хууль болон байгууллагын бүртгэлийн бодлогоор шалгаж оруулна уу.']);
    const A = sheet(wb, 'Хөрөнгө', { freeze: 5, xFreeze: 2, widths: [5, 28, 26, 12, 15, 12, 9, 13, 4, 15, 15, 15, 15], tab: C.gold });
    const MS = sheet(wb, 'Сарын хуваарь', { freeze: 5, xFreeze: 2, widths: [5, 28].concat(Array(12).fill(11), [13]) });
    const CT = sheet(wb, 'Ангиллаар', { widths: [3, 30, 16, 16, 16, 16] });
    const T = sheet(wb, 'Тохиргоо', { widths: [34, 14, 50], tab: C.grey });
    title(T, 'Тохиргоо', 'Тайлант он, ашиглах хугацаа', 3);
    T.getCell('A4').value = 'Тайлант он'; inputCell(T.getCell('B4')); T.getCell('B4').value = 2026;
    T.getCell('A5').value = 'Оны эхний сарын индекс'; T.getCell('B5').value = { formula: '(B4-1900)*12+1' }; T.getCell('A5').font = { color: { argb: C.grey }, size: 9 };
    header(T, 7, ['Ангилал', 'Ашиглах жил', 'Тайлбар']);
    const cats = [['Барилга, байгууламж', 25], ['Машин, тоног төхөөрөмж', 10], ['Тээврийн хэрэгсэл', 10], ['Компьютер, программ хангамж', 3], ['Тавилга, эд хогшил', 10], ['Бусад үндсэн хөрөнгө', 10]];
    cats.forEach((c, i) => { const r = 8 + i; T.getCell('A' + r).value = c[0]; inputCell(T.getCell('A' + r)); T.getCell('B' + r).value = c[1]; inputCell(T.getCell('B' + r)); });
    T.getCell('C8').value = 'Шалгаж оруулна уу'; T.getCell('C8').font = { size: 9, color: { argb: C.grey } };
    const TS = S('Тохиргоо'), catRef = `${TS}$A$8:$A$13`;
    title(A, 'Үндсэн хөрөнгийн бүртгэл, элэгдэл', 'Шулуун шугамын арга', 13);
    header(A, 4, ['№', 'Хөрөнгийн нэр', 'Ангилал', 'Ашиглалтад орсон', 'Анхны өртөг', 'Үлдэх өртөг', 'Ашиглах жил', 'Сарын элэгдэл', '', 'Хуримтлагдсан (оны эхэнд)', 'Тайлант оны элэгдэл', 'Хуримтлагдсан (оны эцэст)', 'Үлдэгдэл өртөг']);
    A.getRow(5).height = 4;
    const sample = [['Оффисын барилга', 0, '2019-03-15', 480e6, 20e6], ['Агуулахын тавиур', 4, '2023-06-01', 18e6, 0], ['Ачааны машин Porter', 2, '2022-09-10', 62e6, 5e6], ['Toyota Land Cruiser', 2, '2024-02-20', 210e6, 30e6], ['Компьютер (8 ширхэг)', 3, '2025-01-12', 24e6, 0], ['Сервер', 3, '2024-11-05', 15e6, 0], ['Принтер, хувилагч', 1, '2023-04-18', 6.5e6, 0], ['Хурлын тавилга', 4, '2021-08-01', 9e6, 0], ['Генератор', 1, '2020-12-01', 28e6, 2e6], ['Касс машин (3)', 1, '2025-07-01', 4.5e6, 0], ['Бухгалтерийн программ', 3, '2026-03-01', 7.2e6, 0], ['Агааржуулагч', 5, '2026-06-15', 5.6e6, 0]];
    const a0 = 6, N = 80, aL = a0 + N - 1;
    for (let i = 0; i < N; i++) {
      const r = a0 + i, s = sample[i];
      A.getCell('A' + r).value = { formula: `IF(B${r}="","",ROW()-${a0 - 1})` }; calcCell(A.getCell('A' + r));
      ['B', 'C', 'D', 'E', 'F'].forEach(c => inputCell(A.getCell(c + r), c === 'D' ? 'yyyy-mm-dd' : ('EF'.includes(c) ? MONEY : null)));
      listValidation(A.getCell('C' + r), catRef);
      if (s) { A.getCell('B' + r).value = s[0]; A.getCell('C' + r).value = cats[s[1]][0]; const [y, m, d] = s[2].split('-').map(Number); A.getCell('D' + r).value = new Date(Date.UTC(y, m - 1, d)); A.getCell('E' + r).value = s[3]; A.getCell('F' + r).value = s[4]; }
      const f = (c, fm, fmt) => { const x = A.getCell(c + r); x.value = { formula: fm }; calcCell(x, fmt); };
      f('G', `IF(B${r}="","",IFERROR(VLOOKUP(C${r},${TS}$A$8:$B$13,2,FALSE),10))`, '0');
      f('H', `IF(OR(B${r}="",E${r}=""),"",(E${r}-N(F${r}))/(G${r}*12))`, MONEY);
      f('I', `IF(D${r}="","",(YEAR(D${r})-1900)*12+MONTH(D${r})+1)`, '0'); A.getCell('I' + r).font = { size: 8, color: { argb: 'FFBBBBBB' } };
      f('J', `IF(H${r}="","",H${r}*MAX(0,MIN(G${r}*12,${TS}$B$5-I${r})))`, MONEY);
      f('K', `IF(H${r}="","",H${r}*MAX(0,MIN(${TS}$B$5+11,I${r}+G${r}*12-1)-MAX(${TS}$B$5,I${r})+1))`, MONEY);
      f('L', `IF(H${r}="","",J${r}+K${r})`, MONEY);
      f('M', `IF(H${r}="","",E${r}-L${r})`, MONEY);
    }
    const at = aL + 1; A.getCell('B' + at).value = 'НИЙТ'; ['E', 'F', 'H', 'J', 'K', 'L', 'M'].forEach(c => { A.getCell(c + at).value = { formula: `SUM(${c}${a0}:${c}${aL})` }; A.getCell(c + at).numFmt = MONEY; }); totalRow(A, at, 1, 13);
    // Сарын хуваарь
    title(MS, 'Сар бүрийн элэгдлийн хуваарь', { formula: '' } && '', 15); MS.getCell('A2').value = { formula: `"Тайлант он: "&${TS}B4` }; MS.getCell('A2').font = { color: { argb: C.grey } };
    header(MS, 4, ['№', 'Хөрөнгө'].concat(MONTHS, ['Нийт']));
    MS.getRow(5).height = 4;
    const HA = S('Хөрөнгө');
    for (let i = 0; i < N; i++) {
      const r = a0 + i;
      MS.getCell('A' + r).value = { formula: `${HA}A${r}` }; MS.getCell('B' + r).value = { formula: `IF(${HA}B${r}="","",${HA}B${r})` };
      for (let k = 0; k < 12; k++) { const c = colL(2 + k); const x = MS.getCell(c + r); x.value = { formula: `IF(${HA}$H${r}="","",IF(AND(${TS}$B$5+${k}>=${HA}$I${r},${TS}$B$5+${k}<=${HA}$I${r}+${HA}$G${r}*12-1),${HA}$H${r},0))` }; x.numFmt = MONEY; }
      MS.getCell('O' + r).value = { formula: `IF(B${r}="","",SUM(C${r}:N${r}))` }; MS.getCell('O' + r).numFmt = MONEY; MS.getCell('O' + r).font = { bold: true };
    }
    MS.getCell('B' + at).value = 'НИЙТ'; for (let k = 0; k <= 12; k++) { const c = colL(2 + k); MS.getCell(c + at).value = { formula: `SUM(${c}${a0}:${c}${aL})` }; MS.getCell(c + at).numFmt = MONEY; } totalRow(MS, at, 1, 15);
    // Ангиллаар
    title(CT, 'Ангиллаар', 'Тайлант оны дүн', 6);
    header(CT, 4, ['Ангилал', 'Анхны өртөг', 'Тайлант оны элэгдэл', 'Хуримтлагдсан', 'Үлдэгдэл өртөг'], 2);
    cats.forEach((c, i) => { const r = 5 + i; CT.getCell('B' + r).value = { formula: `${TS}A${8 + i}` }; CT.getCell('B' + r).border = box; [['C', 'E'], ['D', 'K'], ['E', 'L'], ['F', 'M']].forEach(([cc, src]) => { const x = CT.getCell(cc + r); x.value = { formula: `SUMIF(${HA}$C$${a0}:$C$${aL},$B${r},${HA}$${src}$${a0}:$${src}$${aL})` }; calcCell(x, MONEY); }); });
    CT.getCell('B11').value = 'Нийт'; ['C', 'D', 'E', 'F'].forEach(c => { CT.getCell(c + 11).value = { formula: `SUM(${c}5:${c}10)` }; CT.getCell(c + 11).numFmt = MONEY; }); totalRow(CT, 11, 2, 6);
    return done(wb, JSZip, {
      'Ангиллаар': [{ type: 'col', title: 'Тайлант оны элэгдэл — ангиллаар', cats: { ref: `'Ангиллаар'!$B$5:$B$10`, vals: cats.map(c => c[0]) }, series: [{ name: 'Элэгдэл', ref: `'Ангиллаар'!$D$5:$D$10`, vals: [] }], at: { c1: 1, r1: 12, c2: 6, r2: 30 } }],
      'Сарын хуваарь': [{ type: 'col', title: 'Сар бүрийн элэгдэл', cats: { ref: `'Сарын хуваарь'!$C$4:$N$4`, vals: MONTHS }, series: [{ name: 'Элэгдэл', ref: `'Сарын хуваарь'!$C$${at}:$N$${at}`, vals: [] }], at: { c1: 1, r1: at + 1, c2: 12, r2: at + 19 } }]
    });
  }

  /* ═════════ 5. МӨНГӨН УРСГАЛ ═════════ */
  async function cashflow(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Мөнгөн урсгалын төлөвлөгөө');
    guide(wb, 'Мөнгөн урсгалын төлөвлөгөө', [
      'Эхний сарын мөнгөний үлдэгдлээ «Эхний үлдэгдэл» мөрийн 1-р сард бичнэ. Дараагийн сарууд өмнөх сарын эцсийн үлдэгдлээс автоматаар эхэлнэ.',
      'Сар бүрийн хүлээгдэж буй мөнгөн орлого, зарлагыг шар нүдэнд бичнэ (орлого бүртгэсэн биш, мөнгө орж ирэх, гарах өдрөөр).',
      '«Хамгийн бага байх ёстой үлдэгдэл»-ийг тохируулахад түүнээс доош унах сар улаанаар тодорно — зээл, төлбөрийн хуваариа урьдчилан төлөвлөнө.',
      'Доорх график сар бүрийн орлого, зарлага, үлдэгдлийн чиг хандлагыг харуулна.'
    ]);
    const W = sheet(wb, 'Мөнгөн урсгал', { freeze: 5, xFreeze: 1, widths: [30].concat(Array(12).fill(12.5), [14]), tab: C.gold });
    title(W, 'Мөнгөн урсгалын төлөвлөгөө — 12 сар', '', 14);
    W.getCell('A3').value = 'Он:'; W.getCell('A3').font = { bold: true }; inputCell(W.getCell('B3')); W.getCell('B3').value = 2027;
    header(W, 5, ['₮'].concat(MONTHS, ['Нийт']));
    const R = rng(5);
    const inc = [['Борлуулалтын бэлэн орлого', 38e6, .25], ['Авлагын цуглуулалт', 22e6, .3], ['Зээл, санхүүжилт', 0, 0], ['Бусад орлого', 1.5e6, .5]];
    const out = [['Бараа, түүхий эд', 30e6, .25], ['Цалин', 12e6, .03], ['НДШ, ХХОАТ', 3.1e6, .03], ['Түрээс', 4.5e6, 0], ['Ашиглалтын зардал', 1.8e6, .3], ['Маркетинг', 2e6, .5], ['Зээлийн төлбөр', 3.2e6, 0], ['Татвар (НӨАТ, ААНОАТ)', 2.5e6, .4], ['Хөрөнгө оруулалт', 0, 0], ['Бусад зардал', 1.2e6, .5]];
    const season = [.72, .78, .95, 1, 1.05, 1.1, 1.12, 1.08, 1.02, .98, 1.05, 1.3];
    let r = 6;
    const mcols = MONTHS.map((_, k) => colL(1 + k));
    W.getCell('A' + r).value = 'Эхний үлдэгдэл'; W.getCell('A' + r).font = { bold: true };
    mcols.forEach((c, k) => { const x = W.getCell(c + r); if (k === 0) { x.value = 15e6; inputCell(x, MONEY); } else { x.value = { formula: `${mcols[k - 1]}28` }; calcCell(x, MONEY); } });
    r = 8; W.getCell('A7').value = 'МӨНГӨН ОРЛОГО'; W.getCell('A7').font = { bold: true, color: { argb: C.goldD } };
    const rowsIn = r;
    inc.forEach(([n, b, v], i) => { W.getCell('A' + r).value = n; W.getCell('A' + r).border = box; mcols.forEach((c, k) => { const x = W.getCell(c + r); x.value = i === 2 ? (k === 3 ? 20e6 : 0) : Math.round(b * season[k] * (1 + (R() - .5) * v) / 1e5) * 1e5; inputCell(x, MONEY); }); W.getCell('N' + r).value = { formula: `SUM(B${r}:M${r})` }; calcCell(W.getCell('N' + r), MONEY); r++; });
    const ti = r; W.getCell('A' + r).value = 'Нийт орлого'; mcols.concat(['N']).forEach(c => { W.getCell(c + r).value = { formula: `SUM(${c}${rowsIn}:${c}${r - 1})` }; W.getCell(c + r).numFmt = MONEY; }); totalRow(W, r, 1, 14); r += 2;
    W.getCell('A' + (r - 1)).value = 'МӨНГӨН ЗАРЛАГА'; W.getCell('A' + (r - 1)).font = { bold: true, color: { argb: C.goldD } };
    const rowsOut = r;
    out.forEach(([n, b, v], i) => { W.getCell('A' + r).value = n; W.getCell('A' + r).border = box; mcols.forEach((c, k) => { const x = W.getCell(c + r); x.value = i === 8 ? (k === 5 ? 18e6 : 0) : Math.round(b * (i === 0 ? season[k] : 1) * (1 + (R() - .5) * v) / 1e5) * 1e5; inputCell(x, MONEY); }); W.getCell('N' + r).value = { formula: `SUM(B${r}:M${r})` }; calcCell(W.getCell('N' + r), MONEY); r++; });
    const to = r; W.getCell('A' + r).value = 'Нийт зарлага'; mcols.concat(['N']).forEach(c => { W.getCell(c + r).value = { formula: `SUM(${c}${rowsOut}:${c}${r - 1})` }; W.getCell(c + r).numFmt = MONEY; }); totalRow(W, r, 1, 14); r += 2;
    // r should be 27 → net, 28 → end
    const net = 27, end = 28;
    W.getCell('A' + net).value = 'Цэвэр мөнгөн урсгал'; mcols.concat(['N']).forEach(c => { const x = W.getCell(c + net); x.value = { formula: `${c}${ti}-${c}${to}` }; calcCell(x, MONEY); x.font = { bold: true }; });
    W.getCell('A' + end).value = 'ЭЦСИЙН ҮЛДЭГДЭЛ'; mcols.forEach(c => { W.getCell(c + end).value = { formula: `${c}6+${c}${net}` }; W.getCell(c + end).numFmt = MONEY; }); W.getCell('N' + end).value = { formula: `M${end}` }; W.getCell('N' + end).numFmt = MONEY; totalRow(W, end, 1, 14);
    W.getCell('A30').value = 'Хамгийн бага байх ёстой үлдэгдэл'; W.getCell('A30').font = { bold: true }; inputCell(W.getCell('B30'), MONEY); W.getCell('B30').value = 10e6;
    W.getCell('A31').value = 'Мөнгө дутах сарын тоо'; W.getCell('B31').value = { formula: `COUNTIF(B${end}:M${end},"<"&B30)` }; W.getCell('B31').font = { bold: true, color: { argb: C.red } };
    W.addConditionalFormatting({ ref: `B${end}:M${end}`, rules: [{ type: 'expression', formulae: [`B${end}<$B$30`], style: { font: { color: { argb: 'FFFFFFFF' }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDC2626' } } } }] });
    W.addConditionalFormatting({ ref: `B${net}:N${net}`, rules: [{ type: 'expression', formulae: [`B${net}<0`], style: { font: { color: { argb: C.red } } } }] });
    const ref = row => `'Мөнгөн урсгал'!$B$${row}:$M$${row}`, cref = `'Мөнгөн урсгал'!$B$5:$M$5`;
    return done(wb, JSZip, { 'Мөнгөн урсгал': [
      { type: 'col', title: 'Сар бүрийн мөнгөн орлого ба зарлага', cats: { ref: cref, vals: MONTHS }, series: [{ name: 'Нийт орлого', ref: ref(ti), vals: [], color: '#c9a470' }, { name: 'Нийт зарлага', ref: ref(to), vals: [], color: '#171717' }], at: { c1: 0, r1: 32, c2: 7, r2: 52 } },
      { type: 'line', title: 'Эцсийн үлдэгдэл', cats: { ref: cref, vals: MONTHS }, series: [{ name: 'Үлдэгдэл', ref: ref(end), vals: [], color: '#c9a470' }], at: { c1: 7, r1: 32, c2: 14, r2: 52 } }] });
  }

  /* ═════════ 6. ТӨСӨВ БА ГҮЙЦЭТГЭЛ ═════════ */
  async function budget(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Төсөв ба гүйцэтгэл');
    guide(wb, 'Төсөв ба гүйцэтгэл', [
      '«Төсөв» хуудсанд ангилал бүрийн сар бүрийн төсвийг, «Гүйцэтгэл» хуудсанд бодит дүнг бичнэ. Хоёр хуудасны ангиллын жагсаалт ижил байна (нэрийг «Төсөв» хуудсанд л засна).',
      '«Харьцуулалт» хуудсанд аль сар хүртэлх өссөн дүнгээр харахаа сонгоно (1–12).',
      'Орлогын ангилалд гүйцэтгэл төсвөөс их бол сайн, зардлын ангилалд бага бол сайн — «Төлөв» багана өнгөөр харуулна.'
    ]);
    const B = sheet(wb, 'Харьцуулалт', { widths: [3, 26, 10, 15, 15, 15, 15, 12, 14], tab: C.gold });
    const TB = sheet(wb, 'Төсөв', { freeze: 4, xFreeze: 2, widths: [26, 9].concat(Array(12).fill(12), [14]) });
    const AB = sheet(wb, 'Гүйцэтгэл', { freeze: 4, xFreeze: 2, widths: [26, 9].concat(Array(12).fill(12), [14]) });
    const cats = [['Борлуулалтын орлого', 'Орлого', 52e6], ['Үйлчилгээний орлого', 'Орлого', 9e6], ['Бусад орлого', 'Орлого', 1.2e6], ['Бараа, материал', 'Зардал', 24e6], ['Цалин, НДШ', 'Зардал', 14.5e6], ['Түрээс', 'Зардал', 4.5e6], ['Маркетинг', 'Зардал', 2.5e6], ['Ашиглалт, харилцаа холбоо', 'Зардал', 1.6e6], ['Тээвэр', 'Зардал', 1.9e6], ['Сургалт', 'Зардал', .8e6], ['Бусад зардал', 'Зардал', 1.2e6]];
    const R = rng(21), N = cats.length, r0 = 5, rL = r0 + N - 1;
    const season = [.8, .85, .95, 1, 1.02, 1.05, 1.1, 1.08, 1.02, 1, 1.03, 1.25];
    const fillSheet = (ws, ttl, isBud) => {
      title(ws, ttl, isBud ? 'Сар бүрийн төсөв' : 'Сар бүрийн бодит гүйцэтгэл (дууссан сараа бөглөнө)', 15);
      header(ws, 4, ['Ангилал', 'Төрөл'].concat(MONTHS, ['Жилийн дүн']));
      cats.forEach((c, i) => {
        const r = r0 + i;
        if (isBud) { ws.getCell('A' + r).value = c[0]; inputCell(ws.getCell('A' + r)); ws.getCell('B' + r).value = c[1]; inputCell(ws.getCell('B' + r)); listValidation(ws.getCell('B' + r), ['Орлого', 'Зардал']); }
        else { ws.getCell('A' + r).value = { formula: `'Төсөв'!A${r}` }; ws.getCell('B' + r).value = { formula: `'Төсөв'!B${r}` }; ws.getCell('A' + r).border = box; ws.getCell('B' + r).border = box; }
        for (let k = 0; k < 12; k++) { const x = ws.getCell(colL(2 + k) + r); const bv = c[2] * (c[1] === 'Орлого' || i === 3 ? season[k] : 1); x.value = isBud ? Math.round(bv / 1e5) * 1e5 : (k < 10 ? Math.round(bv * (0.86 + R() * 0.26) / 1e5) * 1e5 : null); inputCell(x, MONEY); }
        ws.getCell('O' + r).value = { formula: `SUM(C${r}:N${r})` }; calcCell(ws.getCell('O' + r), MONEY);
      });
    };
    fillSheet(TB, 'Төсөв', true); fillSheet(AB, 'Гүйцэтгэл', false);
    title(B, 'Төсөв ба гүйцэтгэлийн харьцуулалт', 'Сонгосон сар хүртэлх өссөн дүнгээр', 9);
    B.getCell('B3').value = 'Аль сар хүртэл (1–12):'; B.getCell('B3').font = { bold: true }; const sel = B.getCell('C3'); sel.value = 10; inputCell(sel); sel.font = { bold: true, size: 13 }; sel.alignment = { horizontal: 'center' };
    sel.dataValidation = { type: 'whole', operator: 'between', formulae: [1, 12], showErrorMessage: true };
    header(B, 5, ['Ангилал', 'Төрөл', 'Жилийн төсөв', 'Төсөв (өссөн)', 'Гүйцэтгэл (өссөн)', 'Зөрүү', 'Гүйцэтгэл %', 'Төлөв'], 2);
    cats.forEach((c, i) => {
      const r = 6 + i, sr = r0 + i;
      const f = (col, fm, fmt) => { const x = B.getCell(col + r); x.value = { formula: fm }; calcCell(x, fmt); };
      f('B', `'Төсөв'!A${sr}`); f('C', `'Төсөв'!B${sr}`);
      f('D', `'Төсөв'!O${sr}`, MONEY);
      f('E', `SUM(OFFSET('Төсөв'!$C${sr},0,0,1,$C$3))`, MONEY);
      f('F', `SUM(OFFSET('Гүйцэтгэл'!$C${sr},0,0,1,$C$3))`, MONEY);
      f('G', `F${r}-E${r}`, MONEY);
      f('H', `IFERROR(F${r}/E${r},0)`, PCT);
      f('I', `IF(E${r}=0,"",IF(C${r}="Орлого",IF(F${r}>=E${r},"✓ Давсан","▼ Дутуу"),IF(F${r}<=E${r},"✓ Хэмнэсэн","▲ Хэтэрсэн")))`);
    });
    const e = 6 + N - 1;
    B.addConditionalFormatting({ ref: `I6:I${e}`, rules: [{ type: 'containsText', operator: 'containsText', text: '✓', style: { font: { color: { argb: C.green }, bold: true } } }, { type: 'expression', formulae: [`AND(I6<>"",LEFT(I6,1)<>"✓")`], style: { font: { color: { argb: C.red }, bold: true } } }] });
    const s1 = e + 2;
    [['Нийт орлого', 'Орлого'], ['Нийт зардал', 'Зардал']].forEach(([l, t], i) => { const r = s1 + i; B.getCell('B' + r).value = l; ['D', 'E', 'F', 'G'].forEach(c => { B.getCell(c + r).value = { formula: `SUMIF($C$6:$C$${e},"${t}",${c}$6:${c}$${e})` }; B.getCell(c + r).numFmt = MONEY; }); B.getCell('H' + r).value = { formula: `IFERROR(F${r}/E${r},0)` }; B.getCell('H' + r).numFmt = PCT; totalRow(B, r, 2, 9); });
    const pr = s1 + 2; B.getCell('B' + pr).value = 'Ашиг (орлого − зардал)'; ['D', 'E', 'F', 'G'].forEach(c => { B.getCell(c + pr).value = { formula: `${c}${s1}-${c}${s1 + 1}` }; B.getCell(c + pr).numFmt = MONEY; }); totalRow(B, pr, 2, 9); B.getCell('F' + pr).font = { bold: true, size: 12 };
    return done(wb, JSZip, { 'Харьцуулалт': [{ type: 'bar', title: 'Төсөв ба гүйцэтгэл (өссөн дүн)', cats: { ref: `'Харьцуулалт'!$B$6:$B$${e}`, vals: cats.map(c => c[0]) }, series: [{ name: 'Төсөв', ref: `'Харьцуулалт'!$E$6:$E$${e}`, vals: [], color: '#d6d3d1' }, { name: 'Гүйцэтгэл', ref: `'Харьцуулалт'!$F$6:$F$${e}`, vals: [], color: '#c9a470' }], at: { c1: 1, r1: pr + 1, c2: 9, r2: pr + 26 } }] });
  }

  /* ═════════ 7. АГУУЛАХ ═════════ */
  async function inventory(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Агуулахын бүртгэл');
    guide(wb, 'Агуулахын бүртгэл', [
      '«Бараа» хуудсанд барааны код, нэр, нэгж, нэгж өртөг, эхний үлдэгдэл, дахин захиалах цэгийг бичнэ.',
      '«Хөдөлгөөн» хуудсанд орлого, зарлага бүрийг огноо, код, төрөл (Орлого / Зарлага), тоогоор бичнэ. Код бичихэд барааны нэр автоматаар гарна.',
      '«Үлдэгдэл» хуудас бараа тус бүрийн орлого, зарлага, үлдэгдэл, үнэлгээг бодож, дахин захиалах цэгт хүрсэн барааг улаанаар тэмдэглэнэ.'
    ]);
    const L = sheet(wb, 'Үлдэгдэл', { freeze: 4, widths: [10, 28, 8, 12, 12, 12, 12, 14, 14, 14], tab: C.gold });
    const P = sheet(wb, 'Бараа', { freeze: 4, widths: [10, 28, 8, 18, 13, 13, 13] });
    const M = sheet(wb, 'Хөдөлгөөн', { freeze: 4, widths: [12, 10, 28, 11, 10, 30] });
    const items = [['A001', 'Ундны ус 0.5л', 'ш', 'Ундаа', 450, 1200, 300], ['A002', 'Жүүс 1л', 'ш', 'Ундаа', 2600, 400, 120], ['A003', 'Сүү 1л', 'ш', 'Сүүн бүтээгдэхүүн', 2900, 350, 150], ['A004', 'Тараг 0.5л', 'ш', 'Сүүн бүтээгдэхүүн', 1800, 200, 100], ['B001', 'Гурил 25кг', 'шуудай', 'Хүнсний бараа', 52000, 40, 15], ['B002', 'Будаа 5кг', 'уут', 'Хүнсний бараа', 14500, 90, 30], ['B003', 'Элсэн чихэр 1кг', 'ш', 'Хүнсний бараа', 3800, 260, 80], ['B004', 'Ургамлын тос 1л', 'ш', 'Хүнсний бараа', 7900, 120, 50], ['C001', 'Угаалгын нунтаг 3кг', 'ш', 'Ахуйн бараа', 21000, 45, 20], ['C002', 'Шампунь 400мл', 'ш', 'Ахуйн бараа', 9800, 70, 90], ['C003', 'Цаасан алчуур', 'багц', 'Ахуйн бараа', 6500, 110, 40], ['C004', 'Савангийн шингэн', 'ш', 'Ахуйн бараа', 4200, 95, 150]];
    const p0 = 5, NP = 200, pL = p0 + NP - 1, NI = items.length;
    title(P, 'Барааны жагсаалт', 'Код давхардахгүй байх ёстой', 7);
    header(P, 4, ['Код', 'Барааны нэр', 'Нэгж', 'Ангилал', 'Нэгж өртөг', 'Эхний үлдэгдэл', 'Дахин захиалах цэг']);
    for (let i = 0; i < NP; i++) { const r = p0 + i, it = items[i]; ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((c, j) => { const x = P.getCell(c + r); inputCell(x, j >= 4 ? MONEY : null); if (it) x.value = it[j]; }); }
    const R = rng(33), mv = [];
    for (let d = 0; d < 120; d++) { const it = items[Math.floor(R() * NI)], inn = R() < 0.35; mv.push([new Date(Date.UTC(2026, 6, 1) + Math.floor(R() * 120) * 864e5), it[0], inn ? 'Орлого' : 'Зарлага', Math.max(1, Math.round(it[5] * (inn ? 0.5 + R() * 0.6 : 0.05 + R() * 0.18))), inn ? 'Нийлүүлэгчээс' : 'Борлуулалт']); }
    mv.sort((a, b) => a[0] - b[0]);
    title(M, 'Орлого, зарлагын хөдөлгөөн', 'Мөр бүр нэг гүйлгээ', 6);
    header(M, 4, ['Огноо', 'Код', 'Барааны нэр', 'Төрөл', 'Тоо', 'Тайлбар']);
    const m0 = 5, NM = 2000, mL = m0 + NM - 1, PB = S('Бараа');
    for (let i = 0; i < NM; i++) {
      const r = m0 + i, x = mv[i];
      ['A', 'B', 'D', 'E', 'F'].forEach(c => inputCell(M.getCell(c + r), c === 'A' ? 'yyyy-mm-dd' : (c === 'E' ? '#,##0' : null)));
      listValidation(M.getCell('D' + r), ['Орлого', 'Зарлага']);
      if (i < 400) { M.getCell('C' + r).value = { formula: `IF(B${r}="","",IFERROR(INDEX(${PB}$B$${p0}:$B$${pL},MATCH(B${r},${PB}$A$${p0}:$A$${pL},0)),"⚠ код олдсонгүй"))` }; M.getCell('C' + r).border = box; }
      if (x) { M.getCell('A' + r).value = x[0]; M.getCell('B' + r).value = x[1]; M.getCell('D' + r).value = x[2]; M.getCell('E' + r).value = x[3]; M.getCell('F' + r).value = x[4]; }
    }
    title(L, 'Барааны үлдэгдэл', 'Хөдөлгөөнөөс автоматаар', 10);
    header(L, 4, ['Код', 'Барааны нэр', 'Нэгж', 'Эхний', 'Орлого', 'Зарлага', 'Үлдэгдэл', 'Нэгж өртөг', 'Үнэлгээ', 'Төлөв']);
    const MB = S('Хөдөлгөөн'), mr = c => `${MB}$${c}$${m0}:$${c}$${mL}`;
    const NL = 120;
    for (let i = 0; i < NL; i++) {
      const r = 5 + i, pr = p0 + i;
      const f = (c, fm, fmt) => { const x = L.getCell(c + r); x.value = { formula: fm }; calcCell(x, fmt); };
      f('A', `IF(${PB}A${pr}="","",${PB}A${pr})`); f('B', `IF(A${r}="","",${PB}B${pr})`); f('C', `IF(A${r}="","",${PB}C${pr})`);
      f('D', `IF(A${r}="","",N(${PB}F${pr}))`, MONEY);
      f('E', `IF(A${r}="","",SUMIFS(${mr('E')},${mr('B')},A${r},${mr('D')},"Орлого"))`, MONEY);
      f('F', `IF(A${r}="","",SUMIFS(${mr('E')},${mr('B')},A${r},${mr('D')},"Зарлага"))`, MONEY);
      f('G', `IF(A${r}="","",D${r}+E${r}-F${r})`, MONEY);
      f('H', `IF(A${r}="","",N(${PB}E${pr}))`, MONEY);
      f('I', `IF(A${r}="","",G${r}*H${r})`, MONEY);
      f('J', `IF(A${r}="","",IF(G${r}<=N(${PB}G${pr}),"Захиалах","Хэвийн"))`);
    }
    const lt = 5 + NL; L.getCell('B' + lt).value = 'НИЙТ'; L.getCell('I' + lt).value = { formula: `SUM(I5:I${lt - 1})` }; L.getCell('I' + lt).numFmt = MONEY; L.getCell('J' + lt).value = { formula: `COUNTIF(J5:J${lt - 1},"Захиалах")&" бараа захиалах"` }; totalRow(L, lt, 1, 10);
    L.addConditionalFormatting({ ref: `A5:J${lt - 1}`, rules: [{ type: 'expression', formulae: ['$J5="Захиалах"'], style: { font: { color: { argb: C.red }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDECEC' } } } }] });
    return done(wb, JSZip, { 'Үлдэгдэл': [{ type: 'bar', title: 'Барааны үлдэгдлийн үнэлгээ', cats: { ref: `'Үлдэгдэл'!$B$5:$B$${4 + NI}`, vals: items.map(x => x[1]) }, series: [{ name: 'Үнэлгээ', ref: `'Үлдэгдэл'!$I$5:$I$${4 + NI}`, vals: [] }], at: { c1: 11, r1: 3, c2: 19, r2: 24 } }] });
  }

  /* ═════════ 8. БОРЛУУЛАЛТЫН ДАШБООРД ═════════ */
  async function sales(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Борлуулалтын дашбоард');
    guide(wb, 'Борлуулалтын дашбоард', [
      '«Өгөгдөл» хуудсанд борлуулалтаа мөр мөрөөр хуулж буулгана: огноо, салбар, бүтээгдэхүүн, борлуулагч, тоо, дүн. Касс, ERP-ээс Excel-ээр гаргаад шууд хуулж болно (5,000 мөр хүртэл).',
      '«Дашбоард» хуудсанд оноо сонгоход KPI, сар, салбар, бүтээгдэхүүн, борлуулагчийн хүснэгт, график шинэчлэгдэнэ.',
      'Салбар, бүтээгдэхүүн, борлуулагчийн нэрсийг дашбоардын хүснэгтийн шар нүдэнд өөрийнхөөрөө солино — өгөгдөл дэх нэртэй яг ижил байх ёстой.'
    ]);
    const D = sheet(wb, 'Дашбоард', { widths: [3, 24, 15, 3, 24, 15, 3, 24, 15, 3], tab: C.gold });
    const O = sheet(wb, 'Өгөгдөл', { freeze: 1, widths: [12, 18, 18, 18, 9, 14] });
    const br = ['Төв салбар', 'Зайсан', 'Хан-Уул', 'Баянзүрх', 'Дархан'], pr = ['Кофе', 'Цай', 'Бялуу', 'Сэндвич', 'Жүүс', 'Салат'], sp = ['Анар', 'Билгүүн', 'Номин', 'Тэмүүлэн', 'Хулан', 'Мандах'];
    const prc = { 'Кофе': 7500, 'Цай': 5500, 'Бялуу': 9800, 'Сэндвич': 12500, 'Жүүс': 8900, 'Салат': 14500 };
    header(O, 1, ['Огноо', 'Салбар', 'Бүтээгдэхүүн', 'Борлуулагч', 'Тоо', 'Дүн']);
    const R = rng(8), rows = [];
    for (let i = 0; i < 1500; i++) { const d = new Date(Date.UTC(2026, 0, 1) + Math.floor(R() * 304) * 864e5); const b = br[Math.min(4, Math.floor(Math.pow(R(), 1.4) * 5))], p = pr[Math.floor(R() * 6)], q = 1 + Math.floor(R() * 6); rows.push([d, b, p, sp[Math.floor(R() * 6)], q, Math.round(q * prc[p] * (0.95 + R() * 0.1) / 100) * 100]); }
    rows.sort((a, b) => a[0] - b[0]);
    rows.forEach((x, i) => { const r = 2 + i; x.forEach((v, j) => { const c = O.getRow(r).getCell(j + 1); c.value = v; if (j === 0) c.numFmt = 'yyyy-mm-dd'; if (j === 5) c.numFmt = MONEY; }); });
    O.autoFilter = 'A1:F1';
    const E = 5001, rg = c => `'Өгөгдөл'!$${c}$2:$${c}$${E}`, Y = `(YEAR(${rg('A')})=$C$3)`;
    title(D, 'Борлуулалтын дашбоард', '«Өгөгдөл» хуудаснаас автоматаар', 9);
    D.getCell('B3').value = 'Он:'; D.getCell('B3').font = { bold: true }; D.getCell('B3').alignment = { horizontal: 'right' }; const yc = D.getCell('C3'); yc.value = 2026; inputCell(yc); yc.font = { bold: true, size: 13 };
    kpi(D, 5, 2, 'Нийт борлуулалт', `SUMPRODUCT(${Y}*N(+${rg('F')}))`);
    kpi(D, 5, 5, 'Гүйлгээний тоо', `SUMPRODUCT(${Y}*(${rg('F')}<>""))`, '#,##0');
    kpi(D, 5, 8, 'Дундаж гүйлгээ', `IFERROR(B6/E6,0)`);
    // Сар
    header(D, 8, ['Сар', 'Борлуулалт'], 2);
    MONTHS.forEach((m, k) => { const r = 9 + k; D.getCell('B' + r).value = m; D.getCell('B' + r).border = box; const x = D.getCell('C' + r); x.value = { formula: `SUMPRODUCT(${Y}*(MONTH(${rg('A')})=${k + 1})*N(+${rg('F')}))` }; calcCell(x, MONEY); });
    const tbl = (col, start, label, names, src) => {
      header(D, start, [label, 'Борлуулалт'], col);
      const L1 = colL(col - 1), L2 = colL(col);
      names.forEach((n, i) => { const r = start + 1 + i; const a = D.getCell(L1 + r); a.value = n; inputCell(a); const x = D.getCell(L2 + r); x.value = { formula: `SUMPRODUCT(${Y}*(${rg(src)}=${L1}${r})*N(+${rg('F')}))` }; calcCell(x, MONEY); });
      return [start + 1, start + names.length];
    };
    const [b1, b2] = tbl(5, 8, 'Салбар', br, 'B');
    const [p1, p2] = tbl(8, 8, 'Бүтээгдэхүүн', pr, 'C');
    const [s1, s2] = tbl(5, 16, 'Борлуулагч', sp, 'D');
    D.getCell('H16').value = 'Шилдэг салбар:'; D.getCell('I16').value = { formula: `INDEX(E${b1}:E${b2},MATCH(MAX(F${b1}:F${b2}),F${b1}:F${b2},0))` }; D.getCell('I16').font = { bold: true };
    D.getCell('H17').value = 'Шилдэг бүтээгдэхүүн:'; D.getCell('I17').value = { formula: `INDEX(H${p1}:H${p2},MATCH(MAX(I${p1}:I${p2}),I${p1}:I${p2},0))` }; D.getCell('I17').font = { bold: true };
    D.getCell('H18').value = 'Шилдэг сар:'; D.getCell('I18').value = { formula: `INDEX(B9:B20,MATCH(MAX(C9:C20),C9:C20,0))` }; D.getCell('I18').font = { bold: true };
    const DS = `'Дашбоард'!`;
    return done(wb, JSZip, { 'Дашбоард': [
      { type: 'line', title: 'Сар бүрийн борлуулалт', cats: { ref: `${DS}$B$9:$B$20`, vals: MONTHS }, series: [{ name: 'Борлуулалт', ref: `${DS}$C$9:$C$20`, vals: [] }], at: { c1: 1, r1: 23, c2: 9, r2: 41 } },
      { type: 'bar', title: 'Салбараар', cats: { ref: `${DS}$E$${b1}:$E$${b2}`, vals: br }, series: [{ name: 'Борлуулалт', ref: `${DS}$F$${b1}:$F$${b2}`, vals: [] }], at: { c1: 1, r1: 42, c2: 5, r2: 60 } },
      { type: 'doughnut', title: 'Бүтээгдэхүүний эзлэх хувь', cats: { ref: `${DS}$H$${p1}:$H$${p2}`, vals: pr }, series: [{ name: 'Борлуулалт', ref: `${DS}$I$${p1}:$I$${p2}`, vals: [] }], at: { c1: 5, r1: 42, c2: 9, r2: 60 } },
      { type: 'col', title: 'Борлуулагчаар', cats: { ref: `${DS}$E$${s1}:$E$${s2}`, vals: sp }, series: [{ name: 'Борлуулалт', ref: `${DS}$F$${s1}:$F$${s2}`, vals: [], color: '#171717' }], at: { c1: 1, r1: 61, c2: 9, r2: 78 } }] });
  }

  /* ═════════ 9. ТЭЗҮ ═════════ */
  async function feasibility(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'ТЭЗҮ — 5 жилийн санхүүгийн загвар');
    guide(wb, 'ТЭЗҮ — 5 жилийн санхүүгийн загвар', [
      '«Таамаглал» хуудсанд хөрөнгө оруулалт, санхүүжилт (өөрийн хөрөнгө, зээл), 1-р жилийн борлуулалт, өсөлт, өртгийн хувь, тогтмол зардлаа бичнэ. Бусад бүх хуудас үүнээс бодогдоно.',
      '«Төсөөлөл» — 5 жилийн орлого, зардал, ашиг. «Зээл» — тэнцүү төлбөртэй (аннуитет) эргэн төлөлтийн хуваарь.',
      '«Мөнгөн урсгал» — төслийн чөлөөт мөнгөн урсгал, хуримтлагдсан урсгал.',
      '«Үр ашиг» — NPV, IRR, өгөөжийн хугацаа, хугарлын цэг, зээл төлөх чадвар (DSCR). Банкны зээлийн хүсэлт, хөрөнгө оруулагчийн танилцуулгад шууд ашиглана.'
    ], ['Таамаглалын тоо бодитой байх тусам үр дүн найдвартай. Борлуулалтын таамаглалыг зах зээлийн судалгаа, ижил төстэй бизнесийн тоогоор батална уу.', 'Татварыг ААНОАТ-ын 10%-иар энгийнээр тооцсон.']);
    const A = sheet(wb, 'Таамаглал', { widths: [3, 40, 18, 40], tab: C.gold });
    const P = sheet(wb, 'Төсөөлөл', { widths: [3, 36, 15, 15, 15, 15, 15] });
    const F = sheet(wb, 'Мөнгөн урсгал', { widths: [3, 36, 15, 15, 15, 15, 15, 15] });
    const L = sheet(wb, 'Зээл', { widths: [3, 10, 16, 16, 16, 16, 16] });
    const U = sheet(wb, 'Үр ашиг', { widths: [3, 36, 18, 44], tab: C.gold });
    title(A, 'Таамаглал', 'Шар нүдийг өөрийн төслөөр бөглөнө', 4);
    const inp = (r, label, v, fmt, nt) => { A.getCell('B' + r).value = label; A.getCell('B' + r).border = box; const x = A.getCell('C' + r); x.value = v; inputCell(x, fmt || MONEY); if (nt) { A.getCell('D' + r).value = nt; A.getCell('D' + r).font = { size: 9, color: { argb: C.grey } }; } };
    const calc = (r, label, f, fmt, bold) => { A.getCell('B' + r).value = label; const x = A.getCell('C' + r); x.value = { formula: f }; calcCell(x, fmt || MONEY); if (bold) totalRow(A, r, 2, 3); };
    A.getCell('B4').value = 'Төслийн нэр'; A.mergeCells('C4:D4'); inputCell(A.getCell('C4')); A.getCell('C4').value = 'Кофе шоп — Хан-Уул дүүрэг';
    header(A, 6, ['Хөрөнгө оруулалт', '₮', 'Тайлбар'], 2);
    inp(7, 'Байрны засвар, тохижилт', 45e6, MONEY, 'Элэгдүүлнэ'); inp(8, 'Тоног төхөөрөмж', 68e6, MONEY, 'Элэгдүүлнэ'); inp(9, 'Тавилга', 18e6, MONEY, 'Элэгдүүлнэ'); inp(10, 'Анхны бараа материал', 8e6); inp(11, 'Зөвшөөрөл, бүртгэл, бусад', 3e6); inp(12, 'Эргэлтийн хөрөнгө (нөөц мөнгө)', 15e6);
    calc(13, 'Нийт хөрөнгө оруулалт', 'SUM(C7:C12)', MONEY, true);
    header(A, 15, ['Санхүүжилт', '', ''], 2);
    inp(16, 'Өөрийн хөрөнгийн хувь', 0.4, PCT); calc(17, 'Өөрийн хөрөнгө', 'C13*C16'); calc(18, 'Зээл', 'C13-C17'); inp(19, 'Зээлийн жилийн хүү', 0.18, PCT); inp(20, 'Зээлийн хугацаа (жил, 1–5)', 4, '0');
    header(A, 22, ['Борлуулалт, зардал', '', ''], 2);
    inp(23, '1-р жилийн борлуулалт', 420e6); inp(24, 'Борлуулалтын жилийн өсөлт', 0.12, PCT); inp(25, 'Борлуулалтын өртөг (борлуулалтын %)', 0.38, PCT, 'Түүхий эд, бараа');
    inp(26, 'Цалин, НДШ (жил)', 96e6); inp(27, 'Түрээс (жил)', 54e6); inp(28, 'Ашиглалт, харилцаа холбоо (жил)', 14e6); inp(29, 'Маркетинг (жил)', 12e6); inp(30, 'Бусад тогтмол зардал (жил)', 10e6);
    calc(31, 'Нийт тогтмол зардал (1-р жил)', 'SUM(C26:C30)', MONEY, true); inp(32, 'Тогтмол зардлын жилийн өсөлт', 0.07, PCT);
    header(A, 34, ['Бусад', '', ''], 2);
    inp(35, 'Элэгдүүлэх хугацаа (жил)', 5, '0'); inp(36, 'Орлогын албан татвар', 0.10, PCT); inp(37, 'Хөнгөлөлтийн хувь (NPV)', 0.15, PCT, 'Хүлээж буй өгөөж / капиталын өртөг');
    const AS = S('Таамаглал');
    // Зээл
    title(L, 'Зээлийн эргэн төлөлт', 'Тэнцүү төлбөртэй (аннуитет), жилээр', 7);
    header(L, 4, ['Жил', 'Эхний үлдэгдэл', 'Хүү', 'Үндсэн төлбөр', 'Нийт төлбөр', 'Эцсийн үлдэгдэл'], 2);
    for (let y = 1; y <= 5; y++) { const r = 4 + y; L.getCell('B' + r).value = y; L.getCell('B' + r).border = box;
      const f = (c, fm) => { const x = L.getCell(c + r); x.value = { formula: fm }; calcCell(x, MONEY); };
      f('C', y === 1 ? `${AS}C18` : `G${r - 1}`); f('F', `IF(B${r}>${AS}$C$20,0,PMT(${AS}$C$19,${AS}$C$20,-${AS}$C$18))`); f('D', `C${r}*${AS}$C$19`); f('E', `IF(F${r}=0,0,F${r}-D${r})`); f('G', `MAX(0,C${r}-E${r})`); L.getCell('D' + r).value = { formula: `IF(B${r}>${AS}$C$20,0,C${r}*${AS}$C$19)` }; }
    L.getCell('B10').value = 'Нийт'; ['D', 'E', 'F'].forEach(c => { L.getCell(c + 10).value = { formula: `SUM(${c}5:${c}9)` }; L.getCell(c + 10).numFmt = MONEY; }); totalRow(L, 10, 2, 7);
    // Төсөөлөл
    title(P, 'Орлого, зардлын төсөөлөл', '5 жил', 7);
    header(P, 4, ['₮', '1-р жил', '2-р жил', '3-р жил', '4-р жил', '5-р жил'], 2);
    const yc = ['C', 'D', 'E', 'F', 'G'];
    const LN = [['Борлуулалтын орлого', y => `${AS}$C$23*(1+${AS}$C$24)^${y}`], ['Борлуулалтын өртөг', (y, c) => `${c}5*${AS}$C$25`], ['НИЙТ АШИГ', (y, c) => `${c}5-${c}6`, 1], ['Тогтмол зардал', y => `${AS}$C$31*(1+${AS}$C$32)^${y}`], ['Элэгдэл', y => `IF(${y + 1}<=${AS}$C$35,SUM(${AS}$C$7:$C$9)/${AS}$C$35,0)`], ['ҮНДСЭН ҮЙЛ АЖИЛЛАГААНЫ АШИГ (EBIT)', (y, c) => `${c}7-${c}8-${c}9`, 1], ['Зээлийн хүү', (y, c) => `'Зээл'!D${5 + y}`], ['ТАТВАРЫН ӨМНӨХ АШИГ', (y, c) => `${c}10-${c}11`, 1], ['Орлогын албан татвар', (y, c) => `MAX(0,${c}12*${AS}$C$36)`], ['ЦЭВЭР АШИГ', (y, c) => `${c}12-${c}13`, 1], ['Цэвэр ашгийн хувь', (y, c) => `IFERROR(${c}14/${c}5,0)`, 0, PCT]];
    LN.forEach(([l, fn, bold, fmt], i) => { const r = 5 + i; P.getCell('B' + r).value = l; P.getCell('B' + r).border = box; yc.forEach((c, y) => { const x = P.getCell(c + r); x.value = { formula: fn(y, c) }; calcCell(x, fmt || MONEY); }); if (bold) totalRow(P, r, 2, 7); });
    const PS = S('Төсөөлөл');
    // Мөнгөн урсгал
    title(F, 'Мөнгөн урсгал', 'Төслийн чөлөөт мөнгөн урсгал (зээлээс үл хамааран)', 8);
    header(F, 4, ['₮', '0-р жил', '1-р жил', '2-р жил', '3-р жил', '4-р жил', '5-р жил'], 2);
    const fc = ['C', 'D', 'E', 'F', 'G', 'H'];
    const FL = [['Хөрөнгө оруулалт', i => i === 0 ? `-${AS}C13` : '0'], ['EBIT × (1 − татвар)', i => i === 0 ? '0' : `${PS}${yc[i - 1]}10*(1-${AS}$C$36)`], ['Элэгдэл (буцааж нэмнэ)', i => i === 0 ? '0' : `${PS}${yc[i - 1]}9`], ['Эргэлтийн хөрөнгийн буцаалт', i => i === 5 ? `${AS}C12+${AS}C10` : '0'], ['ЧӨЛӨӨТ МӨНГӨН УРСГАЛ', i => `SUM(${fc[i]}5:${fc[i]}8)`, 1], ['Хуримтлагдсан урсгал', i => i === 0 ? 'C9' : `${fc[i - 1]}10+${fc[i]}9`, 1], ['Өгөөжийн тусламж', i => i === 0 ? '""' : `IF(AND(${fc[i - 1]}10<0,${fc[i]}10>=0),${i - 1}+(-${fc[i - 1]}10)/${fc[i]}9,"")`]];
    FL.forEach(([l, fn, bold], i) => { const r = 5 + i; F.getCell('B' + r).value = l; F.getCell('B' + r).border = box; fc.forEach((c, k) => { const x = F.getCell(c + r); x.value = { formula: fn(k) }; calcCell(x, i === 6 ? '0.0' : MONEY); }); if (bold) totalRow(F, r, 2, 8); });
    F.getRow(11).hidden = false; F.getCell('B11').font = { size: 9, color: { argb: C.grey } };
    F.getCell('B13').value = 'Өөрийн хөрөнгийн мөнгөн урсгал'; F.getCell('B13').font = { bold: true, color: { argb: C.goldD } };
    const EL = [['Цэвэр ашиг + элэгдэл', i => i === 0 ? `-${AS}C17` : `${PS}${yc[i - 1]}14+${PS}${yc[i - 1]}9`], ['Зээлийн үндсэн төлбөр', i => i === 0 ? '0' : `-'Зээл'!E${4 + i}`], ['Эзэмшигчид үлдэх мөнгө', i => `${fc[i]}14+${fc[i]}15`, 1]];
    EL.forEach(([l, fn, bold], i) => { const r = 14 + i; F.getCell('B' + r).value = l; F.getCell('B' + r).border = box; fc.forEach((c, k) => { const x = F.getCell(c + r); x.value = { formula: fn(k) }; calcCell(x, MONEY); }); if (bold) totalRow(F, r, 2, 8); });
    const FS = S('Мөнгөн урсгал');
    // Үр ашиг
    title(U, 'Үр ашгийн үзүүлэлт', { formula: '' } && '', 4); U.getCell('A2').value = { formula: `${AS}C4` }; U.getCell('A2').font = { color: { argb: C.grey } };
    header(U, 4, ['Үзүүлэлт', 'Утга', 'Тайлбар'], 2);
    const UR = [['Цэвэр өнөөгийн үнэ цэнэ (NPV)', `NPV(${AS}C37,${FS}D9:H9)+${FS}C9`, MONEY, '0-ээс их бол төсөл хүлээж буй өгөөжөөс илүү ашигтай'],
      ['Дотоод өгөөжийн хувь (IRR)', `IFERROR(IRR(${FS}C9:H9),0)`, PCT, 'Хөнгөлөлтийн хувиас өндөр байх ёстой'],
      ['Өгөөжийн хугацаа (жил)', `IF(COUNT(${FS}D11:H11)=0,"5-аас дээш",SUM(${FS}D11:H11))`, '0.0', 'Хөрөнгө оруулалтаа нөхөх хугацаа'],
      ['Хугарлын цэгийн борлуулалт (1-р жил)', `(${PS}C8+${PS}C9)/(1-${AS}C25)`, MONEY, 'Ашиг = 0 байх жилийн борлуулалт'],
      ['Хугарлын цэг — сард', `C8/12`, MONEY, ''],
      ['Хугарлын цэг / таамагласан борлуулалт', `IFERROR(C8/${PS}C5,0)`, PCT, '100%-иас бага бол 1-р жилдээ ашигтай'],
      ['Зээл төлөх чадвар (DSCR, 1-р жил)', `IFERROR((${PS}C10+${PS}C9)/'Зээл'!F5,0)`, '0.00', '1.25-аас их бол банк ихэвчлэн хүлээн авна'],
      ['5 жилийн нийт цэвэр ашиг', `SUM(${PS}C14:G14)`, MONEY, '']];
    UR.forEach((x, i) => { const r = 5 + i; U.getCell('B' + r).value = x[0]; U.getCell('B' + r).border = box; const v = U.getCell('C' + r); v.value = { formula: x[1] }; calcCell(v, x[2]); v.font = { bold: true, size: 12 }; U.getCell('D' + r).value = x[3]; U.getCell('D' + r).font = { size: 9, color: { argb: C.grey } }; });
    U.addConditionalFormatting({ ref: 'C5', rules: [{ type: 'expression', formulae: ['C5<0'], style: { font: { color: { argb: C.red }, bold: true } } }, { type: 'expression', formulae: ['C5>=0'], style: { font: { color: { argb: C.green }, bold: true } } }] });
    const yrs = ['1-р жил', '2-р жил', '3-р жил', '4-р жил', '5-р жил'];
    return done(wb, JSZip, { 'Үр ашиг': [
      { type: 'col', title: 'Борлуулалт ба цэвэр ашиг', cats: { ref: `'Төсөөлөл'!$C$4:$G$4`, vals: yrs }, series: [{ name: 'Борлуулалт', ref: `'Төсөөлөл'!$C$5:$G$5`, vals: [], color: '#c9a470' }, { name: 'Цэвэр ашиг', ref: `'Төсөөлөл'!$C$14:$G$14`, vals: [], color: '#171717' }], at: { c1: 1, r1: 14, c2: 3, r2: 32 } },
      { type: 'line', title: 'Хуримтлагдсан мөнгөн урсгал', cats: { ref: `'Мөнгөн урсгал'!$C$4:$H$4`, vals: ['0-р жил'].concat(yrs) }, series: [{ name: 'Хуримтлагдсан', ref: `'Мөнгөн урсгал'!$C$10:$H$10`, vals: [], color: '#c9a470' }], at: { c1: 3, r1: 14, c2: 4, r2: 32 } }] });
  }

  /* ═════════ 10. АВЛАГЫН НАСЖИЛТ ═════════ */
  async function aging(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Авлагын насжилт');
    guide(wb, 'Авлагын насжилт', [
      '«Тохиргоо» хуудсанд тайлангийн огноог бичнэ (өнөөдрөөр бол =TODAY() гэж бичнэ).',
      '«Нэхэмжлэх» хуудсанд нэхэмжлэх бүрийн харилцагч, дугаар, огноо, төлөх хоног, дүн, төлсөн дүнг бичнэ. Үлдэгдэл, хэтэрсэн хоног, насжилтын бүлэг автоматаар.',
      '«Насжилт» хуудсанд харилцагч бүрийн авлагыг хугацаандаа / 1–30 / 31–60 / 61–90 / 90+ хоногоор харуулна. Харилцагчийн нэрийг шар нүдэнд бичнэ (нэхэмжлэхийнхтэй яг ижил).'
    ], ['90 хоногоос дээш хэтэрсэн авлагад эргэлзээтэй авлагын сан байгуулах эсэхийг бүртгэлийн бодлогоороо шийднэ.']);
    const G = sheet(wb, 'Насжилт', { widths: [3, 28, 15, 15, 15, 15, 15, 16, 10], tab: C.gold });
    const I = sheet(wb, 'Нэхэмжлэх', { freeze: 4, widths: [26, 13, 12, 9, 12, 14, 14, 14, 10, 14] });
    const T = sheet(wb, 'Тохиргоо', { widths: [30, 16, 40], tab: C.grey });
    title(T, 'Тохиргоо', '', 3); T.getCell('A4').value = 'Тайлангийн огноо'; inputCell(T.getCell('B4'), 'yyyy-mm-dd'); T.getCell('B4').value = new Date(Date.UTC(2026, 10, 5)); T.getCell('C4').value = '=TODAY() гэж бичвэл өдөр бүр шинэчлэгдэнэ'; T.getCell('C4').font = { size: 9, color: { argb: C.grey } };
    const RD = `'Тохиргоо'!$B$4`;
    const cust = ['Номин Холдинг ХХК', 'Тэсо Корпораци ХХК', 'Говь ХК', 'Мон Лаа ХХК', 'Хүнс Трейд ХХК', 'Эрдэнэт Сервис ХХК', 'Сүү ХК', 'Таван Богд ХХК'];
    title(I, 'Нэхэмжлэхийн бүртгэл', 'Шар нүдийг бөглөнө', 10);
    header(I, 4, ['Харилцагч', 'Нэхэмжлэх №', 'Огноо', 'Төлөх хоног', 'Төлөх огноо', 'Дүн', 'Төлсөн', 'Үлдэгдэл', 'Хэтэрсэн хоног', 'Бүлэг']);
    const R = rng(44), inv = [];
    for (let i = 0; i < 70; i++) { const d = new Date(Date.UTC(2026, 5, 1) + Math.floor(R() * 155) * 864e5); const amt = Math.round((300000 + R() * 8e6) / 1000) * 1000; const p = R(); inv.push([cust[Math.floor(R() * cust.length)], 'INV-' + (2600 + i), d, [15, 30, 30, 45][Math.floor(R() * 4)], amt, p < 0.45 ? amt : (p < 0.6 ? Math.round(amt * 0.5 / 1000) * 1000 : 0)]); }
    inv.sort((a, b) => a[2] - b[2]);
    const i0 = 5, NI = 1000, iL = i0 + NI - 1;
    for (let k = 0; k < NI; k++) {
      const r = i0 + k, x = inv[k];
      ['A', 'B', 'C', 'D', 'F', 'G'].forEach(c => inputCell(I.getCell(c + r), c === 'C' ? 'yyyy-mm-dd' : ('FG'.includes(c) ? MONEY : null)));
      if (x) { I.getCell('A' + r).value = x[0]; I.getCell('B' + r).value = x[1]; I.getCell('C' + r).value = x[2]; I.getCell('D' + r).value = x[3]; I.getCell('F' + r).value = x[4]; I.getCell('G' + r).value = x[5] || null; }
      if (k < 300) {
        const f = (c, fm, fmt) => { const y = I.getCell(c + r); y.value = { formula: fm }; calcCell(y, fmt); };
        f('E', `IF(C${r}="","",C${r}+N(D${r}))`, 'yyyy-mm-dd');
        f('H', `IF(F${r}="","",F${r}-N(G${r}))`, MONEY);
        f('I', `IF(OR(H${r}="",N(H${r})<=0),"",MAX(0,${RD}-E${r}))`, '0');
        f('J', `IF(H${r}="","",IF(H${r}<=0,"Төлөгдсөн",IF(I${r}=0,"Хугацаандаа",IF(I${r}<=30,"1–30",IF(I${r}<=60,"31–60",IF(I${r}<=90,"61–90","90+"))))))`);
      }
    }
    I.addConditionalFormatting({ ref: `J${i0}:J${i0 + 299}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"90+"'], style: { font: { color: { argb: C.red }, bold: true } } }, { type: 'cellIs', operator: 'equal', formulae: ['"61–90"'], style: { font: { color: { argb: 'FFB45309' }, bold: true } } }, { type: 'cellIs', operator: 'equal', formulae: ['"Төлөгдсөн"'], style: { font: { color: { argb: C.grey } } } }] });
    title(G, 'Авлагын насжилтын тайлан', '', 9); G.getCell('A2').value = { formula: `"Тайлангийн огноо: "&TEXT(${RD},"yyyy-mm-dd")` }; G.getCell('A2').font = { color: { argb: C.grey } };
    const BK = ['Хугацаандаа', '1–30', '31–60', '61–90', '90+'];
    header(G, 4, ['Харилцагч'].concat(BK.map(b => b === 'Хугацаандаа' ? b : b + ' хоног'), ['Нийт авлага', '90+ %']), 2);
    const rr = c => `'Нэхэмжлэх'!$${c}$${i0}:$${c}$${i0 + 299}`;
    const NC = 20;
    for (let k = 0; k < NC; k++) {
      const r = 5 + k; const a = G.getCell('B' + r); a.value = cust[k] || null; inputCell(a);
      BK.forEach((b, j) => { const c = colL(2 + j); const x = G.getCell(c + r); x.value = { formula: `IF($B${r}="","",SUMIFS(${rr('H')},${rr('A')},$B${r},${rr('J')},"${b}"))` }; calcCell(x, MONEY); });
      G.getCell('H' + r).value = { formula: `IF($B${r}="","",SUM(C${r}:G${r}))` }; calcCell(G.getCell('H' + r), MONEY); G.getCell('H' + r).font = { bold: true };
      G.getCell('I' + r).value = { formula: `IF(N(H${r})=0,"",G${r}/H${r})` }; calcCell(G.getCell('I' + r), PCT);
    }
    const gt = 5 + NC; G.getCell('B' + gt).value = 'НИЙТ'; ['C', 'D', 'E', 'F', 'G', 'H'].forEach(c => { G.getCell(c + gt).value = { formula: `SUM(${c}5:${c}${gt - 1})` }; G.getCell(c + gt).numFmt = MONEY; }); G.getCell('I' + gt).value = { formula: `IFERROR(G${gt}/H${gt},0)` }; G.getCell('I' + gt).numFmt = PCT; totalRow(G, gt, 2, 9);
    G.getCell('B' + (gt + 1)).value = 'Эзлэх хувь'; ['C', 'D', 'E', 'F', 'G'].forEach(c => { G.getCell(c + (gt + 1)).value = { formula: `IFERROR(${c}${gt}/$H$${gt},0)` }; G.getCell(c + (gt + 1)).numFmt = PCT; G.getCell(c + (gt + 1)).font = { color: { argb: C.grey } }; });
    G.addConditionalFormatting({ ref: `I5:I${gt - 1}`, rules: [{ type: 'expression', formulae: ['AND(I5<>"",I5>0.3)'], style: { font: { color: { argb: C.red }, bold: true } } }] });
    G.getRow(4).height = 30;
    return done(wb, JSZip, { 'Насжилт': [
      { type: 'doughnut', title: 'Авлагын насжилтын бүтэц', cats: { ref: `'Насжилт'!$C$4:$G$4`, vals: BK }, series: [{ name: 'Авлага', ref: `'Насжилт'!$C$${gt}:$G$${gt}`, vals: [] }], at: { c1: 1, r1: gt + 2, c2: 5, r2: gt + 20 } },
      { type: 'bar', title: 'Харилцагч бүрийн нийт авлага', cats: { ref: `'Насжилт'!$B$5:$B$${4 + cust.length}`, vals: cust }, series: [{ name: 'Нийт', ref: `'Насжилт'!$H$5:$H$${4 + cust.length}`, vals: [] }], at: { c1: 5, r1: gt + 2, c2: 9, r2: gt + 20 } }] });
  }

  const payslip = (E, Z) => payroll(E, Z, true);
  const BUILD = { payroll, payslip, vat, fs, depr, cashflow, budget, inventory, sales, feasibility, aging };
  async function build(id, libs) { const f = BUILD[id]; if (!f) throw new Error('Загвар олдсонгүй: ' + id); return f(libs.ExcelJS, libs.JSZip); }
  function register(id, fn) { BUILD[id] = fn; }
  // ZIP-д хамт орох нэмэлт файл (url — сайтаас татна)
  const EXTRAS = {
    payslip: [
      { name: 'TsalinMail.bas', url: 'tpl/TsalinMail.bas' },
      { name: 'Унших — макро суулгах.txt', text: 'Цалингийн задаргаа мэйлдэх загвар — BusinessBI.mn\r\n\r\n1. «Цалингийн задаргаа мэйлдэх.xlsx» файлыг Excel-ээр (Windows) нээнэ.\r\n2. Alt+F11 дарж VBA цонхыг нээнэ → File → Import File… → TsalinMail.bas сонгоно.\r\n3. VBA цонхыг хаагаад File → Save As → «Excel Macro-Enabled Workbook (*.xlsm)» хэлбэрээр хадгална.\r\n4. «Тохиргоо» хуудсын «Мэйл тохиргоо» хэсгийг бөглөнө (Outlook эсвэл Gmail).\r\n5. Alt+F8 → TsSendTest → зөвхөн тест хаяг руу нэг мэйл очно. Шалгаад зөв бол Alt+F8 → TsSendAll.\r\n\r\nTsSavePdf — мэйл илгээлгүйгээр бүх ажилтны цалингийн хуудсыг PDF-ээр хадгална.\r\nGmail: Google бүртгэл → Security → 2-Step Verification → App passwords хэсгээс 16 тэмдэгттэй нууц үг үүсгэнэ.\r\nАсуулт: hello@businessbi.mn\r\n' }
    ]
  };
  const api = { LIST, BUNDLE, EXTRAS, build, register, _k: K, _done: done };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BBITpl = api;
})(typeof self !== 'undefined' ? self : this);
