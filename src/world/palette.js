import * as THREE from 'three';

/* Plain flat-shaded materials. Plain ones are marked so bake() can fold them into vertex colors. */
export function M(c, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, flatShading: true, ...o });
  m.userData.bake = !o.emissive && !o.transparent && !o.map;
  return m;
}

export const mat = {
  grass: M('#8DC86A'), dirt: M('#9C7653'), rock: M('#7C6858'),
  road: M('#5A6370', { roughness: 0.95 }), walk: M('#DCD5C8'), paint: M('#F7F1E7'),
  door: M('#7A5A3C'), trunk: M('#7A5A3C'), white: M('#FFFDF7'),
  leaf: [M('#4E8A3A'), M('#5FA145'), M('#78B653'), M('#3F7D3A')],
  walls: [M('#F6EEDF'), M('#F2E2CF'), M('#EADCC8'), M('#F7F3EA'), M('#E9EEF0')],
  roofs: [M('#B97F62'), M('#2F4058'), M('#D9774A'), M('#6B7A8A'), M('#4F8E6A')],
  win: new THREE.MeshStandardMaterial({ color: '#8CC7E8', roughness: 0.25, metalness: 0.1, emissive: new THREE.Color('#FFC870'), emissiveIntensity: 0, flatShading: true }),
  lamp: new THREE.MeshStandardMaterial({ color: '#FFF4D6', emissive: new THREE.Color('#FFD27A'), emissiveIntensity: 0.15 }),
  water: new THREE.MeshStandardMaterial({ color: '#4FB0DC', roughness: 0.3, metalness: 0.05, flatShading: true }),
  foam: new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55 }),
  pond: M('#5DB8E2', { roughness: 0.2 }),
  gold: M('#F2B54A', { metalness: 0.2, roughness: 0.5 }),
  navy: M('#1E2B3C'),
  metal: M('#8A949E', { roughness: 0.5, metalness: 0.3 }),
  wood: M('#A9784C'), woodDark: M('#7A5A3C'), stone: M('#BDB3A4'), brick: M('#C0623F'),
  cloud: new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: new THREE.Color('#EEF4F8'), emissiveIntensity: 0.45, roughness: 1 }),
  fog: new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: new THREE.Color('#E8F1F6'), emissiveIntensity: 0.55, roughness: 1, transparent: true, opacity: 0.78, depthWrite: false }),
  flower: [M('#F28CA0'), M('#FFD45E'), M('#FFFFFF'), M('#C9A0F0')],
  lotGlow: new THREE.MeshBasicMaterial({ color: '#FFD27A', transparent: true, opacity: 0.35, depthWrite: false }),
  lotEdge: new THREE.LineBasicMaterial({ color: '#F2B54A' }),
  paper: M('#FFFDF2'),
  crop: M('#5FA145'), cropB: M('#8DC86A'), carrot: M('#E8963F')
};

/* Deterministic random so every family's island looks the same on every load. */
export function seeded(seed = 7) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
export const rand = seeded(7);
export const pick = (arr, r = rand) => arr[Math.floor(r() * arr.length)];

export function mesh(geo, m, cast = true, recv = true) {
  const o = new THREE.Mesh(geo, m);
  o.castShadow = cast;
  o.receiveShadow = recv;
  return o;
}
