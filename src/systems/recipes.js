import { MATERIALS, MATERIAL_KEYS } from '../data/areas.js';
import { COSTS } from './build.js';
import { hasMaterials } from './materials.js';

/*
 * Small builds cost points only (road 20, park 30, upgrade 50, home 60).
 * Community buildings and landmarks need materials + points.
 * If the family has no goal in an area, recipes skip that area's material,
 * so nobody is locked out of a building by a goal they chose not to set.
 */
export const SMALL = [
  { id: 'road', name: 'Road', type: 'small', points: COSTS.road, needs: {} },
  { id: 'park', name: 'Park', type: 'small', points: COSTS.park, needs: {} },
  { id: 'home', name: 'Home', type: 'small', points: COSTS.home, needs: {} },
  { id: 'upgrade', name: 'Upgrade', type: 'small', points: COSTS.upgrade, needs: {} }
];

export const RECIPES = [
  { id: 'community-center', name: 'Community Center', type: 'community', points: 60, needs: { bricks: 4, picnic: 3, lanterns: 2 } },
  { id: 'school', name: 'Schoolhouse', type: 'community', points: 60, needs: { bricks: 3, lumber: 2, candles: 1 } },
  { id: 'clinic', name: 'Clinic', type: 'community', points: 60, needs: { lumber: 4, bricks: 2, harvest: 1 } },
  { id: 'library', name: 'Library', type: 'community', points: 60, needs: { candles: 3, lanterns: 2, bricks: 2 } },
  { id: 'lighthouse', name: 'Lighthouse', type: 'landmark', points: 120, needs: { bricks: 6, lanterns: 4, candles: 3, lumber: 3 } },
  { id: 'bandstand', name: 'Bandstand', type: 'landmark', points: 120, needs: { lumber: 5, picnic: 4, harvest: 4, lanterns: 2 } }
];
export const recipeById = (id) => RECIPES.find((r) => r.id === id);

/* activeMats: material keys the family can earn (areas with goals). */
export function effectiveNeeds(recipe, activeMats = MATERIAL_KEYS) {
  const out = {};
  for (const [k, n] of Object.entries(recipe.needs)) if (activeMats.includes(k) && n > 0) out[k] = n;
  return out;
}

/* What is still needed, as a list for the build menu. Neutral wording, no red. */
export function stillNeeded(recipe, state, activeMats) {
  const needs = effectiveNeeds(recipe, activeMats);
  const list = Object.entries(needs).map(([k, n]) => ({ key: k, label: MATERIALS[k].label, need: n, have: Math.min(n, state.materials[k] || 0), met: (state.materials[k] || 0) >= n }));
  list.push({ key: 'points', label: 'points', need: recipe.points, have: Math.min(recipe.points, state.points), met: state.points >= recipe.points });
  return list;
}

export function canBuildRecipe(recipe, state, activeMats) {
  return state.points >= recipe.points && hasMaterials(state.materials, effectiveNeeds(recipe, activeMats));
}
