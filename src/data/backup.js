import { STORAGE_KEY, VERSION, lockSaves } from './state.js';
import { listPhotos, putPhoto, clearPhotos } from './photos.js';

/*
 * Keeping a town safe while it lives only on this device:
 *   - a backup file holds the whole town plus its photos (one JSON file the family keeps anywhere: Files, Drive, email)
 *   - restoring replaces the town on this device with the one in the file
 *   - the browser is asked to protect saved data, and the game suggests installing it to the Home Screen
 *     (iPhone can clear a website's data after about a week without a visit; installed apps are kept)
 */
export const BACKUP_APP = 'life-city';
export const BACKUP_EVERY_DAYS = 30;
export const FIRST_BACKUP_AFTER_DAYS = 3;
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / DAY);

const toDataUrl = (blob) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(r.error); r.readAsDataURL(blob); });
const fromDataUrl = async (url) => (await fetch(url)).blob();

export async function makeBackup(state, now = new Date()) {
  const photos = {};
  for (const { id, blob } of await listPhotos()) { try { photos[id] = await toDataUrl(blob); } catch (e) { /* skip a photo that can't be read */ } }
  return JSON.stringify({ app: BACKUP_APP, v: 1, exportedAt: now.toISOString(), cityName: state.cityName, state, photos });
}
export const backupFileName = (state, day) => `${(state.cityName || 'life-city').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'life-city'}-backup-${day}.json`;

/* Reads a backup file's text. Throws an Error with a friendly message if it isn't a usable Life City backup. */
export function parseBackup(text) {
  let obj;
  try { obj = JSON.parse(text); } catch (e) { throw new Error('That file isn’t a Life City backup.'); }
  if (!obj || obj.app !== BACKUP_APP || !obj.state) throw new Error('That file isn’t a Life City backup.');
  const s = obj.state;
  if (s.v !== VERSION) throw new Error('That backup is from a different version of Life City.');
  if (!Array.isArray(s.buildings) || !Array.isArray(s.lists) || !Array.isArray(s.roads)) throw new Error('That backup looks damaged.');
  return { state: s, photos: obj.photos && typeof obj.photos === 'object' ? obj.photos : {}, exportedAt: obj.exportedAt || null, cityName: obj.cityName || s.cityName };
}

/* Replaces the town on this device with the backup. The page reloads afterwards. */
export async function restoreBackup(parsed) {
  lockSaves();
  await clearPhotos();
  for (const [id, url] of Object.entries(parsed.photos)) { try { await putPhoto(id, await fromDataUrl(url)); } catch (e) { /* keep going */ } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.state));
}

/* Is it time to suggest a backup? First after a few days of play, then about once a month. */
export function backupDue(state, day) {
  const last = state.settings?.lastBackup;
  if (!last) return !!state.startDate && daysBetween(state.startDate, day) >= FIRST_BACKUP_AFTER_DAYS;
  return daysBetween(last, day) >= BACKUP_EVERY_DAYS;
}

/* Storage protection (best effort; browsers decide). */
export async function storageProtected() { try { return !!(await navigator.storage?.persisted?.()); } catch (e) { return false; } }
export async function protectStorage() { try { return !!(await navigator.storage?.persist?.()); } catch (e) { return false; } }

/* Install as an app. Android/desktop Chrome hand us a prompt; iPhone needs Share → Add to Home Screen. */
let installEvent = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
export const isInstalled = () => typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true);
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const canPromptInstall = () => !!installEvent;
export async function promptInstall() {
  if (!installEvent) return null;
  installEvent.prompt();
  const r = await installEvent.userChoice.catch(() => null);
  installEvent = null;
  return r?.outcome === 'accepted';
}
