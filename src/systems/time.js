/* Local-date helpers. Dates are stored as 'YYYY-MM-DD' strings in the family's own time zone. */
const pad = (n) => String(n).padStart(2, '0');

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}
/* Whole days from a to b (b - a). */
export function daysBetween(a, b) {
  return Math.round((fromKey(b) - fromKey(a)) / 86400000);
}
export const PERIOD_DAYS = { weekly: 7, biweekly: 14, semimonthly: 15.2, monthly: 30.4 };
export const FREQ_LABEL = { weekly: 'Every week', biweekly: 'Every two weeks', semimonthly: 'Twice a month', monthly: 'Once a month' };

/* Next payday on or after `from` given a known payday and a frequency. */
export function nextPayday(lastKnown, freq, from) {
  let k = lastKnown;
  let guard = 0;
  while (k < from && guard++ < 500) k = advancePayday(k, freq);
  return k;
}
export function advancePayday(key, freq) {
  if (freq === 'weekly') return addDays(key, 7);
  if (freq === 'biweekly') return addDays(key, 14);
  const d = fromKey(key);
  if (freq === 'monthly') { d.setMonth(d.getMonth() + 1); return dateKey(d); }
  /* Semi-monthly: the 1st and 15th. */
  if (d.getDate() < 15) { d.setDate(15); return dateKey(d); }
  d.setMonth(d.getMonth() + 1, 1);
  return dateKey(d);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function shortDate(key) { const d = fromKey(key); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; }
export function monthYear(d) { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
export function longDate(key) { const d = fromKey(key); return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }
export function weekday(key) { return DAYS[fromKey(key).getDay()]; }
