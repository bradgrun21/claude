import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import { addEvent, completeEvent, budgetSummary, toIcs, upcoming, removeEvent, OUTING_REWARD } from '../src/systems/calendar.js';
import { addMemory, removeMemory, memoriesFor, MEMORY_XP, MEMORY_DAILY_CAP } from '../src/systems/memories.js';

const T = '2026-11-05';
const city = () => newCity({ cityName: 'Test Town', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }] }, T);

describe('family calendar', () => {
  it('keeps outings in date order and lists upcoming ones', () => {
    const s = city();
    addEvent(s, { title: 'Zoo', date: '2026-11-20', budget: '$80' });
    addEvent(s, { title: 'Park picnic', date: '2026-11-08', time: '11:30', budget: 15 });
    expect(s.events.map((e) => e.title)).toEqual(['Park picnic', 'Zoo']);
    expect(s.events[1].budget).toBe(80);
    expect(upcoming(s, T).length).toBe(2);
  });
  it('budget: planned vs this month’s limit vs actually spent', () => {
    const s = city();
    s.settings.outingBudget = 200;
    const a = addEvent(s, { title: 'Zoo', date: '2026-11-20', budget: 80 });
    addEvent(s, { title: 'Pizza night', date: '2026-11-08', budget: 40 });
    addEvent(s, { title: 'December show', date: '2026-12-02', budget: 60 });
    completeEvent(s, a.id, '72.50');
    expect(budgetSummary(s, '2026-11')).toEqual({ limit: 200, planned: 120, spent: 72.5, left: 80, count: 2 });
  });
  it('rewards going once, the same no matter what was spent', () => {
    const s = city();
    const cheap = addEvent(s, { title: 'Walk', date: T, budget: 0 });
    const pricey = addEvent(s, { title: 'Concert', date: T, budget: 300 });
    const c0 = s.coins;
    expect(completeEvent(s, cheap.id, 0).reward).toEqual(OUTING_REWARD);
    expect(completeEvent(s, pricey.id, 280).reward).toEqual(OUTING_REWARD);
    expect(completeEvent(s, pricey.id, 290).reward).toBe(null);
    expect(s.coins).toBe(c0 + 2 * OUTING_REWARD.coins);
    expect(s.events.find((e) => e.id === pricey.id).spent).toBe(290);
  });
  it('exports a valid .ics for phone calendars', () => {
    const s = city();
    const e = addEvent(s, { title: 'Pizza, then movie; fun', date: '2026-11-08', time: '23:00', place: 'Main St', budget: 40, notes: 'Bring\ncoupons' });
    const ics = toIcs([e], 'Test Town', new Date(Date.UTC(2026, 10, 5, 12, 0, 0)));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261108T230000');
    expect(ics).toContain('DTEND:20261109T010000');
    expect(ics).toContain('SUMMARY:Pizza\\, then movie\\; fun');
    expect(ics).toContain('DESCRIPTION:Bring\\ncoupons\\nPlanned budget: $40\\nFrom Test Town');
    expect(ics.split('\r\n').filter((l) => l === 'BEGIN:VEVENT').length).toBe(1);
    const allDay = toIcs([addEvent(s, { title: 'Trip', date: '2026-12-31' })]);
    expect(allDay).toContain('DTSTART;VALUE=DATE:20261231');
    expect(allDay).toContain('DTEND;VALUE=DATE:20270101');
    removeEvent(s, e.id);
    expect(s.events.length).toBe(1);
  });
});

describe('memories', () => {
  it('needs a recap or a photo', () => {
    const s = city();
    expect(addMemory(s, { section: 'relational', text: '  ' }, T)).toBe(null);
    expect(addMemory(s, { section: 'relational', photoId: 'p1' }, T).mem.photoId).toBe('p1');
  });
  it('gives a little XP, up to 3 a day', () => {
    const s = city();
    const x0 = s.xp;
    const got = [1, 2, 3, 4].map((k) => addMemory(s, { section: 'physical', text: `Run ${k}` }, T).reward);
    expect(got.filter(Boolean).length).toBe(MEMORY_DAILY_CAP);
    expect(s.xp).toBe(x0 + MEMORY_DAILY_CAP * MEMORY_XP);
    expect(memoriesFor(s, { section: 'physical' }).length).toBe(4);
    expect(memoriesFor(s, { day: T }).length).toBe(4);
  });
  it('removing a memory unlinks it from its outing', () => {
    const s = city();
    const e = addEvent(s, { title: 'Zoo', date: T });
    const { mem } = addMemory(s, { section: 'relational', text: 'Saw the giraffes', eventId: e.id }, T);
    e.memoryId = mem.id;
    removeMemory(s, mem.id);
    expect(e.memoryId).toBe(null);
    expect(s.memories.length).toBe(0);
  });
});
