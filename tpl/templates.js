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
    { id: 'aging', name: 'Авлагын насжилт', price: 19000, cat: 'НББ', short: 'Нэхэмжлэх бүрийн хугацаа хэтрэлт, харилцагчаар 0–30 / 31–60 / 61–90 / 90+ хоног.', sheets: ['Нэхэмжлэх', 'Насжилт', 'Тохиргоо'] },
    { id: 'loan', name: 'Зээлийн тооцоолуур', price: 15000, cat: 'Санхүү', short: 'Тэнцүү нийт / тэнцүү үндсэн төлбөрийн хуваарь, нийт хүү, шимтгэл орсон бодит хүү, хоёр аргын харьцуулалт.', sheets: ['Тооцоолуур', 'Хуваарь', 'Харьцуулалт'] },
    { id: 'homebudget', name: 'Өрхийн төсөв', price: 15000, cat: 'Хувийн санхүү', short: 'Сар бүрийн орлого, зарлагыг ангиллаар — төсөв ба бодит, хадгаламжийн хувь, график.', sheets: ['Тойм', 'Гүйлгээ', 'Ангилал'] },
    { id: 'attendance', name: 'Ирц, цагийн бүртгэл', price: 19000, cat: 'Цалин, ХН', short: 'Сарын ирцийн хүснэгт: ажилласан өдөр, цаг, илүү цаг, чөлөө, өвчтэй, тасалсан — цалинд шууд.', sheets: ['Ирц', 'Тохиргоо'] },
    { id: 'cashbook', name: 'Касс, харилцахын дэвтэр', price: 19000, cat: 'НББ', short: 'Касс, олон банкны дансны гүйлгээ, мөр бүрийн үлдэгдэл, хугацааны тайлан, ангиллаар зарлага.', sheets: ['Тайлан', 'Гүйлгээ', 'Тохиргоо'] },
    { id: 'costing', name: 'Өртөг ба үнэ тогтоох', price: 19000, cat: 'Үйл ажиллагаа', short: 'Түүхий эд, орц (жор), нэгжийн өртөг, зорилтот ашгаар санал болгох үнэ, бодит маржин.', sheets: ['Бүтээгдэхүүн', 'Орц', 'Түүхий эд'] },
    { id: 'crm', name: 'Борлуулалтын CRM', price: 19000, cat: 'Борлуулалт', short: 'Харилцагч, боломж, үе шат, магадлал, жигнэсэн таамаг, хугацаа хэтэрсэн алхам, самбар.', sheets: ['Самбар', 'Боломж', 'Харилцагч', 'Тохиргоо'] },
    { id: 'gantt', name: 'Төслийн төлөвлөгөө (Gantt)', price: 19000, cat: 'Үйл ажиллагаа', short: 'Ажил, хариуцагч, хугацаа, гүйцэтгэл — 26 долоо хоногийн Gantt график автоматаар будагдана.', sheets: ['Төлөвлөгөө'] },
    { id: 'kpi', name: 'Ажилтны KPI үнэлгээ', price: 19000, cat: 'Цалин, ХН', short: 'Жигнэсэн KPI оноо, A–D ангилал, урамшууллын дүн, хэвлэх үнэлгээний хуудас.', sheets: ['Үнэлгээ', 'Хуудас', 'Тохиргоо'] },
    { id: 'quote', name: 'Үнийн санал, нэхэмжлэх', price: 15000, cat: 'Борлуулалт', short: 'Үнийн жагсаалтаас код сонгоод үнийн санал, нэхэмжлэх (НӨАТ-тай) — A4-т хэвлэхэд бэлэн.', sheets: ['Үнийн санал', 'Нэхэмжлэх', 'Тохиргоо'] },
    { id: 'cit', name: 'ААНОАТ тооцоолуур', price: 25000, cat: 'Татвар', short: 'Улирлын өссөн дүнгээр ААНОАТ, 90% хөнгөлөлт, хялбаршуулсан 1%-ийн горимтой харьцуулалт.', sheets: ['Тооцоо', 'Тохиргоо'] },
  ];
  const BUNDLE = { id: 'all', name: 'Бүх 21 загвар — багц', price: 199000 };

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
      const dt = (sh) => `${sh}$A$5:$A$${e},">="&DATE($B$3,${i + 1},1),${sh}$A$5:$A$${e},"<"&DATE($B$3,${i + 2},1)`;
      const set = (c, f) => { const x = M.getCell(c + r); x.value = { formula: f }; calcCell(x, MONEY); };
      set('B', `SUMIFS(${SB}$F$5:$F$${e},${dt(SB)})`);
      set('C', `SUMIFS(${SB}$G$5:$G$${e},${dt(SB)})`);
      set('D', `SUMIFS(${PB}$G$5:$G$${e},${dt(PB)},${PB}$H$5:$H$${e},"<>Үгүй")`);
      set('E', i === 0 ? '0' : `G${r - 1}`);
      set('F', `MAX(0,C${r}-D${r}-E${r})`);
      set('G', `MAX(0,D${r}+E${r}-C${r})`);
      M.getCell('F' + r).font = { bold: true };
    });
    M.getCell('A18').value = 'Нийт'; ['B', 'C', 'D', 'F'].forEach(c => { M.getCell(c + 18).value = { formula: `SUM(${c}6:${c}17)` }; M.getCell(c + 18).numFmt = MONEY; }); totalRow(M, 18, 1, 7);
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
    const E = 5001, rg = c => `'Өгөгдөл'!$${c}$2:$${c}$${E}`, YR = `${rg('A')},">="&DATE($C$3,1,1),${rg('A')},"<"&DATE($C$3+1,1,1)`;
    title(D, 'Борлуулалтын дашбоард', '«Өгөгдөл» хуудаснаас автоматаар', 9);
    D.getCell('B3').value = 'Он:'; D.getCell('B3').font = { bold: true }; D.getCell('B3').alignment = { horizontal: 'right' }; const yc = D.getCell('C3'); yc.value = 2026; inputCell(yc); yc.font = { bold: true, size: 13 };
    kpi(D, 5, 2, 'Нийт борлуулалт', `SUMIFS(${rg('F')},${YR})`);
    kpi(D, 5, 5, 'Гүйлгээний тоо', `COUNTIFS(${YR},${rg('F')},"<>")`, '#,##0');
    kpi(D, 5, 8, 'Дундаж гүйлгээ', `IFERROR(B6/E6,0)`);
    // Сар
    header(D, 8, ['Сар', 'Борлуулалт'], 2);
    MONTHS.forEach((m, k) => { const r = 9 + k; D.getCell('B' + r).value = m; D.getCell('B' + r).border = box; const x = D.getCell('C' + r); x.value = { formula: `SUMIFS(${rg('F')},${rg('A')},">="&DATE($C$3,${k + 1},1),${rg('A')},"<"&DATE($C$3,${k + 2},1))` }; calcCell(x, MONEY); });
    const tbl = (col, start, label, names, src) => {
      header(D, start, [label, 'Борлуулалт'], col);
      const L1 = colL(col - 1), L2 = colL(col);
      names.forEach((n, i) => { const r = start + 1 + i; const a = D.getCell(L1 + r); a.value = n; inputCell(a); const x = D.getCell(L2 + r); x.value = { formula: `SUMIFS(${rg('F')},${YR},${rg(src)},${L1}${r})` }; calcCell(x, MONEY); });
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

  /* ═════════ 12. ЗЭЭЛ ═════════ */
  async function loan(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Зээлийн тооцоолуур');
    guide(wb, 'Зээлийн тооцоолуур', [
      '«Тооцоолуур» хуудсанд зээлийн дүн, жилийн хүү, хугацаа (сар), эхлэх огноо, төлбөрийн төрлөө сонгоно.',
      '«Тэнцүү нийт төлбөр» — сар бүр ижил дүн (аннуитет). «Тэнцүү үндсэн төлбөр» — үндсэн төлбөр тогтмол, хүү буурах тул эхний саруудад их төлнө.',
      'Нэг удаагийн шимтгэлийг (%) оруулбал шимтгэл орсон бодит жилийн хүү гарна.',
      '«Хуваарь» хуудсанд сар бүрийн хүү, үндсэн төлбөр, үлдэгдэл; «Харьцуулалт» хуудсанд хоёр аргыг зэрэгцүүлж харуулна.'
    ], ['Банкны бодит хуваарь нь хоногийн тоогоор (актуал/365) бодогдож бага зэрэг зөрж болно. Энэ загвар сар бүрийг 1/12 гэж тооцно.']);
    const T = sheet(wb, 'Тооцоолуур', { widths: [3, 34, 20, 4, 30, 18], tab: C.gold });
    const H = sheet(wb, 'Хуваарь', { freeze: 4, widths: [6, 12, 16, 14, 16, 16, 16] });
    const Cm = sheet(wb, 'Харьцуулалт', { widths: [3, 34, 20, 20] });
    title(T, 'Зээлийн тооцоолуур', 'Шар нүдийг бөглөнө', 6);
    const inp = (r, l, v, fmt, list) => { T.getCell('B' + r).value = l; T.getCell('B' + r).border = box; const x = T.getCell('C' + r); x.value = v; inputCell(x, fmt); if (list) listValidation(x, list); };
    inp(5, 'Зээлийн дүн', 120e6, MONEY); inp(6, 'Жилийн хүү', 0.168, PCT); inp(7, 'Хугацаа (сар, 360 хүртэл)', 60, '0'); inp(8, 'Эхний төлбөрийн огноо', new Date(Date.UTC(2026, 11, 15)), 'yyyy-mm-dd'); inp(9, 'Төлбөрийн төрөл', 'Тэнцүү нийт төлбөр', null, ['Тэнцүү нийт төлбөр', 'Тэнцүү үндсэн төлбөр']); inp(10, 'Нэг удаагийн шимтгэл', 0.01, PCT);
    T.getCell('C8').value = new Date(Date.UTC(2026, 11, 15));
    const N = 360, h0 = 5, hL = h0 + N - 1, TS = S('Тооцоолуур');
    title(H, 'Эргэн төлөлтийн хуваарь', '', 7);
    header(H, 4, ['№', 'Огноо', 'Эхний үлдэгдэл', 'Хүү', 'Үндсэн төлбөр', 'Нийт төлбөр', 'Эцсийн үлдэгдэл']);
    for (let i = 0; i < N; i++) {
      const r = h0 + i, n = i + 1, on = `${n}<=${TS}$C$7`;
      const f = (c, fm, fmt) => { const x = H.getCell(c + r); x.value = { formula: fm }; calcCell(x, fmt); };
      f('A', `IF(${on},${n},"")`, '0');
      f('B', `IF(${on},EDATE(${TS}$C$8,${i}),"")`, 'yyyy-mm-dd');
      f('C', i === 0 ? `IF(${on},${TS}$C$5,"")` : `IF(${on},G${r - 1},"")`, MONEY);
      f('D', `IF(${on},C${r}*${TS}$C$6/12,"")`, MONEY);
      f('E', `IF(${on},IF(${TS}$C$9="Тэнцүү нийт төлбөр",PMT(${TS}$C$6/12,${TS}$C$7,-${TS}$C$5)-D${r},${TS}$C$5/${TS}$C$7),"")`, MONEY);
      f('F', `IF(${on},D${r}+E${r},"")`, MONEY);
      f('G', `IF(${on},MAX(0,C${r}-E${r}),"")`, MONEY);
    }
    const HS = S('Хуваарь');
    header(T, 12, ['Үр дүн', 'Дүн'], 2);
    const res = [['Эхний сарын төлбөр', `${HS}F5`, MONEY], ['Сүүлийн сарын төлбөр', `INDEX(${HS}F5:F${hL},C7)`, MONEY], ['Нийт хүүгийн төлбөр', `SUM(${HS}D5:D${hL})`, MONEY], ['Шимтгэл', `C5*C10`, MONEY], ['Нийт төлөх дүн (шимтгэл орсон)', `SUM(${HS}F5:F${hL})+C16`, MONEY], ['Бодит жилийн хүү (шимтгэл орсон)', `IFERROR((1+RATE(C7,-PMT(C6/12,C7,-C5),C5-C16))^12-1,"")`, PCT], ['Сүүлийн төлбөрийн огноо', `EDATE(C8,C7-1)`, 'yyyy-mm-dd']];
    res.forEach((x, i) => { const r = 13 + i; T.getCell('B' + r).value = x[0]; T.getCell('B' + r).border = box; const v = T.getCell('C' + r); v.value = { formula: x[1] }; calcCell(v, x[2]); v.font = { bold: true, size: i === 0 ? 14 : 11 }; });
    note(T, 'B21', 'Бодит хүүг тэнцүү нийт төлбөрийн аргаар тооцсон.', 'B21:C21');
    header(T, 23, ['Бүтэц', 'Дүн'], 2); T.getCell('B24').value = 'Үндсэн зээл'; T.getCell('C24').value = { formula: 'C5' }; T.getCell('B25').value = 'Хүү'; T.getCell('C25').value = { formula: 'C15' }; T.getCell('B26').value = 'Шимтгэл'; T.getCell('C26').value = { formula: 'C16' }; ['C24', 'C25', 'C26'].forEach(a => calcCell(T.getCell(a), MONEY));
    title(Cm, 'Хоёр аргын харьцуулалт', 'Ижил дүн, хүү, хугацаагаар', 4);
    header(Cm, 4, ['', 'Тэнцүү нийт төлбөр', 'Тэнцүү үндсэн төлбөр'], 2);
    const P = `${TS}$C$5`, rr = `${TS}$C$6/12`, nn = `${TS}$C$7`;
    const cmp = [['Эхний сарын төлбөр', `PMT(${rr},${nn},-${P})`, `${P}/${nn}+${P}*${rr}`], ['Сүүлийн сарын төлбөр', `PMT(${rr},${nn},-${P})`, `${P}/${nn}*(1+${rr})`], ['Нийт хүү', `PMT(${rr},${nn},-${P})*${nn}-${P}`, `${P}*${rr}*(${nn}+1)/2`], ['Нийт төлөх', `PMT(${rr},${nn},-${P})*${nn}`, `${P}+${P}*${rr}*(${nn}+1)/2`]];
    cmp.forEach((x, i) => { const r = 5 + i; Cm.getCell('B' + r).value = x[0]; Cm.getCell('B' + r).border = box; ['C', 'D'].forEach((c, k) => { const v = Cm.getCell(c + r); v.value = { formula: x[1 + k] }; calcCell(v, MONEY); }); });
    Cm.getCell('B10').value = 'Хүүгийн хэмнэлт (үндсэн төлбөрийн арга)'; Cm.getCell('C10').value = { formula: 'C7-D7' }; Cm.getCell('C10').numFmt = MONEY; Cm.getCell('C10').font = { bold: true, color: { argb: C.green } };
    return done(wb, JSZip, { 'Тооцоолуур': [{ type: 'doughnut', title: 'Нийт төлөх дүнгийн бүтэц', cats: { ref: `'Тооцоолуур'!$B$24:$B$26`, vals: ['Үндсэн зээл', 'Хүү', 'Шимтгэл'] }, series: [{ name: 'Дүн', ref: `'Тооцоолуур'!$C$24:$C$26`, vals: [] }], at: { c1: 4, r1: 3, c2: 6, r2: 21 } }],
      'Харьцуулалт': [{ type: 'col', title: 'Аргуудын харьцуулалт', cats: { ref: `'Харьцуулалт'!$B$5:$B$8`, vals: cmp.map(c => c[0]) }, series: [{ name: 'Тэнцүү нийт', ref: `'Харьцуулалт'!$C$5:$C$8`, vals: [], color: '#c9a470' }, { name: 'Тэнцүү үндсэн', ref: `'Харьцуулалт'!$D$5:$D$8`, vals: [], color: '#171717' }], at: { c1: 1, r1: 11, c2: 4, r2: 29 } }] });
  }

  /* ═════════ 13. ӨРХИЙН ТӨСӨВ ═════════ */
  async function homebudget(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Өрхийн төсөв');
    guide(wb, 'Өрхийн төсөв', [
      '«Ангилал» хуудсанд орлого, зарлагын ангилал бүрийн сарын төсвөө бичнэ.',
      '«Гүйлгээ» хуудсанд өдөр бүрийн орлого, зарлагаа огноо, ангилал, дүнгээр бичнэ (ангиллыг жагсаалтаас сонгоно).',
      '«Тойм» хуудсанд сар сонгоход төсөв ба бодит зарлага, үлдэгдэл, хадгаламжийн хувь, график гарна.'
    ]);
    const O = sheet(wb, 'Тойм', { widths: [3, 26, 15, 15, 15, 12, 3], tab: C.gold });
    const G = sheet(wb, 'Гүйлгээ', { freeze: 4, widths: [12, 24, 30, 14, 10] });
    const K = sheet(wb, 'Ангилал', { widths: [26, 10, 16] });
    const cats = [['Цалин', 'Орлого', 4.2e6], ['Нэмэлт орлого', 'Орлого', 0.6e6], ['Хүнс', 'Зарлага', 1.2e6], ['Орон сууц, ипотек', 'Зарлага', 0.95e6], ['Ашиглалт, интернэт', 'Зарлага', 0.25e6], ['Тээвэр, шатахуун', 'Зарлага', 0.35e6], ['Хүүхэд, сургууль', 'Зарлага', 0.4e6], ['Эрүүл мэнд', 'Зарлага', 0.12e6], ['Зээлийн төлбөр', 'Зарлага', 0.5e6], ['Хувцас', 'Зарлага', 0.2e6], ['Зугаа, кафе', 'Зарлага', 0.25e6], ['Бусад', 'Зарлага', 0.15e6], ['Хадгаламж', 'Хадгаламж', 0.5e6]];
    title(K, 'Ангилал, сарын төсөв', '', 3); header(K, 4, ['Ангилал', 'Төрөл', 'Сарын төсөв']);
    for (let i = 0; i < 25; i++) { const r = 5 + i, c = cats[i]; ['A', 'B', 'C'].forEach((col, j) => { const x = K.getCell(col + r); inputCell(x, j === 2 ? MONEY : null); if (c) x.value = c[j]; }); listValidation(K.getCell('B' + r), ['Орлого', 'Зарлага', 'Хадгаламж']); }
    const KS = S('Ангилал'), catRef = `${KS}$A$5:$A$29`;
    title(G, 'Гүйлгээ', 'Өдөр бүрийн орлого, зарлага', 5); header(G, 4, ['Огноо', 'Ангилал', 'Тайлбар', 'Дүн', 'Төрөл']);
    const R = rng(9), tx = [];
    for (let m = 6; m <= 10; m++) cats.forEach(c => { const n = c[1] === 'Зарлага' ? 3 + Math.floor(R() * 4) : 1; for (let k = 0; k < n; k++) tx.push([new Date(Date.UTC(2026, m - 1, 1 + Math.floor(R() * 27))), c[0], '', Math.round(c[2] / n * (0.75 + R() * 0.5) / 1000) * 1000]); });
    tx.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < 1500; i++) { const r = 5 + i, x = tx[i]; ['A', 'B', 'C', 'D'].forEach((c, j) => { const y = G.getCell(c + r); inputCell(y, j === 0 ? 'yyyy-mm-dd' : (j === 3 ? MONEY : null)); if (x) y.value = x[j] || null; }); listValidation(G.getCell('B' + r), catRef); if (i < 600) { G.getCell('E' + r).value = { formula: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},${KS}$A$5:$B$29,2,FALSE),""))` }; G.getCell('E' + r).font = { size: 9, color: { argb: C.grey } }; } }
    title(O, 'Өрхийн төсвийн тойм', '', 6);
    O.getCell('B3').value = 'Сар (огноо):'; O.getCell('B3').font = { bold: true }; const sm = O.getCell('C3'); sm.value = new Date(Date.UTC(2026, 9, 1)); inputCell(sm, 'yyyy-mm'); sm.font = { bold: true, size: 13 };
    header(O, 5, ['Ангилал', 'Төсөв', 'Бодит', 'Зөрүү', 'Гүйцэтгэл'], 2);
    const GS = S('Гүйлгээ'), gr = c => `${GS}$${c}$5:$${c}$1504`;
    for (let i = 0; i < cats.length; i++) {
      const r = 6 + i, kr = 5 + i;
      const f = (c, fm, fmt) => { const x = O.getCell(c + r); x.value = { formula: fm }; calcCell(x, fmt); };
      f('B', `${KS}A${kr}`); f('C', `N(${KS}C${kr})`, MONEY);
      f('D', `SUMIFS(${gr('D')},${gr('B')},B${r},${gr('A')},">="&DATE(YEAR($C$3),MONTH($C$3),1),${gr('A')},"<"&EDATE(DATE(YEAR($C$3),MONTH($C$3),1),1))`, MONEY);
      f('E', `D${r}-C${r}`, MONEY); f('F', `IFERROR(D${r}/C${r},0)`, PCT);
    }
    const e = 5 + cats.length, s1 = e + 2;
    const typ = t => `SUMIF(${KS}$B$5:$B$29,"${t}",`;
    [['Нийт орлого', 'Орлого'], ['Нийт зарлага', 'Зарлага'], ['Хадгаламж', 'Хадгаламж']].forEach(([l, t], i) => { const r = s1 + i; O.getCell('B' + r).value = l; O.getCell('C' + r).value = { formula: `SUMIF(${KS}$B$5:$B$29,"${t}",${KS}$C$5:$C$29)` }; O.getCell('D' + r).value = { formula: `SUMPRODUCT((${KS}$B$5:$B$${4 + cats.length}="${t}")*D$6:D$${e})` }; ['C', 'D'].forEach(c => O.getCell(c + r).numFmt = MONEY); totalRow(O, r, 2, 6); });
    const lr = s1 + 3; O.getCell('B' + lr).value = 'Үлдэгдэл (орлого − зарлага − хадгаламж)'; O.getCell('D' + lr).value = { formula: `D${s1}-D${s1 + 1}-D${s1 + 2}` }; O.getCell('D' + lr).numFmt = MONEY; O.getCell('D' + lr).font = { bold: true, size: 13 };
    O.getCell('B' + (lr + 1)).value = 'Хадгаламжийн хувь'; O.getCell('D' + (lr + 1)).value = { formula: `IFERROR(D${s1 + 2}/D${s1},0)` }; O.getCell('D' + (lr + 1)).numFmt = PCT; O.getCell('D' + (lr + 1)).font = { bold: true };
    O.addConditionalFormatting({ ref: `E6:E${e}`, rules: [{ type: 'expression', formulae: [`AND(E6>0,VLOOKUP($B6,${KS}$A$5:$B$29,2,FALSE)="Зарлага")`], style: { font: { color: { argb: C.red }, bold: true } } }] });
    return done(wb, JSZip, { 'Тойм': [{ type: 'bar', title: 'Төсөв ба бодит — ангиллаар', cats: { ref: `'Тойм'!$B$6:$B$${e}`, vals: cats.map(c => c[0]) }, series: [{ name: 'Төсөв', ref: `'Тойм'!$C$6:$C$${e}`, vals: [], color: '#d6d3d1' }, { name: 'Бодит', ref: `'Тойм'!$D$6:$D$${e}`, vals: [], color: '#c9a470' }], at: { c1: 7, r1: 3, c2: 15, r2: 28 } }] });
  }

  /* ═════════ 14. ИРЦ ═════════ */
  async function attendance(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Ирц, цагийн бүртгэл');
    guide(wb, 'Ирц, цагийн бүртгэл', [
      '«Ирц» хуудсанд он, сараа бичихэд тухайн сарын өдрүүд гарч, амралтын өдрүүд саарал болно.',
      'Өдөр бүрт ажилласан цагийг тоогоор (ж: 8) эсвэл үсгэн кодоор бичнэ: Ч — чөлөө, Ө — өвчтэй, Т — тасалсан, А — ээлжийн амралт, Т/Б — томилолт.',
      'Баруун талд ажилласан өдөр, нийт цаг, илүү цаг (өдрийн нормоос дээш), код тус бүрийн тоо автоматаар бодогдоно. «Ажилласан өдөр»-ийг цалингийн загварт шууд хуулна.'
    ]);
    const A = sheet(wb, 'Ирц', { freeze: 6, xFreeze: 2, widths: [5, 24].concat(Array(31).fill(4.2), [9, 9, 9, 6, 6, 6, 6, 6]), zoom: 85, tab: C.gold });
    const T = sheet(wb, 'Тохиргоо', { widths: [30, 12, 40], tab: C.grey });
    title(T, 'Тохиргоо', '', 3); T.getCell('A4').value = 'Өдрийн ажлын цагийн норм'; inputCell(T.getCell('B4')); T.getCell('B4').value = 8;
    A.mergeCells('A1:AH1'); A.getCell('A1').value = 'Ирц, цагийн бүртгэл'; A.getCell('A1').font = { bold: true, size: 18 }; A.getRow(1).height = 30;
    A.getCell('A3').value = 'Он:'; inputCell(A.getCell('B3')); A.getCell('B3').value = 2026; A.getCell('C3').value = 'Сар:'; A.mergeCells('C3:D3'); inputCell(A.getCell('E3')); A.getCell('E3').value = 10; A.mergeCells('E3:F3');
    ['A3', 'C3'].forEach(a => A.getCell(a).font = { bold: true });
    header(A, 5, ['№', 'Ажилтан']); A.mergeCells('A5:A6'); A.mergeCells('B5:B6');
    for (let d = 1; d <= 31; d++) {
      const c = colL(1 + d);
      const h = A.getCell(c + 5); h.value = { formula: `IF(MONTH(DATE($B$3,$E$3,${d}))=$E$3,${d},"")` }; h.font = { bold: true, color: { argb: C.white }, size: 9 }; h.fill = fill(C.head); h.alignment = { horizontal: 'center' };
      const w = A.getCell(c + 6); w.value = { formula: `IF(${c}5="","",MID("ДаМяЛхПүБаБяНя",(WEEKDAY(DATE($B$3,$E$3,${d}),2)-1)*2+1,2))` }; w.font = { size: 8, color: { argb: C.grey } }; w.alignment = { horizontal: 'center' };
    }
    const sumH = ['Ажилласан өдөр', 'Нийт цаг', 'Илүү цаг', 'Ч', 'Ө', 'Т', 'А', 'Т/Б'];
    sumH.forEach((t, i) => { const c = A.getCell(colL(33 + i) + 5); c.value = t; c.font = { bold: true, color: { argb: C.white }, size: 9 }; c.fill = fill(C.goldD); c.alignment = { horizontal: 'center', wrapText: true }; A.mergeCells(`${colL(33 + i)}5:${colL(33 + i)}6`); });
    A.getRow(5).height = 30;
    const names = ['Бат-Эрдэнэ Г.', 'Сарангэрэл Т.', 'Энхжаргал Ц.', 'Мөнх-Очир Т.', 'Оюунчимэг Н.', 'Ганзориг Б.', 'Нарантуяа С.', 'Төмөрбаатар А.', 'Цолмон Х.', 'Даваадорж М.', 'Солонго А.', 'Пүрэвсүрэн Т.'];
    const R = rng(4), r0 = 7, N = 40, last = colL(32);
    for (let i = 0; i < N; i++) {
      const r = r0 + i; A.getCell('A' + r).value = i < names.length ? i + 1 : null; A.getCell('A' + r).border = box;
      const nm = A.getCell('B' + r); inputCell(nm); if (names[i]) nm.value = names[i];
      for (let d = 1; d <= 31; d++) {
        const c = A.getCell(colL(1 + d) + r); c.border = box; c.alignment = { horizontal: 'center' }; c.font = { size: 9 };
        if (names[i]) { const wd = new Date(Date.UTC(2026, 9, d)).getUTCDay(); if (wd !== 0 && wd !== 6) { const x = R(); c.value = x < 0.03 ? 'Ө' : x < 0.06 ? 'Ч' : x < 0.075 ? 'Т' : (i === 4 && d >= 13 && d <= 17) ? 'А' : (x > 0.93 ? 10 : 8); } }
      }
      if (i < 25) {
        const rg = `C${r}:${last}${r}`;
        const f = (k, fm, fmt) => { const x = A.getCell(colL(33 + k) + r); x.value = { formula: `IF($B${r}="","",${fm})` }; calcCell(x, fmt || '0'); x.alignment = { horizontal: 'center' }; };
        f(0, `COUNTIF(${rg},">0")`); f(1, `SUM(${rg})`); f(2, `SUMIF(${rg},">"&'Тохиргоо'!$B$4)-'Тохиргоо'!$B$4*COUNTIF(${rg},">"&'Тохиргоо'!$B$4)`);
        ['Ч', 'Ө', 'Т', 'А', 'Т/Б'].forEach((k, j) => f(3 + j, `COUNTIF(${rg},"${k}")`));
        A.getCell(colL(33) + r).font = { bold: true };
      }
    }
    A.addConditionalFormatting({ ref: `C5:${last}${r0 + N - 1}`, rules: [{ type: 'expression', formulae: [`AND(C$5<>"",WEEKDAY(DATE($B$3,$E$3,C$5),2)>5)`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE5E7EB' } } } }, { type: 'containsText', operator: 'containsText', text: 'Т', style: { font: { color: { argb: C.red }, bold: true } } }, { type: 'expression', formulae: ['OR(C5="Ө",C5="Ч",C5="А")'], style: { font: { color: { argb: 'FFB45309' }, bold: true } } }] });
    note(A, 'B' + (r0 + N + 1), 'Код: тоо = ажилласан цаг · Ч чөлөө · Ө өвчтэй · Т тасалсан · А ээлжийн амралт · Т/Б томилолт', `B${r0 + N + 1}:Z${r0 + N + 1}`);
    return done(wb, JSZip, { 'Ирц': [{ type: 'bar', title: 'Ажилласан өдөр — ажилтнаар', cats: { ref: `'Ирц'!$B$${r0}:$B$${r0 + names.length - 1}`, vals: names }, series: [{ name: 'Өдөр', ref: `'Ирц'!$AG$${r0}:$AG$${r0 + names.length - 1}`, vals: [] }], at: { c1: 1, r1: r0 + N + 3, c2: 20, r2: r0 + N + 24 } }] });
  }

  /* ═════════ 15. КАСС, ХАРИЛЦАХЫН ДЭВТЭР ═════════ */
  async function cashbook(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Касс, харилцахын дэвтэр');
    guide(wb, 'Касс, харилцахын дэвтэр', [
      '«Тохиргоо» хуудсанд касс, банкны данс бүрийн нэр, эхний үлдэгдэл, мөн орлого зарлагын ангиллаа бичнэ.',
      '«Гүйлгээ» хуудсанд гүйлгээ бүрийг огноо, данс, харилцагч, утга, ангилал, орлого эсвэл зарлагаар бичнэ. Данс тус бүрийн үлдэгдэл мөр бүрт автоматаар гарна.',
      '«Тайлан» хуудсанд данс тус бүрийн эхний, орлого, зарлага, эцсийн үлдэгдэл, ангиллаар нэгтгэл гарна.'
    ]);
    const Rp = sheet(wb, 'Тайлан', { widths: [3, 28, 16, 16, 16, 16], tab: C.gold });
    const G = sheet(wb, 'Гүйлгээ', { freeze: 4, widths: [12, 10, 20, 24, 30, 20, 14, 14, 15] });
    const T = sheet(wb, 'Тохиргоо', { widths: [26, 16, 4, 26], tab: C.grey });
    title(T, 'Тохиргоо', '', 4); header(T, 4, ['Данс', 'Эхний үлдэгдэл']); header(T, 4, ['Ангилал'], 4);
    const acc = [['Касс', 2.5e6], ['Хаан банк', 38e6], ['Голомт банк', 12e6], ['ХХБ', 5e6]];
    const cat = ['Борлуулалтын орлого', 'Авлага цуглуулалт', 'Зээл', 'Бусад орлого', 'Бараа худалдан авалт', 'Цалин', 'Татвар, НДШ', 'Түрээс', 'Ашиглалт', 'Тээвэр', 'Маркетинг', 'Банкны шимтгэл', 'Шилжүүлэг (данс хооронд)', 'Бусад зардал'];
    for (let i = 0; i < 10; i++) { const r = 5 + i, a = acc[i]; inputCell(T.getCell('A' + r)); inputCell(T.getCell('B' + r), MONEY); if (a) { T.getCell('A' + r).value = a[0]; T.getCell('B' + r).value = a[1]; } }
    for (let i = 0; i < 25; i++) { const r = 5 + i; inputCell(T.getCell('D' + r)); if (cat[i]) T.getCell('D' + r).value = cat[i]; }
    const TS = S('Тохиргоо');
    title(G, 'Гүйлгээний дэвтэр', '', 9); header(G, 4, ['Огноо', 'Баримт №', 'Данс', 'Харилцагч', 'Гүйлгээний утга', 'Ангилал', 'Орлого', 'Зарлага', 'Дансны үлдэгдэл']);
    const R = rng(13), tx = [], who = ['Номин Холдинг', 'Говь ХК', 'Таваг Трейд', 'Юнител', 'Ажилтнууд', 'НДЕГ', 'Оффис Плаза', 'Петровис'];
    for (let i = 0; i < 90; i++) { const inc = R() < 0.35, a = acc[R() < 0.15 ? 0 : 1 + Math.floor(R() * 3)][0]; const c = inc ? cat[Math.floor(R() * 2)] : cat[4 + Math.floor(R() * 8)]; tx.push([new Date(Date.UTC(2026, 8, 1) + Math.floor(R() * 60) * 864e5), (inc ? 'КО-' : 'КЗ-') + (100 + i), a, who[Math.floor(R() * who.length)], c, c, inc ? Math.round((1 + R() * 9) * 1e6 / 1e4) * 1e4 : null, inc ? null : Math.round((0.1 + R() * 3) * 1e6 / 1e4) * 1e4]); }
    tx.sort((a, b) => a[0] - b[0]);
    const g0 = 5, NG = 1000, gL = g0 + NG - 1;
    for (let i = 0; i < NG; i++) {
      const r = g0 + i, x = tx[i];
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].forEach((c, j) => { const y = G.getCell(c + r); inputCell(y, j === 0 ? 'yyyy-mm-dd' : (j >= 6 ? MONEY : null)); if (x && x[j] != null) y.value = x[j]; });
      listValidation(G.getCell('C' + r), `${TS}$A$5:$A$14`); listValidation(G.getCell('F' + r), `${TS}$D$5:$D$29`);
      if (i < 500) { G.getCell('I' + r).value = { formula: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${TS}$A$5:$B$14,2,FALSE),0)+SUMIF($C$${g0}:C${r},C${r},$G$${g0}:G${r})-SUMIF($C$${g0}:C${r},C${r},$H$${g0}:H${r}))` }; calcCell(G.getCell('I' + r), MONEY); }
    }
    G.addConditionalFormatting({ ref: `I${g0}:I${g0 + 499}`, rules: [{ type: 'expression', formulae: [`AND(I${g0}<>"",I${g0}<0)`], style: { font: { color: { argb: C.red }, bold: true } } }] });
    title(Rp, 'Мөнгөн хөрөнгийн тайлан', '', 6);
    Rp.getCell('B3').value = 'Хугацаа:'; Rp.getCell('B3').font = { bold: true }; inputCell(Rp.getCell('C3'), 'yyyy-mm-dd'); Rp.getCell('C3').value = new Date(Date.UTC(2026, 8, 1)); inputCell(Rp.getCell('D3'), 'yyyy-mm-dd'); Rp.getCell('D3').value = new Date(Date.UTC(2026, 9, 31));
    header(Rp, 5, ['Данс', 'Эхний үлдэгдэл', 'Орлого', 'Зарлага', 'Эцсийн үлдэгдэл'], 2);
    const gr = c => `'Гүйлгээ'!$${c}$${g0}:$${c}$${gL}`;
    for (let i = 0; i < 10; i++) { const r = 6 + i, tr = 5 + i;
      const f = (c, fm) => { const x = Rp.getCell(c + r); x.value = { formula: `IF(${TS}$A$${tr}="","",${fm})` }; calcCell(x, c === 'B' ? null : MONEY); };
      f('B', `${TS}A${tr}`);
      f('C', `N(${TS}B${tr})+SUMIFS(${gr('G')},${gr('C')},B${r},${gr('A')},"<"&$C$3)-SUMIFS(${gr('H')},${gr('C')},B${r},${gr('A')},"<"&$C$3)`);
      f('D', `SUMIFS(${gr('G')},${gr('C')},B${r},${gr('A')},">="&$C$3,${gr('A')},"<="&$D$3)`);
      f('E', `SUMIFS(${gr('H')},${gr('C')},B${r},${gr('A')},">="&$C$3,${gr('A')},"<="&$D$3)`);
      f('F', `C${r}+D${r}-E${r}`); }
    Rp.getCell('B16').value = 'НИЙТ'; ['C', 'D', 'E', 'F'].forEach(c => { Rp.getCell(c + 16).value = { formula: `SUM(${c}6:${c}15)` }; Rp.getCell(c + 16).numFmt = MONEY; }); totalRow(Rp, 16, 2, 6);
    header(Rp, 18, ['Ангилал', 'Орлого', 'Зарлага'], 2);
    for (let i = 0; i < cat.length; i++) { const r = 19 + i; Rp.getCell('B' + r).value = { formula: `${TS}D${5 + i}` }; Rp.getCell('B' + r).border = box; ['C', 'D'].forEach((c, k) => { const x = Rp.getCell(c + r); x.value = { formula: `SUMIFS(${gr(k ? 'H' : 'G')},${gr('F')},$B${r},${gr('A')},">="&$C$3,${gr('A')},"<="&$D$3)` }; calcCell(x, MONEY); }); }
    const ce = 18 + cat.length;
    return done(wb, JSZip, { 'Тайлан': [{ type: 'bar', title: 'Зарлага — ангиллаар', cats: { ref: `'Тайлан'!$B$19:$B$${ce}`, vals: cat }, series: [{ name: 'Зарлага', ref: `'Тайлан'!$D$19:$D$${ce}`, vals: [] }], at: { c1: 6, r1: 3, c2: 13, r2: 30 } }] });
  }

  /* ═════════ 16. ӨРТӨГ, ҮНЭ ТОГТООХ ═════════ */
  async function costing(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Өртөг ба үнэ тогтоох');
    guide(wb, 'Өртөг ба үнэ тогтоох', [
      '«Түүхий эд» хуудсанд материал бүрийн худалдан авах үнэ, багцын хэмжээг бичнэ — нэгжийн үнэ автоматаар бодогдоно.',
      '«Орц» хуудсанд бүтээгдэхүүн бүрт ямар түүхий эд хэдий хэмжээгээр орохыг мөр мөрөөр бичнэ (жор, норм).',
      '«Бүтээгдэхүүн» хуудсанд савлагаа, ажиллах хүч, шууд бус зардал, зорилтот ашгийн хувиа оруулахад нэгжийн өртөг, санал болгох үнэ (НӨАТ-тай), одоогийн үнийн бодит маржин гарна.'
    ], ['Ресторан, кафе, нарийн боов, үйлдвэрлэл, гар урлалд тохиромжтой. Түүхий эдийн үнэ өсөхөд «Түүхий эд» хуудсанд л засахад бүх бүтээгдэхүүний өртөг шинэчлэгдэнэ.']);
    const P = sheet(wb, 'Бүтээгдэхүүн', { freeze: 4, xFreeze: 1, widths: [24, 13, 11, 11, 11, 13, 10, 13, 13, 13, 11, 11], tab: C.gold });
    const Rc = sheet(wb, 'Орц', { freeze: 4, widths: [24, 26, 10, 8, 12, 13] });
    const M = sheet(wb, 'Түүхий эд', { freeze: 4, widths: [26, 8, 14, 12, 14] });
    const mats = [['Кофе үр', 'гр', 85000, 1000], ['Сүү', 'мл', 4200, 1000], ['Элсэн чихэр', 'гр', 3800, 1000], ['Шоколад соус', 'мл', 32000, 1000], ['Гурил', 'гр', 52000, 25000], ['Өндөг', 'ш', 6500, 10], ['Цөцгийн тос', 'гр', 18500, 500], ['Тахианы мах', 'гр', 16000, 1000], ['Талх (сэндвич)', 'ш', 4800, 8], ['Бяслаг', 'гр', 26000, 1000], ['Ногоо (салат)', 'гр', 9000, 1000], ['Цаасан аяга', 'ш', 18000, 100]];
    title(M, 'Түүхий эд, материал', '', 5); header(M, 4, ['Нэр', 'Нэгж', 'Худалдан авах үнэ', 'Багцын хэмжээ', 'Нэгжийн үнэ']);
    for (let i = 0; i < 100; i++) { const r = 5 + i, x = mats[i]; ['A', 'B', 'C', 'D'].forEach((c, j) => { const y = M.getCell(c + r); inputCell(y, j >= 2 ? MONEY : null); if (x) y.value = x[j]; }); M.getCell('E' + r).value = { formula: `IF(OR(C${r}="",N(D${r})=0),"",C${r}/D${r})` }; calcCell(M.getCell('E' + r), '#,##0.00'); }
    const MS = S('Түүхий эд');
    const prods = [['Латте', [['Кофе үр', 18], ['Сүү', 220], ['Элсэн чихэр', 8], ['Цаасан аяга', 1]], 300, 900, 7500], ['Американо', [['Кофе үр', 18], ['Цаасан аяга', 1]], 200, 700, 6000], ['Мока', [['Кофе үр', 18], ['Сүү', 180], ['Шоколад соус', 25], ['Цаасан аяга', 1]], 300, 900, 8500], ['Круассан', [['Гурил', 60], ['Цөцгийн тос', 30], ['Өндөг', 0.3], ['Элсэн чихэр', 8]], 150, 1200, 6500], ['Тахиатай сэндвич', [['Талх (сэндвич)', 1], ['Тахианы мах', 90], ['Бяслаг', 25], ['Ногоо (салат)', 30]], 250, 1500, 12500], ['Цезарь салат', [['Тахианы мах', 120], ['Ногоо (салат)', 150], ['Бяслаг', 20], ['Талх (сэндвич)', 0.3]], 400, 1800, 14500]];
    title(Rc, 'Орц (жор, норм)', 'Бүтээгдэхүүн бүрийн нэг нэгжид орох түүхий эд', 6); header(Rc, 4, ['Бүтээгдэхүүн', 'Түүхий эд', 'Хэмжээ', 'Нэгж', 'Нэгжийн үнэ', 'Өртөг']);
    const lines = []; prods.forEach(p => p[1].forEach(l => lines.push([p[0], l[0], l[1]])));
    const PS = S('Бүтээгдэхүүн');
    for (let i = 0; i < 400; i++) { const r = 5 + i, x = lines[i]; ['A', 'B', 'C'].forEach((c, j) => { const y = Rc.getCell(c + r); inputCell(y, j === 2 ? '#,##0.###' : null); if (x) y.value = x[j]; }); listValidation(Rc.getCell('A' + r), `${PS}$A$5:$A$104`); listValidation(Rc.getCell('B' + r), `${MS}$A$5:$A$104`);
      if (i < 200) { Rc.getCell('D' + r).value = { formula: `IF(B${r}="","",IFERROR(INDEX(${MS}$B$5:$B$104,MATCH(B${r},${MS}$A$5:$A$104,0)),"?"))` }; Rc.getCell('E' + r).value = { formula: `IF(B${r}="","",IFERROR(INDEX(${MS}$E$5:$E$104,MATCH(B${r},${MS}$A$5:$A$104,0)),0))` }; Rc.getCell('F' + r).value = { formula: `IF(B${r}="","",N(C${r})*E${r})` }; calcCell(Rc.getCell('D' + r)); calcCell(Rc.getCell('E' + r), '#,##0.00'); calcCell(Rc.getCell('F' + r), MONEY); } }
    const RS = S('Орц');
    title(P, 'Бүтээгдэхүүний өртөг, үнэ', '', 12);
    P.getCell('A3').value = 'Зорилтот ашгийн хувь (анхдагч):'; P.getCell('A3').font = { bold: true }; inputCell(P.getCell('C3'), PCT); P.getCell('C3').value = 0.65; P.getCell('E3').value = 'НӨАТ:'; P.getCell('E3').font = { bold: true }; inputCell(P.getCell('F3'), PCT); P.getCell('F3').value = 0.10;
    header(P, 4, ['Бүтээгдэхүүн', 'Түүхий эд', 'Савлагаа', 'Ажиллах хүч', 'Шууд бус', 'Нэгжийн өртөг', 'Зорилтот ашиг %', 'Санал болгох үнэ', 'НӨАТ-тай үнэ', 'Одоогийн үнэ (НӨАТ-тай)', 'Бодит маржин', 'Өртгийн хувь']);
    for (let i = 0; i < 100; i++) { const r = 5 + i, x = prods[i];
      inputCell(P.getCell('A' + r)); if (x) P.getCell('A' + r).value = x[0];
      [['C', x && x[2]], ['D', x && Math.round(x[3] * 0.6)], ['E', x && Math.round(x[3] * 0.4)], ['G', null], ['J', x && x[4]]].forEach(([c, v]) => { const y = P.getCell(c + r); inputCell(y, c === 'G' ? PCT : MONEY); if (v) y.value = v; });
      const f = (c, fm, fmt) => { const y = P.getCell(c + r); y.value = { formula: fm }; calcCell(y, fmt); };
      f('B', `IF(A${r}="","",SUMIF(${RS}$A$5:$A$404,A${r},${RS}$F$5:$F$404))`, MONEY);
      f('F', `IF(A${r}="","",B${r}+N(C${r})+N(D${r})+N(E${r}))`, MONEY);
      f('H', `IF(A${r}="","",ROUND(F${r}/(1-IF(G${r}="",$C$3,G${r})),-1))`, MONEY);
      f('I', `IF(A${r}="","",ROUND(H${r}*(1+$F$3),-2))`, MONEY);
      f('K', `IF(OR(A${r}="",N(J${r})=0),"",1-F${r}/(J${r}/(1+$F$3)))`, PCT);
      f('L', `IF(OR(A${r}="",N(J${r})=0),"",F${r}/(J${r}/(1+$F$3)))`, PCT);
      P.getCell('I' + r).font = { bold: true }; }
    P.addConditionalFormatting({ ref: 'K5:K104', rules: [{ type: 'expression', formulae: ['AND(K5<>"",K5<0.5)'], style: { font: { color: { argb: C.red }, bold: true } } }, { type: 'expression', formulae: ['AND(K5<>"",K5>=0.65)'], style: { font: { color: { argb: C.green }, bold: true } } }] });
    const pl = 4 + prods.length;
    return done(wb, JSZip, { 'Бүтээгдэхүүн': [{ type: 'bar', title: 'Нэгжийн өртөг ба одоогийн үнэ (НӨАТ-гүй харьцуулахад НӨАТ-тай)', cats: { ref: `'Бүтээгдэхүүн'!$A$5:$A$${pl}`, vals: prods.map(p => p[0]) }, series: [{ name: 'Нэгжийн өртөг', ref: `'Бүтээгдэхүүн'!$F$5:$F$${pl}`, vals: [], color: '#171717' }, { name: 'Одоогийн үнэ', ref: `'Бүтээгдэхүүн'!$J$5:$J$${pl}`, vals: [], color: '#c9a470' }], at: { c1: 0, r1: pl + 2, c2: 8, r2: pl + 24 } }] });
  }

  /* ═════════ 17. CRM ═════════ */
  async function crm(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Борлуулалтын CRM');
    guide(wb, 'Борлуулалтын CRM', [
      '«Харилцагч» хуудсанд харилцагч бүрийн холбоо барих мэдээлэл, эх сурвалж, хариуцагчийг бичнэ.',
      '«Боломж» хуудсанд борлуулалтын боломж бүрийн дүн, үе шат, хүлээгдэж буй хаах огноо, дараагийн алхмыг бичнэ. Үе шатаас магадлал, жигнэсэн дүн автоматаар гарна.',
      'Дараагийн алхмын огноо өнгөрсөн бол улаанаар тодорно. «Самбар» хуудсанд үе шат, хариуцагч, сараар нэгтгэл, хөрвүүлэлтийн хувь гарна.'
    ]);
    const D = sheet(wb, 'Самбар', { widths: [3, 26, 12, 16, 16, 3, 20, 16, 16], tab: C.gold });
    const O = sheet(wb, 'Боломж', { freeze: 4, xFreeze: 1, widths: [26, 24, 16, 14, 20, 9, 14, 13, 30, 13] });
    const Cu = sheet(wb, 'Харилцагч', { freeze: 4, widths: [24, 22, 14, 24, 16, 16] });
    const T = sheet(wb, 'Тохиргоо', { widths: [24, 12, 4, 20], tab: C.grey });
    const ST = [['Шинэ', 0.1], ['Холбогдсон', 0.25], ['Санал илгээсэн', 0.5], ['Хэлэлцээр', 0.75], ['Амжилттай', 1], ['Алдсан', 0]];
    const OWN = ['Анар', 'Билгүүн', 'Номин', 'Тэмүүлэн'];
    title(T, 'Тохиргоо', '', 4); header(T, 4, ['Үе шат', 'Магадлал']); header(T, 4, ['Хариуцагч'], 4);
    ST.forEach((s, i) => { T.getCell('A' + (5 + i)).value = s[0]; T.getCell('B' + (5 + i)).value = s[1]; inputCell(T.getCell('A' + (5 + i))); inputCell(T.getCell('B' + (5 + i)), '0%'); });
    for (let i = 0; i < 10; i++) { inputCell(T.getCell('D' + (5 + i))); if (OWN[i]) T.getCell('D' + (5 + i)).value = OWN[i]; }
    const TS = S('Тохиргоо');
    const R = rng(17), comp = ['Номин Холдинг', 'Говь ХК', 'Мон Лаа', 'Тэсо', 'Хүнс Трейд', 'Эрдэнэт Сервис', 'Сүү ХК', 'Таван Богд', 'Монос', 'Юнител', 'Шунхлай', 'Петровис'];
    title(Cu, 'Харилцагчид', '', 6); header(Cu, 4, ['Компани', 'Холбоо барих хүн', 'Утас', 'И-мэйл', 'Эх сурвалж', 'Хариуцагч']);
    for (let i = 0; i < 300; i++) { const r = 5 + i; ['A', 'B', 'C', 'D', 'E', 'F'].forEach(c => inputCell(Cu.getCell(c + r))); listValidation(Cu.getCell('E' + r), ['Facebook', 'Танил', 'Вэб сайт', 'Утас', 'Үзэсгэлэн', 'Бусад']); listValidation(Cu.getCell('F' + r), `${TS}$D$5:$D$14`);
      if (comp[i]) { Cu.getCell('A' + r).value = comp[i]; Cu.getCell('B' + r).value = ['Б. Болд', 'Д. Сараа', 'Г. Тэмүүжин', 'Э. Номин'][i % 4]; Cu.getCell('C' + r).value = '99' + String(100000 + Math.floor(R() * 899999)); Cu.getCell('D' + r).value = 'info' + (i + 1) + '@example.mn'; Cu.getCell('E' + r).value = ['Facebook', 'Танил', 'Вэб сайт', 'Утас'][i % 4]; Cu.getCell('F' + r).value = OWN[i % 4]; } }
    title(O, 'Борлуулалтын боломж', '', 10); header(O, 4, ['Боломж', 'Харилцагч', 'Хариуцагч', 'Дүн', 'Үе шат', 'Магадлал', 'Жигнэсэн дүн', 'Хаах огноо', 'Дараагийн алхам', 'Огноо']);
    const deals = ['Санхүүгийн програм нэвтрүүлэх', 'Жилийн аудит', 'Цалингийн систем', 'Дашбоард', 'НББ аутсорсинг', 'Татварын зөвлөгөө', 'Сургалт', 'Нөөцийн систем'];
    for (let i = 0; i < 500; i++) { const r = 5 + i;
      ['A', 'B', 'C', 'D', 'E', 'H', 'I', 'J'].forEach(c => inputCell(O.getCell(c + r), c === 'D' ? MONEY : ('HJ'.includes(c) ? 'yyyy-mm-dd' : null)));
      listValidation(O.getCell('B' + r), `'Харилцагч'!$A$5:$A$304`); listValidation(O.getCell('C' + r), `${TS}$D$5:$D$14`); listValidation(O.getCell('E' + r), `${TS}$A$5:$A$10`);
      if (i < 36) { const st = ST[Math.min(5, Math.floor(Math.pow(R(), 0.8) * 6))][0]; O.getCell('A' + r).value = deals[i % deals.length]; O.getCell('B' + r).value = comp[i % comp.length]; O.getCell('C' + r).value = OWN[i % 4]; O.getCell('D' + r).value = Math.round((2 + R() * 40) * 1e6 / 1e5) * 1e5; O.getCell('E' + r).value = st; O.getCell('H' + r).value = new Date(Date.UTC(2026, 9 + Math.floor(R() * 3), 1 + Math.floor(R() * 27))); O.getCell('I' + r).value = st === 'Амжилттай' || st === 'Алдсан' ? '' : ['Уулзалт товлох', 'Санал илгээх', 'Гэрээний төсөл', 'Утсаар холбогдох'][i % 4]; O.getCell('J' + r).value = st === 'Амжилттай' || st === 'Алдсан' ? null : new Date(Date.UTC(2026, 10, 1 + Math.floor(R() * 20))); }
      if (i < 300) { O.getCell('F' + r).value = { formula: `IF(E${r}="","",IFERROR(VLOOKUP(E${r},${TS}$A$5:$B$10,2,FALSE),0))` }; calcCell(O.getCell('F' + r), '0%'); O.getCell('G' + r).value = { formula: `IF(E${r}="","",N(D${r})*F${r})` }; calcCell(O.getCell('G' + r), MONEY); } }
    O.addConditionalFormatting({ ref: 'J5:J304', rules: [{ type: 'expression', formulae: ['AND(J5<>"",J5<TODAY(),$E5<>"Амжилттай",$E5<>"Алдсан")'], style: { font: { color: { argb: C.red }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDECEC' } } } }] });
    O.addConditionalFormatting({ ref: 'E5:E304', rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"Амжилттай"'], style: { font: { color: { argb: C.green }, bold: true } } }, { type: 'cellIs', operator: 'equal', formulae: ['"Алдсан"'], style: { font: { color: { argb: C.grey } } } }] });
    const ob = c => `'Боломж'!$${c}$5:$${c}$504`;
    title(D, 'Борлуулалтын самбар', '', 9);
    kpi(D, 3, 2, 'Нээлттэй боломжийн дүн', `SUMPRODUCT((${ob('E')}<>"")*(${ob('E')}<>"Амжилттай")*(${ob('E')}<>"Алдсан"),${ob('D')})`);
    kpi(D, 3, 4, 'Жигнэсэн таамаг', `SUMIFS(${ob('G')},${ob('E')},"<>Амжилттай",${ob('E')},"<>Алдсан")`);
    kpi(D, 3, 7, 'Хөрвүүлэлтийн хувь', `IFERROR(COUNTIF(${ob('E')},"Амжилттай")/(COUNTIF(${ob('E')},"Амжилттай")+COUNTIF(${ob('E')},"Алдсан")),0)`, PCT);
    header(D, 7, ['Үе шат', 'Тоо', 'Дүн', 'Жигнэсэн'], 2);
    ST.forEach((s, i) => { const r = 8 + i; D.getCell('B' + r).value = { formula: `${TS}A${5 + i}` }; D.getCell('B' + r).border = box; [['C', `COUNTIF(${ob('E')},B${r})`, '0'], ['D', `SUMIF(${ob('E')},B${r},${ob('D')})`, MONEY], ['E', `SUMIF(${ob('E')},B${r},${ob('G')})`, MONEY]].forEach(([c, f, fm]) => { const x = D.getCell(c + r); x.value = { formula: f }; calcCell(x, fm); }); });
    header(D, 7, ['Хариуцагч', 'Амжилттай', 'Нээлттэй'], 7);
    for (let i = 0; i < 6; i++) { const r = 8 + i; D.getCell('G' + r).value = { formula: `IF(${TS}D${5 + i}="","",${TS}D${5 + i})` }; D.getCell('G' + r).border = box; [['H', `IF(G${r}="","",SUMIFS(${ob('D')},${ob('C')},G${r},${ob('E')},"Амжилттай"))`], ['I', `IF(G${r}="","",SUMIFS(${ob('D')},${ob('C')},G${r},${ob('E')},"<>Амжилттай",${ob('E')},"<>Алдсан"))`]].forEach(([c, f]) => { const x = D.getCell(c + r); x.value = { formula: f }; calcCell(x, MONEY); }); }
    D.getCell('B15').value = 'Хугацаа хэтэрсэн алхам:'; D.getCell('C15').value = { formula: `COUNTIFS(${ob('J')},"<"&TODAY(),${ob('E')},"<>Амжилттай",${ob('E')},"<>Алдсан")` }; D.getCell('C15').font = { bold: true, color: { argb: C.red } };
    return done(wb, JSZip, { 'Самбар': [{ type: 'bar', title: 'Үе шат бүрийн дүн', cats: { ref: `'Самбар'!$B$8:$B$13`, vals: ST.map(s => s[0]) }, series: [{ name: 'Дүн', ref: `'Самбар'!$D$8:$D$13`, vals: [] }], at: { c1: 1, r1: 16, c2: 5, r2: 34 } },
      { type: 'col', title: 'Хариуцагчаар', cats: { ref: `'Самбар'!$G$8:$G$11`, vals: OWN }, series: [{ name: 'Амжилттай', ref: `'Самбар'!$H$8:$H$11`, vals: [], color: '#c9a470' }, { name: 'Нээлттэй', ref: `'Самбар'!$I$8:$I$11`, vals: [], color: '#171717' }], at: { c1: 5, r1: 16, c2: 9, r2: 34 } }] });
  }

  /* ═════════ 18. GANTT ═════════ */
  async function gantt(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Төслийн төлөвлөгөө (Gantt)');
    guide(wb, 'Төслийн төлөвлөгөө (Gantt)', [
      '«Төлөвлөгөө» хуудсанд төслийн эхлэх огноо, тайлангийн огноог бичнэ.',
      'Ажил бүрийн нэр, хариуцагч, эхлэх, дуусах огноо, гүйцэтгэлийн хувийг бичихэд Gantt график (7 хоногоор, 26 долоо хоног) автоматаар будагдана: алтан — төлөвлөсөн хугацаа, хар — гүйцэтгэсэн хэсэг.',
      'Төлөв (Эхлээгүй / Явагдаж буй / Хоцорсон / Дууссан) тайлангийн огноотой харьцуулж автоматаар гарна. Улаан босоо шугам — тайлангийн огноо.'
    ]);
    const G = sheet(wb, 'Төлөвлөгөө', { freeze: 6, xFreeze: 8, widths: [5, 30, 14, 11, 11, 7, 9, 13].concat(Array(26).fill(3.6)), zoom: 90, tab: C.gold });
    G.mergeCells('A1:H1'); G.getCell('A1').value = 'Төслийн төлөвлөгөө'; G.getCell('A1').font = { bold: true, size: 18 }; G.getRow(1).height = 30;
    G.getCell('A2').value = 'Төсөл:'; G.mergeCells('B2:D2'); inputCell(G.getCell('B2')); G.getCell('B2').value = 'BusinessBI нэвтрүүлэлт — Жишээ ХХК';
    G.getCell('A3').value = 'Эхлэх:'; inputCell(G.getCell('B3'), 'yyyy-mm-dd'); G.getCell('B3').value = new Date(Date.UTC(2026, 10, 2));
    G.getCell('C3').value = 'Тайлангийн огноо:'; G.getCell('C3').alignment = { horizontal: 'right' }; G.mergeCells('C3:D3'); inputCell(G.getCell('E3'), 'yyyy-mm-dd'); G.getCell('E3').value = new Date(Date.UTC(2026, 11, 7));
    ['A2', 'A3', 'C3'].forEach(a => G.getCell(a).font = { bold: true });
    header(G, 5, ['№', 'Ажил', 'Хариуцагч', 'Эхлэх', 'Дуусах', 'Хоног', 'Гүйцэтгэл', 'Төлөв']);
    for (let w = 0; w < 26; w++) { const c = colL(8 + w); const h = G.getCell(c + 5); h.value = { formula: `$B$3-WEEKDAY($B$3,3)+${w * 7}` }; h.numFmt = 'mm/dd'; h.font = { size: 7, color: { argb: C.white } }; h.fill = fill(C.head); h.alignment = { textRotation: 90, horizontal: 'center' }; }
    G.getRow(5).height = 42; G.getRow(6).height = 4;
    const tasks = [['Шинжилгээ, шаардлага тодорхойлох', 'Хонгор', 0, 9, 1], ['Дансны жагсаалт, тохиргоо', 'Нягтлан', 7, 6, 1], ['Эхний үлдэгдэл шилжүүлэх', 'Нягтлан', 12, 10, 1], ['Харилцагч, бараа импорт', 'Оператор', 14, 12, 0.8], ['Банкны хуулга холбох', 'Хонгор', 21, 9, 0.6], ['Цалингийн модуль', 'ХН', 25, 14, 0.4], ['Дашбоард тохируулах', 'Хонгор', 35, 10, 0.1], ['Хэрэглэгчийн сургалт', 'Хонгор', 42, 5, 0], ['Зэрэгцээ ажиллагаа (1 сар)', 'Нягтлан', 45, 30, 0], ['Хүлээлгэн өгөх', 'Захирал', 76, 3, 0]];
    const r0 = 7, N = 60, base = Date.UTC(2026, 10, 2);
    for (let i = 0; i < N; i++) { const r = r0 + i, t = tasks[i];
      G.getCell('A' + r).value = { formula: `IF(B${r}="","",ROW()-${r0 - 1})` }; calcCell(G.getCell('A' + r));
      ['B', 'C', 'D', 'E', 'G'].forEach(c => inputCell(G.getCell(c + r), 'DE'.includes(c) ? 'yyyy-mm-dd' : (c === 'G' ? '0%' : null)));
      if (t) { G.getCell('B' + r).value = t[0]; G.getCell('C' + r).value = t[1]; G.getCell('D' + r).value = new Date(base + t[2] * 864e5); G.getCell('E' + r).value = new Date(base + (t[2] + t[3] - 1) * 864e5); G.getCell('G' + r).value = t[4]; }
      G.getCell('F' + r).value = { formula: `IF(OR(D${r}="",E${r}=""),"",E${r}-D${r}+1)` }; calcCell(G.getCell('F' + r), '0');
      G.getCell('H' + r).value = { formula: `IF(B${r}="","",IF(N(G${r})>=1,"Дууссан",IF($E$3<D${r},"Эхлээгүй",IF(D${r}+(E${r}-D${r}+1)*N(G${r})<$E$3-0.5,IF($E$3>E${r},"Хоцорсон","Хоцорч буй"),"Явагдаж буй"))))` }; calcCell(G.getCell('H' + r));
      for (let w = 0; w < 26; w++) G.getCell(colL(8 + w) + r).border = { left: { style: 'hair', color: { argb: 'FFEEEEEE' } }, bottom: { style: 'hair', color: { argb: 'FFEEEEEE' } } };
    }
    const rL = r0 + N - 1, gr = `I${r0}:AH${rL}`;
    G.addConditionalFormatting({ ref: gr, rules: [
      { type: 'expression', priority: 1, formulae: [`AND($D${r0}<>"",I$5<=$D${r0}+($E${r0}-$D${r0}+1)*N($G${r0})-1,I$5+6>=$D${r0})`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF171717' } } } },
      { type: 'expression', priority: 2, formulae: [`AND($D${r0}<>"",I$5<=$E${r0},I$5+6>=$D${r0})`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC9A470' } } } },
      { type: 'expression', priority: 3, formulae: [`AND($E$3>=I$5,$E$3<I$5+7)`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDE2E2' } } } }] });
    G.addConditionalFormatting({ ref: `H${r0}:H${rL}`, rules: [{ type: 'containsText', operator: 'containsText', text: 'Хоцор', style: { font: { color: { argb: C.red }, bold: true } } }, { type: 'cellIs', operator: 'equal', formulae: ['"Дууссан"'], style: { font: { color: { argb: C.green }, bold: true } } }] });
    G.getCell('B' + (rL + 2)).value = 'Нийт гүйцэтгэл (хоногоор жигнэсэн):'; G.getCell('B' + (rL + 2)).font = { bold: true };
    G.getCell('G' + (rL + 2)).value = { formula: `IFERROR(SUMPRODUCT(F${r0}:F${rL},G${r0}:G${rL})/SUM(F${r0}:F${rL}),0)` };
    return done(wb, JSZip, {});
  }

  /* ═════════ 19. KPI ═════════ */
  async function kpiTpl(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Ажилтны KPI үнэлгээ');
    guide(wb, 'Ажилтны KPI үнэлгээ', [
      '«Тохиргоо» хуудсанд KPI шалгуур, жин (нийт 100%), үнэлгээний ангилал, урамшууллын хувийг тохируулна.',
      '«Үнэлгээ» хуудсанд ажилтан бүрийн шалгуур тус бүрийн оноог (1–5) бичнэ. Жигнэсэн нийт оноо (100-аар), ангилал (A–D), урамшууллын дүн автоматаар.',
      '«Хуудас» хуудсанд ажилтны дугаар сонгоход тухайн хүний үнэлгээний хуудас гарна — ярилцлагад хэвлэж ашиглана.'
    ]);
    const E = sheet(wb, 'Үнэлгээ', { freeze: 5, xFreeze: 3, widths: [5, 22, 18, 13, 11, 11, 11, 11, 11, 11, 9, 13, 13], tab: C.gold });
    const H = sheet(wb, 'Хуудас', { widths: [3, 34, 12, 12, 30] });
    const T = sheet(wb, 'Тохиргоо', { widths: [34, 10, 4, 12, 10, 12], tab: C.grey });
    const KP = [['Борлуулалт / ажлын төлөвлөгөөний биелэлт', 0.35], ['Ажлын чанар, алдаагүй байдал', 0.2], ['Харилцагчийн сэтгэл ханамж', 0.15], ['Ирц, цагийн хуваарь', 0.1], ['Багийн ажил, хамтын ажиллагаа', 0.1], ['Санаачилга, сайжруулалт', 0.1]];
    title(T, 'Тохиргоо', 'KPI жин нийлбэр 100% байх ёстой', 6); header(T, 4, ['KPI шалгуур', 'Жин']); header(T, 4, ['Оноо ≥', 'Ангилал', 'Урамшуулал'], 4);
    KP.forEach((k, i) => { const r = 5 + i; T.getCell('A' + r).value = k[0]; inputCell(T.getCell('A' + r)); T.getCell('B' + r).value = k[1]; inputCell(T.getCell('B' + r), '0%'); });
    T.getCell('A11').value = 'Нийт жин'; T.getCell('B11').value = { formula: 'SUM(B5:B10)' }; T.getCell('B11').numFmt = '0%'; totalRow(T, 11, 1, 2);
    T.addConditionalFormatting({ ref: 'B11', rules: [{ type: 'expression', formulae: ['ROUND(B11,4)<>1'], style: { font: { color: { argb: C.red }, bold: true } } }] });
    [[0, 'D', 0], [60, 'C', 0.05], [75, 'B', 0.10], [90, 'A', 0.20]].forEach((g, i) => { const r = 5 + i; T.getCell('D' + r).value = g[0]; inputCell(T.getCell('D' + r)); T.getCell('E' + r).value = g[1]; inputCell(T.getCell('E' + r)); T.getCell('F' + r).value = g[2]; inputCell(T.getCell('F' + r), '0%'); });
    const TS = S('Тохиргоо');
    E.mergeCells('A1:M1'); E.getCell('A1').value = 'Ажилтны KPI үнэлгээ'; E.getCell('A1').font = { bold: true, size: 18 }; E.getRow(1).height = 30;
    E.getCell('A2').value = 'Үнэлгээний үе:'; E.getCell('A2').font = { bold: true }; E.mergeCells('C2:D2'); inputCell(E.getCell('C2')); E.getCell('C2').value = '2026 оны III улирал';
    const hdr = ['№', 'Ажилтан', 'Албан тушаал', 'Үндсэн цалин'];
    header(E, 4, hdr.concat(KP.map((_, i) => 'KPI ' + (i + 1)), ['Оноо', 'Ангилал', 'Урамшуулал']));
    KP.forEach((k, i) => { const c = E.getCell(colL(4 + i) + 5); c.value = { formula: `${TS}A${5 + i}` }; c.font = { size: 8, color: { argb: C.grey } }; c.alignment = { wrapText: true, vertical: 'top' }; });
    E.getRow(5).height = 48;
    const names = [['Бат-Эрдэнэ Г.', 'Борлуулалтын менежер', 2.6e6], ['Оюунчимэг Н.', 'Борлуулагч', 1.5e6], ['Ганзориг Б.', 'Борлуулагч', 1.45e6], ['Энхжаргал Ц.', 'Нягтлан', 2.2e6], ['Нарантуяа С.', 'Агуулахын эрхлэгч', 1.7e6], ['Цолмон Х.', 'Нярав', 1.35e6], ['Даваадорж М.', 'Маркетинг', 1.9e6], ['Солонго А.', 'Оператор', 1.1e6]];
    const R = rng(23), r0 = 6, N = 50, rL = r0 + N - 1;
    for (let i = 0; i < N; i++) { const r = r0 + i, x = names[i];
      E.getCell('A' + r).value = { formula: `IF(B${r}="","",ROW()-${r0 - 1})` }; calcCell(E.getCell('A' + r));
      ['B', 'C', 'D'].forEach((c, j) => { const y = E.getCell(c + r); inputCell(y, j === 2 ? MONEY : null); if (x) y.value = x[j]; });
      KP.forEach((_, k) => { const y = E.getCell(colL(4 + k) + r); inputCell(y, '0'); y.alignment = { horizontal: 'center' }; y.dataValidation = { type: 'whole', operator: 'between', formulae: [1, 5], showErrorMessage: true, error: '1–5' }; if (x) y.value = Math.min(5, Math.max(1, Math.round(2.6 + R() * 2.6))); });
      const sc = `E${r}:J${r}`;
      E.getCell('K' + r).value = { formula: `IF(COUNT(${sc})=0,"",ROUND(SUMPRODUCT(${sc},TRANSPOSE(${TS}$B$5:$B$10))/5*100,1))` };
      E.getCell('K' + r).value = { formula: `IF(COUNT(${sc})=0,"",ROUND((E${r}*${TS}$B$5+F${r}*${TS}$B$6+G${r}*${TS}$B$7+H${r}*${TS}$B$8+I${r}*${TS}$B$9+J${r}*${TS}$B$10)/5*100,1))` }; calcCell(E.getCell('K' + r), '0.0'); E.getCell('K' + r).font = { bold: true };
      E.getCell('L' + r).value = { formula: `IF(K${r}="","",LOOKUP(K${r},${TS}$D$5:$D$8,${TS}$E$5:$E$8))` }; calcCell(E.getCell('L' + r)); E.getCell('L' + r).alignment = { horizontal: 'center' }; E.getCell('L' + r).font = { bold: true };
      E.getCell('M' + r).value = { formula: `IF(K${r}="","",N(D${r})*LOOKUP(K${r},${TS}$D$5:$D$8,${TS}$F$5:$F$8))` }; calcCell(E.getCell('M' + r), MONEY);
    }
    E.addConditionalFormatting({ ref: `L${r0}:L${rL}`, rules: [{ type: 'cellIs', operator: 'equal', formulae: ['"A"'], style: { font: { color: { argb: C.green }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE8F5EC' } } } }, { type: 'cellIs', operator: 'equal', formulae: ['"D"'], style: { font: { color: { argb: C.red }, bold: true }, fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDECEC' } } } }] });
    const tr = rL + 1; E.getCell('B' + tr).value = 'Нийт урамшуулал'; E.getCell('M' + tr).value = { formula: `SUM(M${r0}:M${rL})` }; E.getCell('M' + tr).numFmt = MONEY; E.getCell('K' + tr).value = { formula: `IFERROR(AVERAGE(K${r0}:K${rL}),0)` }; E.getCell('K' + tr).numFmt = '0.0'; totalRow(E, tr, 1, 13);
    // Хуудас
    H.mergeCells('B2:E2'); H.getCell('B2').value = 'АЖИЛТНЫ ГҮЙЦЭТГЭЛИЙН ҮНЭЛГЭЭ'; H.getCell('B2').font = { bold: true, size: 16 }; H.getCell('B2').alignment = { horizontal: 'center' };
    H.mergeCells('B3:E3'); H.getCell('B3').value = { formula: `'Үнэлгээ'!C2` }; H.getCell('B3').alignment = { horizontal: 'center' }; H.getCell('B3').font = { color: { argb: C.grey } };
    H.getCell('B5').value = 'Ажилтны №'; H.getCell('B5').font = { bold: true }; const sel = H.getCell('C5'); sel.value = 1; inputCell(sel); sel.font = { bold: true, size: 13 };
    const ix = c => `INDEX('Үнэлгээ'!$${c}$${r0}:$${c}$${rL},$C$5)`;
    [['Овог нэр', 'B'], ['Албан тушаал', 'C']].forEach(([l, c], i) => { H.getCell('B' + (7 + i)).value = l; H.getCell('B' + (7 + i)).font = { color: { argb: C.grey } }; H.getCell('C' + (7 + i)).value = { formula: ix(c) }; H.getCell('C' + (7 + i)).font = { bold: true }; });
    header(H, 10, ['Шалгуур', 'Жин', 'Оноо (1–5)', 'Тайлбар'], 2);
    KP.forEach((k, i) => { const r = 11 + i; H.getCell('B' + r).value = { formula: `${TS}A${5 + i}` }; H.getCell('B' + r).border = box; H.getCell('C' + r).value = { formula: `${TS}B${5 + i}` }; calcCell(H.getCell('C' + r), '0%'); H.getCell('D' + r).value = { formula: ix(colL(4 + i)) }; calcCell(H.getCell('D' + r), '0'); H.getCell('D' + r).alignment = { horizontal: 'center' }; H.getCell('E' + r).border = box; });
    [['Нийт оноо (100)', 'K', '0.0'], ['Ангилал', 'L', '@'], ['Урамшуулал', 'M', MONEY]].forEach(([l, c, f], i) => { const r = 18 + i; H.getCell('B' + r).value = l; H.getCell('D' + r).value = { formula: ix(c) }; H.getCell('D' + r).numFmt = f; totalRow(H, r, 2, 5); });
    H.getCell('B23').value = 'Ажилтны санал:'; H.getCell('B26').value = 'Ажилтан: ____________________'; H.getCell('D26').value = 'Удирдлага: ____________________';
    H.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, printArea: 'B2:E27' };
    return done(wb, JSZip, { 'Үнэлгээ': [{ type: 'bar', title: 'Нийт оноо — ажилтнаар', cats: { ref: `'Үнэлгээ'!$B$${r0}:$B$${r0 + names.length - 1}`, vals: names.map(n => n[0]) }, series: [{ name: 'Оноо', ref: `'Үнэлгээ'!$K$${r0}:$K$${r0 + names.length - 1}`, vals: [] }], at: { c1: 14, r1: 3, c2: 22, r2: 24 } }] });
  }

  /* ═════════ 20. ҮНИЙН САНАЛ, НЭХЭМЖЛЭХ ═════════ */
  async function quote(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'Үнийн санал, нэхэмжлэх');
    guide(wb, 'Үнийн санал, нэхэмжлэх', [
      '«Тохиргоо» хуудсанд өөрийн байгууллагын нэр, регистр, хаяг, утас, банк, дансны дугаар, мөн бараа үйлчилгээний үнийн жагсаалтаа бичнэ.',
      '«Үнийн санал» хуудсанд харилцагчийн мэдээлэл, барааны кодыг сонгоход нэр, нэгж, үнэ автоматаар гарна. Тоо, хөнгөлөлтөө бичнэ.',
      '«Нэхэмжлэх» хуудас үнийн саналын мөрүүдийг автоматаар авч, төлбөрийн мэдээлэлтэй нэхэмжлэх болгоно. Хоёулаа A4-т багтаж хэвлэгдэнэ (File → Export → PDF).'
    ]);
    const Q = sheet(wb, 'Үнийн санал', { widths: [3, 6, 12, 32, 9, 9, 14, 9, 15, 3], tab: C.gold });
    const I = sheet(wb, 'Нэхэмжлэх', { widths: [3, 6, 12, 32, 9, 9, 14, 9, 15, 3], tab: C.gold });
    const T = sheet(wb, 'Тохиргоо', { widths: [24, 36, 4, 10, 30, 9, 14], tab: C.grey });
    title(T, 'Тохиргоо', 'Байгууллага, үнийн жагсаалт', 7);
    const CO = [['Байгууллагын нэр', 'Жишээ ХХК'], ['Регистр', '6123456'], ['Хаяг', 'Улаанбаатар, Сүхбаатар дүүрэг, 1-р хороо'], ['Утас', '7700-1234'], ['И-мэйл', 'info@example.mn'], ['Банк', 'Хаан банк'], ['Дансны дугаар', '5000 1234 56'], ['Данс эзэмшигч', 'Жишээ ХХК'], ['НӨАТ төлөгч эсэх', 'Тийм']];
    header(T, 4, ['Үзүүлэлт', 'Утга']);
    CO.forEach((c, i) => { const r = 5 + i; T.getCell('A' + r).value = c[0]; T.getCell('A' + r).border = box; T.getCell('B' + r).value = c[1]; inputCell(T.getCell('B' + r)); });
    listValidation(T.getCell('B13'), ['Тийм', 'Үгүй']);
    header(T, 4, ['Код', 'Бараа, үйлчилгээ', 'Нэгж', 'Үнэ (НӨАТ-гүй)'], 4);
    const items = [['S01', 'Санхүүгийн программ — жилийн эрх', 'жил', 1200000], ['S02', 'Нэвтрүүлэлт, тохиргоо', 'удаа', 800000], ['S03', 'Сургалт (2 цаг)', 'удаа', 250000], ['S04', 'НББ аутсорсинг', 'сар', 450000], ['S05', 'Захиалгат дашбоард', 'ш', 900000], ['P01', 'Ноутбук', 'ш', 2900000], ['P02', 'Принтер', 'ш', 750000]];
    for (let i = 0; i < 150; i++) { const r = 5 + i, x = items[i]; ['D', 'E', 'F', 'G'].forEach((c, j) => { const y = T.getCell(c + r); inputCell(y, j === 3 ? MONEY : null); if (x) y.value = x[j]; }); }
    const TS = S('Тохиргоо');
    const doc = (W, kind) => {
      const isQ = kind === 'q';
      W.mergeCells('B2:F2'); W.getCell('B2').value = { formula: `${TS}B5` }; W.getCell('B2').font = { bold: true, size: 15 };
      W.mergeCells('B3:F3'); W.getCell('B3').value = { formula: `"РД: "&${TS}B6&" · "&${TS}B7` }; W.getCell('B3').font = { size: 9, color: { argb: C.grey } };
      W.mergeCells('B4:F4'); W.getCell('B4').value = { formula: `"Утас: "&${TS}B8&" · "&${TS}B9` }; W.getCell('B4').font = { size: 9, color: { argb: C.grey } };
      W.mergeCells('G2:I2'); W.getCell('G2').value = isQ ? 'ҮНИЙН САНАЛ' : 'НЭХЭМЖЛЭХ'; W.getCell('G2').font = { bold: true, size: 18, color: { argb: C.goldD } }; W.getCell('G2').alignment = { horizontal: 'right' };
      const meta = isQ ? [['№', 'ҮС-2026-031'], ['Огноо', new Date(Date.UTC(2026, 10, 5))], ['Хүчинтэй', new Date(Date.UTC(2026, 10, 20))]] : [['№', 'НХ-2026-112'], ['Огноо', new Date(Date.UTC(2026, 10, 5))], ['Төлөх хугацаа', new Date(Date.UTC(2026, 10, 19))]];
      meta.forEach((m, i) => { const r = 3 + i; W.getCell('G' + r).value = m[0]; W.getCell('G' + r).alignment = { horizontal: 'right' }; W.getCell('G' + r).font = { size: 9, color: { argb: C.grey } }; W.mergeCells(`H${r}:I${r}`); const x = W.getCell('H' + r); x.value = m[1]; inputCell(x, i ? 'yyyy-mm-dd' : null); x.alignment = { horizontal: 'right' }; });
      W.getCell('B7').value = isQ ? 'Хэнд:' : 'Төлөгч:'; W.getCell('B7').font = { bold: true, color: { argb: C.goldD } };
      const cust = [['Байгууллага', 'Номин Холдинг ХХК'], ['Регистр', '2012345'], ['Хаяг', 'Улаанбаатар, Хан-Уул'], ['Холбоо барих', 'Б. Болд, 9911-2233']];
      cust.forEach((c, i) => { const r = 8 + i; W.getCell('B' + r).value = c[0]; W.mergeCells(`B${r}:C${r}`); W.getCell('B' + r).font = { size: 9, color: { argb: C.grey } }; W.mergeCells(`D${r}:F${r}`); const x = W.getCell('D' + r); if (isQ) { x.value = c[1]; inputCell(x); } else { x.value = { formula: `'Үнийн санал'!D${r}` }; } });
      header(W, 13, ['№', 'Код', 'Бараа, үйлчилгээ', 'Нэгж', 'Тоо', 'Нэгжийн үнэ', 'Хөнг. %', 'Дүн'], 2);
      const sample = [['S01', 1], ['S02', 1], ['S03', 3, 0.1], ['P01', 2]];
      for (let i = 0; i < 15; i++) { const r = 14 + i;
        W.getCell('B' + r).value = { formula: `IF(C${r}="","",${i + 1})` }; W.getCell('B' + r).border = box;
        if (isQ) { const c = W.getCell('C' + r); inputCell(c); listValidation(c, `${TS}$D$5:$D$154`); const s = sample[i]; if (s) c.value = s[0];
          W.getCell('D' + r).value = { formula: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${TS}$D$5:$G$154,2,FALSE),"?"))` }; W.getCell('E' + r).value = { formula: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${TS}$D$5:$G$154,3,FALSE),""))` };
          const q = W.getCell('F' + r); inputCell(q, '#,##0.##'); if (s) q.value = s[1];
          W.getCell('G' + r).value = { formula: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${TS}$D$5:$G$154,4,FALSE),0))` };
          const d = W.getCell('H' + r); inputCell(d, '0%'); if (s && s[2]) d.value = s[2]; }
        else { ['C', 'D', 'E', 'F', 'G', 'H'].forEach(c => { W.getCell(c + r).value = { formula: `IF('Үнийн санал'!${c}${r}="","",'Үнийн санал'!${c}${r})` }; }); W.getCell('H' + r).numFmt = '0%'; W.getCell('F' + r).numFmt = '#,##0.##'; }
        ['D', 'E', 'G'].forEach(c => W.getCell(c + r).border = box); W.getCell('G' + r).numFmt = MONEY;
        W.getCell('I' + r).value = { formula: `IF(C${r}="","",ROUND(N(F${r})*N(G${r})*(1-N(H${r})),0))` }; calcCell(W.getCell('I' + r), MONEY);
      }
      const t = [['Дүн', 'SUM(I14:I28)'], ['НӨАТ (10%)', `IF(${TS}$B$13="Тийм",ROUND(I29*0.1,0),0)`], ['НИЙТ', 'I29+I30']];
      t.forEach((x, i) => { const r = 29 + i; W.mergeCells(`G${r}:H${r}`); W.getCell('G' + r).value = x[0]; W.getCell('G' + r).alignment = { horizontal: 'right' }; W.getCell('I' + r).value = { formula: x[1] }; W.getCell('I' + r).numFmt = MONEY; W.getCell('I' + r).border = box; if (i === 2) { W.getCell('G' + r).font = { bold: true }; W.getCell('I' + r).font = { bold: true, size: 13 }; W.getCell('I' + r).fill = fill(C.goldL); } });
      if (isQ) { W.getCell('B33').value = 'Нөхцөл:'; W.getCell('B33').font = { bold: true }; W.mergeCells('C33:I34'); const n = W.getCell('C33'); n.value = 'Үнэ нь хүчинтэй хугацаанд хүчинтэй. Төлбөрийн нөхцөл: 50% урьдчилгаа, 50% хүлээлгэн өгөхөд. Хүргэлт: гэрээ байгуулснаас хойш 5 хоногт.'; inputCell(n); n.alignment = { wrapText: true, vertical: 'top' }; }
      else { W.getCell('B33').value = 'Төлбөр хүлээн авах данс:'; W.getCell('B33').font = { bold: true }; W.mergeCells('B34:I34'); W.getCell('B34').value = { formula: `${TS}B10&" · "&${TS}B11&" · "&${TS}B12` }; W.mergeCells('B35:I35'); W.getCell('B35').value = { formula: `"Гүйлгээний утга: "&H3` }; W.getCell('B35').font = { size: 9, color: { argb: C.grey } }; }
      W.getCell('B38').value = isQ ? 'Санал болгосон: ____________________' : 'Нягтлан бодогч: ____________________'; W.getCell('G38').value = isQ ? '' : 'Тамга'; 
      W.pageSetup = { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, printArea: 'B2:I39', margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.2, footer: 0.2 } };
    };
    doc(Q, 'q'); doc(I, 'i');
    I.getCell('H3').value = 'НХ-2026-112';
    return done(wb, JSZip, {});
  }

  /* ═════════ 21. ААНОАТ ═════════ */
  async function cit(ExcelJS, JSZip) {
    const wb = newBook(ExcelJS, 'ААНОАТ тооцоолуур');
    guide(wb, 'ААНОАТ тооцоолуур', [
      '«Тооцоо» хуудсанд улирал бүрийн орлого, хасагдах зардал, татвараас чөлөөлөгдөх орлогыг бичнэ. Өссөн дүнгээр татвар ногдох орлого, татвар, хөнгөлөлт, улирал бүрийн төлөх дүн бодогдоно.',
      'Жилийн борлуулалт 50 саяас бага бол хялбаршуулсан 1%-ийн горим, 1.5 тэрбумаас бага бол 90%-ийн хөнгөлөлт — хоёуланг нь автоматаар шалгаж, ердийн горимтой харьцуулна.',
      'Хувь хэмжээ, босго «Тохиргоо» хуудсанд (2026 он). 2027 оноос босго өөрчлөгдөх төлөвтэй — тэнд засна.'
    ], ['Энэ нь урьдчилсан тооцоо. Хасагдахгүй зардал, алдагдал шилжүүлэх хязгаар, салбарын онцгой зохицуулалт (ашигт малтмал, архи тамхи г.м. хөнгөлөлтөд хамаарахгүй) зэргийг татварын хууль, мэргэжлийн нягтлангаар баталгаажуулна уу.', 'Албан ёсны тайланг e-tax системээр илгээнэ.']);
    const W = sheet(wb, 'Тооцоо', { widths: [3, 44, 15, 15, 15, 15, 16], tab: C.gold });
    const T = sheet(wb, 'Тохиргоо', { widths: [46, 18, 44], tab: C.grey });
    title(T, 'Тохиргоо — 2026', 'ААНОАТ-ын хууль (2019)', 3); header(T, 4, ['Үзүүлэлт', 'Утга', 'Эх сурвалж']);
    const P = [['Шатлалын босго (жилийн ТНО)', 6e9, MONEY, '20.1'], ['Босго хүртэлх хувь', 0.10, PCT, '20.1'], ['Босгоос дээших хувь', 0.25, PCT, '20.1'], ['Хялбаршуулсан горимын борлуулалтын босго', 50e6, MONEY, '20.2.7 (2027-оос 400 сая — шалгана уу)'], ['Хялбаршуулсан горимын хувь (борлуулалтаас)', 0.01, PCT, '20.2.7'], ['90% хөнгөлөлтийн борлуулалтын босго', 1.5e9, MONEY, '22.1 (2027-оос 2.5 тэрбум — шалгана уу)'], ['Хөнгөлөлтийн хувь', 0.9, '0%', '22.1']];
    P.forEach((p, i) => { const r = 5 + i; T.getCell('A' + r).value = p[0]; T.getCell('A' + r).border = box; const v = T.getCell('B' + r); v.value = p[1]; inputCell(v, p[2]); T.getCell('C' + r).value = p[3]; T.getCell('C' + r).font = { size: 9, color: { argb: C.grey } }; });
    const TS = S('Тохиргоо');
    title(W, 'ААНОАТ — улирлын тооцоо (өссөн дүнгээр)', '', 7);
    W.getCell('B3').value = 'Он:'; W.getCell('B3').font = { bold: true }; inputCell(W.getCell('C3')); W.getCell('C3').value = 2026;
    W.getCell('D3').value = 'Хялбаршуулсан горим сонгох:'; W.mergeCells('D3:E3'); W.getCell('D3').alignment = { horizontal: 'right' }; inputCell(W.getCell('F3')); W.getCell('F3').value = 'Үгүй'; listValidation(W.getCell('F3'), ['Тийм', 'Үгүй']);
    header(W, 5, ['Үзүүлэлт (улирал бүрийн дүн)', 'I улирал', 'II улирал', 'III улирал', 'IV улирал', 'Жилийн дүн'], 2);
    const qc = ['C', 'D', 'E', 'F'];
    const inRows = [['Борлуулалтын орлого', [180e6, 210e6, 240e6, 260e6]], ['Бусад орлого (хүү, түрээс, ханшийн олз г.м.)', [2e6, 1.5e6, 3e6, 2.5e6]], ['Татвараас чөлөөлөгдөх орлого', [0, 0, 1e6, 0]], ['Хасагдах зардал', [150e6, 172e6, 196e6, 214e6]], ['Өмнөх оны алдагдал шилжүүлэх (хуулийн хязгаарт)', [3e6, 0, 0, 0]]];
    inRows.forEach(([l, v], i) => { const r = 6 + i; W.getCell('B' + r).value = l; W.getCell('B' + r).border = box; qc.forEach((c, k) => { const x = W.getCell(c + r); x.value = v[k]; inputCell(x, MONEY); }); W.getCell('G' + r).value = { formula: `SUM(C${r}:F${r})` }; calcCell(W.getCell('G' + r), MONEY); });
    let r = 12; W.getCell('B11').value = 'ЕРДИЙН ГОРИМ (өссөн дүнгээр)'; W.getCell('B11').font = { bold: true, color: { argb: C.goldD } };
    const cum = (row, k) => `SUM($C$${row}:${qc[k]}${row})`;
    const lines = [['Өссөн борлуулалт', k => cum(6, k)], ['Татвар ногдох орлого (өссөн)', k => `MAX(0,${cum(6, k)}+${cum(7, k)}-${cum(8, k)}-${cum(9, k)}-${cum(10, k)})`],
      ['Татвар (шатлалаар, өссөн)', k => `MIN(${qc[k]}13,${TS}$B$5)*${TS}$B$6+MAX(0,${qc[k]}13-${TS}$B$5)*${TS}$B$7`],
      ['90% хөнгөлөлт эрхтэй эсэх (жилийн борлуулалт)', k => `IF($G$6<=${TS}$B$10,"Тийм","Үгүй")`],
      ['Хөнгөлөлт (өссөн)', k => `IF(${qc[k]}15="Тийм",${qc[k]}14*${TS}$B$11,0)`],
      ['Төлөх татвар (өссөн)', k => `${qc[k]}14-${qc[k]}16`], ['Улиралд төлөх', k => k === 0 ? 'C17' : `${qc[k]}17-${qc[k - 1]}17`]];
    lines.forEach(([l, fn], i) => { const rr = 12 + i; W.getCell('B' + rr).value = l; W.getCell('B' + rr).border = box; qc.forEach((c, k) => { const x = W.getCell(c + rr); x.value = { formula: fn(k) }; calcCell(x, i === 3 ? null : MONEY); if (i === 3) x.alignment = { horizontal: 'center' }; }); });
    W.getCell('G18').value = { formula: 'SUM(C18:F18)' }; W.getCell('G18').numFmt = MONEY; totalRow(W, 18, 2, 7);
    W.getCell('B20').value = 'ХЯЛБАРШУУЛСАН ГОРИМ (1%)'; W.getCell('B20').font = { bold: true, color: { argb: C.goldD } };
    W.getCell('B21').value = 'Эрх (жилийн борлуулалт ≤ босго)'; W.getCell('C21').value = { formula: `IF($G$6<=${TS}$B$8,"Тийм","Үгүй")` }; W.getCell('C21').alignment = { horizontal: 'center' };
    W.getCell('B22').value = 'Татвар (борлуулалт × 1%)'; qc.forEach(c => { W.getCell(c + 22).value = { formula: `IF($C$21="Тийм",${c}6*${TS}$B$9,"")` }; calcCell(W.getCell(c + 22), MONEY); }); W.getCell('G22').value = { formula: 'IF($C$21="Тийм",SUM(C22:F22),"")' }; W.getCell('G22').numFmt = MONEY;
    W.getCell('B24').value = 'ДҮГНЭЛТ'; W.getCell('B24').font = { bold: true, color: { argb: C.goldD } };
    W.getCell('B25').value = 'Жилийн татвар — ердийн горим'; W.getCell('G25').value = { formula: 'G18' };
    W.getCell('B26').value = 'Жилийн татвар — хялбаршуулсан горим'; W.getCell('G26').value = { formula: 'IF(C21="Тийм",G22,"эрхгүй")' };
    W.getCell('B27').value = 'Үр ашигтай горим'; W.getCell('G27').value = { formula: `IF(C21<>"Тийм","Ердийн горим",IF(G22<G18,"Хялбаршуулсан (1%)","Ердийн горим"))` }; W.getCell('G27').font = { bold: true, color: { argb: C.green } };
    W.getCell('B28').value = 'Бодит татварын ачаалал (татвар / борлуулалт)'; W.getCell('G28').value = { formula: `IFERROR(IF(AND($F$3="Тийм",C21="Тийм"),G22,G18)/G6,0)` }; W.getCell('G28').numFmt = '0.00%';
    ['G25', 'G26'].forEach(a => { W.getCell(a).numFmt = MONEY; W.getCell(a).font = { bold: true }; });
    return done(wb, JSZip, { 'Тооцоо': [{ type: 'col', title: 'Улирал бүрийн төлөх татвар', cats: { ref: `'Тооцоо'!$C$5:$F$5`, vals: ['I', 'II', 'III', 'IV'] }, series: [{ name: 'Төлөх', ref: `'Тооцоо'!$C$18:$F$18`, vals: [] }], at: { c1: 1, r1: 30, c2: 7, r2: 48 } }] });
  }

  const payslip = (E, Z) => payroll(E, Z, true);
  const BUILD = { payroll, payslip, vat, fs, depr, cashflow, budget, inventory, sales, feasibility, aging, loan, homebudget, attendance, cashbook, costing, crm, gantt, kpi: kpiTpl, quote, cit };
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
