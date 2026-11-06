import { weekStart, streak } from './lists.js';

/*
 * Earned decorations: things you can't buy, only earn by steady use.
 *   - use a tool in N different weeks (not N times in one week)
 *   - keep a streak (best ever counts, so a rest week never takes one away)
 *   - check things off on N different days in total
 * Once earned it's free to place, and it stays earned.
 */
export const EARNED = [
  { id: 'lanterns', name: 'Lantern Row', streak: 7, text: 'Keep a 7-day streak' },
  { id: 'arch', name: 'Rose Arch', days: 30, text: 'Check something off on 30 different days' },
  { id: 'goldfountain', name: 'Golden Fountain', streak: 30, text: 'Keep a 30-day streak' },
  { id: 'clocktower', name: 'Town Clock Tower', days: 100, text: 'Check something off on 100 different days' },
  { id: 'market', name: 'Farmers’ Market Stall', tools: ['meals'], weeks: 4, text: 'Use the Meal Planner in 4 different weeks' },
  { id: 'classiccar', name: 'Classic Car', tools: ['care', 'repair'], weeks: 3, text: 'Log car or home upkeep in 3 different weeks' },
  { id: 'kiosk', name: 'Newsstand Kiosk', tools: ['subs'], weeks: 2, text: 'Check in on subscriptions in 2 different weeks' },
  { id: 'mailbox', name: 'Big Red Mailbox', tools: ['cards'], weeks: 3, text: 'Send cards or thank-yous in 3 different weeks' },
  { id: 'patio', name: 'Café Patio', tools: ['dates'], weeks: 3, text: 'Plan dates from the jar in 3 different weeks' },
  { id: 'playground', name: 'Playground', tools: ['kids'], weeks: 4, text: 'Give kids stars in 4 different weeks' },
  { id: 'bandstand', name: 'Bandstand', tools: ['meeting'], weeks: 4, text: 'Hold 4 family meetings' },
  { id: 'dogpark', name: 'Dog Park', tools: ['vet'], weeks: 3, text: 'Log pet records in 3 different weeks' },
  { id: 'giftbox', name: 'Giant Gift Box', tools: ['gifts'], weeks: 3, text: 'Log gifts or sizes in 3 different weeks' }
];
export const earnedById = Object.fromEntries(EARNED.map((e) => [e.id, e]));

/* Note that a tool was really used this week. */
export function markUse(state, toolId, day) {
  state.tools = state.tools || {};
  const rec = state.tools[toolId] || (state.tools[toolId] = {});
  const wk = weekStart(day);
  rec.weeks = rec.weeks || [];
  if (!rec.weeks.includes(wk)) { rec.weeks.push(wk); if (rec.weeks.length > 120) rec.weeks.shift(); }
}
export function noteStreak(state, day) {
  const s = streak(state, day);
  if (s > (state.stats.bestStreak || 0)) state.stats.bestStreak = s;
  return s;
}
export function earnedProgress(state, e) {
  if (e.streak) return { have: Math.min(e.streak, state.stats?.bestStreak || 0), need: e.streak };
  if (e.days) return { have: Math.min(e.days, state.stats?.daysLogged || state.loggedDays.length), need: e.days };
  const weeks = new Set();
  for (const t of e.tools) for (const w of state.tools?.[t]?.weeks || []) weeks.add(w);
  return { have: Math.min(e.weeks, weeks.size), need: e.weeks };
}
export const isEarned = (state, id) => (state.earned || []).some((x) => x.id === id);
/* Returns the newly earned ones (and records them). */
export function checkEarned(state, day) {
  state.earned = state.earned || [];
  const fresh = [];
  for (const e of EARNED) {
    if (isEarned(state, e.id)) continue;
    const p = earnedProgress(state, e);
    if (p.have >= p.need) { state.earned.push({ id: e.id, on: day }); fresh.push(e); }
  }
  return fresh;
}
