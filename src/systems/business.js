import { grant } from './economy.js';
import { daysBetween } from './time.js';
import { byId } from '../data/catalog.js';

/*
 * Main Street businesses, the Nest Egg and the Debt Freedom Monument.
 *
 * Businesses earn coins on their own, a steady amount per day. Their register holds up to 3 days, and tapping the
 * shop collects it. Shops open by town level (one kind of gate); a second copy of the same shop costs more.
 * Shops pay coins only, never XP (XP still comes only from real life).
 *
 * Nest Egg Tower: a trophy for reaching Money master, with a few real-life lessons about saving for later.
 * (It used to hold invested coins that grew each week. That's gone: older saves get every coin back.)
 *
 * Debt Freedom Monument: one new tier for every debt paid off, and a crown when every debt is gone.
 */
export const REGISTER_DAYS = 3;
const DAY_MS = 86400000;

export const bizCount = (state) => state.buildings.filter((b) => byId[b.type]?.kind === 'biz').length;
export const bizOwned = (state, type) => state.buildings.filter((b) => b.type === type).length;
/* Each extra copy of the same shop costs 50% more. */
export const bizCost = (state, type) => Math.round(byId[type].cost * (1 + 0.5 * bizOwned(state, type)));
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

/* ---------- Nest Egg ---------- */
/*
 * Older saves may still hold invested coins. Give every one back, with growth earned up to today
 * (the old rule: 2% a week, compounding), rounded up. Returns the coins returned (0 if nothing was invested).
 */
export function refundNestEgg(state, day) {
  const v = state.invest;
  if (!v || !(v.bal > 0)) return 0;
  let bal = v.bal;
  if (v.last && day) {
    const days = Math.min(365, Math.max(0, daysBetween(v.last, day)));
    bal = bal * Math.pow(1.02, days / 7);
  }
  const back = Math.ceil(bal - 1e-9);
  state.coins += back;
  state.invest = { bal: 0, refunded: (v.refunded || 0) + back, refundedOn: day || null, notice: back };
  return back;
}
export const NEST_LEVEL = 3;
export const NEST_LESSONS = [
  ['Pay yourself first', 'Many families move a little into savings on payday, before anything else, so saving happens on its own.'],
  ['Emergency fund first', 'A $1,000 starter emergency fund keeps a surprise from turning into new debt. That comes before investing.'],
  ['Time is the secret ingredient', 'Money saved for retirement grows on its growth over many years. Starting early, even small, matters more than starting big.'],
  ['Know your plan at work', 'If an employer offers a retirement plan with a match, that match is part of your pay. Ask HR how it works.'],
  ['Leave it alone', 'Retirement money is for later. Taking it out early usually means fees and taxes, so plan around it.']
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
