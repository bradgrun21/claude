import { byId } from '../data/catalog.js';
import { taskReward, goalReward, grant } from './economy.js';
import { fromKey, addDays } from './time.js';

/*
 * Every section building holds one list: a bigger goal plus the small tasks that move it forward.
 * Task kinds: 'daily' (once a day), 'weekly' (up to N days a week), 'once' (one time).
 * Higher-tier buildings pay more per task, so more lists = more coins.
 */
export const MAX_TASKS = 6;
export const KIND_LABEL = { daily: 'Every day', weekly: 'Times a week', once: 'One time' };

export function weekStart(day) {
  const d = fromKey(day);
  const back = (d.getDay() + 6) % 7;
  return addDays(day, -back);
}
export function doneThisWeek(task, day) {
  const from = weekStart(day);
  return task.done.filter((d) => d >= from && d <= day).length;
}
export function isAvailable(task, day) {
  if (task.kind === 'once') return task.done.length === 0;
  if (task.done.includes(day)) return false;
  if (task.kind === 'weekly') return doneThisWeek(task, day) < (task.per || 1);
  return true;
}
export function progressLabel(task, day) {
  if (task.kind === 'once') return task.done.length ? 'Done' : 'One time';
  if (task.kind === 'daily') return task.done.includes(day) ? 'Done today' : 'Every day';
  return `${doneThisWeek(task, day)} of ${task.per} this week`;
}

let seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeTask(title, kind = 'daily', per = 3) {
  return { id: uid('t'), title: title.trim(), kind, per: kind === 'weekly' ? Math.max(1, Math.min(7, per)) : 1, done: [] };
}

export function createList(state, building, goal, tasks, today) {
  const def = byId[building.type];
  const list = { id: uid('l'), buildingId: building.id, section: def.section, tier: def.tier, goal: goal.trim(), tasks: tasks.filter((t) => t.title && t.title.trim()).slice(0, MAX_TASKS).map((t) => makeTask(t.title, t.kind, t.per)), createdOn: today, achieved: [] };
  state.lists.push(list);
  return list;
}

export const listFor = (state, buildingId) => state.lists.find((l) => l.buildingId === buildingId);
export const dueCount = (list, day) => list.tasks.filter((t) => isAvailable(t, day)).length;
export const totalDue = (state, day) => state.lists.reduce((n, l) => n + dueCount(l, day), 0);

export function completeTask(state, listId, taskId, day) {
  const list = state.lists.find((l) => l.id === listId);
  const task = list?.tasks.find((t) => t.id === taskId);
  if (!task || !isAvailable(task, day)) return null;
  task.done.push(day);
  if (task.done.length > 120) task.done.splice(0, task.done.length - 120);
  const reward = taskReward(list.tier, state.tcLevel);
  grant(state, reward);
  const s = state.stats;
  s.tasksDone = (s.tasksDone || 0) + 1;
  const today = (s.today && s.today.day === day) ? s.today : (s.today = { day, tasks: 0, sections: [], lists: [] });
  today.tasks++;
  if (!today.sections.includes(list.section)) today.sections.push(list.section);
  if (!today.lists.includes(list.id) && list.tasks.every((t) => !isAvailable(t, day) || t.done.includes(day))) today.lists.push(list.id);
  if (!state.loggedDays.includes(day)) { state.loggedDays.push(day); if (state.loggedDays.length > 400) state.loggedDays.shift(); }
  return { reward, task, list };
}

export function achieveGoal(state, listId, day) {
  const list = state.lists.find((l) => l.id === listId);
  if (!list || !list.goal) return null;
  const reward = goalReward(list.tier);
  grant(state, reward);
  list.achieved.push({ goal: list.goal, on: day });
  list.goal = '';
  state.stats.goalsDone = (state.stats.goalsDone || 0) + 1;
  return { reward, list };
}

/* Consecutive days with at least one task done, ending today (or yesterday). */
export function streak(state, day) {
  const set = new Set(state.loggedDays);
  let d = set.has(day) ? day : addDays(day, -1);
  let n = 0;
  while (set.has(d) && n < 400) { n++; d = addDays(d, -1); }
  return n;
}
