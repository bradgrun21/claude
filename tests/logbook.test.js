import { describe, it, expect } from 'vitest';
import { newCity, removedFeatures } from '../src/data/state.js';
import * as LB from '../src/systems/logbook.js';
import * as T from '../src/systems/tools.js';
import { markUse, checkEarned, earnedProgress, earnedById, isEarned, noteStreak } from '../src/systems/earned.js';
import { addDays } from '../src/systems/time.js';

const D = '2026-11-05';
const city = () => newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }, { name: 'Rex', color: '#C9A06A', kind: 'pet' }] }, D);

describe('logbooks', () => {
  it('repair entries need a "what", pay capped rewards, and reset Car Care', () => {
    const s = city();
    T.addThing(s, 'Minivan', 'car');
    expect(LB.logSubjects(s, 'repair')).toEqual(['Minivan']);
    expect(LB.addLogEntry(s, 'repair', { subject: 'Minivan', what: '' }, D)).toBe(null);
    const r = LB.addLogEntry(s, 'repair', { subject: 'Minivan', what: 'Oil change + filter', miles: '48,210', cost: '$59.99', date: '2026-11-01' }, D);
    expect(r.entry.miles).toBe(48210);
    expect(r.entry.cost).toBe(59.99);
    expect(r.linked).toEqual(['Oil change']);
    expect(s.care.items.find((i) => i.name === 'Oil change').last).toBe('2026-11-01');
    expect(r.reward).toEqual(LB.LOG_REWARD);
    LB.addLogEntry(s, 'repair', { subject: 'Minivan', what: 'Wipers' }, D);
    LB.addLogEntry(s, 'repair', { subject: 'Minivan', what: 'Battery' }, D);
    expect(LB.addLogEntry(s, 'repair', { subject: 'Minivan', what: 'Brakes' }, D).reward).toBe(null);
    const t = LB.logTotals(s, 'repair', D);
    expect(t.by.Minivan.miles).toBe(48210);
    expect(T.questProgress(s, 'repair').ready).toBe(true);
  });
  it('vet reminders come up, and can be marked handled', () => {
    const s = city();
    expect(LB.logSubjects(s, 'vet')).toEqual(['Rex']);
    const r = LB.addLogEntry(s, 'vet', { subject: 'Rex', type: 'Vaccine', what: 'Rabies', next: addDays(D, 10) }, D);
    expect(LB.logReminders(s, 'vet', D).length).toBe(1);
    expect(LB.logDueSoon(s, 'vet', D)).toBe(1);
    LB.markHandled(s, 'vet', r.entry.id);
    expect(LB.logReminders(s, 'vet', D).length).toBe(0);
  });
  it('gift sizes keep the newest value per label', () => {
    const s = city();
    LB.addLogEntry(s, 'gifts', { subject: 'Pat', kind: 'Size', what: 'Shoe: 9', date: '2026-01-01' }, D);
    LB.addLogEntry(s, 'gifts', { subject: 'Pat', kind: 'Size', what: 'Shoe: 10', date: '2026-10-01' }, D);
    LB.addLogEntry(s, 'gifts', { subject: 'Pat', kind: 'Idea', what: 'Fishing rod' }, D);
    expect(LB.latestSizes(s).Pat.Shoe.val).toBe('10');
    expect(LB.logSubjects(s, 'gifts')).toEqual(['Pat']);
  });
  it('has no medicine tracking and no records store', () => {
    expect(LB.LOGS.records).toBe(undefined);
    expect(LB.LOGS.vet.fields.find((f) => f.k === 'type').options).not.toContain('Medicine');
  });
  it('cleans up older towns that had Records Hall or medicine entries', () => {
    const s = city();
    s.buildings.push({ id: 'rh', type: 'records', i: 0, j: 0, rot: 0, level: 1 });
    s.earned = [{ id: 'capsule', on: D }, { id: 'lanterns', on: D }];
    s.logs.records = [{ id: 'r1', what: 'Passport', photoId: 'p1' }];
    s.logs.vet.push({ id: 'v1', subject: 'Rex', type: 'Medicine', what: 'Pills', next: D });
    const c0 = s.coins;
    removedFeatures(s);
    expect(s.buildings.some((b) => b.type === 'records')).toBe(false);
    expect(s.coins).toBe(c0 + 120);
    expect(s.earned.map((e) => e.id)).toEqual(['lanterns']);
    expect(s.logs.records).toBe(undefined);
    expect(s.pendingPhotoDeletes).toEqual(['p1']);
    expect(s.logs.vet[0]).toMatchObject({ type: 'Other' });
    expect(s.logs.vet[0].next).toBe(undefined);
  });
});

describe('earned by steady use', () => {
  it('counts different weeks, not repeat taps in one week', () => {
    const s = city();
    for (let k = 0; k < 5; k++) markUse(s, 'meals', D);
    expect(earnedProgress(s, earnedById.market)).toEqual({ have: 1, need: 4 });
    for (let w = 1; w < 4; w++) markUse(s, 'meals', addDays(D, w * 7));
    expect(checkEarned(s, D).map((e) => e.id)).toContain('market');
    expect(isEarned(s, 'market')).toBe(true);
    expect(checkEarned(s, D)).toEqual([]);
  });
  it('streak rewards use the best streak ever', () => {
    const s = city();
    s.loggedDays = [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(D, -k));
    noteStreak(s, D);
    s.loggedDays = [D];
    noteStreak(s, addDays(D, 20));
    expect(s.stats.bestStreak).toBe(7);
    expect(checkEarned(s, D).map((e) => e.id)).toContain('lanterns');
  });
  it('car care and the repair log share the Classic Car', () => {
    const s = city();
    markUse(s, 'care', D); markUse(s, 'repair', addDays(D, 7)); markUse(s, 'care', addDays(D, 14));
    expect(checkEarned(s, D).map((e) => e.id)).toContain('classiccar');
  });
});
