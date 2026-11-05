import { TOWNHALL_AT, starterRoads, key } from './map.js';

/*
 * One state object that every system reads, saved in this browser only (Phase 1: no real user data leaves the device).
 * v2 = the open-map, Township-style redesign (Nov 2026).
 */
export const STORAGE_KEY = 'life-city:v2';
export const VERSION = 2;

export function baseState() {
  return {
    v: VERSION,
    startDate: null,
    cityName: 'Our Life City',
    family: [],
    spiritualStyle: null,
    coins: 100,
    xp: 0,
    level: 1,
    tcLevel: 1,
    roads: [],
    buildings: [],
    buildSeq: 0,
    lists: [],
    loggedDays: [],
    stats: {},
    challenges: { day: null, items: [] },
    milestones: {},
    quickWins: {},
    tour: { step: 0, done: false },
    stickers: [],
    journal: [],
    memories: [],
    events: [],
    settings: { sound: true, quality: 'auto', night: false, outingBudget: 0 }
  };
}

export function newCity({ cityName, family }, today) {
  const s = baseState();
  s.startDate = today;
  s.cityName = (cityName || '').trim() || (family?.[0]?.name ? `${family[0].name.trim()}'s Life City` : 'Our Life City');
  s.family = (family || []).filter((m) => m.name && m.name.trim()).map((m) => ({ ...m, name: m.name.trim() }));
  s.roads = starterRoads().map(([i, j]) => key(i, j));
  s.buildings.push({ id: 'th', type: 'townhall', i: TOWNHALL_AT.i, j: TOWNHALL_AT.j, rot: 0, level: 1, builtOn: today, story: 'the day your family founded the city' });
  s.stats.lastDay = today;
  return s;
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== VERSION) return null;
    const base = baseState();
    for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
    s.settings = { ...base.settings, ...s.settings };
    return s;
  } catch (e) {
    return null;
  }
}

let timer = 0;
export function save(state, now = false) {
  const write = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked or full: keep playing */ } };
  clearTimeout(timer);
  if (now) write(); else timer = setTimeout(write, 250);
}
export function clearSave() {
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem('life-city:v1'); } catch (e) { /* ignore */ }
}
