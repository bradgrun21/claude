// Run with: node tests/core.test.js
const assert = require('assert');
const C = require('../core.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

// ---------- CSV formats modeled on common bank exports ----------
const chaseChecking = `Details,Posting Date,Description,Amount,Type,Balance,Check or Slip #
DEBIT,09/03/2026,"SQ *BLUE BOTTLE COFFEE 1234 OAKLAND CA",-6.50,DEBIT_CARD,1200.00,,
DEBIT,09/04/2026,"DOORDASH*CHIPOTLE SAN FRANCISCO CA",-31.40,DEBIT_CARD,1168.60,,
CREDIT,09/05/2026,"PAYROLL ACME INC",1600.00,ACH_CREDIT,2768.60,,
DEBIT,09/06/2026,"CHASE CREDIT CRD AUTOPAY",-250.00,ACH_DEBIT,2518.60,,
DEBIT,09/07/2026,"KROGER #1234",-62.15,DEBIT_CARD,2456.45,,`;

const chaseCard = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
09/02/2026,09/03/2026,NETFLIX.COM,Entertainment,Sale,-15.49,
09/05/2026,09/06/2026,AMZN Mktp US*2K4AB1C2D,Shopping,Sale,-38.99,
09/10/2026,09/10/2026,Payment Thank You-Mobile,,Payment,500.00,
09/12/2026,09/13/2026,STARBUCKS STORE 05521,Food & Drink,Sale,-5.75,`;

const capitalOne = `Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
2026-09-01,2026-09-02,1234,SHELL OIL 57444,Gas/Automotive,42.10,
2026-09-03,2026-09-04,1234,CAPITAL ONE AUTOPAY PYMT,Payment/Credit,,300.00
2026-09-08,2026-09-09,1234,"TST* RAISING CANES 123",Dining,14.20,`;

const appleCard = `Transaction Date,Clearing Date,Description,Merchant,Category,Type,Amount (USD),Purchased By
09/04/2026,09/05/2026,"UBER   *EATS PENDING",Uber Eats,Restaurants,Purchase,23.45,Jordan
09/06/2026,09/07/2026,"ACH DEPOSIT INTERNET TRANSFER",Payment,Payment,Payment,-200.00,Jordan
09/09/2026,09/10/2026,"TARGET 00012345",Target,Shopping,Purchase,46.80,Jordan`;

const creditUnion = `Account Name : Checking
Date,Description,Amount
9/1/26,"Rent - Oak Ridge Apartments","($1,300.00)"
9/2/26,"POS PURCHASE CHICK-FIL-A #0123",($9.85)
9/15/26,"Deposit Payroll",$1600.00`;

test('Chase-style checking: keeps purchases, drops deposits and card autopay', () => {
  const r = C.readTransactions(chaseChecking);
  assert.ok(!r.error, r.error);
  assert.deepStrictEqual(r.tx.map(t => t.merchant), ['Blue Bottle Coffee', 'DoorDash', 'Kroger']);
  assert.deepStrictEqual(r.tx.map(t => t.amount), [6.5, 31.4, 62.15]);
  assert.strictEqual(r.skipped, 1);
});
test('Chase-style card: negative purchases, payment skipped', () => {
  const r = C.readTransactions(chaseCard);
  assert.deepStrictEqual(r.tx.map(t => t.merchant), ['Netflix', 'Amazon', 'Starbucks']);
  assert.strictEqual(r.tx[1].amount, 38.99);
});
test('Capital One-style: separate Debit/Credit columns, ISO dates', () => {
  const r = C.readTransactions(capitalOne);
  assert.deepStrictEqual(r.tx.map(t => t.merchant), ['Shell Oil', 'Raising Canes']);
  assert.strictEqual(r.tx[0].date, '2026-09-01');
});
test('Apple Card-style: purchases are positive, so the sign flips', () => {
  const r = C.readTransactions(appleCard);
  assert.deepStrictEqual(r.tx.map(t => t.merchant), ['Uber Eats', 'Target']);
  assert.strictEqual(r.flipped, true);
});
test('Credit union: title row above the header, parentheses negatives, 2-digit years', () => {
  const r = C.readTransactions(creditUnion);
  assert.deepStrictEqual(r.tx.map(t => [t.date, t.amount]), [['2026-09-01', 1300], ['2026-09-02', 9.85]]);
  assert.strictEqual(r.tx[1].merchant, 'Chick-fil-A');
});
test('A file with no amount column gives a clear error', () => {
  assert.ok(C.readTransactions('Name,Notes\nfoo,bar').error);
});

// ---------- plan and snowball ----------
const profile = {
  paycheck: 1600, freq: 'semimonthly', nextPay: '2026-10-25', givingPct: 0, savings: 1200, fun: 200,
  bills: [{ name: 'Rent', amount: 1300 }, { name: 'Groceries', amount: 350 }, { name: 'Gas', amount: 220 }, { name: 'Phone & utilities', amount: 180 }],
  debts: [
    { id: 'a', name: 'Store card', bal: 850, min: 35, apr: 26 },
    { id: 'b', name: 'Buy now, pay later', bal: 420, min: 70, apr: 0 },
    { id: 'c', name: 'Credit card', bal: 3400, min: 102, apr: 24 }
  ],
  goals: []
};
test('Payday Plan gives every dollar a job', () => {
  const p = C.plan(profile);
  const used = p.rows.reduce((t, r) => t + r.amount, 0);
  assert.ok(Math.abs(used + p.extra - 1600) < 0.001);
  assert.ok(Math.abs(p.extra - (1600 - 650 - 175 - 110 - 90 - 100 - 207 / 2)) < 0.001);
});
test('Snowball pays the smallest balance first and finishes before minimums alone', () => {
  const o = C.outlook(profile, new Date(2026, 9, 19));
  assert.strictEqual(o.step, 2);
  assert.strictEqual(o.target.name, 'Buy now, pay later');
  assert.ok(o.debtFree < o.debtFreeMins, 'snowball should beat minimums');
});
test('Step 1 when savings are under $1,000', () => {
  const o = C.outlook(Object.assign({}, profile, { savings: 100 }), new Date(2026, 9, 19));
  assert.strictEqual(o.step, 1);
  assert.ok(o.cushion instanceof Date);
});
test('A small dream goal with slider money arrives sooner', () => {
  const withGoal = Object.assign({}, profile, { goals: [{ id: 'g', name: 'Concert', amount: 350, kind: 'dream', per: 60, saved: 0 }] });
  const g = C.outlook(withGoal, new Date(2026, 9, 19)).goals[0];
  assert.ok(g.ready < g.ready0, 'slider money should make a small goal sooner');
});
test('A big dream goal gains nothing from early money; it only delays debt-free', () => {
  const withGoal = Object.assign({}, profile, { goals: [{ id: 'g', name: 'Hawaii', amount: 2400, kind: 'dream', per: 60, saved: 0 }] });
  const o = C.outlook(withGoal, new Date(2026, 9, 19)), g = o.goals[0];
  assert.ok(g.ready >= g.ready0, 'the snowball funds it on the same schedule either way');
  assert.ok(o.debtFree > g.debtFree0, 'early money pushes debt-free later');
});
test('A missed payday rolls forward on schedule', () => {
  assert.strictEqual(C.rollPayday('2026-10-01', 'biweekly', new Date(2026, 9, 19)), '2026-10-29');
  assert.strictEqual(C.rollPayday('2026-10-25', 'weekly', new Date(2026, 9, 19)), '2026-10-25');
});

console.log(`\n${passed} tests passed`);
