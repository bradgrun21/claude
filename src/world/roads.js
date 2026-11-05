import * as THREE from 'three';
import { M, mat, mesh } from './palette.js';
import { partsToGroup, bakeParts } from './bake.js';
import { tileCenter } from '../data/map.js';

/* Roads auto-join: each tile draws asphalt, a sidewalk on every side without a neighbor, and lane dashes on straights. */
const asphalt = M('#6E7681', { roughness: 0.95 });
const curb = M('#E4DDD0');
const dash = M('#FFFFFF');
const tileGeo = new THREE.BoxGeometry(1, 0.03, 1);
const sideX = new THREE.BoxGeometry(1, 0.045, 0.14), sideZ = new THREE.BoxGeometry(0.14, 0.045, 1);
const cornerGeo = new THREE.BoxGeometry(0.14, 0.045, 0.14);
const dashX = new THREE.BoxGeometry(0.28, 0.005, 0.05), dashZ = new THREE.BoxGeometry(0.05, 0.005, 0.28);

export function createRoads(scene) {
  let group = null;
  function rebuild(roadKeys) {
    if (group) { scene.remove(group); group.traverse((o) => o.geometry && o.geometry.dispose()); }
    const set = new Set(roadKeys);
    const src = new THREE.Group();
    for (const k of roadKeys) {
      const [i, j] = k.split(',').map(Number);
      const [x, z] = tileCenter(i, j);
      const n = { e: set.has(`${i + 1},${j}`), w: set.has(`${i - 1},${j}`), s: set.has(`${i},${j + 1}`), nn: set.has(`${i},${j - 1}`) };
      const t = mesh(tileGeo, asphalt, false, true); t.position.set(x, 0.015, z); src.add(t);
      if (!n.nn) { const c = mesh(sideX, curb, false, true); c.position.set(x, 0.022, z - 0.43); src.add(c); }
      if (!n.s) { const c = mesh(sideX, curb, false, true); c.position.set(x, 0.022, z + 0.43); src.add(c); }
      if (!n.w) { const c = mesh(sideZ, curb, false, true); c.position.set(x - 0.43, 0.022, z); src.add(c); }
      if (!n.e) { const c = mesh(sideZ, curb, false, true); c.position.set(x + 0.43, 0.022, z); src.add(c); }
      /* corner nubs where two roads meet, so sidewalks look continuous */
      for (const [sx, sz, a, b] of [[1, 1, n.e, n.s], [-1, 1, n.w, n.s], [1, -1, n.e, n.nn], [-1, -1, n.w, n.nn]]) if (a && b) { const c = mesh(cornerGeo, curb, false, true); c.position.set(x + sx * 0.43, 0.022, z + sz * 0.43); src.add(c); }
      const horiz = (n.e || n.w) && !n.s && !n.nn, vert = (n.s || n.nn) && !n.e && !n.w;
      if (horiz) { const d = mesh(dashX, dash, false, true); d.position.set(x, 0.032, z); src.add(d); }
      else if (vert) { const d = mesh(dashZ, dash, false, true); d.position.set(x, 0.032, z); src.add(d); }
      else if (!n.e && !n.w && !n.s && !n.nn) { const d = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.006, 12), mat.walk, false, true); d.position.set(x, 0.032, z); src.add(d); }
    }
    group = partsToGroup(bakeParts(src));
    scene.add(group);
  }
  return { rebuild };
}
