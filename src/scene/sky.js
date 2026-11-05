import * as THREE from 'three';

/* Sky gradient, redrawn when day/night or the storm changes. */
export const DAY = { top: new THREE.Color('#7FC3E6'), bottom: new THREE.Color('#F4E6CF'), fog: new THREE.Color('#D9ECF2'), water: new THREE.Color('#4FB0DC') };
export const NIGHT = { top: new THREE.Color('#0D1630'), bottom: new THREE.Color('#3A3A63'), fog: new THREE.Color('#25294A'), water: new THREE.Color('#1D3D63') };
export const STORM = { top: new THREE.Color('#6A7B8B'), bottom: new THREE.Color('#B7C0C4'), fog: new THREE.Color('#AFBBC1'), water: new THREE.Color('#4A7C96') };

export function createSky(scene) {
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
  const t = new THREE.Color(), b = new THREE.Color();
  let lastKey = '';
  function paint(k, sv = 0) {
    const key = k.toFixed(3) + '|' + sv.toFixed(3);
    if (key === lastKey) return;
    lastKey = key;
    t.copy(DAY.top).lerp(STORM.top, sv * 0.8).lerp(NIGHT.top, k);
    b.copy(DAY.bottom).lerp(STORM.bottom, sv * 0.8).lerp(NIGHT.bottom, k);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#' + t.getHexString());
    g.addColorStop(0.62, '#' + t.clone().lerp(b, 0.55).getHexString());
    g.addColorStop(1, '#' + b.getHexString());
    ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 256);
    tex.needsUpdate = true;
  }
  paint(0);
  return { paint };
}
