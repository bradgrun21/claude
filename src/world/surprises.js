import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, mat, mesh, rand } from './palette.js';
import { bakeGroup } from './bake.js';
import { tween, REDUCED } from './tween.js';
import { DISTRICTS, SIZE } from '../data/layout.js';
import { zRow } from './city.js';

/* Cosmetic surprises: hot-air balloon, birds, ice cream truck, rainbow. They never give points. */
const S = DISTRICTS.starter;
const minX = S.cx - 4;

export function createSurprises(scene, camera) {
  const balloon = new THREE.Group();
  {
    const cols = ['#E8643F', '#F2B54A', '#FFFDF7', '#4E9BCB', '#F28CA0', '#4CAF6A'];
    const env = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const seg = mesh(new THREE.SphereGeometry(0.55, 2, 14, (i / 12) * Math.PI * 2, Math.PI * 2 / 12), M(cols[i % 6], { flatShading: false, roughness: 0.6 }), true, false);
      seg.scale.set(1, 1.2, 1); env.add(seg);
    }
    const neck = mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.3, 12), M('#E8643F')); neck.position.y = -0.7; env.add(neck);
    const basket = mesh(new THREE.BoxGeometry(0.2, 0.16, 0.2), mat.door); basket.position.y = -1.05; env.add(basket);
    for (const [x, z] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) { const r = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28, 3), mat.navy, false); r.position.set(x, -0.88, z); env.add(r); }
    balloon.add(bakeGroup(env));
  }
  balloon.userData.surprise = 'balloon';
  balloon.visible = false; scene.add(balloon);

  const birds = new THREE.Group();
  const wingGeo = new THREE.BoxGeometry(0.16, 0.01, 0.05);
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    for (const s of [-1, 1]) { const w = mesh(wingGeo, mat.navy, true, false); w.position.x = s * 0.08; w.userData.side = s; b.add(w); }
    b.position.set(-i * 0.35, Math.abs(i - 2.5) * 0.12, (i % 2 ? 1 : -1) * i * 0.22);
    b.userData.ph = i * 0.7;
    birds.add(b);
  }
  birds.userData.surprise = 'birds'; birds.visible = false; scene.add(birds);

  const truck = new THREE.Group();
  {
    const g = new THREE.Group();
    const body = mesh(new RoundedBoxGeometry(0.44, 0.2, 0.22, 2, 0.04), M('#FFFDF7', { roughness: 0.45 })); body.position.y = 0.13; g.add(body);
    const stripe = mesh(new THREE.BoxGeometry(0.445, 0.04, 0.225), M('#F28CA0')); stripe.position.y = 0.1; g.add(stripe);
    const cab = mesh(new RoundedBoxGeometry(0.12, 0.13, 0.2, 2, 0.03), M('#D8ECF5', { roughness: 0.2 })); cab.position.set(0.2, 0.12, 0); g.add(cab);
    const cone = mesh(new THREE.ConeGeometry(0.05, 0.12, 10), M('#E0A23A')); cone.rotation.z = Math.PI; cone.position.set(-0.05, 0.31, 0); g.add(cone);
    const scoop = mesh(new THREE.SphereGeometry(0.055, 12, 8), M('#F6A5B8', { flatShading: false })); scoop.position.set(-0.05, 0.38, 0); g.add(scoop);
    const wg = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 10); wg.rotateX(Math.PI / 2);
    for (const x of [-0.13, 0.14]) for (const z of [-0.11, 0.11]) { const w = mesh(wg, mat.navy, false); w.position.set(x, 0.045, z); g.add(w); }
    truck.add(bakeGroup(g));
  }
  truck.userData.surprise = 'icecream'; truck.visible = false; scene.add(truck);

  const rainbow = new THREE.Group();
  ['#E8643F', '#F2B54A', '#FFE680', '#7BC67A', '#4E9BCB', '#9A72D6'].forEach((c, i) => {
    rainbow.add(new THREE.Mesh(new THREE.TorusGeometry(9 - i * 0.32, 0.16, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, fog: false, depthWrite: false })));
  });
  rainbow.position.set(-3, -0.9, -6); rainbow.visible = false; scene.add(rainbow);

  const live = { balloon: null, birds: null, icecream: null };
  function launch(kind) {
    if (live[kind]) return false;
    if (kind === 'balloon') { live.balloon = { t: 0, z: -2 + rand() * 6 }; balloon.visible = true; }
    if (kind === 'birds') { live.birds = { t: 0, z: -4 + rand() * 10 }; birds.visible = true; }
    if (kind === 'icecream') { live.icecream = { t: 0 }; truck.visible = true; }
    return true;
  }
  function showRainbow() {
    rainbow.visible = true;
    rainbow.lookAt(camera.position.x, -0.9, camera.position.z);
    tween(1800, (k) => rainbow.children.forEach((a) => { a.material.opacity = 0.55 * k; }), () => setTimeout(() => tween(2500, (k) => rainbow.children.forEach((a) => { a.material.opacity = 0.55 * (1 - k); }), () => { rainbow.visible = false; }), 7000));
  }
  function tick(dt, t) {
    if (live.balloon) { const u = live.balloon; u.t += dt; balloon.position.set(-11 + u.t * 0.9, 6.2 + Math.sin(u.t * 0.8) * 0.25, u.z + u.t * 0.25); balloon.rotation.y = u.t * 0.1; if (u.t > 38) { live.balloon = null; balloon.visible = false; } }
    if (live.birds) { const u = live.birds; u.t += dt; birds.position.set(-14 + u.t * 2.4, 4.6 + Math.sin(u.t) * 0.2, u.z); birds.children.forEach((b) => b.children.forEach((w) => { w.rotation.z = w.userData.side * Math.sin(t * 12 + b.userData.ph) * 0.6; })); if (u.t > 13) { live.birds = null; birds.visible = false; } }
    if (live.icecream) { const u = live.icecream; u.t += dt; const s = u.t / 14; truck.position.set(minX - 0.6 + s * (SIZE + 1.2), 0.02, zRow - 0.2); truck.scale.setScalar(Math.max(0.001, Math.min(1, Math.min(s, 1 - s) * 14))); if (s >= 1) { live.icecream = null; truck.visible = false; } }
  }
  return { launch, showRainbow, tick, targets: [balloon, birds, truck], balloon, REDUCED };
}
