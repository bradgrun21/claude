import { byId, SECTIONS } from '../data/catalog.js';

/*
 * Areas open one at a time, so nobody is handed five lists on day one:
 *   To-Do → Financial (after the Job Board has something on it)
 *         → Relational (after the budget is set up)
 *         → Physical (after the Park has something on it)
 *         → Spiritual (after the Gym has something on it)
 * An area that's already been opened always stays open.
 */
export const SECTION_ORDER = ['todo', 'financial', 'relational', 'physical', 'spiritual'];

const mainBuilt = (state, section) => state.buildings.find((b) => byId[b.type]?.section === section && byId[b.type].tier === 1);
const hasItems = (state, section) => state.lists.some((l) => l.section === section && (l.tasks.length || (l.goals || []).length));
export const isOpened = (state, section) => !!mainBuilt(state, section) || state.lists.some((l) => l.section === section);

/* Is the previous area "built and laid out"? */
function laidOut(state, section) {
  if (!mainBuilt(state, section)) return false;
  if (section === 'financial') return !!state.budget?.setup;
  return hasItems(state, section);
}

export function sectionUnlocked(state, section) {
  const i = SECTION_ORDER.indexOf(section);
  if (i <= 0 || isOpened(state, section)) return true;
  return laidOut(state, SECTION_ORDER[i - 1]);
}

export function unlockHint(state, section) {
  const i = SECTION_ORDER.indexOf(section);
  if (i <= 0) return '';
  const prev = SECTION_ORDER[i - 1];
  if (prev === 'financial') return mainBuilt(state, 'financial') ? 'Opens when your budget is set up' : 'Opens after the Bank and budget';
  return `Opens after ${SECTIONS[prev].name}`;
}

/* Short label for a locked tile: "after Budget", "after To-Do". */
export function unlockShort(state, section) {
  const i = SECTION_ORDER.indexOf(section);
  if (i <= 0) return '';
  const prev = SECTION_ORDER[i - 1];
  return `after ${prev === 'financial' ? 'Budget' : SECTIONS[prev].name}`;
}

/* The next area waiting to be opened, for nudges and the tour. */
export function nextSection(state) {
  return SECTION_ORDER.find((s) => !isOpened(state, s)) || null;
}

/*
 * Pace inside an area: grow by consistency, not by piling on.
 *   - A task becomes a "habit" once it's been checked off on 3 different days (a finished goal counts too).
 *   - Each habit formed in an area unlocks that area's next building and opens one more task slot.
 *   - Slots = 1 + habits formed (a goal is one slot; its steps ride along). Paused or finished items free their slot.
 * Habits stay counted even if the task is later removed, so nobody loses ground.
 */
export const HABIT_DAYS = 3;
export const MAX_SLOTS = 12;
const distinctDays = (t) => new Set(t.done || []).size;
export const habitProgress = (t) => Math.min(HABIT_DAYS, distinctDays(t));

/* Record newly formed habits; returns them as [{ id, title, section }]. */
export function noteFormed(state) {
  const f = (state.formed = state.formed || {});
  const fresh = [];
  for (const l of state.lists) {
    for (const t of l.tasks) if (!f[t.id] && distinctDays(t) >= HABIT_DAYS) { f[t.id] = l.section; fresh.push({ id: t.id, title: t.title, section: l.section }); }
    for (const g of l.goals || []) if (!f[g.id] && g.achievedOn) { f[g.id] = l.section; fresh.push({ id: g.id, title: g.title, section: l.section, goal: true }); }
  }
  return fresh;
}
export function habitsFormed(state, section) {
  const f = { ...(state.formed || {}) };
  for (const l of state.lists) if (l.section === section) {
    for (const t of l.tasks) if (distinctDays(t) >= HABIT_DAYS) f[t.id] = section;
    for (const g of l.goals || []) if (g.achievedOn) f[g.id] = section;
  }
  return Object.values(f).filter((s) => s === section).length;
}
export const taskSlots = (state, section) => Math.min(MAX_SLOTS, 1 + habitsFormed(state, section));
export function activeItems(state, section) {
  let n = 0;
  for (const l of state.lists) {
    if (l.section !== section || l.paused) continue;
    const goals = l.goals || [];
    for (const t of l.tasks) {
      if (t.goalId || t.paused) continue;
      if (t.kind === 'once' && t.done.length) continue;
      n++;
    }
    n += goals.filter((g) => !g.achievedOn && !g.paused).length;
  }
  return n;
}
export const freeSlots = (state, section) => Math.max(0, taskSlots(state, section) - activeItems(state, section));
/* Tier 2 opens with the first habit, tier 3 with the second, tier 4 with the third. */
export const tierOpen = (state, section, tier) => tier <= 1 + habitsFormed(state, section);
export function nextTier(state, section) {
  const built = new Set(state.buildings.map((b) => b.type));
  const next = BUILDINGS_BY_SECTION(section).find((d) => !built.has(d.id) && d.tier > 1);
  if (!next) return null;
  return { def: next, open: tierOpen(state, section, next.tier), need: next.tier - 1 - habitsFormed(state, section) };
}
const BUILDINGS_BY_SECTION = (section) => Object.values(byId).filter((b) => b.section === section && b.kind === 'section' && !b.alt).sort((a, b) => a.tier - b.tier);
