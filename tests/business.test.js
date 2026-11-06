import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import * as B from '../src/systems/business.js';
import { addDebt, payDebt } from '../src/systems/budget.js';
import { homePop, byId } from '../src/data/catalog.js';
import { reqFor } from '../src/systems/unlocks.js';

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
  it('shops open by town level only, and a second copy costs more', () => {
    const s = city();
    expect(reqFor(s, 'bakery')).toMatchObject({ ok: false, why: 'Opens at town level 2' });
    s.level = 2;
    expect(reqFor(s, 'bakery')).toEqual({ ok: true, cost: 80 });
    put(s, 'bakery');
    expect(reqFor(s, 'bakery')).toEqual({ ok: true, cost: 120 });
    expect(reqFor(s, 'florist').cost).toBe(byId.florist.cost);
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
  it('gives every invested coin back, with growth earned up to today, rounded up', () => {
    const s = city(); s.coins = 100;
    s.invest = { bal: 500, principal: 500, growth: 0, last: '2026-11-05', deposits: [{ day: '2026-11-05', amt: 500 }], fees: 0 };
    const back = B.refundNestEgg(s, '2026-11-12');
    expect(back).toBe(510);
    expect(s.coins).toBe(610);
    expect(s.invest.bal).toBe(0);
    expect(B.refundNestEgg(s, '2026-11-20')).toBe(0);
    expect(s.coins).toBe(610);
  });
  it('rounds up and never takes coins away', () => {
    const s = city(); s.coins = 0;
    s.invest = { bal: 10.01, last: null };
    expect(B.refundNestEgg(s, '2026-11-12')).toBe(11);
  });
  it('opens at Money master only (one gate)', () => {
    const s = city();
    expect(reqFor(s, 'nestegg')).toMatchObject({ ok: false, why: 'Opens at Money master (Money path step 5)' });
    s.budget.level = 5;
    expect(reqFor(s, 'nestegg')).toEqual({ ok: true, cost: 0 });
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
