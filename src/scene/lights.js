import * as THREE from 'three';

export function createLights(scene) {
  const hemi = new THREE.HemisphereLight(0xE4F4FF, 0x7A9A55, 1.15);
  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  const sun = new THREE.DirectionalLight(0xFFF0D6, 2.7);
  sun.position.set(-9, 17, 11);
  sun.target.position.set(1, 0, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 52 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.025;
  scene.add(hemi, amb, sun, sun.target);
  return { hemi, amb, sun };
}
