import { TOWNHALL_AT, STATION_AT, starterRoads, stationRoad, key } from './map.js';
import { emptyBudget } from '../systems/budget.js';
import { occupancy } from '../systems/placement.js';
import { migrateList } from '../systems/lists.js';
import { ensureTools } from '../systems/tools.js';
import { migrateLogs, migrateVet } from '../systems/logbook.js';
import { byId } from './catalog.js';

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
    budget: emptyBudget(),
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
  addStation(s, today);
  ensureTools(s);
  s.stats.lastDay = today;
  return s;
}

/* The train station + the road joining it to Main Street. Added to older towns on load if the spot is free. */
export function addStation(s, today) {
  if (s.buildings.some((b) => b.type === 'station')) return true;
  const occ = occupancy(s);
  const pad = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, c]) => [STATION_AT.i + a, STATION_AT.j + c]);
  const road = stationRoad();
  if ([...pad, ...road].some(([i, j]) => occ.has(key(i, j)))) return false;
  if (pad.some(([i, j]) => s.roads.includes(key(i, j)))) return false;
  for (const [i, j] of road) { const k = key(i, j); if (!s.roads.includes(k)) s.roads.push(k); }
  s.buildings.push({ id: 'station', type: 'station', i: STATION_AT.i, j: STATION_AT.j, rot: 0, level: 1, builtOn: today, story: 'the payday train stops here' });
  return true;
}

/* Records Hall and the Time Capsule were removed (Nov 2026). Refund the building, drop its data. */
export function removedFeatures(s) {
  const gone = s.buildings.filter((b) => !byId[b.type]);
  for (const b of gone) if (b.type === 'records') s.coins += 120;
  s.buildings = s.buildings.filter((b) => byId[b.type]);
  s.earned = (s.earned || []).filter((e) => e.id !== 'capsule');
  s.pendingPhotoDeletes = [...(s.pendingPhotoDeletes || []), ...migrateLogs(s)];
  migrateVet(s);
  return gone.length;
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
    s.budget = { ...base.budget, ...s.budget };
    s.lists.forEach(migrateList);
    ensureTools(s);
    removedFeatures(s);
    addStation(s, s.stats?.lastDay || s.startDate);
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
