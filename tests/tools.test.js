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
  it('adds defaults, logs work, and comes around again', () => {
    const s = city();
    const car = T.addThing(s, 'Minivan', 'car');
    const oil = s.care.items.find((i) => i.thingId === car.id && i.name === 'Oil change');
    expect(T.careStatus(oil, D)).toBe('new');
    T.setCareLast(s, oil.id, '2026-05-10');
    expect(T.careNext(oil)).toBe('2026-11-10');
    expect(T.careStatus(oil, D)).toBe('soon');
    expect(T.careStatus(oil, '2026-11-12')).toBe('ready');
    expect(T.careDueCount(s, '2026-11-12')).toBe(1);
    const r = T.logCare(s, oil.id, D);
    expect(r.reward).toEqual(T.CARE_REWARD);
    expect(T.careStatus(oil, D)).toBe('ok');
    expect(T.addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
  it('caps the care reward at 3 a week', () => {
    const s = city();
    T.addThing(s, 'Home', 'home');
    const got = s.care.items.slice(0, 5).map((i) => T.logCare(s, i.id, D).reward);
    expect(got.filter(Boolean).length).toBe(3);
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
