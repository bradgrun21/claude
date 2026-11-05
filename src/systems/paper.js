import { AREAS } from '../data/areas.js';
import { STARTER_CUSHION, stormLabel } from './storm.js';
import { addDays, longDate, weekday, shortDate } from './time.js';
import { doneInWeek, perWeekByArea } from './rating.js';
import { since } from './journal.js';
import { fullSafetyNet } from './money.js';
import { challengeRows } from './community.js';
import { starsNow } from './train.js';
import { STICKER_NAMES } from './surprises.js';

/*
 * The town paper is written from the family's real week. It is shareable, so it never
 * contains a dollar amount — only percentages, counts and days.
 */
const DNAME = { riverside: 'Riverside', bridgeview: 'Bridgeview', hillside: 'Hillside' };
const LEVELS = ['Calm', 'Choppy', 'Stormy', 'High water'];

export function cushionPct(money) {
  if (money.cushion < STARTER_CUSHION) return { label: 'Starter Cushion', pct: Math.round((money.cushion / STARTER_CUSHION) * 100) };
  return { label: 'Full Safety Net', pct: Math.min(100, Math.round((money.cushion / fullSafetyNet(money)) * 100)) };
}

export function buildPaper(state, today, storm) {
  const from = addDays(today, -6);
  const week = since(state, from);
  const city = state.setup.cityName;
  const days = state.loggedDays.filter((d) => d >= from && d <= today).length;
  const per = perWeekByArea(state.goals);
  const areaLines = AREAS.filter((a) => per[a]).map((a) => ({ area: a, done: Math.min(per[a], doneInWeek(state.goals, a, today)), goal: per[a] }));
  const best = [...areaLines].sort((a, b) => b.done / b.goal - a.done / a.goal)[0];
  const cush = cushionPct(state.money);
  const label = stormLabel(storm);

  const unlock = week.find((e) => e.type === 'unlock');
  const payday = [...week].reverse().find((e) => e.type === 'payday');
  const built = week.filter((e) => e.type === 'built');
  const stormEvents = week.filter((e) => e.type === 'storm');
  const delivered = week.filter((e) => e.type === 'delivered').length;
  const stickers = week.filter((e) => e.type === 'sticker');
  const calmer = stormEvents.length && LEVELS.indexOf(stormEvents.at(-1).to) < LEVELS.indexOf(stormEvents[0].from);
  const founded = state.startDate >= from;

  let headline, lede;
  if (unlock) {
    headline = `${DNAME[unlock.district]} opens its gates`;
    lede = `A real money step opened a new district this week. Fog lifted, a bridge rose from the water and the first lots are ready.`;
  } else if (calmer) {
    headline = `Water drops as the cushion tower climbs to ${cush.pct}%`;
    lede = `The storm reading moved from ${stormEvents[0].from.toLowerCase()} to ${label.toLowerCase()} this week. The ${cush.label} is ${cush.pct}% full.`;
  } else if (payday) {
    headline = `Payday train brings ${payday.cars} ${payday.cars === 1 ? 'car' : 'cars'} of supplies`;
    lede = `The train pulled in on ${weekday(payday.date)} with ${payday.stars} ${payday.stars === 1 ? 'star' : 'stars'} earned and harvested ${payday.crops} ${payday.crops === 1 ? 'crop' : 'crops'} from the family garden.`;
  } else if (built.length) {
    headline = built.length === 1 ? `New ${built[0].name.toLowerCase()} opens in town` : `${built.length} new builds go up around town`;
    lede = `Every brick came from habits, not dollars. ${days} ${days === 1 ? 'day' : 'days'} logged this week kept the crews busy.`;
  } else if (founded) {
    headline = `${city} is founded`;
    lede = `A new family city rose from the water this week. The ${cush.label} stands at ${cush.pct}% and the storm reads ${label.toLowerCase()}.`;
  } else if (days >= 5) {
    headline = `A ${days}-day week lifts the whole town`;
    lede = `The family logged on ${days} of the last 7 days. The storm reads ${label.toLowerCase()} and the ${cush.label} is ${cush.pct}% full.`;
  } else {
    headline = `A quiet week in ${city}`;
    lede = `Some weeks are quiet. One log at any building wakes the town back up. The ${cush.label} is ${cush.pct}% full.`;
  }

  const comm = challengeRows(state, today.slice(0, 7)).sort((a, b) => b.mine - a.mine)[0];
  const next = state.setup.pay.next;
  const stars = starsNow(state, today);
  const cols = [
    { h: 'Around town', p: best ? `${days} ${days === 1 ? 'day' : 'days'} logged this week. Strongest goal: ${best.area.toLowerCase()}, ${best.done} of ${best.goal}.${built.length ? ` New this week: ${built.map((b) => b.name.toLowerCase()).join(', ')}.` : ''}` : `${days} days logged this week.` },
    { h: 'Goals this week', p: areaLines.length ? areaLines.slice(0, 4).map((l) => `${l.area} ${l.done} of ${l.goal}`).join(' · ') : 'No weekly goals set yet.' },
    { h: 'Community', p: comm ? `Families everywhere have logged ${comm.total.toLocaleString('en-US')} toward “${comm.title}.” This family added ${comm.mine} this month.` : '' },
    { h: 'Coming up', p: `${next ? `Payday is ${weekday(next)}, ${shortDate(next)}.` : ''} ${stars} ${stars === 1 ? 'star is' : 'stars are'} waiting for the train.${delivered ? ` ${delivered} ${delivered === 1 ? 'order' : 'orders'} filled this week.` : ''}${stickers.length ? ` Spotted: ${stickers.map((s) => STICKER_NAMES[s.kind].toLowerCase()).join(', ')}.` : ''}` }
  ];
  return { title: 'The Life City Gazette', city, date: longDate(today), headline, lede, cols };
}
