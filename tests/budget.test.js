import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import { setupBudget, addTransaction, monthlyIncome, monthlyExpenses, moneyLevelFor, ensureEmergencyFund, addFund, updateBalance, addDebt, snowballOrder, payDebt, snowballMonths, loads, paydayBreakdown, recordPayday, paydayDue, POINTS } from '../src/systems/budget.js';

const T = '2026-11-06';
const city = () => newCity({ cityName: 'Test', family: [] }, T);
const withBudget = () => {
  const s = city();
  setupBudget(s, { incomes: [{ name: 'Brad', amount: '2,000', freq: 'biweekly', next: T }], expenses: { housing: 1500, groceries: 600, subscriptions: 60, giving: 400, dining: 0 } }, T);
  return s;
};

describe('budget setup', () => {
  it('stores income and monthly expenses, skips empty categories', () => {
    const s = withBudget();
    expect(s.budget.setup).toBe(true);
    expect(Math.round(monthlyIncome(s.budget))).toBe(4343);
    expect(monthlyExpenses(s.budget)).toBe(2560);
    expect(Object.keys(s.budget.expenses)).toEqual(['housing', 'groceries', 'subscriptions', 'giving']);
    expect(s.budget.points).toBe(POINTS.setup);
  });
});

describe('money levels', () => {
  it('Budget → Savings at 10 points → Debt snowball at 25', () => {
    expect([0, 9, 10, 24, 25, 99].map(moneyLevelFor)).toEqual([1, 1, 2, 2, 3, 3]);
  });
  it('logging transactions levels the money area; rewards are capped per day and never depend on amount', () => {
    const s = withBudget();
    const c0 = s.coins;
    const small = addTransaction(s, { amount: 3, cat: 'dining' }, T);
    const big = addTransaction(s, { amount: 3000, cat: 'housing' }, T);
    expect(small.reward).toEqual(big.reward);
    for (let k = 0; k < 6; k++) addTransaction(s, { amount: 10, cat: 'groceries' }, T);
    expect(s.coins - c0).toBe(5 * 5);
    let up = null;
    for (let d = 7; d < 20 && !up; d++) up = addTransaction(s, { amount: 5, cat: 'other' }, `2026-11-${d}`).levelUp;
    expect(up).toBe(2);
    expect(addTransaction(s, { amount: 0 }, T)).toBe(null);
  });
});

describe('savings + debt', () => {
  it('starter emergency fund is $1,000; balances update', () => {
    const s = withBudget();
    const ef = ensureEmergencyFund(s);
    expect(ef.target).toBe(1000);
    expect(ensureEmergencyFund(s)).toBe(ef);
    addFund(s, { name: 'Christmas', target: 600, monthly: 50 });
    expect(updateBalance(s, 'fund', ef.id, '$420').item.balance).toBe(420);
  });
  it('snowball: smallest balance first, payments roll forward', () => {
    const s = withBudget();
    addDebt(s, { name: 'Car', balance: 9000, min: 300 });
    addDebt(s, { name: 'Store card', balance: 450, min: 35 });
    addDebt(s, { name: 'Visa', balance: 2400, min: 80 });
    expect(snowballOrder(s.budget.debts).map((d) => d.name)).toEqual(['Store card', 'Visa', 'Car']);
    const r = payDebt(s, s.budget.debts.find((d) => d.name === 'Store card').id, 500, T);
    expect(r.paidOff).toBe(true);
    expect(snowballOrder(s.budget.debts).map((d) => d.name)).toEqual(['Visa', 'Car', 'Store card']);
    expect(snowballMonths(s.budget.debts, 0)).toBe(Math.ceil(11400 / 380));
    expect(snowballMonths(s.budget.debts, 220)).toBe(19);
  });
});

describe('payday train', () => {
  it('truckloads: every 10% is a full truck, about 5% adds a half truck', () => {
    expect(loads(34)).toEqual({ full: 3, half: 0 });
    expect(loads(25)).toEqual({ full: 2, half: 1 });
    expect(loads(4)).toEqual({ full: 0, half: 0 });
    expect(loads(5)).toEqual({ full: 0, half: 1 });
  });
  it('breaks down spending since the last payday, with what was left as Saved', () => {
    const s = withBudget();
    s.budget.lastPayday = '2026-10-23';
    addTransaction(s, { amount: 800, cat: 'housing', date: '2026-10-25' }, T);
    addTransaction(s, { amount: 300, cat: 'groceries', date: '2026-10-30' }, T);
    addTransaction(s, { amount: 100, cat: 'dining', date: '2026-11-02' }, T);
    addTransaction(s, { amount: 999, cat: 'dining', date: '2026-10-01' }, T);
    const b = paydayBreakdown(s, 2000, T);
    expect(b.tracked).toBe(true);
    expect(b.slices.map((x) => [x.cat, x.pct, x.full, x.half])).toEqual([['housing', 40, 4, 0], ['saved', 40, 4, 0], ['groceries', 15, 1, 1], ['dining', 5, 0, 1]]);
  });
  it('with nothing logged, it shows the plan for one paycheck', () => {
    const s = withBudget();
    const b = paydayBreakdown(s, 2000, T);
    expect(b.tracked).toBe(false);
    expect(b.slices.find((x) => x.cat === 'housing').pct).toBe(35);
  });
  it('recording payday moves the next payday forward and rewards showing up', () => {
    const s = withBudget();
    expect(paydayDue(s.budget, T)).toBe(true);
    const c0 = s.coins;
    recordPayday(s, 2000, T);
    expect(s.budget.incomes[0].next).toBe('2026-11-20');
    expect(paydayDue(s.budget, T)).toBe(false);
    expect(s.coins).toBe(c0 + 20);
    expect(s.budget.transactions[0]).toMatchObject({ type: 'income', amount: 2000 });
  });
});
