import { byId, homePop } from '../data/catalog.js';

/*
 * Three currencies.
 *   XP          — tasks, daily challenges, milestones. Fills the level bar.
 *   Coins       — tasks (more for higher-tier lists). Spent on buildings, homes, upgrades, roads.
 *   Population  — homes and home upgrades. Needed to level up and to upgrade the Town Hall.
 * Leveling up needs XP AND population (and every few levels, a bigger Town Hall).
 */
const XP_TABLE = [0, 60, 120, 200, 300, 420, 560, 720, 900, 1100, 1350, 1650, 2000, 2400, 2850];
const POP_TABLE = [0, 0, 5, 10, 20, 30, 45, 60, 80, 100, 125, 150, 180, 215, 250];

/* What it takes to go from `level` to level + 1. */
export function levelNeed(level) {
  const xp = XP_TABLE[level] ?? Math.round(2850 + (level - 14) * 500);
  const pop = POP_TABLE[level + 1] ?? Math.round(250 + (level - 13) * 40);
  const tc = 1 + Math.floor(level / 4);
  return { xp, pop, tc };
}

export const TOWNHALL = [
  null,
  { level: 1 },
  { level: 2, coins: 400, pop: 25 },
  { level: 3, coins: 1200, pop: 70 },
  { level: 4, coins: 3000, pop: 140 },
  { level: 5, coins: 6000, pop: 230 }
];
export const MAX_TC = TOWNHALL.length - 1;

export const TIER_MULT = [1, 1.5, 2, 3];
export function taskReward(tier = 1, tcLevel = 1) {
  return {
    coins: Math.round(10 * TIER_MULT[Math.min(4, tier) - 1] * (1 + 0.1 * (tcLevel - 1))),
    xp: 5 + 2 * (Math.min(4, tier) - 1)
  };
}
export function goalReward(tier = 1) {
  return { coins: 100 * tier, xp: 40 + 20 * tier };
}

export function population(state) {
  let n = 0;
  for (const b of state.buildings) n += homePop(b.type, b.level || 1);
  return n;
}

export function grant(state, { coins = 0, xp = 0 }) {
  state.coins += coins;
  state.xp += xp;
  state.stats.coinsEarned = (state.stats.coinsEarned || 0) + Math.max(0, coins);
  state.stats.xpEarned = (state.stats.xpEarned || 0) + Math.max(0, xp);
}

export function spend(state, coins) {
  if (state.coins < coins) return false;
  state.coins -= coins;
  return true;
}

/* Returns the list of levels gained (usually 0 or 1). XP carries over. */
export function checkLevelUp(state) {
  const gained = [];
  let guard = 0;
  while (guard++ < 50) {
    const need = levelNeed(state.level);
    if (state.xp < need.xp || population(state) < need.pop || state.tcLevel < need.tc) break;
    state.xp -= need.xp;
    state.level += 1;
    gained.push(state.level);
  }
  return gained;
}

/* Why the bar is full but the level hasn't gone up (for the HUD). */
export function levelBlocker(state) {
  const need = levelNeed(state.level);
  if (state.xp < need.xp) return null;
  if (population(state) < need.pop) return { kind: 'pop', need: need.pop, have: population(state) };
  if (state.tcLevel < need.tc) return { kind: 'tc', need: need.tc };
  return null;
}

export function canUpgradeTownHall(state) {
  const next = TOWNHALL[state.tcLevel + 1];
  if (!next) return { ok: false, reason: 'max' };
  if (population(state) < next.pop) return { ok: false, reason: 'pop', next };
  if (state.coins < next.coins) return { ok: false, reason: 'coins', next };
  return { ok: true, next };
}

export function unlockedAt(level) {
  return Object.values(byId).filter((b) => b.level === level && !b.alt);
}
