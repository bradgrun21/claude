import { byId } from '../data/catalog.js';
import * as B from '../systems/business.js';
import { shortDate } from '../systems/time.js';
import { svgI, esc } from './icons.js';
import { ART } from './art.js';
import { thumb } from '../world/thumbs.js';

const coin = (n) => `<span class="cost"><i class="ci">${ART.coin}</i>${n.toLocaleString('en-US')}</span>`;
const img = (type) => { const u = thumb(type); return u ? `<img src="${u}" alt="" draggable="false">` : ''; };
const v = (ui, k, d = '') => esc(ui?.[k] ?? d);

export function renderBiz(state, rec, now = Date.now()) {
  const def = byId[rec.type];
  const ready = B.bizReady(rec, now), cap = B.REGISTER_DAYS * def.income;
  const all = state.buildings.filter((b) => byId[b.type]?.kind === 'biz');
  const allReady = all.reduce((a, b) => a + B.bizReady(b, now), 0);
  return `<div class="th"><span class="bimg bigimg">${img(rec.type)}</span><div><b class="ttl">${esc(def.name)}</b>
      <p>Earns ${coin(def.income)} a day on its own. The register holds up to ${B.REGISTER_DAYS} days.</p></div></div>
    <div class="req"><span class="ri">${ART.coin}</span><span>In the register: ${ready} of ${cap}</span></div><div class="pbar"><i style="width:${Math.min(100, (ready / cap) * 100).toFixed(0)}%"></i></div>
    <div class="actions">${ready >= 1 ? `<button type="button" class="btn go-btn" data-biz="${rec.id}">Collect ${ready} coins</button>` : '<span class="hint">Nothing to collect yet. Check back later.</span>'}${all.length > 1 && allReady >= 1 ? `<button type="button" class="btn soft" data-bizall="1">Collect from all ${all.length} shops · ${allReady}</button>` : ''}</div>
    <div class="card2"><b>Main Street</b><p class="hint">${all.length} ${all.length === 1 ? 'shop earns' : 'shops earn'} ${coin(B.dailyBizIncome(state))} a day together. New shops open as the town levels up.</p></div>
    <p class="foot">Shops pay coins, not XP. XP still comes only from real life.</p>`;
}

export function renderNest(state) {
  const back = state.invest?.refunded || 0;
  return `<div class="gdone"><span class="earn-big">${img('nestegg')}</span><b class="ttl">Money master 🥚</b>
      <p class="hint">You finished every step of the Money path. The Nest Egg Tower stands for saving for later, for the family you’ll be in 20 years.</p></div>
    ${back ? `<p class="hint">The coins that used to be invested here (${back.toLocaleString('en-US')}) are back in your coins.</p>` : ''}
    <div class="h3">Saving for later, in real life</div>
    ${B.NEST_LESSONS.map(([t, b]) => `<div class="lesson"><b>📘 ${esc(t)}</b><span>${esc(b)}</span></div>`).join('')}
    <p class="foot">General ideas to talk through together, not financial advice.</p>`;
}

export function renderMonument(state) {
  const s = B.debtStatus(state);
  const left = s.total - s.paid;
  return `<div class="gdone"><span class="earn-big">${img('monument')}</span><b class="ttl">${s.free ? 'Debt free! 🎉' : 'Debt Freedom Monument'}</b>
      <p class="hint">${s.total ? (s.free ? `All ${s.total} debts paid off. The crown is on. This one’s for the family photo album.` : `${s.paid} of ${s.total} debts paid off. Each one adds a tier. ${left} to go, and the crown goes on top when the last one is gone.`) : 'Add your debts at the Bank, and every one you pay off builds this monument higher.'}</p></div>
    ${s.list.length ? `<div class="h3">On the plaque</div>${s.list.map((d, k) => `<div class="tool-row static gone"><span><b>${k + 1}. ${esc(d.name)}</b><small>Paid off ${d.paidOn ? shortDate(d.paidOn) : ''}</small></span><span class="added">✓</span></div>`).join('')}` : ''}
    <p class="foot">The monument never shows dollar amounts, so it’s always safe to share.</p>
    <div class="actions"><button type="button" class="btn soft" data-bankgo="debts">${svgI('coin', 'currentColor', 15)} Open the snowball</button></div>`;
}
