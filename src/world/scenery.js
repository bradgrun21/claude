import * as THREE from 'three';
import { M, mesh, seeded, mat } from './palette.js';
import { bakeGroup } from './bake.js';
import { HALF, riverX, RAIL_I, tileCenter, INNER } from '../data/map.js';

/*
 * Scenery that gives the land shape:
 *   - a mountain range along the back (north and west), kept on the island, with a gap where the river reaches the sea
 *   - the railway comes out of a tunnel in a northern mountain and goes into a tunnel in a southern one
 *   - two lakes and rolling hills outside the map
 *   - nature inside the buildable map (a small peak, a lake, rocky hills) that you build around (see data/map.js INNER)
 */
const LAND_EDGE = 35;
export const RAIL_X = tileCenter(RAIL_I, 0)[0];
export const RAIL_N = { x: RAIL_X, z: -30.5, w: 5.6, h: 7.2 };
export const RAIL_S = { x: RAIL_X, z: 30.6, w: 4.8, h: 4.4 };
export const PORTAL_N_Z = -25.4, PORTAL_S_Z = 26.2;
export const LAKES = [{ x: -28, z: 23, r: 4.2 }, { x: 26.5, z: -10, r: 3.4 }];
export const HILLS = [{ x: 26, z: 27, r: 4.5, h: 1.2 }, { x: 4, z: 29.5, r: 5, h: 1 }, { x: 30, z: 8, r: 3.5, h: 0.9 }, { x: -30, z: 6, r: 4, h: 1.1 }];
const riverWorldX = (z) => riverX(z + HALF) - HALF;

export const MOUNTAINS = (() => {
  const r = seeded(91), out = [RAIL_N, RAIL_S];
  const fits = (m) => Math.abs(m.x) + m.w <= LAND_EDGE && Math.abs(m.z) + m.w <= LAND_EDGE;
  const clear = (m) => Math.abs(m.x - riverWorldX(m.z)) > m.w + 2.2
    && Math.hypot(m.x - RAIL_N.x, m.z - RAIL_N.z) > m.w + RAIL_N.w * 0.6 && Math.hypot(m.x - RAIL_S.x, m.z - RAIL_S.z) > m.w + RAIL_S.w * 0.6
    && LAKES.every((l) => Math.hypot(m.x - l.x, m.z - l.z) > m.w + l.r + 0.5);
  const add = (m) => { const w = Math.min(m.w, LAND_EDGE - Math.max(Math.abs(m.x), Math.abs(m.z))); if (w < 2.4) return; const mm = { ...m, w, h: Math.min(m.h, w * 1.7) }; if (fits(mm) && clear(mm)) out.push(mm); };
  for (let k = 0; k < 14; k++) add({ x: -33 + k * 5 + (r() - 0.5) * 1.5, z: -29.5 - r() * 2.5, h: 4 + r() * 5, w: 3 + r() * 2 });
  for (let k = 0; k < 9; k++) add({ x: -29.5 - r() * 2.5, z: -22 + k * 5.2 + (r() - 0.5) * 1.5, h: 3.4 + r() * 4, w: 2.8 + r() * 1.8 });
  return out;
})();

/* Keep the forest out of mountains and lakes. */
export function inScenery(x, z) {
  if (MOUNTAINS.some((m) => Math.hypot(x - m.x, z - m.z) < m.w * 0.95)) return true;
  if (LAKES.some((l) => Math.hypot(x - l.x, z - l.z) < l.r + 0.9)) return true;
  return false;
}

/* Lakes outside the map are painted into the ground texture (like the ponds), so they sit flat and cheap. */
const blob = (g, toPx, cx, cz, rad, color, seed = 0) => { g.fillStyle = color; g.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) { const rr = rad * (1 + 0.12 * Math.sin(a * 3 + seed) + 0.06 * Math.cos(a * 5)); const px = toPx(cx + Math.cos(a) * rr), pz = toPx(cz + Math.sin(a) * rr); if (a === 0) g.moveTo(px, pz); else g.lineTo(px, pz); } g.closePath(); g.fill(); };
export function paintLakes(g, toPx) {
  for (const l of LAKES) { blob(g, toPx, l.x, l.z, l.r + 1.1, '#E2C98A', l.x); blob(g, toPx, l.x, l.z, l.r + 0.6, '#EBD7A0', l.x); blob(g, toPx, l.x, l.z, l.r, '#3E9FD6', l.x); blob(g, toPx, l.x, l.z, l.r * 0.72, '#58B4E6', l.x); blob(g, toPx, l.x, l.z, l.r * 0.35, '#7CC9F0', l.x); }
}

const ROCK = [M('#8C8079'), M('#7A7068'), M('#9A8E84')], SNOW = M('#FFFFFF'), GRASSY = M('#6FAE4A'), PINE = M('#3F7D3A'), REED = M('#5E8F3A');
function mountain(g, m, r, { snow = true } = {}) {
  const seg = 6 + Math.floor(r() * 3), rot = r() * 6;
  const body = mesh(new THREE.ConeGeometry(m.w, m.h, seg), ROCK[Math.floor(r() * 3)], false, true); body.position.set(m.x, m.h / 2 - 0.05, m.z); body.rotation.y = rot; g.add(body);
  if (snow && m.h > 4.6) { const capH = m.h * 0.28; const cap = mesh(new THREE.ConeGeometry(m.w * 0.28 * 1.02, capH, seg), SNOW, false, false); cap.position.set(m.x, m.h - capH / 2 - 0.04, m.z); cap.rotation.y = rot; g.add(cap); }
  const skirt = mesh(new THREE.ConeGeometry(m.w * 1.18, m.h * 0.3, seg), GRASSY, false, true); skirt.position.set(m.x, m.h * 0.15 - 0.05, m.z); g.add(skirt);
  for (let k = 0; k < 3; k++) { const t = mesh(new THREE.ConeGeometry(0.35, 1.1, 6), PINE, false, false); const a = r() * 6.28, d = m.w * (1.02 + r() * 0.2); t.position.set(m.x + Math.cos(a) * d, 0.5, m.z + Math.sin(a) * d); if (Math.abs(t.position.x) < LAND_EDGE && Math.abs(t.position.z) < LAND_EDGE && Math.abs(t.position.x - RAIL_X) > 0.9) g.add(t); }
}
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
/* A stone tunnel mouth facing along the track. */
function portal(g, x, z, facing) {
  const p = new THREE.Group();
  const stone = M('#A79C90'), dark = new THREE.MeshBasicMaterial({ color: '#1E1A18' });
  p.add(at(mesh(new THREE.BoxGeometry(0.28, 1.15, 0.5), stone), -0.72, 0.57, 0));
  p.add(at(mesh(new THREE.BoxGeometry(0.28, 1.15, 0.5), stone), 0.72, 0.57, 0));
  const arch = mesh(new THREE.CylinderGeometry(0.86, 0.86, 0.5, 14, 1, false, 0, Math.PI), stone); arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.y = 1.12; p.add(arch);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 1.12), dark); hole.position.set(0, 0.56, -0.05); p.add(hole);
  const holeTop = new THREE.Mesh(new THREE.CircleGeometry(0.58, 14, 0, Math.PI), dark); holeTop.position.set(0, 1.12, -0.05); p.add(holeTop);
  p.add(at(mesh(new THREE.BoxGeometry(1.9, 0.18, 0.56), stone), 0, 1.98, 0));
  p.position.set(x, 0, z);
  p.rotation.y = facing;
  g.add(p);
}

export function createScenery(scene, state) {
  const root = new THREE.Group();
  const r = seeded(17);
  const g = new THREE.Group();
  for (const m of MOUNTAINS) mountain(g, m, r, { snow: m !== RAIL_S });
  portal(g, RAIL_X, PORTAL_N_Z, 0);
  portal(g, RAIL_X, PORTAL_S_Z, Math.PI);
  for (const h of HILLS) { const hill = mesh(new THREE.SphereGeometry(h.r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), GRASSY, false, true); hill.scale.y = h.h / h.r; hill.position.set(h.x, -0.02, h.z); g.add(hill); }
  const reeds = (cx, cz, rad, n) => { for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r(), d = rad + 0.2 + r() * 0.35; const o = k % 3 ? mesh(new THREE.ConeGeometry(0.06, 0.5, 4), REED, false, false) : mesh(new THREE.DodecahedronGeometry(0.22, 0), ROCK[0], false, true); o.position.set(cx + Math.cos(a) * d, k % 3 ? 0.25 : 0.1, cz + Math.sin(a) * d); g.add(o); } };
  for (const l of LAKES) reeds(l.x, l.z, l.r, 10);

  /* Nature inside the map (only the features this town has). */
  const active = new Set(state?.nature || []);
  for (const f of INNER) {
    if (!active.has(f.id)) continue;
    const [x, z] = [f.i - HALF, f.j - HALF];
    if (f.kind === 'mountain') {
      mountain(g, { x, z, w: f.r + 0.15, h: f.h }, r);
      for (let k = 0; k < 4; k++) { const rk = mesh(new THREE.DodecahedronGeometry(0.2 + r() * 0.15, 0), ROCK[k % 3], false, true); const a = r() * 6.28; rk.position.set(x + Math.cos(a) * (f.r - 0.2), 0.1, z + Math.sin(a) * (f.r - 0.2)); g.add(rk); }
    } else if (f.kind === 'hill') {
      const hill = mesh(new THREE.SphereGeometry(f.r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), GRASSY, false, true); hill.scale.y = f.h / f.r; hill.position.set(x, -0.02, z); g.add(hill);
      for (let k = 0; k < 6; k++) { const rk = mesh(new THREE.DodecahedronGeometry(0.22 + r() * 0.25, 0), ROCK[k % 3], false, true); const a = r() * 6.28, d = r() * f.r * 0.7; rk.position.set(x + Math.cos(a) * d, f.h * (1 - (d / f.r) ** 2) * 0.9, z + Math.sin(a) * d); g.add(rk); }
      for (let k = 0; k < 3; k++) { const t = mesh(new THREE.ConeGeometry(0.3, 0.9, 6), PINE, false, false); const a = r() * 6.28; t.position.set(x + Math.cos(a) * f.r * 0.85, 0.45, z + Math.sin(a) * f.r * 0.85); g.add(t); }
    }
  }
  root.add(bakeGroup(g));
  /* The inner lake is a real water surface (sand rim + water), not painted, since not every town has it. */
  for (const f of INNER) {
    if (!active.has(f.id) || f.kind !== 'lake') continue;
    const [x, z] = [f.i - HALF, f.j - HALF];
    const shape = (rad, y, m) => { const sh = new THREE.Shape(); for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; const rr = rad * (1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.cos(a * 5)); if (k) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } const o = new THREE.Mesh(new THREE.ShapeGeometry(sh), m); o.rotation.x = -Math.PI / 2; o.position.set(x, y, z); o.receiveShadow = true; root.add(o); };
    shape(f.r + 0.45, 0.012, M('#E6CF95'));
    shape(f.r, 0.018, mat.pond);
    shape(f.r * 0.55, 0.022, M('#7CC9F0'));
    const rg = new THREE.Group(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.3, d = f.r + 0.15; const o = mesh(new THREE.ConeGeometry(0.05, 0.42, 4), REED, false, false); o.position.set(x + Math.cos(a) * d, 0.21, z + Math.sin(a) * d); rg.add(o); } root.add(bakeGroup(rg));
  }
  scene.add(root);
  return root;
}
