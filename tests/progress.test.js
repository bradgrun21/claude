import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import { createList, addTask, addGoal, completeTask, achieveGoal, streak, reviewWeek, canReviewWeek, useLevel, migrateList, dueCount, isAvailable, fromFreq, freqLabel, updateTask, FULL_REWARDS_PER_DAY, TOKEN_REWARD, DAILY_VISIT, STREAK_BONUS } from '../src/systems/lists.js';
import { sectionUnlocked, nextSection, SECTION_ORDER, choiceFor, chooseArea, areaOrder, areaOrderFull, unlockHint } from '../src/systems/progression.js';
import { addDays } from '../src/systems/time.js';

const T = '2026-11-06'; // Friday
const city = () => newCity({ cityName: 'Test', family: [] }, T);
const place = (s, type, i, j, extra = {}) => { const b = { id: `b${s.buildSeq++}`, type, i, j, rot: 0, level: 1, builtOn: T, ...extra }; s.buildings.push(b); return b; };

describe('tasks without a big goal', () => {
  it('a list can be just simple tasks', () => {
    const s = city();
    const l = createList(s, place(s, 'jobboard', 15, 19), '', [{ title: 'Dishes', kind: 'daily' }], T);
    expect(l.goals).toEqual([]);
    addTask(s, l.id, { title: 'Laundry', ...fromFreq('w2') });
    expect(l.tasks.map((t) => [t.title, freqLabel(t), t.goalId])).toEqual([['Dishes', 'Daily', null], ['Laundry', '2×/wk', null]]);
    updateTask(s, l.id, l.tasks[1].id, { freq: 'once', title: 'Laundry (big load)' });
    expect(freqLabel(l.tasks[1])).toBe('Once');
  });
  it('goals hold their own steps; finishing a goal retires them', () => {
    const s = city();
    const l = createList(s, place(s, 'gym', 20, 16), '', [], T);
    const g = addGoal(s, l.id, 'Run a 5K', T);
    addTask(s, l.id, { title: 'Run 20 minutes', kind: 'weekly', per: 3, goalId: g.id });
    addTask(s, l.id, { title: 'Stretch', kind: 'daily' });
    expect(dueCount(l, T)).toBe(2);
    achieveGoal(s, l.id, g.id, T);
    expect(dueCount(l, T)).toBe(1);
    expect(isAvailable(l.tasks[0], addDays(T, 3), l)).toBe(false);
  });
  it('old saves (one big goal per list) migrate', () => {
    const old = { id: 'l1', goal: 'Read the Gospels', tasks: [{ id: 't1', title: 'Read', kind: 'daily', per: 1, done: [] }], createdOn: T, achieved: [] };
    migrateList(old);
    expect(old.goal).toBeUndefined();
    expect(old.goals[0].title).toBe('Read the Gospels');
    expect(old.tasks[0].goalId).toBe(old.goals[0].id);
  });
});

describe('progress from consistency, not from adding more', () => {
  it('first 6 check-offs a day pay in full, then a small token', () => {
    const s = city();
    const l = createList(s, place(s, 'jobboard', 15, 19), '', Array.from({ length: 9 }, (_, k) => ({ title: `Task ${k}`, kind: 'daily' })), T);
    const rewards = l.tasks.map((t) => completeTask(s, l.id, t.id, T).reward);
    expect(rewards.slice(0, FULL_REWARDS_PER_DAY).every((r) => r.coins === 10)).toBe(true);
    expect(rewards.slice(FULL_REWARDS_PER_DAY)).toEqual([TOKEN_REWARD, TOKEN_REWARD, TOKEN_REWARD]);
  });
  it('the first check-off of a day earns the daily visit bonus once', () => {
    const s = city();
    const l = createList(s, place(s, 'jobboard', 15, 19), '', [{ title: 'A', kind: 'daily' }, { title: 'B', kind: 'daily' }], T);
    expect(completeTask(s, l.id, l.tasks[0].id, T).visit).toEqual(DAILY_VISIT);
    expect(completeTask(s, l.id, l.tasks[1].id, T).visit).toBe(null);
  });
  it('streak bonus at 3 days', () => {
    const s = city();
    const l = createList(s, place(s, 'jobboard', 15, 19), '', [{ title: 'A', kind: 'daily' }], T);
    let last;
    for (let d = 0; d < 3; d++) last = completeTask(s, l.id, l.tasks[0].id, addDays(T, d));
    expect(last.streakDays).toBe(3);
    expect(last.streakBonus).toEqual({ ...STREAK_BONUS[3], days: 3 });
  });
  it('one rest day a week never breaks a streak; two missed days do', () => {
    const s = city();
    s.loggedDays = ['2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'];
    expect(streak(s, T)).toBe(4);
    s.loggedDays = ['2026-11-02', '2026-11-05', '2026-11-06'];
    expect(streak(s, T)).toBe(2);
  });
  it('weekly review pays once a week', () => {
    const s = city();
    expect(reviewWeek(s, T).reward.xp).toBeGreaterThan(0);
    expect(canReviewWeek(s, addDays(T, 1))).toBe(false);
    expect(canReviewWeek(s, addDays(T, 3))).toBe(true);
  });
  it('buildings grow from days of use, not number of tasks', () => {
    const s = city();
    const l = createList(s, place(s, 'gym', 20, 16), '', [{ title: 'Walk', kind: 'daily' }], T);
    for (let d = 0; d < 9; d++) l.tasks[0].done.push(addDays(T, -d));
    expect(useLevel(l)).toBe(1);
    l.tasks[0].done.push(addDays(T, -9));
    expect(useLevel(l)).toBe(2);
  });
});

describe('areas open in order: To-Do → Financial → the player chooses', () => {
  const addItem = (s, type, i, j) => { const b = place(s, type, i, j); createList(s, b, '', [{ title: 'Something', kind: 'daily' }], T); return b; };
  const MAIN = { relational: 'park', physical: 'gym', spiritual: 'church' };
  const perms = [['relational', 'physical', 'spiritual'], ['relational', 'spiritual', 'physical'], ['physical', 'relational', 'spiritual'], ['physical', 'spiritual', 'relational'], ['spiritual', 'relational', 'physical'], ['spiritual', 'physical', 'relational']];
  it('Financial opens when To-Do has something on it; the budget no longer gates anything', () => {
    const s = city();
    expect(SECTION_ORDER.map((x) => sectionUnlocked(s, x))).toEqual([true, false, false, false, false]);
    place(s, 'jobboard', 15, 19);
    expect(sectionUnlocked(s, 'financial')).toBe(false);
    createList(s, s.buildings.at(-1), '', [{ title: 'Dishes', kind: 'daily' }], T);
    expect(sectionUnlocked(s, 'financial')).toBe(true);
    expect(choiceFor(s)).toBe(null);
    s.budget.setup = true;
    expect(sectionUnlocked(s, 'relational')).toBe(false);
  });
  for (const order of perms) it(`choice order ${order.join(' → ')}`, () => {
    const s = city();
    addItem(s, 'jobboard', 15, 19);
    addItem(s, 'bank', 20, 16);
    expect(choiceFor(s)).toEqual({ options: ['relational', 'physical', 'spiritual'], after: 'financial' });
    expect(chooseArea(s, order[0])).toBe(true);
    expect(sectionUnlocked(s, order[0])).toBe(true);
    for (const o of order.slice(1)) expect(sectionUnlocked(s, o)).toBe(false);
    expect(choiceFor(s)).toBe(null);
    addItem(s, MAIN[order[0]], 10, 24);
    expect(choiceFor(s)).toEqual({ options: order.slice(1).sort((a, b) => ['relational', 'physical', 'spiritual'].indexOf(a) - ['relational', 'physical', 'spiritual'].indexOf(b)), after: order[0] });
    expect(chooseArea(s, order[0])).toBe(false);
    expect(chooseArea(s, order[1])).toBe(true);
    expect(sectionUnlocked(s, order[2])).toBe(false);
    addItem(s, MAIN[order[1]], 13, 24);
    expect(choiceFor(s)).toEqual({ auto: order[2], after: order[1] });
    expect(chooseArea(s, order[2])).toBe(true);
    expect(s.areaOrder).toEqual(['todo', 'financial', ...order]);
    expect(areaOrderFull(s)).toEqual(['todo', 'financial', ...order]);
    expect(choiceFor(s)).toBe(null);
  });
  it('locked areas give one plain reason', () => {
    const s = city();
    addItem(s, 'jobboard', 15, 19);
    addItem(s, 'bank', 20, 16);
    chooseArea(s, 'physical');
    expect(unlockHint(s, 'relational')).toBe('Choose this after Physical has something on it.');
  });
  it('anything already opened stays open', () => {
    const s = city();
    place(s, 'church', 10, 16);
    expect(sectionUnlocked(s, 'spiritual')).toBe(true);
  });
  it('older saves keep every area open under the old rules, in the order they opened', () => {
    const s = city();
    delete s.areaOrder;
    const jb = place(s, 'jobboard', 15, 19, { builtOn: '2026-10-01' }); createList(s, jb, '', [{ title: 'A', kind: 'daily' }], '2026-10-01');
    const bk = place(s, 'bank', 20, 16, { builtOn: '2026-10-02' }); createList(s, bk, '', [{ title: 'B', kind: 'daily' }], '2026-10-02');
    s.budget.setup = true;
    const park = place(s, 'park', 10, 24, { builtOn: '2026-10-05' }); createList(s, park, '', [{ title: 'C', kind: 'daily' }], '2026-10-05');
    expect(areaOrder(s)).toEqual(['todo', 'financial', 'relational', 'physical']);
    expect(sectionUnlocked(s, 'relational')).toBe(true);
    expect(sectionUnlocked(s, 'physical')).toBe(true);
    expect(sectionUnlocked(s, 'spiritual')).toBe(false);
  });
});

import { updateTask as _ut, updateGoal as _ug, setListPaused as _slp, targetLabel as _tl, isAvailable as _ia, dueCount as _dc, addTask as _at, addGoal as _ag, createList as _cl, completeTask as _ct } from '../src/systems/lists.js';
describe('pause, who, goal targets', () => {
  const D = '2026-11-05';
  const mk = () => {
    const s = newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, D);
    const b = { id: 'jb', type: 'jobboard', i: 12, j: 19, rot: 0, level: 1, builtOn: D }; s.buildings.push(b);
    const l = _cl(s, b, '', [], D);
    const t = _at(s, l.id, { title: 'Dishes', kind: 'daily', who: 'Pat' });
    const g = _ag(s, l.id, 'Run a 5K', D, '2026-11-15');
    const st = _at(s, l.id, { title: 'Run', kind: 'weekly', per: 3, goalId: g.id });
    return { s, l, t, g, st };
  };
  it('assigns a task to a family member', () => {
    const { s, l, t } = mk();
    expect(t.who).toBe('Pat');
    _ut(s, l.id, t.id, { who: null });
    expect(t.who).toBe(null);
  });
  it('a paused task, goal or list is never due and can’t be checked off', () => {
    const { s, l, t, g, st } = mk();
    expect(_dc(l, D)).toBe(2);
    _ut(s, l.id, t.id, { paused: true });
    expect(_ia(t, D, l)).toBe(false);
    expect(_ct(s, l.id, t.id, D)).toBe(null);
    _ug(s, l.id, g.id, { paused: true });
    expect(_dc(l, D)).toBe(0);
    _ut(s, l.id, t.id, { paused: false }); _ug(s, l.id, g.id, { paused: false });
    _slp(s, l.id, true, D);
    expect(_dc(l, D)).toBe(0);
    _slp(s, l.id, false, D);
    expect(_dc(l, D)).toBe(2);
    expect(_ct(s, l.id, st.id, D)).toBeTruthy();
  });
  it('goal target dates count down gently and never say overdue', () => {
    const { s, l, g } = mk();
    expect(_tl(g, D)).toBe('10 days to go');
    expect(_tl(g, '2026-11-14')).toBe('Target is tomorrow');
    expect(_tl(g, '2026-11-20')).toBe('Still going strong');
    _ug(s, l.id, g.id, { target: 'nonsense' });
    expect(g.target).toBe(null);
  });
});

import { habitsFormed, taskSlots, freeSlots, activeItems, tierOpen, noteFormed, nextTier } from '../src/systems/progression.js';
describe('habits pace each area', () => {
  const D0 = '2026-11-02';
  const mk = () => {
    const s = newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, D0);
    const gym = { id: 'g1', type: 'gym', i: 12, j: 19, rot: 0, level: 1, builtOn: D0 }; s.buildings.push(gym);
    const l = createList(s, gym, '', [], D0);
    return { s, l };
  };
  it('starts with one slot; a task done on 3 different days forms a habit, opens tier 2 and a second slot', () => {
    const { s, l } = mk();
    expect(taskSlots(s, 'physical')).toBe(1);
    const t = addTask(s, l.id, { title: 'Walk 2 minutes', kind: 'daily' });
    expect(freeSlots(s, 'physical')).toBe(0);
    expect(tierOpen(s, 'physical', 2)).toBe(false);
    for (const d of ['2026-11-02', '2026-11-03']) completeTask(s, l.id, t.id, d);
    expect(habitsFormed(s, 'physical')).toBe(0);
    completeTask(s, l.id, t.id, '2026-11-05');
    expect(habitsFormed(s, 'physical')).toBe(1);
    expect(tierOpen(s, 'physical', 2)).toBe(true);
    expect(tierOpen(s, 'physical', 3)).toBe(false);
    expect(freeSlots(s, 'physical')).toBe(1);
    expect(nextTier(s, 'physical')).toMatchObject({ open: true });
    expect(noteFormed(s).map((h) => h.title)).toEqual(['Walk 2 minutes']);
    expect(noteFormed(s)).toEqual([]);
  });
  it('a goal is one slot (its steps ride along); paused and finished items free their slot', () => {
    const { s, l } = mk();
    const g = addGoal(s, l.id, 'Run a 5K', D0);
    addTask(s, l.id, { title: 'Run 20 min', kind: 'weekly', per: 3, goalId: g.id });
    addTask(s, l.id, { title: 'Sign up', kind: 'once', goalId: g.id });
    expect(activeItems(s, 'physical')).toBe(1);
    const t = addTask(s, l.id, { title: 'Stretch', kind: 'daily' });
    expect(activeItems(s, 'physical')).toBe(2);
    updateTask(s, l.id, t.id, { paused: true });
    expect(activeItems(s, 'physical')).toBe(1);
  });
  it('habits are kept even if the task is removed later', () => {
    const { s, l } = mk();
    const t = addTask(s, l.id, { title: 'Walk', kind: 'daily' });
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-04']) completeTask(s, l.id, t.id, d);
    noteFormed(s);
    l.tasks = [];
    expect(habitsFormed(s, 'physical')).toBe(1);
    expect(taskSlots(s, 'physical')).toBe(2);
  });
});

import { pathStatus, checkPaths, tabLocked, currentTab, PATHS } from '../src/systems/paths.js';
import { addRecipe, setMeal, buildGroceryList, ensureTools } from '../src/systems/tools.js';
describe('step-by-step paths', () => {
  const D = '2026-11-05';
  const town = () => { const s = newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, D); ensureTools(s); return s; };
  it('meals: add a meal → plan the week → grocery list, each opening the next', () => {
    const s = town();
    let p = pathStatus(s, 'meals');
    expect(p.steps.map((x) => x.status)).toEqual(['current', 'locked', 'locked', 'locked']);
    expect(tabLocked(s, 'meals', 'week')).toBe(true);
    expect(currentTab(s, 'meals')).toBe('recipes');
    const r = addRecipe(s, { name: 'Tacos', ingredients: 'Shells' });
    expect(tabLocked(s, 'meals', 'week')).toBe(false);
    expect(currentTab(s, 'meals')).toBe('week');
    for (const d of ['2026-11-02', '2026-11-03', '2026-11-04']) setMeal(s, d, r.id);
    expect(pathStatus(s, 'meals').steps[2].status).toBe('current');
    buildGroceryList(s, D);
    expect(pathStatus(s, 'meals').steps.map((x) => x.status)).toEqual(['done', 'done', 'done', 'current']);
  });
  it('a later step never counts before the earlier ones are done', () => {
    const s = town();
    s.meals.list.push({ id: 'x', text: 'Milk', done: false });
    expect(pathStatus(s, 'meals').steps[2].status).toBe('locked');
  });
  it('pays each finished step once, and older towns are recorded quietly', () => {
    const s = town();
    addRecipe(s, { name: 'Tacos', ingredients: 'Shells' });
    const c0 = s.coins;
    const fresh = checkPaths(s);
    expect(fresh.map((f) => f.step.id)).toContain('recipe');
    expect(s.coins).toBeGreaterThan(c0);
    const c1 = s.coins;
    expect(checkPaths(s)).toEqual([]);
    expect(s.coins).toBe(c1);
    const old = town(); addRecipe(old, { name: 'Pizza', ingredients: 'Dough' });
    const c2 = old.coins;
    checkPaths(old, true);
    expect(old.coins).toBe(c2);
    expect(checkPaths(old)).toEqual([]);
  });
  it('every tracker and money has a path', () => {
    for (const id of ['money', 'meals', 'care', 'subs', 'cards', 'dates', 'kids', 'meeting', 'repair', 'vet', 'gifts']) expect(PATHS[id].length).toBeGreaterThan(2);
  });
});
