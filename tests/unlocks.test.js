import { describe, it, expect, beforeEach } from 'vitest';
import { newCity, load, STORAGE_KEY } from '../src/data/state.js';
import { byId, BUILDINGS } from '../src/data/catalog.js';
import { reqFor, trackerLock } from '../src/systems/unlocks.js';
import { createList, addTask, completeTask } from '../src/systems/lists.js';
import { setupBudget } from '../src/systems/budget.js';
import { toolAvailable } from '../src/systems/tools.js';
import { sectionUnlocked, areaOrder } from '../src/systems/progression.js';

const T = '2026-11-05';
const city = () => newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, T);
const put = (s, type, extra = {}) => { const b = { id: `b${s.buildSeq++}`, type, i: 0, j: 0, rot: 0, level: 1, builtOn: T, ...extra }; s.buildings.push(b); return b; };
const habit = (s, type, title = 'Walk') => { const b = s.buildings.find((x) => x.type === type) || put(s, type); const l = createList(s, b, '', [], T); const t = addTask(s, l.id, { title, kind: 'daily' }); for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) completeTask(s, l.id, t.id, d); return l; };

describe('one kind of gate per type of thing', () => {
  it('money-linked trackers open only when their category is budgeted, and are free', () => {
    const s = city();
    put(s, 'bank');
    for (const [type, cat] of [['grocery', 'Groceries'], ['gasstation', 'Transportation'], ['newsstation', 'Subscriptions']]) expect(reqFor(s, type)).toMatchObject({ ok: false, why: `Opens when ${cat} is budgeted` });
    s.level = 9; s.coins = 9999;
    expect(reqFor(s, 'grocery').ok).toBe(false);
    setupBudget(s, { incomes: [{ amount: 2000 }], expenses: { groceries: 500, transport: 100, subscriptions: 30 } }, T);
    for (const type of ['grocery', 'gasstation', 'newsstation']) expect(reqFor(s, type)).toEqual({ ok: true, cost: 0 });
  });
  it('town trackers open by town level only, with their build cost', () => {
    const s = city();
    expect(reqFor(s, 'repairshop')).toMatchObject({ ok: false, why: 'Opens at town level 2' });
    expect(reqFor(s, 'vet')).toMatchObject({ ok: false, why: 'Opens at town level 2' });
    expect(reqFor(s, 'school')).toMatchObject({ ok: false, why: 'Opens at town level 3' });
    expect(reqFor(s, 'giftshop')).toMatchObject({ ok: false, why: 'Opens at town level 3' });
    s.level = 2;
    expect(reqFor(s, 'repairshop')).toEqual({ ok: true, cost: 80 });
    expect(reqFor(s, 'vet')).toEqual({ ok: true, cost: 80 });
    s.level = 3;
    expect(reqFor(s, 'school')).toEqual({ ok: true, cost: 120 });
    expect(reqFor(s, 'giftshop')).toEqual({ ok: true, cost: 60 });
    expect(toolAvailable(s, 'meeting')).toBe(true);
    s.level = 2;
    expect(toolAvailable(s, 'meeting')).toBe(false);
  });
  it('life-area buildings open by habits only (no money levels), keeping their prices', () => {
    const s = city();
    habit(s, 'jobboard', 'Dishes');
    habit(s, 'bank', 'Log');
    expect(reqFor(s, 'payoff')).toEqual({ ok: true, cost: 150 });
    expect(reqFor(s, 'savings')).toMatchObject({ ok: false, why: 'Form 1 more Financial habit' });
  });
  it('trackers in life-area buildings say which building opens them', () => {
    const s = city();
    expect(trackerLock(s, 'cafe')).toMatchObject({ ok: false, why: 'Opens with the Coffee House' });
    expect(trackerLock(s, 'postoffice')).toMatchObject({ ok: false, why: 'Opens with the Post Office' });
  });
});

describe('Post Office is To-Do’s 2nd building, Workshop the 3rd', () => {
  it('swaps tiers and prices', () => {
    expect([byId.postoffice.tier, byId.postoffice.cost]).toEqual([2, 150]);
    expect([byId.workshop.tier, byId.workshop.cost]).toEqual([3, 400]);
  });
  it('Birthdays & Cards opens with the Post Office at 1 To-Do habit', () => {
    const s = city();
    habit(s, 'jobboard');
    expect(reqFor(s, 'postoffice')).toEqual({ ok: true, cost: 150 });
    expect(reqFor(s, 'workshop')).toMatchObject({ ok: false, why: 'Form 1 more To-Do habit' });
    put(s, 'postoffice');
    expect(toolAvailable(s, 'cards')).toBe(true);
  });
  it('a Workshop someone already built stays built', () => {
    const s = city();
    put(s, 'workshop');
    expect(reqFor(s, 'workshop')).toEqual({ built: true });
  });
});

describe('every locked thing shows exactly one reason', () => {
  it('in a brand-new town and in a busy one', () => {
    const fresh = city();
    const busy = city(); busy.level = 4; habit(busy, 'jobboard'); habit(busy, 'bank');
    for (const s of [fresh, busy]) for (const d of BUILDINGS) {
      if (d.kind === 'civic') continue;
      const r = reqFor(s, d.id);
      if (r.ok || r.built) continue;
      expect(typeof r.why).toBe('string');
      expect(r.why.length).toBeGreaterThan(3);
      expect(r.short.length).toBeGreaterThan(2);
      expect(r.why).not.toMatch(/ and (reach|build|form|budget)/i);
      expect(r.why).not.toMatch(/coin/i);
    }
  });
});

describe('loading an older save', () => {
  let store;
  beforeEach(() => { store = new Map(); globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) }; });
  it('keeps Relational open and gives back invested Nest Egg coins', () => {
    const s = city();
    delete s.areaOrder;
    habit(s, 'jobboard');
    const bank = put(s, 'bank'); createList(s, bank, '', [{ title: 'Log', kind: 'daily' }], T);
    s.budget.setup = true;
    put(s, 'park');
    put(s, 'nestegg', { level: 4 });
    s.coins = 300;
    s.invest = { bal: 800, principal: 700, growth: 100, last: null, deposits: [], fees: 0 };
    store.set(STORAGE_KEY, JSON.stringify(s));
    const loaded = load();
    expect(sectionUnlocked(loaded, 'relational')).toBe(true);
    expect(areaOrder(loaded).slice(0, 3)).toEqual(['todo', 'financial', 'relational']);
    expect(loaded.coins).toBe(1100);
    expect(loaded.invest.bal).toBe(0);
    expect(loaded.invest.notice).toBe(800);
    expect(loaded.buildings.some((b) => b.type === 'nestegg')).toBe(true);
  });
  it('a Relational that was unlocked (budget set) but not built yet stays unlocked', () => {
    const s = city();
    delete s.areaOrder;
    habit(s, 'jobboard');
    put(s, 'bank'); s.budget.setup = true;
    store.set(STORAGE_KEY, JSON.stringify(s));
    expect(sectionUnlocked(load(), 'relational')).toBe(true);
  });
});
