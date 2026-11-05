import { grant } from './economy.js';

/*
 * Family calendar: plan outings (date, time, area, place, who's going, planned budget),
 * then mark them done with what was actually spent and a recap/photo.
 * Rewards are fixed for showing up and recapping, never based on dollar amounts.
 * Later: subscribe to community events and link the family's own calendar (needs accounts).
 */
export const OUTING_REWARD = { coins: 15, xp: 10 };
let seq = 0;
const uid = () => `e${Date.now().toString(36)}${(seq++).toString(36)}`;
const money = (v) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

export function addEvent(state, e) {
  const ev = {
    id: uid(), title: (e.title || '').trim() || 'Family outing', date: e.date, time: e.time || '', section: e.section || 'relational',
    place: (e.place || '').trim(), budget: money(e.budget), spent: null, who: e.who || [], notes: (e.notes || '').trim(), done: false, memoryId: null
  };
  state.events.push(ev);
  state.events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return ev;
}

export function updateEvent(state, id, patch) {
  const ev = state.events.find((x) => x.id === id);
  if (!ev) return null;
  Object.assign(ev, { ...patch, budget: patch.budget != null ? money(patch.budget) : ev.budget });
  state.events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return ev;
}

export function removeEvent(state, id) {
  const i = state.events.findIndex((x) => x.id === id);
  if (i >= 0) state.events.splice(i, 1);
}

/* Mark an outing as done. Rewards once, for going, not for the amount spent. */
export function completeEvent(state, id, spent) {
  const ev = state.events.find((x) => x.id === id);
  if (!ev) return null;
  ev.spent = spent == null || spent === '' ? ev.spent : money(spent);
  if (ev.done) return { ev, reward: null };
  ev.done = true;
  grant(state, OUTING_REWARD);
  state.stats.outings = (state.stats.outings || 0) + 1;
  return { ev, reward: OUTING_REWARD };
}

export const eventsOn = (state, day) => state.events.filter((e) => e.date === day);
export const eventsInMonth = (state, ym) => state.events.filter((e) => e.date.startsWith(ym));
export const upcoming = (state, today, n = 5) => state.events.filter((e) => e.date >= today && !e.done).slice(0, n);

/* Budget for the month: what's planned (all outings) and what's actually been spent (done outings). */
export function budgetSummary(state, ym) {
  const list = eventsInMonth(state, ym);
  const planned = list.reduce((a, e) => a + (e.budget || 0), 0);
  const spent = list.filter((e) => e.done).reduce((a, e) => a + (e.spent ?? e.budget ?? 0), 0);
  const limit = state.settings.outingBudget || 0;
  return { limit, planned, spent, left: limit ? limit - planned : null, count: list.length };
}

/* .ics so any outing can be added to Apple / Google / Outlook calendars. */
const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const pad = (n) => String(n).padStart(2, '0');
export function toIcs(events, cityName = 'Life City', now = new Date()) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Life City//Family calendar//EN', 'CALSCALE:GREGORIAN'];
  for (const e of [].concat(events)) {
    const d = e.date.replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@lifecity`, `DTSTAMP:${stamp}`);
    if (e.time) {
      const [h, m] = e.time.split(':').map(Number);
      const end = new Date(2000, 0, 1, h + 2, m);
      const endDay = h + 2 >= 24 ? nextDay(e.date) : d;
      lines.push(`DTSTART:${d}T${pad(h)}${pad(m)}00`, `DTEND:${endDay}T${pad(end.getHours())}${pad(end.getMinutes())}00`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
    }
    lines.push(`SUMMARY:${icsText(e.title)}`);
    if (e.place) lines.push(`LOCATION:${icsText(e.place)}`);
    const desc = [e.notes, e.budget ? `Planned budget: $${e.budget}` : '', `From ${cityName}`].filter(Boolean).join('\n');
    lines.push(`DESCRIPTION:${icsText(desc)}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
function nextDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  const n = new Date(y, m - 1, d + 1);
  return `${n.getFullYear()}${pad(n.getMonth() + 1)}${pad(n.getDate())}`;
}
