import { AREAS, AREA_INFO } from '../data/areas.js';
import { svgI, esc } from './icons.js';
import { FREQ_LABEL, addDays, dateKey } from '../systems/time.js';

/*
 * First open: under 3 minutes.
 * 1 household → 2 four numbers → 3 rank what matters → 4 weekly goals → 5 family & pets.
 * Goals are the family's own words. Placeholders are blank on purpose (no app suggestions).
 */
const COLORS = ['#D9774A', '#4E7FA0', '#F28CA0', '#F2B54A', '#4CAF6A', '#9A72D6', '#C98F5E', '#2F2A28'];
const HOUSEHOLDS = [
  { id: 'one', title: 'One income', sub: 'One paycheck runs the house' },
  { id: 'two-on-one', title: 'Two incomes, living on one', sub: 'The second paycheck goes to the plan' },
  { id: 'single-parent', title: 'Single parent', sub: 'One grown-up running the show' }
];

function nextFriday(today) {
  const d = new Date(); let k = today;
  for (let i = 0; i < 7; i++) { const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i).getDay(); if (day === 5) { k = addDays(today, i); break; } }
  return k;
}

export function runSetup(el, { today, onDone, onDemo }) {
  const draft = {
    household: 'one', cityName: '',
    pay: { amount: '', freq: 'biweekly', next: nextFriday(today) },
    bills: '', debt: '', debtPayments: '', savings: '',
    ranking: [...AREAS],
    goals: AREAS.map((a) => ({ area: a, label: '', perWeek: 3 })),
    family: [{ name: '', color: COLORS[0], kind: 'adult' }]
  };
  let step = 0;
  const STEPS = 6;
  el.hidden = false;

  const dots = () => `<div class="dots" aria-hidden="true">${Array.from({ length: STEPS - 1 }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>`;
  const nav = (nextLabel = 'Next', disabled = false) => `<div class="nav"><button type="button" class="btn soft" data-a="back">Back</button><button type="button" class="btn main" data-a="next"${disabled ? ' disabled' : ''}>${nextLabel}</button></div>`;
  const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };

  function render(focus = false) {
    let h = '';
    if (step === 0) {
      h = `<div class="su"><h1 id="setupTitle">Let's raise your Life City</h1>
        <p class="lead">A little island town that grows with your family's real money steps and everyday habits. Setup takes about two minutes, and everything stays on this device.</p>
        <button type="button" class="btn main" style="width:100%;padding:14px;font-size:16px" data-a="next">Build our city</button>
        <button type="button" class="btn link" style="width:100%;margin-top:8px" data-a="demo">Just look around a sample city first</button></div>`;
    } else if (step === 1) {
      h = `<div class="su">${dots()}<h1 id="setupTitle">Who's running this house?</h1><p class="lead">Pick the one that fits best.</p>
        ${HOUSEHOLDS.map((o) => `<button type="button" class="opt" data-house="${o.id}" aria-pressed="${draft.household === o.id}"><b>${o.title}</b><span>${o.sub}</span></button>`).join('')}
        <label class="q" for="suName">City name <small>(optional)</small></label><input class="field" id="suName" maxlength="32" value="${esc(draft.cityName)}" placeholder="Our Life City" autocomplete="off">
        ${nav()}</div>`;
    } else if (step === 2) {
      h = `<div class="su">${dots()}<h1 id="setupTitle">Four numbers</h1><p class="lead">Rough is fine. These set how high the water is around your island. Nobody else sees them.</p>
        <label class="q" for="suPay">1. Take-home pay per payday</label>
        <div class="two"><div class="money"><input class="field" id="suPay" inputmode="decimal" value="${esc(draft.pay.amount)}" autocomplete="off"></div>
        <select class="field" id="suFreq" aria-label="How often">${Object.entries(FREQ_LABEL).map(([k, v]) => `<option value="${k}"${draft.pay.freq === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
        <label class="q" for="suNext">Next payday</label><input class="field" type="date" id="suNext" value="${draft.pay.next}" min="${today}">
        <label class="q" for="suBills">2. Monthly bills <small>(rent, utilities, groceries, everything)</small></label><div class="money"><input class="field" id="suBills" inputmode="decimal" value="${esc(draft.bills)}"></div>
        <label class="q" for="suDebt">3. Total debt <small>(not counting the house)</small></label><div class="money"><input class="field" id="suDebt" inputmode="decimal" value="${esc(draft.debt)}"></div>
        <label class="q" for="suDebtPay">4. Monthly debt payments</label><div class="money"><input class="field" id="suDebtPay" inputmode="decimal" value="${esc(draft.debtPayments)}"></div>
        <label class="q" for="suSave">Savings you could use in an emergency <small>(optional)</small></label><div class="money"><input class="field" id="suSave" inputmode="decimal" value="${esc(draft.savings)}"></div>
        <p class="note">Stays in this browser only. Nothing is uploaded.</p>
        ${nav()}</div>`;
    } else if (step === 3) {
      h = `<div class="su">${dots()}<h1 id="setupTitle">What matters most?</h1><p class="lead">Put them in order. Your top pick counts most in your mayor rating.</p>
        ${draft.ranking.map((a, i) => `<div class="rank"><span class="n">${i + 1}</span><b>${a}</b><em>counts ${[30, 20, 20, 15, 10, 5][i]}%</em>
          <button type="button" data-up="${i}" aria-label="Move ${a} up"${i === 0 ? ' disabled' : ''}>${svgI('up', 'currentColor', 16)}</button>
          <button type="button" data-down="${i}" aria-label="Move ${a} down"${i === AREAS.length - 1 ? ' disabled' : ''}>${svgI('down', 'currentColor', 16)}</button></div>`).join('')}
        ${nav()}</div>`;
    } else if (step === 4) {
      const any = draft.goals.some((g) => g.label.trim() && g.perWeek > 0);
      h = `<div class="su">${dots()}<h1 id="setupTitle">Your weekly goals</h1><p class="lead">In your own words, one small thing per area you want to do each week. Leave any area blank to skip it.</p>
        ${draft.ranking.map((area) => `<div class="goal"><div class="head"><i style="background:${AREA_INFO[area].color}"></i>${area}</div>
          ${draft.goals.map((g, gi) => g.area !== area ? '' : `<div class="line"><input class="field" data-goal="${gi}" maxlength="40" value="${esc(g.label)}" aria-label="${area} goal" autocomplete="off">
          <div class="stepper"><button type="button" data-minus="${gi}" aria-label="Fewer times">−</button><span>${g.perWeek}×<br>a week</span><button type="button" data-plus="${gi}" aria-label="More times">+</button></div></div>`).join('')}
          ${draft.goals.filter((g) => g.area === area).length < 3 ? `<button type="button" class="btn link" data-more="${area}">+ another ${area.toLowerCase()} goal</button>` : ''}</div>`).join('')}
        <p class="note">${any ? 'Each goal becomes a bubble over a building in town.' : 'Add at least one goal so your town has something to do.'}</p>
        ${nav('Next', !any)}</div>`;
    } else if (step === 5) {
      const any = draft.family.some((m) => m.name.trim());
      h = `<div class="su">${dots()}<h1 id="setupTitle">Who lives here?</h1><p class="lead">Add your family and pets. They'll walk around town together.</p>
        ${draft.family.map((m, i) => `<div class="member"><input class="field" data-name="${i}" maxlength="20" value="${esc(m.name)}" aria-label="Name" placeholder="Name" autocomplete="off">
          <select data-kind="${i}" aria-label="Who">${['adult', 'kid', 'pet'].map((k) => `<option value="${k}"${m.kind === k ? ' selected' : ''}>${k === 'adult' ? 'Grown-up' : k === 'kid' ? 'Kid' : 'Pet'}</option>`).join('')}</select>
          <div class="swatches">${COLORS.map((c) => `<button type="button" data-color="${i}" data-c="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${m.color === c}"></button>`).join('')}
          ${draft.family.length > 1 ? `<button type="button" class="btn link" data-remove="${i}" style="margin-left:auto">Remove</button>` : ''}</div></div>`).join('')}
        ${draft.family.length < 10 ? '<button type="button" class="btn soft" data-a="add" style="margin-top:10px;width:100%">+ Add someone</button>' : ''}
        ${nav('Raise our city', !any)}</div>`;
    }
    el.innerHTML = h;
    const first = el.querySelector('input, .opt[aria-pressed="true"], .btn.main');
    if (focus) { if (first && step > 0) first.focus({ preventScroll: true }); el.scrollTop = 0; }
  }

  function readInputs() {
    const v = (id) => el.querySelector('#' + id)?.value ?? '';
    if (step === 1) draft.cityName = v('suName');
    if (step === 2) {
      draft.pay.amount = v('suPay'); draft.pay.freq = v('suFreq'); draft.pay.next = v('suNext') || draft.pay.next;
      draft.bills = v('suBills'); draft.debt = v('suDebt'); draft.debtPayments = v('suDebtPay'); draft.savings = v('suSave');
    }
    el.querySelectorAll('[data-goal]').forEach((i) => { draft.goals[+i.dataset.goal].label = i.value; });
    el.querySelectorAll('[data-name]').forEach((i) => { draft.family[+i.dataset.name].name = i.value; });
    el.querySelectorAll('[data-kind]').forEach((s) => { draft.family[+s.dataset.kind].kind = s.value; });
  }

  function finish() {
    const fam = draft.family.filter((m) => m.name.trim());
    const city = draft.cityName.trim() || (fam[0] ? `${fam[0].name.trim()}'s Life City` : 'Our Life City');
    onDone({
      household: draft.household, cityName: city,
      pay: { amount: num(draft.pay.amount), freq: draft.pay.freq, next: draft.pay.next && draft.pay.next >= today ? draft.pay.next : nextFriday(today) },
      bills: num(draft.bills), debt: num(draft.debt), debtPayments: num(draft.debtPayments), savings: num(draft.savings),
      ranking: draft.ranking,
      goals: draft.goals.map((g) => ({ ...g })),
      family: fam
    });
  }

  el.addEventListener('input', (e) => {
    readInputs();
    if (step === 4 || step === 5) {
      const ok = step === 4 ? draft.goals.some((g) => g.label.trim() && g.perWeek > 0) : draft.family.some((m) => m.name.trim());
      const nb = el.querySelector('[data-a="next"]'); if (nb) nb.disabled = !ok;
      const note = el.querySelector('.note'); if (note && step === 4) note.textContent = ok ? 'Each goal becomes a bubble over a building in town.' : 'Add at least one goal so your town has something to do.';
    }
  });
  el.addEventListener('change', (e) => { if (e.target.matches('[data-kind]')) readInputs(); });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); el.querySelector('[data-a="next"]')?.click(); } });
  el.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    readInputs();
    const d = t.dataset;
    if (d.a === 'demo') { el.hidden = true; onDemo(); return; }
    if (d.a === 'back') { step = Math.max(0, step - 1); render(true); return; }
    if (d.a === 'next') { if (step === 5) { el.hidden = true; finish(); return; } step++; render(true); return; }
    if (d.a === 'add') { draft.family.push({ name: '', color: COLORS[draft.family.length % COLORS.length], kind: draft.family.length ? 'kid' : 'adult' }); render(); return; }
    if (d.house) { draft.household = d.house; render(); return; }
    if (d.up) { const i = +d.up; [draft.ranking[i - 1], draft.ranking[i]] = [draft.ranking[i], draft.ranking[i - 1]]; render(); return; }
    if (d.down) { const i = +d.down; [draft.ranking[i + 1], draft.ranking[i]] = [draft.ranking[i], draft.ranking[i + 1]]; render(); return; }
    if (d.minus) { const g = draft.goals[+d.minus]; g.perWeek = Math.max(1, g.perWeek - 1); render(); return; }
    if (d.plus) { const g = draft.goals[+d.plus]; g.perWeek = Math.min(7, g.perWeek + 1); render(); return; }
    if (d.more) { const idx = draft.goals.map((g) => g.area).lastIndexOf(d.more); draft.goals.splice(idx + 1, 0, { area: d.more, label: '', perWeek: 3 }); render(); return; }
    if (d.color) { draft.family[+d.color].color = d.c; render(); return; }
    if (d.remove) { draft.family.splice(+d.remove, 1); render(); return; }
  });
  render(true);
}

export { dateKey };
