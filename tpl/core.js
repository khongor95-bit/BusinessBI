/* ============================================================
   tpl/core.js — BusinessBI Excel загварын нийтлэг хэрэгсэл
   ExcelJS (нүд, хэв маяг, томьёо) + JSZip (Excel-ийн жинхэнэ график шигтгэх).
   Хөтөч болон Node хоёуланд ажиллана:  BBITplCore / require('./core.js')
   ============================================================ */
(function (root) {
  'use strict';
  const C = {
    ink: 'FF171717', gold: 'FFC9A470', goldD: 'FF9A7A3F', goldL: 'FFFDF8EC', cream: 'FFF6EFDD',
    line: 'FFE5E7EB', grey: 'FF6B7280', bg: 'FFF5F7FA', white: 'FFFFFFFF', input: 'FFFFF4D6',
    green: 'FF16A34A', red: 'FFDC2626', head: 'FF171717', sub: 'FF374151'
  };
  const PAL = ['#c9a470', '#171717', '#8a6d3b', '#9ca3af', '#e3cfa6', '#4b5563', '#b45309', '#d6d3d1'];
  const MONEY = '#,##0', MONEY2 = '#,##0.00', PCT = '0.0%';
  const MONTHS = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
  const S = n => `'${n}'!`;
  const fill = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
  const thin = { style: 'thin', color: { argb: C.line } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const colL = n => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }; // 0 → A

  function newBook(ExcelJS, title) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BusinessBI.mn'; wb.company = 'BusinessBI.mn'; wb.title = title; wb.created = new Date();
    wb.calcProperties = { fullCalcOnLoad: true };
    return wb;
  }
  function sheet(wb, name, opt) {
    opt = opt || {};
    const ws = wb.addWorksheet(name, { views: [{ showGridLines: false, state: opt.freeze ? 'frozen' : 'normal', ySplit: opt.freeze || 0, xSplit: opt.xFreeze || 0, zoomScale: opt.zoom || 100 }], properties: { tabColor: opt.tab ? { argb: opt.tab } : undefined } });
    if (opt.widths) opt.widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
    return ws;
  }
  // Гарчиг: 1-р мөр том нэр, 2-р мөр тайлбар
  function title(ws, text, sub, lastCol) {
    const L = colL((lastCol || 8) - 1);
    ws.mergeCells(`A1:${L}1`); ws.mergeCells(`A2:${L}2`);
    const a = ws.getCell('A1'); a.value = text; a.font = { bold: true, size: 18, color: { argb: C.ink } }; a.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 32;
    const b = ws.getCell('A2'); b.value = sub || ''; b.font = { size: 10, color: { argb: C.grey } };
    ws.getRow(3).height = 8;
  }
  function header(ws, row, labels, startCol) {
    const c0 = startCol || 1;
    labels.forEach((t, i) => {
      const c = ws.getRow(row).getCell(c0 + i); c.value = t;
      c.font = { bold: true, color: { argb: C.white }, size: 10 }; c.fill = fill(C.head);
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; c.border = box;
    });
    ws.getRow(row).height = 30;
  }
  function inputCell(c, fmt) { c.fill = fill(C.input); c.border = box; if (fmt) c.numFmt = fmt; }
  function calcCell(c, fmt) { c.border = box; if (fmt) c.numFmt = fmt; }
  function totalRow(ws, row, c1, c2) { for (let c = c1; c <= c2; c++) { const x = ws.getRow(row).getCell(c); x.font = { bold: true, color: { argb: C.ink } }; x.fill = fill(C.goldL); x.border = { top: { style: 'thin', color: { argb: C.gold } }, bottom: { style: 'double', color: { argb: C.gold } }, left: thin, right: thin }; } }
  function note(ws, cellRef, text, merge) {
    if (merge) ws.mergeCells(merge);
    const c = ws.getCell(cellRef); c.value = text; c.font = { italic: true, size: 9, color: { argb: C.grey } }; c.alignment = { wrapText: true, vertical: 'top' };
  }
  function kpi(ws, r, c, label, formula, fmt, result) {
    // 3 мөр өндөр, 2 багана өргөн карт
    const L1 = colL(c - 1), L2 = colL(c);
    ws.mergeCells(`${L1}${r}:${L2}${r}`); ws.mergeCells(`${L1}${r + 1}:${L2}${r + 1}`);
    const a = ws.getCell(`${L1}${r}`); a.value = label; a.font = { size: 9, color: { argb: C.grey } }; a.alignment = { indent: 1, vertical: 'bottom' };
    const b = ws.getCell(`${L1}${r + 1}`); b.value = { formula, result }; b.numFmt = fmt || MONEY; b.font = { bold: true, size: 18, color: { argb: C.ink } }; b.alignment = { indent: 1, horizontal: 'left', vertical: 'middle' };
    for (let rr = r; rr <= r + 1; rr++) for (let cc = c; cc <= c + 1; cc++) { const x = ws.getRow(rr).getCell(cc); x.fill = fill(C.white); x.border = { top: rr === r ? thin : undefined, bottom: rr === r + 1 ? { style: 'medium', color: { argb: C.gold } } : undefined, left: cc === c ? thin : undefined, right: cc === c + 1 ? thin : undefined }; }
    ws.getRow(r).height = 18; ws.getRow(r + 1).height = 30;
  }
  function guide(wb, name, lines, extra) {
    const ws = sheet(wb, 'Заавар', { widths: [3, 26, 90], tab: C.gold });
    ws.getColumn(1).width = 3;
    ws.mergeCells('B2:C2'); const t = ws.getCell('B2'); t.value = name; t.font = { bold: true, size: 22, color: { argb: C.ink } }; ws.getRow(2).height = 36;
    ws.mergeCells('B3:C3'); const s = ws.getCell('B3'); s.value = 'BusinessBI.mn — Монголын нягтлан, бизнест зориулсан Excel загвар'; s.font = { size: 10, color: { argb: C.goldD } };
    let r = 5;
    const sec = (h) => { ws.mergeCells(`B${r}:C${r}`); const c = ws.getCell(`B${r}`); c.value = h; c.font = { bold: true, size: 12, color: { argb: C.ink } }; c.border = { bottom: { style: 'thin', color: { argb: C.gold } } }; r++; };
    sec('Хэрхэн ашиглах вэ');
    lines.forEach((l, i) => { ws.getCell(`B${r}`).value = (i + 1) + '.'; ws.getCell(`B${r}`).alignment = { horizontal: 'right', vertical: 'top' }; const c = ws.getCell(`C${r}`); c.value = l; c.alignment = { wrapText: true, vertical: 'top' }; ws.getRow(r).height = Math.max(18, Math.ceil(l.length / 95) * 16); r++; });
    r++;
    sec('Нүдний өнгө');
    const leg = ws.getCell(`B${r}`); leg.value = 'Шар нүд'; leg.fill = fill(C.input); leg.border = box; ws.getCell(`C${r}`).value = 'Таны оруулах мэдээлэл (жишээ дата бөглөсөн — өөрийнхөөрөө солино).'; r++;
    const leg2 = ws.getCell(`B${r}`); leg2.value = 'Цагаан нүд'; leg2.border = box; ws.getCell(`C${r}`).value = 'Томьёогоор автоматаар бодогдоно — засах шаардлагагүй.'; r++;
    const leg3 = ws.getCell(`B${r}`); leg3.value = 'Нийт'; leg3.fill = fill(C.goldL); leg3.border = box; ws.getCell(`C${r}`).value = 'Дүн, нийлбэр.'; r++;
    if (extra && extra.length) { r++; sec('Анхаарах'); extra.forEach(l => { ws.mergeCells(`B${r}:C${r}`); const c = ws.getCell(`B${r}`); c.value = '• ' + l; c.alignment = { wrapText: true, vertical: 'top' }; ws.getRow(r).height = Math.max(18, Math.ceil(l.length / 110) * 16); r++; }); }
    r++;
    ws.mergeCells(`B${r}:C${r}`); const f = ws.getCell(`B${r}`); f.value = '© BusinessBI.mn · Энэ загварыг худалдан авсан нэг байгууллага дотор ашиглана. Бусдад дахин зарах, тараахыг хориглоно. Асуулт: hello@businessbi.mn'; f.font = { size: 9, color: { argb: C.grey } }; f.alignment = { wrapText: true }; ws.getRow(r).height = 28;
    return ws;
  }
  function listValidation(cell, list) { cell.dataValidation = { type: 'list', allowBlank: true, formulae: [Array.isArray(list) ? '"' + list.join(',') + '"' : list], showErrorMessage: true }; }

  /* ── Excel-ийн жинхэнэ график (DrawingML) ─────────────────── */
  const X = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const hex = c => c.replace('#', '').toUpperCase();
  const txPr = (sz, color, bold) => `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${sz}"${bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="mn-MN"/></a:p></c:txPr>`;
  function cache(ref, vals, num) {
    const pts = (vals || []).map((v, i) => `<c:pt idx="${i}"><c:v>${X(num ? (+v || 0) : v)}</c:v></c:pt>`).join('');
    return num ? `<c:numRef><c:f>${X(ref)}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${(vals || []).length}"/>${pts}</c:numCache></c:numRef>`
      : `<c:strRef><c:f>${X(ref)}</c:f><c:strCache><c:ptCount val="${(vals || []).length}"/>${pts}</c:strCache></c:strRef>`;
  }
  const dLbls = (pos, pct) => `<c:dLbls><c:numFmt formatCode="${pct ? '0%' : '#,##0'}" sourceLinked="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr(800, '374151')}${pos ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="${pct ? 0 : 1}"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="${pct ? 1 : 0}"/><c:showBubbleSize val="0"/>${pct ? '<c:showLeaderLines val="1"/>' : ''}</c:dLbls>`;
  function axes(catPos, valPos, reverse) {
    return `<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="${reverse ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${catPos}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill></a:ln></c:spPr>${txPr(800, '374151')}<c:crossAx val="5002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
      `<c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${valPos}"/><c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="EEF0F3"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr>${txPr(800, '6B7280')}<c:crossAx val="5001"/><c:crosses val="${reverse ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx>`;
  }
  // spec: {type:'col'|'bar'|'line'|'doughnut', title, cats:{ref,vals}, series:[{name,ref,vals,color}], labels:bool}
  function chartXml(o) {
    const title = `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1100" b="1"/></a:pPr><a:r><a:rPr lang="mn-MN" sz="1100" b="1"><a:solidFill><a:srgbClr val="111827"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${X(o.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`;
    const cat = `<c:cat>${cache(o.cats.ref, o.cats.vals, false)}</c:cat>`;
    const fillC = c => `<a:solidFill><a:srgbClr val="${hex(c)}"/></a:solidFill>`;
    const multi = o.series.length > 1;
    let plot = '', legend = '';
    if (o.type === 'line') {
      const ser = o.series.map((s, i) => { const col = s.color || PAL[i]; return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${X(s.name)}</c:v></c:tx><c:spPr><a:ln w="31750" cap="rnd">${fillC(col)}<a:round/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="15875">${fillC(col)}</a:ln></c:spPr></c:marker>${cat}<c:val>${cache(s.ref, s.vals, true)}</c:val><c:smooth val="0"/></c:ser>`; }).join('');
      plot = `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:axId val="5001"/><c:axId val="5002"/></c:lineChart>` + axes('b', 'l');
    } else if (o.type === 'bar' || o.type === 'col') {
      const h = o.type === 'bar';
      const ser = o.series.map((s, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${X(s.name)}</c:v></c:tx><c:spPr>${fillC(s.color || PAL[i])}<a:ln><a:noFill/></a:ln></c:spPr><c:invertIfNegative val="0"/>${o.labels === false || multi ? '' : dLbls('outEnd')}${cat}<c:val>${cache(s.ref, s.vals, true)}</c:val></c:ser>`).join('');
      plot = `<c:barChart><c:barDir val="${h ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="${multi ? 60 : 70}"/>${multi ? '<c:overlap val="-10"/>' : ''}<c:axId val="5001"/><c:axId val="5002"/></c:barChart>` + axes(h ? 'l' : 'b', h ? 'b' : 'l', h);
    } else {
      const s = o.series[0];
      const dpt = (s.vals || []).map((_, i) => `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr>${fillC(PAL[i % PAL.length])}<a:ln w="25400"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:dPt>`).join('');
      plot = `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>${X(s.name)}</c:v></c:tx>${dpt}${dLbls('', true)}${cat}<c:val>${cache(s.ref, s.vals, true)}</c:val></c:ser><c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`;
    }
    if (multi || o.type === 'doughnut') legend = `<c:legend><c:legendPos val="${o.type === 'doughnut' ? 'r' : 'b'}"/><c:overlay val="0"/>${txPr(800, '374151')}</c:legend>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:roundedCorners val="0"/><c:chart>${title}<c:plotArea><c:layout/>${plot}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr><a:latin typeface="Calibri"/></a:defRPr></a:pPr><a:endParaRPr lang="mn-MN"/></a:p></c:txPr></c:chartSpace>`;
  }
  const anchor = (i, a, rid) => `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${a.c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${a.c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 2}" name="Chart ${i + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rid}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;

  // charts: { <sheetIndex 1-based>: [spec + {at:{c1,r1,c2,r2}} (0-based)] }
  async function finish(wb, JSZip, charts) {
    // Фонт заагаагүй нүдэнд Calibri (LibreOffice / Mac Numbers serif болгохоос сэргийлнэ)
    wb.eachSheet(ws => ws.eachRow({ includeEmpty: false }, row => row.eachCell({ includeEmpty: false }, c => { const f = c.font || {}; if (!f.name) c.font = Object.assign({}, f, { name: 'Calibri', size: f.size || 11 }); })));
    const buf = await wb.xlsx.writeBuffer();
    const keys = Object.keys(charts || {}).filter(k => charts[k] && charts[k].length);
    if (!keys.length) return new Uint8Array(buf);
    const zip = await JSZip.loadAsync(buf);
    let ct = await zip.file('[Content_Types].xml').async('string');
    let n = 0, overrides = '';
    for (const k of keys) {
      const list = charts[k], d = 'Bbi' + k;
      const sp = `xl/worksheets/sheet${k}.xml`, rp = `xl/worksheets/_rels/sheet${k}.xml.rels`;
      let sx = await zip.file(sp).async('string');
      const m = sx.match(/<(legacyDrawing|legacyDrawingHF|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b/);
      const tag = `<drawing r:id="rId${d}"/>`;
      sx = m ? sx.replace(m[0], tag + m[0]) : sx.replace('</worksheet>', tag + '</worksheet>');
      if (!/xmlns:r=/.test(sx.slice(0, 800))) sx = sx.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
      zip.file(sp, sx);
      const rel = `<Relationship Id="rId${d}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${d}.xml"/>`;
      const ex = zip.file(rp);
      if (ex) zip.file(rp, (await ex.async('string')).replace('</Relationships>', rel + '</Relationships>'));
      else zip.file(rp, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rel}</Relationships>`);
      const anchors = [], drels = [];
      list.forEach((c, i) => { n++; const rid = 'rIdC' + n; anchors.push(anchor(i, c.at, rid)); drels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chartBbi${n}.xml"/>`); zip.file(`xl/charts/chartBbi${n}.xml`, chartXml(c)); overrides += `<Override PartName="/xl/charts/chartBbi${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`; });
      zip.file(`xl/drawings/drawing${d}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">${anchors.join('')}</xdr:wsDr>`);
      zip.file(`xl/drawings/_rels/drawing${d}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${drels.join('')}</Relationships>`);
      overrides += `<Override PartName="/xl/drawings/drawing${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
    }
    zip.file('[Content_Types].xml', ct.replace('</Types>', overrides + '</Types>'));
    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }
  // Тогтмол санамсаргүй тоо (жишээ дата үргэлж ижил)
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

  const api = { C, PAL, MONEY, MONEY2, PCT, MONTHS, S, fill, thin, box, colL, newBook, sheet, title, header, inputCell, calcCell, totalRow, note, kpi, guide, listValidation, finish, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.BBITplCore = api;
})(typeof self !== 'undefined' ? self : this);
