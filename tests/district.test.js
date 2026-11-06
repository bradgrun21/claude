import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import * as DI from '../src/systems/district.js';
import { setupBudget, addTransaction, CATEGORIES } from '../src/systems/budget.js';
import { byId } from '../src/data/catalog.js';

const D = '2026-11-15';
const city = () => newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, D);

describe('Budget District', () => {
  it('has a building for every category except debt', () => {
    for (const c of CATEGORIES.filter((x) => x.id !== 'debt')) { const d = DI.districtForCat(c.id); expect(d).toBeTruthy(); expect(byId[d.building]).toBeTruthy(); }
  });
  it('a category becomes active by budgeting or by spending, and is celebrated once', () => {
    const s = city();
    expect(DI.catActive(s, 'utilities')).toBe(false);
    setupBudget(s, { incomes: [{ amount: 2000 }], expenses: { utilities: 180 } }, D);
    expect(DI.catActive(s, 'utilities')).toBe(true);
    addTransaction(s, { type: 'expense', cat: 'dining', amount: 25 }, D);
    expect(DI.newlyActive(s).map((d) => d.cat).sort()).toEqual(['dining', 'utilities']);
    expect(DI.newlyActive(s)).toEqual([]);
  });
  it('shows planned vs spent for the month', () => {
    const s = city();
    DI.setCatBudget(s, 'groceries', '600');
    addTransaction(s, { type: 'expense', cat: 'groceries', amount: 120.5, date: '2026-11-02' }, D);
    addTransaction(s, { type: 'expense', cat: 'groceries', amount: 80, date: '2026-10-30' }, D);
    const m = DI.catMonth(s, 'groceries', D);
    expect(m).toMatchObject({ planned: 600, spent: 120.5, left: 479.5 });
    expect(m.txs.length).toBe(1);
  });
  it('grows after months on plan (3+ purchases, within the plan)', () => {
    const s = city();
    DI.setCatBudget(s, 'transport', 200);
    expect(DI.districtLevel(s, 'transport', D)).toBe(1);
    for (const ym of ['2026-10', '2026-09', '2026-08']) for (let k = 1; k <= 3; k++) addTransaction(s, { type: 'expense', cat: 'transport', amount: 40, date: `${ym}-0${k}` }, D);
    expect(DI.monthsOnPlan(s, 'transport', D)).toBe(3);
    expect(DI.districtLevel(s, 'transport', D)).toBe(3);
    addTransaction(s, { type: 'expense', cat: 'transport', amount: 500, date: '2026-10-20' }, D);
    expect(DI.monthsOnPlan(s, 'transport', D)).toBe(2);
    expect(DI.districtLevel(s, 'transport', D)).toBe(2);
  });
});
