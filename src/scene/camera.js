import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HALF } from '../data/map.js';

/* Fixed three-quarter view (like a classic town builder): drag to pan, pinch or scroll to zoom. No rotation. */
const DIR = new THREE.Vector3(1, 1.32, 1).normalize();

export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 260);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.enableRotate = false;
  controls.screenSpacePanning = false;
  controls.minDistance = 9;
  controls.maxDistance = 46;
  controls.zoomSpeed = 1.1;
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  const clampTarget = () => {
    const t = controls.target, lim = HALF + 2;
    const cx = THREE.MathUtils.clamp(t.x, -lim, lim), cz = THREE.MathUtils.clamp(t.z, -lim, lim);
    const dx = cx - t.x, dz = cz - t.z;
    if (dx || dz || t.y) { t.set(cx, 0, cz); camera.position.x += dx; camera.position.z += dz; }
  };
  controls.addEventListener('change', clampTarget);
  const home = { target: new THREE.Vector3(1.5, 0, 1.5), dist: 26 };
  function homeView() {
    const a = innerWidth / innerHeight;
    return { dir: DIR, target: home.target, dist: a < 0.8 ? 35 : home.dist };
  }
  function resetView() {
    const v = homeView();
    controls.target.copy(v.target);
    camera.position.copy(v.target).addScaledVector(DIR, v.dist);
    controls.update();
  }
  function setHome(x, z) { home.target.set(x, 0, z); }
  function flyTo(p, tween, ease, dist = null) {
    const t0 = controls.target.clone(), c0 = camera.position.clone();
    const d0 = c0.distanceTo(t0), d1 = dist ?? d0;
    const t1 = new THREE.Vector3(p.x, 0, p.z);
    tween(900, (k) => { const e = ease(k); controls.target.lerpVectors(t0, t1, e); camera.position.copy(controls.target).addScaledVector(DIR, d0 + (d1 - d0) * e); });
  }
  return { camera, controls, homeView, resetView, setHome, flyTo, DIR };
}
