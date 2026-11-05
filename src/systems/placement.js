import { byId } from '../data/catalog.js';
import { MAP, inBounds, isWater, key } from '../data/map.js';

/*
 * Placement rules:
 *  - Buildings sit on a grid and can't overlap water, roads or each other.
 *  - Every building except decorations must touch a road that connects back to the Town Hall.
 *  - Roads can go on any open land tile. A road can't be removed if a building would lose its connection.
 */
export function footprint(type, i, j, rot = 0) {
  const [w, d] = byId[type].size;
  const [fw, fd] = rot % 2 ? [d, w] : [w, d];
  const tiles = [];
  for (let a = 0; a < fw; a++) for (let b = 0; b < fd; b++) tiles.push([i + a, j + b]);
  return tiles;
}

export function occupancy(state, ignoreId = null) {
  const occ = new Map();
  for (const b of state.buildings) {
    if (b.id === ignoreId) continue;
    for (const [i, j] of footprint(b.type, b.i, b.j, b.rot)) occ.set(key(i, j), b.id);
  }
  return occ;
}

export function roadSet(state) { return new Set(state.roads); }

/* Road tiles reachable from the Town Hall. */
export function connectedRoads(state, roads = roadSet(state)) {
  const th = state.buildings.find((b) => b.type === 'townhall');
  const seen = new Set();
  if (!th) return seen;
  const queue = [];
  for (const [i, j] of perimeter(footprint('townhall', th.i, th.j, th.rot))) {
    const k = key(i, j);
    if (roads.has(k) && !seen.has(k)) { seen.add(k); queue.push([i, j]); }
  }
  while (queue.length) {
    const [i, j] = queue.shift();
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      const k = key(a, b);
      if (roads.has(k) && !seen.has(k)) { seen.add(k); queue.push([a, b]); }
    }
  }
  return seen;
}

export function perimeter(tiles) {
  const inside = new Set(tiles.map(([i, j]) => key(i, j)));
  const out = new Map();
  for (const [i, j] of tiles) for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
    const k = key(a, b);
    if (!inside.has(k)) out.set(k, [a, b]);
  }
  return [...out.values()];
}

export const needsRoad = (type) => byId[type].kind !== 'decor';

export function isConnected(state, type, i, j, rot, connected = connectedRoads(state)) {
  return perimeter(footprint(type, i, j, rot)).some(([a, b]) => connected.has(key(a, b)));
}

export function canPlace(state, type, i, j, rot = 0, ignoreId = null) {
  const occ = occupancy(state, ignoreId);
  const roads = roadSet(state);
  for (const [a, b] of footprint(type, i, j, rot)) {
    if (!inBounds(a, b)) return { ok: false, reason: 'Too close to the edge of the map' };
    if (isWater(a, b)) return { ok: false, reason: 'That spot is water' };
    if (roads.has(key(a, b))) return { ok: false, reason: 'A road is in the way' };
    if (occ.has(key(a, b))) return { ok: false, reason: 'Something is already here' };
  }
  if (needsRoad(type) && type !== 'townhall' && !isConnected(state, type, i, j, rot)) return { ok: false, reason: 'Needs a road next to it that leads to the Town Hall' };
  return { ok: true };
}

export function canPlaceRoad(state, i, j) {
  if (!inBounds(i, j)) return { ok: false, reason: 'Edge of the map' };
  if (isWater(i, j)) return { ok: false, reason: 'That spot is water' };
  if (state.roads.includes(key(i, j))) return { ok: false, reason: 'Already a road' };
  if (occupancy(state).has(key(i, j))) return { ok: false, reason: 'Something is already here' };
  return { ok: true };
}

export function canRemoveRoad(state, i, j) {
  const k = key(i, j);
  if (!state.roads.includes(k)) return { ok: false, reason: 'No road here' };
  const roads = roadSet(state); roads.delete(k);
  const connected = connectedRoads(state, roads);
  for (const b of state.buildings) {
    if (b.type === 'townhall' || !needsRoad(b.type)) continue;
    if (!isConnected(state, b.type, b.i, b.j, b.rot, connected)) return { ok: false, reason: `The ${byId[b.type].name} needs this road` };
  }
  return { ok: true };
}

/* A good first spot for a building near the road, spiralling out from a point. */
export function suggestSpot(state, type, near = { i: MAP / 2, j: MAP / 2 }) {
  let best = null;
  for (let r = 0; r < MAP && !best; r++) {
    for (let a = -r; a <= r && !best; a++) for (let b = -r; b <= r && !best; b++) {
      if (Math.max(Math.abs(a), Math.abs(b)) !== r) continue;
      const i = Math.round(near.i) + a, j = Math.round(near.j) + b;
      if (canPlace(state, type, i, j, 0).ok) best = { i, j };
    }
  }
  return best;
}
