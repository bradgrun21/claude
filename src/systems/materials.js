import { AREA_INFO, MATERIAL_KEYS } from '../data/areas.js';

/*
 * Materials: one per life bar. Completing a task adds 1 of that task's material,
 * capped at 3 per material per day. Never from dollar amounts. No buying, trading,
 * gifting or storage limit.
 */
export const DAILY_CAP = 3;

export function emptyMaterials() {
  return Object.fromEntries(MATERIAL_KEYS.map((k) => [k, 0]));
}

/* Returns how many were added (0 or 1). */
export function earnMaterial(state, area, today) {
  const key = AREA_INFO[area]?.material;
  if (!key) return 0;
  if (!state.materialLog || state.materialLog.date !== today) state.materialLog = { date: today, counts: {} };
  const used = state.materialLog.counts[key] || 0;
  if (used >= DAILY_CAP) return 0;
  state.materialLog.counts[key] = used + 1;
  state.materials[key] = (state.materials[key] || 0) + 1;
  return 1;
}

export function hasMaterials(have, needs) {
  return Object.entries(needs).every(([k, n]) => (have[k] || 0) >= n);
}
export function takeMaterials(state, needs) {
  if (!hasMaterials(state.materials, needs)) return false;
  for (const [k, n] of Object.entries(needs)) state.materials[k] -= n;
  return true;
}
