import { byId, SECTIONS } from '../data/catalog.js';
import { sectionUnlocked, unlockHint, tierOpen, habitsFormed } from './progression.js';
import { districtForBuilding, catActive, catLabel } from './district.js';
import { canBuildMonument, bizCost } from './business.js';

/*
 * One answer to "can this be built yet, and if not, why?" used by the hub menus.
 * Returns { built } | { ok: true, cost } | { ok: false, why }.
 */
export function reqFor(state, type) {
  const def = byId[type];
  if (!def) return { ok: false, why: 'Not available' };
  if (state.buildings.some((b) => b.type === type)) return { built: true };
  const bank = state.buildings.some((b) => b.type === 'bank');
  if (def.section) {
    if (!sectionUnlocked(state, def.section)) return { ok: false, why: unlockHint(state, def.section) };
    if (def.tier > 1 && !tierOpen(state, def.section, def.tier)) { const n = def.tier - 1 - habitsFormed(state, def.section); return { ok: false, why: `Form ${n} more ${SECTIONS[def.section].name} ${n === 1 ? 'habit' : 'habits'}` }; }
    if (def.money && (state.budget?.level || 1) < def.money) return { ok: false, why: `Reach money level ${def.money}` };
    return { ok: true, cost: def.cost };
  }
  if (def.needsBank && !bank) return { ok: false, why: 'Build the Bank first' };
  const dist = districtForBuilding(type);
  if (dist && catActive(state, dist.cat)) return { ok: true, cost: 0 };
  if (def.kind === 'district') return { ok: false, why: `Budget for ${catLabel(dist.cat)}` };
  if (type === 'monument' && !canBuildMonument(state)) return { ok: false, why: 'List a debt at the Bank' };
  if (state.level < def.level) return { ok: false, why: `Reach town level ${def.level}` };
  return { ok: true, cost: def.kind === 'biz' ? bizCost(state, type) : def.cost };
}
