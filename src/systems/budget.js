import { grant } from './economy.js';
import { addDays, advancePayday, PERIOD_DAYS } from './time.js';

/*
 * The money path inside the Financial area (it opens when the Bank is placed).
 *   Money level 1 — Budget: income + monthly expenses, then log transactions.
 *   Money level 2 — Savings: $1,000 starter emergency fund + sinking funds, update balances.
 *   Money level 3 — Debt: list every debt, pay them off with the snowball (smallest balance first).
 * Money points come only from doing money tasks (logging, updating, reviewing), never from amounts.
 * Coins/XP for money tasks are fixed rewards for showing up, never based on dollars.
 */
export const CATEGORIES = [
  { id: 'housing', label: 'Housing (rent or mortgage)', short: 'Housing', color: '#D9774A', dest: 'home' },
  { id: 'utilities', label: 'Utilities', short: 'Utilities', color: '#4E9BCB', dest: 'home' },
  { id: 'groceries', label: 'Groceries', short: 'Groceries', color: '#4CAF6A', dest: 'grocery' },
  { id: 'transport', label: 'Gas and car', short: 'Transportation', color: '#8A6A44', dest: 'gasstation' },
  { id: 'insurance', label: 'Insurance', short: 'Insurance', color: '#6B7A8A', dest: 'townhall' },
  { id: 'subscriptions', label: 'Subscriptions and phone', short: 'Subscriptions', color: '#9A72D6', dest: 'newsstation' },
  { id: 'giving', label: 'Giving', short: 'Giving', color: '#F2B54A', dest: 'giving' },
  { id: 'debt', label: 'Debt payments', short: 'Debt', color: '#2F4058', dest: 'debt' },
  { id: 'dining', label: 'Eating out and fun', short: 'Fun', color: '#F28CA0', dest: 'fun' },
  { id: 'other', label: 'Everything else', short: 'Other', color: '#B0A28A', dest: 'townhall' }
];
export const SAVED = { id: 'saved', short: 'Left over (saved)', color: '#2FA7A0', dest: 'saved' };
export const catById = (id) => (id === 'saved' ? SAVED : CATEGORIES.find((c) => c.id === id) || CATEGORIES.at(-1));

/*
 * Money levels follow the money path, one step at a time (each opens the next):
 *   1 Income & bills → 2 Build the budget → 3 Debts → 4 Savings & funds → 5 Money master
 */
export const MONEY_LEVELS = [
  { level: 1, name: 'Income & bills' },
  { level: 2, name: 'Build the budget' },
  { level: 3, name: 'Debts' },
  { level: 4, name: 'Savings & funds' },
  { level: 5, name: 'Money master' }
];
const loggedDays = (b) => new Set(b.transactions.filter((t) => t.type === 'expense').map((t) => t.date)).size;
export const MONEY_STEPS = [
  { id: 'setup', title: 'Income & bills', desc: 'Enter your paychecks and monthly bills, including debt payments.', done: (b) => !!b.setup, progress: (b) => (b.setup ? 1 : 0), need: 1 },
  { id: 'track', title: 'Build the budget', desc: 'Log purchases on 3 different days, so the plan meets real life.', done: (b) => loggedDays(b) >= 3, progress: (b) => Math.min(3, loggedDays(b)), need: 3 },
  { id: 'debts', title: 'List your debts', desc: 'Add every debt, smallest balance first, or tell us you have none.', done: (b) => b.debts.length > 0 || !!b.noDebts, progress: (b) => (b.debts.length > 0 || b.noDebts ? 1 : 0), need: 1 },
  { id: 'savings', title: 'Savings & funds', desc: 'Put something in the $1,000 emergency fund and start one sinking fund.', done: (b) => b.funds.some((f) => f.kind === 'emergency' && f.balance > 0) && b.funds.some((f) => f.kind !== 'emergency'), progress: (b) => (b.funds.some((f) => f.kind === 'emergency' && f.balance > 0) ? 1 : 0) + (b.funds.some((f) => f.kind !== 'emergency') ? 1 : 0), need: 2 }
];
export const POINTS = { setup: 3, transaction: 1, review: 2, balance: 1, fund: 1, payment: 1, payday: 2 };
export const REWARD = { transaction: { coins: 5, xp: 3 }, payday: { coins: 20, xp: 15 }, setup: { coins: 40, xp: 25 }, balance: { coins: 5, xp: 3 } };
export const STARTER_EF = 1000;

let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
export const money = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

export function emptyBudget() {
  return { setup: false, incomes: [], expenses: {}, transactions: [], funds: [], debts: [], points: 0, level: 1, lastPayday: null, paydays: [], dailyTx: { day: null, n: 0 } };
}

/* ---------- Money level ---------- */
/* Level = 1 + the number of money steps finished in order. It never goes down. */
export function moneyLevelFor(b) {
  let lv = 1;
  for (const st of MONEY_STEPS) { if (!st.done(b)) break; lv++; }
  return lv;
}
/* Adds money points (kept for stats) and moves the level up when a step is finished; returns the new level. */
export function addPoints(state, n = 0) {
  const b = state.budget;
  b.points += n;
  const lv = moneyLevelFor(b);
  if (lv > b.level) { b.level = lv; return lv; }
  return null;
}
export function nextMoneyLevel(b) { return MONEY_LEVELS.find((l) => l.level === b.level + 1) || null; }

/* ---------- Setup ---------- */
export const monthlyFactor = (freq) => 30.4 / PERIOD_DAYS[freq || 'biweekly'];
export function monthlyIncome(b) { return b.incomes.reduce((a, i) => a + money(i.amount) * monthlyFactor(i.freq), 0); }
export function monthlyExpenses(b) { return Object.values(b.expenses).reduce((a, v) => a + money(v), 0); }

export function setupBudget(state, { incomes, expenses }, day) {
  const b = state.budget;
  b.incomes = incomes.filter((i) => money(i.amount) > 0).map((i) => ({ id: i.id || uid('i'), name: (i.name || 'Paycheck').trim(), amount: money(i.amount), freq: i.freq || 'biweekly', next: i.next || day }));
  b.expenses = {};
  for (const c of CATEGORIES) if (money(expenses[c.id]) > 0) b.expenses[c.id] = money(expenses[c.id]);
  const first = !b.setup;
  b.setup = true;
  if (!first) return { first: false };
  grant(state, REWARD.setup);
  return { first: true, levelUp: addPoints(state, POINTS.setup) };
}

/* ---------- Transactions ---------- */
export function addTransaction(state, t, day) {
  const b = state.budget;
  const tx = { id: uid('t'), date: t.date || day, amount: money(t.amount), cat: t.type === 'income' ? 'income' : (t.cat || 'other'), type: t.type === 'income' ? 'income' : 'expense', note: (t.note || '').trim().slice(0, 60) };
  if (!(tx.amount > 0)) return null;
  b.transactions.unshift(tx);
  if (b.transactions.length > 2000) b.transactions.length = 2000;
  if (b.dailyTx.day !== day) b.dailyTx = { day, n: 0 };
  b.dailyTx.n++;
  /* Rewards for the habit of logging (first 5 a day), never for the amount. */
  const rewarded = b.dailyTx.n <= 5;
  if (rewarded) grant(state, REWARD.transaction);
  const levelUp = rewarded ? addPoints(state, POINTS.transaction) : null;
  return { tx, reward: rewarded ? REWARD.transaction : null, levelUp };
}

export function spentByCategory(b, from, to) {
  const out = {};
  for (const t of b.transactions) if (t.type === 'expense' && t.date > from && t.date <= to) out[t.cat] = (out[t.cat] || 0) + t.amount;
  return out;
}
export function monthSpending(b, ym) {
  const out = {};
  for (const t of b.transactions) if (t.type === 'expense' && t.date.startsWith(ym)) out[t.cat] = (out[t.cat] || 0) + t.amount;
  return out;
}

/* ---------- Savings: starter emergency fund + sinking funds (money level 2) ---------- */
export function ensureEmergencyFund(state) {
  const b = state.budget;
  let ef = b.funds.find((f) => f.kind === 'emergency');
  if (!ef) { ef = { id: uid('f'), kind: 'emergency', name: 'Starter emergency fund', target: STARTER_EF, balance: 0, monthly: 0 }; b.funds.unshift(ef); }
  return ef;
}
export function addFund(state, f) {
  const fund = { id: uid('f'), kind: 'sinking', name: (f.name || 'Sinking fund').trim(), target: money(f.target), balance: money(f.balance), monthly: money(f.monthly), due: f.due || '' };
  state.budget.funds.push(fund);
  return { fund, levelUp: addPoints(state, POINTS.fund) };
}
export function updateBalance(state, kind, id, balance) {
  const list = kind === 'debt' ? state.budget.debts : state.budget.funds;
  const item = list.find((x) => x.id === id);
  if (!item) return null;
  item.balance = money(balance);
  item.updated = true;
  grant(state, REWARD.balance);
  return { item, reward: REWARD.balance, levelUp: addPoints(state, POINTS.balance) };
}

/* ---------- Debt snowball (money level 3) ---------- */
export function addDebt(state, d) {
  const debt = { id: uid('d'), name: (d.name || 'Debt').trim(), balance: money(d.balance), start: money(d.balance), min: money(d.min), rate: money(d.rate) };
  state.budget.debts.push(debt);
  return { debt, levelUp: addPoints(state, POINTS.balance) };
}
/* Snowball order: smallest balance first (paid-off debts move to the end). */
export function snowballOrder(debts) {
  return [...debts].sort((a, b) => (a.balance <= 0) - (b.balance <= 0) || a.balance - b.balance);
}
export function payDebt(state, id, amount, day) {
  const d = state.budget.debts.find((x) => x.id === id);
  const a = Math.min(money(amount), d ? d.balance : 0);
  if (!d || !(a > 0)) return null;
  d.balance = Math.round((d.balance - a) * 100) / 100;
  addTransaction(state, { amount: a, cat: 'debt', note: `Payment: ${d.name}`, date: day }, day);
  const paidOff = d.balance <= 0;
  if (paidOff) { d.paidOn = day; grant(state, { coins: 100, xp: 60 }); }
  return { debt: d, paidOff, levelUp: addPoints(state, POINTS.payment) };
}
/* Months to debt-free with the snowball, given an extra amount per month on top of minimums. Interest ignored (plan view). */
export function snowballMonths(debts, extra = 0) {
  const ds = snowballOrder(debts).filter((d) => d.balance > 0).map((d) => ({ ...d }));
  const pool = ds.reduce((a, d) => a + d.min, 0) + extra;
  if (!ds.length) return 0;
  if (!(pool > 0)) return null;
  let months = 0;
  while (ds.some((d) => d.balance > 0) && months < 600) {
    months++;
    let left = pool;
    for (const d of ds) if (d.balance > 0) { const p = Math.min(d.min, d.balance, left); d.balance -= p; left -= p; }
    for (const d of ds) if (d.balance > 0 && left > 0) { const p = Math.min(d.balance, left); d.balance -= p; left -= p; }
  }
  return months;
}

/* ---------- Payday + truckloads ---------- */
export function nextPayday(b, today) {
  const dates = b.incomes.map((i) => i.next).filter(Boolean).sort();
  return dates[0] || null;
}
export function paydayDue(b, today) {
  return b.setup && b.incomes.some((i) => i.next && i.next <= today);
}
export const loads = (pct) => ({ full: Math.floor(pct / 10), half: pct % 10 >= 5 ? 1 : 0 });

/*
 * The payday breakdown: what came in, and where money went since the last payday.
 * If nothing was logged, it shows the plan (budget) for one paycheck instead, so the train still teaches.
 */
export function paydayBreakdown(state, amountIn, today) {
  const b = state.budget;
  const from = b.lastPayday || addDays(today, -14);
  const spent = spentByCategory(b, from, today);
  let tracked = Object.values(spent).reduce((a, v) => a + v, 0) > 0;
  let parts = Object.entries(spent).map(([cat, amount]) => ({ cat, amount }));
  if (!tracked) {
    const perCheck = monthlyIncome(b) ? amountIn / monthlyIncome(b) : 0.5;
    parts = Object.entries(b.expenses).map(([cat, monthly]) => ({ cat, amount: Math.round(monthly * perCheck * 100) / 100 }));
  }
  const out = parts.reduce((a, p) => a + p.amount, 0);
  const base = Math.max(amountIn, out) || 1;
  if (amountIn > out) parts.push({ cat: 'saved', amount: Math.round((amountIn - out) * 100) / 100 });
  const slices = parts.filter((p) => p.amount > 0).sort((a, b2) => b2.amount - a.amount).map((p) => {
    const pct = Math.round((p.amount / base) * 100);
    return { ...p, pct, ...loads(pct), color: catById(p.cat).color, label: catById(p.cat).short };
  });
  return { amountIn, from, tracked, slices, out, trucks: slices.reduce((a, s) => a + s.full + s.half, 0) };
}

/* Payday acknowledged: record the income, move every paycheck due today forward, reward showing up. */
export function recordPayday(state, amountIn, today) {
  const b = state.budget;
  if (money(amountIn) > 0) addTransactionSilent(b, { amount: money(amountIn), type: 'income', note: 'Payday', date: today });
  for (const i of b.incomes) { let g = 0; while (i.next && i.next <= today && g++ < 60) i.next = advancePayday(i.next, i.freq); }
  b.lastPayday = today;
  b.paydays.push({ date: today, amount: money(amountIn) });
  grant(state, REWARD.payday);
  return { reward: REWARD.payday, levelUp: addPoints(state, POINTS.payday) };
}
function addTransactionSilent(b, t) {
  b.transactions.unshift({ id: uid('t'), date: t.date, amount: t.amount, cat: 'income', type: 'income', note: t.note });
}
export const paycheckDueAmount = (b, today) => b.incomes.filter((i) => i.next && i.next <= today).reduce((a, i) => a + i.amount, 0) || (b.incomes[0]?.amount || 0);
