import * as THREE from 'three';
import { createSky, DAY, NIGHT, STORM } from './sky.js';
import { createCamera } from './camera.js';
import { createLights } from './lights.js';
import { createWater } from './water.js';
import { createPost } from './post.js';
import { QUALITY } from './quality.js';
import { mat } from '../world/palette.js';

/* Renderer + scene + camera + lights + water + post effects in one place. */
export function createStage(canvas, sheet) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog.clone(), 34, 78);
  const sky = createSky(scene);
  const cam = createCamera(canvas);
  const lights = createLights(scene);
  const water = createWater(scene);
  const post = createPost(renderer, scene, cam.camera);

  const stage = {
    renderer, scene, sky, water, post, ...cam, ...lights,
    quality: 'high', night: 0, storm: 0,
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
      const dpr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      post.composer.setPixelRatio(dpr);
      post.composer.setSize(w, h);
      cam.camera.aspect = w / h;
      const topH = 96, panelH = sheet ? sheet.getBoundingClientRect().height : 0;
      const shift = Math.max(0, panelH - topH);
      cam.camera.setViewOffset(w, h + shift, 0, shift, w, h);
      cam.camera.updateProjectionMatrix();
      const centerY = (h - shift) / 2;
      post.setFocus(w, h, 1 - (centerY + 30) / h);
    },
    /* Day/night + storm mood. k = night 0..1, sv = storm visual 0..1. */
    applyMood(k, sv) {
      const { sun, hemi, amb } = lights;
      sun.intensity = THREE.MathUtils.lerp(2.7, 0.35, k) * (1 - 0.6 * sv);
      sun.color.set('#FFF0D6').lerp(_c.set('#C9D3DC'), sv).lerp(_c2.set('#9FB4FF'), k);
      hemi.intensity = THREE.MathUtils.lerp(1.15, 0.32, k) * (1 - 0.3 * sv);
      amb.intensity = THREE.MathUtils.lerp(0.18, 0.12, k);
      mat.win.emissiveIntensity = 1.6 * Math.max(k, sv * 0.35);
      mat.lamp.emissiveIntensity = 0.15 + 3.2 * Math.max(k, sv * 0.4);
      scene.fog.color.copy(DAY.fog).lerp(STORM.fog, sv).lerp(NIGHT.fog, k);
      mat.water.color.copy(DAY.water).lerp(STORM.water, sv).lerp(NIGHT.water, k);
      mat.cloud.color.set('#FFFFFF').lerp(_c.set('#8E9AA4'), sv);
      mat.cloud.emissiveIntensity = 0.45 * (1 - sv);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.15, k);
      sky.paint(k, sv);
    },
    render() {
      if ((QUALITY[stage.quality] || QUALITY.high).post) post.composer.render();
      else renderer.render(scene, cam.camera);
    }
  };
  return stage;
}
const _c = new THREE.Color(), _c2 = new THREE.Color();
