import * as THREE from 'three';
import { mat } from '../world/palette.js';

/*
 * Ocean with gentle waves. The prototype moved 5,000 vertices on the CPU every frame;
 * here the same wave formula runs in the vertex shader, so it is nearly free.
 */
export const waterUniforms = { uTime: { value: 0 }, uStorm: { value: 0 } };

export function createWater(scene) {
  const geo = new THREE.PlaneGeometry(140, 140, 70, 70);
  geo.rotateX(-Math.PI / 2);
  const m = mat.water;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterUniforms);
    shader.vertexShader = 'uniform float uTime;\nuniform float uStorm;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.y += (sin(transformed.x * 0.55 + uTime * (0.9 + uStorm)) + cos(transformed.z * 0.6 + uTime * (0.7 + uStorm))) * (0.05 + uStorm * 0.09);`
    );
  };
  m.customProgramCacheKey = () => 'life-city-water';
  const water = new THREE.Mesh(geo, m);
  water.receiveShadow = true;
  water.position.y = -0.92;
  scene.add(water);
  return water;
}
