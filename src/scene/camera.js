import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HOME_TARGET = new THREE.Vector3(1.9, 0, 1.9);
const DIR = new THREE.Vector3(1, 0.86, 1).normalize();
const DIR_TALL = new THREE.Vector3(0.42, 0.98, 1).normalize();
const TARGET_TALL = new THREE.Vector3(3.0, 0, 0.6);

export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = false;
  controls.minDistance = 11;
  controls.maxDistance = 64;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = 1.2;
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.addEventListener('change', () => {
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -7, 14);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -7, 10);
    controls.target.y = 0;
  });
  function homeView() {
    const a = innerWidth / innerHeight;
    if (a < 0.8) return { dir: DIR_TALL, target: TARGET_TALL, dist: 56 };
    return { dir: DIR, target: HOME_TARGET, dist: a < 1.2 ? 42 : 40 };
  }
  function resetView() {
    const v = homeView();
    controls.target.copy(v.target);
    camera.position.copy(v.target).addScaledVector(v.dir, v.dist);
    controls.update();
  }
  return { camera, controls, homeView, resetView };
}
