// Run with: node tests/scan.test.js
const assert = require('assert');
const S = require('../scan.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }
const today = new Date(2026, 9, 25);
const L = (arr) => arr.map((t) => (typeof t === 'string' ? { text: t, confidence: 92 } : t));
const brief = (rows) => rows.map((r) => [r.merchant, r.amount, r.date, r.flag].join(' | '));

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

test('Chase-style list: date headers, name and amount on one line, pending', () => {
  const rows = S.parseLines(L(['Available balance $2,481.10', 'Pending', 'Corner Market -$58.12', 'Oct 24, 2026', 'Taco Shack -$14.50', 'Shell -$38.00', 'Payroll deposit $1,600.00', 'Oct 23, 2026', 'Netflix.com -$15.49']), { today });
  assert.deepStrictEqual(brief(rows), [
    'Corner Market | 58.12 |  | ',
    'Taco Shack | 14.5 | 2026-10-24 | ',
    'Shell | 38 | 2026-10-24 | ',
    'Payroll deposit | 1600 | 2026-10-24 | Not a purchase?',
    'Netflix.com | 15.49 | 2026-10-23 | '
  ]);
  assert.strictEqual(rows[3].skip, true);
});

test('Bank of America-style: name on one line, amount on the next', () => {
  const rows = S.parseLines(L(['Processing', 'TARGET 00012345 MESA AZ', '-$45.67', '10/23/2026', 'SQ *TACO SHACK 4421 PHX AZ', '-14.50', 'Online Banking transfer to SAV 1234', '-$100.00']), { today });
  assert.deepStrictEqual(brief(rows), ['Target | 45.67 |  | ', 'Taco Shack | 14.5 | 2026-10-23 | ', 'Online Banking transfer to SAV | 100 | 2026-10-23 | Transfer?']);
});

test('Wells Fargo-style: date inside the row', () => {
  const rows = S.parseLines(L(['10/24 PURCHASE AUTHORIZED ON 10/23 WAL-MART #1234 $62.10', '10/22 ZELLE FROM JOHN SMITH $50.00']), { today });
  assert.strictEqual(rows[0].amount, 62.1);
  assert.strictEqual(rows[0].date, '2026-10-24');
  assert.strictEqual(rows[1].flag, 'Not a purchase?');
});

test('a long name that wraps onto the next line', () => {
  const rows = S.parseLines(L(['10/24 PURCHASE AUTHORIZED ON 10/23 $62.10', 'WAL-MART #1234', 'Pending', '10/23 DOLLAR GENERAL #4412 $18.40']), { today });
  assert.deepStrictEqual(rows.map((r) => r.merchant), ['Walmart', 'Dollar General']);
});

test('name and amount on one line, running balance and extra lines under it', () => {
  const rows = S.parseLines(L(['Checking (...1234)', 'Oct 21, 2026', 'TARGET -$14.26 >', '$82.69', 'soc SONIC DRIVE-IN -$3.86 >', 'A $156.81',
    'ONLINE TRANSFER FROM $80.00', '(3) SAV ...1111 TRANSACTION#:', '31299700000', '$160.67', 'Oct 20, 2026', 'VENMO PAYMENT -$82.00 >', '5] 1053800000000 WEB ID:', '3264600000', '$80.67',
    '»2ew STARBUCKS $3.19 >', 'A $435.87', '7 BREW COFFEE $5.09 >', '$409.24', 'H-E-B -$63.65 >', '$345.59', 'Split into 4 payments']), { today });
  assert.deepStrictEqual(rows.map((r) => [r.merchant, r.amount, r.date].join(' | ')), [
    'Target | 14.26 | 2026-10-21', 'Sonic Drive-in | 3.86 | 2026-10-21', 'Online Transfer From | 80 | 2026-10-21', 'Venmo | 82 | 2026-10-20',
    'Starbucks | 3.19 | 2026-10-20', '7 Brew Coffee | 5.09 | 2026-10-20', 'H-E-B | 63.65 | 2026-10-20']);
  assert.strictEqual(rows[2].skip, true);
});

test('pieces of one row read separately are joined left to right', () => {
  const at = (text, top, left) => ({ text, confidence: 91, top, left, height: 40 });
  const rows = S.parseLines([at('Oct 21, 2026', 700, 30), at('-$14.26', 916, 640), at('TARGET', 918, 160), at('$82.69', 1010, 160), at('-$29.00', 1240, 640), at('CORNER MARKET', 1242, 160), at('$96.95', 1288, 160)], { today });
  assert.deepStrictEqual(rows.map((r) => r.merchant + ' ' + r.amount), ['Target 14.26', 'Corner Market 29']);
});

test('low-confidence rows are flagged', () => {
  const rows = S.parseLines([{ text: 'Coffee Bar -$6.25', confidence: 48 }], { today });
  assert.strictEqual(rows[0].low, true);
});

test('dedupe across screenshots and saved rows', () => {
  const a = S.parseLines(L(['Oct 24', 'Taco Shack -$14.50', 'Shell -$38.00']), { today });
  const b = S.parseLines(L(['Oct 24', 'Shell -$38.00', 'Corner Market -$58.12']), { today });
  const saved = [S.rowKey(a[0])];
  assert.deepStrictEqual(S.dedupe(a.concat(b), saved).map((r) => r.merchant), ['Shell', 'Corner Market']);
});

console.log(passed + ' tests passed');
