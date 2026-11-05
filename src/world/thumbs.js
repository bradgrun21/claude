import * as THREE from 'three';
import { buildModel } from './townModels.js';
import { bakeGroup } from './bake.js';
import { byId } from '../data/catalog.js';

/* Renders each building to a small picture for the build menu (once, then cached). */
const cache = new Map();
let renderer = null, scene = null, camera = null;

function setup() {
  const canvas = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(176, 176, false);
  renderer.toneMapping = THREE.NoToneMapping;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xE8F6FF, 0x86B85A, 1.2));
  const sun = new THREE.DirectionalLight(0xFFF3DC, 2.2); sun.position.set(-3, 6, 4); scene.add(sun);
  camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
}

export function thumb(type) {
  if (cache.has(type)) return cache.get(type);
  try {
    if (!renderer) setup();
    const def = byId[type];
    const obj = bakeGroup(buildModel(type, def.size[0], 1, 3));
    scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.62 + 0.05;
    const dir = new THREE.Vector3(1, 0.95, 1.15).normalize();
    camera.position.copy(center).addScaledVector(dir, r / Math.tan((camera.fov * Math.PI) / 360));
    camera.lookAt(center);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    scene.remove(obj);
    obj.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    cache.set(type, url);
    return url;
  } catch (e) {
    cache.set(type, '');
    return '';
  }
}
