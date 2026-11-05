import * as THREE from 'three';
import { tween, REDUCED, easeOutBack } from './tween.js';
import { rand } from './palette.js';

/* Little celebrations: dust puffs, coin bursts, hearts, confetti, fireworks, bounces. */
export function createEffects(scene, camera) {
  const dustGeo = new THREE.IcosahedronGeometry(0.06, 0);
  const coinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.018, 14);
  const confGeo = new THREE.PlaneGeometry(0.06, 0.035);
  const bursts = [];

  function dust(at, delay = 0) {
    if (REDUCED) return;
    setTimeout(() => {
      for (let i = 0; i < 10; i++) {
        const m = new THREE.Mesh(dustGeo, new THREE.MeshStandardMaterial({ color: i % 3 ? '#F3E6CF' : '#FFD27A', transparent: true, opacity: 0.9, flatShading: true }));
        const a = (i / 10) * Math.PI * 2;
        m.position.set(at.x, 0.06, at.z);
        scene.add(m);
        tween(700, (k) => { m.position.set(at.x + Math.cos(a) * 0.55 * k, 0.06 + Math.sin(k * Math.PI) * 0.25, at.z + Math.sin(a) * 0.55 * k); m.material.opacity = 0.9 * (1 - k); m.scale.setScalar(1 + k); }, () => { scene.remove(m); m.material.dispose(); });
      }
    }, delay);
  }
  function pop(obj, delay = 0) {
    obj.scale.set(0.6, 0.001, 0.6);
    setTimeout(() => tween(650, (k) => { const e = easeOutBack(k); const s = 0.6 + 0.4 * Math.min(1, k * 1.4); obj.scale.set(s, Math.max(0.001, e), s); }), delay);
    dust(obj.position, delay);
  }
  function coinBurst(at, color = '#F2B54A') {
    if (REDUCED) return;
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(coinGeo, new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.35, transparent: true }));
      m.rotation.x = Math.PI / 2; m.position.copy(at); scene.add(m);
      const a = (i / 9) * Math.PI * 2, r = 0.25 + rand() * 0.25;
      tween(900 + i * 30, (k) => { m.position.set(at.x + Math.cos(a) * r * k, at.y + Math.sin(k * Math.PI) * 0.6 + k * 0.3, at.z + Math.sin(a) * r * k); m.rotation.y = k * 12; m.material.opacity = 1 - Math.max(0, (k - 0.6) / 0.4); }, () => { scene.remove(m); m.material.dispose(); });
    }
  }
  function confetti(at) {
    if (REDUCED) return;
    const cols = ['#F2B54A', '#F28CA0', '#8CC7E8', '#A3D174', '#9A72D6', '#FFFDF7'];
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: cols[i % cols.length], side: THREE.DoubleSide, transparent: true }));
      m.position.copy(at); scene.add(m);
      const vx = (rand() - 0.5) * 1.4, vz = (rand() - 0.5) * 1.4, vy = 1.4 + rand() * 1.2, spin = rand() * 20;
      tween(1500, (k) => { const t = k * 1.5; m.position.set(at.x + vx * t, at.y + vy * t - 1.6 * t * t, at.z + vz * t); m.rotation.set(spin * k, spin * k * 0.7, 0); m.material.opacity = 1 - Math.max(0, (k - 0.7) / 0.3); }, () => { scene.remove(m); m.material.dispose(); });
    }
  }
  function heartPop(at) {
    if (REDUCED) return;
    const hs = new THREE.Shape(); hs.moveTo(0, -0.05); hs.bezierCurveTo(-0.12, 0.04, -0.06, 0.12, 0, 0.06); hs.bezierCurveTo(0.06, 0.12, 0.12, 0.04, 0, -0.05);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(hs), new THREE.MeshBasicMaterial({ color: '#F28CA0', transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.position.copy(at).add(new THREE.Vector3(0, 0.3, 0)); scene.add(m);
    tween(1100, (k) => { m.position.y = at.y + 0.3 + k * 0.5; m.material.opacity = 1 - k; m.lookAt(camera.position); m.scale.setScalar(1 + k); }, () => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }
  function bounce(obj) {
    if (!obj || REDUCED || obj.userData.bouncing) return;
    obj.userData.bouncing = true;
    const s = obj.scale.clone();
    tween(520, (k) => { const b = Math.sin(k * Math.PI) * 0.16 * (1 - k * 0.5); obj.scale.set(s.x * (1 - b * 0.4), s.y * (1 + b), s.z * (1 - b * 0.4)); }, () => { obj.scale.copy(s); obj.userData.bouncing = false; });
  }
  function fireworks(center, n = 5, onEach) {
    if (REDUCED) return;
    const cols = ['#F2B54A', '#F28CA0', '#8CC7E8', '#A3D174', '#FFFDF7', '#9A72D6'];
    for (let b = 0; b < n; b++) setTimeout(() => {
      const N = 70, pos = new Float32Array(N * 3), vel = [];
      const c = new THREE.Vector3(center.x + (rand() - 0.5) * 6, 5.5 + rand() * 2, center.z + (rand() - 0.5) * 6);
      for (let i = 0; i < N; i++) { pos.set([c.x, c.y, c.z], i * 3); vel.push(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(1.6 + rand() * 0.8)); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: cols[b % cols.length], size: 0.16, transparent: true, depthWrite: false, fog: false }));
      scene.add(pts);
      bursts.push({ pts, vel, life: 0 });
      onEach && onEach();
    }, b * 380);
  }
  function tick(dt) {
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i]; b.life += dt;
      const a = b.pts.geometry.attributes.position.array;
      for (let k = 0; k < b.vel.length; k++) { const v = b.vel[k]; v.y -= dt * 1.2; v.multiplyScalar(0.985); a[k * 3] += v.x * dt; a[k * 3 + 1] += v.y * dt; a[k * 3 + 2] += v.z * dt; }
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.life / 1.8);
      if (b.life > 1.8) { scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); bursts.splice(i, 1); }
    }
  }
  return { dust, pop, coinBurst, confetti, heartPop, bounce, fireworks, tick };
}
