import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { M, mat, mesh, rand, seeded } from './palette.js';
import { bakeParts, bakeGroup, InstancedSet, swayMaterial } from './bake.js';
import * as models from './models.js';
import { tween, later, easeInOut, easeOutBack, REDUCED } from './tween.js';
import { DISTRICTS, SIZE, tileXZ, isStarterRoad, SPECIAL_TILES, PARK_CENTER, TREE_TILES, LOTS } from '../data/layout.js';
import { MAX_FLOORS } from '../systems/build.js';

const LOCKED_KEYS = ['riverside', 'bridgeview', 'hillside'];
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const tileW = (d, x, z) => { const [wx, wz] = tileXZ(d, x, z); return v3(wx, 0, wz); };
const S = DISTRICTS.starter;
export const zRow = tileW('starter', 0, 3).z;
export const xCol = tileW('starter', 4, 0).x;

export function createCity({ stage, state, tags, fx }) {
  const { scene } = stage;
  const root = new THREE.Group(); scene.add(root);
  const hitRoot = new THREE.Group(); hitRoot.visible = false; scene.add(hitRoot);
  const houses = new InstancedSet(root);
  const trees = new InstancedSet(root);
  const lamps = new InstancedSet(root);
  const crops = new InstancedSet(root);
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
  const compose = (pos, rotY = 0, scale = 1) => new THREE.Matrix4().compose(pos, _q.setFromAxisAngle(_y, rotY), _s.set(scale, scale, scale));

  const city = {
    root, hitRoot, specials: {}, views: new Map(), lots: new Map(), foams: [], treeRecs: [], art: {}, chimneys: [],
    districtGrass: {}, fog: {}, districtTags: {}, bridges: {}, unlockedNow: new Set(['starter'])
  };

  /* ---------- Templates (procedural, baked) ---------- */
  function defineProceduralHouses() {
    for (let v = 0; v < 5; v++) for (let f = 1; f <= MAX_FLOORS; f++) houses.define(`p-${v}-${f}`, bakeParts(models.house({ roof: mat.roofs[v], wall: mat.walls[v], floors: f })));
  }
  defineProceduralHouses();
  const treeKinds = [];
  for (let i = 0; i < 4; i++) { trees.define(`round${i}`, bakeParts(models.tree('round', mat.leaf[i], mat.leaf[(i + 2) % 4])).map((p) => ({ ...p, material: swayMaterial(p.material) }))); treeKinds.push(`round${i}`); }
  trees.define('pine', bakeParts(models.tree('pine')).map((p) => ({ ...p, material: swayMaterial(p.material) })));
  lamps.define('lamp', bakeParts(models.lamp()));
  crops.define('c0', bakeParts(models.crop(0)));
  crops.define('c1', bakeParts(models.crop(1)));

  function addTree(pos, scale = 0.8 + rand() * 0.45, kind = rand() < 0.3 ? 'pine' : treeKinds[Math.floor(rand() * 4)], district = 'starter') {
    const rec = { pos: pos.clone(), scale, rot: rand() * Math.PI * 2, kind, district };
    rec.id = trees.add(kind, compose(rec.pos, rec.rot, scale));
    city.treeRecs.push(rec);
    return rec;
  }
  function setTreeScale(rec, s) { trees.setMatrix(rec.id, compose(rec.pos, rec.rot, Math.max(0.001, s))); }

  /* ---------- District slabs ---------- */
  const slabGeoDirt = new RoundedBoxGeometry(SIZE, 1.3, SIZE, 2, 0.22);
  const slabGeoGrass = new RoundedBoxGeometry(SIZE + 0.02, 0.2, SIZE + 0.02, 2, 0.08);
  const strataGeo = new RoundedBoxGeometry(SIZE + 0.04, 0.32, SIZE + 0.04, 2, 0.12);
  const foamGeo = new RoundedBoxGeometry(SIZE + 0.5, 0.04, SIZE + 0.5, 2, 0.24);
  for (const [key, d] of Object.entries(DISTRICTS)) {
    const open = key === 'starter' || !!state.unlocked[key];
    const g = new THREE.Group();
    g.position.set(d.cx, 0, d.cz);
    const base = new THREE.Group();
    const dirt = mesh(slabGeoDirt, mat.dirt); dirt.position.y = -0.76; base.add(dirt);
    const strata = mesh(strataGeo, mat.rock); strata.position.y = -1.25; base.add(strata);
    g.add(bakeGroup(base));
    const grassMat = open ? mat.grass : M('#BFD0B0');
    const grass = mesh(slabGeoGrass, grassMat); grass.position.y = -0.1; g.add(grass);
    city.districtGrass[key] = grassMat;
    const foam = new THREE.Mesh(foamGeo, mat.foam); foam.position.y = -0.9; g.add(foam); city.foams.push(foam);
    root.add(g);
    if (open && key !== 'starter') city.unlockedNow.add(key);
  }

  /* ---------- Starter roads + lamps (baked into one mesh) ---------- */
  const roadGeo = new THREE.BoxGeometry(1, 0.02, 1);
  const walkGeoX = new THREE.BoxGeometry(1, 0.035, 0.12), walkGeoZ = new THREE.BoxGeometry(0.12, 0.035, 1);
  const dashGeoX = new THREE.BoxGeometry(0.26, 0.005, 0.04), dashGeoZ = new THREE.BoxGeometry(0.04, 0.005, 0.26);
  const cornerGeo = new THREE.BoxGeometry(0.12, 0.035, 0.12), zebraGeo = new THREE.BoxGeometry(0.06, 0.006, 0.18);
  function roadTile(group, p, horizontal, vertical) {
    const r = mesh(roadGeo, mat.road, false, true); r.position.set(p.x, 0.01, p.z); group.add(r);
    if (horizontal && !vertical) {
      for (const s of [-1, 1]) { const w = mesh(walkGeoX, mat.walk, false, true); w.position.set(p.x, 0.02, p.z + s * 0.44); group.add(w); }
      const dsh = mesh(dashGeoX, mat.paint, false, true); dsh.position.set(p.x, 0.022, p.z); group.add(dsh);
    } else if (vertical && !horizontal) {
      for (const s of [-1, 1]) { const w = mesh(walkGeoZ, mat.walk, false, true); w.position.set(p.x + s * 0.44, 0.02, p.z); group.add(w); }
      const dsh = mesh(dashGeoZ, mat.paint, false, true); dsh.position.set(p.x, 0.022, p.z); group.add(dsh);
    } else {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = mesh(cornerGeo, mat.walk, false, true); c.position.set(p.x + sx * 0.44, 0.02, p.z + sz * 0.44); group.add(c); }
      for (const sx of [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3]) { const zb = mesh(zebraGeo, mat.paint, false, true); zb.position.set(p.x + sx, 0.022, p.z + 0.36); group.add(zb); }
    }
  }
  {
    const g = new THREE.Group();
    for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) if (isStarterRoad(x, z)) roadTile(g, tileW('starter', x, z), z === 3, x === 4);
    root.add(bakeGroup(g));
    for (const x of [0, 2, 6]) { const p = tileW('starter', x, 3); lamps.add('lamp', compose(v3(p.x, 0, p.z - 0.44))); }
    for (const z of [1, 5, 7]) { const p = tileW('starter', 4, z); lamps.add('lamp', compose(v3(p.x + 0.44, 0, p.z))); }
  }

  /* ---------- Hit boxes (invisible, raycast only) ---------- */
  const hitGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  function addHit(pos, data, h = 0.9, size = 0.9) {
    const hit = new THREE.Mesh(hitGeo);
    hit.scale.set(size / 0.9, h / 0.9, size / 0.9);
    hit.position.set(pos.x, h / 2, pos.z);
    hit.userData = data;
    hitRoot.add(hit);
    hit.updateMatrixWorld();
    return hit;
  }

  /* ---------- Special buildings ---------- */
  function placeSpecial(id, obj, tile, rot = 0, hitH = 0.9) {
    const p = tileW('starter', tile[0], tile[1]);
    obj.position.set(p.x, 0, p.z); obj.rotation.y = rot;
    root.add(obj);
    city.specials[id] = obj;
    addHit(p, { kind: 'special', id }, hitH);
    return obj;
  }
  placeSpecial('chapel', bakeGroup(models.chapel()), SPECIAL_TILES.chapel, 0, 1.4);
  placeSpecial('bank', bakeGroup(models.bank()), SPECIAL_TILES.bank, -Math.PI / 2);
  placeSpecial('grocery', bakeGroup(models.grocery()), SPECIAL_TILES.grocery, 0);
  placeSpecial('diner', bakeGroup(models.diner()), SPECIAL_TILES.diner, 0);
  placeSpecial('townhall', bakeGroup(models.townHall()), SPECIAL_TILES.townhall, 0, 1.2);
  /* Cushion tower (water tower) */
  {
    const g = new THREE.Group();
    g.add(bakeGroup(models.waterTowerShell()));
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.46, 20, 1, true), new THREE.MeshStandardMaterial({ color: '#F3EEE4', roughness: 0.6, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
    tank.position.y = 1.15; g.add(tank);
    const water = mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.44, 20), new THREE.MeshStandardMaterial({ color: '#3E9BD3', roughness: 0.2, emissive: new THREE.Color('#2E7FB8'), emissiveIntensity: 0.15 }), true, false);
    g.add(water);
    g.userData.water = water;
    placeSpecial('tower', g, SPECIAL_TILES.tower, 0, 1.6);
  }
  city.setTowerFill = (f) => {
    const w = city.specials.tower.userData.water;
    const h = Math.max(0.01, 0.44 * Math.min(1, Math.max(0, f)));
    w.scale.y = h / 0.44; w.position.y = 0.94 + h / 2;
  };
  /* Order board */
  {
    const src = models.orderBoard();
    const notes = src.userData.notes;
    const g = bakeGroup(src);
    for (const n of notes) g.add(n);
    g.userData.notes = notes;
    placeSpecial('board', g, SPECIAL_TILES.board, 0, 0.8);
  }
  city.setBoardNotes = (n) => city.specials.board.userData.notes.forEach((note, i) => { note.visible = i < n; });
  /* Debt-free clock tower */
  {
    const src = models.clockTower();
    const hands = src.userData.hands;
    const g = bakeGroup(src);
    for (const h of hands) g.add(h.holder);
    g.userData.hands = hands;
    placeSpecial('clock', g, SPECIAL_TILES.clock, 0, 2.1);
  }
  city.clockSpin = 0;
  city.spinClock = (turns = 2) => { const s0 = city.clockSpin; tween(1600, (k) => { city.clockSpin = s0 + turns * easeInOut(k); }); };
  /* Garden */
  placeSpecial('garden', bakeGroup(models.gardenBed()), SPECIAL_TILES.garden, 0, 0.4);
  const cropIds = [];
  city.setGarden = (n, popNew = false) => {
    while (cropIds.length) crops.remove(cropIds.pop());
    const base = city.specials.garden.position;
    const shown = Math.min(25, n);
    for (let i = 0; i < shown; i++) {
      const cx = (i % 5) - 2, cz = Math.floor(i / 5) - 2;
      const pos = v3(base.x + cx * 0.15, 0.06, base.z + cz * 0.16);
      cropIds.push(crops.add(i % 3 === 2 ? 'c1' : 'c0', compose(pos, (i * 1.7) % 6.28, 1)));
      if (popNew && i === shown - 1) { const id = cropIds.at(-1); tween(500, (k) => crops.setMatrix(id, compose(pos, 0, Math.max(0.001, easeOutBack(k))))); }
    }
  };
  /* Main park (2×2) */
  {
    const g = new THREE.Group();
    const c = tileW('starter', PARK_CENTER[0], PARK_CENTER[1]);
    const lawn = mesh(new RoundedBoxGeometry(1.86, 0.04, 1.86, 2, 0.08), M('#A3D47A')); lawn.position.set(0, 0.01, 0); g.add(lawn);
    const pond = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 20), mat.pond, false, true); pond.scale.set(1.2, 1, 0.8); pond.position.set(0.25, 0.03, 0.25); g.add(pond);
    const path = mesh(new THREE.BoxGeometry(1.7, 0.012, 0.14), mat.walk, false, true); path.position.set(0, 0.035, -0.42); g.add(path);
    const b1 = models.bench(); b1.position.set(-0.45, 0.02, -0.25); g.add(b1);
    const fl = models.flowers(10, 0.6); fl.position.set(-0.25, 0.02, 0.1); g.add(fl);
    const baked = bakeGroup(g);
    baked.position.copy(c);
    root.add(baked);
    city.specials.park = baked;
    for (const [dx, dz] of [[-0.7, 0.55], [-0.45, 0.75], [0.7, -0.7], [-0.75, -0.7]]) addTree(v3(c.x + dx, 0.02, c.z + dz), 0.8 + rand() * 0.45, treeKinds[Math.floor(rand() * 4)]);
    addHit(c, { kind: 'special', id: 'park' }, 0.4, 1.8);
  }
  /* Trees on open tiles */
  for (const [x, z] of TREE_TILES) {
    const n = 1 + Math.floor(rand() * 2.4);
    for (let i = 0; i < n; i++) { const p = tileW('starter', x, z); addTree(v3(p.x + (rand() - 0.5) * 0.55, 0, p.z + (rand() - 0.5) * 0.55)); }
  }
  /* Trees in other districts (peeking out of the fog until a real money step opens them) */
  for (const key of LOCKED_KEYS) {
    const lotSet = new Set(LOTS[key].map(([x, z]) => `${x},${z}`));
    const rr = seeded(key.length * 97);
    let placed = 0, guard = 0;
    while (placed < 16 && guard++ < 200) {
      const tx = Math.floor(rr() * 8), tz = Math.floor(rr() * 8);
      if (lotSet.has(`${tx},${tz}`)) continue;
      const p = tileW(key, tx, tz);
      addTree(v3(p.x + (rr() - 0.5) * 0.6, 0, p.z + (rr() - 0.5) * 0.6), 0.8 + rr() * 0.45, rr() < 0.3 ? 'pine' : treeKinds[Math.floor(rr() * 4)], key);
      placed++;
    }
  }

  /* ---------- Fog over locked districts (instanced puffs) ---------- */
  const fogGeo = new THREE.SphereGeometry(1, 14, 10);
  for (const key of LOCKED_KEYS) {
    if (city.unlockedNow.has(key)) continue;
    const d = DISTRICTS[key];
    const m = mat.fog.clone();
    const N = 26;
    const im = new THREE.InstancedMesh(fogGeo, m, N);
    im.frustumCulled = false;
    const puffs = [];
    const rr = seeded(key.length * 31 + 5);
    for (let i = 0; i < N; i++) {
      const s = 0.8 + rr() * 0.7;
      const p = { x: d.cx + (rr() - 0.5) * 7, y: 0.35 + rr() * 0.45, z: d.cz + (rr() - 0.5) * 7, sx: s * 1.3, sy: s * 0.42, ph: rr() * 6.28, lift: 0 };
      puffs.push(p);
      im.setMatrixAt(i, new THREE.Matrix4().compose(v3(p.x, p.y, p.z), _q.identity(), v3(p.sx, p.sy, p.sx)));
    }
    root.add(im);
    city.fog[key] = { im, puffs, mat: m, off: 0 };
  }
  function updateFog(t) {
    for (const f of Object.values(city.fog)) {
      for (let i = 0; i < f.puffs.length; i++) {
        const p = f.puffs[i];
        _m.compose(_s.set(p.x, p.y + Math.sin(t * 0.6 + p.ph) * 0.06 + f.off * (2.5 + p.lift * 3), p.z), _q.identity(), v3(p.sx, p.sy, p.sx));
        f.im.setMatrixAt(i, _m);
      }
      f.im.instanceMatrix.needsUpdate = true;
    }
  }

  /* ---------- Clouds (instanced) ---------- */
  const cloudGeo = new THREE.SphereGeometry(1, 14, 9);
  const cloudPuffs = [];
  const clouds = [];
  for (let i = 0; i < 5; i++) {
    const c = { x: -22 + i * 8 + rand() * 4, y: 12 + rand() * 2, z: -16 + rand() * 14, speed: 0.25 + rand() * 0.2, puffs: [] };
    const n = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) { const s = 0.45 + rand() * 0.45; c.puffs.push({ dx: k * 0.6 - n * 0.3, dy: rand() * 0.25, dz: (rand() - 0.5) * 0.6, s }); cloudPuffs.push(1); }
    clouds.push(c);
  }
  const cloudIM = new THREE.InstancedMesh(cloudGeo, mat.cloud, cloudPuffs.length);
  cloudIM.castShadow = true; cloudIM.frustumCulled = false;
  root.add(cloudIM);
  function updateClouds(dt) {
    let i = 0;
    for (const c of clouds) {
      c.x += c.speed * dt; if (c.x > 26) c.x = -26;
      for (const p of c.puffs) { _m.compose(_s.set(c.x + p.dx, c.y + p.dy, c.z + p.dz), _q.identity(), v3(p.s * 1.3, p.s * 0.75, p.s)); cloudIM.setMatrixAt(i++, _m); }
    }
    cloudIM.instanceMatrix.needsUpdate = true;
  }
  updateClouds(0);

  /* ---------- Walls: payoff date = levee, full cushion = seawall ---------- */
  const wallMat = M('#8E7C69');
  const wallSegs = [];
  for (let i = 0; i < 8; i++) {
    for (const [gx, gz, skip, alongX] of [[i, -0.5, i === 4, true], [i, 7.5, i === 4, true], [-0.5, i, i === 3, false], [7.5, i, i === 3, false]]) {
      if (skip) continue;
      const p = tileW('starter', alongX ? gx : 0, alongX ? 0 : gz);
      const x = alongX ? p.x : S.cx - 4 + 0.07 + (gx > 0 ? 7.86 : 0);
      const z = alongX ? S.cz - 4 + 0.07 + (gz > 0 ? 7.86 : 0) : p.z;
      wallSegs.push({ x, z, alongX, h: 0 });
    }
  }
  const wallIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), wallMat, wallSegs.length);
  wallIM.castShadow = true; wallIM.receiveShadow = true; wallIM.frustumCulled = false; wallIM.visible = false;
  root.add(wallIM);
  function writeWall(i) {
    const w = wallSegs[i];
    _m.compose(_s.set(w.x, w.h / 2, w.z), _q.identity(), w.alongX ? v3(1, Math.max(0.001, w.h), 0.14) : v3(0.14, Math.max(0.001, w.h), 1));
    wallIM.setMatrixAt(i, _m);
  }
  city.wallH = 0;
  city.setWall = (h, animate = true) => {
    const h0 = city.wallH; city.wallH = h;
    wallIM.visible = h > 0;
    wallSegs.forEach((w, i) => {
      if (!animate || REDUCED) { w.h = h; writeWall(i); wallIM.instanceMatrix.needsUpdate = true; return; }
      setTimeout(() => tween(700, (k) => { w.h = h0 + (h - h0) * easeOutBack(k); writeWall(i); wallIM.instanceMatrix.needsUpdate = true; }), i * 25);
    });
  };

  /* ---------- Kids' Corner island ---------- */
  const KC = v3(S.cx + 4 + 0.7 + 2.5, 0, S.cz + 1.0);
  city.kidsCenter = KC;
  {
    const kids = new THREE.Group();
    const dirt = mesh(new RoundedBoxGeometry(5, 1.3, 5, 2, 0.22), mat.dirt); dirt.position.y = -0.76; kids.add(dirt);
    const strata = mesh(new RoundedBoxGeometry(5.04, 0.32, 5.04, 2, 0.12), mat.rock); strata.position.y = -1.25; kids.add(strata);
    const grass = mesh(new RoundedBoxGeometry(5.02, 0.2, 5.02, 2, 0.08), M('#9AD06F')); grass.position.y = -0.1; kids.add(grass);
    const matS = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.03, 28), M('#F7A9B9', { flatShading: false })); matS.position.set(0.2, 0.015, 0.4); kids.add(matS);
    const plat = mesh(new THREE.BoxGeometry(0.3, 0.04, 0.3), M('#4E9BCB')); plat.position.set(-0.1, 0.42, 0.3); kids.add(plat);
    for (const [x, z] of [[-0.24, 0.16], [0.04, 0.16], [-0.24, 0.44], [0.04, 0.44]]) { const p = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), M('#F2B54A')); p.position.set(x, 0.21, z); kids.add(p); }
    const roofS = mesh(new THREE.ConeGeometry(0.24, 0.18, 4), M('#E8643F')); roofS.rotation.y = Math.PI / 4; roofS.position.set(-0.1, 0.62, 0.3); kids.add(roofS);
    const ramp = mesh(new THREE.BoxGeometry(0.16, 0.025, 0.62), M('#E8643F')); ramp.position.set(-0.1, 0.22, 0.72); ramp.rotation.x = 0.68; kids.add(ramp);
    for (const x of [0.45, 1.05]) for (const dz of [-0.12, 0.12]) { const l = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.52, 5), M('#4E9BCB')); l.position.set(x, 0.24, 0.55 + dz); l.rotation.x = dz > 0 ? -0.24 : 0.24; kids.add(l); }
    const bar = mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 6), M('#4E9BCB')); bar.rotation.z = Math.PI / 2; bar.position.set(0.75, 0.5, 0.55); kids.add(bar);
    for (const x of [0.62, 0.88]) { const seat = mesh(new THREE.BoxGeometry(0.1, 0.015, 0.06), M('#F2B54A')); seat.position.set(x, 0.18, 0.55); kids.add(seat); for (const dx of [-0.04, 0.04]) { const r = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.32, 3), mat.navy, false); r.position.set(x + dx, 0.34, 0.55); kids.add(r); } }
    const school = models.schoolhouse(); school.position.set(-1.3, 0, -1.3); kids.add(school);
    const pig = new THREE.Group(); pig.position.set(1.3, 0, -1.2);
    const pinkM = M('#F6A5B8', { flatShading: false, roughness: 0.6 });
    const body = mesh(new THREE.SphereGeometry(0.3, 20, 14), pinkM); body.scale.set(1.15, 0.92, 0.9); body.position.y = 0.42; pig.add(body);
    const snout = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 14), pinkM); snout.rotation.z = Math.PI / 2; snout.position.set(0.36, 0.42, 0); pig.add(snout);
    for (const z of [-0.12, 0.12]) { const ear = mesh(new THREE.ConeGeometry(0.06, 0.12, 6), pinkM); ear.position.set(0.18, 0.7, z); pig.add(ear); }
    for (const [x, z] of [[-0.18, -0.14], [0.18, -0.14], [-0.18, 0.14], [0.18, 0.14]]) { const leg = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10), pinkM); leg.position.set(x, 0.08, z); pig.add(leg); }
    const slot = mesh(new THREE.BoxGeometry(0.14, 0.01, 0.03), mat.navy, false); slot.position.set(0, 0.7, 0); pig.add(slot);
    for (const z of [-0.07, 0.07]) { const eye = mesh(new THREE.SphereGeometry(0.02, 6, 4), mat.navy, false); eye.position.set(0.3, 0.52, z); pig.add(eye); }
    kids.add(pig);
    const stand = models.DECO_MODEL.kiosk(); stand.position.set(-1.3, 0, 1.25); kids.add(stand);
    const hut = mesh(new THREE.BoxGeometry(0.3, 0.2, 0.26), M('#C98F5E')); hut.position.set(1.4, 0.42, 1.3); kids.add(hut);
    const hroof = mesh(models.prism(0.36, 0.14, 0.3), mat.roofs[2]); hroof.position.set(1.4, 0.52, 1.3); kids.add(hroof);
    const fl = models.flowers(14, 1.9); kids.add(fl);
    const baked = bakeGroup(kids);
    baked.position.copy(KC);
    root.add(baked);
    const foam = new THREE.Mesh(new RoundedBoxGeometry(5.5, 0.04, 5.5, 2, 0.24), mat.foam); foam.position.set(KC.x, -0.9, KC.z); root.add(foam); city.foams.push(foam);
    addTree(v3(KC.x + 1.4, 0, KC.z + 1.3), 1.6, 'round1');
    for (const [x, z] of [[-2, -0.2], [-1.9, 0.4], [0.3, -1.9], [2.0, 0.1], [-0.4, 2.0], [0.6, -1.0]]) addTree(v3(KC.x + x, 0, KC.z + z));
    const kb = new THREE.Group();
    const deck = mesh(new THREE.BoxGeometry(1.0, 0.06, 0.9), mat.road); kb.add(deck);
    for (const s of [-1, 1]) { const rail = mesh(new THREE.BoxGeometry(1.0, 0.08, 0.04), mat.white); rail.position.set(0, 0.07, s * 0.44); kb.add(rail); }
    const kbB = bakeGroup(kb); kbB.position.set(S.cx + 4 + 0.35, 0, zRow); root.add(kbB);
    city.specials.kids = baked;
    addHit(KC, { kind: 'special', id: 'kids' }, 0.8, 4.5);
  }

  /* ---------- Buildings from state ---------- */
  function houseKey(rec) {
    const art = city.art.house;
    if (art && rec.kind === 'home') {
      const tiers = art.length;
      const tier = Math.min(tiers - 1, Math.floor(((rec.floors - 1) / MAX_FLOORS) * tiers + (rec.variant % Math.max(1, Math.ceil(tiers / MAX_FLOORS)))));
      return `g-${Math.max(0, tier)}`;
    }
    return `p-${rec.variant % 5}-${rec.floors}`;
  }
  function chimneyFor(rec, pos) {
    if (city.art.house && rec.kind === 'home') return null;
    const w = rec.kind === 'family-home' ? 0.66 : 0.6, d = 0.6;
    const bh = models.HOUSE_FH * rec.floors + 0.08;
    const off = v3(w * 0.22, bh + 0.3, -d * 0.18).applyAxisAngle(_y, rec.rot || 0);
    return pos.clone().add(off);
  }
  function makeView(rec, animate) {
    const pos = tileW(rec.district, rec.x, rec.z);
    const view = { rec, pos };
    if (rec.kind === 'home') {
      const key = houseKey(rec);
      const m = compose(pos, rec.rot || 0, 1);
      view.handle = houses.add(key, m);
      view.set = houses;
      if (animate) { const id = view.handle; tween(650, (k) => { const e = easeOutBack(k); const s = 0.6 + 0.4 * Math.min(1, k * 1.4); houses.setMatrix(id, new THREE.Matrix4().compose(pos, _q.setFromAxisAngle(_y, rec.rot || 0), v3(s, Math.max(0.001, e), s))); }); fx.dust(pos); }
    } else {
      let obj;
      if (rec.kind === 'family-home') {
        const g = new THREE.Group();
        const h = models.house({ roof: mat.roofs[0], wall: mat.walls[0], floors: rec.floors, w: 0.66, d: 0.6, big: true }); g.add(h);
        const f = models.fence(0.96, 0.96); f.rotation.y = -(rec.rot || 0); g.add(f);
        const fl = models.flowers(9, 0.38); fl.position.z = -0.02; g.add(fl);
        obj = bakeGroup(g);
        city.specials.home = obj;
      } else if (rec.kind === 'park') {
        const g = new THREE.Group();
        const lawn = mesh(new RoundedBoxGeometry(0.9, 0.04, 0.9, 2, 0.06), M('#A3D47A')); lawn.position.y = 0.01; g.add(lawn);
        for (const [dx, dz] of [[-0.25, -0.22], [0.26, 0.18], [-0.2, 0.28]]) { const t = models.tree('round'); t.position.set(dx, 0.02, dz); t.scale.setScalar(0.9); g.add(t); }
        const b = models.bench(); b.position.set(0.15, 0.02, -0.18); g.add(b);
        g.add(models.flowers(6, 0.3));
        obj = bakeGroup(g);
      } else if (rec.kind === 'road') {
        const g = new THREE.Group();
        roadTile(g, v3(0, 0, 0), true, false);
        obj = bakeGroup(g);
      } else if (rec.kind === 'community' || rec.kind === 'landmark') {
        obj = bakeGroup((models.RECIPE_MODEL[rec.recipe] || models.communityCenter)());
      } else if (rec.kind === 'deco') {
        obj = bakeGroup((models.DECO_MODEL[rec.deco] || models.DECO_MODEL.planter)());
      }
      obj.position.copy(pos); obj.rotation.y = rec.rot || 0;
      root.add(obj);
      view.obj = obj;
      if (animate) { if (rec.kind === 'road') fx.dust(pos); else fx.pop(obj); }
    }
    const tall = rec.kind === 'landmark' ? 2 : rec.kind === 'road' ? 0.2 : 0.9;
    view.hit = addHit(pos, { kind: 'building', id: rec.id }, tall);
    view.chimney = (rec.kind === 'home' || rec.kind === 'family-home') ? chimneyFor(rec, pos) : null;
    city.views.set(rec.id, view);
    return view;
  }
  function dropView(id) {
    const view = city.views.get(id);
    if (!view) return;
    if (view.handle) view.set.remove(view.handle);
    if (view.obj) root.remove(view.obj);
    hitRoot.remove(view.hit);
    city.views.delete(id);
  }
  city.addBuilding = (rec, animate = false) => { const v = makeView(rec, animate); refreshChimneys(); return v; };
  city.rebuild = (rec, animate = true) => { dropView(rec.id); const v = makeView(rec, animate); refreshChimneys(); return v; };
  function refreshChimneys() { city.chimneys = [...city.views.values()].map((v) => v.chimney).filter(Boolean); }
  for (const rec of state.buildings) makeView(rec, false);
  refreshChimneys();

  /* ---------- Lots ---------- */
  const lotGeo = new THREE.PlaneGeometry(0.84, 0.84); lotGeo.rotateX(-Math.PI / 2);
  const lotEdgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.86, 0.001, 0.86));
  const lotKey = (d, x, z) => `${d}:${x},${z}`;
  function addLot(d, x, z, animate) {
    const p = tileW(d, x, z);
    const g = new THREE.Group(); g.position.set(p.x, 0.03, p.z);
    g.add(new THREE.Mesh(lotGeo, mat.lotGlow));
    g.add(new THREE.LineSegments(lotEdgeGeo, mat.lotEdge));
    root.add(g);
    const lot = { d, x, z, group: g, pos: p };
    lot.hit = addHit(p, { kind: 'lot', key: lotKey(d, x, z) }, 0.3);
    city.lots.set(lotKey(d, x, z), lot);
    if (animate) fx.pop(g);
    return lot;
  }
  city.lotByKey = (k) => city.lots.get(k);
  city.syncLots = (animateNew = false) => {
    const taken = new Set(state.buildings.map((b) => lotKey(b.district, b.x, b.z)));
    const want = new Set();
    for (const d of Object.keys(LOTS)) {
      if (d !== 'starter' && !state.unlocked[d]) continue;
      for (const [x, z] of LOTS[d]) { const k = lotKey(d, x, z); if (!taken.has(k)) want.add(k); }
    }
    for (const [k, lot] of city.lots) if (!want.has(k)) { root.remove(lot.group); hitRoot.remove(lot.hit); city.lots.delete(k); }
    let i = 0;
    for (const k of want) if (!city.lots.has(k)) {
      const [d, xz] = k.split(':'); const [x, z] = xz.split(',').map(Number);
      if (animateNew) { const delay = i++ * 160; later(delay, () => { if (!city.lots.has(k)) addLot(d, x, z, true); }); } else addLot(d, x, z, false);
    }
  };
  city.syncLots(false);

  /* ---------- District unlock (fog lifts, bridge rises, lots pop in) ---------- */
  const BRIDGE = {
    riverside: { x: xCol, z: (S.cz - 4 + DISTRICTS.riverside.cz + 4) / 2, alongZ: true },
    bridgeview: { x: (S.cx - 4 + DISTRICTS.bridgeview.cx + 4) / 2, z: zRow, alongZ: false },
    hillside: { x: (DISTRICTS.riverside.cx - 4 + DISTRICTS.hillside.cx + 4) / 2, z: tileW('riverside', 0, 3).z, alongZ: false }
  };
  function makeBridge(key) {
    const b = BRIDGE[key];
    const g = new THREE.Group();
    const deck = mesh(new THREE.BoxGeometry(0.92, 0.06, 1.6), mat.road); g.add(deck);
    for (const s of [-1, 1]) {
      const rail = mesh(new THREE.BoxGeometry(0.04, 0.08, 1.6), mat.white); rail.position.set(s * 0.46, 0.08, 0); g.add(rail);
      for (const z of [-0.6, 0, 0.6]) { const post = mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), mat.white); post.position.set(s * 0.46, 0.06, z); g.add(post); }
    }
    const pier = mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), mat.rock); pier.position.y = -0.48; g.add(pier);
    const baked = bakeGroup(g);
    baked.position.set(b.x, 0.01, b.z);
    baked.rotation.y = b.alongZ ? 0 : Math.PI / 2;
    root.add(baked);
    city.bridges[key] = baked;
    return baked;
  }
  for (const key of LOCKED_KEYS) if (city.unlockedNow.has(key)) makeBridge(key);
  city.unlock = (key, animate = true) => {
    if (city.unlockedNow.has(key)) return;
    city.unlockedNow.add(key);
    const f = city.fog[key];
    const grassMat = city.districtGrass[key];
    const from = grassMat.color.clone(), to = new THREE.Color('#8DC86A');
    if (f) {
      f.puffs.forEach((p) => { p.lift = rand() * 0.5; });
      tween(animate ? 1800 : 1, (k) => { const e = easeInOut(k); f.mat.opacity = 0.78 * (1 - e); f.off = e; grassMat.color.copy(from).lerp(to, e); }, () => { root.remove(f.im); delete city.fog[key]; });
    }
    const br = makeBridge(key);
    if (animate) { br.position.y = -1.2; later(900, () => tween(1100, (k) => { br.position.y = -1.2 + 1.21 * easeOutBack(k); })); }
    later(animate ? 1300 : 0, () => {
      city.syncLots(animate);
      city.treeRecs.filter((t) => t.district === key).forEach((t, i) => { if (!animate) return; setTreeScale(t, 0.001); later(200 + i * 60, () => tween(500, (k) => setTreeScale(t, t.scale * easeOutBack(k)))); });
    });
  };

  /* ---------- Art pack swap ---------- */
  city.applyArt = (art) => {
    city.art = art;
    if (art.house) {
      art.house.forEach((v, i) => houses.define(`g-${i}`, v.parts));
      for (const view of [...city.views.values()]) if (view.rec.kind === 'home') { dropView(view.rec.id); makeView(view.rec, false); }
      refreshChimneys();
    }
    if (art.tree) {
      const kinds = art.tree.map((v, i) => { const key = `gt${i}`; trees.define(key, v.parts.map((p) => ({ ...p, material: swayMaterial(p.material) }))); return key; });
      for (const t of city.treeRecs) { trees.remove(t.id); t.kind = kinds[Math.floor((t.pos.x * 7 + t.pos.z * 13) % kinds.length + kinds.length) % kinds.length]; t.id = trees.add(t.kind, compose(t.pos, t.rot, t.scale)); }
    }
    if (art.lamp) lamps.define('lamp', art.lamp[0].parts);
  };

  /* ---------- Per-frame ---------- */
  city.tick = (dt, t) => {
    if (!REDUCED) { updateClouds(dt); updateFog(t); }
    mat.lotGlow.opacity = 0.26 + Math.sin(t * 3) * 0.12;
    const hands = city.specials.clock.userData.hands;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const h of hands) { h.hp.rotation.z = -((mins / 720) * Math.PI * 2) - city.clockSpin * Math.PI * 2 / 12; h.mp.rotation.z = -((mins % 60) / 60) * Math.PI * 2 - city.clockSpin * Math.PI * 2; }
  };
  city.setWaterLevel = (y) => { for (const f of city.foams) f.position.y = y + 0.02; };
  city.positionOf = (id) => { const s = city.specials[id]; return s ? s.position.clone() : null; };
  return city;
}
