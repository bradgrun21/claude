import { SECTIONS } from '../data/catalog.js';
import * as T from '../systems/tools.js';
import { listFor, isAvailable, freqLabel } from '../systems/lists.js';
import { nextPayday } from '../systems/budget.js';
import { addDays, shortDate, weekday, daysBetween } from '../systems/time.js';
import { weekStart } from '../systems/lists.js';
import { svgI, esc, fmt$ } from './icons.js';
import { ART } from './art.js';
import { renderLog, LOG_TABS } from './logbook.js';
import { renderPath } from './paths.js';
import { pathStatus } from '../systems/paths.js';

/*
 * Screens for the building tools. Every input carries data-uf="key" so main.js can keep what's been typed
 * in panel.ui across re-renders; every button carries data-ta="action" (+ data-id).
 */
const money = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt$(Math.round(n)) : `$${n.toFixed(2)}`);
const v = (ui, k, d = '') => esc(ui[k] ?? d);
const btn = (a, label, { id = '', cls = 'soft small', extra = '' } = {}) => `<button type="button" class="btn ${cls}" data-ta="${a}"${id ? ` data-id="${esc(id)}"` : ''}${extra}>${label}</button>`;
const reward = (r) => `<span class="cost"><i class="ci">${ART.coin}</i>${r.coins}</span>`;
const dot = (c, t) => `<span class="who" style="--c:${c}">${esc(t)}</span>`;

export const TOOL_TABS = {
  meals: [['week', 'This week'], ['recipes', 'Recipes'], ['list', 'Grocery list']],
  care: [['care', 'Upkeep']],
  subs: [['subs', 'Subscriptions']],
  cards: [['up', 'Coming up'], ['people', 'Everyone'], ['thanks', 'Thank-yous']],
  dates: [['jar', 'The jar'], ['ideas', 'All ideas']],
  kids: [['kids', 'Stars'], ['rewards', 'Rewards'], ['reading', 'Reading']],
  meeting: [['meet', 'This week'], ['past', 'Past meetings']],
  ...LOG_TABS
};

/* ---------- Ribbon cutting ---------- */
export function renderRibbon(tool, buildingName, state) {
  const t = T.toolById[tool];
  const first = state && pathStatus(state, tool)?.steps[0];
  return `<div class="ribbon-wrap"><div class="rb-band"><span class="rb-l"></span><span class="rb-bow">🎀</span><span class="rb-r"></span></div>
    <b class="ttl">Grand opening at the ${esc(buildingName)}!</b>
    <div class="rb-tool"><span class="rb-emoji">${t.emoji}</span><span><b>New: ${esc(t.name)}</b><small>${esc(t.blurb)}</small></span></div>
    <p class="rb-keeper"><b>${esc(t.keeper)}:</b> “Welcome! Cut the ribbon and I’ll show you around.”</p>
    <div class="rb-quest"><span>First step: <b>${esc(first ? first.title : t.quest.text)}</b>${first ? ` · ${esc(first.desc)}` : ''}</span>${reward(first ? first.reward : t.reward)}</div>
    <p class="foot">Each step opens the next one, so it never gets to be too much at once.</p>
    <div class="actions"><button type="button" class="btn go-btn big" data-ribbon="${tool}">✂️ Cut the ribbon</button></div></div>`;
}

/* ---------- Quest strip at the top of each tool ---------- */
function questStrip(state, id) {
  const q = T.questProgress(state, id);
  if (q.claimed) return '';
  const t = T.toolById[id];
  return `<div class="tq${q.ready ? ' ready' : ''}"><span>${t.emoji} <b>${esc(t.quest.text)}</b> · ${q.have} of ${q.need}</span><div class="pbar"><i style="width:${(q.have / q.need) * 100}%"></i></div>
    ${q.ready ? btn('quest', `Claim ${t.reward.coins} coins`, { cls: 'go-btn small' }) : `${reward(t.reward)}`}</div>`;
}

export function renderTool(state, p, day) {
  const id = p.tool, ui = p.ui || {};
  const body = T.toolById[id].log ? renderLog(state, id, p.tab, ui, day) : { meals, care, subs, cards, dates, kids, meeting }[id](state, p.tab, ui, day);
  return (pathStatus(state, id) ? renderPath(state, id) : questStrip(state, id)) + body;
}

/* ================= Meal Planner ================= */
function meals(state, tab, ui, day) {
  const M = state.meals;
  if (tab === 'recipe') {
    const r = ui.rid ? M.recipes.find((x) => x.id === ui.rid) : null;
    return `<label class="q" for="rcName">Recipe</label><input class="field" id="rcName" data-uf="rname" maxlength="50" value="${v(ui, 'rname', r?.name)}" placeholder="Like “Grandma’s chili”" autocomplete="off">
      <label class="q" for="rcIng">Ingredients <small>(one per line, they go on the grocery list)</small></label><textarea class="field" id="rcIng" data-uf="ring" rows="6" placeholder="Ground beef&#10;Beans&#10;Tomatoes">${v(ui, 'ring', r?.ingredients.join('\n'))}</textarea>
      <label class="q" for="rcNotes">How to make it <small>(optional)</small></label><textarea class="field" id="rcNotes" data-uf="rnotes" rows="3">${v(ui, 'rnotes', r?.notes)}</textarea>
      <div class="actions">${btn('rsave', 'Save recipe', { cls: 'go-btn' })}${r ? btn('rdel', 'Remove', { id: r.id, cls: 'soft' }) : ''}${btn('tab', 'Back', { id: 'recipes', cls: 'soft' })}</div>`;
  }
  if (tab === 'recipes') {
    const have = new Set(M.recipes.map((r) => r.name.toLowerCase()));
    return `<div class="brow"><b class="h3">Your recipe box · ${M.recipes.length}</b>${btn('rnew', `${svgI('plus', 'currentColor', 14, 3)} New recipe`, { cls: 'go-btn small' })}</div>
      ${M.recipes.map((r) => `<button type="button" class="tool-row" data-ta="redit" data-id="${r.id}"><span><b>${esc(r.name)}</b><small>${r.ingredients.length} ingredients${r.notes ? ' · has notes' : ''}</small></span>${svgI('edit', 'currentColor', 16)}</button>`).join('') || '<p class="hint">No recipes yet. Add your family’s favorites, or start with an idea below.</p>'}
      <div class="h3">💡 Easy family favorites</div>
      ${T.STARTER_RECIPES.map(([n, ing], k) => `<div class="idea-row"><span><b>${esc(n)}</b><small>${esc(ing.split('\n').join(' · '))}</small></span>${have.has(n.toLowerCase()) ? '<span class="added">✓ Added</span>' : btn('rstarter', '+ Add', { id: String(k), cls: 'go-btn small' })}</div>`).join('')}`;
  }
  if (tab === 'list') {
    const open = M.list.filter((i) => !i.done), done = M.list.filter((i) => i.done);
    return `<div class="te-row"><input class="field" id="giText" data-uf="gitem" maxlength="60" value="${v(ui, 'gitem')}" placeholder="Add an item" autocomplete="off">${btn('gadd', 'Add', { cls: 'go-btn small' })}${btn('gbuild', '↻ From this week’s meals', { cls: 'soft small' })}</div>
      ${open.map((i) => `<div class="task"><button type="button" class="check" data-ta="gtoggle" data-id="${i.id}" aria-label="Got ${esc(i.text)}"></button><span class="tx"><b>${esc(i.text)}</b>${i.from ? `<small>${esc(i.from)}</small>` : ''}</span></div>`).join('') || '<p class="hint">The list is empty. Plan some dinners, then tap “From this week’s meals”.</p>'}
      ${done.length ? `<div class="h3">In the cart · ${done.length}</div>${done.map((i) => `<div class="task done"><button type="button" class="check" data-ta="gtoggle" data-id="${i.id}" aria-label="Put back ${esc(i.text)}">${svgI('check', '#fff', 18, 3)}</button><span class="tx"><b>${esc(i.text)}</b></span></div>`).join('')}<div class="actions">${btn('gclear', 'Clear the cart', { cls: 'soft' })}</div>` : ''}`;
  }
  /* week: days down the left, breakfast / lunch / dinner across, each with optional sides */
  const wk = ui.week || weekStart(day);
  const name = (id) => (id === 'leftovers' ? 'Leftovers' : id === 'out' ? 'Eat out' : M.recipes.find((r) => r.id === id)?.name || '');
  const opts = (sel) => `<option value="skip">—</option>${M.recipes.map((r) => `<option value="${r.id}"${sel === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}<option value="leftovers"${sel === 'leftovers' ? ' selected' : ''}>Leftovers</option><option value="out"${sel === 'out' ? ' selected' : ''}>Eat out</option>`;
  const cell = (d, slot) => {
    const m = T.mealSlot(state, d, slot);
    const sides = m?.sides || [];
    return `<div class="mt-cell"><select class="freq meal" data-meal="${d}:${slot}" aria-label="${T.MEAL_NAMES[slot]} on ${weekday(d)}">${opts(m?.main)}</select>
      ${sides.map((id) => `<button type="button" class="side-chip" data-ta="sidedel" data-id="${d}|${slot}|${id}" aria-label="Remove ${esc(name(id))}">+ ${esc(name(id))} ✕</button>`).join('')}
      ${M.recipes.length && sides.length < T.MAX_SIDES ? `<select class="side-add" data-side="${d}:${slot}" aria-label="Add a side"><option value="">+ side</option>${M.recipes.filter((r) => r.id !== m?.main && !sides.includes(r.id)).map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>` : ''}</div>`;
  };
  const rows = [0, 1, 2, 3, 4, 5, 6].map((k) => { const d = addDays(wk, k); return `<div class="mt-day${d === day ? ' today' : ''}"><b>${weekday(d).slice(0, 3)}</b><small>${shortDate(d)}</small></div>${T.MEAL_SLOTS.map((sl) => cell(d, sl)).join('')}`; }).join('');
  const n = T.plannedCount(state, wk);
  return `<div class="brow">${btn('mweek', '‹', { id: addDays(wk, -7) })}<b class="h3">Meals · week of ${shortDate(wk)}</b>${btn('mweek', '›', { id: addDays(wk, 7) })}</div>
    ${M.recipes.length ? '' : `<p class="hint">Add a few recipes first, then pick one for each meal. ${btn('tab', 'Go to recipes', { id: 'recipes', cls: 'link small' })}</p>`}
    <div class="meal-table"><span></span>${T.MEAL_SLOTS.map((sl) => `<span class="mt-h">${T.MEAL_NAMES[sl]}</span>`).join('')}${rows}</div>
    <div class="actions">${btn('gbuild', '🛒 Make the grocery list', { cls: 'go-btn' })}${T.canClaimMealPlan(state, wk) && wk === weekStart(day) ? btn('mclaim', `Week planned! +${T.MEAL_PLAN_REWARD.coins} coins`, { cls: 'go-btn' }) : `<span class="hint">${n} ${n === 1 ? 'meal' : 'meals'} planned${n < 4 ? ' · plan 4 for a weekly bonus' : ''}</span>`}</div>
    <p class="foot">Sides (salad, garlic bread…) are recipes too. Their ingredients go on the grocery list with the meal.</p>`;
}

/* ================= Car & Home Care ================= */
const STATUS = { new: ['When was it last done?', 'new'], ok: ['', 'ok'], soon: ['Coming up', 'soon'], ready: ['Ready when you are', 'ready'] };
function care(state, tab, ui, day) {
  const C = state.care;
  const thing = (th) => {
    const items = C.items.filter((i) => i.thingId === th.id).sort((a, b) => (T.careNext(a) || '9') .localeCompare(T.careNext(b) || '9'));
    return `<div class="care-card"><div class="brow"><b class="h3">${th.kind === 'home' ? '🏠' : '🚗'} ${esc(th.name)}</b>${btn('cthdel', 'Remove', { id: th.id, cls: 'link small' })}</div>
      ${items.map((i) => { const st = T.careStatus(i, day); const nx = T.careNext(i); return `<div class="care-row ${st}"><span class="cr-t"><b>${esc(i.name)}</b><small>Every ${i.months} ${i.months === 1 ? 'month' : 'months'}${nx ? ` · next ${shortDate(nx)}` : ''}${STATUS[st][0] ? ` · ${STATUS[st][0]}` : ''}</small></span>
        ${st === 'new' ? `<input class="field date small" type="date" data-uf="last_${i.id}" value="${v(ui, `last_${i.id}`)}" aria-label="Last done">${btn('clast', 'Set', { id: i.id })}` : ''}${btn('clog', 'Done today', { id: i.id, cls: st === 'ready' || st === 'soon' ? 'go-btn small' : 'soft small' })}${btn('cidel', '–', { id: i.id, cls: 'trm', extra: ' aria-label="Remove"' })}</div>`; }).join('')}
      <div class="te-row add-care"><input class="field small" data-uf="cin_${th.id}" maxlength="40" value="${v(ui, `cin_${th.id}`)}" placeholder="Add something else" autocomplete="off"><select class="freq" data-uf="cim_${th.id}">${[1, 3, 6, 12, 24].map((m) => `<option value="${m}"${String(ui[`cim_${th.id}`] || 12) === String(m) ? ' selected' : ''}>Every ${m} mo</option>`).join('')}</select>${btn('ciadd', 'Add', { id: th.id })}</div></div>`;
  };
  return `${C.things.map(thing).join('') || '<p class="hint">Add your car and your home. We’ll fill in the usual upkeep, and you can change anything.</p>'}
    <div class="card2"><b>Add a car or home</b><div class="te-row"><input class="field" data-uf="thname" maxlength="40" value="${v(ui, 'thname')}" placeholder="Like “Honda Odyssey”" autocomplete="off">${btn('thadd', '🚗 Add a car', { id: 'car', cls: 'go-btn small' })}${btn('thadd', '🏠 Add a home', { id: 'home', cls: 'soft small' })}</div></div>
    <p class="foot">Logging upkeep earns ${T.CARE_REWARD.coins} coins (up to 3 a week). Nothing here is ever “late”, it just comes around again.</p>`;
}

/* ================= Subscriptions ================= */
function subs(state, tab, ui, day) {
  const tot = T.subTotals(state);
  const review = T.subsToReview(state, day);
  const active = state.subs.filter((s) => s.status === 'active'), gone = state.subs.filter((s) => s.status === 'cancelled');
  const row = (s) => `<div class="tool-row static"><span><b>${esc(s.name)}</b><small>${money(s.amount)} ${s.cycle === 'yearly' ? 'a year' : 'a month'}${s.reviewedOn ? ` · reviewed ${shortDate(s.reviewedOn)}` : ''}</small></span>${btn('sdel', 'Remove', { id: s.id, cls: 'link small' })}</div>`;
  return `<div class="sub-sum"><span><b>${money(tot.monthly)}</b><small>a month · ${tot.count} active</small></span>${tot.savedYear ? `<span class="saved"><b>${money(tot.savedYear)}</b><small>a year saved by canceling</small></span>` : ''}</div>
    ${review.length ? `<div class="h3">Time for a check-in · ${review.length}</div><p class="hint">Still using it? Still worth it? Keep what you love, cancel the rest.</p>${review.map((s) => `<div class="tool-row static review"><span><b>${esc(s.name)}</b><small>${money(s.amount)} ${s.cycle === 'yearly' ? 'a year' : 'a month'}</small></span>${btn('skeep', 'Keep', { id: s.id })}${btn('scancel', 'I canceled it', { id: s.id, cls: 'go-btn small' })}</div>`).join('')}` : ''}
    <div class="card2"><b>Add a subscription</b><div class="te-row"><input class="field" data-uf="sname" maxlength="40" value="${v(ui, 'sname')}" placeholder="Like “Netflix” or “Phone plan”" autocomplete="off"><span class="dollar"><input class="field small" data-uf="samt" inputmode="decimal" value="${v(ui, 'samt')}" placeholder="0.00"></span><select class="freq" data-uf="scycle"><option value="monthly">Monthly</option><option value="yearly"${ui.scycle === 'yearly' ? ' selected' : ''}>Yearly</option></select>${btn('sadd', 'Add', { cls: 'go-btn small' })}</div></div>
    ${active.filter((s) => !review.includes(s)).length ? `<div class="h3">Keeping</div>${active.filter((s) => !review.includes(s)).map(row).join('')}` : ''}
    ${gone.length ? `<div class="h3">Canceled 🎉</div>${gone.map((s) => `<div class="tool-row static gone"><span><b>${esc(s.name)}</b><small>Canceled ${shortDate(s.cancelledOn)} · ${money(T.subMonthly(s) * 12)} a year back in your pocket</small></span></div>`).join('')}` : ''}
    <p class="foot">Each subscription asks for a quick check-in every 6 months. Amounts stay on this device and never show on anything shareable.</p>`;
}

/* ================= Birthdays & Cards ================= */
function cards(state, tab, ui, day) {
  const add = `<div class="card2"><b>Add a birthday or anniversary</b><div class="te-row"><input class="field" data-uf="pname" maxlength="40" value="${v(ui, 'pname')}" placeholder="Name" autocomplete="off"><input class="field date" type="date" data-uf="pdate" value="${v(ui, 'pdate')}" aria-label="Date"><select class="freq" data-uf="pkind"><option value="birthday">Birthday</option><option value="anniversary"${ui.pkind === 'anniversary' ? ' selected' : ''}>Anniversary</option></select>${btn('padd', 'Add', { cls: 'go-btn small' })}</div><p class="foot">Know the year? Use it and we’ll show the age. Don’t? Any year works.</p></div>`;
  if (tab === 'people') {
    const all = T.upcomingPeople(state, day, 366);
    return `${add}${all.map((p) => `<div class="tool-row static"><span><b>${p.kind === 'anniversary' ? '💍' : '🎂'} ${esc(p.name)}</b><small>${shortDate(p.on)}${p.turning ? ` · ${p.kind === 'anniversary' ? `${p.turning} years` : `turns ${p.turning}`}` : ''}</small></span>${btn('pdel', 'Remove', { id: p.id, cls: 'link small' })}</div>`).join('')}`;
  }
  if (tab === 'thanks') {
    const open = state.cards.thanks.filter((n) => !n.done), done = state.cards.thanks.filter((n) => n.done).slice(-8).reverse();
    return `<div class="card2"><b>Someone to thank?</b><div class="te-row"><input class="field" data-uf="tyto" maxlength="40" value="${v(ui, 'tyto')}" placeholder="Who" autocomplete="off"><input class="field" data-uf="tyfor" maxlength="80" value="${v(ui, 'tyfor')}" placeholder="For what (optional)" autocomplete="off">${btn('tyadd', 'Add', { cls: 'go-btn small' })}</div></div>
      ${open.map((n) => `<div class="tool-row static"><span><b>✉️ ${esc(n.to)}</b>${n.for ? `<small>${esc(n.for)}</small>` : ''}</span>${btn('tysent', 'Sent it', { id: n.id, cls: 'go-btn small' })}</div>`).join('') || '<p class="hint">No thank-you notes waiting.</p>'}
      ${done.length ? `<div class="h3">Sent</div>${done.map((n) => `<div class="tool-row static gone"><span><b>${esc(n.to)}</b><small>${shortDate(n.done)}</small></span></div>`).join('')}` : ''}`;
  }
  const up = T.upcomingPeople(state, day, 45);
  return `${up.map((p) => `<div class="tool-row static${p.days <= 7 && !p.sent ? ' review' : ''}"><span><b>${p.kind === 'anniversary' ? '💍' : '🎂'} ${esc(p.name)}${p.turning ? ` · ${p.kind === 'anniversary' ? `${p.turning} years` : `turns ${p.turning}`}` : ''}</b><small>${weekday(p.on)}, ${shortDate(p.on)} · ${p.days === 0 ? 'today!' : p.days === 1 ? 'tomorrow' : `in ${p.days} days`}</small></span>${p.sent ? '<span class="added">✓ Card sent</span>' : btn('csent', p.days <= 10 ? '💌 Card sent' : 'Sent early', { id: p.id, cls: p.days <= 10 ? 'go-btn small' : 'soft small' })}</div>`).join('') || `<p class="hint">Nothing in the next 45 days. ${state.cards.people.length ? '' : 'Add the people you love below.'}</p>`}
    ${state.cards.people.length < 5 ? add : ''}
    <p class="foot">You’ll get a heads-up bubble a week ahead. Birthdays also show on the calendar.</p>`;
}

/* ================= Date Night Jar ================= */
function dates(state, tab, ui, day) {
  const ideas = state.dates.ideas || [];
  if (tab === 'ideas') {
    return `<div class="card2"><b>Add your own idea</b><div class="te-row"><input class="field" data-uf="dtext" maxlength="60" value="${v(ui, 'dtext')}" placeholder="Like “Kayaking at the lake”" autocomplete="off"><select class="freq" data-uf="dcost"><option value="free">Free</option><option value="$"${ui.dcost === '$' ? ' selected' : ''}>$</option><option value="$$"${ui.dcost === '$$' ? ' selected' : ''}>$$</option></select>${btn('dadd', 'Add', { cls: 'go-btn small' })}</div></div>
      ${ideas.map((i) => `<div class="tool-row static"><span><b>${esc(i.text)}</b><small>${i.cost === 'free' ? 'Free' : i.cost}${i.used ? ` · done ${i.used}×` : ''}</small></span>${btn('ddel', 'Remove', { id: i.id, cls: 'link small' })}</div>`).join('')}`;
  }
  const drawn = ui.drawn && ideas.find((i) => i.id === ui.drawn);
  const f = ui.dfilter || 'any';
  const seg = (k, l) => `<button type="button" data-ta="dfilter" data-id="${k}" aria-pressed="${f === k}">${l}</button>`;
  const recent = state.dates.drawn.slice(-3).reverse().map((d) => ({ d, ev: state.events.find((e) => e.id === d.eventId) })).filter((x) => x.ev);
  return `<div class="jar-wrap"><button type="button" class="jar" data-ta="ddraw" aria-label="Draw a date">${drawn ? '<span class="jar-paper">✨</span>' : ''}<span class="jar-lid"></span><span class="jar-body">${ideas.slice(0, 14).map((_, k) => `<i style="--k:${k};left:${8 + ((k * 37) % 80)}px;bottom:${6 + Math.floor(k / 4) * 15 + (k % 3) * 3}px;transform:rotate(${((k * 33) % 70) - 35}deg)"></i>`).join('')}</span><b>Draw a date</b></button>
    <div class="jar-side"><div class="seg">${seg('any', 'Any')}${seg('free', 'Free')}${seg('cheap', 'Not pricey')}</div>
    ${drawn ? `<div class="drawn"><small>Your date:</small><b>${esc(drawn.text)}</b><span class="fpill">${drawn.cost === 'free' ? 'Free' : drawn.cost}</span>
      <div class="te-row"><input class="field date" type="date" data-uf="ddate" value="${v(ui, 'ddate', addDays(day, (5 - new Date(day + 'T12:00').getDay() + 7) % 7 || 7))}" aria-label="When">${btn('dplan', '📅 Put it on the calendar', { id: drawn.id, cls: 'go-btn small' })}</div>${btn('ddraw', 'Draw again', { cls: 'link small' })}</div>` : '<p class="hint">Tap the jar for a surprise idea. When you go, mark it done on the calendar and add a memory.</p>'}
    ${recent.length ? `<div class="h3">Recent dates</div>${recent.map(({ ev }) => `<div class="tool-row static"><span><b>${esc(ev.title)}</b><small>${shortDate(ev.date)}${ev.done ? ' · done ❤️' : ''}</small></span></div>`).join('')}` : ''}</div></div>`;
}

/* ================= Kids' Corner ================= */
function kids(state, tab, ui, day) {
  const names = T.kidNames(state);
  const fam = (n) => state.family.find((m) => m.name === n);
  const addKid = `<div class="card2"><b>Add a child</b><div class="te-row"><input class="field" data-uf="kname" maxlength="20" value="${v(ui, 'kname')}" placeholder="First name" autocomplete="off">${btn('kadd', 'Add', { cls: 'go-btn small' })}</div></div>`;
  if (!names.length) return `<p class="hint">Kids’ Corner is for the kids in your family: stars for chores and kindness, rewards they can earn, and a reading log.</p>${addKid}`;
  if (tab === 'rewards') {
    const rw = state.kids.rewards || [];
    return `${names.map((n) => `<div class="kid-card" style="--c:${fam(n).color}"><div class="kid-head">${dot(fam(n).color, n[0].toUpperCase())}<b>${esc(n)}</b><span class="stars">⭐ ${T.starsOf(state, n)}</span></div>
      <div class="kid-rewards">${rw.map((r) => `<button type="button" class="rw-chip${T.starsOf(state, n) >= r.cost ? ' can' : ''}" data-ta="kredeem" data-id="${esc(n)}|${r.id}"${T.starsOf(state, n) >= r.cost ? '' : ' disabled'}><b>${esc(r.name)}</b><small>⭐ ${r.cost}</small></button>`).join('')}</div></div>`).join('')}
      <div class="card2"><b>Add a reward</b><div class="te-row"><input class="field" data-uf="krname" maxlength="40" value="${v(ui, 'krname')}" placeholder="Like “Pick dinner”" autocomplete="off"><select class="freq" data-uf="krcost">${[5, 10, 15, 20, 25, 30, 50].map((c) => `<option value="${c}"${String(ui.krcost || 10) === String(c) ? ' selected' : ''}>⭐ ${c}</option>`).join('')}</select>${btn('kradd', 'Add', { cls: 'go-btn small' })}</div></div>
      ${rw.map((r) => `<div class="tool-row static"><span><b>${esc(r.name)}</b><small>⭐ ${r.cost}</small></span>${btn('krdel', 'Remove', { id: r.id, cls: 'link small' })}</div>`).join('')}`;
  }
  if (tab === 'reading') {
    return names.map((n) => { const books = state.kids.reading.filter((b) => b.name === n).slice(-6).reverse(); return `<div class="kid-card" style="--c:${fam(n).color}"><div class="kid-head">${dot(fam(n).color, n[0].toUpperCase())}<b>${esc(n)}</b><span class="stars">📚 ${T.booksThisYear(state, n, day)} this year</span></div>
      <div class="te-row"><input class="field" data-uf="book_${esc(n)}" maxlength="60" value="${v(ui, `book_${n}`)}" placeholder="Finished a book? Title" autocomplete="off">${btn('kbook', '+ Book (+⭐)', { id: n, cls: 'go-btn small' })}</div>
      ${books.map((b) => `<small class="book">📖 ${esc(b.title)} · ${shortDate(b.day)}</small>`).join('')}</div>`; }).join('');
  }
  /* stars + chores */
  const sel = ui.kid || '';
  return `${names.map((n) => {
    const chores = [];
    for (const l of state.lists) for (const t of l.tasks) if (t.who === n) chores.push({ l, t, avail: isAvailable(t, day, l) });
    return `<div class="kid-card" style="--c:${fam(n).color}"><div class="kid-head">${dot(fam(n).color, n[0].toUpperCase())}<b>${esc(n)}</b><span class="stars">⭐ ${T.starsOf(state, n)}<small> · ${T.starsThisWeek(state, n, day)} this week</small></span>${btn('kpick', sel === n ? 'Close' : '⭐ Give a star', { id: n, cls: sel === n ? 'soft small' : 'go-btn small' })}</div>
      ${sel === n ? `<div class="why">${T.STAR_REASONS.map((w) => `<button type="button" class="pickchip" style="--c:${fam(n).color}" data-ta="kstar" data-id="${esc(n)}|${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
      ${chores.length ? chores.map(({ l, t, avail }) => `<div class="task sub"><button type="button" class="check" data-done="${l.id}:${t.id}"${avail ? '' : ' disabled'} style="--c:${fam(n).color}" aria-label="${esc(t.title)}">${avail ? '' : svgI('check', '#fff', 16, 3)}</button><span class="tx"><b>${esc(t.title)}</b><small>${freqLabel(t)} · checking it off earns a star</small></span></div>`).join('') : `<small class="book">No chores assigned yet. Tap a task on any list and choose ${esc(n)} under “Who does it”.</small>`}</div>`;
  }).join('')}${addKid}`;
}

/* ================= Family Meeting ================= */
function meeting(state, tab, ui, day) {
  if (tab === 'past') {
    const past = state.meetings.slice().reverse();
    return past.map((m) => `<div class="card2"><b>Week of ${shortDate(m.week)}</b>${m.wins.length ? `<p class="hint">🎉 ${m.wins.map(esc).join(' · ')}</p>` : ''}${m.focus ? `<p class="hint">🎯 Focus: ${esc(m.focus)}</p>` : ''}${Object.entries(m.checkins || {}).filter(([, c]) => c.high || c.low).map(([n, c]) => `<small class="book"><b>${esc(n)}</b>${c.high ? ` · high: ${esc(c.high)}` : ''}${c.low ? ` · low: ${esc(c.low)}` : ''}</small>`).join('')}${m.notes ? `<p class="hint">${esc(m.notes)}</p>` : ''}</div>`).join('') || '<p class="hint">No meetings yet.</p>';
  }
  const held = T.meetingThisWeek(state, day);
  if (held) return `<div class="gdone"><span class="gbig">🏛️</span><b class="ttl">This week’s meeting is done</b><p class="hint">${held.focus ? `This week’s focus: <b>${esc(held.focus)}</b>. ` : ''}See you next week.</p></div>${meeting(state, 'past', ui, day)}`;
  const ag = T.meetingAgenda(state, day);
  const people = state.family.filter((m) => m.kind !== 'pet');
  const pay = nextPayday(state.budget, day);
  const secs = Object.entries(ag.bySection).sort((a, b) => b[1] - a[1]);
  return `<p class="hint">About 15 minutes. Go top to bottom, then tap Finish.</p>
    <div class="agenda"><div class="ag-step"><span class="ag-n">1</span><b>Celebrate</b></div>
      <p class="hint">${ag.total ? `${ag.total} check-offs on ${ag.days} ${ag.days === 1 ? 'day' : 'days'} this week` : 'A quiet week, and that’s okay'}${ag.goals.length ? ` · goals finished: ${ag.goals.map((g) => `“${esc(g)}”`).join(', ')}` : ''}${ag.memories ? ` · ${ag.memories} new ${ag.memories === 1 ? 'memory' : 'memories'}` : ''}.</p>
      ${secs.length ? `<div class="rev-secs">${secs.map(([s, n]) => `<span class="schip" style="--c:${SECTIONS[s].color}">${SECTIONS[s].name} · ${n}</span>`).join('')}</div>` : ''}
      <textarea class="field" data-uf="mwins" rows="2" placeholder="Wins worth celebrating, one per line">${v(ui, 'mwins')}</textarea>
    <div class="ag-step"><span class="ag-n">2</span><b>Check in</b><small>Everyone shares a high and a low</small></div>
      ${people.map((m) => `<div class="te-row checkin">${dot(m.color, m.name[0].toUpperCase())}<input class="field small" data-uf="hi_${esc(m.name)}" maxlength="80" value="${v(ui, `hi_${m.name}`)}" placeholder="${esc(m.name)}’s high" autocomplete="off"><input class="field small" data-uf="lo_${esc(m.name)}" maxlength="80" value="${v(ui, `lo_${m.name}`)}" placeholder="Low" autocomplete="off"></div>`).join('')}
    <div class="ag-step"><span class="ag-n">3</span><b>The week ahead</b></div>
      ${ag.ahead.map((a) => `<small class="book">${{ outing: '📅', card: '💌', goal: '🎯', care: '🔧' }[a.kind]} <b>${weekday(a.day).slice(0, 3)} ${shortDate(a.day)}</b> · ${esc(a.text)}</small>`).join('') || '<p class="hint">Nothing on the calendar yet. A good time to plan an outing.</p>'}
    <div class="ag-step"><span class="ag-n">4</span><b>Money minute</b></div>
      <p class="hint">${state.budget?.setup ? `Next payday: ${pay ? `${weekday(pay)}, ${shortDate(pay)}` : 'not set'}.` : 'Set up the budget at the Bank when you’re ready.'}${ag.subsReview ? ` ${ag.subsReview} ${ag.subsReview === 1 ? 'subscription is' : 'subscriptions are'} due for a check-in.` : ''} ${ag.meals ? `${ag.meals} dinners planned.` : 'No dinners planned yet.'}</p>
    <div class="ag-step"><span class="ag-n">5</span><b>One focus for next week</b>${ag.lastFocus ? `<small>Last week: ${esc(ag.lastFocus)}</small>` : ''}</div>
      <input class="field" data-uf="mfocus" maxlength="120" value="${v(ui, 'mfocus')}" placeholder="Like “Phones away at dinner”" autocomplete="off">
      <label class="q">Notes <small>(optional)</small></label><textarea class="field" data-uf="mnotes" rows="2">${v(ui, 'mnotes')}</textarea></div>
    <div class="actions">${btn('mfinish', `Finish the meeting · +${T.MEETING_REWARD.coins} coins`, { cls: 'go-btn' })}</div>
    <p class="foot">A family meeting also counts as your weekly review.</p>`;
}
