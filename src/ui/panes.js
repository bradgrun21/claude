import { AREAS, AREA_INFO, MATERIALS, MATERIAL_KEYS } from '../data/areas.js';
import { svgI, esc, fmt$ } from './icons.js';
import { COSTS, MAX_FLOORS } from '../systems/build.js';
import { RECIPES, stillNeeded, canBuildRecipe } from '../systems/recipes.js';
import { canDeliver, orderText } from '../systems/orders.js';
import { carThresholds, carsFor, starsNow, harvestPoints, DECORATIONS } from '../systems/train.js';
import { stormLabel, stormHeadline, STARTER_CUSHION } from '../systems/storm.js';
import { doneInWeek, perWeekByArea, weightsFromRanking, activeAreas } from '../systems/rating.js';
import { debtClock, fullSafetyNet, DISTRICT_NEED } from '../systems/money.js';
import { challengeRows } from '../systems/community.js';
import { STICKER_NAMES } from '../systems/surprises.js';
import { shortDate, weekday, monthYear, FREQ_LABEL, PERIOD_DAYS } from '../systems/time.js';
import { paydayMargin } from '../systems/money.js';

const STICKER_EMOJI = { balloon: '🎈', birds: '🐦', icecream: '🍦', rainbow: '🌈', fireworks: '🎆', pets: '🐾' };
export const matIcon = (k, s = 16) => svgI(k, MATERIALS[k].color, s, 2.2);

export function renderHud(ctx, el) {
  const { state, rating, ratingWord } = ctx;
  el.ringHud.setAttribute('stroke-dasharray', `${(138.2 * rating / 100).toFixed(1)} 138.2`);
  el.ringHudTxt.textContent = rating;
  el.ratingWord.textContent = `Mayor rating · ${ratingWord}`;
  el.cityName.textContent = state.setup.cityName;
  const pop = state.buildings.reduce((n, b) => n + (b.kind === 'home' || b.kind === 'family-home' ? b.floors * 2 : 0), 0) + state.family.filter((m) => m.kind !== 'pet').length;
  const districts = 1 + Object.keys(state.unlocked).length;
  el.popLine.textContent = `Population ${pop} · ${districts} of 4 districts`;
  el.pts.textContent = state.points;
  const active = new Set(ctx.activeMats);
  el.mats.innerHTML = MATERIAL_KEYS.map((k) => `<span class="mat${active.has(k) ? '' : ' off'}" data-mat="${k}" title="${MATERIALS[k].label}" aria-label="${state.materials[k]} ${MATERIALS[k].label}"><i>${matIcon(k, 14)}</i>${state.materials[k]}</span>`).join('');
}

export function renderToday(ctx) {
  const { state, today } = ctx;
  const goals = state.goals.filter((g) => g.perWeek > 0);
  const done = goals.filter((g) => g.done.includes(today)).length;
  const per = perWeekByArea(state.goals);
  const tasks = goals.map((g) => {
    const d = g.done.includes(today);
    const wk = doneInWeek([g], g.area, today);
    return `<button type="button" class="task${d ? ' done' : ''}" data-go="${g.id}"><span class="ic">${d ? svgI('check', '#fff', 16) : svgI(AREA_INFO[g.area].icon, '#8A5A10', 16)}</span><span class="tx"><b>${esc(g.label)}</b><small>${AREA_INFO[g.area].placeName} · ${d ? 'done today' : `${Math.min(wk, g.perWeek)} of ${g.perWeek} this week`}</small></span></button>`;
  }).join('');
  const orders = state.orders.list.map((o) => {
    const ok = canDeliver(state, o);
    const have = state.materials[o.material] || 0;
    return `<div class="card2 order"><span class="who" style="background:${MATERIALS[o.material].color}22">${matIcon(o.material, 20)}</span>
      <div class="tx"><b>${esc(o.resident)} would love ${orderText(o)}</b><small>For your ${o.area.toLowerCase()} goal: ${esc(o.goal)} · you have ${have}</small>
      <div class="btns"><button type="button" class="btn main" data-deliver="${o.id}"${ok ? '' : ' disabled'}>${ok ? 'Deliver' : `${o.qty - have} more to go`}</button><button type="button" class="btn link" data-skip="${o.id}">Not this week</button></div></div></div>`;
  }).join('');
  const freq = state.setup.pay.freq;
  const stars = starsNow(state, today);
  const [, c2, c3] = carThresholds(freq);
  const cars = carsFor(stars, freq);
  const crates = state.train.cars.filter((c) => !c.opened).length;
  const next = state.setup.pay.next;
  return `<div class="row"><span class="h">Today in town</span><span class="gain">${goals.length && done === goals.length ? 'All done today' : `${done} of ${goals.length} done`}</span></div>
    <p class="hint">A bubble over a building means one of your goals is waiting. Tap the bubble to log it, or tap a goal here to fly there.</p>
    <div class="tasks">${tasks || '<p class="hint">No weekly goals yet. Add them in Settings.</p>'}</div>
    <div class="h2">Order board</div>
    ${orders || '<p class="hint">No orders right now. A new one arrives each morning.</p>'}
    <div class="h2">Payday train</div>
    <div class="card2"><div class="row"><b>${next ? `${weekday(next)}, ${shortDate(next)}` : 'Next payday'}</b><span class="gain">${stars} ${stars === 1 ? 'star' : 'stars'} · ${cars} ${cars === 1 ? 'car' : 'cars'}</span></div>
      <small>Stars = orders filled + 1 for every 3 days logged. Car 2 comes at ${c2} stars, car 3 at ${c3}. Every car brings 3 materials and a decoration.</small>
      <small>${svgI('sprout', '#3E8E57', 13)} Garden: ${state.garden.length} ${state.garden.length === 1 ? 'crop' : 'crops'} growing → ${harvestPoints(state.garden.length)} build points at the train.</small>
      ${crates ? `<div class="btns"><button type="button" class="btn main" data-a="crates">Open ${crates} ${crates === 1 ? 'crate' : 'crates'} at the station</button></div>` : ''}</div>`;
}

export function renderStorm(ctx) {
  const { state, storm, today } = ctx;
  const m = state.money;
  const clock = debtClock(m, today);
  const period = PERIOD_DAYS[state.setup.pay.freq];
  const margin = Math.max(0, paydayMargin(state.setup, period));
  const goal = m.cushion < STARTER_CUSHION ? `${fmt$(m.cushion)} of ${fmt$(STARTER_CUSHION)}` : `Full · safety net ${fmt$(m.cushion)} of ${fmt$(fullSafetyNet(m))}`;
  let clockLine = '';
  if (clock.status === 'counting') clockLine = `Debt-free by <b>${monthYear(clock.date)}</b>${clock.stolen ? ` · ${clock.stolen} ${clock.stolen === 1 ? 'day' : 'days'} stolen back` : ''}`;
  else if (clock.status === 'free') clockLine = '<b>Debt-free</b> · the clock tower rings';
  else if (clock.status === 'no-payment') clockLine = 'Add a monthly debt payment to see your debt-free date';
  const target = m.cushion < STARTER_CUSHION ? 'the Starter Cushion' : m.debt > 0 ? 'extra on debt' : 'the Full Safety Net';
  const paidToday = state.train.lastPayday === today && state.train.arrivals > 0;
  return `<div class="row"><span class="h">${stormHeadline(storm)}</span><span class="lvl">${stormLabel(storm)}</span></div>
    <div class="meter" aria-hidden="true"><div style="width:${Math.round(storm * 100)}%"></div></div>
    <p class="facts">Cushion <b>${goal}</b> · Debt <b>${fmt$(m.debt)}</b></p>
    ${clockLine ? `<p class="facts">${svgI('clock', '#4F5E6E', 14)} ${clockLine}</p>` : ''}
    <div class="money-in"><label for="payAmt">Payday toward the plan</label><input class="field small" id="payAmt" inputmode="decimal" value="${margin}" aria-label="Amount toward the plan"></div>
    <div class="acts">
      <button type="button" class="act main" data-a="payday"><span>Payday: log it</span><small>Goes to ${target}${paidToday ? '' : ' · train arrives'}</small></button>
      <button type="button" class="act plan" data-a="levee"${m.payoffDate ? ' disabled' : ''}><span>${m.payoffDate ? `Payoff date: ${shortDate(m.payoffDate)}` : 'Set a payoff date'}</span><small>${m.payoffDate ? 'The wall is up' : 'Builds a wall'}</small></button>
    </div>
    <div class="acts">
      <button type="button" class="act plan" data-a="extra"${m.debt > 0 ? '' : ' disabled'}><span>Extra debt payment</span><small>Steals days back on the clock</small></button>
      <button type="button" class="act plan" data-a="debtpaid"${m.firstDebtPaid || m.debtStart <= 0 ? ' disabled' : ''}><span>${m.firstDebtPaid ? 'First debt paid' : 'We paid off a debt'}</span><small>${m.firstDebtPaid ? 'Bridgeview is open' : 'Opens Bridgeview'}</small></button>
    </div>
    <div class="row" style="margin-top:8px;align-items:center"><button type="button" class="btn link" data-a="stall">Demo: 2 paydays, no progress</button><label class="toggle" for="gentle"><input type="checkbox" id="gentle"${state.settings.gentle ? ' checked' : ''}> Gentle mode</label></div>
    <p class="foot">Going over budget never raises the water. Only the cushion, debt and steady progress move it. Paid ${FREQ_LABEL[state.setup.pay.freq].toLowerCase()}.</p>`;
}

export function renderBuild(ctx) {
  const { state, selected, activeMats } = ctx;
  const lot = selected?.kind === 'lot';
  const bld = selected?.kind === 'building' ? state.buildings.find((b) => b.id === selected.id) : null;
  const upg = bld && (bld.kind === 'home' || bld.kind === 'family-home');
  let hint = 'Tap a glowing lot to build, or tap a home to add a floor. Tap any building to see what built it.';
  if (lot) hint = 'Empty lot selected. Pick what to build.';
  else if (upg) hint = bld.floors >= MAX_FLOORS ? 'This home is fully upgraded.' : `${bld.kind === 'family-home' ? 'Your home' : 'Home'} selected. Add a floor?`;
  const tool = (id, icon, color, label, cost, enabled) => `<button type="button" class="tool" data-build="${id}"${enabled ? '' : ' disabled'}>${svgI(icon, color, 24, 2)}<b>${label}</b><i>${cost}</i></button>`;
  const recipes = RECIPES.map((r) => {
    const list = stillNeeded(r, state, activeMats);
    const ok = canBuildRecipe(r, state, activeMats);
    return `<div class="card2 recipe"><div class="tx"><span class="tag2">${r.type === 'landmark' ? 'Landmark' : 'Community'}</span><div><b>${r.name}</b></div>
      <div class="chips">${list.map((n) => `<span class="chip${n.met ? ' met' : ''}${n.key === 'points' ? ' plain' : ''}">${n.key === 'points' ? '' : matIcon(n.key, 13)}${n.have} of ${n.need} ${n.key === 'points' ? 'points' : MATERIALS[n.key].label.toLowerCase()}</span>`).join('')}</div></div>
      <button type="button" class="btn main" data-recipe="${r.id}"${ok && lot ? '' : ' disabled'}>Build</button></div>`;
  }).join('');
  const decos = state.decorations.filter((d) => !d.placed);
  const decoHtml = decos.length ? `<div class="h2">Decorations</div><div class="chips">${decos.map((d) => `<button type="button" class="btn soft" data-deco="${d.id}"${lot ? '' : ' disabled'}>${esc(DECORATIONS.find((x) => x.id === d.kind)?.name || d.kind)}</button>`).join(' ')}</div><p class="hint">Free to place. Just for looks.</p>` : '';
  return `<div class="row"><span class="h">Build mode</span><span class="gain">${state.points} points</span></div>
    <p class="hint">${hint}</p>
    <div class="tray">
      ${tool('road', 'road', '#7A6650', 'Road', COSTS.road, lot && state.points >= COSTS.road)}
      ${tool('park', 'tree', '#2F6B43', 'Park', COSTS.park, lot && state.points >= COSTS.park)}
      ${tool('home', 'home', '#B97F62', 'Home', COSTS.home, lot && state.points >= COSTS.home)}
      ${tool('upgrade', 'up', '#8A5A10', 'Upgrade', COSTS.upgrade, upg && bld.floors < MAX_FLOORS && state.points >= COSTS.upgrade)}
    </div>
    <div class="h2">Community buildings and landmarks</div>
    <p class="hint" style="margin-top:4px">Made with materials from your goals plus points. Materials come from logging, never from dollars.</p>
    ${recipes}
    ${decoHtml}
    <p class="foot">Points come from habits, never from dollars. New districts open only with real money steps.</p>`;
}

export function renderTogether(ctx) {
  const { state, today } = ctx;
  const rows = challengeRows(state, today.slice(0, 7));
  return `<div class="row"><span class="h">Community challenges</span><span class="lvl">${monthYear(new Date()).split(' ')[0]}</span></div>
    ${rows.map((c) => `<div class="card2"><div class="row"><b>${c.title}</b><span class="gain">Your family: ${c.mine}</span></div><div class="track" style="height:10px;margin-top:6px"><div style="width:${Math.min(100, (c.total / c.goal) * 100).toFixed(1)}%;background:#4CAF6A"></div></div><small>${c.total.toLocaleString('en-US')} so far · ${c.note}</small></div>`).join('')}
    <p class="foot">Sample numbers for now. Later, every family that opts in adds to these, and only totals are shared.</p>
    <div class="h2">Sticker book · ${state.stickers.length} of ${Object.keys(STICKER_NAMES).length}</div>
    <div class="stickers">${Object.entries(STICKER_NAMES).map(([k, n]) => `<div class="sticker${state.stickers.includes(k) ? ' got' : ''}"><span class="em" aria-hidden="true">${STICKER_EMOJI[k]}</span>${state.stickers.includes(k) ? n : 'Keep watching'}</div>`).join('')}</div>
    <p class="foot">Surprises are just for fun. They never give points.</p>
    <button type="button" class="btn ink" style="width:100%;margin-top:10px;padding:12px" data-a="paper">Read this week's town paper</button>`;
}

export function renderRating(ctx) {
  const { state, rating, today } = ctx;
  const w = weightsFromRanking(state.setup.ranking);
  const act = activeAreas(state.goals);
  const per = perWeekByArea(state.goals);
  const order = state.setup.ranking.filter((a) => act.includes(a));
  const skipped = AREAS.filter((a) => !act.includes(a));
  return `<div class="score"><svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="none" stroke="#EFE7DA" stroke-width="7"/><circle cx="32" cy="32" r="27" fill="none" stroke="#4CAF6A" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(169.6 * rating / 100).toFixed(1)} 169.6" transform="rotate(-90 32 32)"/><text x="32" y="39" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="21" font-weight="700" fill="#1E2B3C">${rating}</text></svg>
    <p>Your week, weighted by what matters most to you. Bars ease down when a goal falls behind, never below 20, and refill the moment you log it.</p></div>
    <div class="bars">${order.map((a) => { const v = Math.round(state.bars.values[a] ?? 60); const wk = Math.min(per[a], doneInWeek(state.goals, a, today)); return `<div class="bar"><div class="row"><span>${a} <em>· counts ${w[a]}%</em></span><span>${v}</span></div><div class="track"><div style="width:${v}%;background:${AREA_INFO[a].color}"></div></div><small>${wk} of ${per[a]} this week · ${state.goals.filter((g) => g.area === a).map((g) => esc(g.label)).join(', ')}</small></div>`; }).join('')}</div>
    ${skipped.length ? `<p class="foot">No goal set for ${skipped.join(', ').toLowerCase()}, so ${skipped.length === 1 ? 'it isn’t' : 'they aren’t'} counted.</p>` : ''}`;
}

export function districtNeed(key) { return DISTRICT_NEED[key]; }
