/*
 * Community challenges. Phase 1 uses sample totals; the family's own count comes from their logs.
 * Later: real totals from opted-in families (only totals are shared).
 */
export const CHALLENGES = [
  { id: 'meals', area: 'Home', title: '10,000 home moments', base: 6412, goal: 10000, note: 'Every Home goal logged in every city counts' },
  { id: 'dates', area: 'Marriage', title: '1,000 date nights', base: 418, goal: 1000, note: 'Married or dating, every one counts' },
  { id: 'hang', area: 'Friends', title: '2,500 times with friends', base: 1177, goal: 2500, note: 'Logged at each city’s diner' }
];

export function challengeRows(state, monthPrefix) {
  return CHALLENGES.map((c) => {
    const mine = state.goals.filter((g) => g.area === c.area).reduce((n, g) => n + g.done.filter((d) => d.startsWith(monthPrefix)).length, 0);
    return { ...c, mine, total: c.base + mine };
  });
}
