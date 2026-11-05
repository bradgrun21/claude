import { AREAS } from './areas.js';
import { STARTER_HOUSES, FAMILY_HOME } from './layout.js';
import { emptyMaterials } from '../systems/materials.js';
import { emptyBoard } from '../systems/orders.js';
import { BAR_START } from '../systems/rating.js';
import { checkUnlocks } from '../systems/money.js';
import { note } from '../systems/journal.js';

/*
 * One state object that every system reads. Saved to localStorage (browser only — no real
 * user data leaves the device in Phase 1).
 */
export const STORAGE_KEY = 'life-city:v1';
export const VERSION = 1;

export function baseState() {
  return {
    v: VERSION,
    startDate: null,
    setup: {
      done: false, household: 'one', cityName: 'Our Life City',
      pay: { amount: 0, freq: 'biweekly', next: null },
      bills: 0, debt: 0, debtPayments: 0, savings: 0,
      ranking: [...AREAS]
    },
    family: [],
    goals: [],
    money: { cushion: 0, debt: 0, debtStart: 0, debtPayments: 0, bills: 0, startDate: null, extraPaid: 0, stalledPaydays: 0, payoffDate: null, firstDebtPaid: false },
    points: 0,
    bars: { values: {}, updated: null },
    loggedDays: [],
    garden: [],
    materials: emptyMaterials(),
    materialLog: { date: null, counts: {} },
    orders: emptyBoard(),
    residents: {},
    train: { lastPayday: null, ordersSincePayday: 0, cars: [], decoSeq: 0, arrivals: 0 },
    decorations: [],
    buildings: [],
    buildSeq: 0,
    unlocked: {},
    stickers: [],
    journal: [],
    firstMove: true,
    settings: { sound: true, quality: 'auto', gentle: false, night: false }
  };
}

export function starterBuildings(date) {
  const list = STARTER_HOUSES.map((h, i) => ({ id: `s${i}`, kind: 'home', district: 'starter', x: h.x, z: h.z, rot: h.rot, variant: h.variant, floors: 1, builtOn: date, story: 'Here since the city was founded', starter: true }));
  list.push({ id: 'family', kind: 'family-home', district: 'starter', x: FAMILY_HOME.x, z: FAMILY_HOME.z, rot: FAMILY_HOME.rot, variant: 0, floors: 2, builtOn: date, story: 'Your family’s home. The city grew up around it', starter: true });
  return list;
}

/*
 * input = { household, cityName, pay:{amount,freq,next}, bills, debt, debtPayments, savings,
 *           ranking:[areas], goals:[{area,label,perWeek}], family:[{name,color,kind}] }
 */
export function createFromSetup(input, today) {
  const s = baseState();
  s.startDate = today;
  s.setup = { ...s.setup, ...input, done: true, pay: { ...input.pay } };
  s.family = input.family.filter((m) => m.name && m.name.trim()).map((m) => ({ ...m, name: m.name.trim() }));
  s.goals = input.goals.filter((g) => g.label && g.label.trim() && g.perWeek > 0).map((g, i) => ({ id: `g${i}`, area: g.area, label: g.label.trim(), perWeek: Math.min(7, Math.max(1, Math.round(g.perWeek))), done: [] }));
  for (const g of s.goals) s.bars.values[g.area] = BAR_START;
  s.bars.updated = today;
  s.money = {
    ...s.money,
    cushion: Math.max(0, Math.round(input.savings || 0)),
    debt: Math.max(0, Math.round(input.debt || 0)),
    debtStart: Math.max(0, Math.round(input.debt || 0)),
    debtPayments: Math.max(0, Math.round(input.debtPayments || 0)),
    bills: Math.max(0, Math.round(input.bills || 0)),
    startDate: today
  };
  s.buildings = starterBuildings(today);
  s.train.lastPayday = today;
  note(s, today, 'founded');
  checkUnlocks(s, today);
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== VERSION) return null;
    /* Fill any fields added since this save was written. */
    const base = baseState();
    for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
    s.settings = { ...base.settings, ...s.settings };
    return s;
  } catch (e) {
    return null;
  }
}

let saveTimer = 0;
export function save(state, now = false) {
  const write = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked: keep playing */ }
  };
  clearTimeout(saveTimer);
  if (now) write(); else saveTimer = setTimeout(write, 250);
}

export function clearSave() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}
