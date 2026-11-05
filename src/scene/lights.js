import * as THREE from 'three';

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xE8F6FF, 0x86B85A, 1.05);
  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  const sun = new THREE.DirectionalLight(0xFFF3DC, 2.3);
  sun.position.set(-8, 20, 6);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(hemi, amb, sun, sun.target);
  return { hemi, amb, sun };
}
