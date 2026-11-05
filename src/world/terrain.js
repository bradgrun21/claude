import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAP, HALF, PONDS, riverX, isWater, inBounds, key, TOWNHALL_AT, tileCenter } from '../data/map.js';
import { M, mat, mesh, seeded } from './palette.js';
import { bakeParts, InstancedSet, swayMaterial } from './bake.js';
import * as models from './models.js';

/*
 * One open, painted map: bright grass, sandy clearings, a river along the east side, two ponds,
 * a forest ring around the edge, and trees/bushes/rocks scattered across the land.
 * Nothing is hidden. Scattered nature quietly clears when you build or lay a road on its tile.
 */
export const LAND = 72;
const PX = 1536;
const S = PX / LAND;
const toPx = (x) => (x + LAND / 2) * S;

function paintGround() {
  const c = document.createElement('canvas');
  c.width = c.height = PX;
  const g = c.getContext('2d');
  const r = seeded(11);
  g.fillStyle = '#74C445'; g.fillRect(0, 0, PX, PX);
  /* soft light/dark grass patches */
  for (let k = 0; k < 520; k++) {
    const x = r() * PX, y = r() * PX, rad = (0.8 + r() * 3.2) * S;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = r() < 0.5 ? '146,214,96' : '104,182,64';
    grd.addColorStop(0, `rgba(${col},0.45)`); grd.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  /* sandy clearings near the forest edge */
  const blob = (x, y, rad, color) => { g.fillStyle = color; g.beginPath(); for (let a = 0; a <= 20; a++) { const t = (a / 20) * Math.PI * 2; const rr = rad * (0.78 + 0.22 * Math.sin(t * 3 + x)); g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr); } g.fill(); };
  for (const [i, j, rad] of [[3, 30, 2.2], [27, 4, 2.6], [2, 16, 1.6], [24, 33, 2], [12, 2, 1.8]]) { const [x, z] = tileCenter(i, j); blob(toPx(x), toPx(z), rad * S, '#E6CF92'); blob(toPx(x), toPx(z), rad * S * 0.7, '#EDD9A3'); }
  /* river with sandy banks, running past both map edges */
  const river = (width, color) => { g.strokeStyle = color; g.lineWidth = width * S; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); for (let z = -LAND / 2; z <= LAND / 2; z += 0.5) { const j = z + HALF; const x = riverX(j) - HALF; const px = toPx(x), pz = toPx(z); if (z === -LAND / 2) g.moveTo(px, pz); else g.lineTo(px, pz); } g.stroke(); };
  river(4.4, '#E2C98A'); river(3.4, '#EBD7A0'); river(2.75, '#3E9FD6'); river(1.7, '#58B4E6'); river(0.6, '#7CC9F0');
  for (const p of PONDS) {
    const [x, z] = [p.i - HALF, p.j - HALF];
    for (const [rr, col] of [[p.r + 0.6, '#E2C98A'], [p.r + 0.3, '#EBD7A0'], [p.r, '#3E9FD6'], [p.r * 0.7, '#58B4E6'], [p.r * 0.35, '#7CC9F0']]) { g.fillStyle = col; g.beginPath(); g.arc(toPx(x), toPx(z), rr * S, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 4; k++) { const a = r() * 6.28, d = p.r * (0.3 + r() * 0.5); g.fillStyle = '#5FA145'; g.beginPath(); g.arc(toPx(x + Math.cos(a) * d), toPx(z + Math.sin(a) * d), 0.22 * S, 0, Math.PI * 2); g.fill(); g.fillStyle = '#F7A9C4'; g.beginPath(); g.arc(toPx(x + Math.cos(a) * d) + 3, toPx(z + Math.sin(a) * d) - 2, 0.07 * S, 0, Math.PI * 2); g.fill(); }
  }
  /* tiny flowers in the grass */
  const fc = ['#FFFFFF', '#FFD45E', '#F28CA0', '#C9A0F0'];
  for (let k = 0; k < 1600; k++) { const x = r() * PX, y = r() * PX; const wx = x / S - LAND / 2, wz = y / S - LAND / 2; const [ti, tj] = [Math.floor(wx + HALF), Math.floor(wz + HALF)]; if (inBounds(ti, tj) && isWater(ti, tj)) continue; g.fillStyle = fc[k % 4]; g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createTerrain(scene, renderer) {
  const root = new THREE.Group(); scene.add(root);
  const tex = paintGround();
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const top = new THREE.Mesh(new THREE.PlaneGeometry(LAND, LAND), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }));
  top.rotation.x = -Math.PI / 2; top.receiveShadow = true; root.add(top);
  const slab = mesh(new RoundedBoxGeometry(LAND, 1.4, LAND, 2, 0.4), mat.dirt, false, false); slab.position.y = -0.71; root.add(slab);

  /* Build grid, shown only while placing things. */
  const pts = [];
  for (let k = 0; k <= MAP; k++) { const a = k - HALF; pts.push(-HALF, 0.015, a, HALF, 0.015, a, a, 0.015, -HALF, a, 0.015, HALF); }
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.22, depthWrite: false }));
  grid.visible = false; root.add(grid);
  const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(MAP, 0.001, MAP)), new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5 }));
  border.position.y = 0.016; border.visible = false; root.add(border);

  /* Nature (instanced) */
  const set = new InstancedSet(root);
  const kinds = [];
  for (let k = 0; k < 4; k++) { set.define(`t${k}`, bakeParts(models.tree('round', mat.leaf[k], mat.leaf[(k + 1) % 4])).map((p) => ({ ...p, material: swayMaterial(p.material) }))); kinds.push(`t${k}`); }
  set.define('pine', bakeParts(models.tree('pine')).map((p) => ({ ...p, material: swayMaterial(p.material) })));
  const bush = new THREE.Group();
  for (const [x, y, z, s] of [[0, 0.08, 0, 0.13], [0.1, 0.06, 0.04, 0.09], [-0.09, 0.06, -0.03, 0.1]]) { const b = mesh(new THREE.IcosahedronGeometry(s, 0), mat.leaf[1]); b.position.set(x, y, z); bush.add(b); }
  set.define('bush', bakeParts(bush));
  const rock = new THREE.Group();
  for (const [x, z, s] of [[0, 0, 0.16], [0.14, 0.06, 0.09]]) { const b = mesh(new THREE.DodecahedronGeometry(s, 0), M('#A8A29A')); b.position.set(x, s * 0.5, z); b.scale.y = 0.7; rock.add(b); }
  set.define('rock', bakeParts(rock));

  const r = seeded(29);
  const items = [];
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const add = (kind, x, z, s, tile) => {
    const it = { kind, x, z, s, rot: r() * 6.28, tile, shown: true };
    it.m = new THREE.Matrix4().compose(v.set(x, 0, z), q.setFromAxisAngle(up, it.rot), sc.set(s, s, s));
    it.id = set.add(kind, it.m);
    items.push(it);
  };
  const thc = tileCenter(TOWNHALL_AT.i + 1, TOWNHALL_AT.j + 1);
  /* forest ring just outside the buildable map */
  for (let k = 0; k < 900; k++) {
    const x = (r() - 0.5) * 56, z = (r() - 0.5) * 56;
    if (Math.abs(x) < HALF + 0.6 && Math.abs(z) < HALF + 0.6) continue;
    const j = z + HALF;
    if (Math.abs(x + HALF - riverX(j)) < 2.2) continue;
    add(r() < 0.35 ? 'pine' : kinds[Math.floor(r() * 4)], x, z, 0.9 + r() * 0.7, null);
  }
  /* scattered nature across the open land (clusters), away from the town center */
  for (let c = 0; c < 44; c++) {
    const ci = r() * MAP, cj = r() * MAP;
    if (Math.hypot(ci - thc[0] - HALF, cj - thc[1] - HALF) < 8) continue;
    const n = 4 + Math.floor(r() * 7);
    for (let k = 0; k < n; k++) {
      const i = Math.floor(ci + (r() - 0.5) * 4), j = Math.floor(cj + (r() - 0.5) * 4);
      if (!inBounds(i, j) || isWater(i, j)) continue;
      const [x, z] = tileCenter(i, j);
      const roll = r();
      add(roll < 0.62 ? (r() < 0.3 ? 'pine' : kinds[Math.floor(r() * 4)]) : roll < 0.88 ? 'bush' : 'rock', x + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.5, roll < 0.62 ? 0.85 + r() * 0.5 : 0.9 + r() * 0.6, key(i, j));
    }
  }
  const hide = new THREE.Matrix4().makeScale(0.0001, 0.0001, 0.0001);
  function sync(blocked) {
    for (const it of items) {
      if (!it.tile) continue;
      const show = !blocked.has(it.tile);
      if (show !== it.shown) { it.shown = show; set.setMatrix(it.id, show ? it.m : hide); }
    }
  }
  return {
    root, top, sync,
    showGrid(on) { grid.visible = on; border.visible = on; }
  };
}
