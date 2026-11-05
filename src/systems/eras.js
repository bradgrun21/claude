/*
 * Phase D stubs (data only, not used by the game yet).
 * Eras by real step only: Village (0–1), Town (2), City (3–4), Legacy (5–7).
 * Each era brings a new art set and recipe tier. Nothing is ever reset.
 */
export const ERAS = [
  { id: 'Village', steps: [0, 1], artSet: 'village', recipeTier: 1 },
  { id: 'Town', steps: [2], artSet: 'town', recipeTier: 2 },
  { id: 'City', steps: [3, 4], artSet: 'city', recipeTier: 3 },
  { id: 'Legacy', steps: [5, 6, 7], artSet: 'legacy', recipeTier: 4 }
];
export function eraFor(stepsDone) {
  return ERAS.find((e) => e.steps.includes(Math.max(0, Math.min(7, stepsDone)))).id;
}
