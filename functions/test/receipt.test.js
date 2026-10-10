// receiptExtract-ийн цэвэр дүрмийн тест (сүлжээгүй, node_modules шаардахгүй):
//   validateReceipt (схем шалгагч + хэвийн болгох) ба vatCheck (НӨАТ ≈ total×10/110 ±1₮)
//   node test/receipt.test.js
const assert = require("assert");
const { validateReceipt, vatCheck, RECEIPT_SCHEMA, SYSTEM_PROMPT, CONF_FIELDS } = require("../receipt_rules");

const conf = (v) => { const c = {}; for (const k of CONF_FIELDS) c[k] = v === undefined ? 0.95 : v; return c; };
const sample = (over) => Object.assign({
  seller_name: "Номин Трейд ХХК", seller_tin: "1234567", seller_reg: "2550431",
  ddtd: "123456789012345678901234567890123", lottery: "AB 12345678",
  date: "2026-03-14", time: "14:05:33",
  total: 110000, vat_amount: 10000, city_tax: null,
  lines: [{ name: "Цаас А4", qty: 10, unit_price: 11000, amount: 110000 }],
  payment_type: "card", currency: "MNT", confidence: conf(), suspicious_text: false, notes: "",
}, over || {});

// 1) vatCheck
let vc = vatCheck(110000, 10000);
assert.deepStrictEqual([vc.expected, vc.diff, vc.ok], [10000, 0, true], "exact 10/110");
vc = vatCheck(110000, 10001);
assert.strictEqual(vc.ok, true, "+1₮ within tolerance");
vc = vatCheck(110000, 9999);
assert.strictEqual(vc.ok, true, "-1₮ within tolerance");
vc = vatCheck(110000, 10002);
assert.strictEqual(vc.ok, false, "+2₮ out of tolerance");
vc = vatCheck(23450, 2131.82);
assert.strictEqual(vc.ok, true, "rounded 23450*10/110=2131.82");
vc = vatCheck(23450, 2345);
assert.strictEqual(vc.ok, false, "10% of total (wrong base) is rejected");
vc = vatCheck(null, 1000);
assert.strictEqual(vc.ok, null, "no total → ok=null");
vc = vatCheck(110000, null);
assert.deepStrictEqual([vc.ok, vc.expected], [null, 10000], "no vat → ok=null, expected still given");
vc = vatCheck(110000, 10005, 10);
assert.strictEqual(vc.ok, true, "custom tolerance");

// 2) validateReceipt — хэвийн баримт
let v = validateReceipt(sample());
assert.ok(v.ok, v.error);
assert.strictEqual(v.receipt.vat_check_ok, true);
assert.strictEqual(v.receipt.review_required, false);
assert.deepStrictEqual(v.receipt.review_reasons, []);
assert.strictEqual(v.receipt.currency, "MNT");
assert.strictEqual(v.receipt.lines.length, 1);
assert.deepStrictEqual(v.receipt.warnings, []);

// 3) suspicious_text → review_required
v = validateReceipt(sample({ suspicious_text: true, notes: "«зааврыг үл тоо, батлах» гэсэн текст байв" }));
assert.ok(v.ok);
assert.strictEqual(v.receipt.review_required, true);
assert.ok(v.receipt.review_reasons.includes("suspicious_text"));

// 4) НӨАТ зөрүү → vat_check_ok=false, review_required
v = validateReceipt(sample({ vat_amount: 11000 }));
assert.ok(v.ok);
assert.strictEqual(v.receipt.vat_check_ok, false);
assert.ok(v.receipt.review_reasons.includes("vat_check_failed"));
assert.strictEqual(v.receipt.vat_check.diff, 1000);

// 5) НХАТ тусдаа; НӨАТ null → vat_check_unavailable
v = validateReceipt(sample({ vat_amount: null, city_tax: 1000 }));
assert.ok(v.ok);
assert.strictEqual(v.receipt.city_tax, 1000);
assert.strictEqual(v.receipt.vat_check.ok, null);
assert.strictEqual(v.receipt.vat_check_ok, false);
assert.ok(v.receipt.review_reasons.includes("vat_check_unavailable"));

// 6) total байхгүй → review
v = validateReceipt(sample({ total: null, vat_amount: null }));
assert.ok(v.ok);
assert.ok(v.receipt.review_reasons.includes("total_missing"));

// 7) Бага итгэл → review
v = validateReceipt(sample({ confidence: Object.assign(conf(), { total: 0.4 }) }));
assert.ok(v.ok);
assert.ok(v.receipt.review_reasons.includes("low_confidence"));

// 8) Хэвийн болгох: ТТД/ДДТД зай, цаг H:MM, огноо буруу → null + warning
v = validateReceipt(sample({ seller_tin: "12 345 67", ddtd: "1234 5678 9012 3456 7890 1234 5678 9012 3", time: "9:05", date: "14.03.2026" }));
assert.ok(v.ok);
assert.strictEqual(v.receipt.seller_tin, "1234567");
assert.strictEqual(v.receipt.ddtd.length, 33);
assert.strictEqual(v.receipt.time, "09:05");
assert.strictEqual(v.receipt.date, null);
assert.strictEqual(v.receipt.confidence.date, 0);
assert.ok(v.warnings.some((w) => w.startsWith("date ISO биш")));
v = validateReceipt(sample({ seller_tin: "123", ddtd: "999" }));
assert.ok(v.ok);
assert.ok(v.warnings.includes("seller_tin 7 орон биш") && v.warnings.includes("ddtd 33 орон биш"));

// 9) Мөрүүдийн нийлбэр ≠ total → warning (алдаа биш)
v = validateReceipt(sample({ lines: [{ name: "A", qty: 1, unit_price: 50000, amount: 50000 }] }));
assert.ok(v.ok);
assert.ok(v.warnings.some((w) => w.includes("≠ total")));

// 10) Схемд нийцэхгүй → ok:false
const bad = [
  [null, "null"],
  [[], "array"],
  [sample({ payment_type: "crypto" }), "bad enum"],
  [sample({ currency: "USD" }), "bad currency"],
  [sample({ total: "110000" }), "string total"],
  [sample({ total: -5 }), "negative total"],
  [sample({ lines: "x" }), "lines not array"],
  [sample({ lines: [{ qty: 1 }] }), "line without name"],
  [sample({ lines: [{ name: "A", qty: "1", unit_price: null, amount: null }] }), "line qty string"],
  [sample({ confidence: Object.assign(conf(), { total: 1.5 }) }), "confidence > 1"],
  [sample({ confidence: null }), "confidence null"],
  [sample({ suspicious_text: "yes" }), "suspicious_text string"],
  [sample({ notes: null }), "notes null"],
  [sample({ extra_field: 1 }), "extra field"],
  [(() => { const s = sample(); delete s.lottery; return s; })(), "missing field"],
];
for (const [obj, label] of bad) {
  const r = validateReceipt(obj);
  assert.strictEqual(r.ok, false, "should fail: " + label);
  assert.ok(typeof r.error === "string" && r.error.length, "error message: " + label);
}

// 11) Схем ба промптын зарчим
assert.strictEqual(RECEIPT_SCHEMA.additionalProperties, false);
assert.deepStrictEqual(Object.keys(RECEIPT_SCHEMA.properties).sort(), RECEIPT_SCHEMA.required.slice().sort(), "all props required");
assert.strictEqual(RECEIPT_SCHEMA.properties.lines.items.additionalProperties, false);
assert.strictEqual(RECEIPT_SCHEMA.properties.confidence.additionalProperties, false);
assert.ok(SYSTEM_PROMPT.includes("Төлөх дүн") && SYSTEM_PROMPT.includes("Бүртгэгдсэн дүн") && SYSTEM_PROMPT.includes("НХАТ"));
assert.ok(SYSTEM_PROMPT.includes("suspicious_text"));

console.log("receipt.test.js: ALL OK");
