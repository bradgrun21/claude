import { SECTIONS, SECTION_KEYS } from '../data/catalog.js';
import { budgetSummary, eventsOn, upcoming, OUTING_REWARD } from '../systems/calendar.js';
import { memoriesFor, MAX_RECAP } from '../systems/memories.js';
import { fromKey, addDays, shortDate, weekday } from '../systems/time.js';
import { svgI, esc, fmt$ } from './icons.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const chip = (s) => `<span class="schip" style="--c:${SECTIONS[s].color}">${svgI(SECTIONS[s].icon, '#fff', 12, 2.4)}${SECTIONS[s].name}</span>`;
const fmtTime = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
const money = (n) => (Number.isInteger(n) ? fmt$(n) : `$${n.toFixed(2)}`);

/* ---------- Calendar ---------- */
/* Goals (not finished) whose target date is this day. */
export const goalTargetsOn = (state, day) => state.lists.flatMap((l) => (l.goals || []).filter((g) => g.target === day && !g.achievedOn).map((g) => ({ ...g, section: l.section })));

export function renderCalendar(state, today, ym, sel) {
  const [y, mo] = ym.split('-').map(Number);
  const first = new Date(y, mo - 1, 1);
  const startKey = addDays(`${ym}-01`, -((first.getDay() + 6) % 7));
  const b = budgetSummary(state, ym);
  const cells = [];
  for (let k = 0; k < 42; k++) {
    const key = addDays(startKey, k);
    if (k >= 35 && !key.startsWith(ym)) break;
    const evs = eventsOn(state, key), mems = memoriesFor(state, { day: key });
    const gts = goalTargetsOn(state, key);
    const dots = [...gts.map((g) => `<i class="gt" style="--c:${SECTIONS[g.section].color}"></i>`), ...evs.map((e) => `<i style="background:${SECTIONS[e.section].color}"></i>`), ...(mems.length ? ['<i class="mem"></i>'] : [])].slice(0, 4).join('');
    cells.push(`<button type="button" class="cday${key.startsWith(ym) ? '' : ' out'}${key === today ? ' today' : ''}${key === sel ? ' sel' : ''}" data-day="${key}"><b>${fromKey(key).getDate()}</b><span class="dots">${dots}</span></button>`);
  }
  const pct = b.limit ? Math.min(100, (b.planned / b.limit) * 100) : 0;
  const budgetCard = `<div class="card2 budget"><div class="row"><b>${MONTHS[mo - 1]} outings</b>${b.limit ? `<span class="muted">${money(b.planned)} planned of ${money(b.limit)}</span>` : '<span class="muted">No monthly outing budget yet</span>'}</div>
    ${b.limit ? `<div class="pbar budgetbar"><i style="width:${pct.toFixed(0)}%"></i></div><small>${b.left >= 0 ? `${money(b.left)} still open to plan` : `${money(-b.left)} more planned than budgeted. Move something to next month or adjust the budget.`} · ${money(b.spent)} spent so far</small>` : ''}
    <div class="money-row"><label for="outBudget">Monthly outing budget</label><span class="dollar"><input class="field small" id="outBudget" inputmode="decimal" value="${b.limit || ''}" placeholder="0"></span><button type="button" class="btn soft small" data-cal="budget">Save</button></div></div>`;
  const dayEvents = eventsOn(state, sel), dayMems = memoriesFor(state, { day: sel });
  const dayGoals = goalTargetsOn(state, sel);
  const day = `<div class="h3">${weekday(sel)}, ${shortDate(sel)}</div>
    ${dayGoals.map((g) => `<div class="goal-target" style="--c:${SECTIONS[g.section].color}">🎯 <span><b>${esc(g.title)}</b><small>Goal target date</small></span></div>`).join('')}
    ${dayEvents.map((e) => renderEventCard(state, e, today)).join('') || '<p class="hint">Nothing planned this day.</p>'}
    ${dayMems.length ? `<div class="mem-strip">${dayMems.map(memoryThumb).join('')}</div>` : ''}
    <div class="actions"><button type="button" class="btn go-btn" data-cal="new" data-date="${sel}">${svgI('plus', '#fff', 16, 3)} Plan an outing</button><button type="button" class="btn soft" data-mem="new" data-date="${sel}">${svgI('camera', 'currentColor', 16)} Add a memory</button></div>`;
  const up = upcoming(state, today, 4);
  return `<div class="cal-wrap"><div class="cal-left">${budgetCard}
    <div class="cal-head"><button type="button" class="btn soft small" data-cal="prev" aria-label="Previous month">‹</button><b>${MONTHS[mo - 1]} ${y}</b><button type="button" class="btn soft small" data-cal="next" aria-label="Next month">›</button></div>
    <div class="cal-grid">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="dow">${d}</span>`).join('')}${cells.join('')}</div></div>
    <div class="cal-right">${day}
    ${up.length ? `<div class="h3">Coming up</div>${up.map((e) => `<button type="button" class="up-row" data-day="${e.date}"><span class="up-d"><b>${fromKey(e.date).getDate()}</b>${MONTHS[fromKey(e.date).getMonth()].slice(0, 3)}</span><span class="up-t"><b>${esc(e.title)}</b><small>${fmtTime(e.time) || 'Any time'}${e.budget ? ` · ${money(e.budget)} planned` : ''}</small></span></button>`).join('')}
      <button type="button" class="btn link" data-cal="icsall">Add all upcoming to my phone calendar</button>` : ''}
    <p class="foot">Coming later with accounts: community events in town, and linking your family's own calendar so it stays in sync.</p></div></div>`;
}

export function renderEventCard(state, e, today) {
  const who = e.who.map((n) => { const m = state.family.find((f) => f.name === n); return `<i style="background:${m ? m.color : '#9AA6B2'}" title="${esc(n)}">${esc(n[0])}</i>`; }).join('');
  const spentLine = e.done ? (e.spent != null && e.budget ? (e.spent <= e.budget ? `Spent ${money(e.spent)} of ${money(e.budget)} planned` : `Spent ${money(e.spent)}, ${money(e.spent - e.budget)} over the plan`) : e.spent != null ? `Spent ${money(e.spent)}` : '') : (e.budget ? `${money(e.budget)} planned` : 'No budget set');
  return `<div class="card2 ev" style="--c:${SECTIONS[e.section].color}"><div class="row"><b>${esc(e.title)}</b>${chip(e.section)}</div>
    <small>${fmtTime(e.time) || 'Any time'}${e.place ? ` · ${esc(e.place)}` : ''} · ${spentLine}</small>
    ${who ? `<span class="fam">${who}</span>` : ''}${e.notes ? `<p class="hint">${esc(e.notes)}</p>` : ''}
    ${e.done ? `<p class="ok-line">${svgI('check', '#3E8E57', 15, 3)} We went!${e.memoryId ? ' <button type="button" class="btn link" data-memview="' + e.memoryId + '">See the recap</button>' : ''}</p>` : ''}
    <div class="btns">${!e.done && e.date <= today ? `<button type="button" class="btn go-btn small" data-went="${e.id}">We went! +${OUTING_REWARD.coins}</button>` : ''}
    ${!e.done ? `<button type="button" class="btn soft small" data-ics="${e.id}">${svgI('calendar', 'currentColor', 14)} Add to my calendar</button>` : ''}
    <button type="button" class="btn soft small" data-evedit="${e.id}">${svgI('edit', 'currentColor', 14)} Edit</button></div></div>`;
}

export function renderEventForm(d, state) {
  return `<label class="q" for="evTitle">What are you planning?</label><input class="field" id="evTitle" maxlength="60" value="${esc(d.title)}" placeholder="like “Pumpkin patch with the kids”" autocomplete="off">
    <div class="two"><div><label class="q" for="evDate">Date</label><input class="field" type="date" id="evDate" value="${d.date}"></div><div><label class="q" for="evTime">Time <small>(optional)</small></label><input class="field" type="time" id="evTime" value="${d.time}"></div></div>
    <label class="q">Area</label><div class="chips-row">${SECTION_KEYS.map((s) => `<button type="button" class="pickchip${d.section === s ? ' on' : ''}" style="--c:${SECTIONS[s].color}" data-esec="${s}">${SECTIONS[s].name}</button>`).join('')}</div>
    <div class="two"><div><label class="q" for="evPlace">Where <small>(optional)</small></label><input class="field" id="evPlace" maxlength="60" value="${esc(d.place)}" autocomplete="off"></div>
    <div><label class="q" for="evBudget">Budget for it</label><span class="dollar"><input class="field" id="evBudget" inputmode="decimal" value="${d.budget || ''}" placeholder="0"></span></div></div>
    ${state.family.length ? `<label class="q">Who's going</label><div class="chips-row">${state.family.map((m) => `<button type="button" class="pickchip${d.who.includes(m.name) ? ' on' : ''}" style="--c:${m.color}" data-who="${esc(m.name)}">${esc(m.name)}</button>`).join('')}</div>` : ''}
    <label class="q" for="evNotes">Notes <small>(optional)</small></label><input class="field" id="evNotes" maxlength="140" value="${esc(d.notes)}" autocomplete="off">
    <div class="actions"><button type="button" class="btn go-btn" data-evsave="1">${d.id ? 'Save changes' : 'Add to the calendar'}</button>${d.id ? '<button type="button" class="btn soft" data-evdel="1">Remove</button>' : ''}</div>`;
}

/* ---------- Memories ---------- */
export function renderMemoryForm(d) {
  return `${d.eventTitle ? `<p class="hint">Recap of <b>${esc(d.eventTitle)}</b></p>` : d.taskTitle ? `<p class="hint">Marking off <b>${esc(d.taskTitle)}</b></p>` : ''}
    <label class="q">Area</label><div class="chips-row">${SECTION_KEYS.map((s) => `<button type="button" class="pickchip${d.section === s ? ' on' : ''}" style="--c:${SECTIONS[s].color}" data-msec="${s}">${SECTIONS[s].name}</button>`).join('')}</div>
    <div class="mem-form"><div class="photo-pick">${d.preview ? `<img src="${d.preview}" alt="Your photo">` : `<span>${svgI('camera', '#8A5A30', 34, 2)}<small>Add a photo</small></span>`}
      <input type="file" id="memPhoto" accept="image/*" aria-label="Choose a photo"></div>
    <div class="mem-fields"><label class="q" for="memText">Recap <small>(a sentence or two)</small></label><textarea class="field" id="memText" rows="3" maxlength="${MAX_RECAP}" placeholder="What happened? What made you smile?">${esc(d.text)}</textarea>
      <div class="two"><div><label class="q" for="memDate">Day</label><input class="field" type="date" id="memDate" value="${d.date}"></div>
      ${d.eventId ? `<div><label class="q" for="memSpent">What it actually cost</label><span class="dollar"><input class="field" id="memSpent" inputmode="decimal" value="${d.spent ?? ''}" placeholder="0"></span></div>` : ''}</div></div></div>
    <p class="foot">Photos stay on this device.</p>
    <div class="actions"><button type="button" class="btn go-btn" data-memsave="1">${d.eventId ? 'Save recap' : 'Save memory'}</button>${d.eventId ? '<button type="button" class="btn soft" data-memskip="1">Just mark it done</button>' : ''}</div>`;
}

export function memoryThumb(m) {
  return `<button type="button" class="memcard${m.photoId ? ' has-photo' : ''}" data-memview="${m.id}" style="--c:${SECTIONS[m.section].color}">
    ${m.photoId ? `<img data-photo="${m.photoId}" alt="">` : `<span class="memq">“${esc(m.text.slice(0, 90))}${m.text.length > 90 ? '…' : ''}”</span>`}
    <span class="memmeta">${SECTIONS[m.section].name} · ${shortDate(m.date)}</span></button>`;
}

export function renderMemories(state, filter) {
  const list = memoriesFor(state, { section: filter || null });
  const chips = `<div class="chips-row"><button type="button" class="pickchip${!filter ? ' on' : ''}" data-mfilter="">All</button>${SECTION_KEYS.map((s) => `<button type="button" class="pickchip${filter === s ? ' on' : ''}" style="--c:${SECTIONS[s].color}" data-mfilter="${s}">${SECTIONS[s].name}</button>`).join('')}</div>`;
  if (!list.length) return `${chips}<div class="empty">${svgI('camera', '#8A5A30', 36, 2)}<b>No memories yet</b><p class="hint">After a family night, a workout or a quiet moment, add a photo or a few words. Each one is a little time capsule.</p><button type="button" class="btn go-btn" data-mem="new">Add a memory</button></div>`;
  const byMonth = new Map();
  for (const m of list) { const k = m.date.slice(0, 7); if (!byMonth.has(k)) byMonth.set(k, []); byMonth.get(k).push(m); }
  return `${chips}<div class="actions" style="justify-content:flex-start;margin-top:4px"><button type="button" class="btn go-btn small" data-mem="new">${svgI('camera', '#fff', 15)} Add a memory</button></div>
    ${[...byMonth].map(([k, ms]) => { const [y, mo] = k.split('-').map(Number); return `<div class="h3">${MONTHS[mo - 1]} ${y}</div><div class="mem-grid">${ms.map(memoryThumb).join('')}</div>`; }).join('')}`;
}

export function renderMemoryView(state, m) {
  const ev = m.eventId && state.events.find((e) => e.id === m.eventId);
  return `<div class="memview">${m.photoId ? `<div class="has-photo big-photo"><img data-photo="${m.photoId}" alt="Memory photo"></div>` : ''}
    <div><div class="row">${chip(m.section)}<b>${weekday(m.date)}, ${shortDate(m.date)}</b></div>
    ${ev ? `<p class="hint">Recap of <b>${esc(ev.title)}</b></p>` : m.taskTitle ? `<p class="hint">Marked off: <b>${esc(m.taskTitle)}</b></p>` : ''}
    ${m.text ? `<p class="recap">${esc(m.text)}</p>` : ''}
    <div class="actions" style="justify-content:flex-start"><button type="button" class="btn soft small" data-memdel="${m.id}">Remove</button></div></div></div>`;
}
