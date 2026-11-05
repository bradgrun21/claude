import { esc } from './icons.js';
import { ART } from './art.js';

/* First open: a welcome screen and one short form (town name + who lives there). Then the guided tour takes over. */
const COLORS = ['#D9774A', '#4E7FA0', '#F28CA0', '#F2B54A', '#4CAF6A', '#9A72D6', '#C98F5E', '#2F2A28'];

export function runSetup(el, { onDone, onDemo }) {
  const draft = { cityName: '', family: [{ name: '', color: COLORS[0], kind: 'adult' }] };
  let step = 0;
  el.hidden = false;
  function render(focus) {
    if (step === 0) {
      el.innerHTML = `<div class="su su-hero"><div class="su-guide">${ART.guide}</div><h1 id="setupTitle">Welcome to Life City</h1>
        <p class="lead">Build a little town that grows every time your family moves forward on what matters: faith, health, money, relationships and the everyday to-dos.</p>
        <button type="button" class="btn go-btn" data-a="next">Start my town</button>
        <button type="button" class="btn link" data-a="demo">Look around a sample town first</button></div>`;
    } else {
      el.innerHTML = `<div class="su"><h1 id="setupTitle">Who lives in your town?</h1><p class="lead">Your family walks around town. Names stay on this device.</p>
        <label class="q" for="suName">Town name <small>(optional)</small></label><input class="field" id="suName" maxlength="32" value="${esc(draft.cityName)}" placeholder="Our Life City" autocomplete="off">
        ${draft.family.map((m, i) => `<div class="member"><input class="field" data-name="${i}" maxlength="20" value="${esc(m.name)}" aria-label="Name" placeholder="Name" autocomplete="off">
          <select data-kind="${i}" aria-label="Who">${['adult', 'kid', 'pet'].map((k) => `<option value="${k}"${m.kind === k ? ' selected' : ''}>${k === 'adult' ? 'Grown-up' : k === 'kid' ? 'Kid' : 'Pet'}</option>`).join('')}</select>
          <div class="swatches">${COLORS.map((c) => `<button type="button" data-color="${i}" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${m.color === c}"></button>`).join('')}
          ${draft.family.length > 1 ? `<button type="button" class="btn link" data-remove="${i}" style="margin-left:auto">Remove</button>` : ''}</div></div>`).join('')}
        ${draft.family.length < 10 ? '<button type="button" class="btn soft" data-a="add" style="margin-top:10px;width:100%">+ Add someone</button>' : ''}
        <div class="nav"><button type="button" class="btn soft" data-a="back">Back</button><button type="button" class="btn go-btn" data-a="done">Found my town</button></div></div>`;
      if (focus) el.querySelector('#suName')?.focus({ preventScroll: true });
    }
  }
  function read() {
    const n = el.querySelector('#suName'); if (n) draft.cityName = n.value;
    el.querySelectorAll('[data-name]').forEach((i) => { draft.family[+i.dataset.name].name = i.value; });
    el.querySelectorAll('[data-kind]').forEach((s) => { draft.family[+s.dataset.kind].kind = s.value; });
  }
  el.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    read();
    const d = b.dataset;
    if (d.a === 'demo') { el.hidden = true; onDemo(); return; }
    if (d.a === 'next') { step = 1; render(true); return; }
    if (d.a === 'back') { step = 0; render(); return; }
    if (d.a === 'done') { el.hidden = true; onDone({ cityName: draft.cityName, family: draft.family }); return; }
    if (d.a === 'add') { draft.family.push({ name: '', color: COLORS[draft.family.length % COLORS.length], kind: 'kid' }); render(); return; }
    if (d.color) { draft.family[+d.color].color = d.c; render(); return; }
    if (d.remove) { draft.family.splice(+d.remove, 1); render(); }
  };
  el.onchange = read;
  render();
}
