import { LOGS, logSubjects, logEntries, logReminders, logTotals, latestSizes } from '../systems/logbook.js';
import { shortDate, weekday } from '../systems/time.js';
import { svgI, esc, fmt$ } from './icons.js';

/* One screen for every logbook: who/what it's about, a "+ New entry" form built from the fields, and the history. */
const money = (n) => (Math.abs(n - Math.round(n)) < 0.005 ? fmt$(Math.round(n)) : `$${n.toFixed(2)}`);
const v = (ui, k, d = '') => esc(ui[k] ?? d);
const btn = (a, label, { id = '', cls = 'soft small' } = {}) => `<button type="button" class="btn ${cls}" data-ta="${a}"${id ? ` data-id="${esc(id)}"` : ''}>${label}</button>`;
export const LOG_TABS = {
  repair: [['log', 'Repair log'], ['sum', 'Totals']],
  vet: [['log', 'Records'], ['due', 'Coming up']],
  gifts: [['log', 'Ideas & gifts'], ['sizes', 'Sizes']]
};
const KIND_ICON = { Idea: '💡', Given: '🎁', Size: '📏', Checkup: '🩺', Vaccine: '💉', Grooming: '✂️', 'Sick visit': '🤒', Other: '📝' };

function field(f, ui, day, subjectQuick) {
  const k = `f_${f.k}`;
  if (f.type === 'photo') return `<div class="lg-photo"><label class="q">${esc(f.label)}</label><div class="photo-pick small">${ui.photoPreview ? `<img src="${ui.photoPreview}" alt="">` : `<span>${svgI('camera', '#8A5A30', 24, 2)}<small>Add</small></span>`}<input type="file" id="logPhoto" accept="image/*" aria-label="${esc(f.label)}"></div></div>`;
  if (f.type === 'longtext') return `<label class="q">${esc(f.label)} <small>(optional)</small></label><textarea class="field" data-uf="${k}" rows="2" maxlength="600">${v(ui, k)}</textarea>`;
  if (f.type === 'select') return `<div class="lg-f"><label class="q">${esc(f.label)}</label><select class="freq" data-uf="${k}">${f.options.map((o) => `<option${(ui[k] || f.options[0]) === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  if (f.type === 'date') return `<div class="lg-f"><label class="q">${esc(f.label)}</label><input class="field date" type="date" data-uf="${k}" value="${v(ui, k, f.k === 'date' ? day : '')}"></div>`;
  if (f.type === 'money') return `<div class="lg-f"><label class="q">${esc(f.label)}</label><span class="dollar"><input class="field small" data-uf="${k}" inputmode="decimal" value="${v(ui, k)}" placeholder="0.00"></span></div>`;
  if (f.type === 'number') return `<div class="lg-f"><label class="q">${esc(f.label)}</label><input class="field small" data-uf="${k}" inputmode="numeric" value="${v(ui, k)}" placeholder="0"></div>`;
  return `<div class="lg-f wide"><label class="q">${esc(f.label)}${f.req ? '' : ' <small>(optional)</small>'}</label><input class="field" data-uf="${k}" maxlength="80" value="${v(ui, k)}" placeholder="${esc(f.ph || '')}" autocomplete="off">${f.k === 'what' && subjectQuick?.length ? `<div class="chips-row quick">${subjectQuick.map((q) => `<button type="button" class="pickchip" data-ta="lquick" data-id="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}</div>`;
}

function entryCard(id, e, day) {
  const def = LOGS[id];
  const bits = [];
  for (const f of def.fields) {
    if (['what', 'notes', 'photo', 'date'].includes(f.k) || e[f.k] == null) continue;
    if (f.k === 'kind' || f.k === 'type' || f.k === 'category') continue;
    const val = f.type === 'money' ? money(e[f.k]) : f.type === 'number' ? `${e[f.k].toLocaleString('en-US')}${f.k === 'miles' ? ' mi' : ''}` : f.type === 'date' ? shortDate(e[f.k]) : esc(e[f.k]);
    bits.push(f.type === 'date' ? `${esc(f.label.replace(' (optional)', ''))} ${val}` : val);
  }
  const tag = e.kind || e.type || e.category;
  return `<button type="button" class="lg-entry" data-ta="ledit" data-id="${e.id}">${e.photoId ? `<img data-photo="${e.photoId}" alt="">` : `<span class="lg-ic">${KIND_ICON[tag] || { repair: '🔧' }[id] || '📝'}</span>`}
    <span class="lg-t"><b>${esc(e.what || '')}</b><small>${[e.date ? shortDate(e.date) + (e.date.slice(0, 4) !== day.slice(0, 4) ? ` ${e.date.slice(0, 4)}` : '') : '', e.subject ? esc(e.subject) : '', tag && !e.kind ? esc(tag) : '', ...bits].filter(Boolean).join(' · ')}</small>${e.notes ? `<small class="lg-n">${esc(e.notes.slice(0, 90))}${e.notes.length > 90 ? '…' : ''}</small>` : ''}</span>${svgI('edit', 'currentColor', 15)}</button>`;
}

export function renderLog(state, id, tab, ui, day) {
  const def = LOGS[id];
  const subs = logSubjects(state, id);
  const sel = ui.subject && subs.includes(ui.subject) ? ui.subject : '';
  if (tab === 'sum') {
    const t = logTotals(state, id, day);
    return `<div class="sub-sum"><span><b>${t.count}</b><small>${t.count === 1 ? 'entry' : 'entries'}</small></span><span><b>${money(t.yearCost)}</b><small>spent in ${day.slice(0, 4)}</small></span></div>
      ${Object.entries(t.by).map(([k, x]) => `<div class="tool-row static"><span><b>${esc(k)}</b><small>${x.n} ${x.n === 1 ? 'entry' : 'entries'} · ${money(x.yearCost)} this year · ${money(x.cost)} all time${x.miles ? ` · last mileage ${x.miles.toLocaleString('en-US')}` : ''}</small></span></div>`).join('') || '<p class="hint">Totals show up once you’ve logged something.</p>'}
      <p class="foot">Handy when you sell a car: the whole service history is right here.</p>`;
  }
  if (tab === 'due') {
    const r = logReminders(state, id, day, 120);
    return `${r.map((e) => `<div class="tool-row static${e.days <= 14 ? ' review' : ''}"><span><b>${esc(e.what)}${e.subject ? ` · ${esc(e.subject)}` : e.who ? ` · ${esc(e.who)}` : ''}</b><small>Due ${weekday(e.on)}, ${shortDate(e.on)} · ${e.days > 1 ? `in ${e.days} days` : e.days === 1 ? 'tomorrow' : e.days === 0 ? 'today' : 'ready when you are'}</small></span>${btn('lhandled', 'Done', { id: e.id, cls: 'go-btn small' })}</div>`).join('') || `<p class="hint">Nothing coming up. Add a “next checkup or vaccine” date to a record and it shows here.</p>`}
      <p class="foot">You’ll see a bubble on the building two weeks ahead.</p>`;
  }
  if (tab === 'sizes') {
    const sz = latestSizes(state);
    return `<p class="hint">Log a size as <b>Kind: Size</b> with “Shoe: 4Y” or “Shirt: 6”. The newest one for each shows here.</p>
      ${Object.entries(sz).map(([who, m]) => `<div class="card2"><b>${esc(who)}</b><div class="rev-secs left">${Object.entries(m).map(([k, x]) => `<span class="fpill">${esc(k)}: <b>${esc(x.val)}</b></span>`).join('')}</div></div>`).join('') || '<p class="hint">No sizes yet.</p>'}
      <div class="actions">${btn('lnew', `${svgI('plus', 'currentColor', 14, 3)} Add a size`, { id: 'Size', cls: 'go-btn small' })}</div>`;
  }
  /* main log */
  const chips = def.subjects ? `<div class="chips-row lg-subs"><button type="button" class="pickchip${sel ? '' : ' on'}" data-ta="lsub" data-id="">All</button>${subs.map((n) => `<button type="button" class="pickchip${sel === n ? ' on' : ''}" data-ta="lsub" data-id="${esc(n)}">${esc(n)}</button>`).join('')}
    ${ui.addsub ? `<span class="te-row inline"><input class="field small" data-uf="newsub" maxlength="30" value="${v(ui, 'newsub')}" placeholder="Name" autocomplete="off">${btn('laddsub', 'Add', { cls: 'go-btn small' })}</span>` : `<button type="button" class="pickchip add" data-ta="laddsubopen">+ ${esc(def.addLabel)}</button>`}</div>` : '';
  const editing = ui.eid ? state.logs[id].find((e) => e.id === ui.eid) : null;
  let quick = null;
  if (id === 'repair') { const th = (state.care?.things || []).find((t) => t.kind === 'car' && t.name === (ui.f_subject || sel)); quick = th ? [...new Set(['Oil change', 'Tire rotation', 'New tires', 'Car battery', 'Fluids', 'Brakes', ...(th.custom || [])])] : ['Oil change', 'Tire rotation', 'New tires', 'Car battery', 'Fluids', 'Brakes']; }
  const form = ui.form ? `<div class="card2 lg-form"><b>${editing ? 'Edit entry' : 'New entry'}</b>
      ${def.subjects ? `<div class="lg-f"><label class="q">${esc(def.subjectLabel)}</label><select class="freq" data-uf="f_subject">${subs.length ? '' : '<option value="">(add one above)</option>'}${subs.map((n) => `<option${(ui.f_subject ?? sel) === n ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>` : ''}
      <div class="lg-grid">${def.fields.map((f) => field(f, ui, day, quick)).join('')}</div>
      <div class="actions">${btn('lsave', editing ? 'Save' : 'Save entry', { cls: 'go-btn' })}${editing ? btn('ldel', 'Remove', { id: editing.id, cls: 'soft' }) : ''}${btn('lcancel', 'Cancel', { cls: 'soft' })}</div></div>` : '';
  const es = logEntries(state, id, sel || null);
  const due = def.reminder ? logReminders(state, id, day, 14) : [];
  const ideas = id === 'gifts' ? es.filter((e) => e.kind === 'Idea') : [];
  const rest = id === 'gifts' ? es.filter((e) => e.kind !== 'Idea' && e.kind !== 'Size') : es;
  return `${chips}${due.length ? `<div class="tq ready"><span>⏰ ${due.length} coming up soon</span>${btn('tab', 'See them', { id: 'due' })}</div>` : ''}
    ${ui.form ? form : `<div class="actions left">${btn('lnew', `${svgI('plus', 'currentColor', 14, 3)} New entry`, { cls: 'go-btn small' })}${id === 'gifts' ? btn('lnew', '💡 Gift idea', { id: 'Idea' }) : ''}</div>`}
    ${id === 'gifts' && ideas.length ? `<div class="h3">💡 Ideas saved</div>${ideas.map((e) => entryCard(id, e, day)).join('')}<div class="h3">Given</div>` : ''}
    ${rest.map((e) => entryCard(id, e, day)).join('') || `<p class="hint">${id === 'gifts' && ideas.length ? 'Nothing given yet.' : 'Nothing logged yet.'}</p>`}`;
}
