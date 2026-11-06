import { money, monthSpending, CATEGORIES } from './budget.js';
import { addDays } from './time.js';

/*
 * Budget District: every budget category has a building. It unlocks (free) the first time the family puts money
 * in that category's budget or logs spending there. It becomes where that category's payday trucks deliver, and
 * tapping it shows the category: planned vs spent this month, a quick "log a purchase", and recent spending.
 * The building grows by staying on plan: a month with 3+ purchases logged and spending within the plan counts.
 * (Debt has its own home already: the Debt Payoff Center and the Debt Freedom Monument.)
 */
export const DISTRICT = [
  { cat: 'housing', building: 'housingoffice', emoji: '🔑' },
  { cat: 'utilities', building: 'utility', emoji: '💡' },
  { cat: 'groceries', building: 'grocery', emoji: '🛒' },
  { cat: 'transport', building: 'gasstation', emoji: '⛽' },
  { cat: 'insurance', building: 'insurance', emoji: '☂️' },
  { cat: 'subscriptions', building: 'newsstation', emoji: '📰' },
  { cat: 'giving', building: 'pantry', emoji: '💝' },
  { cat: 'dining', building: 'fair', emoji: '🎡' },
  { cat: 'other', building: 'general', emoji: '🏪' }
];
export const districtForCat = (cat) => DISTRICT.find((d) => d.cat === cat) || null;
export const districtForBuilding = (type) => DISTRICT.find((d) => d.building === type) || null;
export const catLabel = (cat) => CATEGORIES.find((c) => c.id === cat)?.short || cat;

export function catActive(state, cat) {
  const b = state.budget;
  if (!b) return false;
  return money(b.expenses?.[cat]) > 0 || (b.transactions || []).some((t) => t.type === 'expense' && t.cat === cat);
}
/* Categories that just became active (each one is celebrated once). */
export function newlyActive(state) {
  const d = (state.district = state.district || { seen: [] });
  const fresh = DISTRICT.filter((x) => catActive(state, x.cat) && !d.seen.includes(x.cat));
  for (const x of fresh) d.seen.push(x.cat);
  return fresh;
}
const ymOf = (day) => day.slice(0, 7);
const prevYm = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; };

export function catMonth(state, cat, day) {
  const b = state.budget, ym = ymOf(day);
  const planned = money(b.expenses?.[cat]);
  const spent = Math.round((monthSpending(b, ym)[cat] || 0) * 100) / 100;
  const txs = b.transactions.filter((t) => t.type === 'expense' && t.cat === cat && t.date.startsWith(ym));
  return { planned, spent, left: Math.round((planned - spent) * 100) / 100, txs, pct: planned ? Math.min(100, (spent / planned) * 100) : 0 };
}
/* Full past months (up to 12) where 3+ purchases were logged and spending stayed within the plan. */
export function monthsOnPlan(state, cat, day) {
  const b = state.budget;
  const planned = money(b.expenses?.[cat]);
  if (!planned) return 0;
  let ym = prevYm(ymOf(day)), n = 0;
  for (let k = 0; k < 12; k++, ym = prevYm(ym)) {
    const txs = b.transactions.filter((t) => t.type === 'expense' && t.cat === cat && t.date.startsWith(ym));
    if (txs.length >= 3 && txs.reduce((a, t) => a + t.amount, 0) <= planned) n++;
  }
  return n;
}
export const districtLevel = (state, cat, day) => { const n = monthsOnPlan(state, cat, day); return n >= 3 ? 3 : n >= 1 ? 2 : 1; };
export function setCatBudget(state, cat, amount) {
  const b = state.budget;
  const a = money(amount);
  b.expenses = b.expenses || {};
  if (a > 0) b.expenses[cat] = a; else delete b.expenses[cat];
  return a;
}
export const recentCatTx = (state, cat, day, n = 6) => state.budget.transactions.filter((t) => t.type === 'expense' && t.cat === cat && t.date >= addDays(day, -60)).slice(0, n);
