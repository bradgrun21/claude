/*
 * Phase C (logic only, not wired into the game yet — waiting for Brad's go-ahead).
 * Small builds are instant. Community buildings are ready the next 6 a.m. local that is
 * at least 4 hours after the start. Landmarks take 2 mornings. No countdowns, no paid skips.
 * Neighbor cheers (later): −1 hour each, max 3 per build, never sooner than 1 hour after start.
 */
export const READY_HOUR = 6;
export const MIN_HOURS = 4;
export const MAX_CHEERS = 3;
export const BUILDER_SLOTS = { Village: 1, Town: 2, City: 2, Legacy: 3 };
const HOUR = 3600000;

function nextMorningAfter(t) {
  const d = new Date(t);
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate(), READY_HOUR, 0, 0, 0);
  if (m.getTime() < t) m.setDate(m.getDate() + 1);
  return m;
}

export function readyAt(start, type, cheers = 0) {
  const s = start instanceof Date ? start.getTime() : start;
  if (type === 'small') return new Date(s);
  let ready = nextMorningAfter(s + MIN_HOURS * HOUR);
  if (type === 'landmark') ready = nextMorningAfter(ready.getTime() + 1);
  const c = Math.min(MAX_CHEERS, Math.max(0, cheers));
  return new Date(Math.max(s + HOUR, ready.getTime() - c * HOUR));
}

export function readyLabel(ready, now = new Date()) {
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (ready <= now) return 'Ready';
  if (sameDay(ready, now) || sameDay(ready, tomorrow)) return 'Ready by morning';
  return 'Ready in two mornings';
}
