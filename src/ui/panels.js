import { SECTIONS, SECTION_KEYS, BUILDINGS, byId, mainBuildingFor, ROAD_COST, MAX_HOME_LEVEL, homePop, homeUpgradeCost } from '../data/catalog.js';
import { levelNeed, population, TOWNHALL, taskReward, goalReward, canUpgradeTownHall, unlockedAt } from '../systems/economy.js';
import { isAvailable, progressLabel, listFor, dueCount, MAX_TASKS, KIND_LABEL } from '../systems/lists.js';
import { dailyChallenges, challengeProgress, milestoneState, QUICK_WINS } from '../systems/challenges.js';
import { STICKER_NAMES } from '../systems/surprises.js';
import { shortDate } from '../systems/time.js';
import { svgI, esc } from './icons.js';
import { ART } from './art.js';
import { thumb } from '../world/thumbs.js';

const coin = (n) => `<span class="cost"><i class="ci">${ART.coin}</i>${n}</span>`;
const xpTag = (n) => `<span class="cost xp"><i class="ci">${ART.xp}</i>${n}</span>`;
const sectionChip = (s) => `<span class="schip" style="--c:${SECTIONS[s].color}">${svgI(SECTIONS[s].icon, '#fff', 13, 2.4)}${SECTIONS[s].name}</span>`;
const img = (type) => { const u = thumb(type); return u ? `<img src="${u}" alt="" draggable="false">` : `<span class="noimg">${svgI('home', '#9AA6B2', 30)}</span>`; };

export const BUILD_TABS = [...SECTION_KEYS.map((k) => ({ id: k, label: SECTIONS[k].name })), { id: 'homes', label: 'Homes' }, { id: 'roads', label: 'Roads & Decor' }, { id: 'townhall', label: 'Town Hall' }];

export function buildTabs(active) {
  return BUILD_TABS.map((t) => `<button type="button" class="wtab${t.id === active ? ' on' : ''}" data-tab="${t.id}"${SECTIONS[t.id] ? ` style="--c:${SECTIONS[t.id].color}"` : ''}>${t.label}</button>`).join('');
}

function card(def, state, { note, action = 'pick', locked, lockText, disabled, price } = {}) {
  return `<button type="button" class="bcard${locked ? ' locked' : ''}${disabled ? ' dim' : ''}" data-${action}="${def.id}"${locked ? ' aria-disabled="true"' : ''}>
    <span class="bimg">${img(def.id)}${locked ? `<span class="lock">${svgI('lock', '#fff', 16, 2.6)}${esc(lockText)}</span>` : ''}</span>
    <b>${esc(def.name)}</b>
    <span class="bnote">${note || esc(def.desc)}</span>
    <span class="bprice">${price ?? (def.cost ? coin(def.cost) : '<span class="cost free">Free</span>')}</span></button>`;
}

export function renderBuild(state, tab) {
  const has = (id) => state.buildings.some((b) => b.type === id);
  if (SECTIONS[tab]) {
    const sec = SECTIONS[tab];
    const open = state.lists.some((l) => l.section === tab) || state.buildings.some((b) => byId[b.type].section === tab);
    const mains = tab === 'spiritual' && !state.spiritualStyle ? [byId.church, byId.garden] : [mainBuildingFor(tab, state.spiritualStyle || 'church')];
    const rest = BUILDINGS.filter((b) => b.section === tab && b.tier > 1);
    const cards = [];
    for (const d of mains) {
      if (has(d.id)) cards.push(card(d, state, { note: 'Built · opens your first list', disabled: true, action: 'built', price: '<span class="cost done">Built</span>' }));
      else cards.push(card(d, state, { note: tab === 'spiritual' && !state.spiritualStyle ? (d.id === 'garden' ? 'Open to any faith, or none' : 'For a family of faith') : 'Free when you set your first goal here', price: '<span class="cost free">Set a goal</span>' }));
    }
    for (const d of rest) {
      const built = has(d.id);
      const locked = !built && (state.level < d.level || !open);
      cards.push(card(d, state, { locked, lockText: !open ? 'Open area first' : `Level ${d.level}`, disabled: built || (!locked && state.coins < d.cost), action: built ? 'built' : 'pick', note: built ? 'Built' : `${d.desc} Tasks here pay ${[1, 1.5, 2, 3][d.tier - 1]}×`, price: built ? '<span class="cost done">Built</span>' : undefined }));
    }
    return `<div class="sec-head" style="--c:${sec.color}">${sectionChip(tab)}<span>${esc(sec.blurb)}</span></div><div class="grid">${cards.join('')}</div>
      <p class="foot">${open ? 'Each new building here adds another list, and higher buildings pay more for every task.' : 'Set your first goal in this area to open it. The first building is free.'}</p>`;
  }
  if (tab === 'homes') {
    return `<p class="hint">Homes bring people to town. You need population to level up and to grow the Town Hall.</p><div class="grid">${BUILDINGS.filter((b) => b.kind === 'home').map((d) => card(d, state, { locked: state.level < d.level, lockText: `Level ${d.level}`, disabled: state.coins < d.cost, note: `+${d.pop} people` })).join('')}</div>`;
  }
  if (tab === 'roads') {
    const road = `<button type="button" class="bcard" data-road="1"><span class="bimg road-img">${svgI('road', '#5A6370', 40, 2)}</span><b>Road</b><span class="bnote">Every building needs a road that leads to the Town Hall</span><span class="bprice">${coin(ROAD_COST)}<small>/tile</small></span></button>`;
    return `<div class="grid">${road}${BUILDINGS.filter((b) => b.kind === 'decor').map((d) => card(d, state, { locked: state.level < d.level, lockText: `Level ${d.level}`, disabled: state.coins < d.cost })).join('')}</div><p class="foot">Decorations don't need a road.</p>`;
  }
  if (tab === 'townhall') return renderTownHall(state);
  return '';
}

export function renderTownHall(state) {
  const next = TOWNHALL[state.tcLevel + 1];
  const pop = population(state);
  const bar = (have, need) => `<div class="pbar"><i style="width:${Math.min(100, (have / need) * 100).toFixed(0)}%"></i></div>`;
  const check = canUpgradeTownHall(state);
  return `<div class="th"><span class="bimg bigimg">${img('townhall')}</span><div><b class="ttl">Town Hall · level ${state.tcLevel}</b>
    <p>Every task pays <b>+${(state.tcLevel - 1) * 10}%</b> coins. Level ${state.tcLevel} lets your town reach player level ${state.tcLevel * 4}.</p></div></div>
    ${next ? `<div class="card2"><b>Upgrade to level ${next.level}</b>
      <div class="req"><span class="ri">${ART.people}</span><span>Population ${Math.min(pop, next.pop)} of ${next.pop}</span></div>${bar(pop, next.pop)}
      <div class="req"><span class="ri">${ART.coin}</span><span>Coins ${Math.min(state.coins, next.coins)} of ${next.coins}</span></div>${bar(state.coins, next.coins)}
      <p class="hint">Unlocks: +10% coins on every task, and levels ${next.level * 4 - 3}–${next.level * 4}.</p>
      <button type="button" class="btn go-btn" data-thup="1"${check.ok ? '' : ' disabled'}>${check.ok ? `Upgrade for ${next.coins} coins` : check.reason === 'pop' ? 'Build more homes first' : 'Save up more coins'}</button></div>` : '<p class="hint">Your Town Hall is fully upgraded.</p>'}`;
}

/* ---------- One building's list ---------- */
export function renderListCard(state, list, day, { compact = false } = {}) {
  const b = state.buildings.find((x) => x.id === list.buildingId);
  const def = byId[b.type];
  const r = taskReward(list.tier, state.tcLevel);
  const rows = list.tasks.map((t) => {
    const avail = isAvailable(t, day);
    return `<div class="task${avail ? '' : ' done'}"><button type="button" class="check" data-done="${list.id}:${t.id}"${avail ? '' : ' disabled'} aria-label="${avail ? 'Check off' : 'Done'} ${esc(t.title)}">${avail ? '' : svgI('check', '#fff', 18, 3)}</button>
      <span class="tx"><b>${esc(t.title)}</b><small>${progressLabel(t, day)}</small></span>${avail ? `<span class="rw">+${r.coins}<i class="ci">${ART.coin}</i></span>` : ''}</div>`;
  }).join('');
  const g = goalReward(list.tier);
  return `<div class="listcard" style="--c:${SECTIONS[list.section].color}">
    <div class="lhead">${compact ? `<span class="limg">${img(b.type)}</span>` : ''}<div><span class="lname">${esc(def.name)}</span>
    <b class="goal">${list.goal ? esc(list.goal) : '<span class="muted">No big goal right now</span>'}</b></div></div>
    ${rows || '<p class="hint">No tasks yet.</p>'}
    <div class="lbtns">${list.goal ? `<button type="button" class="btn go-btn small" data-goaldone="${list.id}">Goal reached! +${g.coins}</button>` : `<button type="button" class="btn go-btn small" data-editlist="${list.id}">Set a new goal</button>`}
    <button type="button" class="btn soft small" data-editlist="${list.id}">${svgI('edit', 'currentColor', 14)} Edit</button></div>
    ${list.achieved.length ? `<small class="ach">Reached: ${list.achieved.slice(-3).map((a) => `${esc(a.goal)} (${shortDate(a.on)})`).join(' · ')}</small>` : ''}</div>`;
}

export function renderLists(state, day, filterDue) {
  const lists = state.lists.filter((l) => !filterDue || dueCount(l, day) > 0);
  if (!state.lists.length) return '<p class="hint">No lists yet. Tap Build, pick an area, and set your first goal.</p>';
  if (!lists.length) return '<div class="empty">' + svgI('check', '#3E8E57', 34, 3) + '<b>Everything due today is done.</b><p class="hint">Come back tomorrow, or set a new goal in any area.</p></div>';
  return SECTION_KEYS.map((s) => {
    const ls = lists.filter((l) => l.section === s);
    if (!ls.length) return '';
    return `<div class="sgroup">${sectionChip(s)}${ls.map((l) => renderListCard(state, l, day, { compact: true })).join('')}</div>`;
  }).join('');
}

export function renderBuilding(state, b, day) {
  const def = byId[b.type];
  const actions = [];
  let body = '';
  if (def.kind === 'section') {
    const list = listFor(state, b.id);
    body = list ? renderListCard(state, list, day) : `<div class="card2"><b>No list here yet</b><p class="hint">Give this building a goal and a few tasks. Tasks here pay ${taskReward(def.tier, state.tcLevel).coins} coins each.</p><button type="button" class="btn go-btn" data-newlist="${b.id}">Add a list</button></div>`;
  } else if (def.kind === 'home') {
    const lv = b.level || 1;
    body = `<div class="th"><span class="bimg bigimg">${img(b.type)}</span><div><b class="ttl">${esc(def.name)} · level ${lv}</b><p>${homePop(b.type, lv)} people live here.</p></div></div>`;
    if (lv < MAX_HOME_LEVEL) actions.push(`<button type="button" class="btn go-btn" data-upgrade="${b.id}"${state.coins < homeUpgradeCost(b.type, lv) ? ' disabled' : ''}>Upgrade · ${coin(homeUpgradeCost(b.type, lv))} → +${homePop(b.type, lv + 1) - homePop(b.type, lv)} people</button>`);
    else body += '<p class="hint">Fully upgraded.</p>';
  } else if (def.kind === 'civic') {
    body = renderTownHall(state);
  } else {
    body = `<div class="th"><span class="bimg bigimg">${img(b.type)}</span><div><b class="ttl">${esc(def.name)}</b><p>Just for looks.</p></div></div>`;
    actions.push(`<button type="button" class="btn soft" data-remove="${b.id}">Remove</button>`);
  }
  if (def.kind !== 'civic') actions.push(`<button type="button" class="btn soft" data-move="${b.id}">${svgI('move', 'currentColor', 14)} Move</button>`);
  const story = b.type === 'townhall' ? `Built ${shortDate(b.builtOn)}: ${b.story}.` : `Built ${shortDate(b.builtOn)}${b.story ? `: ${esc(b.story)}` : ''}.`;
  return `${body}<p class="story">${story}</p><div class="actions">${actions.join('')}</div>`;
}

/* ---------- Goal + tasks form ---------- */
export function renderGoalForm(draft) {
  const sec = SECTIONS[draft.section];
  return `<div class="sec-head" style="--c:${sec.color}">${sectionChip(draft.section)}<span>${esc(draft.intro)}</span></div>
    <label class="q" for="gfGoal">Your big goal</label>
    <input class="field" id="gfGoal" maxlength="60" value="${esc(draft.goal)}" autocomplete="off" placeholder="${esc(draft.placeholder || '')}">
    <label class="q">Small tasks that move it forward <small>(up to ${MAX_TASKS})</small></label>
    ${draft.tasks.map((t, i) => `<div class="trow"><input class="field" data-tt="${i}" maxlength="50" value="${esc(t.title)}" placeholder="Task ${i + 1}" autocomplete="off">
      <div class="seg kind">${Object.entries(KIND_LABEL).map(([k, l]) => `<button type="button" data-kind="${i}:${k}" aria-pressed="${t.kind === k}">${k === 'weekly' ? `${t.per}× a week` : l}</button>`).join('')}</div>
      ${t.kind === 'weekly' ? `<div class="stepper"><button type="button" data-per="${i}:-1" aria-label="Fewer">−</button><button type="button" data-per="${i}:1" aria-label="More">+</button></div>` : ''}</div>`).join('')}
    ${draft.tasks.length < MAX_TASKS ? '<button type="button" class="btn link" data-addtask="1">+ Add another task</button>' : ''}
    <div class="actions"><button type="button" class="btn go-btn" data-savegoal="1">${esc(draft.saveLabel)}</button></div>`;
}

/* ---------- Trophy: challenges, milestones, stickers ---------- */
export function renderTrophy(state, day, tab) {
  const tabs = [['today', "Today's challenges"], ['milestones', 'Milestones'], ['stickers', 'Sticker book']];
  const head = `<div class="seg wide">${tabs.map(([k, l]) => `<button type="button" data-ttab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
  if (tab === 'milestones') {
    const ms = milestoneState(state).sort((a, b) => (b.ready - a.ready) || (a.claimed - b.claimed));
    return head + ms.map((m) => `<div class="card2 ch${m.claimed ? ' claimed' : ''}"><div class="row"><b>${esc(m.text)}</b><span class="rws">${xpTag(m.xp)}${m.coins ? coin(m.coins) : ''}</span></div><div class="pbar"><i style="width:${((m.now / m.at) * 100).toFixed(0)}%"></i></div>
      <div class="row"><small>${m.now} of ${m.at}</small>${m.claimed ? '<small class="ok">Claimed</small>' : `<button type="button" class="btn go-btn small" data-claimm="${m.id}"${m.ready ? '' : ' disabled'}>Claim</button>`}</div></div>`).join('');
  }
  if (tab === 'stickers') {
    const em = { balloon: '🎈', birds: '🐦', fireworks: '🎆', pets: '🐾' };
    return head + `<div class="stickers">${Object.entries(STICKER_NAMES).map(([k, n]) => `<div class="sticker${state.stickers.includes(k) ? ' got' : ''}"><span class="em">${em[k]}</span>${state.stickers.includes(k) ? n : 'Keep watching'}</div>`).join('')}</div><p class="foot">Surprises are just for fun. Tap them when you see them.</p>`;
  }
  const items = dailyChallenges(state, day);
  return head + items.map((c) => { const p = challengeProgress(state, c, day); return `<div class="card2 ch${c.claimed ? ' claimed' : ''}"><div class="row"><b>${esc(c.text)}</b><span class="rws">${xpTag(c.xp)}${c.coins ? coin(c.coins) : ''}</span></div><div class="pbar"><i style="width:${((p / c.need) * 100).toFixed(0)}%"></i></div>
    <div class="row"><small>${p} of ${c.need}</small>${c.claimed ? '<small class="ok">Claimed</small>' : `<button type="button" class="btn go-btn small" data-claimc="${c.id}"${p >= c.need ? '' : ' disabled'}>Claim</button>`}</div></div>`; }).join('') + '<p class="foot">New challenges every morning.</p>';
}

export function renderWins(state) {
  const done = QUICK_WINS.filter((q) => state.quickWins[q.id] === 'claimed').length;
  return `<p class="hint">Small first steps, each with a reward. ${done} of ${QUICK_WINS.length} done.</p>` + QUICK_WINS.map((q) => { const d = state.quickWins[q.id] === 'claimed'; return `<div class="win-row${d ? ' done' : ''}"><span class="wc">${d ? svgI('check', '#fff', 16, 3) : ''}</span><b>${esc(q.text)}</b><span class="rws">${coin(q.coins)}${xpTag(q.xp)}</span></div>`; }).join('');
}

export function renderLevelInfo(state) {
  const need = levelNeed(state.level);
  const pop = population(state);
  const nextUnlocks = unlockedAt(state.level + 1);
  return `<div class="th"><span class="bimg bigimg lvl-big">${ART.xp}<b>${state.level}</b></span><div><b class="ttl">Level ${state.level}</b><p>To reach level ${state.level + 1}:</p></div></div>
    <div class="req"><span class="ri">${ART.xp}</span><span>XP ${Math.min(state.xp, need.xp)} of ${need.xp}</span></div><div class="pbar"><i style="width:${Math.min(100, (state.xp / need.xp) * 100).toFixed(0)}%"></i></div>
    <div class="req"><span class="ri">${ART.people}</span><span>Population ${Math.min(pop, need.pop)} of ${need.pop}</span></div><div class="pbar"><i style="width:${need.pop ? Math.min(100, (pop / need.pop) * 100).toFixed(0) : 100}%"></i></div>
    ${need.tc > state.tcLevel ? `<p class="hint">Also needs the Town Hall at level ${need.tc}.</p>` : ''}
    <p class="hint">XP comes from checking off tasks, daily challenges, milestones and quick wins. Population comes from homes.</p>
    ${nextUnlocks.length ? `<b class="h3">Coming at level ${state.level + 1}</b><div class="unlocks">${nextUnlocks.map((d) => `<span class="un">${img(d.id)}<small>${esc(d.name)}</small></span>`).join('')}</div>` : ''}`;
}

export function renderLevelUp(level) {
  const items = unlockedAt(level);
  return `<div class="lvlup"><span class="burst">${ART.xp}<b>${level}</b></span><b class="ttl">Level ${level}!</b>
    ${items.length ? `<p>New to build:</p><div class="unlocks">${items.map((d) => `<span class="un">${img(d.id)}<small>${esc(d.name)}</small></span>`).join('')}</div>` : '<p>Your town is growing.</p>'}
    <button type="button" class="btn go-btn" data-close="1">Keep building</button></div>`;
}
