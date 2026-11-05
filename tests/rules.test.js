import { describe, it, expect } from 'vitest';
import { stormLevel, stormLabel, stormVisual, waterY, driftFor, stormFromMoney, GRASS_TOP } from '../src/systems/storm.js';
import { rating, weightsFromRanking, barAfterLog, easeBars, BAR_FLOOR } from '../src/systems/rating.js';
import { COSTS, spend } from '../src/systems/build.js';
import { stepDone, checkUnlocks, applyPayday, debtClock } from '../src/systems/money.js';
import { createFromSetup } from '../src/data/state.js';
import { completeTask } from '../src/systems/tasks.js';
import { spotSticker } from '../src/systems/surprises.js';
import { buildPaper } from '../src/systems/paper.js';
import { demoState } from '../src/data/demo.js';
import { setupInput } from './helpers.js';

const close = (a, b) => expect(a).toBeCloseTo(b, 10);

describe('storm formula', () => {
  it('is 0.55 × cushion gap + 0.45 × min(1, debt/30k) + drift', () => {
    close(stormLevel({ cushion: 0, debt: 0 }), 0.55);
    close(stormLevel({ cushion: 500, debt: 15000 }), 0.55 * 0.5 + 0.45 * 0.5);
    close(stormLevel({ cushion: 421, debt: 23400 }), 0.55 * 0.579 + 0.45 * 0.78);
    close(stormLevel({ cushion: 1000, debt: 0 }), 0);
  });
  it('caps debt load at 1 and drift at 0.25', () => {
    close(stormLevel({ cushion: 1000, debt: 90000 }), 0.45);
    close(stormLevel({ cushion: 1000, debt: 0, drift: 0.9 }), 0.25);
    expect(driftFor(10)).toBe(0.25);
    close(driftFor(2), 0.12);
  });
  it('applies levee ×0.78 and seawall ×0.5', () => {
    const base = stormLevel({ cushion: 200, debt: 20000 });
    close(stormLevel({ cushion: 200, debt: 20000, levee: true }), base * 0.78);
    close(stormLevel({ cushion: 200, debt: 20000, seawall: true }), base * 0.5);
    close(stormLevel({ cushion: 200, debt: 20000, levee: true, seawall: true }), base * 0.78 * 0.5);
  });
  it('clamps to 0..1', () => {
    expect(stormLevel({ cushion: 0, debt: 99999, drift: 0.25 })).toBe(1);
    expect(stormLevel({ cushion: 5000, debt: 0 })).toBe(0);
  });
  it('labels: Calm < 0.25, Choppy < 0.45, Stormy < 0.62, else High water', () => {
    expect(stormLabel(0)).toBe('Calm');
    expect(stormLabel(0.2499)).toBe('Calm');
    expect(stormLabel(0.25)).toBe('Choppy');
    expect(stormLabel(0.4499)).toBe('Choppy');
    expect(stormLabel(0.45)).toBe('Stormy');
    expect(stormLabel(0.6199)).toBe('Stormy');
    expect(stormLabel(0.62)).toBe('High water');
    expect(stormLabel(1)).toBe('High water');
  });
  it('water never rises above the grass, even at full storm', () => {
    for (let v = 0; v <= 1.5; v += 0.05) expect(waterY(v)).toBeLessThan(GRASS_TOP);
  });
  it('gentle mode softens visuals to 55%', () => {
    close(stormVisual(0.8, true), 0.44);
    close(stormVisual(0.8, false), 0.8);
  });
  it('going over budget never raises the water', () => {
    const money = { cushion: 300, debt: 12000, stalledPaydays: 0, payoffDate: null };
    const before = stormFromMoney(money);
    const overspent = { ...money, overBudget: 5000, spentThisMonth: 99999, budgetLeft: -2000 };
    expect(stormFromMoney(overspent)).toBe(before);
  });
  it('uses seawall when the Starter Cushion is full and levee when a payoff date is set', () => {
    const m = { cushion: 1000, debt: 15000, stalledPaydays: 0, payoffDate: '2027-01-01' };
    close(stormFromMoney(m), 0.45 * 0.5 * 0.78 * 0.5);
  });
});

describe('mayor rating', () => {
  it('matches the prototype (71.9 → 72) with default weights', () => {
    const bars = { Money: 86, Marriage: 67, Faith: 71, Health: 60, Friends: 50, Home: 90 };
    expect(rating(bars, weightsFromRanking())).toBe(72);
  });
  it('takes weights from the family ranking', () => {
    const w = weightsFromRanking(['Faith', 'Marriage', 'Money', 'Home', 'Health', 'Friends']);
    expect(w).toEqual({ Faith: 30, Marriage: 20, Money: 20, Home: 15, Health: 10, Friends: 5 });
    expect(rating({ Faith: 100, Marriage: 20, Money: 20, Home: 20, Health: 20, Friends: 20 }, w)).toBe(44);
  });
  it('leaves out areas with no goal', () => {
    const w = weightsFromRanking();
    expect(rating({ Money: 80, Faith: 50 }, w, ['Money', 'Faith'])).toBe(68);
  });
  it('bars never go below 20, refill when logged, ease down when behind', () => {
    expect(barAfterLog(20, 7, 1)).toBe(35);
    expect(barAfterLog(90, 3, 3)).toBe(100);
    const s = createFromSetup(setupInput(), '2026-11-01');
    easeBars(s, '2026-12-01');
    for (const v of Object.values(s.bars.values)) expect(v).toBe(BAR_FLOOR);
  });
});

describe('build point costs', () => {
  it('road 20, park 30, upgrade 50, home 60', () => {
    expect(COSTS).toEqual({ road: 20, park: 30, upgrade: 50, home: 60 });
  });
  it('spends only when affordable', () => {
    const s = { points: 59 };
    expect(spend(s, 'home')).toBe(false);
    expect(s.points).toBe(59);
    expect(spend(s, 'park')).toBe(true);
    expect(s.points).toBe(29);
  });
  it('points come from logging, never from dollars', () => {
    const s = createFromSetup(setupInput(), '2026-11-05');
    const p0 = s.points;
    applyPayday(s, 5000);
    expect(s.points).toBe(p0);
    completeTask(s, s.goals[0].id, '2026-11-05');
    expect(s.points).toBe(p0 + 10);
  });
});

describe('districts unlock only by real money steps', () => {
  it('Riverside = Starter Cushion full, Bridgeview = first debt paid, Hillside = Full Safety Net', () => {
    const s = createFromSetup(setupInput(), '2026-11-05');
    s.points = 100000;
    expect(checkUnlocks(s, '2026-11-05')).toEqual([]);
    applyPayday(s, 600);
    expect(checkUnlocks(s, '2026-11-06')).toEqual(['riverside']);
    s.money.firstDebtPaid = true;
    expect(checkUnlocks(s, '2026-11-07')).toEqual(['bridgeview']);
    s.money.cushion = 3 * s.money.bills;
    expect(checkUnlocks(s, '2026-11-08')).toEqual(['hillside']);
  });
  it('stays open even if the cushion is used later', () => {
    const s = createFromSetup({ ...setupInput(), savings: 1200 }, '2026-11-05');
    expect(s.unlocked.riverside).toBe('2026-11-05');
    s.money.cushion = 100;
    expect(stepDone(s.money).riverside).toBe(false);
    checkUnlocks(s, '2026-11-06');
    expect(s.unlocked.riverside).toBe('2026-11-05');
  });
});

describe('surprises', () => {
  it('are cosmetic and never give points', () => {
    const s = createFromSetup(setupInput(), '2026-11-05');
    expect(spotSticker(s, 'balloon')).toBe(true);
    expect(spotSticker(s, 'balloon')).toBe(false);
    expect(s.points).toBe(0);
    expect(s.stickers).toEqual(['balloon']);
  });
});

describe('debt-free clock', () => {
  it('moves sooner with extra payments ("days stolen back")', () => {
    const s = createFromSetup(setupInput(), '2026-11-05');
    const c0 = debtClock(s.money, '2026-11-05');
    expect(c0.stolen).toBe(0);
    s.money.cushion = 1000;
    applyPayday(s, 450);
    const c1 = debtClock(s.money, '2026-11-05');
    expect(c1.stolen).toBe(30);
    expect(c1.key < c0.key).toBe(true);
  });
});

describe('town paper', () => {
  it('is built from the real week and never shows a dollar amount', () => {
    const today = '2026-11-05';
    const s = demoState(today);
    const p = buildPaper(s, today, 0.5);
    const text = JSON.stringify(p);
    expect(text).not.toMatch(/\$/);
    expect(p.city).toBe("Maya's Life City");
    expect(p.cols.length).toBe(4);
  });
});
