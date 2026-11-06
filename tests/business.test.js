import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import * as B from '../src/systems/business.js';
import { addDebt, payDebt } from '../src/systems/budget.js';
import { homePop, byId } from '../src/data/catalog.js';

const D = '2026-11-05';
const DAY = 86400000;
const city = () => newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, D);
const put = (s, type, extra = {}) => { const b = { id: `b${s.buildSeq++}`, type, i: 0, j: 0, rot: 0, level: 1, builtOn: D, ...extra }; s.buildings.push(b); return b; };

describe('Main Street businesses', () => {
  it('earn per day, hold 3 days, and keep partial coins', () => {
    const s = city();
    const t0 = 1_000_000_000_000;
    const bakery = put(s, 'bakery', { bizAt: t0 });
    expect(B.bizReady(bakery, t0 + DAY / 2)).toBe(4);
    expect(B.bizReady(bakery, t0 + 10 * DAY)).toBe(24);
    const c0 = s.coins;
    expect(B.collectBiz(s, bakery, t0 + 1.5 * DAY)).toBe(12);
    expect(s.coins).toBe(c0 + 12);
    expect(B.bizReady(bakery, t0 + 1.5 * DAY)).toBe(0);
    expect(B.bizReady(bakery, t0 + 2 * DAY)).toBe(4);
  });
  it('population decides how many shops, and copies cost more', () => {
    const s = city();
    expect(B.bizSlots(s)).toBe(1);
    put(s, 'bakery');
    expect(B.canAddBiz(s).ok).toBe(false);
    for (let k = 0; k < 3; k++) put(s, 'cottage');
    expect(B.bizSlots(s)).toBe(2);
    expect(B.canAddBiz(s).ok).toBe(true);
    expect(B.bizCost(s, 'bakery')).toBe(120);
    expect(B.bizCost(s, 'florist')).toBe(byId.florist.cost);
  });
  it('shops pay coins but never XP', () => {
    const s = city();
    const b = put(s, 'pizzeria', { bizAt: 0 });
    const x0 = s.xp;
    B.collectBiz(s, b, 5 * DAY);
    expect(s.xp).toBe(x0);
  });
});

describe('Nest Egg', () => {
  it('compounds 2% a week, and charges 10% only on coins invested in the last 4 weeks', () => {
    const s = city(); s.coins = 1000;
    B.invest(s, 500, D);
    expect(s.coins).toBe(500);
    B.accrue(s, '2026-11-12');
    expect(s.invest.bal).toBeCloseTo(510);
    expect(B.withdrawQuote(s, 100, '2026-11-12')).toEqual({ amount: 100, fee: 10, get: 90 });
    B.accrue(s, '2026-12-10');
    expect(B.recentDeposits(s, '2026-12-10')).toBe(0);
    expect(B.withdrawQuote(s, 100, '2026-12-10').fee).toBe(0);
    expect(B.project(1000, 52)).toBe(2800);
    expect(B.invest(s, 99999, D)).toBe(null);
  });
  it('the tower grows with the balance', () => {
    const s = city(); s.coins = 2000;
    expect(B.nestLevel(s)).toBe(1);
    B.invest(s, 600, D);
    expect(B.nestLevel(s)).toBe(3);
  });
});

describe('Debt Freedom Monument', () => {
  it('adds a tier per debt paid and a crown when all are paid', () => {
    const s = city();
    expect(B.canBuildMonument(s)).toBe(false);
    const a = addDebt(s, { name: 'Card', balance: 100, min: 25 }).debt || s.budget.debts[0];
    addDebt(s, { name: 'Car', balance: 50, min: 25 });
    expect(B.canBuildMonument(s)).toBe(true);
    expect(B.monumentLevel(s)).toBe(1);
    payDebt(s, s.budget.debts[1].id, 50, D);
    expect(B.monumentLevel(s)).toBe(2);
    payDebt(s, s.budget.debts[0].id, 100, '2026-12-01');
    expect(B.debtStatus(s).free).toBe(true);
    expect(B.monumentLevel(s)).toBe(103);
    expect(B.debtStatus(s).list.map((d) => d.name)).toEqual(['Car', 'Card']);
  });
});

describe('homes', () => {
  it('new homes have population', () => {
    expect(homePop('bungalow', 1)).toBe(6);
    expect(homePop('farmhouse', 1)).toBe(10);
  });
});
