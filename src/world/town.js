import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { byId } from '../data/catalog.js';
import { tileCenter, key } from '../data/map.js';
import { footprint } from '../systems/placement.js';
import { buildModel } from './townModels.js';
import * as models from './models.js';
import { bakeGroup } from './bake.js';
import { tween, easeOutBack, REDUCED } from './tween.js';
import { rand, pick } from './palette.js';

const hashId = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
export function footprintCenter(type, i, j, rot = 0) {
  const [w, d] = byId[type].size;
  const [fw, fd] = rot % 2 ? [d, w] : [w, d];
  const [x, z] = tileCenter(i, j);
  return new THREE.Vector3(x + (fw - 1) / 2, 0, z + (fd - 1) / 2);
}

/* ---------- Buildings on the map ---------- */
export function createBuildings(scene, fx) {
  const root = new THREE.Group(); scene.add(root);
  const hits = new THREE.Group(); hits.visible = false; scene.add(hits);
  const views = new Map();
  const hitGeo = new THREE.BoxGeometry(1, 1, 1);
  const box3 = new THREE.Box3();
  function make(rec) {
    const def = byId[rec.type];
    const w = def.size[0];
    const g = bakeGroup(buildModel(rec.type, w, rec.type === 'townhall' ? rec.level : rec.level || 1, hashId(rec.id)));
    g.position.copy(footprintCenter(rec.type, rec.i, rec.j, rec.rot));
    g.rotation.y = -(rec.rot || 0) * Math.PI / 2;
    return g;
  }
  function add(rec, animate = false) {
    const obj = make(rec);
    root.add(obj);
    box3.setFromObject(obj);
    const h = Math.max(0.4, box3.max.y);
    const [w, d] = byId[rec.type].size;
    const hit = new THREE.Mesh(hitGeo);
    hit.scale.set((rec.rot % 2 ? d : w) * 0.96, h, (rec.rot % 2 ? w : d) * 0.96);
    hit.position.set(obj.position.x, h / 2, obj.position.z);
    hit.userData = { kind: 'building', id: rec.id };
    hits.add(hit); hit.updateMatrixWorld();
    const view = { rec, obj, hit, top: new THREE.Vector3(obj.position.x, h + 0.25, obj.position.z) };
    views.set(rec.id, view);
    if (animate) fx.pop(obj);
    return view;
  }
  function remove(id) {
    const v = views.get(id);
    if (!v) return;
    root.remove(v.obj); hits.remove(v.hit);
    v.obj.traverse((o) => { if (o.isMesh && o.geometry) o.geometry.dispose(); });
    views.delete(id);
  }
  return {
    views, hits, root,
    add, remove,
    rebuild(rec, animate = true) { remove(rec.id); return add(rec, animate); },
    bounce(id) { const v = views.get(id); if (v) fx.bounce(v.obj); },
    make
  };
}

/* ---------- Placement preview ---------- */
export function createGhost(scene) {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const plateOk = new THREE.MeshBasicMaterial({ color: '#59D36B', transparent: true, opacity: 0.45, depthWrite: false });
  const plateNo = new THREE.MeshBasicMaterial({ color: '#9AA6B2', transparent: true, opacity: 0.55, depthWrite: false });
  const plate = new THREE.Mesh(new RoundedBoxGeometry(1, 0.02, 1, 2, 0.08), plateOk);
  plate.position.y = 0.02; g.add(plate);
  let model = null, current = null;
  const ghost = {
    group: g, i: 0, j: 0, rot: 0, type: null, ok: false,
    show(type, i, j, rot, makeModel) {
      if (current !== type) { if (model) g.remove(model); model = makeModel(); g.add(model); current = type; }
      ghost.type = type; g.visible = true; ghost.move(i, j, rot);
    },
    move(i, j, rot = ghost.rot) {
      ghost.i = i; ghost.j = j; ghost.rot = rot;
      const c = footprintCenter(ghost.type, i, j, rot);
      g.position.set(c.x, 0, c.z);
      const [w, d] = byId[ghost.type].size;
      plate.scale.set((rot % 2 ? d : w) - 0.06, 1, (rot % 2 ? w : d) - 0.06);
      if (model) model.rotation.y = -rot * Math.PI / 2;
    },
    setValid(ok) { ghost.ok = ok; plate.material = ok ? plateOk : plateNo; },
    hide() { g.visible = false; if (model) { g.remove(model); model = null; current = null; } },
    tick(t) { if (model && g.visible && !REDUCED) model.position.y = 0.08 + Math.sin(t * 5) * 0.04; }
  };
  return ghost;
}

/* ---------- People and cars wandering the roads ---------- */
const HAIR = ['#3A2A1E', '#2A1F18', '#5A3A22', '#8A5A30', '#C9A06A', '#1E1A18'];
const CAR_COLORS = ['#E8643F', '#F2B54A', '#4E9BCB', '#FFFDF7', '#4CAF6A', '#9A72D6'];
export function createWalkers(scene) {
  const root = new THREE.Group(); scene.add(root);
  let roads = new Set(), list = [];
  const walkers = [];
  const neighbors = (k) => { const [i, j] = k.split(',').map(Number); return [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].map(([a, b]) => key(a, b)).filter((n) => roads.has(n)); };
  function spawn(obj, isCar, speed, data = {}) {
    const w = { obj, isCar, speed, t: rand(), from: null, to: null, side: rand() < 0.5 ? 1 : -1, ...data };
    place(w);
    root.add(obj); walkers.push(w);
    return w;
  }
  function place(w) {
    if (!list.length) { w.obj.visible = false; return; }
    w.obj.visible = true;
    w.from = pick(list);
    const n = neighbors(w.from);
    w.to = n.length ? pick(n) : w.from;
  }
  function setRoads(keys) {
    roads = new Set(keys); list = [...roads];
    for (const w of walkers) if (!roads.has(w.from) || !roads.has(w.to)) place(w);
  }
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3(), side = new THREE.Vector3();
  function tick(dt, time) {
    if (REDUCED) return;
    for (const w of walkers) {
      if (!w.from || !w.obj.visible) continue;
      w.t += dt * w.speed;
      if (w.t >= 1) {
        w.t -= 1;
        const prev = w.from; w.from = w.to;
        const n = neighbors(w.from);
        const choices = n.length > 1 ? n.filter((x) => x !== prev) : n;
        w.to = choices.length ? pick(choices) : w.from;
        if (!roads.has(w.from)) place(w);
      }
      const [fi, fj] = w.from.split(',').map(Number), [ti, tj] = w.to.split(',').map(Number);
      const [fx, fz] = tileCenter(fi, fj), [tx, tz] = tileCenter(ti, tj);
      a.set(fx, 0, fz); b.set(tx, 0, tz);
      dir.copy(b).sub(a);
      const len = dir.length();
      if (len < 0.01) { w.obj.position.copy(a); continue; }
      dir.divideScalar(len);
      side.set(-dir.z, 0, dir.x).multiplyScalar(w.isCar ? 0.2 : 0.4 * w.side);
      w.obj.position.copy(a).lerp(b, w.t).add(side);
      w.obj.position.y = w.isCar ? 0.03 : 0.04 + Math.abs(Math.sin(time * 9 + w.speed * 50)) * 0.015;
      w.obj.rotation.y = Math.atan2(dir.x, dir.z) + (w.isCar ? -Math.PI / 2 : 0) + (w.isPet ? -Math.PI / 2 : 0);
      if (w.isPet && w.obj.userData.tail) w.obj.userData.tail.rotation.y = Math.sin(time * 14) * 0.6;
    }
  }
  function setCounts(people, cars) {
    const have = { p: walkers.filter((w) => !w.isCar && !w.family).length, c: walkers.filter((w) => w.isCar).length };
    for (let k = have.p; k < people; k++) { const o = bakeGroup(models.person(['#2B3A50', '#B97F62', '#4E7FA0', '#E8643F', '#4CAF6A', '#9A72D6', '#F2B54A'][k % 7], k % 3 ? HAIR[k % 6] : null)); o.userData.surprise = 'neighbor'; o.userData.nb = k; spawn(o, false, 0.35 + rand() * 0.25); }
    for (let k = have.c; k < cars; k++) spawn(bakeGroup(models.car(CAR_COLORS[k % 6])), true, 0.9 + rand() * 0.5);
  }
  function addFamily(family) {
    family.forEach((m, k) => {
      let obj;
      if (m.kind === 'pet') {
        const d = models.dog(m.color); const tail = d.userData.tail; d.remove(tail);
        const s = d.scale.x; d.scale.setScalar(1); obj = bakeGroup(d); obj.scale.setScalar(s); obj.add(tail); obj.userData.tail = tail;
        obj.userData.surprise = 'pets';
      } else {
        obj = bakeGroup(models.person(m.color, HAIR[k % 6]));
        obj.scale.setScalar(m.kind === 'kid' ? 1.05 : 1.45);
        obj.userData.surprise = 'family';
      }
      obj.userData.member = m;
      spawn(obj, false, 0.32, { family: true, isPet: m.kind === 'pet' });
    });
  }
  return { setRoads, setCounts, addFamily, tick, familyObjs: () => walkers.filter((w) => w.family).map((w) => w.obj), peopleObjs: () => walkers.filter((w) => !w.isCar && !w.family).map((w) => w.obj), pause(obj, ms) { const w = walkers.find((x) => x.obj === obj); if (w) { const sp = w.speed; w.speed = 0; setTimeout(() => { w.speed = sp; }, ms); } } };
}
