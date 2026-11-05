import { describe, it, expect } from 'vitest';
import { createFromSetup } from '../src/data/state.js';
import { earnMaterial, DAILY_CAP } from '../src/systems/materials.js';
import { completeTask } from '../src/systems/tasks.js';
import { orderSize, refillOrders, deliverOrder, skipOrder, swapOrdersAtPayday, MAX_ORDERS } from '../src/systems/orders.js';
import { carThresholds, carsFor, starsFrom, harvestPoints, trainArrives, fillCars, openCrate } from '../src/systems/train.js';
import { population } from '../src/systems/population.js';
import { readyAt } from '../src/systems/construction.js';
import { dailyBricks, towerStock } from '../src/systems/cushionTower.js';
import { effectiveNeeds, recipeById, canBuildRecipe } from '../src/systems/recipes.js';
import { addDays } from '../src/systems/time.js';
import { setupInput } from './helpers.js';

const T = '2026-11-05';
const fresh = (over = {}) => createFromSetup({ ...setupInput(), ...over }, T);

describe('materials', () => {
  it('daily cap: the 4th action on the same day adds 0', () => {
    const s = fresh();
    const got = [1, 2, 3, 4].map(() => earnMaterial(s, 'Money', T));
    expect(got).toEqual([1, 1, 1, 0]);
    expect(s.materials.bricks).toBe(DAILY_CAP);
    expect(earnMaterial(s, 'Money', addDays(T, 1))).toBe(1);
    expect(s.materials.bricks).toBe(4);
  });
  it('the cap is per material', () => {
    const s = fresh();
    for (let i = 0; i < 3; i++) earnMaterial(s, 'Money', T);
    expect(earnMaterial(s, 'Faith', T)).toBe(1);
  });
  it('completeTask adds 1 of the task material', () => {
    const s = fresh();
    const r = completeTask(s, s.goals.find((g) => g.area === 'Faith').id, T);
    expect(r.material).toBe(1);
    expect(s.materials.candles).toBe(1);
    expect(completeTask(s, s.goals.find((g) => g.area === 'Faith').id, T)).toBe(null);
  });
});

describe('recipes', () => {
  it('community center example needs 4 bricks + 3 picnic baskets + 2 lanterns + 60 points', () => {
    const r = recipeById('community-center');
    expect(r.needs).toEqual({ bricks: 4, picnic: 3, lanterns: 2 });
    expect(r.points).toBe(60);
  });
  it('skips materials from areas with no goal', () => {
    expect(effectiveNeeds(recipeById('community-center'), ['bricks', 'candles', 'lumber'])).toEqual({ bricks: 4 });
    const s = fresh();
    s.points = 60; s.materials.bricks = 4;
    expect(canBuildRecipe(recipeById('community-center'), s, ['bricks', 'candles', 'lumber'])).toBe(true);
  });
});

describe('order board', () => {
  it('sizes orders from the weekly goal', () => {
    expect(orderSize(3)).toBe(1);
    expect(orderSize(7)).toBe(3);
    expect(orderSize(10)).toBe(3);
    expect(orderSize(1)).toBe(1);
    expect(orderSize(0)).toBe(0);
  });
  it('never creates orders for areas with no goal, max 3', () => {
    const s = fresh();
    refillOrders(s, T);
    expect(s.orders.list.length).toBe(MAX_ORDERS);
    for (const o of s.orders.list) expect(['Money', 'Faith', 'Health']).toContain(o.area);
    const one = fresh({ goals: [{ area: 'Faith', label: 'Prayer', perWeek: 3 }] });
    refillOrders(one, T);
    expect(one.orders.list.map((o) => o.area)).toEqual(['Faith']);
    expect(one.orders.list[0].qty).toBe(1);
  });
  it('deliver gives a star and a stamp but no build points', () => {
    const s = fresh();
    refillOrders(s, T);
    const o = s.orders.list[0];
    s.materials[o.material] = o.qty;
    const p = s.points;
    expect(deliverOrder(s, o.id)).toBeTruthy();
    expect(s.points).toBe(p);
    expect(s.train.ordersSincePayday).toBe(1);
    expect(s.residents[o.resident].stamps).toBe(1);
    expect(s.materials[o.material]).toBe(0);
  });
  it('"Not this week" has no penalty and refills one each morning', () => {
    const s = fresh();
    refillOrders(s, T);
    const before = { points: s.points, mats: { ...s.materials } };
    skipOrder(s, s.orders.list[0].id, T);
    expect(s.points).toBe(before.points);
    expect(s.materials).toEqual(before.mats);
    expect(s.orders.list.length).toBe(2);
    expect(refillOrders(s, T)).toBe(false);
    refillOrders(s, addDays(T, 1));
    expect(s.orders.list.length).toBeLessThanOrEqual(3);
  });
  it('swaps unfilled orders at payday', () => {
    const s = fresh();
    refillOrders(s, T);
    const ids = s.orders.list.map((o) => o.id);
    swapOrdersAtPayday(s, T);
    expect(s.orders.list.length).toBe(3);
    for (const o of s.orders.list) expect(ids).not.toContain(o.id);
  });
});

describe('payday train', () => {
  it('car thresholds for all four pay frequencies', () => {
    expect(carThresholds('weekly')).toEqual([1, 2, 3]);
    expect(carThresholds('biweekly')).toEqual([1, 3, 6]);
    expect(carThresholds('semimonthly')).toEqual([1, 4, 7]);
    expect(carThresholds('monthly')).toEqual([1, 7, 14]);
  });
  it('car 1 always comes', () => {
    for (const f of ['weekly', 'biweekly', 'semimonthly', 'monthly']) expect(carsFor(0, f)).toBe(1);
    expect(carsFor(2, 'biweekly')).toBe(1);
    expect(carsFor(3, 'biweekly')).toBe(2);
    expect(carsFor(13, 'monthly')).toBe(2);
    expect(carsFor(14, 'monthly')).toBe(3);
  });
  it('test case: biweekly, 11 days logged, 4 orders → 7 stars → 3 cars, harvest 55 points', () => {
    expect(starsFrom(4, 11)).toBe(7);
    expect(carsFor(7, 'biweekly')).toBe(3);
    expect(harvestPoints(11)).toBe(55);
  });
  it('end to end through the state', () => {
    const s = fresh();
    const last = addDays(T, -14);
    s.train.lastPayday = last;
    for (let i = 1; i <= 11; i++) { s.loggedDays.push(addDays(last, i)); s.garden.push(addDays(last, i)); }
    s.train.ordersSincePayday = 4;
    const p0 = s.points;
    const r = trainArrives(s, T);
    expect(r).toMatchObject({ stars: 7, cars: 3, crops: 11, points: 55 });
    expect(s.points).toBe(p0 + 55);
    expect(s.garden).toEqual([]);
    expect(s.train.cars.length).toBe(3);
    expect(s.train.ordersSincePayday).toBe(0);
  });
  it('each car = 3 materials of the lowest-stocked types + 1 decoration', () => {
    const cars = fillCars(2, { bricks: 5, candles: 0, lumber: 1 }, ['bricks', 'candles', 'lumber']);
    expect(cars[0].mats).toEqual({ candles: 2, lumber: 1 });
    for (const c of cars) {
      expect(Object.values(c.mats).reduce((a, b) => a + b, 0)).toBe(3);
      expect(c.deco).toBeTruthy();
    }
    const s = fresh();
    s.train.cars = cars;
    openCrate(s, cars[0].id);
    expect(s.materials.candles).toBe(2);
    expect(s.decorations.length).toBe(1);
    expect(openCrate(s, cars[0].id)).toBe(null);
  });
});

describe('population (Phase C logic)', () => {
  it('7 homes, 2 community buildings → 24 residents', () => {
    expect(population(7, 2)).toEqual({ residents: 24, room: 24, waiting: 4 });
  });
});

describe('construction (Phase C logic)', () => {
  it('start 11 p.m. → ready 6 a.m.', () => {
    const r = readyAt(new Date(2026, 10, 5, 23, 0), 'community');
    expect(r.getTime()).toBe(new Date(2026, 10, 6, 6, 0).getTime());
  });
  it('start 3 a.m. → ready 6 a.m. the next day (at least 4 hours)', () => {
    const r = readyAt(new Date(2026, 10, 5, 3, 0), 'community');
    expect(r.getTime()).toBe(new Date(2026, 10, 6, 6, 0).getTime());
  });
  it('landmarks take 2 mornings; small builds are instant', () => {
    expect(readyAt(new Date(2026, 10, 5, 23, 0), 'landmark').getTime()).toBe(new Date(2026, 10, 7, 6, 0).getTime());
    const s = new Date(2026, 10, 5, 14, 0);
    expect(readyAt(s, 'small').getTime()).toBe(s.getTime());
  });
  it('cheers: −1 hour each, max 3, never sooner than 1 hour after start', () => {
    const start = new Date(2026, 10, 5, 23, 0);
    expect(readyAt(start, 'community', 2).getTime()).toBe(new Date(2026, 10, 6, 4, 0).getTime());
    expect(readyAt(start, 'community', 9).getTime()).toBe(new Date(2026, 10, 6, 3, 0).getTime());
    const late = new Date(2026, 10, 6, 1, 30);
    /* 1:30 → +4h = 5:30 → ready 6:00; 3 cheers would be 3:00, floor is 2:30 */
    expect(readyAt(late, 'community', 3).getTime()).toBe(new Date(2026, 10, 6, 3, 0).getTime());
    /* 2:00 → ready 6:00; 3 cheers land exactly on the 1-hour floor (3:00) and no lower */
    const edge = new Date(2026, 10, 6, 2, 0);
    expect(readyAt(edge, 'community', 3).getTime()).toBe(new Date(2026, 10, 6, 3, 0).getTime());
    for (let h = 0; h < 48; h += 0.5) {
      const st = new Date(2026, 10, 5, 0, h * 60);
      expect(readyAt(st, 'community', 3).getTime() - st.getTime()).toBeGreaterThanOrEqual(3600000);
    }
  });
});

describe('cushion tower bricks (logic)', () => {
  it('0% → 0, 42% → 1, 100% → 2', () => {
    expect(dailyBricks(0)).toBe(0);
    expect(dailyBricks(42)).toBe(1);
    expect(dailyBricks(100)).toBe(2);
  });
  it('holds up to 7 days, then pauses', () => {
    expect(towerStock(42, 10)).toBe(7);
    expect(towerStock(100, 3)).toBe(6);
  });
});
