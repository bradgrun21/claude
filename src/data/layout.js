/* Tile layout (pure data — no three.js here so tests and state can use it). Each district is 8×8 tiles. */
export const SIZE = 8;
export const GAP = 0.7;
export const DISTRICTS = {
  starter: { a: 1, b: 1, name: 'Starter' },
  riverside: { a: 1, b: 0, name: 'Riverside' },
  bridgeview: { a: 0, b: 1, name: 'Bridgeview' },
  hillside: { a: 0, b: 0, name: 'Hillside' }
};
for (const d of Object.values(DISTRICTS)) {
  d.cx = (d.a - 0.5) * (SIZE + GAP);
  d.cz = (d.b - 0.5) * (SIZE + GAP);
}
export const tileXZ = (dkey, x, z) => [DISTRICTS[dkey].cx + x - 3.5, DISTRICTS[dkey].cz + z - 3.5];

export const isStarterRoad = (x, z) => x === 4 || z === 3;

const R = Math.PI;
const rotFor = (x, z) => (z === 4 ? R : z === 2 ? 0 : x === 3 ? R / 2 : x === 5 ? -R / 2 : 0);
export const STARTER_HOUSES = [[0, 0], [1, 0], [3, 0], [7, 1], [5, 2], [7, 2], [3, 4], [0, 6], [2, 6], [3, 7], [7, 4], [5, 6], [6, 7]].map(([x, z], i) => ({ x, z, rot: rotFor(x, z), variant: i % 5 }));
export const FAMILY_HOME = { x: 1, z: 5, rot: Math.PI };

export const SPECIAL_TILES = {
  chapel: [1, 1], bank: [5, 0], grocery: [6, 0], diner: [6, 1], townhall: [3, 2],
  tower: [7, 6], board: [2, 2], garden: [2, 5], clock: [3, 6]
};
export const PARK_CENTER = [5.5, 4.5];

export const TREE_TILES = [[2, 0], [7, 0], [0, 1], [3, 1], [5, 1], [0, 2], [0, 5], [1, 6], [0, 7], [2, 7], [6, 6], [5, 7], [7, 7]];

export const LOTS = {
  starter: [[2, 1], [2, 4], [3, 5], [1, 7], [7, 5], [0, 4], [6, 2]],
  riverside: [[2, 5], [4, 6], [5, 4], [3, 2], [1, 1], [6, 1], [1, 4], [6, 6]],
  bridgeview: [[2, 5], [4, 6], [5, 4], [3, 2], [1, 1], [6, 1], [1, 4], [6, 6]],
  hillside: [[2, 5], [4, 6], [5, 4], [3, 2], [1, 1], [6, 1], [1, 4], [6, 6]]
};
