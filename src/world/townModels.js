import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, mat, mesh } from './palette.js';
import * as m from './models.js';
import { byId } from '../data/catalog.js';

/*
 * One model per catalog type, built at 1-tile scale and grown to the footprint.
 * Bright, chunky, original look (inspired by the farm-town genre, not copied from any game).
 */
const pad = (w, color = '#D9D2C3', h = 0.05) => { const p = mesh(new RoundedBoxGeometry(w, h, w, 2, 0.04), M(color), false, true); p.position.y = h / 2; return p; };
const C = {
  red: M('#D9543F'), blue: M('#3F7FC2'), green: M('#3E9B54'), teal: M('#2FA7A0'), cream: M('#FFF4DE'), sand: M('#F1DFB5'), brick: M('#C0623F'),
  wood: M('#B07A45'), dark: M('#5A4632'), yellow: M('#F6C443'), pink: M('#F28CA0'), purple: M('#8E6CCB'), sky: M('#7FC6EE'), white: mat.white, navy: mat.navy, grass: M('#79C24A'), pool: M('#4FC3F0', { roughness: 0.2 })
};
const box = (w, h, d, material, x = 0, y = 0, z = 0, cast = true) => { const b = mesh(new THREE.BoxGeometry(w, h, d), material, cast); b.position.set(x, y + h / 2, z); return b; };
const cyl = (r, h, material, x = 0, y = 0, z = 0, seg = 12) => { const c = mesh(new THREE.CylinderGeometry(r, r, h, seg), material); c.position.set(x, y + h / 2, z); return c; };
const win = (g, x, y, z, rotY = 0, w = 0.1, h = 0.12) => { const p = mesh(new THREE.BoxGeometry(w, h, 0.02), mat.win, false); p.position.set(x, y, z); p.rotation.y = rotY; g.add(p); };
const roofPrism = (w, h, d, material) => { const r = mesh(m.prism(w, h, d), material); return r; };
const tree = (x, z, s = 1, kind = 'round') => { const t = m.tree(kind, mat.leaf[1], mat.leaf[2]); t.position.set(x, 0, z); t.scale.setScalar(s); return t; };

/* ---------- Town Hall (3×3) ---------- */
function townhall(level = 1) {
  const g = new THREE.Group();
  g.add(pad(0.96, '#E6DFD0'));
  const th = m.townHall(); th.position.y = 0.05; g.add(th);
  for (const x of [-0.36, 0.36]) { const f = m.flowers(4, 0.06); f.position.set(x, 0.05, 0.42); g.add(f); }
  if (level >= 2) { const w1 = box(0.18, 0.36 + level * 0.06, 0.4, C.cream, -0.5, 0.05, -0.06); g.add(w1); const r1 = roofPrism(0.22, 0.12, 0.44, C.blue); r1.position.set(-0.5, 0.41 + level * 0.06 + 0.05, -0.06); g.add(r1); }
  if (level >= 3) { const w2 = box(0.18, 0.36 + level * 0.06, 0.4, C.cream, 0.5, 0.05, -0.06); g.add(w2); const r2 = roofPrism(0.22, 0.12, 0.44, C.blue); r2.position.set(0.5, 0.41 + level * 0.06 + 0.05, -0.06); g.add(r2); }
  if (level >= 4) { const t = cyl(0.05, 0.5, C.cream, 0, 0.9, -0.2, 8); g.add(t); const cap = mesh(new THREE.ConeGeometry(0.08, 0.14, 8), C.blue); cap.position.set(0, 1.47, -0.2); g.add(cap); }
  return g;
}

/* ---------- Spiritual ---------- */
function church() { const g = new THREE.Group(); g.add(pad(0.96, '#E6DFD0')); const c = m.chapel(); c.scale.setScalar(1.08); c.position.y = 0.05; g.add(c); g.add(tree(-0.36, -0.32, 0.55)); const f = m.flowers(6, 0.12); f.position.set(0.3, 0.05, 0.36); g.add(f); return g; }
function garden() {
  const g = new THREE.Group(); g.add(pad(0.96, '#8FCB62'));
  const path = box(0.16, 0.012, 0.96, mat.walk, 0, 0.05); g.add(path);
  const pond = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 20), mat.pond, false, true); pond.position.set(-0.22, 0.06, 0.18); g.add(pond);
  for (const [x, z] of [[-0.38, -0.38], [0.38, -0.36], [0.36, 0.38]]) g.add(tree(x, z, 0.6));
  for (const x of [-0.4, 0.4]) { const hedge = box(0.12, 0.09, 0.5, mat.leaf[0], x, 0.05, 0.08); g.add(hedge); }
  const arch = new THREE.Group(); for (const x of [-0.12, 0.12]) arch.add(box(0.025, 0.28, 0.025, C.white, x, 0.05, -0.3)); const top = mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 12, Math.PI), C.white); top.position.set(0, 0.33, -0.3); arch.add(top); g.add(arch);
  const b = m.bench(); b.position.set(0.22, 0.05, 0.12); b.rotation.y = -Math.PI / 2; g.add(b);
  const fl = m.flowers(10, 0.4); fl.position.y = 0.05; g.add(fl);
  return g;
}
function studyhall() { const g = new THREE.Group(); g.add(pad(0.96)); const l = m.library(); l.position.y = 0.05; g.add(l); const f = m.flowers(5, 0.1); f.position.set(-0.32, 0.05, 0.4); g.add(f); return g; }
function pavilion() { const g = new THREE.Group(); g.add(pad(0.96, '#8FCB62')); const b = m.bandstand(); b.position.y = 0.05; b.scale.setScalar(0.95); g.add(b); return g; }
function retreat() {
  const g = new THREE.Group(); g.add(pad(0.96, '#8FCB62'));
  g.add(box(0.7, 0.34, 0.46, C.wood, 0, 0.05, -0.08)); const r = roofPrism(0.82, 0.26, 0.56, C.green); r.position.set(0, 0.39, -0.08); g.add(r);
  g.add(box(0.12, 0.22, 0.02, C.dark, 0, 0.05, 0.16)); win(g, -0.2, 0.25, 0.16); win(g, 0.2, 0.25, 0.16);
  g.add(box(0.08, 0.3, 0.08, mat.rock, 0.26, 0.5, -0.16));
  g.add(tree(-0.38, 0.32, 0.6, 'pine')); g.add(tree(0.38, 0.34, 0.55, 'pine'));
  return g;
}

/* ---------- Physical ---------- */
function gym() {
  const g = new THREE.Group(); g.add(pad(0.96));
  g.add(box(0.78, 0.4, 0.56, C.cream, 0, 0.05, -0.08));
  g.add(box(0.82, 0.06, 0.6, C.green, 0, 0.45, -0.08));
  const glass = mesh(new THREE.BoxGeometry(0.6, 0.2, 0.02), mat.win, false); glass.position.set(0, 0.22, 0.21); g.add(glass);
  const bar = box(0.36, 0.03, 0.03, C.navy, 0, 0.6, 0.12); g.add(bar);
  for (const x of [-0.18, 0.18]) { const w = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14), C.navy); w.rotation.z = Math.PI / 2; w.position.set(x, 0.615, 0.12); g.add(w); }
  const post = box(0.03, 0.12, 0.03, C.navy, 0, 0.5, 0.12); g.add(post);
  for (const x of [-0.3, 0.3]) { const b = box(0.1, 0.08, 0.1, C.green, x, 0.05, 0.36); g.add(b); }
  return g;
}
function field() {
  const g = new THREE.Group(); g.add(pad(0.98, '#E9C994', 0.03));
  const turf = box(0.84, 0.02, 0.66, C.grass, 0, 0.03, -0.04, false); g.add(turf);
  for (const z of [-0.36, 0.28]) g.add(box(0.84, 0.004, 0.012, C.white, 0, 0.05, z, false));
  g.add(box(0.012, 0.004, 0.64, C.white, 0, 0.05, -0.04, false));
  const ring = mesh(new THREE.TorusGeometry(0.08, 0.006, 4, 20), C.white); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.052, -0.04); g.add(ring);
  for (const x of [-0.42, 0.42]) { const goal = new THREE.Group(); goal.add(box(0.012, 0.1, 0.012, C.white, 0, 0, -0.08)); goal.add(box(0.012, 0.1, 0.012, C.white, 0, 0, 0.08)); goal.add(box(0.012, 0.012, 0.17, C.white, 0, 0.1, 0)); goal.position.set(x, 0.04, -0.04); g.add(goal); }
  const stands = box(0.6, 0.08, 0.1, C.blue, 0, 0.03, 0.4); g.add(stands); g.add(box(0.6, 0.06, 0.06, C.blue, 0, 0.11, 0.43));
  return g;
}
function pool() {
  const g = new THREE.Group(); g.add(pad(0.98, '#F1E6CF'));
  const rim = box(0.7, 0.05, 0.5, C.white, 0, 0.05, -0.04); g.add(rim);
  const water = box(0.62, 0.02, 0.42, C.pool, 0, 0.085, -0.04, false); g.add(water);
  for (let k = 0; k < 3; k++) g.add(box(0.62, 0.004, 0.01, C.white, 0, 0.11, -0.16 + k * 0.12, false));
  for (const [x, c] of [[-0.3, C.red], [0.3, C.yellow]]) { const pole = box(0.012, 0.22, 0.012, C.white, x, 0.05, 0.36); g.add(pole); const u = mesh(new THREE.ConeGeometry(0.13, 0.07, 10), c); u.position.set(x, 0.29, 0.36); g.add(u); }
  const board = box(0.08, 0.02, 0.18, C.sky, 0.25, 0.09, -0.26); g.add(board);
  return g;
}
function clinic() { const g = new THREE.Group(); g.add(pad(0.96)); const c = m.clinic(); c.position.y = 0.05; g.add(c); g.add(tree(-0.38, 0.36, 0.5)); return g; }

/* ---------- Financial ---------- */
function bank() { const g = new THREE.Group(); g.add(pad(0.96)); const b = m.bank(); b.position.y = 0.05; g.add(b); for (const x of [-0.38, 0.38]) { const p = box(0.1, 0.06, 0.1, C.green, x, 0.05, 0.42); g.add(p); } return g; }
function savings() {
  const g = new THREE.Group(); g.add(pad(0.96));
  const t = m.waterTowerShell(); t.position.y = 0.05; t.scale.setScalar(0.85); g.add(t);
  const tank = cyl(0.27, 0.4, C.yellow, 0, 0.83, 0, 20); g.add(tank);
  const coin = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 18), mat.gold); coin.rotation.x = Math.PI / 2; coin.position.set(0, 1.03, 0.27); g.add(coin);
  g.add(box(0.3, 0.16, 0.24, C.cream, 0.28, 0.05, 0.28)); const r = roofPrism(0.34, 0.1, 0.28, C.red); r.position.set(0.28, 0.26, 0.28); g.add(r);
  return g;
}
function market() {
  const g = new THREE.Group(); g.add(pad(0.98, '#E6DFD0'));
  const cols = [C.red, C.yellow, C.blue, C.green];
  [[-0.24, -0.22], [0.24, -0.22], [-0.24, 0.24], [0.24, 0.24]].forEach(([x, z], i) => {
    const s = new THREE.Group();
    s.add(box(0.34, 0.12, 0.2, C.wood, 0, 0.05, 0));
    for (const px of [-0.15, 0.15]) s.add(box(0.02, 0.3, 0.02, C.dark, px, 0.05, -0.08));
    for (let k = 0; k < 4; k++) { const st = mesh(new THREE.BoxGeometry(0.09, 0.015, 0.26), k % 2 ? C.white : cols[i]); st.position.set(-0.135 + k * 0.09, 0.37, 0); st.rotation.x = 0.25; s.add(st); }
    const fr = box(0.26, 0.04, 0.12, [C.red, C.yellow, C.green, C.pink][i], 0, 0.17, 0.02); s.add(fr);
    s.position.set(x, 0, z); g.add(s);
  });
  return g;
}
function office() {
  const g = new THREE.Group(); g.add(pad(0.96));
  g.add(box(0.5, 1.3, 0.44, M('#BFD9EA', { roughness: 0.3 }), 0, 0.05, -0.06));
  for (let f = 0; f < 6; f++) { g.add(box(0.52, 0.02, 0.46, C.white, 0, 0.2 + f * 0.2, -0.06, false)); }
  g.add(box(0.3, 0.12, 0.3, C.navy, 0, 1.35, -0.06));
  g.add(box(0.2, 0.18, 0.02, C.dark, 0, 0.05, 0.17));
  for (const x of [-0.36, 0.36]) g.add(tree(x, 0.34, 0.5));
  return g;
}

/* ---------- Relational ---------- */
function park() {
  const g = new THREE.Group(); g.add(pad(0.98, '#8FCB62', 0.03));
  const path = box(0.9, 0.012, 0.12, mat.walk, 0, 0.03, 0.05); g.add(path); g.add(box(0.12, 0.012, 0.9, mat.walk, 0.05, 0.03, 0));
  const pond = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 20), mat.pond, false, true); pond.scale.set(1.3, 1, 0.9); pond.position.set(-0.24, 0.04, -0.26); g.add(pond);
  for (const [x, z] of [[0.32, -0.32], [-0.36, 0.34], [0.36, 0.36]]) g.add(tree(x, z, 0.6));
  const b = m.bench(); b.position.set(-0.22, 0.03, 0.18); g.add(b);
  const ft = m.DECO_MODEL.fountain(); ft.scale.setScalar(0.5); ft.position.set(0.05, 0.03, 0.05); g.add(ft);
  const fl = m.flowers(12, 0.42); fl.position.y = 0.03; g.add(fl);
  return g;
}
function cafe() {
  const g = new THREE.Group(); g.add(pad(0.96));
  const s = m.shop(C.teal); s.position.y = 0.05; g.add(s);
  const cup = cyl(0.07, 0.08, C.white, 0, 0.62, 0.2, 12); g.add(cup); const handle = mesh(new THREE.TorusGeometry(0.03, 0.01, 4, 10), C.white); handle.position.set(0.08, 0.66, 0.2); g.add(handle);
  for (const x of [-0.3, 0.3]) { const t = cyl(0.06, 0.01, C.white, x, 0.15, 0.42); g.add(t); g.add(box(0.012, 0.1, 0.012, C.navy, x, 0.05, 0.42)); const u = mesh(new THREE.ConeGeometry(0.12, 0.06, 10), C.teal); u.position.set(x, 0.33, 0.42); g.add(u); g.add(box(0.008, 0.16, 0.008, C.navy, x, 0.16, 0.42)); }
  return g;
}
function diner() { const g = new THREE.Group(); g.add(pad(0.96)); const d = m.diner(); d.position.y = 0.05; g.add(d); return g; }
function hall() { const g = new THREE.Group(); g.add(pad(0.96)); const c = m.communityCenter(); c.position.y = 0.05; g.add(c); return g; }

/* ---------- To-Do ---------- */
function jobboard() {
  const g = new THREE.Group(); g.add(pad(0.98, '#E6DFD0'));
  const b = m.orderBoard(); b.scale.setScalar(1.25); b.position.set(0, 0.05, -0.12); g.add(b);
  const ring = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.01, 24), M('#CFC4AF'), false, true); ring.position.set(0, 0.055, 0.12); g.add(ring);
  for (const x of [-0.3, 0.3]) { const bn = m.bench(); bn.position.set(x, 0.05, 0.32); g.add(bn); }
  const l = m.lamp(); l.position.set(0.4, 0.05, -0.3); g.add(l);
  g.add(tree(-0.4, -0.32, 0.5));
  return g;
}
function workshop() {
  const g = new THREE.Group(); g.add(pad(0.96));
  g.add(box(0.74, 0.38, 0.5, C.red, 0, 0.05, -0.08)); const r = roofPrism(0.84, 0.26, 0.58, C.dark); r.position.set(0, 0.43, -0.08); g.add(r);
  g.add(box(0.26, 0.28, 0.02, C.white, 0, 0.05, 0.17)); g.add(box(0.22, 0.24, 0.02, C.wood, 0, 0.07, 0.175));
  g.add(box(0.4, 0.06, 0.12, C.wood, 0.2, 0.05, 0.38)); for (let k = 0; k < 3; k++) g.add(box(0.36, 0.035, 0.035, C.wood, 0.2, 0.11 + k * 0.035, 0.38));
  return g;
}
function postoffice() {
  const g = new THREE.Group(); g.add(pad(0.96));
  g.add(box(0.74, 0.42, 0.52, C.cream, 0, 0.05, -0.08)); g.add(box(0.78, 0.06, 0.56, C.blue, 0, 0.47, -0.08));
  g.add(box(0.16, 0.24, 0.02, C.blue, 0, 0.05, 0.19)); win(g, -0.24, 0.27, 0.19); win(g, 0.24, 0.27, 0.19);
  g.add(box(0.1, 0.16, 0.08, C.blue, 0.38, 0.05, 0.36)); const top = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10, 1, false, 0, Math.PI), C.blue); top.rotation.z = Math.PI / 2; top.rotation.y = Math.PI / 2; top.position.set(0.38, 0.21, 0.36); g.add(top);
  return g;
}
function library() { const g = new THREE.Group(); g.add(pad(0.96)); const l = m.library(); l.position.y = 0.05; g.add(l); g.add(tree(0.38, 0.36, 0.5)); return g; }

/* ---------- Shops (payday truck destinations) + station + debt payoff ---------- */
function groceryStore() { const g = new THREE.Group(); g.add(pad(0.96)); const s = m.grocery(); s.position.y = 0.05; g.add(s); const cart = box(0.12, 0.06, 0.08, C.white, 0.34, 0.05, 0.4); g.add(cart); return g; }
function gasstation() {
  const g = new THREE.Group(); g.add(pad(0.98, '#C9CED6'));
  for (const [x, z] of [[-0.3, -0.05], [0.3, -0.05], [-0.3, 0.3], [0.3, 0.3]]) g.add(box(0.04, 0.42, 0.04, C.white, x, 0.05, z));
  g.add(box(0.78, 0.06, 0.5, C.red, 0, 0.47, 0.12));
  g.add(box(0.8, 0.03, 0.52, C.white, 0, 0.53, 0.12));
  for (const x of [-0.12, 0.12]) { g.add(box(0.08, 0.2, 0.08, C.blue, x, 0.05, 0.12)); g.add(box(0.06, 0.04, 0.02, mat.win, x, 0.18, 0.165, false)); }
  g.add(box(0.5, 0.3, 0.26, C.cream, 0, 0.05, -0.34)); g.add(box(0.3, 0.12, 0.02, mat.win, 0, 0.12, -0.21, false));
  const sign = box(0.04, 0.5, 0.04, C.navy, 0.42, 0.05, 0.42); g.add(sign); g.add(box(0.16, 0.12, 0.03, C.yellow, 0.42, 0.55, 0.42));
  return g;
}
function newsstation() {
  const g = new THREE.Group();
  g.add(box(0.62, 0.44, 0.56, C.cream, 0, 0, -0.04)); g.add(box(0.66, 0.05, 0.6, C.purple, 0, 0.44, -0.04));
  g.add(box(0.36, 0.1, 0.03, C.purple, 0, 0.3, 0.25)); g.add(box(0.28, 0.04, 0.032, C.white, 0, 0.31, 0.255));
  g.add(box(0.12, 0.2, 0.02, C.dark, -0.14, 0, 0.25)); win(g, 0.16, 0.16, 0.25);
  g.add(box(0.03, 0.34, 0.03, mat.metal, 0.18, 0.49, -0.1));
  const dish = mesh(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), C.white); dish.rotation.x = -Math.PI / 2.2; dish.position.set(0.18, 0.86, -0.06); g.add(dish);
  return g;
}
function station() {
  const g = new THREE.Group(); g.add(pad(0.98, '#D9D2C3'));
  g.add(box(0.98, 0.08, 0.98, mat.stone, 0, 0.05, 0, false));
  g.add(box(0.36, 0.34, 0.7, C.brick, 0.18, 0.13, 0)); const r = roofPrism(0.46, 0.18, 0.8, C.green); r.rotation.y = Math.PI / 2; r.position.set(0.18, 0.47, 0); g.add(r);
  g.add(box(0.2, 0.025, 0.94, C.cream, -0.24, 0.48, 0));
  for (const z of [-0.4, 0, 0.4]) g.add(box(0.025, 0.36, 0.025, C.navy, -0.32, 0.13, z));
  win(g, -0.01, 0.3, 0.12, Math.PI / 2); win(g, -0.01, 0.3, -0.12, Math.PI / 2);
  const clock = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), C.white); clock.rotation.z = Math.PI / 2; clock.position.set(-0.01, 0.52, 0); g.add(clock);
  return g;
}
function payoff() {
  const g = new THREE.Group(); g.add(pad(0.96, '#E6EEF5'));
  g.add(box(0.72, 0.42, 0.56, M('#DDE8F2'), 0, 0.05, -0.06)); g.add(box(0.76, 0.05, 0.6, C.blue, 0, 0.47, -0.06));
  g.add(box(0.5, 0.18, 0.02, mat.win, 0, 0.18, 0.23, false)); g.add(box(0.12, 0.2, 0.02, C.dark, 0.26, 0.05, 0.23));
  const ball = mesh(new THREE.IcosahedronGeometry(0.18, 1), M('#FFFFFF', { roughness: 0.6 })); ball.position.set(0, 0.7, -0.06); g.add(ball);
  const ball2 = mesh(new THREE.IcosahedronGeometry(0.1, 1), M('#F4FAFF')); ball2.position.set(-0.24, 0.6, 0.06); g.add(ball2);
  for (const x of [-0.36, 0.36]) g.add(tree(x, 0.38, 0.45, 'pine'));
  return g;
}

/* ---------- Homes (1×1 unless noted). Level = floors. ---------- */
const ROOFS = [C.red, C.blue, C.green, M('#D9774A'), M('#6B7A8A')];
function cottage(level = 1, v = 0) { const g = new THREE.Group(); const h = m.house({ roof: ROOFS[v % 5], wall: mat.walls[v % 5], floors: Math.min(3, level), w: 0.58, d: 0.56 }); g.add(h); const f = m.flowers(4, 0.08); f.position.set(-0.3, 0, 0.36); g.add(f); return g; }
function familyHouse(level = 1, v = 0) {
  const g = new THREE.Group();
  const h = m.house({ roof: ROOFS[(v + 2) % 5], wall: C.cream, floors: Math.min(3, level + 1), w: 0.66, d: 0.6, big: true }); g.add(h);
  const garage = box(0.24, 0.2, 0.3, C.cream, 0.42, 0, 0.05); g.add(garage); g.add(box(0.2, 0.15, 0.02, C.white, 0.42, 0, 0.21));
  const fe = m.fence(0.94, 0.94); g.add(fe);
  return g;
}
function townhouse(level = 1, v = 0) {
  const g = new THREE.Group();
  for (const [x, c] of [[-0.18, C.yellow], [0.18, C.sky]]) {
    const fl = 2 + Math.min(2, level - 1);
    g.add(box(0.34, 0.3 * fl, 0.56, c, x, 0, 0));
    const r = roofPrism(0.38, 0.18, 0.6, ROOFS[(v + (x > 0 ? 1 : 0)) % 5]); r.position.set(x, 0.3 * fl, 0); g.add(r);
    for (let f = 0; f < fl; f++) win(g, x, 0.18 + f * 0.3, 0.29);
    g.add(box(0.1, 0.18, 0.02, C.dark, x + 0.08, 0, 0.29));
  }
  return g;
}
function apartments(level = 1) {
  const g = new THREE.Group(); g.add(pad(0.96));
  const fl = 3 + level;
  g.add(box(0.8, 0.16 * fl, 0.56, C.sand, 0, 0.05, -0.06));
  for (let f = 0; f < fl; f++) for (let k = -2; k <= 2; k++) win(g, k * 0.15, 0.13 + f * 0.16, 0.225, 0, 0.08, 0.08);
  g.add(box(0.84, 0.05, 0.6, C.red, 0, 0.05 + 0.16 * fl, -0.06));
  g.add(box(0.16, 0.16, 0.02, C.dark, 0, 0.05, 0.225));
  for (const x of [-0.38, 0.38]) g.add(tree(x, 0.38, 0.45));
  return g;
}

/* ---------- Decorations ---------- */
const decor = {
  tree: () => { const g = new THREE.Group(); g.add(tree(0, 0, 1.25)); return g; },
  flowers: () => { const g = new THREE.Group(); const b = mesh(new RoundedBoxGeometry(0.7, 0.06, 0.7, 2, 0.03), M('#6E4F35')); b.position.y = 0.03; g.add(b); const f = m.flowers(26, 0.3); f.position.y = 0.05; g.add(f); return g; },
  bench: () => { const g = new THREE.Group(); const b = m.bench(); b.scale.setScalar(1.4); g.add(b); const l = m.lamp(); l.position.set(0.3, 0, -0.1); l.scale.setScalar(1.3); g.add(l); return g; },
  fountain: () => { const g = m.DECO_MODEL.fountain(); g.scale.setScalar(1.3); return g; },
  gazebo: () => { const g = m.DECO_MODEL.gazebo(); g.scale.setScalar(1.4); return g; },
  statue: () => { const g = m.DECO_MODEL.statue(); g.scale.setScalar(1.3); return g; }
};

const BUILDERS = {
  townhall, church, garden, studyhall, pavilion, retreat, gym, field, pool, clinic, bank, savings, market, payoff, office, grocery: groceryStore, gasstation, newsstation, station, park, cafe, diner, hall, jobboard, workshop, postoffice, library,
  cottage, house: familyHouse, townhouse, apartments, ...decor
};

/* Section buildings grow with steady use: level 2 adds pennants and flower boxes, level 3 a gold star on top. */
const PENNANT = [M('#F28CA0'), M('#F6C443'), M('#7FC6EE')];
function grown(g, level) {
  for (const [x, k] of [[-0.43, 0], [0.43, 1]]) {
    const pole = box(0.02, 0.42, 0.02, C.white, x, 0, 0.43); g.add(pole);
    const fl = mesh(new THREE.ConeGeometry(0.05, 0.13, 3), PENNANT[k]); fl.rotation.z = -Math.PI / 2; fl.position.set(x + 0.07, 0.37, 0.43); fl.scale.set(1, 1, 0.3); g.add(fl);
    const fb = m.flowers(4, 0.06); fb.position.set(x * 0.72, 0.03, 0.46); g.add(fb);
  }
  if (level >= 3) {
    g.updateMatrixWorld(true);
    const top = new THREE.Box3().setFromObject(g).max.y;
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.045 : 0.1, a = (i / 10) * Math.PI * 2 + Math.PI / 2; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); }
    const star = mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), mat.gold); star.position.set(0, top + 0.16, -0.015); g.add(star);
    g.add(box(0.015, 0.08, 0.015, mat.gold, 0, top, 0));
  }
}

/* Returns a group already scaled to the footprint (w tiles wide). */
export function buildModel(type, w = 1, level = 1, variant = 0) {
  const fn = BUILDERS[type] || cottage;
  const inner = fn(level, variant);
  if (byId[type]?.kind === 'section' && level >= 2) grown(inner, level);
  const g = new THREE.Group();
  inner.scale.multiplyScalar(w * 0.98);
  g.add(inner);
  return g;
}
