import * as THREE from 'three';
import { rand } from './palette.js';

/* Storm rain. Falling is done in the vertex shader (no per-frame CPU work). */
export function createRain(scene) {
  const N = 900;
  const pos = new Float32Array(N * 6), top = new Float32Array(N * 2), off = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const x = (rand() - 0.5) * 26 + 1, y = rand() * 12, z = (rand() - 0.5) * 26 + 1;
    pos.set([x, 0, z, x + 0.05, 0, z + 0.03], i * 6);
    top[i * 2] = y; top[i * 2 + 1] = y;
    off[i * 2] = 0; off[i * 2 + 1] = -0.32;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aTop', new THREE.BufferAttribute(top, 1));
  geo.setAttribute('aOff', new THREE.BufferAttribute(off, 1));
  const uniforms = { uTime: { value: 0 } };
  const m = new THREE.LineBasicMaterial({ color: '#DCEBF4', transparent: true, opacity: 0, depthWrite: false });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\nattribute float aTop;\nattribute float aOff;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.y = mod(aTop - uTime * 9.0, 12.0) - 0.9 + aOff;'
    );
  };
  m.customProgramCacheKey = () => 'life-city-rain';
  const rain = new THREE.LineSegments(geo, m);
  rain.frustumCulled = false;
  scene.add(rain);
  return {
    tick(t, sv) {
      m.opacity = Math.max(0, sv - 0.3) * 1.3;
      rain.visible = m.opacity > 0.01;
      uniforms.uTime.value = t;
    },
    get intensity() { return m.opacity; }
  };
}
