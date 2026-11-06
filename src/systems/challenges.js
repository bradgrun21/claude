import { grant, population } from './economy.js';
import { streak, totalDue } from './lists.js';

/*
 * XP sources besides tasks:
 *  - Daily challenges (3 a day, picked by date so they're the same all day)
 *  - Milestones (one-time achievements, claimed from the trophy panel)
 *  - Quick wins (the getting-started checklist)
 */
const POOL = [
  { id: 'tasks3', text: 'Check off 3 tasks today', xp: 20, coins: 20, need: 3, track: 'tasks', min: 3 },
  { id: 'tasks5', text: 'Check off 5 tasks today', xp: 30, coins: 30, need: 5, track: 'tasks', min: 5 },
  { id: 'sections2', text: 'Check off tasks in 2 different areas', xp: 20, coins: 15, need: 2, track: 'sections', minSections: 2 },
  { id: 'sections3', text: 'Check off tasks in 3 different areas', xp: 30, coins: 25, need: 3, track: 'sections', minSections: 3 },
  { id: 'fulllist', text: 'Finish everything due today in one list', xp: 25, coins: 20, need: 1, track: 'lists', min: 1 },
  { id: 'build', text: 'Build or upgrade something', xp: 15, coins: 0, need: 1, track: 'builds', min: 0 }
];

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

export function dailyChallenges(state, day) {
  if (state.challenges.day === day) return state.challenges.items;
  const open = new Set(state.lists.map((l) => l.section)).size;
  const due = totalDue(state, day);
  const eligible = POOL.filter((c) => (c.min == null || due >= c.min) && (c.minSections == null || open >= c.minSections));
  const pool = eligible.length >= 3 ? eligible : POOL.filter((c) => c.id === 'tasks3' || c.id === 'build' || c.id === 'fulllist');
  const picked = [];
  let h = hash(day);
  const left = [...pool];
  while (picked.length < 3 && left.length) { const k = h % left.length; picked.push(left.splice(k, 1)[0]); h = hash(String(h)); }
  state.challenges = { day, items: picked.map((c) => ({ id: c.id, text: c.text, xp: c.xp, coins: c.coins, need: c.need, track: c.track, claimed: false })) };
  return state.challenges.items;
}

export function challengeProgress(state, item, day) {
  const t = state.stats.today && state.stats.today.day === day ? state.stats.today : { tasks: 0, sections: [], lists: [] };
  const builds = state.stats.buildsDay === day ? state.stats.buildsToday || 0 : 0;
  const v = item.track === 'tasks' ? t.tasks : item.track === 'sections' ? t.sections.length : item.track === 'lists' ? t.lists.length : builds;
  return Math.min(item.need, v);
}

export function claimChallenge(state, id, day) {
  const item = dailyChallenges(state, day).find((c) => c.id === id);
  if (!item || item.claimed || challengeProgress(state, item, day) < item.need) return null;
  item.claimed = true;
  grant(state, { xp: item.xp, coins: item.coins });
  return item;
}

export function noteBuild(state, day) {
  if (state.stats.buildsDay !== day) { state.stats.buildsDay = day; state.stats.buildsToday = 0; }
  state.stats.buildsToday++;
}

/* Milestones: value(state) >= at → claimable once. */
export const MILESTONES = [
  ...[10, 50, 200, 500].map((at, i) => ({ id: `tasks${at}`, text: `Check off ${at} tasks`, at, value: (s) => s.stats.tasksDone || 0, xp: 25 * (i + 1), coins: 50 * (i + 1) })),
  ...[1, 5, 20].map((at, i) => ({ id: `goals${at}`, text: at === 1 ? 'Reach your first big goal' : `Reach ${at} big goals`, at, value: (s) => s.stats.goalsDone || 0, xp: 40 * (i + 1), coins: 100 * (i + 1) })),
  ...[2, 5].map((at, i) => ({ id: `areas${at}`, text: at === 5 ? 'Open all five areas' : 'Open two areas', at, value: (s) => new Set(s.lists.map((l) => l.section)).size, xp: 30 * (i + 1), coins: 80 * (i + 1) })),
  ...[25, 100, 250].map((at, i) => ({ id: `pop${at}`, text: `Reach ${at} population`, at, value: (s) => population(s), xp: 30 * (i + 1), coins: 75 * (i + 1) })),
  ...[3, 7, 30].map((at, i) => ({ id: `streak${at}`, text: `${at}-day streak`, at, value: (s) => streak(s, s.stats.lastDay || ''), xp: 20 * (i + 1), coins: 40 * (i + 1) })),
  ...[2, 3].map((at, i) => ({ id: `th${at}`, text: `Upgrade the Town Hall to level ${at}`, at, value: (s) => s.tcLevel, xp: 50 * (i + 1), coins: 0 }))
];

export function milestoneState(state) {
  return MILESTONES.map((m) => ({ ...m, now: Math.min(m.at, m.value(state)), claimed: !!state.milestones[m.id], ready: !state.milestones[m.id] && m.value(state) >= m.at }));
}
export function claimMilestone(state, id) {
  const m = MILESTONES.find((x) => x.id === id);
  if (!m || state.milestones[id] || m.value(state) < m.at) return null;
  state.milestones[id] = true;
  grant(state, { xp: m.xp, coins: m.coins });
  return m;
}

/* Quick wins: the getting-started checklist. Done flags are set by the game as things happen. */
export const QUICK_WINS = [
  { id: 'goal', text: 'Add your first goal', coins: 30, xp: 20 },
  { id: 'place', text: 'Place your first area building', coins: 20, xp: 15 },
  { id: 'task', text: 'Check off a task', coins: 20, xp: 15 },
  { id: 'home', text: 'Build a home', coins: 30, xp: 20 },
  { id: 'road', text: 'Lay a road', coins: 20, xp: 10 },
  { id: 'area2', text: 'Open a second area', coins: 50, xp: 25 },
  { id: 'memory', text: 'Add a photo or recap of your day', coins: 20, xp: 15 },
  { id: 'outing', text: 'Plan an outing on the calendar', coins: 20, xp: 15 },
  { id: 'level3', text: 'Reach level 3', coins: 100, xp: 30 }
];
export function markQuickWin(state, id) {
  if (!state.quickWins[id]) { state.quickWins[id] = 'ready'; return true; }
  return false;
}
export function claimQuickWin(state, id) {
  const q = QUICK_WINS.find((x) => x.id === id);
  if (!q || state.quickWins[id] !== 'ready') return null;
  state.quickWins[id] = 'claimed';
  grant(state, { coins: q.coins, xp: q.xp });
  return q;
}
