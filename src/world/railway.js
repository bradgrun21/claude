import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import * as models from './models.js';
import { M, mat, mesh } from './palette.js';
import { bakeGroup, bakeParts, InstancedSet } from './bake.js';
import { tween, easeInOut, REDUCED } from './tween.js';
import { tileCenter, RAIL_I, STATION_AT } from '../data/map.js';

/*
 * Payday railway: a track along the west edge, a train that rolls into the station on payday,
 * and money trucks (a full truck per 10%, a half truck for about 5%) that drive the roads
 * to the building each slice of money belongs to.
 */
export function createRailway(scene, fx) {
  const root = new THREE.Group(); scene.add(root);
  const X = tileCenter(RAIL_I, 0)[0];
  const stopZ = tileCenter(0, STATION_AT.j)[1] + 0.5;
  /* Track: ballast, two rails, instanced sleepers */
  /* From the tunnel in the northern mountain to the tunnel in the southern one. */
  const Z0 = -31, Z1 = 31, LEN = Z1 - Z0;
  const ballast = mesh(new THREE.BoxGeometry(0.9, 0.04, LEN), M('#B8AD9C'), false, true); ballast.position.set(X, 0.02, 0); root.add(ballast);
  for (const dx of [-0.2, 0.2]) { const r = mesh(new THREE.BoxGeometry(0.05, 0.05, LEN), mat.metal, false, true); r.position.set(X + dx, 0.07, 0); root.add(r); }
  const set = new InstancedSet(root);
  const sleeper = new THREE.Group(); sleeper.add(mesh(new THREE.BoxGeometry(0.7, 0.03, 0.12), M('#7A5A3C'), false, true));
  set.define('s', bakeParts(sleeper));
  for (let z = Z0; z <= Z1; z += 0.45) set.add('s', new THREE.Matrix4().makeTranslation(X, 0.045, z));

  /* Train: engine + 3 cars of money bags */
  const train = new THREE.Group(); root.add(train);
  const eng = bakeGroup(models.engine()); eng.rotation.y = -Math.PI / 2; eng.scale.setScalar(2.1); train.add(eng);
  const bag = (c) => { const g = new THREE.Group(); const b = mesh(new THREE.SphereGeometry(0.09, 10, 8), M('#C9A86B')); b.scale.y = 0.9; g.add(b); const t = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.05, 8), M('#A9884F')); t.position.y = 0.09; g.add(t); const s = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.005), M(c)); s.position.set(0, 0, 0.09); g.add(s); return g; };
  for (let k = 0; k < 3; k++) {
    const car = new THREE.Group();
    const body = models.railCar(['#4E9BCB', '#5CC14A', '#F2B54A'][k]);
    for (const [x, z] of [[-0.08, -0.03], [0.08, 0.03], [0, 0]]) { const b = bag('#3E8E57'); b.position.set(x, 0.17, z); body.add(b); }
    const baked = bakeGroup(body); baked.rotation.y = -Math.PI / 2; baked.scale.setScalar(2.1);
    baked.position.z = -(k + 1) * 0.85 - 0.1;
    car.add(baked); train.add(car);
  }
  const START = -33.5, END = 36;
  train.position.set(X, 0.08, START);
  train.visible = false;
  let rolling = false;

  /* Trucks */
  function truck(color, half) {
    const g = new THREE.Group();
    const cab = mesh(new RoundedBoxGeometry(0.16, 0.16, 0.2, 2, 0.03), M(color, { roughness: 0.5 })); cab.position.set(0.15, 0.12, 0); g.add(cab);
    const glass = mesh(new THREE.BoxGeometry(0.01, 0.06, 0.16), mat.win, false); glass.position.set(0.235, 0.15, 0); g.add(glass);
    const bed = mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), mat.navy); bed.position.set(-0.07, 0.06, 0); g.add(bed);
    const h = half ? 0.07 : 0.14;
    const load = mesh(new RoundedBoxGeometry(0.28, h, 0.18, 2, 0.02), M('#5CC14A')); load.position.set(-0.07, 0.085 + h / 2, 0); g.add(load);
    const coin = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 14), mat.gold); coin.rotation.x = Math.PI / 2; coin.position.set(-0.07, 0.085 + h / 2, 0.095); g.add(coin);
    const wg = new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10); wg.rotateX(Math.PI / 2);
    for (const x of [-0.15, 0.15]) for (const z of [-0.1, 0.1]) { const w = mesh(wg, mat.navy, false); w.position.set(x, 0.035, z); g.add(w); }
    const out = bakeGroup(g);
    out.scale.setScalar(1.6);
    return out;
  }
  const trucks = [];

  const api = {
    stationPos: new THREE.Vector3(X + 1.4, 0, stopZ),
    /* Train rolls in from the north and stops at the station. */
    arrive(done) {
      train.visible = true; rolling = true;
      if (REDUCED) { train.position.z = stopZ; rolling = false; done && done(); return; }
      const z0 = START;
      tween(5200, (k) => { train.position.z = z0 + (stopZ + 1.2 - z0) * easeInOut(k); }, () => { rolling = false; done && done(); });
    },
    depart() {
      const z0 = train.position.z;
      rolling = true;
      tween(4500, (k) => { train.position.z = z0 + (END - z0) * k * k; }, () => { train.visible = false; rolling = false; train.position.z = START; });
    },
    /* Park the trucks beside the station while the family looks at the breakdown. */
    park(list) {
      api.clear();
      list.forEach((t, n) => {
        const o = truck(t.color, t.half);
        o.position.set(X + 1.2 + (n % 4) * 0.55, 0.02, stopZ - 1.6 + Math.floor(n / 4) * 0.45);
        o.rotation.y = -Math.PI / 2;
        root.add(o);
        trucks.push({ obj: o, ...t });
      });
    },
    /* Each truck follows its road path (world points) and drops the money at its building. */
    dispatch(onArrive) {
      trucks.forEach((t, n) => {
        const pts = t.points;
        if (!pts || pts.length < 2) { root.remove(t.obj); onArrive && onArrive(t); return; }
        const lens = [0];
        for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + pts[k].distanceTo(pts[k - 1]));
        const total = lens.at(-1);
        const dur = Math.max(2200, total * 420);
        const at = (d) => { let k = 1; while (k < lens.length - 1 && lens[k] < d) k++; const a = pts[k - 1], b = pts[k]; const f = (d - lens[k - 1]) / ((lens[k] - lens[k - 1]) || 1); return { p: a.clone().lerp(b, f), dir: b.clone().sub(a) }; };
        setTimeout(() => {
          if (REDUCED) { root.remove(t.obj); onArrive && onArrive(t); return; }
          tween(dur, (k) => { const s = at(total * easeInOut(k)); t.obj.position.set(s.p.x, 0.02, s.p.z); if (s.dir.lengthSq() > 1e-6) t.obj.rotation.y = Math.atan2(-s.dir.z, s.dir.x); }, () => { root.remove(t.obj); onArrive && onArrive(t); });
        }, n * 450);
      });
      trucks.length = 0;
    },
    clear() { for (const t of trucks) root.remove(t.obj); trucks.length = 0; },
    tick(dt, t) {
      if (rolling && !REDUCED) eng.position.y = Math.abs(Math.sin(t * 18)) * 0.01;
    }
  };
  return api;
}
