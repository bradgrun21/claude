import { ART } from './art.js';
import { esc } from './icons.js';

/*
 * Guided tour: a friendly town planner points at one thing at a time.
 * Each step waits for the player to actually do it (an event from the game), so it teaches by doing.
 * "Skip tour" is always there.
 */
export function createTour(el, { onSkip }) {
  const arrow = el.querySelector('#tourArrow'), card = el.querySelector('#tourCard');
  let step = null, raf = 0;
  function show(s) {
    step = s;
    el.hidden = false;
    card.innerHTML = `<div class="tg">${ART.guide}</div><div class="tt"><b>${esc(s.title)}</b><p>${esc(s.text)}</p>
      <div class="tb">${s.button ? `<button type="button" class="btn go-btn small" data-t="next">${esc(s.button)}</button>` : ''}<button type="button" class="btn link" data-t="skip">Skip tour</button></div></div>`;
    document.body.classList.add('touring');
    track();
  }
  function track() {
    cancelAnimationFrame(raf);
    const loop = () => {
      if (!step) return;
      const r = step.target ? step.target() : null;
      const panelOpen = !document.getElementById('panel').hidden;
      const ty = r ? (r.top !== undefined ? r.top : r.y) : null;
      const dock = step.cardAt === 'mid' && !panelOpen ? 'mid' : panelOpen ? 'bottom' : ty != null && ty < innerHeight * 0.45 ? 'bottom' : 'top';
      if (card.dataset.dock !== dock) { card.dataset.dock = dock; card.className = 'tour-card ' + dock; }
      document.body.classList.toggle('touring-panel', panelOpen);
      if (r && r.width !== undefined) {
        arrow.hidden = false;
        arrow.style.transform = `translate(${(r.left + r.width / 2).toFixed(0)}px, ${(r.top - 6).toFixed(0)}px)`;
      } else if (r && r.x !== undefined) {
        arrow.hidden = false;
        arrow.style.transform = `translate(${r.x.toFixed(0)}px, ${(r.y - 6).toFixed(0)}px)`;
      } else arrow.hidden = true;
      raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function hide() { step = null; el.hidden = true; arrow.hidden = true; cancelAnimationFrame(raf); document.body.classList.remove('touring', 'touring-panel'); }
  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-t]')?.dataset.t;
    if (t === 'next' && step?.onButton) step.onButton();
    if (t === 'skip') { hide(); onSkip(); }
  });
  return { show, hide, get current() { return step; } };
}
