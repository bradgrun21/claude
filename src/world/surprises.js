import * as THREE from 'three';
import { M, mat, mesh, rand } from './palette.js';
import { bakeGroup } from './bake.js';

/* Cosmetic surprises: a hot-air balloon and a flock of birds. They never give points. */
export function createSurprises(scene) {
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

  const live = { balloon: null, birds: null };
  return {
    targets: [balloon, birds],
    launch(kind) {
      if (live[kind]) return false;
      if (kind === 'balloon') { live.balloon = { t: 0, z: -6 + rand() * 12 }; balloon.visible = true; }
      if (kind === 'birds') { live.birds = { t: 0, z: -8 + rand() * 16 }; birds.visible = true; }
      return true;
    },
    tick(dt, t) {
      if (live.balloon) { const u = live.balloon; u.t += dt; balloon.position.set(-22 + u.t * 0.9, 7 + Math.sin(u.t * 0.8) * 0.25, u.z + u.t * 0.25); balloon.rotation.y = u.t * 0.1; if (u.t > 50) { live.balloon = null; balloon.visible = false; } }
      if (live.birds) { const u = live.birds; u.t += dt; birds.position.set(-24 + u.t * 2.6, 5 + Math.sin(u.t) * 0.2, u.z); birds.children.forEach((b) => b.children.forEach((w) => { w.rotation.z = w.userData.side * Math.sin(t * 12 + b.userData.ph) * 0.6; })); if (u.t > 19) { live.birds = null; birds.visible = false; } }
    }
  };
}
