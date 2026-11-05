/* A small log of what happened in town, used by the town paper and building stories. No dollar amounts. */
export const MAX_JOURNAL = 300;

export function note(state, date, type, data = {}) {
  state.journal.push({ date, type, ...data });
  if (state.journal.length > MAX_JOURNAL) state.journal.splice(0, state.journal.length - MAX_JOURNAL);
}

export function since(state, fromKey) {
  return state.journal.filter((e) => e.date >= fromKey);
}
