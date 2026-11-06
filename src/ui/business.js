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
    <div class="card2"><b>Main Street</b><p class="hint">${all.length} ${all.length === 1 ? 'shop earns' : 'shops earn'} ${coin(B.dailyBizIncome(state))} a day together. Your ${state.buildings.length ? '' : ''}town supports ${B.bizSlots(state)} ${B.bizSlots(state) === 1 ? 'shop' : 'shops'}: every ${B.RESIDENTS_PER_SHOP} residents bring enough customers for one more.</p></div>
    <p class="foot">Shops pay coins, not XP. XP still comes only from real life.</p>`;
}

export function renderNest(state, ui, day) {
  const inv = B.ensureInvest(state);
  const bal = Math.floor(inv.bal);
  const recent = B.recentDeposits(state, day);
  const q = ui.wamt ? B.withdrawQuote(state, ui.wamt, day) : null;
  const lessonIx = Math.floor((new Date(day + 'T12:00').getTime() / 86400000)) % B.NEST_LESSONS.length;
  const [lt, lb] = B.NEST_LESSONS[lessonIx];
  const rows = [[4, '4 weeks'], [12, '3 months'], [26, '6 months'], [52, '1 year']];
  return `<div class="sub-sum"><span><b>${bal.toLocaleString('en-US')}</b><small>coins in the Nest Egg</small></span><span class="saved"><b>+${Math.floor(inv.growth).toLocaleString('en-US')}</b><small>earned by growth so far</small></span><span><b>2%</b><small>growth every week</small></span></div>
    <div class="lesson"><b>📘 ${esc(lt)}</b><span>${esc(lb)}</span></div>
    ${bal > 0 ? `<div class="h3">If you leave it alone</div><div class="proj">${rows.map(([w, l]) => `<span><small>${l}</small><b>${B.project(inv.bal, w).toLocaleString('en-US')}</b></span>`).join('')}</div>` : '<p class="hint">Put some coins in and watch them grow every week, even on days you don’t play.</p>'}
    <div class="card2"><b>Invest coins</b><div class="te-row"><input class="field small" data-uf="iamt" inputmode="numeric" value="${v(ui, 'iamt')}" placeholder="How many coins" autocomplete="off">
      ${[25, 50, 100].filter((n) => n <= state.coins).map((n) => `<button type="button" class="pickchip" data-nest="fill:${n}">${n}</button>`).join('')}<button type="button" class="btn go-btn small" data-nest="invest">Invest</button></div><p class="foot">You have ${state.coins.toLocaleString('en-US')} coins.</p></div>
    ${bal > 0 ? `<div class="card2"><b>Take coins out</b><div class="te-row"><input class="field small" data-uf="wamt" inputmode="numeric" value="${v(ui, 'wamt')}" placeholder="How many coins" autocomplete="off"><button type="button" class="btn soft small" data-nest="quote">Check</button>${q && q.amount > 0 ? `<button type="button" class="btn go-btn small" data-nest="withdraw">Take out ${q.amount}${q.fee ? ` (get ${q.get})` : ''}</button>` : ''}</div>
      <p class="foot">${recent ? `${recent.toLocaleString('en-US')} coins went in during the last 4 weeks. Taking those out early costs a 10% fee${q?.fee ? `: ${q.fee} coins this time` : ''}.` : 'No early-withdrawal fee right now: everything has been in for 4 weeks or more.'}</p></div>` : ''}
    <p class="foot">This is a game lesson with coins, not financial advice. In real life, growth isn’t guaranteed and goes up and down, but time and steady saving help in the same way.</p>`;
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
