import { grant } from './economy.js';
import { addDays, daysBetween, fromKey, dateKey } from './time.js';
import { weekStart, weekSummary } from './lists.js';
import { addEvent } from './calendar.js';

/*
 * Tools: practical helpers that open with certain buildings.
 *   Grocery Store → Meal Planner        Gas Station → Car & Home Care
 *   News Station  → Subscriptions       Post Office → Birthdays & Cards
 *   Coffee House  → Date Night Jar      School      → Kids' Corner
 *   Town Hall (level 3) → Family Meeting
 * Each opens with a ribbon cutting, has one easy first-use quest, and pays small, capped rewards for using it.
 * Rewards are fixed amounts. They never depend on dollar amounts.
 */
export const TOOLS = [
  { id: 'meals', building: 'grocery', name: 'Meal Planner', emoji: '🥕', keeper: 'Mr. Greene the grocer', blurb: 'Save your family’s recipes, plan the week’s dinners, and the grocery list writes itself.', quest: { text: 'Save 3 recipes', need: 3 }, reward: { coins: 50, xp: 30 } },
  { id: 'care', building: 'gasstation', name: 'Car & Home Care', emoji: '🔧', keeper: 'Rita at the garage', blurb: 'Oil changes, tires, furnace filters, smoke detectors. Log it once and it reminds you when it comes around again.', quest: { text: 'Log one thing you’ve done', need: 1 }, reward: { coins: 40, xp: 25 } },
  { id: 'subs', building: 'newsstation', name: 'Subscriptions', emoji: '📰', keeper: 'Newsie Nate', blurb: 'Every streaming service, app and plan in one place. Review them twice a year and keep only what you love.', quest: { text: 'List 3 subscriptions', need: 3 }, reward: { coins: 40, xp: 25 } },
  { id: 'cards', building: 'postoffice', name: 'Birthdays & Cards', emoji: '💌', keeper: 'Postmaster Pearl', blurb: 'Never miss a birthday or anniversary. A heads-up a week ahead, plus a thank-you note list.', quest: { text: 'Add 5 birthdays', need: 5 }, reward: { coins: 50, xp: 30 } },
  { id: 'dates', building: 'cafe', name: 'Date Night Jar', emoji: '☕', keeper: 'Barista Bea', blurb: 'A jar of date ideas. Draw one, put it on the calendar, and make a memory.', quest: { text: 'Draw a date and plan it', need: 1 }, reward: { coins: 40, xp: 25 } },
  { id: 'kids', building: 'school', name: 'Kids’ Corner', emoji: '⭐', keeper: 'Ms. Rivera the teacher', blurb: 'A chore chart with stars, rewards the kids can earn, and a reading log.', quest: { text: 'Give out 5 stars', need: 5 }, reward: { coins: 50, xp: 30 } },
  { id: 'meeting', building: 'townhall', level: 3, name: 'Family Meeting', emoji: '🏛️', keeper: 'Mayor Rosie', blurb: 'Fifteen minutes a week: celebrate wins, check in with everyone, look at the week ahead, pick one focus.', quest: { text: 'Hold your first family meeting', need: 1 }, reward: { coins: 60, xp: 40 } }
];
export const toolById = Object.fromEntries(TOOLS.map((t) => [t.id, t]));
export const toolForBuilding = (type) => TOOLS.find((t) => t.building === type) || null;
export const TOOL_LEVEL = { meeting: 3 };

export function ensureTools(state) {
  state.tools = state.tools || {};
  state.meals = state.meals || { recipes: [], plan: {}, list: [] };
  state.care = state.care || { things: [], items: [], log: [] };
  state.subs = state.subs || [];
  state.cards = state.cards || { people: [], sent: [], thanks: [] };
  state.dates = state.dates || { ideas: null, drawn: [] };
  state.kids = state.kids || { stars: {}, log: [], rewards: null, redeemed: [], reading: [] };
  state.meetings = state.meetings || [];
  return state;
}

/* A tool is available once its building is in town (and, for the meeting, the town is level 3). */
export function toolAvailable(state, id) {
  const t = toolById[id];
  if (!t) return false;
  if (t.level && state.level < t.level) return false;
  return state.buildings.some((b) => b.type === t.building);
}
export const toolOpened = (state, id) => !!state.tools?.[id]?.opened;
export function openTool(state, id, day) {
  ensureTools(state);
  const rec = state.tools[id] || (state.tools[id] = {});
  if (rec.opened) return false;
  rec.opened = day;
  if (id === 'dates' && !state.dates.ideas) state.dates.ideas = DATE_IDEAS.map(([text, cost], k) => ({ id: `d${k}`, text, cost, used: 0 }));
  if (id === 'kids' && !state.kids.rewards) state.kids.rewards = KID_REWARDS.map(([name, cost], k) => ({ id: `r${k}`, name, cost }));
  return true;
}

/* First-use quest progress, and its one-time claim. */
export function questProgress(state, id) {
  ensureTools(state);
  const s = state;
  const have = {
    meals: () => s.meals.recipes.length,
    care: () => s.care.log.length,
    subs: () => s.subs.length,
    cards: () => s.cards.people.length,
    dates: () => s.dates.drawn.length,
    kids: () => s.kids.log.length,
    meeting: () => s.meetings.length
  }[id]?.() || 0;
  const need = toolById[id].quest.need;
  return { have: Math.min(have, need), need, ready: have >= need && s.tools[id]?.quest !== 'claimed', claimed: s.tools[id]?.quest === 'claimed' };
}
export function claimQuest(state, id) {
  const q = questProgress(state, id);
  if (!q.ready) return null;
  state.tools[id].quest = 'claimed';
  grant(state, toolById[id].reward);
  return toolById[id].reward;
}

/* Small capped rewards: at most `cap` per period for each tool action. */
function capped(state, id, key, period, cap, reward) {
  const rec = state.tools[id] || (state.tools[id] = {});
  const b = (rec.caps = rec.caps || {});
  if (!b[key] || b[key].p !== period) b[key] = { p: period, n: 0 };
  if (b[key].n >= cap) return null;
  b[key].n++;
  grant(state, reward);
  return reward;
}

/* ================= Meal Planner ================= */
let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
const lines = (t) => String(t || '').split(/\n/).map((x) => x.trim()).filter(Boolean);
export const STARTER_RECIPES = [
  ['Taco night', 'Ground beef or turkey\nTaco shells\nShredded cheese\nLettuce\nTomatoes\nSalsa\nSour cream', 'Brown the meat with taco seasoning. Set out toppings and let everyone build their own.'],
  ['Spaghetti and meatballs', 'Spaghetti\nFrozen meatballs\nMarinara sauce\nParmesan\nBagged salad', 'Simmer meatballs in sauce 20 minutes. Serve over pasta with salad.'],
  ['Sheet-pan chicken and veggies', 'Chicken thighs\nPotatoes\nBroccoli\nOlive oil\nGarlic powder', '425°F for 30–35 minutes on one pan.'],
  ['Breakfast for dinner', 'Eggs\nPancake mix\nBacon\nBerries\nMaple syrup', 'Kids can help flip pancakes.'],
  ['Slow-cooker chili', 'Ground beef\nKidney beans\nBlack beans\nDiced tomatoes\nOnion\nChili powder\nShredded cheese', 'Brown beef and onion, add everything to the slow cooker, low 6–8 hours.'],
  ['Chicken stir-fry', 'Chicken breast\nFrozen stir-fry vegetables\nSoy sauce\nRice\nGarlic', 'Cook rice. Stir-fry chicken, add vegetables and sauce.'],
  ['Homemade pizza night', 'Pizza dough\nPizza sauce\nMozzarella\nPepperoni\nBell peppers', 'Everyone tops their own. 450°F for 12–15 minutes.'],
  ['Baked potato bar', 'Russet potatoes\nButter\nShredded cheese\nBacon bits\nSour cream\nGreen onions', '400°F for an hour, or the microwave in a pinch.']
];
export const MEAL_SPECIAL = { leftovers: 'Leftovers', out: 'Eat out', skip: 'No plan' };
export function addRecipe(state, r) {
  ensureTools(state);
  const name = String(r.name || '').trim();
  if (!name) return null;
  const rec = { id: uid('rc'), name, ingredients: Array.isArray(r.ingredients) ? r.ingredients.map((x) => String(x).trim()).filter(Boolean) : lines(r.ingredients).slice(0, 40), notes: String(r.notes || '').trim().slice(0, 600) };
  state.meals.recipes.push(rec);
  return rec;
}
export function updateRecipe(state, id, r) {
  const rec = state.meals.recipes.find((x) => x.id === id);
  if (!rec) return null;
  if (r.name != null && r.name.trim()) rec.name = r.name.trim();
  if (r.ingredients != null) rec.ingredients = Array.isArray(r.ingredients) ? r.ingredients : lines(r.ingredients).slice(0, 40);
  if (r.notes != null) rec.notes = String(r.notes).trim().slice(0, 600);
  return rec;
}
export function removeRecipe(state, id) {
  state.meals.recipes = state.meals.recipes.filter((x) => x.id !== id);
  for (const w of Object.values(state.meals.plan)) for (const k of Object.keys(w)) if (w[k] === id) delete w[k];
}
/* plan[weekStart][0..6] = recipeId | 'leftovers' | 'out' */
export function setMeal(state, day, value) {
  ensureTools(state);
  const wk = weekStart(day), idx = daysBetween(wk, day);
  const w = state.meals.plan[wk] || (state.meals.plan[wk] = {});
  if (!value || value === 'skip') delete w[idx]; else w[idx] = value;
  /* keep only recent weeks */
  const keys = Object.keys(state.meals.plan).sort();
  while (keys.length > 12) delete state.meals.plan[keys.shift()];
  return w;
}
export const mealOn = (state, day) => state.meals?.plan?.[weekStart(day)]?.[daysBetween(weekStart(day), day)] || null;
export const plannedCount = (state, day) => Object.keys(state.meals?.plan?.[weekStart(day)] || {}).length;
export function buildGroceryList(state, day) {
  ensureTools(state);
  const w = state.meals.plan[weekStart(day)] || {};
  const have = new Set(state.meals.list.filter((i) => !i.done).map((i) => i.text.toLowerCase()));
  let added = 0;
  for (const v of Object.values(w)) {
    const r = state.meals.recipes.find((x) => x.id === v);
    if (!r) continue;
    for (const ing of r.ingredients) { const k = ing.toLowerCase(); if (have.has(k)) continue; have.add(k); state.meals.list.push({ id: uid('gi'), text: ing, done: false, from: r.name }); added++; }
  }
  return added;
}
export function addGroceryItem(state, text) {
  ensureTools(state);
  const t = String(text || '').trim();
  if (!t) return null;
  const it = { id: uid('gi'), text: t.slice(0, 60), done: false, from: null };
  state.meals.list.push(it);
  return it;
}
export function toggleGroceryItem(state, id) { const it = state.meals.list.find((x) => x.id === id); if (it) it.done = !it.done; return it; }
export function clearGroceryDone(state) { const n = state.meals.list.filter((x) => x.done).length; state.meals.list = state.meals.list.filter((x) => !x.done); return n; }
export const MEAL_PLAN_REWARD = { coins: 25, xp: 20 };
export const canClaimMealPlan = (state, day) => plannedCount(state, day) >= 4 && state.tools?.meals?.planned !== weekStart(day);
export function claimMealPlan(state, day) {
  if (!canClaimMealPlan(state, day)) return null;
  (state.tools.meals = state.tools.meals || {}).planned = weekStart(day);
  grant(state, MEAL_PLAN_REWARD);
  return MEAL_PLAN_REWARD;
}

/* ================= Car & Home Care ================= */
export const CARE_DEFAULTS = {
  car: [['Oil change', 6], ['Tire rotation', 6], ['Registration renewal', 12], ['Inspection', 12], ['Wiper blades', 12], ['Cabin air filter', 12]],
  home: [['Furnace / AC filter', 3], ['Smoke detector batteries', 12], ['Clean the gutters', 6], ['Dryer vent', 12], ['Water heater flush', 12], ['Fridge coils', 12]]
};
export function addMonths(day, n) {
  const d = fromKey(day);
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  t.setDate(Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
  return dateKey(t);
}
export function addThing(state, name, kind = 'car') {
  ensureTools(state);
  const n = String(name || '').trim() || (kind === 'home' ? 'Our home' : 'Our car');
  const th = { id: uid('th'), name: n.slice(0, 40), kind };
  state.care.things.push(th);
  for (const [nm, months] of CARE_DEFAULTS[kind] || []) state.care.items.push({ id: uid('ci'), thingId: th.id, name: nm, months, last: null });
  return th;
}
export function removeThing(state, id) { state.care.things = state.care.things.filter((t) => t.id !== id); state.care.items = state.care.items.filter((i) => i.thingId !== id); }
export function addCareItem(state, thingId, name, months) {
  const nm = String(name || '').trim();
  if (!nm || !state.care.things.some((t) => t.id === thingId)) return null;
  const it = { id: uid('ci'), thingId, name: nm.slice(0, 40), months: Math.max(1, Math.min(60, Math.round(+months || 12))), last: null };
  state.care.items.push(it);
  return it;
}
export function removeCareItem(state, id) { state.care.items = state.care.items.filter((i) => i.id !== id); }
export function setCareLast(state, id, day) { const it = state.care.items.find((x) => x.id === id); if (it && /^\d{4}-\d{2}-\d{2}$/.test(day || '')) it.last = day; return it; }
export const careNext = (it) => (it.last ? addMonths(it.last, it.months) : null);
/* 'new' never logged · 'ok' · 'soon' within 14 days · 'ready' on or past the date (never "overdue") */
export function careStatus(it, day) {
  const n = careNext(it);
  if (!n) return 'new';
  const d = daysBetween(day, n);
  return d <= 0 ? 'ready' : d <= 14 ? 'soon' : 'ok';
}
export const careDueCount = (state, day) => (state.care?.items || []).filter((i) => careStatus(i, day) === 'ready').length;
export const CARE_REWARD = { coins: 15, xp: 10 };
export function logCare(state, id, day) {
  const it = state.care.items.find((x) => x.id === id);
  if (!it) return null;
  it.last = day;
  state.care.log.push({ itemId: id, day });
  if (state.care.log.length > 300) state.care.log.shift();
  return { item: it, reward: capped(state, 'care', 'log', weekStart(day), 3, CARE_REWARD) };
}

/* ================= Subscriptions ================= */
export const SUB_REVIEW_DAYS = 182;
export function addSub(state, s) {
  ensureTools(state);
  const name = String(s.name || '').trim();
  if (!name) return null;
  const sub = { id: uid('sb'), name: name.slice(0, 40), amount: Math.max(0, Math.round((parseFloat(String(s.amount || '').replace(/[^0-9.]/g, '')) || 0) * 100) / 100), cycle: s.cycle === 'yearly' ? 'yearly' : 'monthly', status: 'active', reviewedOn: null, addedOn: s.day || null, cancelledOn: null };
  state.subs.push(sub);
  return sub;
}
export const subMonthly = (s) => (s.cycle === 'yearly' ? s.amount / 12 : s.amount);
export const subNeedsReview = (s, day) => s.status === 'active' && (!s.reviewedOn || daysBetween(s.reviewedOn, day) >= SUB_REVIEW_DAYS);
export const subsToReview = (state, day) => (state.subs || []).filter((s) => subNeedsReview(s, day));
export function subTotals(state) {
  const act = (state.subs || []).filter((s) => s.status === 'active'), gone = (state.subs || []).filter((s) => s.status === 'cancelled');
  return { monthly: act.reduce((a, s) => a + subMonthly(s), 0), count: act.length, savedYear: gone.reduce((a, s) => a + subMonthly(s) * 12, 0), cancelled: gone.length };
}
export const SUB_KEEP_REWARD = { coins: 5, xp: 5 };
export const SUB_CANCEL_REWARD = { coins: 40, xp: 25 };
export function keepSub(state, id, day) {
  const s = state.subs.find((x) => x.id === id);
  if (!s || s.status !== 'active') return null;
  const was = subNeedsReview(s, day);
  s.reviewedOn = day;
  return { sub: s, reward: was ? capped(state, 'subs', 'keep', day.slice(0, 7), 10, SUB_KEEP_REWARD) : null };
}
export function cancelSub(state, id, day) {
  const s = state.subs.find((x) => x.id === id);
  if (!s || s.status !== 'active') return null;
  s.status = 'cancelled'; s.cancelledOn = day; s.reviewedOn = day;
  return { sub: s, reward: capped(state, 'subs', 'cancel', day.slice(0, 7), 5, SUB_CANCEL_REWARD) };
}
export function removeSub(state, id) { state.subs = state.subs.filter((x) => x.id !== id); }

/* ================= Birthdays & Cards ================= */
export function addPerson(state, p) {
  ensureTools(state);
  const name = String(p.name || '').trim();
  const md = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date.slice(5) : /^\d{2}-\d{2}$/.test(p.md || '') ? p.md : null;
  if (!name || !md) return null;
  /* The year only counts if it's clearly in the past (lets "turning 40" show; a this-year date means "year unknown"). */
  const y = /^\d{4}/.test(p.date || '') ? +p.date.slice(0, 4) : null;
  const year = y && y > 1900 && y < +(p.day || dateKey()).slice(0, 4) ? y : null;
  const per = { id: uid('pp'), name: name.slice(0, 40), md, kind: p.kind === 'anniversary' ? 'anniversary' : 'birthday', year };
  state.cards.people.push(per);
  return per;
}
export function removePerson(state, id) { state.cards.people = state.cards.people.filter((x) => x.id !== id); }
/* Next occurrence of MM-DD on or after day (Feb 29 falls on Feb 28 in other years). */
export function nextOccurrence(md, day) {
  const y = +day.slice(0, 4);
  const at = (yy) => { let k = `${yy}-${md}`; if (md === '02-29' && !(yy % 4 === 0 && (yy % 100 !== 0 || yy % 400 === 0))) k = `${yy}-02-28`; return k; };
  const k = at(y);
  return k >= day ? k : at(y + 1);
}
export function upcomingPeople(state, day, within = 30) {
  return (state.cards?.people || []).map((p) => { const on = nextOccurrence(p.md, day); return { ...p, on, days: daysBetween(day, on), sent: cardSent(state, p.id, on), turning: p.year ? +on.slice(0, 4) - p.year : null }; })
    .filter((p) => p.days <= within).sort((a, b) => a.days - b.days);
}
export const cardSent = (state, personId, on) => (state.cards?.sent || []).some((s) => s.personId === personId && s.on === on);
export const CARD_REWARD = { coins: 10, xp: 5 };
export function markCardSent(state, personId, day) {
  const p = state.cards.people.find((x) => x.id === personId);
  if (!p) return null;
  const on = nextOccurrence(p.md, day);
  if (cardSent(state, personId, on)) return null;
  state.cards.sent.push({ personId, on, day });
  return { person: p, reward: capped(state, 'cards', 'sent', weekStart(day), 5, CARD_REWARD) };
}
export const cardsDueSoon = (state, day) => upcomingPeople(state, day, 7).filter((p) => !p.sent).length;
export const peopleOn = (state, day) => (state.cards?.people || []).filter((p) => nextOccurrence(p.md, day) === day);
export function addThanks(state, to, forWhat) {
  ensureTools(state);
  const t = String(to || '').trim();
  if (!t) return null;
  const n = { id: uid('ty'), to: t.slice(0, 40), for: String(forWhat || '').trim().slice(0, 80), done: null };
  state.cards.thanks.push(n);
  return n;
}
export const THANKS_REWARD = { coins: 5, xp: 5 };
export function thanksSent(state, id, day) {
  const n = state.cards.thanks.find((x) => x.id === id);
  if (!n || n.done) return null;
  n.done = day;
  return { note: n, reward: capped(state, 'cards', 'thanks', weekStart(day), 5, THANKS_REWARD) };
}

/* ================= Date Night Jar ================= */
export const DATE_IDEAS = [
  ['Picnic at the park', 'free'], ['Sunset walk and talk', 'free'], ['Cook a new recipe together', '$'], ['Coffee and a bookstore browse', '$'],
  ['Movie night at home with popcorn', 'free'], ['Try a new restaurant', '$$'], ['Board game night', 'free'], ['Stargazing with a blanket', 'free'],
  ['Mini golf', '$'], ['Visit a farmers market', '$'], ['Dessert-only date', '$'], ['Hike a new trail', 'free'],
  ['Go back to your first date spot', '$$'], ['Thrift store challenge: $10 outfits', '$'], ['Paint or pottery night', '$$'], ['Breakfast date before work', '$'],
  ['Write each other letters, then read them', 'free'], ['Bike ride and ice cream', '$'], ['Plan your dream trip together', 'free'], ['Live music night', '$$']
];
export function addDateIdea(state, text, cost = 'free') {
  ensureTools(state);
  if (!state.dates.ideas) state.dates.ideas = [];
  const t = String(text || '').trim();
  if (!t) return null;
  const i = { id: uid('di'), text: t.slice(0, 60), cost: ['free', '$', '$$'].includes(cost) ? cost : 'free', used: 0 };
  state.dates.ideas.push(i);
  return i;
}
export function removeDateIdea(state, id) { state.dates.ideas = (state.dates.ideas || []).filter((x) => x.id !== id); }
/* Draw from the jar, favoring ideas used least, never the same as the last draw. */
export function drawDate(state, filter = 'any', rnd = Math.random) {
  const all = (state.dates.ideas || []).filter((i) => filter === 'any' || (filter === 'free' ? i.cost === 'free' : i.cost !== '$$'));
  if (!all.length) return null;
  const last = state.dates.lastDraw;
  const min = Math.min(...all.map((i) => i.used));
  let pool = all.filter((i) => i.used === min && i.id !== last);
  if (!pool.length) pool = all.filter((i) => i.id !== last);
  if (!pool.length) pool = all;
  const pickd = pool[Math.floor(rnd() * pool.length)];
  state.dates.lastDraw = pickd.id;
  return pickd;
}
export function planDate(state, ideaId, day, who = []) {
  const idea = (state.dates.ideas || []).find((x) => x.id === ideaId);
  if (!idea || !/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return null;
  idea.used++;
  const ev = addEvent(state, { title: idea.text, date: day, section: 'relational', who, notes: 'From the Date Night Jar' });
  state.dates.drawn.push({ ideaId, day, eventId: ev.id });
  return ev;
}

/* ================= Kids' Corner ================= */
export const KID_REWARDS = [['Pick the family movie', 10], ['Stay up 30 minutes late', 15], ['Ice cream date with a parent', 25], ['Choose Saturday’s breakfast', 10], ['A new book', 30]];
export const STAR_REASONS = ['Helped out', 'Kindness', 'Great attitude', 'Homework done', 'Tried something hard', 'Chore done'];
export const STAR_REWARD = { coins: 3, xp: 2 };
export const kidNames = (state) => state.family.filter((m) => m.kind === 'kid').map((m) => m.name);
export const starsOf = (state, name) => state.kids?.stars?.[name] || 0;
export function giveStar(state, name, why, day) {
  ensureTools(state);
  if (!state.family.some((m) => m.name === name)) return null;
  state.kids.stars[name] = starsOf(state, name) + 1;
  state.kids.log.push({ name, why: String(why || '').slice(0, 40), day });
  if (state.kids.log.length > 400) state.kids.log.shift();
  return { stars: state.kids.stars[name], reward: capped(state, 'kids', 'star', day, 10, STAR_REWARD) };
}
export const starsThisWeek = (state, name, day) => (state.kids?.log || []).filter((l) => l.name === name && l.day >= weekStart(day) && l.day <= day).length;
export function addKidReward(state, name, cost) {
  ensureTools(state);
  if (!state.kids.rewards) state.kids.rewards = [];
  const n = String(name || '').trim();
  if (!n) return null;
  const r = { id: uid('kr'), name: n.slice(0, 40), cost: Math.max(1, Math.min(200, Math.round(+cost || 10))) };
  state.kids.rewards.push(r);
  return r;
}
export function removeKidReward(state, id) { state.kids.rewards = (state.kids.rewards || []).filter((r) => r.id !== id); }
export function redeemReward(state, name, rewardId, day) {
  const r = (state.kids.rewards || []).find((x) => x.id === rewardId);
  if (!r || starsOf(state, name) < r.cost) return null;
  state.kids.stars[name] -= r.cost;
  state.kids.redeemed.push({ name, reward: r.name, day });
  return r;
}
export function logBook(state, name, title, day) {
  ensureTools(state);
  const t = String(title || '').trim();
  if (!t || !name) return null;
  const b = { id: uid('bk'), name, title: t.slice(0, 60), day };
  state.kids.reading.push(b);
  const reward = giveStar(state, name, `Read “${b.title}”`, day);
  return { book: b, ...reward };
}
export const booksThisYear = (state, name, day) => (state.kids?.reading || []).filter((b) => b.name === name && b.day.slice(0, 4) === day.slice(0, 4)).length;
export function addKid(state, name, color) {
  const n = String(name || '').trim();
  if (!n || state.family.some((m) => m.name.toLowerCase() === n.toLowerCase())) return null;
  const m = { name: n.slice(0, 20), color: color || '#F28CA0', kind: 'kid' };
  state.family.push(m);
  return m;
}

/* ================= Family Meeting ================= */
export const MEETING_REWARD = { coins: 40, xp: 40 };
export const meetingThisWeek = (state, day) => (state.meetings || []).find((m) => m.week === weekStart(day)) || null;
export const canHoldMeeting = (state, day) => !meetingThisWeek(state, day);
/* What the agenda shows automatically: wins and the week ahead. */
export function meetingAgenda(state, day) {
  const w = weekSummary(state, day);
  const end = addDays(day, 7);
  const ahead = [];
  for (const e of state.events || []) if (!e.done && e.date >= day && e.date <= end) ahead.push({ day: e.date, text: e.title, kind: 'outing' });
  for (const p of upcomingPeople(state, day, 7)) ahead.push({ day: p.on, text: `${p.name}’s ${p.kind}${p.turning ? ` (${p.turning})` : ''}`, kind: 'card' });
  for (const l of state.lists) for (const g of l.goals || []) if (g.target && !g.achievedOn && g.target >= day && g.target <= end) ahead.push({ day: g.target, text: `Goal target: ${g.title}`, kind: 'goal' });
  for (const it of state.care?.items || []) { const s = careStatus(it, day); if (s === 'ready' || s === 'soon') { const th = state.care.things.find((t) => t.id === it.thingId); ahead.push({ day: careNext(it) < day ? day : careNext(it), text: `${it.name}${th ? ` · ${th.name}` : ''}`, kind: 'care' }); } }
  ahead.sort((a, b) => a.day.localeCompare(b.day));
  const memories = (state.memories || []).filter((m) => m.date >= addDays(day, -6) && m.date <= day).length;
  return { total: w.total, days: w.days, goals: w.goals, bySection: w.bySection, memories, ahead, subsReview: subsToReview(state, day).length, meals: plannedCount(state, day), lastFocus: (state.meetings || []).at(-1)?.focus || '' };
}
export function holdMeeting(state, m, day) {
  ensureTools(state);
  if (!canHoldMeeting(state, day)) return null;
  const rec = { week: weekStart(day), day, wins: lines(m.wins).slice(0, 10), checkins: m.checkins || {}, focus: String(m.focus || '').trim().slice(0, 120), notes: String(m.notes || '').trim().slice(0, 600) };
  state.meetings.push(rec);
  if (state.meetings.length > 104) state.meetings.shift();
  grant(state, MEETING_REWARD);
  /* a family meeting also counts as the weekly review */
  let review = false;
  if (state.stats.reviewedWeek !== weekStart(day)) { state.stats.reviewedWeek = weekStart(day); review = true; }
  return { meeting: rec, reward: MEETING_REWARD, review };
}
