/*
 * Storm rules (product decisions — keep exactly):
 *   level = 0.55 × cushion gap + 0.45 × min(1, debt ÷ 30,000) + stall drift (max 0.25)
 *   payoff date set (levee)  → × 0.78
 *   full cushion (seawall)   → × 0.5
 * Labels: Calm < 0.25, Choppy < 0.45, Stormy < 0.62, otherwise High water.
 * Budget overspending is NOT an input. Going over budget never raises the water.
 */
export const STARTER_CUSHION = 1000;
export const DEBT_SCALE = 30000;
export const DRIFT_MAX = 0.25;
export const DRIFT_PER_STALLED_PAYDAY = 0.06;
export const LEVEE_FACTOR = 0.78;
export const SEAWALL_FACTOR = 0.5;
export const GENTLE_FACTOR = 0.55;

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function cushionGap(cushion, goal = STARTER_CUSHION) {
  return 1 - Math.min(1, Math.max(0, cushion) / goal);
}

export function driftFor(stalledPaydays) {
  return Math.min(DRIFT_MAX, Math.max(0, stalledPaydays) * DRIFT_PER_STALLED_PAYDAY);
}

/* Only these five inputs exist on purpose. */
export function stormLevel({ cushion = 0, debt = 0, drift = 0, levee = false, seawall = false }) {
  let r = 0.55 * cushionGap(cushion) + 0.45 * Math.min(1, Math.max(0, debt) / DEBT_SCALE) + Math.min(DRIFT_MAX, Math.max(0, drift));
  if (levee) r *= LEVEE_FACTOR;
  if (seawall) r *= SEAWALL_FACTOR;
  return clamp01(r);
}

export function stormLabel(r) {
  return r < 0.25 ? 'Calm' : r < 0.45 ? 'Choppy' : r < 0.62 ? 'Stormy' : 'High water';
}
export function stormHeadline(r) {
  return r < 0.25 ? 'Calm water' : r < 0.45 ? 'The water is going down' : r < 0.62 ? 'A storm is rolling in' : 'The water is rising';
}

/* Visual level: gentle mode softens visuals to 55%. */
export function stormVisual(level, gentle = false) {
  return clamp01(level) * (gentle ? GENTLE_FACTOR : 1);
}

/* Water height in world units. Grass top sits at y = 0; water never rises above it. */
export const GRASS_TOP = 0;
export const WATER_LOW = -0.92;
export const WATER_RANGE = 0.8;
export function waterY(visual) {
  return Math.min(GRASS_TOP - 0.1, WATER_LOW + clamp01(visual) * WATER_RANGE);
}

/* Inputs straight from the money state. Seawall = Starter Cushion full. Levee = payoff date set. */
export function stormFromMoney(money) {
  return stormLevel({
    cushion: money.cushion,
    debt: money.debt,
    drift: driftFor(money.stalledPaydays || 0),
    levee: !!money.payoffDate,
    seawall: money.cushion >= STARTER_CUSHION
  });
}
