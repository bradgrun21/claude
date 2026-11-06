import { byId } from '../data/catalog.js';
import * as DI from '../systems/district.js';
import { catById } from '../systems/budget.js';
import { shortDate } from '../systems/time.js';
import { esc, fmt$ } from './icons.js';
import { thumb } from '../world/thumbs.js';

/* The page behind a Budget District building: this category, this month. Private to the device (amounts are fine here). */
const money = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt$(Math.round(n)) : `$${n.toFixed(2)}`);
const img = (type) => { const u = thumb(type); return u ? `<img src="${u}" alt="" draggable="false">` : ''; };
const v = (ui, k, d = '') => esc(ui?.[k] ?? d);

export function renderCatHub(state, cat, ui, day) {
  const c = catById(cat), d = DI.districtForCat(cat);
  const m = DI.catMonth(state, cat, day);
  const onPlan = DI.monthsOnPlan(state, cat, day), lv = DI.districtLevel(state, cat, day);
  const month = new Date(day + 'T12:00').toLocaleString('en-US', { month: 'long' });
  const status = !m.planned ? 'No plan set for this category yet. Add one below.' : m.left >= 0 ? `${money(m.left)} left in the plan for ${month}.` : `${money(-m.left)} more than planned this month. That happens: adjust the plan or move money from another category.`;
  return `<div class="cat-head" style="--c:${c.color}"><span class="cat-emoji">${d?.emoji || '💵'}</span><span><b>${esc(c.label)}</b><small>${month}</small></span></div>
    <div class="sub-sum"><span><b>${money(m.planned)}</b><small>planned</small></span><span><b>${money(m.spent)}</b><small>spent so far</small></span><span class="${m.left >= 0 ? 'saved' : ''}"><b>${money(Math.abs(m.left))}</b><small>${m.left >= 0 ? 'left' : 'over plan'}</small></span></div>
    ${m.planned ? `<div class="pbar catbar" style="--c:${c.color}"><i style="width:${m.pct.toFixed(0)}%"></i></div>` : ''}
    <p class="hint">${status}</p>
    <div class="card2"><b>Log a purchase</b><div class="te-row"><span class="dollar"><input class="field small" data-uf="camt" inputmode="decimal" value="${v(ui, 'camt')}" placeholder="0.00"></span><input class="field small" data-uf="cnote" maxlength="60" value="${v(ui, 'cnote')}" placeholder="What for (optional)" autocomplete="off"><button type="button" class="btn go-btn small" data-dist="log:${cat}">Log it</button></div></div>
    ${m.txs.length ? `<div class="h3">This month · ${m.txs.length}</div>${m.txs.slice(0, 8).map((t) => `<div class="tool-row static"><span><b>${money(t.amount)}</b><small>${shortDate(t.date)}${t.note ? ` · ${esc(t.note)}` : ''}</small></span></div>`).join('')}` : ''}
    <div class="card2"><b>Monthly plan</b><div class="te-row"><span class="dollar"><input class="field small" data-uf="cplan" inputmode="decimal" value="${v(ui, 'cplan', m.planned || '')}" placeholder="0"></span><button type="button" class="btn soft small" data-dist="plan:${cat}">Save plan</button></div>
      <p class="foot">Grows with steady use: a month with 3+ purchases logged and spending within the plan counts. ${onPlan} so far · ${lv < 3 ? `next growth at ${lv === 1 ? 1 : 3} ${lv === 1 ? 'month' : 'months'}` : 'fully grown'}.</p></div>
    <p class="foot">On payday, the ${esc(c.short.toLowerCase())} truck delivers here.</p>`;
}

export function renderDistrictWin(entries) {
  return `<div class="lvlup"><b class="ttl">${entries.length === 1 ? 'A new building for your budget!' : `${entries.length} new buildings for your budget!`}</b>
    <p>Budgeting or spending in a category builds its home in town. It’s free, and that category’s payday truck delivers there.</p>
    <div class="earned-grid">${entries.map((d) => { const def = byId[d.building]; return `<div class="earn got"><span class="bimg">${img(d.building)}</span><b>${esc(def.name)}</b><small>${esc(catById(d.cat).label)}</small><button type="button" class="btn go-btn small" data-pick="${d.building}">Place it · free</button></div>`; }).join('')}</div>
    <div class="actions"><button type="button" class="btn soft" data-close="1">Later</button></div>
    <p class="foot">Find them any time under Build → Budget District.</p></div>`;
}

export function renderDistrictStore(state) {
  const has = (id) => state.buildings.some((b) => b.type === id);
  const bank = has('bank');
  return `<div class="sec-head"><span>Each budget category gets its own building, free, the first time you budget or log spending in it. Payday trucks deliver to them, and each one grows when you stay on plan.</span></div>
    <div class="grid">${DI.DISTRICT.map((d) => { const def = byId[d.building]; const built = has(d.building); const active = DI.catActive(state, d.cat);
      return `<button type="button" class="bcard${!built && !active ? ' locked' : ''}${built ? ' dim' : ''}" data-${built ? 'built' : 'pick'}="${def.id}"><span class="bimg">${img(def.id)}${!built && !active ? `<span class="lock">${d.emoji} Budget ${esc(catById(d.cat).short)}</span>` : ''}</span><b>${esc(def.name)}</b><span class="bnote">${esc(catById(d.cat).label)}</span><span class="bprice">${built ? '<span class="cost done">Built</span>' : active ? '<span class="cost free">Free · unlocked</span>' : '<span class="cost done">Locked</span>'}</span></button>`; }).join('')}</div>`;
}
