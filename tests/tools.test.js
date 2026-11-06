import { describe, it, expect } from 'vitest';
import { newCity } from '../src/data/state.js';
import * as T from '../src/systems/tools.js';

const D = '2026-11-05'; // Thursday
const city = () => newCity({ cityName: 'T', family: [{ name: 'Pat', color: '#4E7FA0', kind: 'adult' }, { name: 'Ava', color: '#F28CA0', kind: 'kid' }] }, D);
const build = (s, type) => s.buildings.push({ id: `x${type}`, type, i: 0, j: 0, rot: 0, level: 1, builtOn: D });

describe('tools: unlocks and first-use quests', () => {
  it('a tool is available once its building exists; the meeting also needs level 3', () => {
    const s = city();
    expect(T.toolAvailable(s, 'meals')).toBe(false);
    build(s, 'grocery');
    expect(T.toolAvailable(s, 'meals')).toBe(true);
    expect(T.toolAvailable(s, 'meeting')).toBe(false);
    s.level = 3;
    expect(T.toolAvailable(s, 'meeting')).toBe(true);
  });
  it('opening is one-time; the quest pays once when done', () => {
    const s = city();
    expect(T.openTool(s, 'meals', D)).toBe(true);
    expect(T.openTool(s, 'meals', D)).toBe(false);
    expect(T.claimQuest(s, 'meals')).toBe(null);
    for (const [n, ing] of T.STARTER_RECIPES.slice(0, 3)) T.addRecipe(s, { name: n, ingredients: ing });
    const c0 = s.coins;
    expect(T.claimQuest(s, 'meals')).toEqual({ coins: 50, xp: 30 });
    expect(s.coins).toBe(c0 + 50);
    expect(T.claimQuest(s, 'meals')).toBe(null);
  });
});

describe('meal planner', () => {
  it('plans the week and builds a de-duplicated grocery list', () => {
    const s = city();
    const a = T.addRecipe(s, { name: 'Tacos', ingredients: 'Shells\nCheese\nSalsa' });
    const b = T.addRecipe(s, { name: 'Pizza', ingredients: 'Dough\ncheese' });
    T.setMeal(s, D, a.id); T.setMeal(s, '2026-11-06', b.id); T.setMeal(s, '2026-11-07', 'leftovers');
    expect(T.mealOn(s, D)).toBe(a.id);
    expect(T.plannedCount(s, D)).toBe(3);
    expect(T.buildGroceryList(s, D)).toBe(4);
    expect(T.buildGroceryList(s, D)).toBe(0);
    T.toggleGroceryItem(s, s.meals.list[0].id);
    expect(T.clearGroceryDone(s)).toBe(1);
    expect(T.canClaimMealPlan(s, D)).toBe(false);
    T.setMeal(s, '2026-11-08', 'out');
    expect(T.claimMealPlan(s, D)).toEqual(T.MEAL_PLAN_REWARD);
    expect(T.claimMealPlan(s, D)).toBe(null);
    T.removeRecipe(s, a.id);
    expect(T.mealOn(s, D)).toBe(null);
  });
});

describe('car & home care', () => {
  it('is a plain log: what, the date it was done, and the odometer', () => {
    const s = city();
    const car = T.addThing(s, 'Highlander', 'car', { type: 'suv', color: '#2F4058' });
    expect([car.type, car.color]).toEqual(['suv', '#2F4058']);
    expect(T.logCareWork(s, car.id, { what: '' }, D)).toBe(null);
    const r = T.logCareWork(s, car.id, { what: 'Oil change', date: '2026-10-01', odometer: '48,210' }, D);
    expect(r.entry).toMatchObject({ what: 'Oil change', date: '2026-10-01', odometer: 48210 });
    expect(r.reward).toEqual(T.CARE_REWARD);
    T.logCareWork(s, car.id, { what: 'Car battery', odometer: '51000' }, D);
    expect(T.careHistory(s, car.id).map((e) => e.what)).toEqual(['Car battery', 'Oil change']);
    expect(T.lastOdometer(s, car.id)).toBe(51000);
    expect(T.careChoices(car)).toContain('Car battery');
    T.logCareWork(s, car.id, { what: 'Transmission fluid flush' }, D);
    expect(T.careChoices(car)).toContain('Transmission fluid flush');
  });
  it('homes have no odometer; there are no schedules or "due" dates', () => {
    const s = city();
    const home = T.addThing(s, 'Our home', 'home');
    expect(T.logCareWork(s, home.id, { what: 'Furnace / AC filter', odometer: '123' }, D).entry.odometer).toBe(null);
    expect(T.careDueCount).toBe(undefined);
  });
  it('caps the reward at 3 a week', () => {
    const s = city();
    const car = T.addThing(s, 'Van', 'car');
    const got = [1, 2, 3, 4, 5].map((k) => T.logCareWork(s, car.id, { what: `Job ${k}` }, D).reward);
    expect(got.filter(Boolean).length).toBe(3);
  });
  it('older saves: scheduled items with last-done dates become log entries', () => {
    const s = city();
    s.care = { things: [{ id: 'th1', name: 'Van', kind: 'car' }], items: [{ id: 'ci1', thingId: 'th1', name: 'Oil change', months: 6, last: '2026-05-01' }, { id: 'ci2', thingId: 'th1', name: 'Wiper blades', months: 12, last: null }], log: [{ itemId: 'ci1', day: '2026-05-01' }] };
    T.migrateCare(s);
    expect(s.care.items).toEqual([]);
    expect(T.careHistory(s, 'th1').map((e) => [e.what, e.date])).toEqual([['Oil change', '2026-05-01']]);
    expect(s.care.things[0].type).toBe('car');
  });
});

describe('subscriptions', () => {
  it('totals, review every 6 months, and cancel celebrations', () => {
    const s = city();
    const a = T.addSub(s, { name: 'Streamer', amount: '$15.99' });
    T.addSub(s, { name: 'Cloud', amount: '120', cycle: 'yearly' });
    expect(T.subTotals(s).monthly).toBeCloseTo(25.99);
    expect(T.subsToReview(s, D).length).toBe(2);
    expect(T.keepSub(s, a.id, D).reward).toEqual(T.SUB_KEEP_REWARD);
    expect(T.subsToReview(s, D).length).toBe(1);
    expect(T.subNeedsReview(a, '2027-06-01')).toBe(true);
    const c = T.cancelSub(s, s.subs[1].id, D);
    expect(c.reward).toEqual(T.SUB_CANCEL_REWARD);
    expect(T.subTotals(s).savedYear).toBeCloseTo(120);
  });
});

describe('birthdays & cards', () => {
  it('finds upcoming birthdays with ages and marks cards sent once', () => {
    const s = city();
    const g = T.addPerson(s, { name: 'Grandma', date: '1950-11-12', day: D });
    T.addPerson(s, { name: 'Jen', date: '2026-12-25', day: D });
    T.addPerson(s, { name: 'Leap', date: '2026-02-29', day: D });
    const up = T.upcomingPeople(s, D, 30);
    expect(up.map((p) => p.name)).toEqual(['Grandma']);
    expect(up[0].turning).toBe(76);
    expect(up[0].days).toBe(7);
    expect(T.cardsDueSoon(s, D)).toBe(1);
    expect(T.markCardSent(s, g.id, D).reward).toEqual(T.CARD_REWARD);
    expect(T.markCardSent(s, g.id, D)).toBe(null);
    expect(T.cardsDueSoon(s, D)).toBe(0);
    expect(T.nextOccurrence('02-29', '2027-01-01')).toBe('2027-02-28');
    expect(T.nextOccurrence('02-29', '2028-01-01')).toBe('2028-02-29');
    expect(T.peopleOn(s, '2026-12-25').length).toBe(1);
  });
});

describe('date night jar', () => {
  it('draws without repeating the last idea and plans it on the calendar', () => {
    const s = city();
    T.openTool(s, 'dates', D);
    expect(s.dates.ideas.length).toBe(T.DATE_IDEAS.length);
    const a = T.drawDate(s, 'free', () => 0);
    const b = T.drawDate(s, 'free', () => 0);
    expect(a.cost).toBe('free');
    expect(b.id).not.toBe(a.id);
    const ev = T.planDate(s, a.id, '2026-11-14', ['Pat']);
    expect(ev.title).toBe(a.text);
    expect(s.events.length).toBe(1);
    expect(T.questProgress(s, 'dates').ready).toBe(true);
  });
});

describe('kids corner', () => {
  it('stars, rewards and reading', () => {
    const s = city();
    T.openTool(s, 'kids', D);
    for (let k = 0; k < 12; k++) T.giveStar(s, 'Ava', 'Helped out', D);
    expect(T.starsOf(s, 'Ava')).toBe(12);
    expect(T.giveStar(s, 'Nobody', 'x', D)).toBe(null);
    const movie = s.kids.rewards.find((r) => r.cost === 10);
    expect(T.redeemReward(s, 'Ava', movie.id, D).name).toBe(movie.name);
    expect(T.starsOf(s, 'Ava')).toBe(2);
    expect(T.redeemReward(s, 'Ava', movie.id, D)).toBe(null);
    T.logBook(s, 'Ava', 'Charlotte’s Web', D);
    expect(T.booksThisYear(s, 'Ava', D)).toBe(1);
    expect(T.starsOf(s, 'Ava')).toBe(3);
    expect(T.addKid(s, 'Leo')).toBeTruthy();
    expect(T.kidNames(s)).toEqual(['Ava', 'Leo']);
  });
});

describe('family meeting', () => {
  it('once a week, pays, and counts as the weekly review', () => {
    const s = city();
    s.events.push({ id: 'e1', title: 'Zoo', date: '2026-11-08', done: false });
    const ag = T.meetingAgenda(s, D);
    expect(ag.ahead.map((a) => a.text)).toEqual(['Zoo']);
    const r = T.holdMeeting(s, { wins: 'Ava read a book\nWe hosted dinner', focus: 'Early bedtimes' }, D);
    expect(r.reward).toEqual(T.MEETING_REWARD);
    expect(r.meeting.wins.length).toBe(2);
    expect(r.review).toBe(true);
    expect(T.holdMeeting(s, {}, D)).toBe(null);
    expect(T.canHoldMeeting(s, '2026-11-09')).toBe(true);
    expect(T.meetingAgenda(s, '2026-11-09').lastFocus).toBe('Early bedtimes');
  });
});

describe('meal planner grid: breakfast, lunch, dinner and sides', () => {
  it('plans each meal, adds sides, and puts everything on the grocery list', () => {
    const s = city();
    const oats = T.addRecipe(s, { name: 'Oats', ingredients: 'Oats\nMilk' });
    const tacos = T.addRecipe(s, { name: 'Tacos', ingredients: 'Shells\nCheese' });
    const salad = T.addRecipe(s, { name: 'Salad', ingredients: 'Lettuce\nCheese' });
    T.setMeal(s, D, oats.id, 'b');
    T.setMeal(s, D, tacos.id, 'd');
    expect(T.addSide(s, D, 'd', salad.id)).toBeTruthy();
    expect(T.addSide(s, D, 'd', salad.id)).toBe(null);
    expect(T.mealOn(s, D, 'b')).toBe(oats.id);
    expect(T.mealSlot(s, D, 'd').sides).toEqual([salad.id]);
    expect(T.plannedCount(s, D)).toBe(2);
    expect(T.buildGroceryList(s, D)).toBe(5);
    T.removeSide(s, D, 'd', salad.id);
    expect(T.mealSlot(s, D, 'd').sides).toEqual([]);
    T.removeRecipe(s, tacos.id);
    expect(T.mealOn(s, D, 'd')).toBe(null);
  });
  it('reads older saves (one dinner per day) as dinner', () => {
    const s = city();
    const r = T.addRecipe(s, { name: 'Chili', ingredients: 'Beans' });
    s.meals.plan['2026-11-02'] = { 3: r.id };
    expect(T.mealOn(s, D, 'd')).toBe(r.id);
    expect(T.plannedCount(s, D)).toBe(1);
    T.setMeal(s, D, 'out', 'l');
    expect([T.mealOn(s, D, 'l'), T.mealOn(s, D, 'd')]).toEqual(['out', r.id]);
  });
});
