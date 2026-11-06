import * as THREE from 'three';
import { M, mesh, seeded } from './palette.js';
import { bakeGroup } from './bake.js';
import { HALF } from '../data/map.js';

/*
 * Scenery outside the buildable map, so the town has natural edges:
 * a mountain range along the back (north and west, behind the camera's view), two lakes in the corners,
 * and low rolling hills. Nothing here can be built on; the forest ring keeps out of these spots.
 */
const EDGE = HALF + 3;
export const MOUNTAINS = (() => {
  const r = seeded(91), out = [];
  for (let k = 0; k < 13; k++) out.push({ x: -34 + k * 5.4 + (r() - 0.5) * 2, z: -EDGE - 6 - r() * 6, h: 4 + r() * 5.5, w: 3.2 + r() * 2.2 });
  for (let k = 0; k < 9; k++) out.push({ x: -EDGE - 6 - r() * 6, z: -24 + k * 5.6 + (r() - 0.5) * 2, h: 3.4 + r() * 4.5, w: 3 + r() * 2 });
  return out;
})();
export const LAKES = [{ x: -27.5, z: 26.5, r: 4.6 }, { x: 27, z: -28.5, r: 3.6 }];
export const HILLS = [{ x: 26, z: 27, r: 4.5, h: 1.2 }, { x: 4, z: 29.5, r: 5, h: 1 }, { x: 30, z: 6, r: 3.5, h: 0.9 }, { x: -30, z: 10, r: 4, h: 1.1 }, { x: -14, z: 31, r: 3.8, h: 0.8 }];

/* Keep the forest out of mountains and lakes. */
export function inScenery(x, z) {
  if (MOUNTAINS.some((m) => Math.hypot(x - m.x, z - m.z) < m.w * 0.95)) return true;
  if (LAKES.some((l) => Math.hypot(x - l.x, z - l.z) < l.r + 0.9)) return true;
  return false;
}

/* Lakes are painted into the ground texture (like the ponds), so they sit flat and cheap. */
export function paintLakes(g, toPx, S) {
  for (const l of LAKES) {
    const blob = (rad, color) => { g.fillStyle = color; g.beginPath(); for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.2) { const rr = rad * (1 + 0.12 * Math.sin(a * 3 + l.x) + 0.06 * Math.cos(a * 5)); const px = toPx(l.x + Math.cos(a) * rr), pz = toPx(l.z + Math.sin(a) * rr); if (a === 0) g.moveTo(px, pz); else g.lineTo(px, pz); } g.closePath(); g.fill(); };
    blob(l.r + 1.1, '#E2C98A'); blob(l.r + 0.6, '#EBD7A0'); blob(l.r, '#3E9FD6'); blob(l.r * 0.72, '#58B4E6'); blob(l.r * 0.35, '#7CC9F0');
  }
}

export function createScenery(scene) {
  const root = new THREE.Group();
  const rock = [M('#8C8079'), M('#7A7068'), M('#9A8E84')], snow = M('#FFFFFF'), grassy = M('#6FAE4A'), pine = M('#3F7D3A');
  const r = seeded(17);
  const g = new THREE.Group();
  for (const m of MOUNTAINS) {
    const seg = 6 + Math.floor(r() * 3);
    const body = mesh(new THREE.ConeGeometry(m.w, m.h, seg), rock[Math.floor(r() * 3)], false, true);
    body.position.set(m.x, m.h / 2 - 0.05, m.z); body.rotation.y = r() * 6; g.add(body);
    if (m.h > 5) { const capH = m.h * 0.28; const cap = mesh(new THREE.ConeGeometry(m.w * 0.28 * 1.02, capH, seg), snow, false, false); cap.position.set(m.x, m.h - capH / 2 - 0.04, m.z); cap.rotation.y = body.rotation.y; g.add(cap); }
    const skirt = mesh(new THREE.ConeGeometry(m.w * 1.25, m.h * 0.3, seg), grassy, false, true); skirt.position.set(m.x + 0.4, m.h * 0.15 - 0.05, m.z + 0.6); g.add(skirt);
    for (let k = 0; k < 3; k++) { const t = mesh(new THREE.ConeGeometry(0.35, 1.1, 6), pine, false, false); const a = r() * 6.28, d = m.w * (1.05 + r() * 0.3); t.position.set(m.x + Math.cos(a) * d, 0.5, m.z + Math.abs(Math.sin(a)) * d); g.add(t); }
  }
  for (const h of HILLS) { const hill = mesh(new THREE.SphereGeometry(h.r, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), grassy, false, true); hill.scale.y = h.h / h.r; hill.position.set(h.x, -0.02, h.z); g.add(hill); }
  /* a few reeds and rocks around the lakes */
  for (const l of LAKES) for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 + r(), d = l.r + 0.3 + r() * 0.4;
    const o = k % 3 ? mesh(new THREE.ConeGeometry(0.06, 0.5, 4), M('#5E8F3A'), false, false) : mesh(new THREE.DodecahedronGeometry(0.22, 0), rock[0], false, true);
    o.position.set(l.x + Math.cos(a) * d, k % 3 ? 0.25 : 0.1, l.z + Math.sin(a) * d); g.add(o);
  }
  root.add(bakeGroup(g));
  scene.add(root);
  return root;
}
