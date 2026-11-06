import * as THREE from 'three';
import { byId, SECTIONS } from '../data/catalog.js';
import { HALF, PONDS, riverX, tileCenter, isWater, isRail, inBounds, key } from '../data/map.js';
import { occupancy } from '../systems/placement.js';
import { streak, weekSummary } from '../systems/lists.js';
import { population } from '../systems/economy.js';
import { M, mat, mesh, seeded } from './palette.js';
import * as models from './models.js';
import { bakeGroup } from './bake.js';
import { tween, REDUCED, easeInOut } from './tween.js';
import { addDays } from '../systems/time.js';

/*
 * The town lives on its own:
 *   - construction: scaffolding, a little crane and dust while a building goes up or grows
 *   - a parade down Main Street when a goal is completed
 *   - ducks on the ponds, boats on the river
 *   - flowers along the roads that bloom with the streak, windows that glow brighter with it
 *   - neighbors with names who notice the family's real week
 */
const C = { pole: M('#C99A5B'), plank: M('#A9784C'), crane: M('#F2B54A'), craneDark: M('#2B3A50'), dirt: M('#B8946A'), cone: M('#E8643F'), white: M('#FFFDF7'), duck: M('#FFFDF7'), duckHead: M('#3F7D3A'), beak: M('#E8963F'), yellow: M('#FFD45E'), hull: M('#8A5A30'), sail: M('#FFFDF7'), red: M('#E8643F') };

export const NEIGHBORS = ['Mrs. Alvarez', 'Mr. Okafor', 'Grandma June', 'Coach Lee', 'Ms. Patel', 'Old Tom', 'Rosa', 'Mr. Chen', 'Hannah', 'Marcus', 'Miss Ivy', 'Dr. Brooks', 'Sam', 'Nana Bea', 'Luis', 'Mrs. Kim'];

export function createLiving(scene, { state, fx, bld, sound, today, onRebuilt }) {
  const root = new THREE.Group(); scene.add(root);
  const rnd = seeded(41);
  const builds = [];

  /* ---------- Construction ---------- */
  function scaffold(fw, fd, h) {
    const g = new THREE.Group();
    const pad = mesh(new THREE.BoxGeometry(fw * 0.98, 0.02, fd * 0.98), C.dirt, false, true); pad.position.y = 0.01; g.add(pad);
    const pole = new THREE.BoxGeometry(0.035, h, 0.035);
    const xs = [-fw / 2 + 0.06, fw / 2 - 0.06], zs = [-fd / 2 + 0.06, fd / 2 - 0.06];
    for (const x of xs) for (const z of zs) { const p = mesh(pole, C.pole); p.position.set(x, h / 2, z); g.add(p); }
    if (fw > 1.4) for (const z of zs) { const p = mesh(pole, C.pole); p.position.set(0, h / 2, z); g.add(p); }
    for (const y of [h * 0.45, h * 0.92]) {
      for (const z of zs) { const pl = mesh(new THREE.BoxGeometry(fw - 0.06, 0.03, 0.09), C.plank); pl.position.set(0, y, z); g.add(pl); }
      for (const x of xs) { const pl = mesh(new THREE.BoxGeometry(0.09, 0.03, fd - 0.06), C.plank); pl.position.set(x, y, 0); g.add(pl); }
    }
    const brace = new THREE.BoxGeometry(0.02, Math.hypot(fw, h * 0.45), 0.02);
    for (const z of zs) { const b = mesh(brace, C.pole); b.position.set(0, h * 0.23, z); b.rotation.z = Math.atan2(fw, h * 0.45); g.add(b); }
    /* cones at the corners */
    const coneG = new THREE.ConeGeometry(0.045, 0.11, 8);
    for (const [x, z] of [[-fw / 2 - 0.08, fd / 2 + 0.08], [fw / 2 + 0.08, fd / 2 + 0.08]]) { const c = mesh(coneG, C.cone); c.position.set(x, 0.055, z); g.add(c); }
    /* crane */
    const crane = new THREE.Group();
    const mh = h + 0.7;
    const mast = mesh(new THREE.BoxGeometry(0.07, mh, 0.07), C.crane); mast.position.y = mh / 2; crane.add(mast);
    const base = mesh(new THREE.BoxGeometry(0.2, 0.06, 0.2), C.craneDark); base.position.y = 0.03; crane.add(base);
    const jib = new THREE.Group(); jib.position.y = mh; crane.add(jib);
    const reach = Math.max(fw, fd) * 0.75 + 0.3;
    const arm = mesh(new THREE.BoxGeometry(reach + 0.3, 0.05, 0.05), C.crane); arm.position.x = reach / 2 - 0.15; jib.add(arm);
    const cab = mesh(new THREE.BoxGeometry(0.1, 0.08, 0.09), C.craneDark); cab.position.set(0, -0.06, 0.06); jib.add(cab);
    const weight = mesh(new THREE.BoxGeometry(0.12, 0.09, 0.09), C.craneDark); weight.position.set(-0.28, -0.03, 0); jib.add(weight);
    const cable = mesh(new THREE.BoxGeometry(0.008, 1, 0.008), C.craneDark, false, false); jib.add(cable);
    const load = mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), C.plank); jib.add(load);
    crane.position.set(fw / 2 + 0.18, 0, -fd / 2 - 0.18);
    g.add(crane);
    return { g, jib, cable, load, reach, mh };
  }
  function construct(rec, done, ms = 3000) {
    const v = bld.views.get(rec.id);
    const finish = () => { bld.rebuild(rec, true); onRebuilt && onRebuilt(rec.id); done && done(); };
    if (!v || REDUCED) { finish(); return; }
    const [w, d] = byId[rec.type].size; const [fw, fd] = rec.rot % 2 ? [d, w] : [w, d];
    const h = Math.max(0.6, Math.min(1.6, v.top.y - 0.25));
    v.obj.visible = false;
    const s = scaffold(fw, fd, h);
    s.g.position.copy(v.obj.position);
    root.add(s.g);
    /* the new building rising inside the scaffolding */
    const rising = bld.make(rec);
    rising.scale.y = 0.02;
    root.add(rising);
    const job = { s, rising, t0: performance.now(), ms, at: v.obj.position.clone() };
    builds.push(job);
    s.g.scale.y = 0.01;
    tween(320, (k) => { s.g.scale.y = Math.max(0.01, easeInOut(k)); });
    let puffs = 0;
    const iv = setInterval(() => { if (++puffs > ms / 650) return; fx.dust(job.at); if (puffs % 2) sound.tap(); }, 650);
    setTimeout(() => {
      clearInterval(iv);
      tween(300, (k) => { s.g.scale.y = Math.max(0.01, 1 - k); }, () => {
        builds.splice(builds.indexOf(job), 1);
        root.remove(s.g); root.remove(rising);
        s.g.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        finish();
        const nv = bld.views.get(rec.id);
        fx.confetti(nv ? nv.top : job.at);
        sound.chime();
      });
    }, ms);
  }

  /* ---------- Parade down Main Street ---------- */
  function paradeRoute() {
    const roads = new Set(state.roads);
    let best = [];
    for (const j of [18, 17, 19, 15, 20]) {
      const row = state.roads.map((k) => k.split(',').map(Number)).filter(([, b]) => b === j).map(([a]) => a).sort((a, b) => a - b);
      let run = [];
      for (const i of row) { if (run.length && i !== run.at(-1) + 1) { if (run.length > best.length) best = run.map((x) => [x, j]); run = []; } run.push(i); }
      if (run.length > best.length) best = run.map((x) => [x, j]);
      if (best.length >= 6) break;
    }
    return best.filter(([i, j]) => roads.has(key(i, j)));
  }
  function banner(title) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#E8643F'; g.fillRect(0, 0, 512, 14); g.fillRect(0, 114, 512, 14);
    g.fillStyle = '#2B3A50'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 50; const text = `🎉 ${title}`;
    do { g.font = `800 ${size}px Nunito, system-ui, sans-serif`; size -= 2; } while (g.measureText(text).width > 480 && size > 18);
    g.fillText(text, 256, 66);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  }
  function parade(title) {
    const route = paradeRoute();
    if (route.length < 3 || REDUCED) return null;
    const pts = route.map(([i, j]) => { const [x, z] = tileCenter(i, j); return new THREE.Vector3(x, 0, z); });
    const g = new THREE.Group(); root.add(g);
    /* the float */
    const flt = new THREE.Group();
    const deck = mesh(new THREE.BoxGeometry(0.62, 0.12, 0.34), C.red); deck.position.y = 0.12; flt.add(deck);
    const skirt = mesh(new THREE.BoxGeometry(0.66, 0.05, 0.38), C.yellow); skirt.position.y = 0.06; flt.add(skirt);
    for (const [x, c] of [[-0.2, '#F28CA0'], [0, '#8CC7E8'], [0.2, '#A3D174']]) { const b = mesh(new THREE.SphereGeometry(0.07, 10, 8), M(c)); b.position.set(x, 0.62 + Math.abs(x) * -0.3, 0); flt.add(b); const st = mesh(new THREE.BoxGeometry(0.006, 0.4, 0.006), C.white, false, false); st.position.set(x, 0.38, 0); flt.add(st); }
    const sign = banner(title); sign.position.set(0, 0.34, 0); flt.add(sign);
    flt.scale.setScalar(1.5);
    g.add(flt);
    const people = [];
    const cols = ['#4E7FA0', '#E8643F', '#4CAF6A', '#9A72D6', '#F2B54A', '#B97F62'];
    const fam = state.family.filter((m) => m.kind !== 'pet');
    const n = Math.max(4, Math.min(7, fam.length + 3));
    for (let k = 0; k < n; k++) { const p = bakeGroup(models.person(fam[k]?.color || cols[k % cols.length], k % 2 ? '#3A2A1E' : '#8A5A30')); p.scale.setScalar(2.1); g.add(p); people.push(p); }
    const total = pts.length - 1, dur = Math.max(6, total * 0.55);
    const at = (u, out) => { const f = THREE.MathUtils.clamp(u, 0, 1) * total; const a = Math.min(total - 1, Math.floor(f)); return out.copy(pts[a]).lerp(pts[a + 1], f - a); };
    const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), dir = new THREE.Vector3();
    let lastConf = 0;
    const job = { tick(t) {
      const u = (t - job.start) / dur;
      at(u, p0); at(u + 0.02, p1);
      flt.position.copy(p0); flt.position.y = Math.abs(Math.sin(t * 6)) * 0.02;
      flt.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z) - Math.PI / 2;
      sign.rotation.y = 0;
      dir.copy(p1).sub(p0); if (dir.lengthSq() < 1e-8) dir.set(1, 0, 0); dir.normalize();
      people.forEach((p, k) => {
        at(u - (0.8 + Math.floor(k / 2) * 0.42) / total, p.position);
        const side = k % 2 ? 0.16 : -0.16;
        p.position.x += -dir.z * side; p.position.z += dir.x * side;
        p.position.y = Math.abs(Math.sin(t * 9 + k)) * 0.04;
        p.rotation.y = Math.atan2(dir.x, dir.z);
      });
      if (t - lastConf > 0.9 && u < 1) { lastConf = t; fx.confetti(flt.position.clone().add(new THREE.Vector3(0, 0.6, 0))); }
      if (u > 1.25) { root.remove(g); g.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) { o.material.map.dispose(); o.material.dispose(); } } }); return false; }
      return true;
    } };
    job.start = null;
    parades.push(job);
    return pts[Math.floor(pts.length / 2)].clone();
  }
  const parades = [];

  /* ---------- Ducks and boats ---------- */
  function duck(baby) {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.07, 10, 8), baby ? C.yellow : C.duck); body.scale.set(1.3, 0.8, 1); body.position.y = 0.04; g.add(body);
    const head = mesh(new THREE.SphereGeometry(0.04, 8, 6), baby ? C.yellow : C.duckHead); head.position.set(0.08, 0.11, 0); g.add(head);
    const beak = mesh(new THREE.ConeGeometry(0.018, 0.05, 6), C.beak); beak.rotation.z = -Math.PI / 2; beak.position.set(0.13, 0.1, 0); g.add(beak);
    const tail = mesh(new THREE.ConeGeometry(0.03, 0.06, 5), baby ? C.yellow : C.duck); tail.rotation.z = Math.PI / 2 + 0.5; tail.position.set(-0.1, 0.07, 0); g.add(tail);
    const o = bakeGroup(g); if (baby) o.scale.setScalar(0.6); return o;
  }
  const ducks = [];
  PONDS.forEach((p, pi) => {
    const families = pi === 0 ? 2 : 1;
    for (let f = 0; f < families; f++) {
      const r = p.r * (0.45 + f * 0.2), ph = rnd() * 6.28, sp = (0.18 + rnd() * 0.08) * (f % 2 ? -1 : 1);
      for (let k = 0; k < (f === 0 ? 3 : 1); k++) { const d = duck(k > 0); root.add(d); ducks.push({ obj: d, cx: p.i - HALF, cz: p.j - HALF, r, ph: ph - k * 0.32 * Math.sign(sp), sp }); }
    }
  });
  function boat(color) {
    const g = new THREE.Group();
    const hull = mesh(new THREE.BoxGeometry(0.42, 0.08, 0.16), C.hull); hull.position.y = 0.04; g.add(hull);
    const bow = mesh(new THREE.ConeGeometry(0.08, 0.14, 4), C.hull); bow.rotation.z = -Math.PI / 2; bow.rotation.x = Math.PI / 4; bow.position.set(0.27, 0.04, 0); bow.scale.set(1, 1, 0.5); g.add(bow);
    const mastM = mesh(new THREE.BoxGeometry(0.015, 0.42, 0.015), C.hull); mastM.position.set(0.02, 0.29, 0); g.add(mastM);
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 0.34); sh.lineTo(0.2, 0); sh.lineTo(0, 0);
    const sail = mesh(new THREE.ShapeGeometry(sh), M(color, { side: THREE.DoubleSide })); sail.position.set(0.03, 0.12, 0); g.add(sail);
    return bakeGroup(g);
  }
  const boats = [boat('#FFFDF7'), boat('#F28CA0')].map((o, k) => { root.add(o); return { obj: o, z: k ? 8 : -12, dir: k ? -1 : 1, sp: 0.35 + k * 0.1, lane: k ? 0.35 : -0.35 }; });

  /* ---------- Flowers along the roads (more with the streak) ---------- */
  const MAXF = 360;
  const headGeo = new THREE.IcosahedronGeometry(0.045, 0);
  const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), MAXF);
  const leafGeo = new THREE.ConeGeometry(0.05, 0.08, 5);
  const leaves = new THREE.InstancedMesh(leafGeo, M('#5FA145'), MAXF);
  heads.count = 0; leaves.count = 0; heads.frustumCulled = false; leaves.frustumCulled = false;
  root.add(heads, leaves);
  const FCOL = ['#F28CA0', '#FFD45E', '#FFFFFF', '#C9A0F0', '#FF9E6B'].map((c) => new THREE.Color(c));
  let glow = 0.4, lastSig = '';
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), vp = new THREE.Vector3(), vs = new THREE.Vector3(1, 1, 1);
  function refresh() {
    const st = streak(state, today());
    glow = 0.4 + 0.6 * Math.min(1, st / 14);
    const sig = `${st}|${state.roads.length}|${state.buildings.length}`;
    if (sig === lastSig) return;
    lastSig = sig;
    const occ = occupancy(state), roads = new Set(state.roads);
    const spots = [];
    for (const k of state.roads) {
      const [i, j] = k.split(',').map(Number);
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + a, nj = j + b, nk = key(ni, nj);
        if (!inBounds(ni, nj) || roads.has(nk) || occ.has(nk) || isWater(ni, nj) || isRail(ni, nj)) continue;
        const [x, z] = tileCenter(i, j);
        const h = ((ni * 73856093) ^ (nj * 19349663) ^ (i * 83492791)) >>> 0;
        spots.push({ x: x + a * 0.62, z: z + b * 0.62, a, b, h });
      }
    }
    spots.sort((p, r) => (p.h % 997) - (r.h % 997));
    const want = Math.min(MAXF, spots.length * 2, st * 10);
    let n = 0;
    for (let s = 0; n < want && s < spots.length; s++) {
      const sp = spots[s];
      for (let k = 0; k < 2 && n < want; k++) {
        const off = ((sp.h >> (k * 4)) % 9) / 9 - 0.45;
        const x = sp.x + (sp.b ? off * 0.8 : 0), z = sp.z + (sp.a ? off * 0.8 : 0);
        m4.compose(vp.set(x, 0.1, z), q.identity(), vs.setScalar(0.9 + ((sp.h >> 3) % 5) * 0.08)); heads.setMatrixAt(n, m4);
        heads.setColorAt(n, FCOL[(sp.h + k) % FCOL.length]);
        m4.compose(vp.set(x, 0.04, z), q.identity(), vs.setScalar(1)); leaves.setMatrixAt(n, m4);
        n++;
      }
    }
    heads.count = n; leaves.count = n;
    heads.instanceMatrix.needsUpdate = true; leaves.instanceMatrix.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  }

  /* ---------- Neighbors who notice the family's week ---------- */
  function neighborSays(idx) {
    const name = NEIGHBORS[idx % NEIGHBORS.length];
    const d = today();
    const w = weekSummary(state, d);
    const st = streak(state, d);
    const lines = [];
    if (w.total) lines.push(`Saw you check off ${w.total} ${w.total === 1 ? 'thing' : 'things'} this week. Way to go!`);
    const best = Object.entries(w.bySection).sort((a, b) => b[1] - a[1])[0];
    if (best) { const b = state.lists.find((l) => l.section === best[0]); const bn = b && byId[state.buildings.find((x) => x.id === b.buildingId)?.type]?.name; if (bn) lines.push(`The ${bn} has been busy lately. Love to see it.`); else lines.push(`Lots of ${SECTIONS[best[0]].name.toLowerCase()} going on at your place!`); }
    if (st >= 3) lines.push(`${st} days in a row? The whole street noticed.`);
    if (w.goals.length) lines.push(`Congrats on “${w.goals.at(-1)}”! Still talking about that parade.`);
    const mem = state.memories[0];
    if (mem?.text && mem.created >= addDays(d, -6)) lines.push(`Loved hearing about “${mem.text.slice(0, 40)}${mem.text.length > 40 ? '…' : ''}”`);
    const ev = state.events.filter((e) => !e.done && e.date >= d).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (ev) lines.push(`Have fun at ${ev.title}!`);
    if (state.level > 1) lines.push(`Can’t believe how ${state.cityName} has grown. Level ${state.level}!`);
    lines.push(`${population(state)} of us in town now. Remember when it was just a Town Hall?`);
    lines.push(...['Lovely day for a walk.', 'Rest days are good days too.', 'Nice to see you out and about!', 'This town feels more like home every week.']);
    const pickR = seeded((idx + 1) * 7919 + Date.now() % 1000);
    pickR(); pickR();
    const line = lines[Math.floor(pickR() * Math.min(lines.length, Math.max(3, lines.length - 2)))];
    return { name, line };
  }

  /* ---------- Per frame ---------- */
  function tick(dt, t, night) {
    mat.win.emissiveIntensity = 1.6 * night * glow;
    if (REDUCED) return;
    for (const b of builds) {
      const k = (performance.now() - b.t0) / b.ms;
      b.s.jib.rotation.y = Math.sin(t * 0.9) * 1.1 + 0.6;
      const drop = 0.35 + (Math.sin(t * 1.7) * 0.5 + 0.5) * (b.s.mh - 0.6);
      const r = b.s.reach * 0.75;
      b.s.cable.position.set(r, -drop / 2, 0); b.s.cable.scale.y = drop;
      b.s.load.position.set(r, -drop - 0.04, 0);
      b.rising.scale.y = Math.max(0.02, Math.min(0.92, easeInOut(Math.min(1, k)) * 0.92));
    }
    for (const d of ducks) {
      const a = d.ph + t * d.sp;
      d.obj.position.set(d.cx + Math.cos(a) * d.r, 0.005 + Math.sin(t * 2 + d.ph) * 0.006, d.cz + Math.sin(a) * d.r);
      d.obj.rotation.y = -a - (d.sp > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    for (const b of boats) {
      b.z += dt * b.sp * b.dir;
      if (b.z > 27) b.z = -27; if (b.z < -27) b.z = 27;
      const j = b.z + HALF;
      const x = riverX(j) - HALF + b.lane;
      const x2 = riverX(j + 0.3 * b.dir) - HALF + b.lane;
      b.obj.position.set(x, 0.005 + Math.sin(t * 2.2 + b.z) * 0.012, b.z);
      b.obj.rotation.y = Math.atan2(x2 - x, 0.3 * b.dir) - Math.PI / 2;
      b.obj.rotation.z = Math.sin(t * 1.6 + b.z) * 0.05;
    }
    for (let i = parades.length - 1; i >= 0; i--) { const p = parades[i]; if (p.start == null) p.start = t; if (!p.tick(t)) parades.splice(i, 1); }
  }

  refresh();
  return { construct, parade, refresh, tick, neighborSays, get building() { return builds.length > 0; } };
}
