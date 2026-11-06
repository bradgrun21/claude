import { grant } from './economy.js';
import { population } from './economy.js';
import { daysBetween } from './time.js';
import { byId } from '../data/catalog.js';

/*
 * Main Street businesses, the Nest Egg and the Debt Freedom Monument.
 *
 * Businesses earn coins on their own, a steady amount per day. Their register holds up to 3 days, and tapping the
 * shop collects it. People are the customers: every 15 residents support one more shop, so homes and shops grow
 * together. Shops pay coins only, never XP (XP still comes only from real life).
 *
 * Nest Egg Tower teaches compound growth with coins: invest coins, they grow 2% a week, and growth earns growth.
 * Taking out coins invested in the last 4 weeks costs a 10% early-withdrawal fee, like a real retirement account.
 *
 * Debt Freedom Monument: one new tier for every debt paid off, and a crown when every debt is gone.
 */
export const REGISTER_DAYS = 3;
export const RESIDENTS_PER_SHOP = 15;
const DAY_MS = 86400000;

export const bizCount = (state) => state.buildings.filter((b) => byId[b.type]?.kind === 'biz').length;
export const bizSlots = (state) => 1 + Math.floor(population(state) / RESIDENTS_PER_SHOP);
export const bizOwned = (state, type) => state.buildings.filter((b) => b.type === type).length;
/* Each extra copy of the same shop costs 50% more. */
export const bizCost = (state, type) => Math.round(byId[type].cost * (1 + 0.5 * bizOwned(state, type)));
export function canAddBiz(state) {
  const n = bizCount(state), slots = bizSlots(state);
  return n < slots ? { ok: true } : { ok: false, need: (n) * RESIDENTS_PER_SHOP, have: population(state) };
}
export function bizReady(rec, now = Date.now()) {
  const def = byId[rec.type];
  if (!def?.income) return 0;
  const since = Math.max(0, now - (rec.bizAt || now));
  return Math.floor(Math.min(REGISTER_DAYS, since / DAY_MS) * def.income);
}
export const bizFull = (rec, now = Date.now()) => bizReady(rec, now) >= REGISTER_DAYS * byId[rec.type].income;
export function collectBiz(state, rec, now = Date.now()) {
  const n = bizReady(rec, now);
  if (n < 1) return 0;
  const def = byId[rec.type];
  /* keep the partial coin: move the clock forward by exactly what was paid out (unless the register was full) */
  rec.bizAt = bizFull(rec, now) ? now : (rec.bizAt || now) + (n / def.income) * DAY_MS;
  grant(state, { coins: n });
  state.stats.bizCoins = (state.stats.bizCoins || 0) + n;
  return n;
}
export const dailyBizIncome = (state) => state.buildings.reduce((a, b) => a + (byId[b.type]?.income || 0), 0);
export function collectAll(state, now = Date.now()) {
  let total = 0;
  for (const b of state.buildings) if (byId[b.type]?.kind === 'biz') total += collectBiz(state, b, now);
  return total;
}

/* ---------- Nest Egg (compound growth) ---------- */
export const WEEKLY_GROWTH = 0.02;
export const EARLY_DAYS = 28;
export const EARLY_FEE = 0.1;
export function ensureInvest(state) {
  state.invest = state.invest || { bal: 0, principal: 0, growth: 0, last: null, deposits: [], fees: 0 };
  return state.invest;
}
export function accrue(state, day) {
  const v = ensureInvest(state);
  if (!v.last) { v.last = day; return 0; }
  const days = Math.min(365, Math.max(0, daysBetween(v.last, day)));
  v.last = day;
  if (!days || v.bal <= 0) return 0;
  const before = v.bal;
  v.bal = Math.round(v.bal * Math.pow(1 + WEEKLY_GROWTH, days / 7) * 100) / 100;
  v.growth = Math.round((v.growth + (v.bal - before)) * 100) / 100;
  return v.bal - before;
}
export function invest(state, amount, day) {
  const a = Math.floor(+amount || 0);
  if (!(a > 0) || a > state.coins) return null;
  accrue(state, day);
  const v = ensureInvest(state);
  state.coins -= a;
  v.bal = Math.round((v.bal + a) * 100) / 100;
  v.principal += a;
  v.deposits.push({ day, amt: a });
  if (v.deposits.length > 200) v.deposits.shift();
  state.stats.invested = (state.stats.invested || 0) + a;
  return { amount: a, bal: v.bal };
}
/* Coins invested in the last 4 weeks that haven't been taken back out yet. */
export function recentDeposits(state, day) {
  const v = ensureInvest(state);
  return v.deposits.filter((d) => daysBetween(d.day, day) < EARLY_DAYS).reduce((a, d) => a + d.amt, 0);
}
export function withdrawQuote(state, amount, day) {
  const v = ensureInvest(state);
  const a = Math.min(Math.floor(+amount || 0), Math.floor(v.bal));
  const early = Math.min(a, recentDeposits(state, day));
  const fee = Math.round(early * EARLY_FEE);
  return { amount: a, fee, get: a - fee };
}
export function withdraw(state, amount, day) {
  accrue(state, day);
  const q = withdrawQuote(state, amount, day);
  if (!(q.amount > 0)) return null;
  const v = ensureInvest(state);
  v.bal = Math.round((v.bal - q.amount) * 100) / 100;
  v.principal = Math.max(0, v.principal - q.amount);
  v.fees += q.fee;
  /* use up the newest deposits first so the fee isn't charged twice */
  let left = q.amount;
  for (let i = v.deposits.length - 1; i >= 0 && left > 0; i--) { const take = Math.min(left, v.deposits[i].amt); v.deposits[i].amt -= take; left -= take; }
  v.deposits = v.deposits.filter((d) => d.amt > 0);
  state.coins += q.get;
  return q;
}
export const project = (bal, weeks) => Math.floor(bal * Math.pow(1 + WEEKLY_GROWTH, weeks));
/* The tower grows with the balance. */
export const nestLevel = (state) => { const b = state.invest?.bal || 0; return b >= 5000 ? 5 : b >= 1500 ? 4 : b >= 500 ? 3 : b >= 100 ? 2 : 1; };
export const NEST_LESSONS = [
  ['Growth earns growth', 'Each week, your coins grow 2%, and last week’s growth grows too. That snowball is called compound growth.'],
  ['Time beats timing', 'Coins left alone for a year end up about 2.8× bigger. The same coins left for 4 weeks grow about 8%. Starting early matters most.'],
  ['Leave it alone', 'Taking out coins you put in during the last 4 weeks costs a 10% fee, like early withdrawals from real retirement accounts.'],
  ['The Rule of 72', 'Divide 72 by the growth rate to see how long money takes to double. At 2% a week: about 36 weeks.'],
  ['Small and steady', 'Putting a little in every week beats waiting for a big amount. Real retirement plans work the same way.']
];

/* ---------- Debt Freedom Monument ---------- */
export function debtStatus(state) {
  const debts = state.budget?.debts || [];
  const paid = debts.filter((d) => d.balance <= 0 || d.paidOn);
  return { total: debts.length, paid: paid.length, free: debts.length > 0 && paid.length === debts.length, list: paid.slice().sort((a, b) => (a.paidOn || '').localeCompare(b.paidOn || '')) };
}
/* Model level: 1 = foundation, +1 tier per debt paid (up to 8), +100 when every debt is paid (the crown). */
export const monumentLevel = (state) => { const s = debtStatus(state); return 1 + Math.min(8, s.paid) + (s.free ? 100 : 0); };
export const canBuildMonument = (state) => (state.budget?.debts || []).length > 0;
