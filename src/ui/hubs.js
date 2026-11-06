import { byId } from '../data/catalog.js';
import { reqFor } from '../systems/unlocks.js';
import * as TL from '../systems/tools.js';
import * as DI from '../systems/district.js';
import * as BZ from '../systems/business.js';
import * as LB from '../systems/logbook.js';
import { catById, nextPayday, paydayDue, money as toMoney } from '../systems/budget.js';
import { weekStart } from '../systems/lists.js';
import { shortDate } from '../systems/time.js';
import { esc, fmt$, svgI } from './icons.js';

/*
 * Hub menus: everything of one kind in one place, grouped into sections.
 * A tile is open (tap to use), new (ribbon not cut yet), ready to build, or locked (grey, with what unlocks it).
 */
const $m = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt$(Math.round(n)) : `$${n.toFixed(2)}`);
const bid = (state, type) => state.buildings.find((b) => b.type === type)?.id;

function tile({ emoji, name, line = '', status = 'open', attrs = '' }) {
  const locked = status === 'locked';
  return `<button type="button" class="htile ${status}"${locked ? ' aria-disabled="true"' : ''} ${locked ? '' : attrs}><span class="he">${emoji}</span><span class="ht"><b>${esc(name)}</b><small>${locked ? `${svgI('lock', 'currentColor', 11, 3)} ` : ''}${esc(line)}</small></span>${status === 'new' ? '<span class="hnew">New</span>' : status === 'build' ? '<span class="hbuild">Build</span>' : ''}</button>`;
}
const section = (title, tiles, note = '') => `<div class="hsec"><div class="hsec-h"><b>${esc(title)}</b>${note ? `<small>${esc(note)}</small>` : ''}</div><div class="hgrid">${tiles.join('')}</div></div>`;

/* A tile for something that lives in a building: open it, cut its ribbon, build it, or show why it's locked. */
function buildingTile(state, type, emoji, name, openLine, toolId = null) {
  const r = reqFor(state, type);
  const id = bid(state, type);
  if (r.built) {
    if (toolId && !TL.toolAvailable(state, toolId)) return tile({ emoji, name, line: `Reach town level ${TL.toolById[toolId].level}`, status: 'locked' });
    if (toolId && !TL.toolOpened(state, toolId)) return tile({ emoji, name, line: 'Tap for the grand opening', status: 'new', attrs: `data-open="${id}"` });
    return tile({ emoji, name, line: openLine(), attrs: `data-open="${id}"` });
  }
  if (r.ok) return tile({ emoji, name, line: `Build the ${byId[type].name}${r.cost ? ` · ${r.cost} coins` : ' · free'}`, status: 'build', attrs: `data-pick="${type}"` });
  return tile({ emoji, name, line: `${byId[type].name}: ${r.why}`, status: 'locked' });
}

/* ---------------- Money ---------------- */
export function renderMoneyHub(state, day) {
  const b = state.budget;
  const bank = bid(state, 'bank');
  const ml = b.level || 1;
  const bankR = reqFor(state, 'bank');
  const basics = bank ? [
    tile({ emoji: '📋', name: 'Budget', line: b.setup ? 'Your monthly plan' : 'Set it up (about 2 minutes)', status: b.setup ? 'open' : 'new', attrs: 'data-bankgo="budget"' }),
    tile({ emoji: '🧾', name: 'Log a purchase', line: `${b.transactions.filter((t) => t.date.startsWith(day.slice(0, 7))).length} logged this month`, attrs: 'data-bankgo="tx"', status: b.setup ? 'open' : 'locked' }),
    tile({ emoji: '🚂', name: 'Payday', line: !b.setup ? 'Set up your budget first' : paydayDue(b, day) ? 'Payday is here!' : nextPayday(b, day) ? `Next: ${shortDate(nextPayday(b, day))}` : 'Add a paycheck', status: !b.setup ? 'locked' : paydayDue(b, day) ? 'new' : 'open', attrs: 'data-hubpay="1"' }),
    tile({ emoji: '🐷', name: 'Savings & emergency fund', line: ml >= 2 ? `${b.funds.length} ${b.funds.length === 1 ? 'fund' : 'funds'}` : 'Reach money level 2', status: ml >= 2 ? 'open' : 'locked', attrs: 'data-bankgo="savings"' }),
    tile({ emoji: '⛄', name: 'Debt snowball', line: ml >= 3 ? `${BZ.debtStatus(state).paid} of ${b.debts.length} paid off` : 'Reach money level 3', status: ml >= 3 ? 'open' : 'locked', attrs: 'data-bankgo="debts"' })
  ] : [tile({ emoji: '🏦', name: 'Bank', line: bankR.ok ? 'Build the Bank to open Money' : bankR.why, status: bankR.ok ? 'build' : 'locked', attrs: 'data-pick="bank"' })];
  const district = DI.DISTRICT.map((d) => {
    const def = byId[d.building], id = bid(state, d.building), c = catById(d.cat);
    if (id) { const m = DI.catMonth(state, d.cat, day); return tile({ emoji: d.emoji, name: c.short, line: m.planned ? `${$m(m.spent)} of ${$m(m.planned)}` : `${$m(m.spent)} this month`, attrs: `data-distopen="${id}"` }); }
    if (bank && DI.catActive(state, d.cat)) return tile({ emoji: d.emoji, name: c.short, line: `Place the ${def.name} · free`, status: 'build', attrs: `data-pick="${d.building}"` });
    return tile({ emoji: d.emoji, name: c.short, line: bank ? 'Budget for it to unlock' : 'Build the Bank first', status: 'locked' });
  });
  const inv = state.invest;
  const grow = [
    buildingTile(state, 'newsstation', '📰', 'Subscriptions', () => { const n = TL.subsToReview(state, day).length; return n ? `${n} to check in` : `${state.subs.filter((s) => s.status === 'active').length} active`; }, 'subs'),
    buildingTile(state, 'nestegg', '🥚', 'Nest Egg', () => `${Math.floor(inv?.bal || 0).toLocaleString('en-US')} coins growing`),
    buildingTile(state, 'monument', '🏛️', 'Debt Freedom Monument', () => { const s = BZ.debtStatus(state); return s.free ? 'Debt free!' : `${s.paid} of ${s.total} paid off`; })
  ];
  return `${bank ? '' : '<p class="hint">Money opens with the Bank. It’s the second area, right after To-Do.</p>'}
    ${section('Budget', basics, bank ? `Money level ${ml}` : '')}
    ${section('Budget District', district, 'A building for each category you budget')}
    ${section('Grow & celebrate', grow)}`;
}

/* ---------------- Trackers ---------------- */
export function renderTrackersHub(state, day) {
  const wk = weekStart(day);
  const home = [
    buildingTile(state, 'grocery', '🥕', 'Meal Planner', () => `${TL.plannedCount(state, day)} of 7 dinners planned`, 'meals'),
    buildingTile(state, 'gasstation', '🔧', 'Car & Home Care', () => { const n = TL.careDueCount(state, day); return n ? `${n} ready when you are` : `${(state.care?.items || []).length} things tracked`; }, 'care'),
    buildingTile(state, 'repairshop', '🧰', 'Repair Log', () => `${state.logs?.repair?.length || 0} repairs logged`, 'repair')
  ];
  const family = [
    buildingTile(state, 'townhall', '🏛️', 'Family Meeting', () => (TL.meetingThisWeek(state, day) ? 'Done this week ✓' : 'Ready for this week'), 'meeting'),
    buildingTile(state, 'school', '⭐', 'Kids’ Corner', () => `${(state.kids?.log || []).filter((l) => l.day >= wk).length} stars this week`, 'kids'),
    buildingTile(state, 'postoffice', '💌', 'Birthdays & Cards', () => { const u = TL.upcomingPeople(state, day, 30)[0]; return u ? `${u.name} in ${u.days} ${u.days === 1 ? 'day' : 'days'}` : `${(state.cards?.people || []).length} people`; }, 'cards'),
    buildingTile(state, 'cafe', '☕', 'Date Night Jar', () => `${(state.dates?.ideas || []).length} ideas in the jar`, 'dates'),
    buildingTile(state, 'giftshop', '🎁', 'Gifts & Sizes', () => `${(state.logs?.gifts || []).filter((e) => e.kind === 'Idea').length} gift ideas saved`, 'gifts'),
    buildingTile(state, 'vet', '🐾', 'Pet Records', () => { const n = LB.logDueSoon(state, 'vet', day); return n ? `${n} due soon` : `${state.logs?.vet?.length || 0} records`; }, 'vet')
  ];
  return `${section('Home', home)}${section('Family', family)}<p class="foot">Each tracker opens with its building. Locked ones say what unlocks them.</p>`;
}

/* ---------------- How it works ---------------- */
export function renderHowItWorks() {
  const step = (n, t, b) => `<div class="how"><span class="ag-n">${n}</span><span><b>${t}</b><small>${b}</small></span></div>`;
  return `<p class="hint">Life City grows when real life does. Here’s the whole path, one step at a time.</p>
    ${step(1, 'Start with To-Do', 'Build the Community Job Board (free) and add one task. That’s it for day one.')}
    ${step(2, 'Form a habit', 'Check a task off on 3 different days. That unlocks the area’s next building and room for one more task.')}
    ${step(3, 'Open areas one at a time', 'To-Do → Financial (Bank) → Relational (after your budget is set) → Physical → Spiritual.')}
    ${step(4, 'Money', 'At the Bank: set up the budget, log purchases, and catch the payday train. Each category you budget builds its own building. Money levels open savings (level 2) and the debt snowball (level 3).')}
    ${step(5, 'Grow the town', 'Coins build homes, shops and roads. People let you open more Main Street shops, and shops earn coins every day. XP and people level up the town.')}
    ${step(6, 'Trackers', 'Some buildings open helpers: meals, car care, birthdays, the date jar, Kids’ Corner, the family meeting (level 3), and more. All of them live in the Trackers menu.')}
    ${step(7, 'Rewards', 'Quick wins, daily challenges, achievements, and decorations you can only earn by showing up week after week.')}
    <p class="foot">Showing up daily matters more than adding more. One rest day a week never breaks a streak.</p>`;
}
