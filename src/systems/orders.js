import { AREAS, AREA_INFO, MATERIALS } from '../data/areas.js';
import { perWeekByArea } from './rating.js';
import { addDays } from './time.js';

/*
 * Order board next to Town Hall. Max 3 orders. Each asks for 1–3 of ONE material,
 * tied to a goal the family set. Size = min(3, ceil(weeklyGoal / 3)).
 * Never creates orders for areas the family has no goal in.
 * Deliver → +1 star and +1 stamp on that resident's card. No build points.
 * "Not this week" removes it with no penalty. One refill each morning. Unfilled orders swap at payday.
 */
export const MAX_ORDERS = 3;
export const RESIDENTS = ['Mrs. Alvarez', 'Mr. Chen', 'Grandpa Joe', 'Nia', 'Miss June', 'Coach Dee', 'Mr. Patel', 'Rosa', 'Theo', 'Dr. Okafor', 'Benny', 'Auntie Lou', 'Mr. Hughes', 'Priya', 'Sal', 'Mrs. Kim', 'Eli', 'Grandma Bea'];

export function orderSize(weeklyGoal) {
  if (!(weeklyGoal > 0)) return 0;
  return Math.min(3, Math.ceil(weeklyGoal / 3));
}

export function emptyBoard() {
  return { list: [], seq: 0, lastRefill: null, skipped: {}, delivered: 0, perArea: {} };
}

function pickArea(state, today) {
  const per = perWeekByArea(state.goals);
  const board = state.orders;
  const onBoard = new Set(board.list.map((o) => o.area));
  const ranking = state.setup.ranking || AREAS;
  const candidates = ranking.filter((a) => per[a] > 0 && !onBoard.has(a) && !(board.skipped[a] && board.skipped[a] > today));
  if (!candidates.length) return null;
  /* Fair rotation: the area asked for least so far, ties by the family's ranking. */
  candidates.sort((a, b) => (board.perArea[a] || 0) - (board.perArea[b] || 0) || ranking.indexOf(a) - ranking.indexOf(b));
  return candidates[0];
}

export function makeOrder(state, today) {
  const area = pickArea(state, today);
  if (!area) return null;
  const per = perWeekByArea(state.goals);
  const board = state.orders;
  const goal = state.goals.find((g) => g.area === area && g.perWeek > 0);
  const seq = board.seq++;
  board.perArea[area] = (board.perArea[area] || 0) + 1;
  return {
    id: `o${seq}`,
    resident: RESIDENTS[seq % RESIDENTS.length],
    area,
    material: AREA_INFO[area].material,
    qty: orderSize(per[area]),
    goal: goal.label,
    created: today
  };
}

function fillTo(state, today, n) {
  let guard = 0;
  while (state.orders.list.length < n && guard++ < MAX_ORDERS) {
    const o = makeOrder(state, today);
    if (!o) break;
    state.orders.list.push(o);
  }
}

/* Call on load and each new day. First run fills the board; after that, one refill each morning. */
export function refillOrders(state, today) {
  const board = state.orders;
  if (board.lastRefill === today) return false;
  for (const [a, until] of Object.entries(board.skipped)) if (until <= today) delete board.skipped[a];
  const before = board.list.length;
  fillTo(state, today, board.lastRefill == null ? MAX_ORDERS : Math.min(MAX_ORDERS, before + 1));
  board.lastRefill = today;
  return board.list.length !== before;
}

export function canDeliver(state, order) {
  return (state.materials[order.material] || 0) >= order.qty;
}
export function anyDeliverable(state) {
  return state.orders.list.some((o) => canDeliver(state, o));
}

export function deliverOrder(state, id) {
  const board = state.orders;
  const o = board.list.find((x) => x.id === id);
  if (!o || !canDeliver(state, o)) return null;
  state.materials[o.material] -= o.qty;
  board.list.splice(board.list.indexOf(o), 1);
  board.delivered++;
  state.train.ordersSincePayday = (state.train.ordersSincePayday || 0) + 1;
  const card = state.residents[o.resident] || (state.residents[o.resident] = { stamps: 0 });
  card.stamps++;
  return o;
}

/* "Not this week": no penalty, that area rests for 7 days. */
export function skipOrder(state, id, today) {
  const board = state.orders;
  const o = board.list.find((x) => x.id === id);
  if (!o) return null;
  board.list.splice(board.list.indexOf(o), 1);
  board.skipped[o.area] = addDays(today, 7);
  return o;
}

export function swapOrdersAtPayday(state, today) {
  const old = state.orders.list.map((o) => o.area);
  state.orders.list = [];
  /* Prefer new areas first, then let the old ones come back. */
  for (const a of old) state.orders.perArea[a] = (state.orders.perArea[a] || 0) + 0.5;
  fillTo(state, today, MAX_ORDERS);
}

export function orderText(o) {
  const m = MATERIALS[o.material];
  return `${o.qty} ${o.qty === 1 ? m.one : m.label.toLowerCase()}`;
}
