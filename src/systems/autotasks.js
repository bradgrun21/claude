import { createList, addTask, listFor } from './lists.js';

/*
 * Tasks the game adds for you, in the Bank's list. They don't use up a task slot, and they check themselves off
 * when you do the real thing in the game. If you remove one, it stays removed.
 *   - Daily upload transactions: done when you log a purchase that day.
 *   - Update debt and savings balances (weekly): appears once the Debts step opens (money level 3);
 *     done when you update a balance or record a debt payment.
 */
export const AUTO_TASKS = {
  tx: { title: 'Daily upload transactions', kind: 'daily', per: 1 },
  bal: { title: 'Update debt and savings balances', kind: 'weekly', per: 1, minMoneyLevel: 3 }
};
export function ensureMoneyTasks(state, day) {
  const bank = state.buildings.find((b) => b.type === 'bank');
  if (!bank) return [];
  state.autoTasks = state.autoTasks || {};
  const added = [];
  for (const [k, a] of Object.entries(AUTO_TASKS)) {
    if (state.autoTasks[k]) continue;
    if (a.minMoneyLevel && (state.budget?.level || 1) < a.minMoneyLevel) continue;
    const list = listFor(state, bank.id) || createList(state, bank, '', [], day);
    const t = addTask(state, list.id, { title: a.title, kind: a.kind, per: a.per });
    t.auto = k;
    state.autoTasks[k] = t.id;
    added.push(t);
  }
  return added;
}
export function findAutoTask(state, k) {
  for (const list of state.lists) { const task = list.tasks.find((t) => t.auto === k); if (task) return { list, task }; }
  return null;
}
