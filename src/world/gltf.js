import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/*
 * Loads the CC0 art pack (if Brad has dropped files in public/models/) and turns each model
 * into "parts" (geometry + material + matrix) that InstancedSet can draw many times.
 * Anything missing or broken quietly falls back to the code-made models.
 */
const TARGET = {
  house: { fit: 'footprint', size: 0.8 },
  tree: { fit: 'height', size: 0.78 },
  lamp: { fit: 'height', size: 0.55 },
  car: { fit: 'length', size: 0.38 },
  bench: { fit: 'length', size: 0.32 }
};

function toParts(root, role) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const t = TARGET[role];
  let turn = 0;
  if ((role === 'car' || role === 'bench') && size.z > size.x) turn = -Math.PI / 2;
  const len = Math.max(size.x, size.z);
  const s = t.fit === 'height' ? t.size / (size.y || 1) : t.size / (len || 1);
  const center = box.getCenter(new THREE.Vector3());
  const norm = new THREE.Matrix4()
    .makeRotationY(turn)
    .multiply(new THREE.Matrix4().makeScale(s, s, s))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const materials = [].concat(o.material);
    for (const m of materials) { if (m.map) m.map.anisotropy = 4; }
    parts.push({ geometry: o.geometry, material: o.material, castShadow: true, receiveShadow: true, matrix: new THREE.Matrix4().multiplyMatrices(norm, o.matrixWorld) });
  });
  return { parts, height: size.y * s };
}

export async function loadArtPack(base = './models/') {
  let manifest;
  try {
    const res = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!res.ok) return {};
    manifest = await res.json();
  } catch (e) {
    return {};
  }
  const roles = manifest.roles || {};
  const loader = new GLTFLoader();
  const out = {};
  for (const [role, files] of Object.entries(roles)) {
    if (!TARGET[role] || !files.length) continue;
    const variants = [];
    for (const f of files) {
      try {
        const gltf = await loader.loadAsync(base + f);
        const v = toParts(gltf.scene, role);
        if (v.parts.length) variants.push(v);
      } catch (e) {
        /* One bad file should not break the city. */
      }
    }
    if (variants.length) out[role] = variants.sort((a, b) => a.height - b.height);
  }
  return out;
}
