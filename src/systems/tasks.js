import { AREA_INFO } from '../data/areas.js';
import { POINTS_PER_LOG } from './build.js';
import { earnMaterial } from './materials.js';
import { barAfterLog, doneInWeek, perWeekByArea, BAR_START } from './rating.js';

/*
 * Task bubbles show only the family's own goals (set in setup). No app suggestions.
 * Each goal can be logged once a day. A log gives build points, 1 material (daily cap 3),
 * refills that area's bar, and the first log of a day plants a crop in the garden.
 */
export const MAX_LOG_HISTORY = 120;

export function tasksToday(state, today) {
  return state.goals.filter((g) => g.perWeek > 0).map((g) => ({ ...g, doneToday: g.done.includes(today), place: AREA_INFO[g.area].place }));
}

export function completeTask(state, id, today) {
  const g = state.goals.find((x) => x.id === id);
  if (!g || g.done.includes(today)) return null;
  g.done.push(today);
  if (g.done.length > MAX_LOG_HISTORY) g.done.splice(0, g.done.length - MAX_LOG_HISTORY);
  state.points += POINTS_PER_LOG;
  const material = earnMaterial(state, g.area, today);
  let planted = false;
  if (!state.loggedDays.includes(today)) {
    state.loggedDays.push(today);
    if (state.loggedDays.length > 400) state.loggedDays.shift();
    state.garden.push(today);
    planted = true;
  }
  const per = perWeekByArea(state.goals)[g.area];
  const doneWeek = doneInWeek(state.goals, g.area, today);
  state.bars.values[g.area] = barAfterLog(state.bars.values[g.area] ?? BAR_START, per, doneWeek);
  return { goal: g, points: POINTS_PER_LOG, material, planted, doneWeek, perWeek: per };
}

export function totalDaysLogged(state) { return state.loggedDays.length; }
