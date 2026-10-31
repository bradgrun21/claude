// Typed purchases and repeat checks (entry.js): node tests/entry.test.js
const assert = require('assert');
const S = require('../entry.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }
const today = new Date(2026, 9, 25);

test('clean merchant names', () => {
  assert.strictEqual(S.cleanName('SQ *TACO SHACK 4421 PHX AZ'), 'Taco Shack');
  assert.strictEqual(S.cleanName('TST* PIZZA PALACE #12'), 'Pizza Palace');
  assert.strictEqual(S.cleanName('Starbucks'), 'Starbucks');
  assert.strictEqual(S.cleanName('Corner Market 0231'), 'Corner Market');
  assert.strictEqual(S.cleanName('DEBIT CARD PURCHASE SHELL OIL 57444 MESA AZ'), 'Shell Oil');
});
test('amounts and dates', () => {
  assert.deepStrictEqual(S.findAmounts('Target -$1,234.56').map((a) => [a.value, a.minus]), [[1234.56, true]]);
  assert.deepStrictEqual(S.findAmounts('Payroll +$800.00').map((a) => a.plus), [true]);
  assert.strictEqual(S.findDate('Oct 24', today).iso, '2026-10-24');
  assert.strictEqual(S.findDate('Friday, October 23, 2026', today).iso, '2026-10-23');
  assert.strictEqual(S.findDate('10/22', today).iso, '2026-10-22');
  assert.strictEqual(S.findDate('Today', today).iso, '2026-10-25');
  assert.strictEqual(S.findDate('Yesterday', today).iso, '2026-10-24');
  assert.strictEqual(S.findDate('Dec 30', today).iso, '2025-12-30');
});
test('purchases typed in one line (the chat tries this first, with no AI)', () => {
  const r = S.parseTyped('coffee 5, gas $50 yesterday; Target 23.40 on Friday\nH-E-B $61.15 10/24, kids shoes 1,200', today);
  assert.deepStrictEqual(r.map((x) => [x.merchant, x.amount, x.date]), [
    ['Coffee', 5, '2026-10-25'], ['Gas', 50, '2026-10-24'], ['Target', 23.4, '2026-10-23'], ['H-E-B', 61.15, '2026-10-24'], ['Kids Shoes', 1200, '2026-10-25']]);
  assert.deepStrictEqual(S.parseTyped('just words, , 0', today), []);
  const s = S.parseTyped('Sonic 12 yesterday', today);
  assert.deepStrictEqual(s.map((x) => [x.merchant, x.amount, x.date]), [['Sonic', 12, '2026-10-24']]);
});
test('dedupe across snaps and saved rows', () => {
  const a = [{ date: '2026-10-24', amount: 14.5, merchant: 'Taco Shack' }, { date: '2026-10-24', amount: 38, merchant: 'Shell' }];
  const b = [{ date: '2026-10-24', amount: 38, merchant: 'Shell' }, { date: '2026-10-24', amount: 58.12, merchant: 'Corner Market' }];
  const saved = [S.rowKey(a[0])];
  assert.deepStrictEqual(S.dedupe(a.concat(b), saved).map((r) => r.merchant), ['Shell', 'Corner Market']);
});
console.log(`\n${passed} tests passed`);
