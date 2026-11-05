import * as THREE from 'three';
import * as models from './models.js';
import { M, mat, mesh } from './palette.js';
import { bakeParts, bakeGroup, InstancedSet } from './bake.js';
import { tween, easeInOut, REDUCED } from './tween.js';
import { DISTRICTS } from '../data/layout.js';

/*
 * Payday train: a little elevated railway looping the Starter district over the water,
 * with a station on the east side. On payday the engine pulls in with 1–3 cars of crates.
 */
const S = DISTRICTS.starter;
const X0 = S.cx - 4 - 0.35, X1 = S.cx + 4 + 0.35, Z0 = S.cz - 4 - 0.35, Z1 = S.cz + 4 + 0.5;
const R = 0.6, Y = 0.55, CAR_GAP = 0.42;
export const STATION_Z = S.cz - 2.35;

function buildPath() {
  const pts = [];
  const arc = (cx, cz, a0, a1) => { for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * (i / 8); pts.push(new THREE.Vector3(cx + Math.cos(a) * R, Y, cz + Math.sin(a) * R)); } };
  /* Clockwise seen from above: front edge → east edge (station) → back edge → west edge. */
  arc(X0 + R, Z1 - R, Math.PI, Math.PI / 2);
  arc(X1 - R, Z1 - R, Math.PI / 2, 0);
  arc(X1 - R, Z0 + R, 0, -Math.PI / 2);
  arc(X0 + R, Z0 + R, -Math.PI / 2, -Math.PI);
  pts.push(pts[0].clone());
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, lens, total: lens.at(-1) };
}

export function createTrain(scene, fx) {
  const root = new THREE.Group(); scene.add(root);
  const path = buildPath();
  const at = (s) => {
    const L = path.total; s = ((s % L) + L) % L;
    let i = 1; while (i < path.lens.length - 1 && path.lens[i] < s) i++;
    const a = path.pts[i - 1], b = path.pts[i];
    const k = (s - path.lens[i - 1]) / (path.lens[i] - path.lens[i - 1] || 1);
    return { p: a.clone().lerp(b, k), dir: b.clone().sub(a).normalize() };
  };
  /* Arc position of the station (east side, z = STATION_Z) */
  let stationS = 0;
  { let best = 1e9; for (let s = 0; s < path.total; s += 0.02) { const q = at(s).p; const d = Math.abs(q.x - X1) + Math.abs(q.z - STATION_Z); if (d < best) { best = d; stationS = s; } } }

  /* Track (instanced pieces) + pillars */
  const set = new InstancedSet(root);
  const piece = new THREE.Group();
  const deck = mesh(new THREE.BoxGeometry(1, 0.05, 0.3), M('#8E7C69')); piece.add(deck);
  for (const z of [-0.06, 0.06]) { const r = mesh(new THREE.BoxGeometry(1, 0.025, 0.018), mat.metal); r.position.set(0, 0.035, z); piece.add(r); }
  set.define('track', bakeParts(piece));
  const pillar = new THREE.Group();
  const col = mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.5, 6), mat.stone); col.position.y = -0.75; pillar.add(col);
  set.define('pillar', bakeParts(pillar));
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 1; i < path.pts.length; i++) {
    const a = path.pts[i - 1], b = path.pts[i];
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    q.setFromAxisAngle(up, Math.atan2(-d.z, d.x));
    set.add('track', new THREE.Matrix4().compose(mid, q, new THREE.Vector3(d.length() + 0.01, 1, 1)));
  }
  for (let s = 0.4; s < path.total; s += 1.05) set.add('pillar', new THREE.Matrix4().makeTranslation(at(s).p.x, Y - 0.02, at(s).p.z));

  /* Station on stilts, outside the east edge */
  const st = bakeGroup(models.station());
  st.position.set(X1 + 0.33, Y - 0.02, STATION_Z);
  root.add(st);
  for (const z of [-0.6, 0.6]) set.add('pillar', new THREE.Matrix4().makeTranslation(X1 + 0.33, Y - 0.02, STATION_Z + z));

  /* Engine + three cars */
  const engine = bakeGroup(models.engine());
  root.add(engine);
  const cars = [];
  const colors = ['#C98F5E', '#4E9BCB', '#4CAF6A'];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    g.add(bakeGroup(models.railCar(colors[i])));
    const c = bakeGroup(models.crate()); c.position.y = 0.09; g.add(c);
    g.userData.crate = c;
    g.userData.trainCar = i;
    g.visible = false;
    root.add(g);
    cars.push(g);
  }
  const train = { s: stationS, moving: false, cars, engine, root, stationPos: st.position.clone().add(new THREE.Vector3(0, 0.4, 0)) };

  function place() {
    const e = at(train.s);
    engine.position.copy(e.p);
    engine.rotation.y = Math.atan2(-e.dir.z, e.dir.x);
    cars.forEach((c, i) => {
      const a = at(train.s - CAR_GAP * (i + 1) - 0.06);
      c.position.copy(a.p);
      c.rotation.y = Math.atan2(-a.dir.z, a.dir.x);
    });
  }
  place();

  /* carState: [{id, opened}] — up to 3 shown. */
  train.show = (carState) => {
    cars.forEach((g, i) => {
      const c = carState[i];
      g.visible = !!c;
      g.userData.carId = c ? c.id : null;
      g.userData.crate.visible = !!c && !c.opened;
    });
  };
  train.arrive = (carState, done) => {
    train.show(carState);
    if (REDUCED) { train.s = stationS; place(); done && done(); return; }
    const s0 = stationS - path.total * 0.85;
    train.moving = true;
    tween(7000, (k) => { train.s = s0 + (stationS - s0) * easeInOut(k); place(); }, () => { train.moving = false; done && done(); });
  };
  train.openCrate = (carId) => {
    const g = cars.find((c) => c.userData.carId === carId);
    if (!g) return null;
    const crate = g.userData.crate;
    const p = new THREE.Vector3(); crate.getWorldPosition(p);
    tween(380, (k) => { crate.scale.setScalar(Math.max(0.001, 1 + k * 0.4 - k * k * 1.4)); }, () => { crate.visible = false; crate.scale.setScalar(1); });
    fx.confetti(p.clone().add(new THREE.Vector3(0, 0.15, 0)));
    fx.coinBurst(p.clone().add(new THREE.Vector3(0, 0.1, 0)));
    return p;
  };
  train.carPos = (i) => cars[i].position.clone().add(new THREE.Vector3(0, 0.32, 0));
  train.tapTargets = [...cars, engine, st];
  train.stationObj = st;
  return train;
}
