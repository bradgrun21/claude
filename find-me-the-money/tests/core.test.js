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

// ---------- streaks and wins ----------
test('A check-in counts from the day before payday', () => {
  assert.strictEqual(C.paydayFor('2026-10-25', 'biweekly', new Date(2026, 9, 23)), null);
  assert.strictEqual(C.paydayFor('2026-10-25', 'biweekly', new Date(2026, 9, 24)), '2026-10-25');
  assert.strictEqual(C.paydayFor('2026-10-25', 'biweekly', new Date(2026, 10, 9)), '2026-11-08');
});
test('On-time paydays build the streak; every 4th earns a grace pass; milestones fire', () => {
  let st = {}, r, day = new Date(2026, 9, 25);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const pd = C.isoDay(C.addDays(day, i * 14));
    r = C.applyCheckin(st, pd, pd, 'biweekly'); st = r.st;
    if (r.out.milestone) seen.push(r.out.milestone);
    if (i === 3) assert.ok(r.out.earnedGrace, 'grace pass at 4');
  }
  assert.strictEqual(st.count, 6); assert.strictEqual(st.grace, 1); assert.deepStrictEqual(seen, [3, 6]);
});
test('A missed payday uses the grace pass instead of breaking the streak', () => {
  const st = { count: 4, best: 4, grace: 1, lastPayday: '2026-10-25' };
  const r = C.applyCheckin(st, '2026-11-22', '2026-11-22', 'biweekly');
  assert.strictEqual(r.out.usedGrace, 1); assert.strictEqual(r.st.count, 5); assert.strictEqual(r.st.grace, 0);
});
test('Missing a payday with no grace pass starts a new streak (best is kept)', () => {
  const r = C.applyCheckin({ count: 5, best: 5, grace: 0, lastPayday: '2026-10-25' }, '2026-11-22', '2026-11-23', 'biweekly');
  assert.ok(r.out.broke); assert.strictEqual(r.st.count, 1); assert.strictEqual(r.st.best, 5);
});
test('Checking in twice for the same payday does not double count', () => {
  const r = C.applyCheckin({ count: 2, best: 2, grace: 0, lastPayday: '2026-10-25' }, '2026-10-25', '2026-10-26', 'biweekly');
  assert.ok(r.repeat); assert.strictEqual(r.st.count, 2);
});
test('Streak view: active, due, then paused after the window closes', () => {
  const st = { count: 3, best: 3, grace: 0, lastPayday: '2026-10-11' };
  assert.strictEqual(C.streakView(st, '2026-10-25', 'biweekly', new Date(2026, 9, 19)).state, 'active');
  assert.strictEqual(C.streakView(st, '2026-10-25', 'biweekly', new Date(2026, 9, 25)).state, 'due');
  const v = C.streakView(st, '2026-10-25', 'biweekly', new Date(2026, 9, 28));
  assert.strictEqual(v.state, 'paused'); assert.strictEqual(v.count, 0); assert.strictEqual(v.best, 3);
});
test('Wins: debt paid down and money saved since the last check-in', () => {
  const w = C.winsBetween({ debts: { a: 850, b: 420 }, savings: 400, goals: { g: 0 } }, { debts: { a: 800, b: 0, c: 300 }, savings: 650, goals: { g: 30 } });
  assert.strictEqual(w.debtPaid, 470); assert.strictEqual(w.saved, 280);
});

// ---------- challenges and milestones ----------
const day = (m, d) => new Date(2026, m - 1, d);
test('Daily challenge: done after all 7 days are marked, missed if the window passes', () => {
  const marks = [...Array(7)].map((_, i) => C.isoDay(C.addDays(day(10, 19), i)));
  assert.strictEqual(C.challengeStatus({ id: 'cook7', start: '2026-10-19', marks }, day(10, 25)).state, 'done');
  const half = C.challengeStatus({ id: 'cook7', start: '2026-10-19', marks: marks.slice(0, 3) }, day(10, 21));
  assert.strictEqual(half.state, 'active'); assert.strictEqual(half.label, '3 of 7 days'); assert.strictEqual(half.dots.length, 7);
  assert.strictEqual(C.challengeStatus({ id: 'cook7', start: '2026-10-19', marks: marks.slice(0, 3) }, day(10, 28)).state, 'missed');
});
test('Clean challenge counts the days and reports a slip honestly', () => {
  assert.strictEqual(C.challengeStatus({ id: 'nofees30', start: '2026-10-01' }, day(10, 11)).label, 'Day 11 of 30');
  assert.strictEqual(C.challengeStatus({ id: 'nofees30', start: '2026-10-01' }, day(11, 1)).state, 'done');
  const s = C.challengeStatus({ id: 'nofees30', start: '2026-10-01', slipped: '2026-10-13' }, day(10, 14));
  assert.strictEqual(s.state, 'slipped'); assert.strictEqual(s.label, '12 clean days');
});
test('Count, amount, once and cushion challenges', () => {
  assert.strictEqual(C.challengeStatus({ id: 'sell3', start: '2026-10-01', marks: ['a', 'b', 'c'] }, day(10, 5)).state, 'done');
  assert.strictEqual(C.challengeStatus({ id: 'found100', start: '2026-10-01', amount: 60 }, day(10, 5)).label, '$60 of $100');
  assert.strictEqual(C.challengeStatus({ id: 'cancel1', start: '2026-10-01', done: '2026-10-02' }, day(10, 3)).state, 'done');
  assert.strictEqual(C.challengeStatus({ id: 'sprint30', start: '2026-10-01' }, day(10, 5), { savings: 1000 }).state, 'done');
});
test('Milestones: ladders unlock at their thresholds and report progress', () => {
  const f = { setupDone: true, sortedAll: false, checkins: 2, streakBest: 3, savings: 400, debtsPaid: 1, debtPaidTotal: 850, daysBack: 14, debtFree: false, safetyNet: false, goalsFunded: 0, challengesDone: 1 };
  const earned = C.BADGES.filter(b => b.test(f)).map(b => b.id);
  assert.deepStrictEqual(earned, ['plan', 'checkin-1', 'streak-3', 'saved-250', 'payoff-1', 'paid-500', 'days-7', 'challenge-1']);
  assert.strictEqual(C.badgeProgress(C.BADGES.find(b => b.id === 'cushion'), f).label, '$400 of $1,000');
});

test('Earn challenge adds up the log and finishes at the target', () => {
  const st = C.challengeStatus({ id: 'drive500', start: '2026-10-01', log: [{ amt: 180 }, { amt: 220.5 }] }, day(10, 10));
  assert.strictEqual(st.label, '$401 of $500'); assert.strictEqual(st.state, 'active');
  assert.strictEqual(C.challengeStatus({ id: 'drive500', start: '2026-10-01', log: [{ amt: 500 }] }, day(10, 10)).state, 'done');
  assert.strictEqual(C.challengeStatus({ id: 'drive500', start: '2026-10-01', log: [{ amt: 100 }] }, day(11, 1)).state, 'missed');
});
test('Reading plan opens one day per calendar day, catch-up allowed', () => {
  const st = C.planStatus({ id: 'reset7', start: '2026-10-19', done: [0] }, day(10, 22));
  assert.strictEqual(st.open, 4); assert.strictEqual(st.next, 1); assert.strictEqual(st.state, 'active');
  assert.strictEqual(C.planStatus({ id: 'reset7', start: '2026-10-19', done: [0, 1, 2, 3, 4, 5, 6] }, day(10, 30)).state, 'done');
});

console.log(`\n${passed} tests passed`);
