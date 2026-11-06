import { byId } from '../data/catalog.js';
import { taskReward, goalReward, grant } from './economy.js';
import { fromKey, addDays, daysBetween } from './time.js';

/*
 * Every section building holds one list with two kinds of things:
 *   - Tasks: simple repeating or one-time things ("Dishes · Daily"). No big goal needed.
 *   - Goals: a bigger thing ("Run a 5K") with optional sub-tasks under it.
 * Task kinds: 'daily' (once a day), 'weekly' (up to N days a week), 'once' (one time). Goal steps use the same kinds.
 * A task can be assigned to one family member (who = their name) or to everyone (who = null).
 * Tasks, goals and whole lists can be paused ("resting"): nothing paused is ever due, and pausing never costs progress.
 * Goals can have an optional target date, shown gently as "N days to go", never as overdue.
 *
 * Progress comes from consistency, not from adding more things:
 *   - the first 6 check-offs each day pay in full; after that, a small token amount
 *   - the first check-off of the day earns a "daily visit" bonus
 *   - streak bonuses at 3, 7, 14, 30, 60 and 100 days (one rest day a week never breaks a streak)
 *   - a weekly "review my week"
 *   - buildings grow from steady use (days checked off there), not from list length
 */
export const MAX_TASKS = 12;
export const FULL_REWARDS_PER_DAY = 6;
export const TOKEN_REWARD = { coins: 2, xp: 1 };
export const DAILY_VISIT = { coins: 10, xp: 10 };
export const STREAK_BONUS = { 3: { coins: 20, xp: 20 }, 7: { coins: 40, xp: 40 }, 14: { coins: 60, xp: 60 }, 30: { coins: 100, xp: 100 }, 60: { coins: 150, xp: 150 }, 100: { coins: 250, xp: 250 } };
export const WEEKLY_REVIEW = { coins: 25, xp: 30 };
export const USE_LEVELS = [0, 10, 30];
export const KIND_LABEL = { daily: 'Daily', weekly: '×/week', once: 'Once' };

export function weekStart(day) {
  const d = fromKey(day);
  const back = (d.getDay() + 6) % 7;
  return addDays(day, -back);
}
export function doneThisWeek(task, day) {
  const from = weekStart(day);
  return task.done.filter((d) => d >= from && d <= day).length;
}

let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/* Compact frequency code used by the pill on the right: 'daily' | 'w1'..'w6' | 'once'. */
export const freqCode = (t) => (t.kind === 'weekly' ? `w${t.per || 1}` : t.kind);
export function fromFreq(code) {
  if (code === 'daily' || code === 'once') return { kind: code, per: 1 };
  const n = Math.max(1, Math.min(6, parseInt(String(code).slice(1), 10) || 3));
  return { kind: 'weekly', per: n };
}
export function freqLabel(t) { return t.kind === 'weekly' ? `${t.per}×/wk` : t.kind === 'daily' ? 'Daily' : 'Once'; }

export function makeTask(title, kind = 'daily', per = 3, goalId = null, who = null) {
  return { id: uid('t'), title: String(title).trim(), kind, per: kind === 'weekly' ? Math.max(1, Math.min(7, per)) : 1, done: [], goalId, who: who || null, paused: false };
}

/* Older saves had one big goal per list. Turn it into the new shape. */
export function migrateList(l) {
  if (l.goals) return l;
  l.goals = [];
  if (l.goal && l.goal.trim()) {
    const g = { id: uid('g'), title: l.goal.trim(), createdOn: l.createdOn, achievedOn: null };
    l.goals.push(g);
    for (const t of l.tasks) t.goalId = g.id;
  } else for (const t of l.tasks) t.goalId = t.goalId || null;
  delete l.goal;
  return l;
}

const goalOf = (list, task) => (task.goalId ? list.goals.find((g) => g.id === task.goalId) : null);
/* A task is live unless it belongs to a goal that's already been completed. */
export const isLive = (list, task) => { const g = goalOf(list, task); return !g || !g.achievedOn; };
/* Resting: the task itself, its goal, or the whole list is paused. */
export const isPaused = (list, task) => !!(task.paused || list?.paused || (list && goalOf(list, task)?.paused));
export function isAvailable(task, day, list = null) {
  if (list && !isLive(list, task)) return false;
  if (isPaused(list, task)) return false;
  if (task.kind === 'once') return task.done.length === 0;
  if (task.done.includes(day)) return false;
  if (task.kind === 'weekly') return doneThisWeek(task, day) < (task.per || 1);
  return true;
}
export function progressLabel(task, day) {
  if (task.kind === 'once') return task.done.length ? 'Done' : '';
  if (task.kind === 'daily') return task.done.includes(day) ? 'Done today' : '';
  const n = doneThisWeek(task, day);
  return n >= task.per ? 'Done this week' : `${n} of ${task.per} this week`;
}

/* createList(state, building, goalTitle, tasks, day): with a goal title the tasks become its steps; without one they're plain tasks. */
export function createList(state, building, goal, tasks = [], today) {
  const def = byId[building.type];
  const list = { id: uid('l'), buildingId: building.id, section: def.section, tier: def.tier, tasks: [], goals: [], createdOn: today, achieved: [] };
  state.lists.push(list);
  const g = goal && goal.trim() ? addGoal(state, list.id, goal, today) : null;
  for (const t of tasks.filter((x) => x.title && x.title.trim()).slice(0, MAX_TASKS)) list.tasks.push(makeTask(t.title, t.kind, t.per, g ? g.id : null));
  return list;
}
export function addGoal(state, listId, title, today, target = null) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list || !title || !title.trim()) return null;
  const g = { id: uid('g'), title: title.trim(), createdOn: today, achievedOn: null, target: validDay(target), paused: false };
  list.goals.push(g);
  return g;
}
export function addTask(state, listId, t) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list || !t.title || !t.title.trim()) return null;
  const task = makeTask(t.title, t.kind || 'daily', t.per || 3, t.goalId || null, t.who || null);
  list.tasks.push(task);
  return task;
}
export function updateTask(state, listId, taskId, patch) {
  const list = state.lists.find((l) => l.id === listId);
  const t = list?.tasks.find((x) => x.id === taskId);
  if (!t) return null;
  if (patch.title != null && patch.title.trim()) t.title = patch.title.trim();
  if (patch.freq) Object.assign(t, fromFreq(patch.freq));
  if (patch.who !== undefined) t.who = patch.who || null;
  if (patch.paused !== undefined) t.paused = !!patch.paused;
  return t;
}
const validDay = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
export function updateGoal(state, listId, goalId, patch) {
  const list = state.lists.find((l) => l.id === listId);
  const g = list?.goals.find((x) => x.id === goalId);
  if (!g) return null;
  if (patch.title != null && patch.title.trim()) g.title = patch.title.trim();
  if (patch.target !== undefined) g.target = validDay(patch.target);
  if (patch.paused !== undefined) g.paused = !!patch.paused;
  return g;
}
export function setListPaused(state, listId, on, day) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list) return null;
  list.paused = !!on;
  list.pausedOn = on ? day : null;
  return list;
}
/* Gentle countdown for a goal's target date. Never "late": past the date it just says keep going. */
export function targetLabel(goal, day) {
  if (!goal.target) return '';
  const n = daysBetween(day, goal.target);
  if (n > 1) return `${n} days to go`;
  if (n === 1) return 'Target is tomorrow';
  if (n === 0) return 'Target is today';
  return 'Still going strong';
}
export function removeTask(state, listId, taskId) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list) return;
  list.tasks = list.tasks.filter((t) => t.id !== taskId);
}
export function removeGoal(state, listId, goalId) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list) return;
  list.goals = list.goals.filter((g) => g.id !== goalId);
  list.tasks = list.tasks.filter((t) => t.goalId !== goalId);
}

export const listFor = (state, buildingId) => state.lists.find((l) => l.buildingId === buildingId);
export const itemCount = (list) => list.tasks.filter((t) => isLive(list, t)).length + list.goals.filter((g) => !g.achievedOn).length;
export const dueCount = (list, day) => list.tasks.filter((t) => isAvailable(t, day, list)).length;
export const totalDue = (state, day) => state.lists.reduce((n, l) => n + dueCount(l, day), 0);

function todayStats(state, day) {
  const s = state.stats;
  return (s.today && s.today.day === day) ? s.today : (s.today = { day, tasks: 0, sections: [], lists: [] });
}

export function completeTask(state, listId, taskId, day) {
  const list = state.lists.find((l) => l.id === listId);
  const task = list?.tasks.find((t) => t.id === taskId);
  if (!task || !isAvailable(task, day, list)) return null;
  task.done.push(day);
  if (task.done.length > 400) task.done.splice(0, task.done.length - 400);
  const td = todayStats(state, day);
  const full = td.tasks < FULL_REWARDS_PER_DAY;
  const reward = full ? taskReward(list.tier, state.tcLevel) : { ...TOKEN_REWARD };
  grant(state, reward);
  state.stats.tasksDone = (state.stats.tasksDone || 0) + 1;
  td.tasks++;
  if (!td.sections.includes(list.section)) td.sections.push(list.section);
  if (!td.lists.includes(list.id) && list.tasks.every((t) => !isAvailable(t, day, list))) td.lists.push(list.id);
  /* First check-off of the day: daily visit bonus, and maybe a streak bonus. */
  let visit = null, streakBonus = null, streakDays = 0;
  if (!state.loggedDays.includes(day)) {
    state.loggedDays.push(day);
    if (state.loggedDays.length > 400) state.loggedDays.shift();
    visit = { ...DAILY_VISIT };
    grant(state, visit);
    streakDays = streak(state, day);
    const b = STREAK_BONUS[streakDays];
    if (b && !(state.stats.streakPaid || []).includes(`${streakDays}:${day}`)) {
      streakBonus = { ...b, days: streakDays };
      grant(state, b);
      (state.stats.streakPaid = state.stats.streakPaid || []).push(`${streakDays}:${day}`);
    }
  }
  return { reward, full, visit, streakBonus, streakDays, task, list };
}

/* Finishing a goal: its repeating steps retire, and the family gets a celebration + reward. */
export function achieveGoal(state, listId, goalId, day) {
  const list = state.lists.find((l) => l.id === listId);
  const g = list?.goals.find((x) => x.id === goalId);
  if (!g || g.achievedOn) return null;
  const reward = goalReward(list.tier);
  grant(state, reward);
  g.achievedOn = day;
  list.achieved.push({ goal: g.title, on: day });
  state.stats.goalsDone = (state.stats.goalsDone || 0) + 1;
  return { reward, list, goal: g };
}

/*
 * Streak: days in a row with at least one check-off, ending today (or yesterday).
 * One missed day per week (Mon–Sun) is a free rest day and doesn't break it.
 */
export function streak(state, day) {
  const set = new Set(state.loggedDays);
  let d = set.has(day) ? day : addDays(day, -1);
  let n = 0;
  const graceUsed = new Set();
  let guard = 0;
  while (guard++ < 500) {
    if (set.has(d)) { n++; d = addDays(d, -1); continue; }
    const wk = weekStart(d);
    const prev = addDays(d, -1);
    if (!graceUsed.has(wk) && set.has(prev) && n > 0) { graceUsed.add(wk); d = prev; continue; }
    break;
  }
  return n;
}

/* Weekly review: once per week, a look back plus a reward for showing up. */
export function canReviewWeek(state, day) { return state.stats.reviewedWeek !== weekStart(day); }
export function reviewWeek(state, day) {
  if (!canReviewWeek(state, day)) return null;
  state.stats.reviewedWeek = weekStart(day);
  grant(state, WEEKLY_REVIEW);
  return { reward: WEEKLY_REVIEW };
}
export function weekSummary(state, day) {
  const from = addDays(day, -6);
  const bySection = {};
  let total = 0;
  for (const l of state.lists) for (const t of l.tasks) { const n = t.done.filter((d) => d >= from && d <= day).length; if (n) { bySection[l.section] = (bySection[l.section] || 0) + n; total += n; } }
  const days = state.loggedDays.filter((d) => d >= from && d <= day).length;
  return { total, days, bySection, goals: state.lists.flatMap((l) => l.goals.filter((g) => g.achievedOn && g.achievedOn >= from)).map((g) => g.title) };
}

/* How much a building is used: distinct days with a check-off there. Grows the building (level 1–3). */
export function useDays(list) {
  const s = new Set();
  for (const t of list.tasks) for (const d of t.done) s.add(d);
  return s.size;
}
export function useLevel(list) {
  const n = useDays(list);
  return n >= USE_LEVELS[2] ? 3 : n >= USE_LEVELS[1] ? 2 : 1;
}
