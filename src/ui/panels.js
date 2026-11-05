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
      <span class="tx"><b>${esc(t.title)}</b><small>${progressLabel(t, day)}</small></span>${avail ? `<span class="rw">+${r.coins}<i class="ci">${ART.coin}</i></span>` : t.done.includes(day) ? `<button type="button" class="btn soft small memo" data-memo="${list.id}:${t.id}" aria-label="Add a photo or recap">${svgI('camera', 'currentColor', 16)}<span>Recap</span></button>` : ''}</div>`;
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

/* ---------- Store landing: category tiles ---------- */
export const STORE = [
  { id: 'spiritual', label: 'Spiritual', rep: (s) => (s.spiritualStyle === 'garden' ? 'garden' : 'church') },
  { id: 'physical', label: 'Physical', rep: () => 'gym' },
  { id: 'financial', label: 'Financial', rep: () => 'bank' },
  { id: 'relational', label: 'Relational', rep: () => 'park' },
  { id: 'todo', label: 'To-Do', rep: () => 'jobboard' },
  { id: 'homes', label: 'Housing', rep: () => 'house' },
  { id: 'roads', label: 'Decor & Roads', rep: () => 'fountain' },
  { id: 'townhall', label: 'Town Hall', rep: () => 'townhall' }
];
/* How many things in a category are ready right now (unlocked, not built, affordable). */
export function readyCount(state, cat) {
  const built = (id) => state.buildings.some((b) => b.type === id);
  if (SECTIONS[cat]) {
    const open = state.lists.some((l) => l.section === cat);
    if (!open) return 1;
    return BUILDINGS.filter((b) => b.section === cat && b.tier > 1 && !built(b.id) && state.level >= b.level && state.coins >= b.cost).length;
  }
  if (cat === 'homes') return BUILDINGS.filter((b) => b.kind === 'home' && state.level >= b.level && state.coins >= b.cost).length ? 1 : 0;
  if (cat === 'townhall') return canUpgradeTownHall(state).ok ? 1 : 0;
  return 0;
}
export function renderStore(state) {
  return `<div class="store">${STORE.map((c) => { const n = readyCount(state, c.id); return `<button type="button" class="stile" data-cat="${c.id}"${SECTIONS[c.id] ? ` style="--c:${SECTIONS[c.id].color}"` : ''}>
    <span class="stitle">${esc(c.label)}</span><span class="sart">${img(c.rep(state))}</span>${n ? `<span class="badge">${SECTIONS[c.id] && !state.lists.some((l) => l.section === c.id) ? 'New' : n}</span>` : ''}</button>`; }).join('')}</div>`;
}

/* ---------- Available tasks (quick wins + daily challenges, given by characters) ---------- */
const WIN_ICON = { goal: 'board', place: 'home', task: 'check', home: 'home', road: 'road', area2: 'plus', memory: 'camera', outing: 'calendar', level3: 'up' };
export function requestItems(state, day) {
  const items = [];
  const open = new Set(state.lists.map((l) => l.section)).size;
  for (const q of QUICK_WINS) {
    if (state.quickWins[q.id] === 'claimed') continue;
    const [have, need] = q.id === 'level3' ? [Math.min(3, state.level), 3] : q.id === 'area2' ? [Math.min(2, open), 2] : [state.quickWins[q.id] ? 1 : 0, 1];
    items.push({ who: 'rosie', kind: 'win', id: q.id, text: q.text, have, need, coins: q.coins, xp: q.xp, icon: WIN_ICON[q.id] });
    if (items.length === 2) break;
  }
  for (const c of dailyChallenges(state, day)) {
    if (c.claimed) continue;
    items.push({ who: 'joe', kind: 'challenge', id: c.id, text: c.text, have: challengeProgress(state, c, day), need: c.need, coins: c.coins, xp: c.xp, icon: c.track === 'builds' ? 'home' : 'check' });
  }
  return items.slice(0, 3);
}
export function renderRequests(state, day) {
  const items = requestItems(state, day);
  if (!items.length) return `<div class="req-empty">${ART.joe}<div class="bubble-card"><b>All caught up!</b><p class="hint">New challenges arrive every morning.</p></div></div>`;
  return `<div class="requests">${items.map((r) => {
    const ready = r.have >= r.need;
    return `<div class="reqcol"><div class="bubble-card">
      <div class="rq-top"><span class="rq-icon">${svgI(r.icon, '#2F86D8', 30, 2.4)}</span><div class="rq-bar"><div class="pbar"><i style="width:${((r.have / r.need) * 100).toFixed(0)}%"></i><em>${r.have}/${r.need}</em></div><span class="rq-gift">${ART.gift}</span></div></div>
      <b class="rq-title">${esc(r.text)}</b>
      <span class="rws">${coin(r.coins)}${xpTag(r.xp)}</span>
      ${ready && r.kind === 'challenge' ? `<button type="button" class="btn go-btn" data-claimc="${r.id}">Claim</button>` : `<button type="button" class="btn blue-btn" data-go="${r.kind}:${r.id}">Go</button>`}
      <small class="rq-from">${r.kind === 'win' ? 'Quick win from Rosie' : 'Daily challenge from Grandpa Joe'}</small></div>
      <span class="rq-char">${ART[r.who]}</span></div>`;
  }).join('')}</div>`;
}

/* ---------- Profile: player info + achievements ---------- */
export function renderProfile(state, day, tab, streakNow, editing) {
  const pop = population(state);
  const first = state.family[0];
  const initial = (state.cityName || 'L').trim()[0].toUpperCase();
  const d = new Date(state.startDate + 'T00:00');
  const stat = (icon, label, value) => `<div class="stat"><span class="st-ic">${icon}</span><b>${label}</b><span class="st-v">${value}</span></div>`;
  const side = `<div class="pside"><span class="avatar" style="--c:${first ? first.color : '#3F8FE0'}">${esc(initial)}</span>
    ${editing ? `<input class="field" id="cityNameIn" maxlength="32" value="${esc(state.cityName)}"><button type="button" class="btn go-btn small" data-pf="save">Save</button>` : `<b class="pname">${esc(state.cityName)}</b><span class="since">${svgI('clock', '#8A5A30', 15)} ${d.getMonth() + 1}/${d.getFullYear()}</span>
    <span class="fam">${state.family.map((m) => `<i style="background:${m.color}" title="${esc(m.name)}">${esc(m.name[0])}</i>`).join('')}</span>
    <button type="button" class="btn go-btn small" data-pf="edit">${svgI('edit', '#fff', 15)} Edit</button>`}</div>`;
  const tabs = `<div class="seg wide">${[['info', 'Player info'], ['achievements', 'Achievements'], ['stickers', 'Sticker book']].map(([k, l]) => `<button type="button" data-ptab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
  let body;
  if (tab === 'achievements') {
    body = `<div class="ach-grid">${milestoneState(state).map((m) => `<div class="ach${m.claimed ? ' got' : m.ready ? ' ready' : ''}"><span class="ach-ic">${m.claimed || m.ready ? ART.trophy : `${ART.trophy}<i class="lk">${svgI('lock', '#fff', 12, 3)}</i>`}</span>
      <b>${esc(m.text)}</b><div class="pbar"><i style="width:${((m.now / m.at) * 100).toFixed(0)}%"></i><em>${m.now}/${m.at}</em></div>
      ${m.ready ? `<button type="button" class="btn go-btn small" data-claimm="${m.id}">Claim ${m.xp} XP</button>` : m.claimed ? '<small class="ok">Earned</small>' : ''}</div>`).join('')}</div>`;
  } else if (tab === 'stickers') {
    const em = { balloon: '🎈', birds: '🐦', fireworks: '🎆', pets: '🐾' };
    body = `<div class="stickers">${Object.entries(STICKER_NAMES).map(([k, n]) => `<div class="sticker${state.stickers.includes(k) ? ' got' : ''}"><span class="em">${em[k]}</span>${state.stickers.includes(k) ? n : 'Keep watching'}</div>`).join('')}</div><p class="foot">Surprises are just for fun. Tap them when you see them.</p>`;
  } else {
    const areas = new Set(state.lists.map((l) => l.section)).size;
    body = `<div class="lv-row"><span class="lv-star">${ART.xp}<b>${state.level}</b></span><b>Town level</b></div>
      <div class="stats">${stat(svgI('check', '#3E8E57', 28, 3), 'Tasks done', state.stats.tasksDone || 0)}${stat(ART.trophy, 'Big goals reached', state.stats.goalsDone || 0)}${stat(svgI('clock', '#D9774A', 28, 2.6), 'Day streak', streakNow)}
      ${stat(ART.people, 'Population', pop)}${stat(svgI('home', '#3F8FE0', 28, 2.4), 'Areas open', `${areas} of 5`)}${stat(ART.coin, 'Coins earned', (state.stats.coinsEarned || 0).toLocaleString('en-US'))}</div>`;
  }
  return `<div class="profile">${side}<div class="pmain">${tabs}${body}</div></div>`;
}
