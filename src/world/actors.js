import * as THREE from 'three';
import * as models from './models.js';
import { bakeGroup, partsToGroup } from './bake.js';
import { rand, pick } from './palette.js';
import { REDUCED } from './tween.js';
import { DISTRICTS, SIZE } from '../data/layout.js';
import { tileW, zRow, xCol } from './city.js';

/* Cars, townspeople, chimney smoke and the family's walk to the park. */
const S = DISTRICTS.starter;
const minX = S.cx - 4, minZ = S.cz - 4;
const HAIR = ['#3A2A1E', '#2A1F18', '#5A3A22', '#8A5A30', '#C9A06A', '#1E1A18'];

export function createActors({ scene, city, state }) {
  const group = new THREE.Group(); scene.add(group);
  const cars = [];
  const CAR_COLORS = ['#E8643F', '#F2B54A', '#4E9BCB', '#FFFDF7', '#4CAF6A'];
  function makeCars(art) {
    for (const c of cars) group.remove(c);
    cars.length = 0;
    for (let i = 0; i < 5; i++) {
      const c = art?.car ? partsToGroup(art.car[i % art.car.length].parts) : bakeGroup(models.car(CAR_COLORS[i]));
      const alongX = i % 2 === 0;
      c.userData = { alongX, dir: i % 4 < 2 ? 1 : -1, t: rand(), speed: 0.055 + rand() * 0.03 };
      group.add(c); cars.push(c);
    }
  }
  makeCars();

  const people = [];
  const PCOL = ['#2B3A50', '#B97F62', '#4E7FA0', '#E8643F', '#4CAF6A', '#9A72D6', '#F2B54A'];
  for (let i = 0; i < 9; i++) {
    const p = bakeGroup(models.person(PCOL[i % PCOL.length], i % 3 ? pick(HAIR) : null));
    p.userData = { alongX: i % 2 === 0, side: rand() < 0.5 ? -1 : 1, t: rand(), speed: 0.012 + rand() * 0.012, dir: rand() < 0.5 ? -1 : 1, ph: rand() * 6 };
    group.add(p); people.push(p);
  }

  /* The family, from setup: adults, kids and pets with their own colors. */
  const fam = state.family.map((m, i) => {
    let obj;
    if (m.kind === 'pet') {
      obj = models.dog(m.color);
      const tail = obj.userData.tail;
      obj = bakeWithTail(obj, tail);
    } else {
      obj = bakeGroup(models.person(m.color, HAIR[i % HAIR.length]));
      obj.scale.setScalar(m.kind === 'kid' ? 1.0 : 1.48);
    }
    obj.userData.surprise = m.kind === 'pet' ? 'pets' : 'family';
    obj.userData.member = m;
    group.add(obj);
    return { m, obj };
  });
  function bakeWithTail(dog, tail) {
    dog.remove(tail);
    const scale = dog.scale.x; dog.scale.setScalar(1);
    const g = bakeGroup(dog);
    g.scale.setScalar(scale);
    g.add(tail);
    g.userData.tail = tail;
    return g;
  }
  const famPath = [tileW('starter', 1, 4.55), tileW('starter', 1, 3.46), tileW('starter', 3.5, 3.46), tileW('starter', 4.56, 3.46), tileW('starter', 4.56, 4.2), tileW('starter', 5.05, 4.25), tileW('starter', 5.3, 4.6)];
  const famLens = [0];
  for (let i = 1; i < famPath.length; i++) famLens.push(famLens[i - 1] + famPath[i].distanceTo(famPath[i - 1]));
  const famTotal = famLens.at(-1);
  const walk = { d: 0, dir: 1, pause: 2.5 };
  function alongPath(d) {
    d = THREE.MathUtils.clamp(d, 0, famTotal);
    let i = 1; while (i < famLens.length - 1 && famLens[i] < d) i++;
    const a = famPath[i - 1], b = famPath[i], k = (d - famLens[i - 1]) / (famLens[i] - famLens[i - 1] || 1);
    return { p: a.clone().lerp(b, k), dir: b.clone().sub(a) };
  }

  const smoke = [];
  const smokeGeo = new THREE.IcosahedronGeometry(0.05, 0);
  let smokeT = 0;
  const _n = new THREE.Vector3();

  function tick(dt, t, sv) {
    if (!REDUCED) {
      for (const c of cars) {
        const u = c.userData; u.t += u.speed * dt; if (u.t > 1) u.t -= 1;
        const s = u.dir > 0 ? u.t : 1 - u.t;
        if (u.alongX) { c.position.set(minX + 0.1 + s * (SIZE - 0.2), 0.02, zRow + (u.dir > 0 ? 0.2 : -0.2)); c.rotation.y = u.dir > 0 ? 0 : Math.PI; }
        else { c.position.set(xCol + (u.dir > 0 ? -0.2 : 0.2), 0.02, minZ + 0.1 + s * (SIZE - 0.2)); c.rotation.y = u.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
        c.scale.setScalar(Math.max(0.001, Math.min(1, Math.min(s, 1 - s) * 14)));
      }
      for (const p of people) {
        const u = p.userData; u.t += u.speed * dt * u.dir;
        if (u.t > 1 || u.t < 0) { u.dir *= -1; u.t = THREE.MathUtils.clamp(u.t, 0, 1); }
        const bob = 0.035 + Math.abs(Math.sin(t * 8 + u.ph)) * 0.015;
        if (u.alongX) { p.position.set(minX + 0.3 + u.t * (SIZE - 0.6), bob, zRow + u.side * 0.44); p.rotation.y = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { p.position.set(xCol + u.side * 0.44, bob, minZ + 0.3 + u.t * (SIZE - 0.6)); p.rotation.y = u.dir > 0 ? 0 : Math.PI; }
      }
      smokeT += dt;
      if (smokeT > 0.9 && city.chimneys.length) {
        smokeT = 0;
        const m = new THREE.Mesh(smokeGeo, new THREE.MeshStandardMaterial({ color: '#F4F4F4', transparent: true, opacity: 0.8, flatShading: true }));
        m.position.copy(pick(city.chimneys)); m.userData.life = 0;
        group.add(m); smoke.push(m);
      }
      if (walk.pause > 0) walk.pause -= dt;
      else { walk.d += walk.dir * dt * 0.32; if (walk.d > famTotal + 0.9 || walk.d < 0) { walk.dir *= -1; walk.d = THREE.MathUtils.clamp(walk.d, 0, famTotal + 0.9); walk.pause = 4; } }
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const m = smoke[i]; m.userData.life += dt;
      const l = m.userData.life / 2.4;
      m.position.y += dt * 0.22; m.position.x += dt * 0.08;
      m.scale.setScalar(1 + l * 2.2); m.material.opacity = 0.75 * (1 - l);
      if (l >= 1) { group.remove(m); m.material.dispose(); smoke.splice(i, 1); }
    }
    let pets = 0;
    fam.forEach(({ m, obj }, i) => {
      const isPet = m.kind === 'pet';
      const gap = isPet ? 0.22 + pets++ * 0.12 : i * 0.16;
      const a = alongPath(walk.d - gap);
      const side = isPet ? 0.08 : (i % 2 ? -0.05 : 0.05);
      _n.set(-a.dir.z, 0, a.dir.x).normalize().multiplyScalar(side);
      obj.position.set(a.p.x + _n.x, 0.035 + (walk.pause > 0 ? 0 : Math.abs(Math.sin(t * (isPet ? 14 : 9) + i)) * 0.014), a.p.z + _n.z);
      const heading = Math.atan2(a.dir.x, a.dir.z) + (walk.dir > 0 ? 0 : Math.PI);
      obj.rotation.y = isPet ? heading - Math.PI / 2 : heading;
      if (isPet && obj.userData.tail) obj.userData.tail.rotation.y = Math.sin(t * (obj.userData.wagUntil > performance.now() ? 40 : 12)) * 0.6;
    });
  }
  return {
    tick, fam, makeCars,
    leaderPos: () => (fam[0] ? fam[0].obj.position : null),
    tapTargets: fam.map((f) => f.obj),
    wag() { const until = performance.now() + 1600; fam.forEach((f) => { if (f.m.kind === 'pet') f.obj.userData.wagUntil = until; }); }
  };
}
