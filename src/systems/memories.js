import { grant } from './economy.js';

/*
 * Memories: "mark off a day" in any area with a short recap and/or a photo.
 * Photos are stored on this device only (IndexedDB); the state just keeps the photo id.
 * Small XP reward, up to 3 memories a day.
 */
export const MEMORY_XP = 5;
export const MEMORY_DAILY_CAP = 3;
export const MAX_RECAP = 280;
let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

export function addMemory(state, m, day) {
  const mem = {
    id: uid(), date: m.date || day, section: m.section, text: (m.text || '').trim().slice(0, MAX_RECAP),
    photoId: m.photoId || null, taskTitle: m.taskTitle || null, eventId: m.eventId || null, created: day
  };
  if (!mem.text && !mem.photoId) return null;
  state.memories.unshift(mem);
  const today = state.memories.filter((x) => x.created === day).length;
  const reward = today <= MEMORY_DAILY_CAP ? { xp: MEMORY_XP, coins: 0 } : null;
  if (reward) grant(state, reward);
  state.stats.memories = (state.stats.memories || 0) + 1;
  return { mem, reward };
}

export function removeMemory(state, id) {
  const i = state.memories.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [m] = state.memories.splice(i, 1);
  for (const e of state.events) if (e.memoryId === id) e.memoryId = null;
  return m;
}

export const memoriesFor = (state, { section = null, day = null } = {}) =>
  state.memories.filter((m) => (!section || m.section === section) && (!day || m.date === day));
