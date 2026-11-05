/*
 * Phase D stub. Resident cards: 3 orders filled completes a card;
 * 6 cards per district = a set → a district decoration. Deterministic, never random.
 * (Stamps are already counted today when orders are delivered.)
 */
export const STAMPS_PER_CARD = 3;
export const CARDS_PER_SET = 6;
export function cardsComplete(residents) {
  return Object.values(residents).filter((r) => r.stamps >= STAMPS_PER_CARD).length;
}
export function setsComplete(residents) {
  return Math.floor(cardsComplete(residents) / CARDS_PER_SET);
}
