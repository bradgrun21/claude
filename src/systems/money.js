import { STARTER_CUSHION, stormFromMoney } from './storm.js';
import { addDays, fromKey } from './time.js';

/*
 * Money steps behind the storm, the districts and the debt-free clock.
 * Districts unlock only by real money steps — never by points or payment:
 *   Riverside  = Starter Cushion full
 *   Bridgeview = first debt paid
 *   Hillside   = Full Safety Net
 */
export const DISTRICT_KEYS = ['riverside', 'bridgeview', 'hillside'];
export const DISTRICT_NEED = {
  riverside: 'Starter Cushion full',
  bridgeview: 'First debt paid',
  hillside: 'Full Safety Net'
};
export const fullSafetyNet = (money) => Math.max(3000, Math.round(3 * (money.bills || 0)));

export function stepDone(money) {
  return {
    riverside: money.cushion >= STARTER_CUSHION,
    bridgeview: !!money.firstDebtPaid || (money.debtStart > 0 && money.debt <= 0),
    hillside: money.cushion >= fullSafetyNet(money)
  };
}

/* Real steps completed (0–3 for now; eras use 0–7 later). */
export function stepsCompleted(money) {
  const s = stepDone(money);
  return (s.riverside ? 1 : 0) + (s.bridgeview ? 1 : 0) + (s.hillside ? 1 : 0);
}

/* Sticky: once a district opens it never closes. Returns newly opened keys. */
export function checkUnlocks(state, today) {
  const done = stepDone(state.money);
  const opened = [];
  for (const k of DISTRICT_KEYS) if (done[k] && !state.unlocked[k]) { state.unlocked[k] = today; opened.push(k); }
  return opened;
}

/*
 * Payday: money goes to the Starter Cushion first, then extra to debt, then to the Full Safety Net.
 * Any real progress clears stall drift. A payday with nothing toward the plan adds drift (max 0.25).
 */
export function applyPayday(state, amount) {
  const m = state.money;
  const out = { toCushion: 0, toDebt: 0, toNet: 0 };
  let left = Math.max(0, Math.round(amount || 0));
  if (left > 0) {
    if (m.cushion < STARTER_CUSHION) { out.toCushion = Math.min(left, STARTER_CUSHION - m.cushion); m.cushion += out.toCushion; left -= out.toCushion; }
    if (left > 0 && m.debt > 0) { out.toDebt = Math.min(left, m.debt); m.debt -= out.toDebt; m.extraPaid = (m.extraPaid || 0) + out.toDebt; left -= out.toDebt; }
    if (left > 0) { out.toNet = left; m.cushion += left; left = 0; }
    m.stalledPaydays = 0;
  } else {
    m.stalledPaydays = (m.stalledPaydays || 0) + 1;
  }
  return out;
}

export function extraDebtPayment(state, amount) {
  const m = state.money;
  const a = Math.min(Math.max(0, Math.round(amount || 0)), m.debt);
  m.debt -= a;
  m.extraPaid = (m.extraPaid || 0) + a;
  if (a > 0) m.stalledPaydays = 0;
  return a;
}

/* Demo button: two paydays with no progress. */
export function stall(state, paydays = 2) {
  state.money.stalledPaydays = (state.money.stalledPaydays || 0) + paydays;
}

export function setPayoffDate(state, key) {
  state.money.payoffDate = key;
  state.money.stalledPaydays = 0;
}

export function stormNow(state) { return stormFromMoney(state.money); }

/* What one payday leaves after bills and debt minimums (the default "toward the plan" amount). */
export function paydayMargin(setup, periodDays) {
  const monthlyOut = (setup.bills || 0) + (setup.debtPayments || 0);
  return Math.round((setup.pay.amount || 0) - monthlyOut * (periodDays / 30.4));
}

/*
 * Debt-free clock tower. Baseline date = setup day + (debt at setup ÷ monthly payments) months.
 * Extra payments steal days back: days = extra paid ÷ monthly payment × 30.4.
 */
export function debtClock(money, today) {
  if (!(money.debtStart > 0)) return { status: 'none' };
  if (money.debt <= 0) return { status: 'free', stolen: 0 };
  if (!(money.debtPayments > 0)) return { status: 'no-payment' };
  const baselineDays = Math.round((money.debtStart / money.debtPayments) * 30.4);
  const stolen = Math.round(((money.extraPaid || 0) / money.debtPayments) * 30.4);
  let key = addDays(money.startDate, baselineDays - stolen);
  if (key < today) key = today;
  return { status: 'counting', date: fromKey(key), key, stolen };
}
