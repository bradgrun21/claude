/*
 * Photos for memories, kept on this device only (IndexedDB). Nothing is uploaded in Phase 1.
 * Every call is wrapped so a blocked/private browser just keeps playing without photos.
 */
const DB = 'life-city-photos', STORE = 'photos';
const mem = new Map();
const urls = new Map();
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode);
      const r = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(r?.result ?? true);
      t.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

export async function putPhoto(id, blob) {
  mem.set(id, blob);
  await tx('readwrite', (s) => s.put(blob, id));
  return id;
}
export async function getPhotoUrl(id) {
  if (!id) return null;
  if (urls.has(id)) return urls.get(id);
  let blob = mem.get(id);
  if (!blob) {
    const db = await open();
    if (db) blob = await new Promise((resolve) => { try { const r = db.transaction(STORE).objectStore(STORE).get(id); r.onsuccess = () => resolve(r.result || null); r.onerror = () => resolve(null); } catch (e) { resolve(null); } });
  }
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urls.set(id, u);
  return u;
}
export async function deletePhoto(id) {
  mem.delete(id);
  if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
  await tx('readwrite', (s) => s.delete(id));
}
export async function clearPhotos() {
  mem.clear();
  await tx('readwrite', (s) => s.clear());
}

/* Shrink a camera photo (often 3–8 MB) to about 1024px JPEG so the device doesn't fill up. */
export function compressImage(file, max = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(src);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('Could not read that photo')); };
    img.src = src;
  });
}

/* Fill every <img data-photo="id"> inside a container. */
export async function hydratePhotos(root) {
  for (const el of root.querySelectorAll('img[data-photo]')) {
    const u = await getPhotoUrl(el.dataset.photo);
    if (u) el.src = u; else el.closest('.has-photo')?.classList.add('photo-missing');
  }
}
