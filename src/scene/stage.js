import * as THREE from 'three';
import { createSky, DAY, NIGHT } from './sky.js';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { createWater } from './water.js';
import { QUALITY } from './quality.js';
import { mat } from '../world/palette.js';

/* Renderer + scene + camera + lights + sea. Crisp, bright, no blur. */
export function createStage(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog.clone(), 60, 140);
  const sky = createSky(scene);
  const cam = createCamera(canvas);
  const lights = createLights(scene);
  const water = createWater(scene);
  water.position.y = -0.38;
  const sunOffset = lights.sun.position.clone().sub(lights.sun.target.position);

  const stage = {
    renderer, scene, sky, water, ...cam, ...lights,
    quality: 'high', night: 0,
    setQuality(level) {
      const q = QUALITY[level] || QUALITY.high;
      stage.quality = level;
      renderer.shadowMap.type = q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
      lights.sun.shadow.mapSize.set(q.shadow, q.shadow);
      if (lights.sun.shadow.map) { lights.sun.shadow.map.dispose(); lights.sun.shadow.map = null; }
      scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
      stage.resize();
    },
    resize() {
      const q = QUALITY[stage.quality] || QUALITY.high;
      const w = innerWidth, h = innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxDpr));
      renderer.setSize(w, h, false);
      cam.camera.aspect = w / h;
      cam.camera.updateProjectionMatrix();
    },
    /* Shadows follow wherever the camera is looking, so the whole map can be lit. */
    followShadows() {
      const t = cam.controls.target;
      lights.sun.target.position.set(Math.round(t.x), 0, Math.round(t.z));
      lights.sun.position.copy(lights.sun.target.position).add(sunOffset);
      const d = cam.camera.position.distanceTo(t);
      const half = THREE.MathUtils.clamp(d * 0.62, 10, 26);
      const sc = lights.sun.shadow.camera;
      if (Math.abs(sc.right - half) > 0.5) { sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.updateProjectionMatrix(); }
    },
    applyMood(k) {
      const { sun, hemi, amb } = lights;
      sun.intensity = THREE.MathUtils.lerp(2.3, 0.35, k);
      sun.color.set('#FFF3DC').lerp(_c.set('#9FB4FF'), k);
      hemi.intensity = THREE.MathUtils.lerp(1.05, 0.3, k);
      amb.intensity = THREE.MathUtils.lerp(0.22, 0.12, k);
      mat.win.emissiveIntensity = 1.6 * k;
      mat.lamp.emissiveIntensity = 0.15 + 3.2 * k;
      scene.fog.color.copy(DAY.fog).lerp(NIGHT.fog, k);
      mat.water.color.copy(DAY.water).lerp(NIGHT.water, k);
      sky.paint(k, 0);
    },
    render() { renderer.render(scene, cam.camera); }
  };
  return stage;
}
const _c = new THREE.Color();
