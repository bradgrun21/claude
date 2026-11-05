import { AREAS, RANK_WEIGHTS } from '../data/areas.js';
import { addDays, daysBetween } from './time.js';

/*
 * Mayor rating = weighted average of six life bars.
 * Default weights: Money 30, Marriage 20, Faith 20, Health 15, Friends 10, Home 5.
 * The family's ranking sets the weights (rank 1 gets 30, rank 2 gets 20 ...).
 * Bars come from the family's own weekly goals, ease down when behind, never go below 20,
 * and refill when logged. Areas with no goal are left out of the average.
 */
export const BAR_FLOOR = 20;
export const BAR_START = 60;
export const EASE_PER_DAY = 6;

export function weightsFromRanking(ranking = AREAS) {
  const w = {};
  ranking.forEach((area, i) => { w[area] = RANK_WEIGHTS[i] ?? 0; });
  return w;
}

export function rating(bars, weights, areas = Object.keys(bars)) {
  let sum = 0, wsum = 0;
  for (const a of areas) {
    const w = weights[a] || 0;
    if (!w || bars[a] == null) continue;
    sum += w * bars[a];
    wsum += w;
  }
  return wsum ? Math.round(sum / wsum) : 0;
}

export function ratingWord(r) {
  return r >= 85 ? 'Thriving' : r >= 70 ? 'Steady' : r >= 50 ? 'Growing' : 'Rebuilding';
}

/* Weekly target per area (sum of that area's goals). */
export function perWeekByArea(goals) {
  const out = {};
  for (const g of goals) if (g.perWeek > 0) out[g.area] = (out[g.area] || 0) + g.perWeek;
  return out;
}
export function activeAreas(goals) { return AREAS.filter((a) => goals.some((g) => g.area === a && g.perWeek > 0)); }

/* Count logs for an area in the 7 days ending `day` (inclusive). */
export function doneInWeek(goals, area, day) {
  const from = addDays(day, -6);
  let n = 0;
  for (const g of goals) if (g.area === area) n += g.done.filter((d) => d >= from && d <= day).length;
  return n;
}

/* A log refills the bar by one goal-step (and fully once the weekly goal is met). */
export function barAfterLog(value, perWeek, doneThisWeek) {
  if (doneThisWeek >= perWeek) return 100;
  return Math.min(100, Math.max(BAR_FLOOR, value) + Math.ceil(100 / Math.max(1, perWeek)));
}

/* Each new day: if the rolling week is behind the goal, the bar eases down a little (never below 20). */
export function easeBars(state, today) {
  const last = state.bars.updated || today;
  const days = Math.min(30, Math.max(0, daysBetween(last, today)));
  const per = perWeekByArea(state.goals);
  for (let i = 1; i <= days; i++) {
    const day = addDays(last, i);
    for (const area of Object.keys(per)) {
      const done = doneInWeek(state.goals, area, addDays(day, -1));
      if (done < per[area]) state.bars.values[area] = Math.max(BAR_FLOOR, (state.bars.values[area] ?? BAR_START) - EASE_PER_DAY);
    }
  }
  state.bars.updated = today;
}

export function currentRating(state) {
  const areas = activeAreas(state.goals);
  return rating(state.bars.values, weightsFromRanking(state.setup.ranking), areas);
}
