import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import { createList, addTask, addGoal, completeTask, achieveGoal, streak, reviewWeek, canReviewWeek, useLevel, migrateList, dueCount, isAvailable, fromFreq, freqLabel, updateTask, FULL_REWARDS_PER_DAY, TOKEN_REWARD, DAILY_VISIT, STREAK_BONUS } from '../src/systems/lists.js';
import { sectionUnlocked, nextSection, SECTION_ORDER } from '../src/systems/progression.js';
import { addDays } from '../src/systems/time.js';

const T = '2026-11-06'; // Friday
const city = () => newCity({ cityName: 'Test', family: [] }, T);
const place = (s, type, i, j) => { const b = { id: `b${s.buildSeq++}`, type, i, j, rot: 0, level: 1, builtOn: T }; s.buildings.push(b); return b; };

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

describe('areas open in order', () => {
  it('To-Do → Financial → Relational (after budget) → Physical → Spiritual', () => {
    const s = city();
    expect(SECTION_ORDER.map((x) => sectionUnlocked(s, x))).toEqual([true, false, false, false, false]);
    const jb = place(s, 'jobboard', 15, 19);
    expect(sectionUnlocked(s, 'financial')).toBe(false);
    createList(s, jb, '', [{ title: 'Dishes', kind: 'daily' }], T);
    expect(sectionUnlocked(s, 'financial')).toBe(true);
    createList(s, place(s, 'bank', 20, 16), '', [{ title: 'Log', kind: 'daily' }], T);
    expect(sectionUnlocked(s, 'relational')).toBe(false);
    s.budget.setup = true;
    expect(sectionUnlocked(s, 'relational')).toBe(true);
    expect(sectionUnlocked(s, 'physical')).toBe(false);
    expect(nextSection(s)).toBe('relational');
  });
  it('anything already opened stays open', () => {
    const s = city();
    place(s, 'church', 10, 16);
    expect(sectionUnlocked(s, 'spiritual')).toBe(true);
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
