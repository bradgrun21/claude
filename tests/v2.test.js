import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import { demoState } from '../src/data/demo.js';
import { byId, BUILDINGS, homePop, mainBuildingFor, SECTION_KEYS } from '../src/data/catalog.js';
import { levelNeed, checkLevelUp, population, taskReward, goalReward, levelBlocker, canUpgradeTownHall, TOWNHALL } from '../src/systems/economy.js';
import { canPlace, canPlaceRoad, canRemoveRoad, connectedRoads, suggestSpot, footprint } from '../src/systems/placement.js';
import { createList, completeTask, isAvailable, achieveGoal, doneThisWeek, streak } from '../src/systems/lists.js';
import { dailyChallenges, claimChallenge, challengeProgress, milestoneState, claimMilestone, markQuickWin, claimQuickWin } from '../src/systems/challenges.js';
import { key, isWater, MAP } from '../src/data/map.js';
import { addDays } from '../src/systems/time.js';

const T = '2026-11-05'; // a Thursday
const city = () => newCity({ cityName: 'Test', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, T);
const place = (s, type, i, j, extra = {}) => { const b = { id: `b${s.buildSeq++}`, type, i, j, rot: 0, level: 1, builtOn: T, ...extra }; s.buildings.push(b); return b; };

describe('catalog', () => {
  it('has a main building for all five sections, free, unlocked at level 1', () => {
    for (const s of SECTION_KEYS) { const m = mainBuildingFor(s); expect(m.tier).toBe(1); expect(m.cost).toBe(0); expect(m.level).toBe(1); }
    expect(mainBuildingFor('spiritual', 'church').id).toBe('church');
    expect(mainBuildingFor('spiritual', 'garden').id).toBe('garden');
  });
  it('each section has 4 tiers and higher tiers need higher levels', () => {
    for (const s of SECTION_KEYS) {
      const list = BUILDINGS.filter((b) => b.section === s && !b.alt).sort((a, b) => a.tier - b.tier);
      expect(list.map((b) => b.tier)).toEqual([1, 2, 3, 4]);
      if (s === 'financial') { expect(list.map((b) => b.money || 0)).toEqual([0, 2, 3, 0]); continue; }
      for (let i = 1; i < 4; i++) expect(list[i].level).toBeGreaterThan(list[i - 1].level);
    }
  });
  it('home upgrades add population', () => {
    expect(homePop('cottage', 1)).toBe(5);
    expect(homePop('cottage', 2)).toBe(8);
    expect(homePop('apartments', 3)).toBe(25 + 13 * 2);
  });
});

describe('three currencies', () => {
  it('higher-tier lists pay more coins and XP, and the Town Hall adds 10% per level', () => {
    expect(taskReward(1, 1)).toEqual({ coins: 10, xp: 5 });
    expect(taskReward(2, 1)).toEqual({ coins: 15, xp: 7 });
    expect(taskReward(4, 1)).toEqual({ coins: 30, xp: 11 });
    expect(taskReward(1, 3).coins).toBe(12);
    expect(goalReward(2)).toEqual({ coins: 200, xp: 80 });
  });
  it('leveling up needs XP AND population', () => {
    const s = city();
    s.xp = levelNeed(1).xp;
    expect(checkLevelUp(s)).toEqual([]);
    expect(levelBlocker(s)).toEqual({ kind: 'pop', need: 5, have: 0 });
    place(s, 'cottage', 12, 19);
    expect(population(s)).toBe(5);
    expect(checkLevelUp(s)).toEqual([2]);
    expect(s.xp).toBe(0);
  });
  it('level 5 needs a level-2 Town Hall', () => {
    const s = city();
    s.level = 4; s.xp = levelNeed(4).xp + 5;
    for (let k = 0; k < 8; k++) place(s, 'cottage', 11 + k, 19);
    expect(levelBlocker(s)).toEqual({ kind: 'tc', need: 2 });
    expect(checkLevelUp(s)).toEqual([]);
    s.tcLevel = 2;
    expect(checkLevelUp(s)).toEqual([5]);
    expect(s.xp).toBe(5);
  });
  it('Town Hall upgrades need population and coins', () => {
    const s = city();
    expect(canUpgradeTownHall(s)).toMatchObject({ ok: false, reason: 'pop' });
    for (let k = 0; k < 5; k++) place(s, 'cottage', 11 + k, 19);
    expect(canUpgradeTownHall(s)).toMatchObject({ ok: false, reason: 'coins' });
    s.coins = TOWNHALL[2].coins;
    expect(canUpgradeTownHall(s).ok).toBe(true);
  });
});

describe('placement', () => {
  it('starter roads connect to the Town Hall', () => {
    const s = city();
    expect(connectedRoads(s).size).toBe(s.roads.length);
  });
  it('buildings must touch a connected road; decorations don’t', () => {
    const s = city();
    expect(canPlace(s, 'cottage', 12, 19).ok).toBe(true);
    expect(canPlace(s, 'cottage', 12, 21)).toMatchObject({ ok: false, reason: expect.stringContaining('road') });
    expect(canPlace(s, 'tree', 12, 21).ok).toBe(true);
    s.roads.push(key(5, 5));
    expect(canPlace(s, 'cottage', 5, 6).ok).toBe(false);
  });
  it('no overlaps, no water, no building on roads', () => {
    const s = city();
    expect(canPlace(s, 'gym', 16, 15).ok).toBe(false);
    expect(canPlace(s, 'cottage', 12, 18).ok).toBe(false);
    let wi = -1, wj = -1;
    for (let i = 0; i < MAP && wi < 0; i++) for (let j = 0; j < MAP; j++) if (isWater(i, j)) { wi = i; wj = j; break; }
    expect(canPlace(s, 'tree', wi, wj).ok).toBe(false);
    expect(canPlaceRoad(s, wi, wj).ok).toBe(false);
  });
  it('a road can’t be removed if a building would lose its connection', () => {
    const s = city();
    s.roads.push(key(12, 19), key(12, 20));
    place(s, 'cottage', 13, 19);
    expect(canRemoveRoad(s, 12, 20).ok).toBe(true);
    s.buildings.pop();
    place(s, 'cottage', 11, 20);
    expect(canRemoveRoad(s, 12, 19).ok).toBe(false);
  });
  it('suggests a legal spot near a point', () => {
    const s = city();
    const p = suggestSpot(s, 'gym', { i: 16, j: 19 });
    expect(canPlace(s, 'gym', p.i, p.j).ok).toBe(true);
    expect(footprint('gym', p.i, p.j).length).toBe(4);
  });
  it('the train station sits by the railway and connects to Main Street', () => {
    const s = city();
    const st = s.buildings.find((b) => b.type === 'station');
    expect(st).toBeTruthy();
    expect(connectedRoads(s).has(key(5, 18))).toBe(true);
    expect(canPlace(s, 'cottage', 2, 20).ok).toBe(false);
    expect(canPlaceRoad(s, 2, 5).ok).toBe(false);
  });
  it('every building in the sample town is placed legally', () => {
    const s = demoState(T);
    for (const b of s.buildings) if (b.type !== 'townhall' && b.type !== 'station') expect([b.type, b.i, b.j, canPlace(s, b.type, b.i, b.j, b.rot, b.id).ok]).toEqual([b.type, b.i, b.j, true]);
  });
});

describe('lists and tasks', () => {
  const withList = () => {
    const s = city();
    const gym = place(s, 'gym', 20, 16);
    const l = createList(s, gym, 'Run a 5K', [{ title: 'Run', kind: 'weekly', per: 2 }, { title: 'Sleep by 10', kind: 'daily' }, { title: 'Buy shoes', kind: 'once' }, { title: '  ', kind: 'daily' }], T);
    return { s, l };
  };
  it('creates a list on the building with only real tasks', () => {
    const { l } = withList();
    expect(l.tasks.length).toBe(3);
    expect(l.section).toBe('physical');
    expect(l.tier).toBe(1);
  });
  it('daily once per day, weekly up to N per week, one-time once', () => {
    const { s, l } = withList();
    const [run, sleep, shoes] = l.tasks;
    expect(completeTask(s, l.id, sleep.id, T).reward).toEqual({ coins: 10, xp: 5 });
    expect(completeTask(s, l.id, sleep.id, T)).toBe(null);
    expect(isAvailable(sleep, addDays(T, 1))).toBe(true);
    completeTask(s, l.id, run.id, '2026-11-02');
    completeTask(s, l.id, run.id, T);
    expect(doneThisWeek(run, T)).toBe(2);
    expect(isAvailable(run, '2026-11-06')).toBe(false);
    expect(isAvailable(run, '2026-11-09')).toBe(true);
    completeTask(s, l.id, shoes.id, T);
    expect(isAvailable(shoes, '2026-12-01')).toBe(false);
    expect(s.stats.tasksDone).toBe(4);
  });
  it('coins come from tasks and goals', () => {
    const { s, l } = withList();
    const c0 = s.coins, x0 = s.xp;
    completeTask(s, l.id, l.tasks[1].id, T);
    achieveGoal(s, l.id, T);
    expect(s.coins).toBe(c0 + 10 + 100);
    expect(s.xp).toBe(x0 + 5 + 60);
    expect(l.goal).toBe('');
    expect(l.achieved[0].goal).toBe('Run a 5K');
  });
  it('streak counts consecutive logged days', () => {
    const s = city();
    s.loggedDays = [addDays(T, -2), addDays(T, -1), T];
    expect(streak(s, T)).toBe(3);
    expect(streak(s, addDays(T, 1))).toBe(3);
    expect(streak(s, addDays(T, 3))).toBe(0);
  });
});

describe('challenges, milestones, quick wins', () => {
  it('3 daily challenges, stable for the day, claimable once', () => {
    const s = city();
    const a = dailyChallenges(s, T).map((c) => c.id);
    expect(a.length).toBe(3);
    expect(dailyChallenges(s, T).map((c) => c.id)).toEqual(a);
    const c = s.challenges.items.find((x) => x.track === 'builds') || s.challenges.items[0];
    expect(claimChallenge(s, c.id, T)).toBe(null);
    s.stats.today = { day: T, tasks: 9, sections: ['a', 'b', 'c'], lists: ['x'] };
    s.stats.buildsDay = T; s.stats.buildsToday = 1;
    expect(challengeProgress(s, c, T)).toBe(c.need);
    const x0 = s.xp;
    expect(claimChallenge(s, c.id, T)).toBeTruthy();
    expect(s.xp).toBe(x0 + c.xp);
    expect(claimChallenge(s, c.id, T)).toBe(null);
  });
  it('milestones unlock from real progress and pay once', () => {
    const s = city();
    s.stats.tasksDone = 10;
    expect(milestoneState(s).find((m) => m.id === 'tasks10').ready).toBe(true);
    expect(claimMilestone(s, 'tasks10')).toBeTruthy();
    expect(claimMilestone(s, 'tasks10')).toBe(null);
    expect(claimMilestone(s, 'tasks50')).toBe(null);
  });
  it('quick wins are marked by the game, then claimed once', () => {
    const s = city();
    expect(claimQuickWin(s, 'goal')).toBe(null);
    markQuickWin(s, 'goal');
    const c0 = s.coins;
    expect(claimQuickWin(s, 'goal').coins).toBe(30);
    expect(s.coins).toBe(c0 + 30);
    expect(claimQuickWin(s, 'goal')).toBe(null);
  });
});

describe('the catalog types are all known', () => {
  it('every demo building type exists', () => {
    for (const b of demoState(T).buildings) expect(byId[b.type]).toBeTruthy();
  });
});
