// Daily checklist rules (daily.js): node tests/daily.test.js
const assert = require('assert');
const D = require('../daily.js');
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok - ' + name); }
const all = { logged: true, balUpdated: true, noNewDebt: true, noEatingOut: true, lessonDone: true, gratitude: 'My kids' };

test('Day state: none, some (1-4), full (all 5); days to come are blank', () => {
  const P = { daily: { '2026-11-01': {}, '2026-11-02': { noNewDebt: true, noEatingOut: true, lessonDone: true }, '2026-11-03': all } };
  assert.strictEqual(D.state(P, '2026-11-01', '2026-11-05'), 'none');
  assert.strictEqual(D.state(P, '2026-11-02', '2026-11-05'), 'some');
  assert.strictEqual(D.state(P, '2026-11-03', '2026-11-05'), 'full');
  assert.strictEqual(D.state(P, '2026-11-04', '2026-11-05'), 'none');
  assert.strictEqual(D.state(P, '2026-11-09', '2026-11-05'), 'future');
  assert.strictEqual(D.tasks(P, '2026-11-02').n, 3);
});
test('Task 1 needs both halves: a purchase (or No spend today) and balances (updated or still right)', () => {
  const t = (r) => D.tasks({ daily: { d: r } }, 'd');
  assert.strictEqual(t({ logged: true }).log, false);
  assert.strictEqual(t({ balancesConfirmed: true }).log, false);
  assert.strictEqual(t({ logged: true, balancesConfirmed: true }).log, true);
  assert.strictEqual(t({ noSpend: true, balUpdated: true }).log, true);
  assert.strictEqual(t({ noSpend: true, balancesConfirmed: true }).n, 1);
  // a blank gratitude line doesn't count
  assert.strictEqual(t({ gratitude: '   ' }).grat, false);
});
test('No back-filling: only today can be checked off, and a full day stays full', () => {
  const P = { daily: { '2026-11-03': { done: true } } };
  assert.strictEqual(D.canEdit(P, '2026-11-05', '2026-11-05'), true);
  assert.strictEqual(D.canEdit(P, '2026-11-04', '2026-11-05'), false);
  assert.strictEqual(D.canEdit(P, '2026-11-06', '2026-11-05'), false);
  assert.strictEqual(D.canEdit({ daily: { '2026-11-05': { done: true } } }, '2026-11-05', '2026-11-05'), false);
});
test('The checklist works with no challenge running', () => {
  const P = { daily: { '2026-11-05': all } };
  assert.strictEqual(P.challenge, undefined);
  assert.strictEqual(D.full(P, '2026-11-05'), true);
  assert.deepStrictEqual(D.counts(P), { full: 1, lessons: 1, grateful: 1 });
});
test('The challenge and the calendar read the same days: start Nov 1, miss Nov 13 -> 12 in a row', () => {
  const P = { daily: {} };
  for (let d = 1; d <= 12; d++) P.daily['2026-11-' + String(d).padStart(2, '0')] = Object.assign({}, all);
  P.daily['2026-11-13'] = { noNewDebt: true };
  const rc = D.runCheck(P, '2026-11-01', '2026-11-14');
  assert.deepStrictEqual(rc, { missed: '2026-11-13', reached: 12 });
  assert.strictEqual(D.state(P, '2026-11-12', '2026-11-14'), 'full');
  assert.strictEqual(D.state(P, '2026-11-13', '2026-11-14'), 'some');
  // nothing missed yet on the start day itself, or while every day so far is full
  assert.deepStrictEqual(D.runCheck(P, '2026-11-01', '2026-11-01'), { missed: null, reached: 0 });
  assert.deepStrictEqual(D.runCheck(P, '2026-11-01', '2026-11-13'), { missed: null, reached: 12 });
  assert.strictEqual(D.dayNumber('2026-11-01', '2026-11-30'), 30);
  assert.strictEqual(D.dayNumber('2026-11-14', '2026-12-13'), 30);
});
test('Older plans: the challenge days move into P.daily without losing anything', () => {
  const P = { challenge: { status: 'active', startDate: '2026-10-31', days: { '2026-10-31': { noSpend: true, balancesConfirmed: true, gratitude: 'x', done: true } } }, daily: { '2026-10-30': { noNewDebt: true } } };
  assert.strictEqual(D.migrate(P), true);
  assert.strictEqual(P.challenge.days, undefined);
  assert.strictEqual(P.daily['2026-10-31'].gratitude, 'x');
  assert.strictEqual(P.daily['2026-10-30'].noNewDebt, true);
  assert.strictEqual(D.migrate(P), false);
});
console.log(`\n${passed} tests passed`);
