import { grant } from './economy.js';
import { daysBetween } from './time.js';
import { weekStart } from './lists.js';

/*
 * Logbooks: buildings that simply keep track of things. One engine, each tracker is a description:
 * the fields an entry has, what it's "about" (a car, a pet, a person), and an optional reminder date.
 * Entries stay on this device. Each entry pays a small reward, up to 3 a week per logbook.
 * On purpose, there is no medicine or dosing tracker and no important-documents store: a game shouldn't be
 * anyone's only record of those. Phones and pharmacies handle medicine reminders far more reliably.
 */
const DATE = { k: 'date', type: 'date', label: 'Date' };
export const LOGS = {
  repair: {
    subjects: 'cars', subjectLabel: 'Car', addLabel: 'Add a car',
    fields: [DATE, { k: 'what', type: 'text', label: 'Work done', req: true, ph: 'Like “Oil change” or “New brakes”' }, { k: 'miles', type: 'number', label: 'Mileage' }, { k: 'cost', type: 'money', label: 'Cost' }, { k: 'shop', type: 'text', label: 'Shop', ph: 'Who did it' }, { k: 'notes', type: 'longtext', label: 'Notes' }, { k: 'photo', type: 'photo', label: 'Receipt photo' }]
  },
  vet: {
    subjects: 'pets', subjectLabel: 'Pet', addLabel: 'Add a pet', reminder: 'next', reminderDays: 30,
    fields: [DATE, { k: 'type', type: 'select', label: 'Kind', options: ['Checkup', 'Vaccine', 'Grooming', 'Sick visit', 'Other'] }, { k: 'what', type: 'text', label: 'What', req: true, ph: 'Like “Rabies booster”' }, { k: 'vet', type: 'text', label: 'Vet' }, { k: 'cost', type: 'money', label: 'Cost' }, { k: 'next', type: 'date', label: 'Next checkup or vaccine (optional)' }, { k: 'notes', type: 'longtext', label: 'Notes' }, { k: 'photo', type: 'photo', label: 'Photo' }]
  },
  gifts: {
    subjects: 'people', subjectLabel: 'Person', addLabel: 'Add someone',
    fields: [{ k: 'kind', type: 'select', label: 'Kind', options: ['Idea', 'Given', 'Size'] }, { k: 'what', type: 'text', label: 'What', req: true, ph: 'Gift idea, gift given, or a size like “Shoe: 4Y”' }, { k: 'occasion', type: 'text', label: 'Occasion', ph: 'Birthday, Christmas…' }, DATE, { k: 'cost', type: 'money', label: 'Cost' }, { k: 'notes', type: 'longtext', label: 'Notes' }]
  }
};
export const LOG_REWARD = { coins: 10, xp: 5 };

let seq = 0;
const uid = () => `lg${Date.now().toString(36)}${(seq++).toString(36)}`;
const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

export function ensureLogs(state) {
  state.logs = state.logs || {};
  for (const k of Object.keys(LOGS)) state.logs[k] = state.logs[k] || [];
  state.logPeople = state.logPeople || [];
  return state;
}

/* Who or what entries are about. Cars come from Car & Home Care, pets from the family, people from family + birthdays. */
export function logSubjects(state, id) {
  const def = LOGS[id];
  if (def.subjects === 'cars') return (state.care?.things || []).filter((t) => t.kind === 'car').map((t) => t.name);
  if (def.subjects === 'pets') return state.family.filter((m) => m.kind === 'pet').map((m) => m.name);
  if (def.subjects === 'people') return [...new Set([...state.family.filter((m) => m.kind !== 'pet').map((m) => m.name), ...(state.cards?.people || []).map((p) => p.name), ...(state.logPeople || [])])];
  return [];
}

function clean(def, data) {
  const out = {};
  for (const f of def.fields) {
    const v = data[f.k];
    if (f.type === 'photo') { out.photoId = data.photoId || null; continue; }
    if (v == null || v === '') continue;
    if (f.type === 'date') { if (isDay(v)) out[f.k] = v; }
    else if (f.type === 'number') { const n = Math.round(parseFloat(String(v).replace(/[^0-9.]/g, ''))); if (Number.isFinite(n)) out[f.k] = n; }
    else if (f.type === 'money') { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); if (Number.isFinite(n)) out[f.k] = Math.round(n * 100) / 100; }
    else if (f.type === 'select') { if (f.options.includes(v)) out[f.k] = v; }
    else out[f.k] = String(v).trim().slice(0, f.type === 'longtext' ? 600 : 80);
  }
  return out;
}

export function addLogEntry(state, id, data, day) {
  ensureLogs(state);
  const def = LOGS[id];
  const vals = clean(def, data);
  if (def.fields.some((f) => f.req && !vals[f.k])) return null;
  if (def.fields.some((f) => f.k === 'date') && !vals.date) vals.date = day;
  if (def.fields.some((f) => f.type === 'select') && def.fields.filter((f) => f.type === 'select').some((f) => !vals[f.k])) for (const f of def.fields.filter((x) => x.type === 'select')) vals[f.k] = vals[f.k] || f.options[0];
  const e = { id: uid(), subject: def.subjects ? (data.subject || null) : null, created: day, ...vals };
  state.logs[id].push(e);
  if (state.logs[id].length > 500) state.logs[id].shift();
  /* Repair Log → Car & Home Care: the repair also shows up in that car's history (date + odometer). */
  const linked = [];
  if (id === 'repair' && e.subject && state.care) {
    const th = state.care.things.find((t) => t.kind === 'car' && t.name === e.subject);
    if (th) { state.care.log.push({ id: `cl${uid()}`, thingId: th.id, what: e.what, date: e.date, odometer: e.miles || null, note: e.shop ? `At ${e.shop}` : '', from: 'repair' }); linked.push(th.name); }
  }
  return { entry: e, linked, reward: capReward(state, id, day) };
}
function capReward(state, id, day) {
  state.tools = state.tools || {};
  const rec = state.tools[id] || (state.tools[id] = {});
  const b = (rec.caps = rec.caps || {});
  const wk = weekStart(day);
  if (!b.log || b.log.p !== wk) b.log = { p: wk, n: 0 };
  if (b.log.n >= 3) return null;
  b.log.n++;
  grant(state, LOG_REWARD);
  return LOG_REWARD;
}
export function updateLogEntry(state, id, entryId, data) {
  const e = state.logs?.[id]?.find((x) => x.id === entryId);
  if (!e) return null;
  const def = LOGS[id];
  const vals = clean(def, { ...e, ...data });
  if (def.fields.some((f) => f.req && !vals[f.k])) return null;
  for (const f of def.fields) if (f.type !== 'photo') delete e[f.k];
  Object.assign(e, vals);
  if (data.subject !== undefined && def.subjects) e.subject = data.subject || null;
  return e;
}
export function removeLogEntry(state, id, entryId) {
  const i = state.logs?.[id]?.findIndex((x) => x.id === entryId);
  if (i == null || i < 0) return null;
  return state.logs[id].splice(i, 1)[0];
}
export function logEntries(state, id, subject = null) {
  const sortKey = (e) => e.date || e.expires || e.created || '';
  return (state.logs?.[id] || []).filter((e) => !subject || e.subject === subject).slice().sort((a, b) => sortKey(b).localeCompare(sortKey(a)));
}

/* Older towns: drop the removed Records Hall data and any medicine entries' next-dose dates. */
export function migrateLogs(state) {
  ensureLogs(state);
  if (state.logs.records) { const gone = state.logs.records; delete state.logs.records; if (state.tools) delete state.tools.records; return gone.map((e) => e.photoId).filter(Boolean); }
  return [];
}
export function migrateVet(state) {
  for (const e of state.logs?.vet || []) if (e.type === 'Medicine') { e.type = 'Other'; delete e.next; }
}

/* Reminders: entries whose reminder date is coming up (or recently passed) and not yet marked handled. */
export function logReminders(state, id, day, within = null) {
  const def = LOGS[id];
  if (!def.reminder) return [];
  const win = within ?? def.reminderDays;
  return (state.logs?.[id] || []).filter((e) => e[def.reminder] && !e.handled && daysBetween(day, e[def.reminder]) <= win && daysBetween(e[def.reminder], day) <= 60)
    .map((e) => ({ ...e, on: e[def.reminder], days: daysBetween(day, e[def.reminder]) })).sort((a, b) => a.on.localeCompare(b.on));
}
export function markHandled(state, id, entryId) { const e = state.logs?.[id]?.find((x) => x.id === entryId); if (e) e.handled = true; return e; }
export const logDueSoon = (state, id, day) => logReminders(state, id, day, 14).length;

/* Totals for the summary tab. */
export function logTotals(state, id, day) {
  const year = day.slice(0, 4);
  const es = state.logs?.[id] || [];
  const by = {};
  for (const e of es) {
    const k = e.subject || e.category || 'All';
    const t = by[k] || (by[k] = { n: 0, cost: 0, yearCost: 0, miles: 0 });
    t.n++; t.cost += e.cost || 0; if ((e.date || '').startsWith(year)) t.yearCost += e.cost || 0;
    if (e.miles && e.miles > t.miles) t.miles = e.miles;
  }
  return { count: es.length, by, yearCost: es.filter((e) => (e.date || '').startsWith(year)).reduce((a, e) => a + (e.cost || 0), 0) };
}
/* Latest size per label per person ("Shoe: 4Y", "Shirt: 6"). */
export function latestSizes(state) {
  const out = {};
  for (const e of logEntries(state, 'gifts').slice().reverse()) {
    if (e.kind !== 'Size' || !e.subject) continue;
    const [label, ...rest] = e.what.split(':');
    const key = rest.length ? label.trim() : 'Size';
    const val = rest.length ? rest.join(':').trim() : e.what;
    (out[e.subject] = out[e.subject] || {})[key] = { val, date: e.date };
  }
  return out;
}
export function addLogPerson(state, name) {
  ensureLogs(state);
  const n = String(name || '').trim();
  if (!n || state.logPeople.includes(n)) return null;
  state.logPeople.push(n.slice(0, 40));
  return n;
}
export function addPet(state, name, color = '#C9A06A') {
  const n = String(name || '').trim();
  if (!n || state.family.some((m) => m.name.toLowerCase() === n.toLowerCase())) return null;
  const m = { name: n.slice(0, 20), color, kind: 'pet' };
  state.family.push(m);
  return m;
}
