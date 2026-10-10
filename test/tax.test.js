// node test/tax.test.js — tax.js-ийн параметр, тооцоо хуучин (2026) томьёотой яг таарах эсэх
const assert = require('assert');
const T = require('../tax.js');
const D = '2026-06-01';
// Хуучин томьёонууд (payroll.html / converter / journal-д байсан)
const oldTier = k => k <= 0 ? 0 : k <= 120e6 ? k * 0.10 : k <= 180e6 ? 12e6 + (k - 120e6) * 0.15 : 21e6 + (k - 180e6) * 0.20;
const oldCredit = o => o <= 5e5 ? 20000 : o <= 1e6 ? 18000 : o <= 1.5e6 ? 16000 : o <= 2e6 ? 14000 : o <= 2.5e6 ? 12000 : o <= 3e6 ? 10000 : 0;
const oldCit = b => b <= 0 ? 0 : b <= 6e9 ? Math.round(b * 0.10 * 100) / 100 : Math.round((6e8 + (b - 6e9) * 0.25) * 100) / 100;
let n = 0;
for (const k of [0, 1, 500000, 1200000, 3000000, 119999999, 120000000, 120000001, 150e6, 180e6, 250e6]) { assert.strictEqual(T.hhoatAnnual(k, D), oldTier(k), 'tier ' + k); n++; }
for (const o of [0, 500000, 500001, 1e6, 1500000, 2e6, 2500000, 3e6, 3000001, 9e6]) { assert.strictEqual(T.hhoatMonthlyCredit(o, D), oldCredit(o), 'credit ' + o); n++; }
for (const b of [0, -5, 1e6, 6e9, 6e9 + 1, 1e10]) { assert.strictEqual(T.cit(b, D, 'standard'), oldCit(b), 'cit ' + b); n++; }
assert.strictEqual(T.cit(1e8, D, 'simple1'), 1e6); n++;
assert.strictEqual(T.ndshEmployee('01001', D), 11.5); assert.strictEqual(T.ndshEmployee('22011', D), 0.8); assert.strictEqual(T.ndshEmployee('70001', D), 9.3); assert.strictEqual(T.ndshEmployee('', D, 13), 13); n += 4;
assert.strictEqual(T.ndshEmployer(D, 1), 12.5); assert.strictEqual(T.ndshEmployer(D, 3), 14.5); n += 2;
assert.strictEqual(T.get('vat.rate', D), 10); assert.strictEqual(T.get('vat.registration_threshold', D), 50e6); assert.strictEqual(T.get('vat.registration_threshold', '2027-01-01'), 400e6); n += 3;
assert.strictEqual(T.hhoatTierNo(100, D), 1); assert.strictEqual(T.hhoatTierNo(150e6, D), 2); assert.strictEqual(T.hhoatTierNo(190e6, D), 3); n += 3;
assert.strictEqual(T.hhoatMonthly(700000, D), 70000); assert.strictEqual(T.hhoatMonthly(700000, '2027-02-01'), 0); assert.strictEqual(T.hhoatMonthly(800000, '2027-02-01'), 80000); n += 3;
assert.strictEqual(T.pending(D).length, 0); assert.ok(T.pending('2027-01-01').length >= 4); assert.strictEqual(T.banner(D), ''); assert.ok(T.banner('2027-03-01').includes('баталгаажаагүй')); n += 4;
assert.strictEqual(T.iso('2026-03'), '2026-03-01'); assert.strictEqual(T.iso('2027'), '2027-01-01'); n += 2;
assert.throws(() => T.get('vat.rate', '2010-01-01'), /хүчингүй/); assert.throws(() => T.get('nope', D), /байхгүй/); n += 2;
// Мөр бүр бүрэн талбартай, огноо хоорондоо давхцахгүй
const byKey = {}; for (const p of T.PARAMS) { for (const f of ['key','label','value','valid_from','source','citation']) assert.ok(p[f] !== undefined && p[f] !== '', p.key + ' missing ' + f); assert.ok(typeof p.verified === 'boolean'); (byKey[p.key] = byKey[p.key] || []).push(p); }
for (const [k, rs] of Object.entries(byKey)) { rs.sort((a, b) => a.valid_from.localeCompare(b.valid_from)); for (let i = 1; i < rs.length; i++) assert.ok(rs[i - 1].valid_to && rs[i - 1].valid_to < rs[i].valid_from, k + ' overlapping periods'); }
n++;
console.log('tax.test.js: ' + n + ' шалгалт OK');
