/*
 * Cushion tower production (logic only, not wired yet).
 * Each morning: bricks by percent of their own cushion goal:
 *   < 25% → 0, 25–99% → 1, 100% → 2.
 * Holds up to 7 days, then pauses. Tap the tower to collect.
 */
export const HOLD_DAYS = 7;

export function dailyBricks(pct) {
  if (pct >= 100) return 2;
  if (pct >= 25) return 1;
  return 0;
}

/* Bricks waiting after `days` mornings since the last collect. */
export function towerStock(pct, days) {
  return dailyBricks(pct) * Math.min(HOLD_DAYS, Math.max(0, days));
}
