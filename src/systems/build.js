/*
 * Build points come only from habits and logging, never from dollar amounts.
 * Point-only costs (keep exactly): road 20, park 30, upgrade 50, home 60.
 */
export const COSTS = Object.freeze({ road: 20, park: 30, upgrade: 50, home: 60 });
export const POINTS_PER_LOG = 10;
export const MAX_FLOORS = 3;

export function canAfford(points, kind) { return points >= COSTS[kind]; }

export function spend(state, kind) {
  const c = COSTS[kind];
  if (c == null || state.points < c) return false;
  state.points -= c;
  return true;
}
