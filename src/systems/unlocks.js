import { byId, SECTIONS } from '../data/catalog.js';
import { sectionUnlocked, unlockHint, unlockShort, tierOpen, habitsFormed, choiceFor } from './progression.js';
import { districtForBuilding, catActive, catLabel } from './district.js';
import { canBuildMonument, bizCost } from './business.js';
import { isEarned, earnedById } from './earned.js';

/*
 * One answer to "can this be built yet, and if not, why?" for the Store, the hub menus and placing buildings.
 * One kind of gate per type of thing, and exactly one reason when locked:
 *   - Life-area buildings: the area is open (1st building) / habits formed in that area (2nd–4th).
 *   - Money-linked buildings (Budget District, Grocery Store, Gas Station, News Station): that category is budgeted. Free.
 *   - Nest Egg Tower: Money master (Money path step 5). Debt Freedom Monument: a debt is listed.
 *   - Town things (homes, Main Street shops, decorations, town-level trackers): town level.
 *   - Earned decorations: earned by steady use.
 * Coins are never a lock: they're the price on a Build tile.
 * Returns { built } | { ok: true, cost } | { ok: false, why, short, choose? }.
 */
const ONE_EACH = (def) => def.unique || def.earned || ['section', 'shop', 'district', 'finance', 'civic'].includes(def.kind);
const locked = (why, short, extra = {}) => ({ ok: false, why, short, ...extra });

export function reqFor(state, type) {
  const def = byId[type];
  if (!def) return locked('Not available', 'Not available');
  if (ONE_EACH(def) && state.buildings.some((b) => b.type === type)) return { built: true };
  if (def.earned) return isEarned(state, type) ? { ok: true, cost: 0 } : locked(`Earned by steady use: ${earnedById[type].text}`, 'Earn it');
  if (def.kind === 'section') {
    if (!sectionUnlocked(state, def.section)) {
      const c = choiceFor(state);
      return locked(unlockHint(state, def.section), unlockShort(state, def.section), { choose: !!c?.options?.includes(def.section) });
    }
    if (def.tier > 1 && !tierOpen(state, def.section, def.tier)) {
      const n = def.tier - 1 - habitsFormed(state, def.section);
      return locked(`Form ${n} more ${SECTIONS[def.section].name} ${n === 1 ? 'habit' : 'habits'}`, `Form ${n} more ${n === 1 ? 'habit' : 'habits'}`);
    }
    return { ok: true, cost: def.tier > 1 ? def.cost : 0 };
  }
  const dist = districtForBuilding(type);
  if (dist) return catActive(state, dist.cat) ? { ok: true, cost: 0 } : locked(`Opens when ${catLabel(dist.cat)} is budgeted`, `Budget ${catLabel(dist.cat)}`);
  if (type === 'nestegg') return (state.budget?.level || 1) >= 5 ? { ok: true, cost: 0 } : locked('Opens at Money master (Money path step 5)', 'Money master');
  if (type === 'monument') return canBuildMonument(state) ? { ok: true, cost: 0 } : locked('Opens when you list a debt at the Bank', 'List a debt');
  if (def.kind === 'civic') return locked('Already part of town', 'Built');
  if (state.level < def.level) return locked(`Opens at town level ${def.level}`, `Town level ${def.level}`);
  return { ok: true, cost: def.kind === 'biz' ? bizCost(state, type) : def.cost };
}

/* Trackers that live in a life-area building say which building opens them. */
export function trackerLock(state, type) {
  const def = byId[type];
  const r = reqFor(state, type);
  if (r.ok || r.built) return r;
  if (def.kind === 'section') return locked(`Opens with the ${def.name}`, `With the ${def.name}`);
  return r;
}
