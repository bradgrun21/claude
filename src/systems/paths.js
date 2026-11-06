import { grant } from './economy.js';
import { MONEY_STEPS } from './budget.js';
import { weekStart } from './lists.js';
import { kidNames } from './tools.js';

/*
 * Paths: features that have a natural order unlock one step at a time.
 * A step counts only after every step before it is done, and it opens the next step (and often a tab).
 * Each finished step pays a small reward once. Locked steps show greyed out with what to do first.
 *
 *   Money: income & bills → build the budget → list debts → savings & funds
 *   Meals: add a meal → plan the week → make the grocery list → plan 3 different weeks
 *   …and the same idea for every tracker.
 */
const n = (v) => (typeof v === 'number' ? v : v ? 1 : 0);
const weeksPlanned = (s, min) => Object.values(s.meals?.plan || {}).filter((w) => Object.keys(w).length >= min).length;

export const PATHS = {
  money: MONEY_STEPS.map((st) => ({ id: st.id, title: st.title, desc: st.desc, need: st.need, have: (s) => st.progress(s.budget) })),
  meals: [
    { id: 'recipe', title: 'Add a meal', desc: 'Save one recipe your family loves.', tab: 'recipes', need: 1, have: (s) => s.meals.recipes.length },
    { id: 'plan', title: 'Plan the week', desc: 'Pick dinners for 3 nights this week.', tab: 'week', need: 3, have: (s) => Math.max(0, ...Object.values(s.meals.plan).map((w) => Object.keys(w).length)) },
    { id: 'list', title: 'Make the grocery list', desc: 'Turn the plan into a shopping list.', tab: 'list', need: 1, have: (s) => n(s.tools?.meals?.listMade || s.meals.list.length > 0) },
    { id: 'habit', title: 'Make it a habit', desc: 'Plan 3 nights in 3 different weeks.', need: 3, have: (s) => weeksPlanned(s, 3) }
  ],
  care: [
    { id: 'thing', title: 'Add your car or home', desc: 'We’ll fill in the usual upkeep.', need: 1, have: (s) => s.care.things.length },
    { id: 'dates', title: 'When was it last done?', desc: 'Set the last-done date for 3 things.', need: 3, have: (s) => s.care.items.filter((i) => i.last).length },
    { id: 'log', title: 'Log upkeep', desc: 'Tap “Done today” the next time you take care of something.', need: 1, have: (s) => s.care.log.length }
  ],
  subs: [
    { id: 'list', title: 'List your subscriptions', desc: 'Streaming, apps, phone plans, memberships.', need: 3, have: (s) => s.subs.length },
    { id: 'review', title: 'Check in on each one', desc: 'Keep it or cancel it.', need: 1, have: (s) => n(s.subs.length > 0 && s.subs.every((x) => x.reviewedOn)) },
    { id: 'tidy', title: 'Cancel one you don’t use', desc: 'Most families find at least one.', need: 1, have: (s) => s.subs.filter((x) => x.status === 'cancelled').length }
  ],
  cards: [
    { id: 'people', title: 'Add birthdays', desc: 'Add 3 people you love.', tab: 'people', need: 3, have: (s) => s.cards.people.length },
    { id: 'sent', title: 'Send a card', desc: 'Mark one “card sent” when a birthday comes up.', tab: 'up', need: 1, have: (s) => s.cards.sent.length },
    { id: 'thanks', title: 'Say thank you', desc: 'Write and send one thank-you note.', tab: 'thanks', need: 1, have: (s) => s.cards.thanks.filter((t) => t.done).length }
  ],
  dates: [
    { id: 'draw', title: 'Draw a date', desc: 'Tap the jar.', need: 1, have: (s) => n(s.dates.lastDraw) },
    { id: 'plan', title: 'Put it on the calendar', desc: 'Pick a day for it.', need: 1, have: (s) => s.dates.drawn.length },
    { id: 'went', title: 'Go, then save a memory', desc: 'Mark the outing done on the calendar.', need: 1, have: (s) => s.dates.drawn.filter((d) => s.events.find((e) => e.id === d.eventId)?.done).length }
  ],
  kids: [
    { id: 'kid', title: 'Add a child', desc: 'Kids in your family show up here.', tab: 'kids', need: 1, have: (s) => kidNames(s).length },
    { id: 'stars', title: 'Give 3 stars', desc: 'For chores, kindness or homework.', tab: 'kids', need: 3, have: (s) => s.kids.log.length },
    { id: 'reward', title: 'Cash in a reward', desc: 'Let a child spend stars on something fun.', tab: 'rewards', need: 1, have: (s) => s.kids.redeemed.length },
    { id: 'book', title: 'Log a book', desc: 'Start the reading log.', tab: 'reading', need: 1, have: (s) => s.kids.reading.length }
  ],
  meeting: [
    { id: 'first', title: 'Hold your first meeting', desc: 'About 15 minutes, top to bottom.', need: 1, have: (s) => s.meetings.length },
    { id: 'focus', title: 'Pick a weekly focus', desc: 'One thing for the family to work on.', need: 1, have: (s) => s.meetings.filter((m) => m.focus).length },
    { id: 'habit', title: 'Four weeks in a row', desc: 'Hold 4 family meetings.', need: 4, have: (s) => s.meetings.length }
  ],
  repair: [
    { id: 'car', title: 'Add your car', desc: 'Cars are shared with Car & Home Care.', need: 1, have: (s) => (s.care?.things || []).filter((t) => t.kind === 'car').length },
    { id: 'log', title: 'Log a repair', desc: 'Oil change, brakes, anything.', need: 1, have: (s) => s.logs.repair.length },
    { id: 'miles', title: 'Track mileage', desc: 'Add the mileage to a repair.', need: 1, have: (s) => s.logs.repair.filter((e) => e.miles).length }
  ],
  vet: [
    { id: 'pet', title: 'Add your pet', desc: 'Pets in the family show up here.', need: 1, have: (s) => s.family.filter((m) => m.kind === 'pet').length },
    { id: 'log', title: 'Log a visit', desc: 'A checkup, vaccine or grooming.', need: 1, have: (s) => s.logs.vet.length },
    { id: 'next', title: 'Set a next-due date', desc: 'Get a heads-up before the next one.', need: 1, have: (s) => s.logs.vet.filter((e) => e.next).length }
  ],
  gifts: [
    { id: 'idea', title: 'Save a gift idea', desc: 'Write it down when you think of it.', need: 1, have: (s) => s.logs.gifts.filter((e) => e.kind === 'Idea').length },
    { id: 'size', title: 'Log a size', desc: 'Like “Shoe: 4Y”.', tab: 'sizes', need: 1, have: (s) => s.logs.gifts.filter((e) => e.kind === 'Size').length },
    { id: 'given', title: 'Log a gift given', desc: 'So there are no repeats next year.', need: 1, have: (s) => s.logs.gifts.filter((e) => e.kind === 'Given').length }
  ]
};
export const stepReward = (k, last) => (last ? { coins: 60, xp: 40 } : { coins: 20 + 10 * k, xp: 10 + 5 * k });

/* Status of every step: done (in order), current, or locked. */
export function pathStatus(state, id) {
  const steps = PATHS[id];
  if (!steps) return null;
  let open = true, current = -1;
  const out = steps.map((st, k) => {
    const have = Math.min(st.need, safe(() => st.have(state)));
    const ok = open && have >= st.need;
    const status = ok ? 'done' : open ? 'current' : 'locked';
    if (status === 'current') { current = k; open = false; }
    return { ...st, have, status, reward: stepReward(k, k === steps.length - 1) };
  });
  return { id, steps: out, current, done: current === -1 };
}
const safe = (fn) => { try { return fn() || 0; } catch (e) { return 0; } };

/* Tabs open when the step that introduces them is reached (current or done). */
export function tabLocked(state, id, tab) {
  const p = pathStatus(state, id);
  if (!p) return false;
  const first = p.steps.find((s) => s.tab === tab);
  return !!first && first.status === 'locked';
}
export function currentTab(state, id) {
  const p = pathStatus(state, id);
  if (!p) return null;
  const cur = p.steps[p.current];
  return cur?.tab || [...p.steps].reverse().find((s) => s.tab && s.status !== 'locked')?.tab || null;
}

/* Pay for newly finished steps (once each). With silent=true, just record progress (older towns). */
export function checkPaths(state, silent = false) {
  state.paths = state.paths || {};
  const fresh = [];
  for (const id of Object.keys(PATHS)) {
    const p = pathStatus(state, id);
    const doneCount = p.steps.filter((s) => s.status === 'done').length;
    const prev = state.paths[id] ?? (silent ? doneCount : 0);
    if (doneCount > prev) {
      for (let k = prev; k < doneCount; k++) { const st = p.steps[k]; if (!silent) grant(state, st.reward); fresh.push({ path: id, step: st, next: p.steps[k + 1] || null }); }
      state.paths[id] = doneCount;
    } else if (state.paths[id] == null) state.paths[id] = doneCount;
  }
  return silent ? [] : fresh;
}
