import { byId, SECTIONS } from '../data/catalog.js';

/*
 * Life areas open one at a time, so nobody is handed five lists on day one:
 *   To-Do → Financial → the player picks 1 of (Relational, Physical, Spiritual) → picks 1 of the 2 left → the last one.
 * Every gate is the same simple rule: the area before it "has something on it" (at least one active task or goal).
 *   - Financial opens when To-Do has something on it.
 *   - When Financial has something on it, the player chooses their next area from the three.
 *   - When that area has something on it, they choose from the two left.
 *   - When the second chosen area has something on it, the last one opens on its own.
 * The chosen order is saved as state.areaOrder and used by the Store and the Tasks board.
 * An area that's already open always stays open.
 */
export const FIXED_AREAS = ['todo', 'financial'];
export const CHOICE_AREAS = ['relational', 'physical', 'spiritual'];
export const SECTION_ORDER = [...FIXED_AREAS, ...CHOICE_AREAS];
export const AREA_LINES = {
  relational: 'Family, friends, date nights and staying close.',
  physical: 'Movement, sleep, food and feeling good.',
  spiritual: 'Faith, gratitude, prayer and quiet time.'
};

const mainBuilt = (state, section) => state.buildings.find((b) => byId[b.type]?.section === section && byId[b.type].tier === 1);
const hasItems = (state, section) => state.lists.some((l) => l.section === section && (l.tasks.length || (l.goals || []).length));
export const isOpened = (state, section) => !!mainBuilt(state, section) || state.lists.some((l) => l.section === section);
/* "Has something on it": at least one active task or goal. */
export const hasSomething = (state, section) => activeItems(state, section) > 0;

/* When an area first opened (its first building or list), for ordering older saves. */
function openedOn(state, section) {
  const days = [
    ...state.buildings.filter((b) => byId[b.type]?.section === section).map((b) => b.builtOn),
    ...state.lists.filter((l) => l.section === section).map((l) => l.createdOn)
  ].filter(Boolean).sort();
  return days[0] || '9999';
}
/* Older saves: keep every area that was open (or unlocked) under the old rules, in the order it opened. */
function migrateAreaOrder(state) {
  const laidOutOld = (s) => !!mainBuilt(state, s) && (s === 'financial' ? !!state.budget?.setup : hasItems(state, s));
  const keep = new Set(CHOICE_AREAS.filter((s) => isOpened(state, s)));
  if (laidOutOld('financial')) keep.add('relational');
  if (laidOutOld('relational')) keep.add('physical');
  if (laidOutOld('physical')) keep.add('spiritual');
  const ordered = [...keep].sort((a, b) => openedOn(state, a).localeCompare(openedOn(state, b)) || CHOICE_AREAS.indexOf(a) - CHOICE_AREAS.indexOf(b));
  return [...FIXED_AREAS, ...ordered];
}
/* The saved order (created for older saves; any open area missing from it is added). */
export function areaOrder(state) {
  if (!Array.isArray(state.areaOrder)) state.areaOrder = migrateAreaOrder(state);
  const o = state.areaOrder;
  for (const s of FIXED_AREAS) if (!o.includes(s)) o.splice(FIXED_AREAS.indexOf(s), 0, s);
  const missing = CHOICE_AREAS.filter((s) => !o.includes(s) && isOpened(state, s)).sort((a, b) => openedOn(state, a).localeCompare(openedOn(state, b)));
  o.push(...missing);
  return o;
}
/* Display order: the chosen areas first, then the ones not chosen yet. */
export const areaOrderFull = (state) => { const o = areaOrder(state); return [...o, ...SECTION_ORDER.filter((s) => !o.includes(s))]; };

/*
 * What happens next: null, { options: [...] } (the player picks), or { auto: area } (the last one opens on its own).
 */
export function choiceFor(state) {
  const o = areaOrder(state);
  const remaining = CHOICE_AREAS.filter((s) => !o.includes(s));
  if (!remaining.length) return null;
  const last = o[o.length - 1];
  if (!isOpened(state, last) || !hasSomething(state, last)) return null;
  return remaining.length === 1 ? { auto: remaining[0], after: last } : { options: remaining, after: last };
}
export function chooseArea(state, section) {
  const c = choiceFor(state);
  if (!c || !(c.options?.includes(section) || c.auto === section)) return false;
  state.areaOrder.push(section);
  return true;
}

export function sectionUnlocked(state, section) {
  if (section === 'todo' || isOpened(state, section)) return true;
  if (section === 'financial') return hasSomething(state, 'todo');
  return areaOrder(state).includes(section);
}

/* One plain reason an area is locked (or that it's ready to choose). */
export function unlockHint(state, section) {
  if (sectionUnlocked(state, section)) return '';
  if (section === 'financial') return 'Opens when To-Do has something on it';
  const c = choiceFor(state);
  if (c?.options?.includes(section) || c?.auto === section) return 'Ready to choose: you pick what opens next';
  const last = areaOrder(state).at(-1);
  return `Choose this after ${SECTIONS[last].name} has something on it.`;
}
/* Short label for a locked tile. */
export function unlockShort(state, section) {
  if (sectionUnlocked(state, section)) return '';
  if (section === 'financial') return 'After To-Do';
  const c = choiceFor(state);
  if (c?.options?.includes(section) || c?.auto === section) return 'Choose next';
  return `After ${SECTIONS[areaOrder(state).at(-1)].name}`;
}

/* The next area that's unlocked but not opened yet (for nudges), or null. */
export function nextSection(state) {
  return areaOrderFull(state).find((s) => sectionUnlocked(state, s) && !isOpened(state, s)) || null;
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
/* To-Do has no task limit (it's everyday chores); the other areas grow one slot per habit. */
export const NO_LIMIT = new Set(['todo']);
export const hasLimit = (section) => !NO_LIMIT.has(section);
export const taskSlots = (state, section) => (hasLimit(section) ? Math.min(MAX_SLOTS, 1 + habitsFormed(state, section)) : Infinity);
export function activeItems(state, section) {
  let n = 0;
  for (const l of state.lists) {
    if (l.section !== section || l.paused) continue;
    const goals = l.goals || [];
    for (const t of l.tasks) {
      if (t.goalId || t.paused || t.auto) continue;
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
