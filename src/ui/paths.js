import { pathStatus } from '../systems/paths.js';
import { svgI, esc } from './icons.js';

/* A step-by-step strip: ✓ done · ● current (with what to do and progress) · 🔒 locked. */
export function renderPath(state, id, title = 'Your next steps') {
  const p = pathStatus(state, id);
  if (!p) return '';
  const cur = p.steps[p.current];
  const dots = p.steps.map((s, k) => `<span class="pstep ${s.status}" title="${esc(s.title)}"><i>${s.status === 'done' ? svgI('check', '#fff', 12, 3.4) : s.status === 'locked' ? svgI('lock', 'currentColor', 10, 3) : k + 1}</i><b>${esc(s.title)}</b></span>`).join('<span class="pline"></span>');
  return `<div class="path"><div class="psteps">${dots}</div>
    ${cur ? `<div class="pcur"><span><b>Step ${p.current + 1}: ${esc(cur.title)}</b><small>${esc(cur.desc)}${cur.need > 1 ? ` · ${cur.have} of ${cur.need}` : ''}</small></span><span class="cost">+${cur.reward.coins} coins</span></div>` : `<div class="pcur done"><span><b>All steps done ✓</b><small>Everything here is open. Nice work.</small></span></div>`}</div>`;
}
