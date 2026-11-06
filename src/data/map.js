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
