/* One open map. Tiles are 1×1 world units. No fog: every tile is visible from day one. */
export const MAP = 36;
export const HALF = MAP / 2;
export const tileCenter = (i, j) => [i - HALF + 0.5, j - HALF + 0.5];
export const tileOf = (x, z) => [Math.floor(x + HALF), Math.floor(z + HALF)];
export const inBounds = (i, j) => i >= 0 && j >= 0 && i < MAP && j < MAP;
export const key = (i, j) => `${i},${j}`;

/* A river along the east side and two ponds. Water can't be built on. */
export const riverX = (j) => 31.2 + 1.6 * Math.sin(j * 0.23 + 0.6);
export const PONDS = [{ i: 6.5, j: 7.5, r: 2.3 }, { i: 9.5, j: 28.5, r: 1.7 }];
export function isWater(i, j) {
  const cx = i + 0.5, cz = j + 0.5;
  if (Math.abs(cx - riverX(cz)) < 1.35) return true;
  for (const p of PONDS) if (Math.hypot(cx - p.i, cz - p.j) < p.r) return true;
  return false;
}
/*
 * Nature inside the buildable map, so the land has shape and you build around it:
 * a small peak in the north-east, a lake in the south, rocky hills in the north-west.
 * A town keeps the features that were clear when it first loaded (state.nature), so nothing lands on a building.
 */
export const INNER = [
  { id: 'peak', kind: 'mountain', label: 'Pine Peak', i: 26.5, j: 4.5, r: 2.7, h: 4.6 },
  { id: 'lake', kind: 'lake', label: 'Lake Glimmer', i: 16.5, j: 30, r: 2.5 },
  { id: 'rocks', kind: 'hill', label: 'Rocky Knoll', i: 12.5, j: 4.5, r: 1.9, h: 1.5 }
];
export const natureTiles = (f) => { const out = []; for (let i = Math.floor(f.i - f.r); i <= Math.ceil(f.i + f.r); i++) for (let j = Math.floor(f.j - f.r); j <= Math.ceil(f.j + f.r); j++) if (Math.hypot(i + 0.5 - f.i, j + 0.5 - f.j) < f.r && inBounds(i, j)) out.push([i, j]); return out; };
export const activeNature = (state) => INNER.filter((f) => (state?.nature || []).includes(f.id));
export function natureAt(state, i, j) {
  for (const f of activeNature(state)) if (Math.hypot(i + 0.5 - f.i, j + 0.5 - f.j) < f.r) return f;
  return null;
}
/* The railway runs north–south along the west edge. The station sits beside it, joined to Main Street by road. */
export const RAIL_I = 2;
export const isRail = (i, j) => i === RAIL_I;
export const STATION_AT = { i: 3, j: 17 };
export const stationRoad = () => { const r = []; for (let i = 5; i <= 10; i++) r.push([i, 18]); return r; };

export const TOWNHALL_AT = { i: 16, j: 15 };
/* Starter roads: one street in front of the Town Hall and one up its east side. */
export function starterRoads() {
  const r = [];
  for (let i = 11; i <= 24; i++) r.push([i, 18]);
  for (let j = 11; j <= 17; j++) r.push([19, j]);
  return r;
}
