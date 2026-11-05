import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * Performance helpers.
 * bakeParts(group) folds a little procedural model (often 10–40 meshes) into 1–3 merged meshes:
 * plain colors become vertex colors on a shared material, special materials (glowing windows,
 * lamps, glass) keep their own. InstancedSet then draws every copy of a part in one draw call.
 */
const bakedMats = new Map();
export function bakedMaterial(src) {
  const key = `${src.roughness}|${src.metalness}|${src.flatShading}`;
  if (!bakedMats.has(key)) bakedMats.set(key, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: src.roughness, metalness: src.metalness, flatShading: src.flatShading }));
  return bakedMats.get(key);
}
export const allBakedMaterials = () => [...bakedMats.values()];

export function bakeParts(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const rel = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || o.userData.skipBake) return;
    const m = o.material;
    rel.multiplyMatrices(inv, o.matrixWorld);
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(rel);
    const baked = !!m.userData?.bake;
    const material = baked ? bakedMaterial(m) : m;
    if (baked) {
      const n = g.attributes.position.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = m.color.r; arr[i * 3 + 1] = m.color.g; arr[i * 3 + 2] = m.color.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    const key = material.uuid + (o.castShadow ? 'c' : 'n');
    if (!buckets.has(key)) buckets.set(key, { material, geos: [], castShadow: o.castShadow, receiveShadow: o.receiveShadow });
    buckets.get(key).geos.push(g);
  });
  const parts = [];
  for (const b of buckets.values()) {
    const geometry = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false);
    for (const g of b.geos) if (g !== geometry) g.dispose();
    geometry.computeBoundingSphere();
    parts.push({ geometry, material: b.material, castShadow: b.castShadow, receiveShadow: b.receiveShadow, matrix: new THREE.Matrix4() });
  }
  return parts;
}

export function partsToGroup(parts) {
  const g = new THREE.Group();
  for (const p of parts) {
    const m = new THREE.Mesh(p.geometry, p.material);
    m.castShadow = p.castShadow; m.receiveShadow = p.receiveShadow;
    m.matrixAutoUpdate = false; m.matrix.copy(p.matrix);
    g.add(m);
  }
  return g;
}

/* Bake a model and return a cheap group with the same look, keeping the original transform. */
export function bakeGroup(root) {
  const pos = root.position.clone(), rot = root.rotation.clone(), scl = root.scale.clone();
  root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.set(1, 1, 1);
  const g = partsToGroup(bakeParts(root));
  g.position.copy(pos); g.rotation.copy(rot); g.scale.copy(scl);
  g.userData = root.userData;
  return g;
}

/*
 * Draws many copies of a model (a "kind") with one InstancedMesh per part.
 * add() returns a handle id; remove() swaps the last copy into the hole.
 */
export class InstancedSet {
  constructor(parent) {
    this.parent = parent;
    this.kinds = new Map();
    this.handles = new Map();
    this.seq = 0;
  }
  define(key, parts) {
    const old = this.kinds.get(key);
    const kind = { parts, meshes: [], ids: old ? old.ids : [], mats: old ? old.mats : [], cap: Math.max(8, old ? old.cap : 8) };
    if (old) for (const m of old.meshes) { this.parent.remove(m); m.dispose(); }
    this.kinds.set(key, kind);
    this.build(kind);
    return kind;
  }
  has(key) { return this.kinds.has(key); }
  build(kind) {
    kind.meshes = kind.parts.map((p) => {
      const im = new THREE.InstancedMesh(p.geometry, p.material, kind.cap);
      im.castShadow = p.castShadow; im.receiveShadow = p.receiveShadow;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.parent.add(im);
      return im;
    });
    kind.ids.forEach((id, i) => this.write(kind, i));
    this.sync(kind);
  }
  write(kind, idx) {
    const m = kind.mats[idx];
    kind.parts.forEach((p, k) => {
      _m.multiplyMatrices(m, p.matrix);
      kind.meshes[k].setMatrixAt(idx, _m);
    });
  }
  sync(kind) {
    for (const im of kind.meshes) { im.count = kind.ids.length; im.visible = kind.ids.length > 0; im.instanceMatrix.needsUpdate = true; }
  }
  add(key, matrix) {
    const kind = this.kinds.get(key);
    if (kind.ids.length >= kind.cap) {
      kind.cap *= 2;
      for (const m of kind.meshes) { this.parent.remove(m); m.dispose(); }
      this.build(kind);
    }
    const id = ++this.seq;
    const idx = kind.ids.length;
    kind.ids.push(id);
    kind.mats.push(matrix.clone());
    this.handles.set(id, { key, idx });
    this.write(kind, idx);
    this.sync(kind);
    return id;
  }
  remove(id) {
    const h = this.handles.get(id);
    if (!h) return;
    const kind = this.kinds.get(h.key);
    const last = kind.ids.length - 1;
    if (h.idx !== last) {
      const movedId = kind.ids[last];
      kind.ids[h.idx] = movedId;
      kind.mats[h.idx] = kind.mats[last];
      this.handles.get(movedId).idx = h.idx;
      this.write(kind, h.idx);
    }
    kind.ids.pop(); kind.mats.pop();
    this.handles.delete(id);
    this.sync(kind);
  }
  setMatrix(id, matrix) {
    const h = this.handles.get(id);
    if (!h) return;
    const kind = this.kinds.get(h.key);
    kind.mats[h.idx].copy(matrix);
    this.write(kind, h.idx);
    for (const im of kind.meshes) im.instanceMatrix.needsUpdate = true;
  }
  matrixOf(id) {
    const h = this.handles.get(id);
    return h ? this.kinds.get(h.key).mats[h.idx] : null;
  }
  keyOf(id) { return this.handles.get(id)?.key; }
}
const _m = new THREE.Matrix4();

/* Wind sway for trees, done on the GPU so a hundred trees cost nothing on the CPU. */
export const swayUniforms = { uTime: { value: 0 }, uSway: { value: 0.025 }, uSpeed: { value: 1.3 } };
const swayCache = new Map();
export function swayMaterial(src) {
  if (swayCache.has(src)) return swayCache.get(src);
  const m = src.clone();
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, swayUniforms);
    shader.vertexShader = 'uniform float uTime;\nuniform float uSway;\nuniform float uSpeed;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float swayPh = 0.0;
      #ifdef USE_INSTANCING
        swayPh = instanceMatrix[3].x * 1.7 + instanceMatrix[3].z * 1.3;
      #endif
      float swayK = sin(uTime * uSpeed + swayPh) * uSway * max(0.0, transformed.y);
      transformed.x += swayK * 1.2;
      transformed.z += swayK * 0.6;`
    );
  };
  m.customProgramCacheKey = () => 'sway-' + src.uuid;
  swayCache.set(src, m);
  return m;
}
