/*
 * Phase D stub. Events: one at a time, opt-in, 10–14 days long,
 * personal tiers at 3/6/10/15/20 logged actions, cosmetic rewards only.
 */
export const EVENT_TIERS = [3, 6, 10, 15, 20];
export const EVENT_LENGTH_DAYS = { min: 10, max: 14 };
export const SAMPLE_EVENTS = [
  { id: 'harvest-fair', name: 'Harvest Fair', days: 12, rewards: ['scarecrow', 'hay bales', 'pumpkin lanterns', 'fair banner', 'ferris wheel'] },
  { id: 'winter-lights', name: 'Winter Lights', days: 14, rewards: ['string lights', 'snow globe', 'wreaths', 'ice rink', 'light tunnel'] }
];
export function tierReached(actions) {
  return EVENT_TIERS.filter((t) => actions >= t).length;
}
