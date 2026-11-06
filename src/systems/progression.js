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
