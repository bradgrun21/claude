/* Surprises are cosmetic only and never give points. The sticker book tracks them. */
export const STICKERS = {
  balloon: 'a hot-air balloon',
  birds: 'a flock of birds',
  icecream: 'the ice cream truck',
  rainbow: 'a rainbow',
  fireworks: 'fireworks',
  pets: 'the family pets'
};
export const STICKER_NAMES = {
  balloon: 'Hot-air balloon', birds: 'Flock of birds', icecream: 'Ice cream truck', rainbow: 'Rainbow', fireworks: 'Fireworks', pets: 'Family pets'
};

/* Returns true the first time a sticker is spotted. Points are untouched on purpose. */
export function spotSticker(state, kind) {
  if (!STICKERS[kind] || state.stickers.includes(kind)) return false;
  state.stickers.push(kind);
  return true;
}
