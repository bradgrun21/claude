import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, mat, mesh, rand, pick } from './palette.js';

/* Code-made models (the fallback look, and the unique town buildings). Ported from the prototype. */

export function prism(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  geo.translate(0, 0, -d / 2);
  return geo;
}
const winGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
function windowsOn(g, w, d, y, faceZ = true, faceX = true) {
  if (faceZ) for (const x of [-w * 0.27, w * 0.27]) { const m = mesh(winGeo, mat.win, false); m.position.set(x, y, d / 2 + 0.01); g.add(m); }
  if (faceX) { const m = mesh(winGeo, mat.win, false); m.rotation.y = Math.PI / 2; m.position.set(w / 2 + 0.01, y, 0); g.add(m); }
}
export const HOUSE_FH = 0.36;
export function house({ roof = pick(mat.roofs), wall = pick(mat.walls), floors = 1, w = 0.6, d = 0.6, big = false } = {}) {
  const g = new THREE.Group();
  const bh = HOUSE_FH * floors + 0.08;
  const body = mesh(new THREE.BoxGeometry(w, bh, d), wall); body.position.y = bh / 2; g.add(body);
  const r = mesh(prism(w + 0.12, big ? 0.36 : 0.3, d + 0.1), roof); r.position.y = bh; g.add(r);
  const door = mesh(new THREE.BoxGeometry(0.13, 0.22, 0.03), mat.door, false); door.position.set(0, 0.11, d / 2 + 0.01); g.add(door);
  for (let f = 0; f < floors; f++) windowsOn(g, w, d, 0.24 + f * HOUSE_FH + (f ? 0.06 : 0), f > 0, true);
  if (floors === 1) { const m = mesh(winGeo, mat.win, false); m.position.set(w * 0.28, 0.24, d / 2 + 0.01); g.add(m); }
  const ch = mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), mat.rock); ch.position.set(w * 0.22, bh + 0.16, -d * 0.18); g.add(ch);
  const step = mesh(new THREE.BoxGeometry(0.22, 0.03, 0.08), mat.walk, false); step.position.set(0, 0.015, d / 2 + 0.05); g.add(step);
  g.userData.chimney = new THREE.Vector3(w * 0.22, bh + 0.3, -d * 0.18);
  return g;
}
export function shop(awn) {
  const g = new THREE.Group();
  const w = 0.82, d = 0.66, h = 0.44;
  const body = mesh(new THREE.BoxGeometry(w, h, d), mat.walls[3]); body.position.y = h / 2; g.add(body);
  const top = mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), mat.walls[2]); top.position.y = h + 0.03; g.add(top);
  const glass = mesh(new THREE.BoxGeometry(0.6, 0.15, 0.02), mat.win, false); glass.position.set(0, 0.15, d / 2 + 0.01); g.add(glass);
  const sign = mesh(new THREE.BoxGeometry(0.44, 0.1, 0.03), awn); sign.position.set(0, h + 0.1, d / 2 - 0.04); g.add(sign);
  for (let i = 0; i < 6; i++) {
    const s = mesh(new THREE.BoxGeometry(w / 6, 0.02, 0.24), i % 2 ? mat.white : awn);
    s.position.set(-w / 2 + (w / 6) * (i + 0.5), 0.33, d / 2 + 0.1); s.rotation.x = 0.42; g.add(s);
  }
  return g;
}
export function chapel() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.56, 0.5, 0.8), mat.white); body.position.y = 0.25; g.add(body);
  const roof = mesh(prism(0.68, 0.34, 0.86), mat.navy); roof.position.y = 0.5; g.add(roof);
  const tower = mesh(new THREE.BoxGeometry(0.24, 0.86, 0.24), mat.white); tower.position.set(0, 0.43, 0.36); g.add(tower);
  const spire = mesh(new THREE.ConeGeometry(0.2, 0.42, 4), mat.navy); spire.rotation.y = Math.PI / 4; spire.position.set(0, 1.07, 0.36); g.add(spire);
  const cv = mesh(new THREE.BoxGeometry(0.025, 0.16, 0.025), mat.gold, false); cv.position.set(0, 1.36, 0.36); g.add(cv);
  const chz = mesh(new THREE.BoxGeometry(0.09, 0.025, 0.025), mat.gold, false); chz.position.set(0, 1.39, 0.36); g.add(chz);
  const door = mesh(new THREE.BoxGeometry(0.12, 0.2, 0.03), mat.door, false); door.position.set(0, 0.1, 0.49); g.add(door);
  const wg = new THREE.BoxGeometry(0.02, 0.18, 0.09);
  for (const z of [-0.22, 0.02]) { const m = mesh(wg, mat.win, false); m.position.set(0.29, 0.28, z); g.add(m); }
  const rw = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), mat.win, false); rw.position.set(0, 0.6, 0.49); g.add(rw);
  return g;
}
export function waterTowerShell() {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) { const leg = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.92, 6), mat.metal); leg.position.set(x, 0.46, z); g.add(leg); }
  const brace = mesh(new THREE.BoxGeometry(0.4, 0.025, 0.4), mat.metal); brace.position.y = 0.42; g.add(brace);
  const floor = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 20), mat.walls[2]); floor.position.y = 0.92; g.add(floor);
  const ring = mesh(new THREE.TorusGeometry(0.315, 0.018, 6, 24), mat.gold, false); ring.rotation.x = Math.PI / 2; ring.position.y = 1.38; g.add(ring);
  const roof = mesh(new THREE.ConeGeometry(0.35, 0.24, 20), mat.roofs[0]); roof.position.y = 1.5; g.add(roof);
  return g;
}
export function tree(kind = rand() < 0.3 ? 'pine' : 'round', leafA = pick(mat.leaf), leafB = pick(mat.leaf)) {
  const g = new THREE.Group();
  const t = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.22, 5), mat.trunk); t.position.y = 0.11; g.add(t);
  if (kind === 'pine') {
    const c1 = mesh(new THREE.ConeGeometry(0.2, 0.36, 6), mat.leaf[3]); c1.position.y = 0.36; g.add(c1);
    const c2 = mesh(new THREE.ConeGeometry(0.15, 0.3, 6), mat.leaf[0]); c2.position.y = 0.55; g.add(c2);
  } else {
    const b1 = mesh(new THREE.IcosahedronGeometry(0.2, 0), leafA); b1.position.y = 0.36; b1.rotation.set(rand(), rand(), rand()); g.add(b1);
    const b2 = mesh(new THREE.IcosahedronGeometry(0.13, 0), leafB); b2.position.set(0.08, 0.5, -0.04); g.add(b2);
  }
  return g;
}
export function lamp() {
  const g = new THREE.Group();
  const p = mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.48, 5), mat.navy); p.position.y = 0.24; g.add(p);
  const b = mesh(new THREE.SphereGeometry(0.045, 8, 6), mat.lamp, false, false); b.position.y = 0.5; g.add(b);
  return g;
}
export function bench() {
  const g = new THREE.Group();
  const s = mesh(new THREE.BoxGeometry(0.3, 0.03, 0.1), mat.door); s.position.y = 0.09; g.add(s);
  const bk = mesh(new THREE.BoxGeometry(0.3, 0.09, 0.02), mat.door); bk.position.set(0, 0.15, -0.05); g.add(bk);
  for (const x of [-0.12, 0.12]) { const l = mesh(new THREE.BoxGeometry(0.02, 0.09, 0.08), mat.navy); l.position.set(x, 0.045, 0); g.add(l); }
  return g;
}
const flowerGeo = new THREE.IcosahedronGeometry(0.035, 0);
export function flowers(n = 7, spread = 0.32) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) { const f = mesh(flowerGeo, pick(mat.flower), false); f.position.set((rand() - 0.5) * spread * 2, 0.04, (rand() - 0.5) * spread * 2); g.add(f); }
  return g;
}
export function fence(w, d, m = mat.white) {
  const g = new THREE.Group();
  const postG = new THREE.BoxGeometry(0.025, 0.12, 0.025);
  const railX = new THREE.BoxGeometry(w, 0.02, 0.015), railZ = new THREE.BoxGeometry(0.015, 0.02, d);
  for (const z of [-d / 2, d / 2]) { const r = mesh(railX, m); r.position.set(0, 0.08, z); g.add(r); }
  for (const x of [-w / 2, w / 2]) { const r = mesh(railZ, m); r.position.set(x, 0.08, 0); g.add(r); }
  for (let i = 0; i <= 6; i++) for (const z of [-d / 2, d / 2]) { const p = mesh(postG, m); p.position.set(-w / 2 + (w / 6) * i, 0.06, z); g.add(p); }
  return g;
}
export function car(color) {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(0.36, 0.1, 0.19, 2, 0.03), M(color, { roughness: 0.45 })); body.position.y = 0.08; g.add(body);
  const cab = mesh(new RoundedBoxGeometry(0.19, 0.08, 0.17, 2, 0.03), M('#D8ECF5', { roughness: 0.2 })); cab.position.set(-0.02, 0.165, 0); g.add(cab);
  const wg = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10); wg.rotateX(Math.PI / 2);
  for (const x of [-0.11, 0.11]) for (const z of [-0.095, 0.095]) { const w = mesh(wg, mat.navy, false); w.position.set(x, 0.04, z); g.add(w); }
  const hl = mesh(new THREE.BoxGeometry(0.01, 0.025, 0.14), mat.lamp, false, false); hl.position.set(0.185, 0.09, 0); g.add(hl);
  return g;
}
const skin = M('#E9B48F');
export function person(color, hair) {
  const g = new THREE.Group();
  const b = mesh(new THREE.CapsuleGeometry(0.03, 0.06, 3, 6), M(color)); b.position.y = 0.07; g.add(b);
  const h = mesh(new THREE.SphereGeometry(0.028, 8, 6), skin); h.position.y = 0.15; g.add(h);
  if (hair) { const hm = mesh(new THREE.SphereGeometry(0.031, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(hair)); hm.position.y = 0.155; g.add(hm); }
  return g;
}
export function dog(color) {
  const g = new THREE.Group();
  const dm = M(color), dark = M('#3A2E24');
  const body = mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), dm); body.position.y = 0.06; g.add(body);
  const head = mesh(new THREE.BoxGeometry(0.05, 0.05, 0.045), dm); head.position.set(0.075, 0.09, 0); g.add(head);
  const snout = mesh(new THREE.BoxGeometry(0.025, 0.02, 0.025), dark); snout.position.set(0.105, 0.085, 0); g.add(snout);
  for (const z of [-0.016, 0.016]) { const ear = mesh(new THREE.BoxGeometry(0.014, 0.025, 0.012), dark); ear.position.set(0.07, 0.122, z); g.add(ear); }
  for (const [x, z] of [[-0.04, -0.018], [0.04, -0.018], [-0.04, 0.018], [0.04, 0.018]]) { const l = mesh(new THREE.BoxGeometry(0.016, 0.04, 0.016), dm); l.position.set(x, 0.02, z); g.add(l); }
  const tail = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), dm); tail.position.set(-0.075, 0.085, 0); tail.rotation.z = 0.6; g.add(tail);
  g.userData.tail = tail;
  g.scale.setScalar(1.4);
  return g;
}
function columns(g, n, w, z, h, r = 0.03) {
  for (let i = 0; i < n; i++) { const c = mesh(new THREE.CylinderGeometry(r, r, h, 8), mat.white); c.position.set(-w / 2 + (w / (n - 1)) * i, h / 2 + 0.04, z); g.add(c); }
}
export function bank() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(0.86, 0.06, 0.8), mat.walk); base.position.y = 0.03; g.add(base);
  const body = mesh(new THREE.BoxGeometry(0.72, 0.5, 0.56), M('#EFE7D8')); body.position.set(0, 0.3, -0.08); g.add(body);
  columns(g, 4, 0.62, 0.28, 0.46);
  const ent = mesh(new THREE.BoxGeometry(0.78, 0.07, 0.72), M('#E4DACA')); ent.position.y = 0.55; g.add(ent);
  const ped = mesh(prism(0.8, 0.2, 0.72), M('#E4DACA')); ped.position.y = 0.585; g.add(ped);
  const coin = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 18), mat.gold); coin.rotation.x = Math.PI / 2; coin.position.set(0, 0.66, 0.37); g.add(coin);
  const door = mesh(new THREE.BoxGeometry(0.16, 0.26, 0.02), mat.navy, false); door.position.set(0, 0.17, 0.2); g.add(door);
  return g;
}
export function townHall() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.82), mat.walk); base.position.y = 0.03; g.add(base);
  const body = mesh(new THREE.BoxGeometry(0.8, 0.52, 0.6), mat.white); body.position.set(0, 0.32, -0.06); g.add(body);
  columns(g, 5, 0.7, 0.3, 0.46, 0.026);
  const roof = mesh(new THREE.BoxGeometry(0.86, 0.06, 0.74), M('#E9E3D6')); roof.position.y = 0.6; g.add(roof);
  const drum = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), mat.white); drum.position.y = 0.69; g.add(drum);
  const dome = mesh(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#4F8E6A', { flatShading: false, roughness: 0.6 })); dome.position.y = 0.75; g.add(dome);
  const pole = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), mat.navy, false); pole.position.y = 1.05; g.add(pole);
  const flag = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.008), mat.gold, false); flag.position.set(0.065, 1.15, 0); g.add(flag);
  const door = mesh(new THREE.BoxGeometry(0.15, 0.24, 0.02), mat.door, false); door.position.set(0, 0.16, 0.25); g.add(door);
  for (const x of [-0.27, 0.27]) { const w = mesh(new THREE.BoxGeometry(0.11, 0.14, 0.02), mat.win, false); w.position.set(x, 0.32, 0.25); g.add(w); }
  return g;
}
export function grocery() {
  const g = shop(M('#4CAF6A'));
  ['#E8643F', '#F2B54A', '#8DC86A', '#F28CA0'].forEach((c, i) => {
    const crate = mesh(new THREE.BoxGeometry(0.14, 0.07, 0.1), mat.door); crate.position.set(-0.27 + i * 0.18, 0.035, 0.47); g.add(crate);
    const fruit = mesh(new THREE.BoxGeometry(0.12, 0.035, 0.08), M(c)); fruit.position.set(-0.27 + i * 0.18, 0.085, 0.47); g.add(fruit);
  });
  return g;
}
export function diner() {
  const g = shop(M('#E8643F'));
  const sign = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), M('#FFFDF7')); sign.rotation.x = Math.PI / 2; sign.position.set(0, 0.62, 0.2); g.add(sign);
  const ring = mesh(new THREE.TorusGeometry(0.13, 0.015, 6, 20), M('#E8643F')); ring.position.set(0, 0.62, 0.22); g.add(ring);
  const post = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 5), mat.navy); post.position.set(0, 0.52, 0.2); g.add(post);
  const table = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12), mat.white); table.position.set(0.3, 0.12, 0.5); g.add(table);
  const leg = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.11, 5), mat.navy); leg.position.set(0.3, 0.055, 0.5); g.add(leg);
  const umb = mesh(new THREE.ConeGeometry(0.16, 0.08, 10), M('#F2B54A')); umb.position.set(0.3, 0.3, 0.5); g.add(umb);
  const up = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 4), mat.navy); up.position.set(0.3, 0.2, 0.5); g.add(up);
  return g;
}

/* ---------- New in this version ---------- */

/* Wooden order board next to Town Hall. Notes are separate so they can show the number of orders. */
export function orderBoard() {
  const g = new THREE.Group();
  for (const x of [-0.26, 0.26]) { const p = mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), mat.woodDark); p.position.set(x, 0.31, 0); g.add(p); }
  const board = mesh(new THREE.BoxGeometry(0.62, 0.34, 0.04), mat.wood); board.position.set(0, 0.42, 0); g.add(board);
  const frame = mesh(new THREE.BoxGeometry(0.66, 0.04, 0.06), mat.woodDark); frame.position.set(0, 0.6, 0); g.add(frame);
  const cap = mesh(prism(0.74, 0.12, 0.16), M('#4F8E6A')); cap.position.set(0, 0.62, 0); g.add(cap);
  const notes = [];
  for (let i = 0; i < 3; i++) {
    const n = mesh(new THREE.BoxGeometry(0.15, 0.18, 0.012), mat.paper, false);
    n.position.set(-0.19 + i * 0.19, 0.42, 0.027); n.rotation.z = (i - 1) * 0.08; n.userData.skipBake = true;
    g.add(n); notes.push(n);
  }
  const pin = mesh(new THREE.SphereGeometry(0.014, 6, 4), M('#E0A23A'), false);
  g.userData.notes = notes;
  g.userData.pin = pin;
  return g;
}

/* Debt-free clock tower. Hands are separate so they can spin when days are stolen back. */
export function clockTower() {
  const g = new THREE.Group();
  const base = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), mat.stone); base.position.y = 0.06; g.add(base);
  const shaft = mesh(new THREE.BoxGeometry(0.34, 1.25, 0.34), M('#E9DCC8')); shaft.position.y = 0.72; g.add(shaft);
  for (const y of [0.4, 0.85]) { const band = mesh(new THREE.BoxGeometry(0.37, 0.04, 0.37), mat.stone); band.position.y = y; g.add(band); }
  const head = mesh(new THREE.BoxGeometry(0.42, 0.36, 0.42), M('#F3EADB')); head.position.y = 1.5; g.add(head);
  const roof = mesh(new THREE.ConeGeometry(0.34, 0.42, 4), mat.roofs[1]); roof.rotation.y = Math.PI / 4; roof.position.y = 1.89; g.add(roof);
  const tip = mesh(new THREE.SphereGeometry(0.035, 8, 6), mat.gold); tip.position.y = 2.12; g.add(tip);
  const door = mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), mat.door, false); door.position.set(0, 0.23, 0.175); g.add(door);
  const hands = [];
  const faceGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.02, 24); faceGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(0.135, 0.014, 6, 24);
  for (const [ax, rot] of [['z', 0], ['x', Math.PI / 2]]) {
    const face = new THREE.Group();
    face.rotation.y = rot;
    face.position.set(ax === 'x' ? 0.215 : 0, 1.5, ax === 'z' ? 0.215 : 0);
    const disc = mesh(faceGeo, mat.white, false); face.add(disc);
    const rim = mesh(rimGeo, mat.gold, false); face.add(rim);
    for (let i = 0; i < 12; i++) { const tick = mesh(new THREE.BoxGeometry(0.012, 0.025, 0.006), mat.navy, false); const a = (i / 12) * Math.PI * 2; tick.position.set(Math.sin(a) * 0.11, Math.cos(a) * 0.11, 0.012); tick.rotation.z = -a; face.add(tick); }
    g.add(face);
    const hh = new THREE.Group(); hh.position.copy(face.position); hh.rotation.y = rot;
    const hour = mesh(new THREE.BoxGeometry(0.016, 0.07, 0.008), mat.navy, false); hour.position.set(0, 0.03, 0.018); hour.userData.skipBake = true;
    const minute = mesh(new THREE.BoxGeometry(0.012, 0.1, 0.008), mat.navy, false); minute.position.set(0, 0.045, 0.022); minute.userData.skipBake = true;
    const hp = new THREE.Group(); hp.add(hour); const mp = new THREE.Group(); mp.add(minute);
    hh.add(hp, mp); hh.userData.skipBake = true;
    hands.push({ hp, mp, holder: hh });
  }
  g.userData.hands = hands;
  return g;
}

/* Garden bed by the family home: each logged day plants one crop. */
export function gardenBed() {
  const g = new THREE.Group();
  const bed = mesh(new THREE.BoxGeometry(0.84, 0.06, 0.84), M('#6E4F35')); bed.position.y = 0.03; g.add(bed);
  for (let i = 0; i < 5; i++) { const row = mesh(new THREE.BoxGeometry(0.76, 0.02, 0.06), M('#5C412B')); row.position.set(0, 0.065, -0.32 + i * 0.16); g.add(row); }
  const f = fence(0.92, 0.92, mat.wood); g.add(f);
  return g;
}
export function crop(kind = 0) {
  const g = new THREE.Group();
  if (kind === 0) {
    const head = mesh(new THREE.IcosahedronGeometry(0.045, 0), mat.crop); head.position.y = 0.045; head.scale.y = 0.8; g.add(head);
    const leaf = mesh(new THREE.IcosahedronGeometry(0.03, 0), mat.cropB); leaf.position.set(0.02, 0.06, 0.01); g.add(leaf);
  } else {
    const c = mesh(new THREE.ConeGeometry(0.02, 0.05, 5), mat.carrot); c.position.y = 0.02; c.rotation.x = Math.PI; g.add(c);
    for (const a of [-0.4, 0, 0.4]) { const l = mesh(new THREE.ConeGeometry(0.012, 0.08, 4), mat.crop); l.position.set(Math.sin(a) * 0.015, 0.08, 0); l.rotation.z = a; g.add(l); }
  }
  return g;
}

/* ---------- Community buildings and landmarks (recipes) ---------- */
export function communityCenter() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.84, 0.42, 0.64), M('#F1E4CF')); body.position.y = 0.21; g.add(body);
  const roof = mesh(new THREE.BoxGeometry(0.9, 0.06, 0.7), M('#4E9BCB')); roof.position.y = 0.45; g.add(roof);
  const glass = mesh(new THREE.BoxGeometry(0.6, 0.22, 0.02), mat.win, false); glass.position.set(0, 0.17, 0.33); g.add(glass);
  const awn = mesh(new THREE.BoxGeometry(0.66, 0.025, 0.18), M('#F2B54A')); awn.position.set(0, 0.32, 0.4); g.add(awn);
  const pole = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), mat.navy, false); pole.position.set(0.34, 0.66, -0.2); g.add(pole);
  const flag = mesh(new THREE.BoxGeometry(0.12, 0.07, 0.008), M('#4CAF6A'), false); flag.position.set(0.4, 0.78, -0.2); g.add(flag);
  for (const x of [-0.3, 0.3]) { const p = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), M('#4CAF6A')); p.position.set(x, 0.04, 0.45); g.add(p); }
  return g;
}
export function schoolhouse() {
  const g = house({ roof: mat.roofs[1], wall: M('#D9774A'), w: 0.7, d: 0.6 });
  const belfry = mesh(new THREE.BoxGeometry(0.14, 0.16, 0.14), mat.white); belfry.position.set(0, 0.62, 0); g.add(belfry);
  const cap = mesh(new THREE.ConeGeometry(0.12, 0.14, 4), mat.navy); cap.rotation.y = Math.PI / 4; cap.position.set(0, 0.77, 0); g.add(cap);
  return g;
}
export function clinic() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.74, 0.5, 0.6), mat.white); body.position.y = 0.25; g.add(body);
  const top = mesh(new THREE.BoxGeometry(0.78, 0.05, 0.64), M('#CFE7D6')); top.position.y = 0.52; g.add(top);
  const v = mesh(new THREE.BoxGeometry(0.06, 0.2, 0.02), M('#4CAF6A')); v.position.set(0, 0.36, 0.31); g.add(v);
  const h = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), M('#4CAF6A')); h.position.set(0, 0.36, 0.31); g.add(h);
  const door = mesh(new THREE.BoxGeometry(0.16, 0.2, 0.02), mat.win, false); door.position.set(0, 0.1, 0.31); g.add(door);
  for (const x of [-0.26, 0.26]) { const w = mesh(winGeo, mat.win, false); w.position.set(x, 0.3, 0.31); g.add(w); }
  return g;
}
export function library() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.78, 0.46, 0.58), mat.brick); body.position.y = 0.23; g.add(body);
  const roof = mesh(prism(0.86, 0.22, 0.64), mat.navy); roof.position.y = 0.46; g.add(roof);
  for (const x of [-0.24, 0, 0.24]) { const w = mesh(new THREE.BoxGeometry(0.1, 0.18, 0.02), mat.win, false); w.position.set(x, 0.24, 0.3); g.add(w); }
  const steps = mesh(new THREE.BoxGeometry(0.34, 0.04, 0.12), mat.stone); steps.position.set(0, 0.02, 0.34); g.add(steps);
  const book = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.03), M('#9A72D6')); book.position.set(0, 0.6, 0.18); g.add(book);
  return g;
}
export function lighthouse() {
  const g = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.12, 12), mat.stone); base.position.y = 0.06; g.add(base);
  for (let i = 0; i < 4; i++) { const s = mesh(new THREE.CylinderGeometry(0.2 - i * 0.025, 0.225 - i * 0.025, 0.36, 12), i % 2 ? mat.navy : mat.white); s.position.y = 0.3 + i * 0.36; g.add(s); }
  const deck = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 12), mat.navy); deck.position.y = 1.7; g.add(deck);
  const light = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 10), mat.lamp, false, false); light.position.y = 1.81; g.add(light);
  const cap = mesh(new THREE.ConeGeometry(0.15, 0.18, 10), mat.navy); cap.position.y = 1.99; g.add(cap);
  return g;
}
export function bandstand() {
  const g = new THREE.Group();
  const deck = mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.1, 8), mat.white); deck.position.y = 0.05; g.add(deck);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const c = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), mat.white); c.position.set(Math.cos(a) * 0.36, 0.31, Math.sin(a) * 0.36); g.add(c); }
  const roof = mesh(new THREE.ConeGeometry(0.5, 0.3, 8), M('#4F8E6A')); roof.position.y = 0.67; g.add(roof);
  const tip = mesh(new THREE.SphereGeometry(0.03, 6, 4), mat.gold); tip.position.y = 0.84; g.add(tip);
  const bunting = mesh(new THREE.TorusGeometry(0.4, 0.012, 4, 16), M('#F2B54A')); bunting.rotation.x = Math.PI / 2; bunting.position.y = 0.5; g.add(bunting);
  return g;
}
export const RECIPE_MODEL = { 'community-center': communityCenter, school: schoolhouse, clinic, library, lighthouse, bandstand };

/* ---------- Decorations (cosmetic, from the payday train) ---------- */
export const DECO_MODEL = {
  planter() { const g = new THREE.Group(); const b = mesh(new THREE.BoxGeometry(0.44, 0.1, 0.18), mat.wood); b.position.y = 0.05; g.add(b); const f = flowers(9, 0.2); f.position.y = 0.08; f.scale.set(1, 1, 0.4); g.add(f); return g; },
  bunting() { const g = new THREE.Group(); for (const x of [-0.3, 0.3]) { const p = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), mat.white); p.position.set(x, 0.25, 0); g.add(p); } const cols = ['#F2B54A', '#4E9BCB', '#F28CA0', '#4CAF6A', '#9A72D6']; for (let i = 0; i < 5; i++) { const t = mesh(new THREE.ConeGeometry(0.04, 0.08, 3), M(cols[i])); t.rotation.x = Math.PI; t.position.set(-0.22 + i * 0.11, 0.42 - Math.sin((i / 4) * Math.PI) * 0.05, 0); g.add(t); } return g; },
  fountain() { const g = new THREE.Group(); const b = mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.1, 16), mat.stone); b.position.y = 0.05; g.add(b); const w = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), mat.pond); w.position.y = 0.1; g.add(w); const c = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.24, 8), mat.stone); c.position.y = 0.2; g.add(c); const t = mesh(new THREE.SphereGeometry(0.07, 10, 6), mat.pond); t.position.y = 0.34; g.add(t); return g; },
  statue() { const g = new THREE.Group(); const p = mesh(new THREE.BoxGeometry(0.22, 0.2, 0.22), mat.stone); p.position.y = 0.1; g.add(p); const f = person('#C9BBA8', '#C9BBA8'); f.scale.setScalar(2.2); f.position.y = 0.2; g.add(f); return g; },
  gazebo() { const g = new THREE.Group(); const d = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 6), mat.wood); d.position.y = 0.025; g.add(d); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const c = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 5), mat.white); c.position.set(Math.cos(a) * 0.26, 0.2, Math.sin(a) * 0.26); g.add(c); } const r = mesh(new THREE.ConeGeometry(0.36, 0.2, 6), mat.roofs[0]); r.position.y = 0.45; g.add(r); return g; },
  birdbath() { const g = new THREE.Group(); const s = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.2, 8), mat.stone); s.position.y = 0.1; g.add(s); const bowl = mesh(new THREE.CylinderGeometry(0.13, 0.08, 0.05, 12), mat.stone); bowl.position.y = 0.22; g.add(bowl); const w = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 12), mat.pond); w.position.y = 0.245; g.add(w); const fl = flowers(6, 0.2); g.add(fl); return g; },
  kiosk() { const g = new THREE.Group(); const c = mesh(new THREE.BoxGeometry(0.36, 0.2, 0.2), M('#FFD45E')); c.position.y = 0.1; g.add(c); for (let i = 0; i < 4; i++) { const st = mesh(new THREE.BoxGeometry(0.1, 0.015, 0.24), i % 2 ? mat.white : M('#4E9BCB')); st.position.set(-0.15 + i * 0.1, 0.42, 0); st.rotation.x = 0.2; g.add(st); } for (const x of [-0.16, 0.16]) { const p = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.24, 5), mat.white); p.position.set(x, 0.3, -0.08); g.add(p); } return g; }
};

/* ---------- Railway ---------- */
export function engine() {
  const g = new THREE.Group();
  const navy = M('#2F4058', { roughness: 0.5 }), gold = mat.gold;
  const chassis = mesh(new THREE.BoxGeometry(0.42, 0.04, 0.17), mat.navy); chassis.position.y = 0.06; g.add(chassis);
  const boiler = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12), navy); boiler.rotation.z = Math.PI / 2; boiler.position.set(0.06, 0.15, 0); g.add(boiler);
  const cab = mesh(new THREE.BoxGeometry(0.14, 0.18, 0.17), M('#4F8E6A')); cab.position.set(-0.13, 0.17, 0); g.add(cab);
  const roof = mesh(new THREE.BoxGeometry(0.18, 0.025, 0.2), mat.navy); roof.position.set(-0.13, 0.27, 0); g.add(roof);
  const stack = mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.1, 8), mat.navy); stack.position.set(0.14, 0.26, 0); g.add(stack);
  const band = mesh(new THREE.TorusGeometry(0.071, 0.008, 4, 12), gold); band.rotation.y = Math.PI / 2; band.position.set(0.0, 0.15, 0); g.add(band);
  const light = mesh(new THREE.SphereGeometry(0.022, 8, 6), mat.lamp, false, false); light.position.set(0.2, 0.17, 0); g.add(light);
  const wg = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10); wg.rotateX(Math.PI / 2);
  for (const x of [-0.13, 0.0, 0.13]) for (const z of [-0.08, 0.08]) { const w = mesh(wg, mat.gold, false); w.position.set(x, 0.04, z); g.add(w); }
  return g;
}
export function railCar(color = '#C98F5E') {
  const g = new THREE.Group();
  const bed = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.17), M(color)); bed.position.y = 0.07; g.add(bed);
  for (const z of [-0.08, 0.08]) { const side = mesh(new THREE.BoxGeometry(0.34, 0.05, 0.012), mat.woodDark); side.position.set(0, 0.11, z); g.add(side); }
  const wg = new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10); wg.rotateX(Math.PI / 2);
  for (const x of [-0.11, 0.11]) for (const z of [-0.08, 0.08]) { const w = mesh(wg, mat.navy, false); w.position.set(x, 0.04, z); g.add(w); }
  return g;
}
export function crate() {
  const g = new THREE.Group();
  const box = mesh(new THREE.BoxGeometry(0.2, 0.13, 0.13), mat.wood); box.position.y = 0.065; g.add(box);
  for (const x of [-0.07, 0.07]) { const s = mesh(new THREE.BoxGeometry(0.02, 0.135, 0.135), mat.woodDark); s.position.set(x, 0.065, 0); g.add(s); }
  const bow = mesh(new THREE.BoxGeometry(0.21, 0.02, 0.03), mat.gold); bow.position.y = 0.13; g.add(bow);
  return g;
}
export function station() {
  const g = new THREE.Group();
  const plat = mesh(new THREE.BoxGeometry(0.34, 0.08, 1.5), mat.stone); plat.position.y = 0.0; g.add(plat);
  const hut = mesh(new THREE.BoxGeometry(0.26, 0.3, 0.5), M('#F1E4CF')); hut.position.set(0.02, 0.19, 0); g.add(hut);
  const roof = mesh(prism(0.36, 0.14, 0.6), M('#4F8E6A')); roof.rotation.y = Math.PI / 2; roof.position.set(0.02, 0.34, 0); g.add(roof);
  const canopy = mesh(new THREE.BoxGeometry(0.2, 0.02, 1.3), M('#E9E3D6')); canopy.position.set(-0.06, 0.38, 0); g.add(canopy);
  for (const z of [-0.6, 0.6]) { const p = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), mat.navy); p.position.set(-0.12, 0.21, z); g.add(p); }
  const clockP = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 14), mat.white); clockP.rotation.z = Math.PI / 2; clockP.position.set(-0.115, 0.27, 0); g.add(clockP);
  const w = mesh(new THREE.BoxGeometry(0.02, 0.1, 0.12), mat.win, false); w.position.set(-0.115, 0.18, 0.15); g.add(w);
  return g;
}
