/* Surprises are cosmetic only and never give points. The sticker book tracks them. */
export const STICKERS = { balloon: 'a hot-air balloon', birds: 'a flock of birds', fireworks: 'fireworks', pets: 'the family pets' };
export const STICKER_NAMES = { balloon: 'Hot-air balloon', birds: 'Flock of birds', fireworks: 'Fireworks', pets: 'Family pets' };

export function spotSticker(state, kind) {
  if (!STICKERS[kind] || state.stickers.includes(kind)) return false;
  state.stickers.push(kind);
  return true;
}
