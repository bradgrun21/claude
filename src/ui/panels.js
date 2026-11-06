import { SECTIONS, SECTION_KEYS, BUILDINGS, byId, mainBuildingFor, ROAD_COST, MAX_HOME_LEVEL, homePop, homeUpgradeCost } from '../data/catalog.js';
import { levelNeed, population, TOWNHALL, taskReward, goalReward, canUpgradeTownHall, unlockedAt } from '../systems/economy.js';
import { isAvailable, isLive, isPaused, progressLabel, listFor, dueCount, freqCode, freqLabel, useDays, useLevel, USE_LEVELS, MAX_TASKS, targetLabel } from '../systems/lists.js';
import { sectionUnlocked, unlockHint, unlockShort } from '../systems/progression.js';
import { IDEAS } from '../data/ideas.js';
import { toolForBuilding } from '../systems/tools.js';
import { EARNED, earnedProgress, isEarned } from '../systems/earned.js';
import { bizCost, bizSlots, bizCount, RESIDENTS_PER_SHOP, canBuildMonument } from '../systems/business.js';
import { renderDistrictStore } from './district.js';
import { DISTRICT, catActive, districtForBuilding } from '../systems/district.js';
import { dailyChallenges, challengeProgress, milestoneState, QUICK_WINS } from '../systems/challenges.js';
import { STICKER_NAMES } from '../systems/surprises.js';
import { shortDate } from '../systems/time.js';
import { svgI, esc } from './icons.js';
import { ART } from './art.js';
import { thumb } from '../world/thumbs.js';

const shopCard = (state, d, bank) => { const dd = districtForBuilding(d.id); const free = !!(dd && bank && catActive(state, dd.cat)); return card(d, state, { locked: (d.needsBank && !bank) || (!free && state.level < d.level), lockText: d.needsBank && !bank ? 'Build the Bank first' : `Level ${d.level}`, disabled: !free && state.coins < d.cost, note: toolNote(d), price: free ? '<span class="cost free">Free with your budget</span>' : undefined }); };
const toolNote = (d) => { const t = toolForBuilding(d.id); return t ? `${t.emoji} Opens the ${t.name}` : ''; };
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
    const areaLocked = !sectionUnlocked(state, tab);
    for (const d of mains) {
      if (has(d.id)) cards.push(card(d, state, { note: 'Built · holds your first list', disabled: true, action: 'built', price: '<span class="cost done">Built</span>' }));
      else cards.push(card(d, state, { locked: areaLocked, lockText: unlockHint(state, tab), note: tab === 'spiritual' && !state.spiritualStyle ? (d.id === 'garden' ? 'Open to any faith, or none' : 'For a family of faith') : 'Free. Add your first task or goal', price: areaLocked ? '<span class="cost done">Coming soon</span>' : '<span class="cost free">Start here</span>' }));
    }
    for (const d of rest) {
      const built = has(d.id);
      const moneyLocked = d.money && (state.budget?.level || 1) < d.money;
      const locked = !built && (state.level < d.level || !open || moneyLocked);
      cards.push(card(d, state, { locked, lockText: !open ? 'Open area first' : moneyLocked ? `Money level ${d.money}` : `Level ${d.level}`, disabled: built || (!locked && state.coins < d.cost), action: built ? 'built' : 'pick', note: built ? 'Built' : `${toolNote(d) ? `${toolNote(d)}. ` : d.desc} Tasks here pay ${[1, 1.5, 2, 3][d.tier - 1]}×`, price: built ? '<span class="cost done">Built</span>' : undefined }));
    }
    if (tab === 'financial') for (const d of BUILDINGS.filter((b) => b.kind === 'finance')) {
      const built = has(d.id);
      const locked = !built && (state.level < d.level || !has('bank') || (d.id === 'monument' && !canBuildMonument(state)));
      cards.push(card(d, state, { locked, lockText: !has('bank') ? 'Build the Bank first' : state.level < d.level ? `Level ${d.level}` : 'Add a debt at the Bank', disabled: built, action: built ? 'built' : 'pick', note: built ? 'Built' : d.desc, price: built ? '<span class="cost done">Built</span>' : '<span class="cost free">Free</span>' }));
    }
    return `<div class="sec-head" style="--c:${sec.color}">${sectionChip(tab)}<span>${esc(sec.blurb)}</span></div><div class="grid">${cards.join('')}</div>
      <p class="foot">${open ? 'Each new building here adds another list, and higher buildings pay more for every task.' : sectionUnlocked(state, tab) ? 'Add your first task or goal to open this area. The first building is free.' : `${unlockHint(state, tab)}. Areas open one at a time so it never feels like too much.`}</p>`;
  }
  if (tab === 'district') return renderDistrictStore(state);
  if (tab === 'biz') {
    const n = bizCount(state), slots = bizSlots(state), full = n >= slots;
    return `<div class="sec-head"><span>Shops earn coins on their own, every day. ${n} of ${slots} shops · every ${RESIDENTS_PER_SHOP} residents support one more. ${full ? `<b>Build homes to open another shop.</b>` : ''}</span></div>
      <div class="grid">${BUILDINGS.filter((b) => b.kind === 'biz').map((d) => { const c = bizCost(state, d.id); const lvl = state.level < d.level; return card(d, state, { locked: lvl || full, lockText: lvl ? `Level ${d.level}` : `${n * RESIDENTS_PER_SHOP} people`, disabled: state.coins < c, note: `+${d.income} coins a day${has(d.id) ? ' · build another' : ''}`, price: coin(c) }); }).join('')}</div>
      <p class="foot">Shops pay coins, not XP. A second copy of the same shop costs 50% more.</p>`;
  }
  if (tab === 'shops') {
    const bank = has('bank');
    return `<p class="hint">Shops and services open handy tools: a meal planner, car and home care, subscriptions, and a Kids’ Corner. On payday, money trucks deliver to the shops too.</p><div class="grid">${BUILDINGS.filter((b) => b.kind === 'shop').map((d) => has(d.id) ? card(d, state, { disabled: true, action: 'built', note: 'Built', price: '<span class="cost done">Built</span>' }) : shopCard(state, d, bank)).join('')}</div>`;
  }
  if (tab === 'homes') {
    return `<p class="hint">Homes bring people to town. You need population to level up and to grow the Town Hall.</p><div class="grid">${BUILDINGS.filter((b) => b.kind === 'home').map((d) => card(d, state, { locked: state.level < d.level, lockText: `Level ${d.level}`, disabled: state.coins < d.cost, note: `+${d.pop} people` })).join('')}</div>`;
  }
  if (tab === 'roads') {
    const road = `<button type="button" class="bcard" data-road="1"><span class="bimg road-img">${svgI('road', '#5A6370', 40, 2)}</span><b>Road</b><span class="bnote">Every building needs a road that leads to the Town Hall</span><span class="bprice">${coin(ROAD_COST)}<small>/tile</small></span></button>`;
    return `<div class="grid">${road}${BUILDINGS.filter((b) => b.kind === 'decor' && !b.earned).map((d) => card(d, state, { locked: state.level < d.level, lockText: `Level ${d.level}`, disabled: state.coins < d.cost })).join('')}</div><p class="foot">Decorations don't need a road.</p><div class="h3">Earned by steady use</div>${renderEarnedGrid(state)}`;
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

/* ---------- One building's list: tasks + goals (with steps) ---------- */
const FREQS = [['daily', 'Daily'], ['w1', '1×/wk'], ['w2', '2×/wk'], ['w3', '3×/wk'], ['w4', '4×/wk'], ['w5', '5×/wk'], ['w6', '6×/wk'], ['once', 'Once']];
export const freqSelect = (attr, code) => `<select class="freq" ${attr} aria-label="How often">${FREQS.map(([v, l]) => `<option value="${v}"${code === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
/* A family member's little color dot with their initial (or nothing for "everyone"). */
export const whoDot = (family, name) => { const m = name && family.find((x) => x.name === name); return m ? `<span class="who" style="--c:${m.color}" title="${esc(m.name)}">${esc(m.name.trim()[0].toUpperCase())}</span>` : ''; };
const people = (state) => state.family.filter((m) => m.kind !== 'pet');
function taskRow(state, list, t, day, r) {
  const paused = isPaused(list, t);
  const avail = !paused && isAvailable(t, day, list);
  const prog = paused ? 'Resting' : progressLabel(t, day);
  return `<div class="task${avail ? '' : paused ? ' paused' : ' done'}${t.goalId ? ' sub' : ''}"><button type="button" class="check" data-done="${list.id}:${t.id}"${avail ? '' : ' disabled'} aria-label="${avail ? 'Check off' : paused ? 'Resting' : 'Done'} ${esc(t.title)}">${avail ? '' : paused ? svgI('moon', '#8A7A62', 16, 2.4) : svgI('check', '#fff', 18, 3)}</button>
    <button type="button" class="tx" data-tedit="${list.id}:${t.id}"><b>${esc(t.title)}</b>${prog ? `<small>${prog}</small>` : ''}</button>
    ${!avail && !paused && t.done.includes(day) ? `<button type="button" class="btn soft small memo" data-memo="${list.id}:${t.id}" aria-label="Add a photo or recap">${svgI('camera', 'currentColor', 15)}</button>` : ''}
    ${whoDot(people(state), t.who)}<span class="fpill">${freqLabel(t)}</span>${avail ? `<span class="rw">+${r.coins}<i class="ci">${ART.coin}</i></span>` : ''}</div>`;
}
export function renderListCard(state, list, day, { compact = false } = {}) {
  const b = state.buildings.find((x) => x.id === list.buildingId);
  const def = byId[b.type];
  const r = taskReward(list.tier, state.tcLevel);
  const lv = useLevel(list), used = useDays(list);
  const loose = list.tasks.filter((t) => !t.goalId);
  const goals = list.goals.filter((g) => !g.achievedOn);
  const g = goalReward(list.tier);
  const nextAt = USE_LEVELS[lv];
  return `<div class="listcard" style="--c:${SECTIONS[list.section].color}">
    <div class="lhead">${compact ? `<span class="limg">${img(b.type)}</span>` : ''}<div class="lt"><span class="lname">${esc(def.name)}</span><small>${lv > 1 ? `Grown to level ${lv} · ` : ''}${used} ${used === 1 ? 'day' : 'days'} of use${nextAt ? ` · grows at ${nextAt}` : ''}</small></div>
    <div class="ladd"><button type="button" class="btn soft small" data-addt="${list.id}">+ Task</button><button type="button" class="btn soft small" data-addg="${list.id}">+ Goal</button><button type="button" class="btn soft small idea" data-ideas="${list.section}:${list.id}" aria-label="Ideas">💡</button></div></div>
    ${loose.map((t) => taskRow(state, list, t, day, r)).join('')}
    ${list.paused ? `<div class="rest-note">${svgI('moon', '#6E4520', 16, 2.4)}<span>Resting${list.pausedOn ? ` since ${shortDate(list.pausedOn)}` : ''}. Nothing here is due, and your progress is safe.</span><button type="button" class="btn go-btn small" data-lpause="${list.id}:0">Resume</button></div>` : ''}
    ${goals.map((gl) => `<div class="goalblk${gl.paused ? ' paused' : ''}"><div class="ghead"><span class="gico">🎯</span><button type="button" class="gtx" data-gedit="${list.id}:${gl.id}"><b>${esc(gl.title)}</b>${gl.paused ? '<small>Resting</small>' : gl.target ? `<small>By ${shortDate(gl.target)} · ${targetLabel(gl, day)}</small>` : ''}</button><button type="button" class="btn go-btn small" data-gdone="${list.id}:${gl.id}">Completed the goal?</button></div>
      ${list.tasks.filter((t) => t.goalId === gl.id).map((t) => taskRow(state, list, t, day, r)).join('')}
      <button type="button" class="btn link small" data-addsub="${list.id}:${gl.id}">+ Add a step</button></div>`).join('')}
    ${!loose.length && !goals.length ? '<p class="hint">Nothing here yet. Add a task or a goal, or tap 💡 for easy ideas.</p>' : ''}
    ${!list.paused && (loose.length || goals.length) ? `<button type="button" class="btn link small rest-link" data-lpause="${list.id}:1">${svgI('moon', 'currentColor', 13, 2.4)} Rest this list for a while</button>` : ''}
    ${list.achieved.length ? `<small class="lach">🏆 ${list.achieved.slice(-3).map((a) => `${esc(a.goal)} (${shortDate(a.on)})`).join(' · ')}</small>` : ''}</div>`;
}

export function renderLists(state, day, filterDue) {
  const lists = state.lists.filter((l) => !filterDue || dueCount(l, day) > 0);
  if (!state.lists.length) return '<p class="hint">No lists yet. Tap Build, pick an area, and add your first task.</p>';
  if (!lists.length) return '<div class="empty">' + svgI('check', '#3E8E57', 34, 3) + '<b>Everything due today is done.</b><p class="hint">Come back tomorrow. Rest is part of the plan too.</p></div>';
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
    body = list ? renderListCard(state, list, day) : `<div class="card2"><b>Nothing here yet</b><p class="hint">Add a task or a goal. Tasks here pay ${taskReward(def.tier, state.tcLevel).coins} coins each.</p><button type="button" class="btn go-btn" data-newlist="${b.id}">Add a task or goal</button></div>`;
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

/* ---------- Builder: add tasks or a goal (with optional steps) ---------- */
export function renderBuilder(d) {
  const sec = SECTIONS[d.section];
  const fam = d.family || [];
  const whoBtn = (t, i) => (fam.length ? `<button type="button" class="whob" data-tw="${i}" aria-label="Who does it: ${esc(t.who || 'Everyone')}">${t.who ? whoDot(fam, t.who) : `<span class="who all">${svgI('friends', 'currentColor', 14, 2.4)}</span>`}</button>` : '');
  const rows = d.tasks.map((t, i) => `<div class="trow2"><input class="field" data-tt="${i}" maxlength="60" value="${esc(t.title)}" placeholder="${d.kind === 'goal' ? `Step ${i + 1} (optional)` : i ? 'Another task' : 'Like “Do the dishes”'}" autocomplete="off">${whoBtn(t, i)}${freqSelect(`data-tf="${i}"`, t.freq)}${d.tasks.length > 1 ? `<button type="button" class="trm" data-trm="${i}" aria-label="Remove">–</button>` : ''}</div>`).join('');
  return `<div class="sec-head" style="--c:${sec.color}">${sectionChip(d.section)}<span>${esc(d.intro)}</span></div>
    ${d.lockKind ? '' : `<div class="seg wide"><button type="button" data-bkind="task" aria-pressed="${d.kind === 'task'}">+ Task</button><button type="button" data-bkind="goal" aria-pressed="${d.kind === 'goal'}">+ Goal</button></div>`}
    ${d.kind === 'goal' ? `<label class="q" for="gfGoal">Goal <small>(something bigger, like “Run a 5K” or “Host friends for dinner”)</small></label><input class="field" id="gfGoal" maxlength="60" value="${esc(d.goal)}" autocomplete="off"><label class="q" for="gfTarget">Target date <small>(optional, no pressure)</small></label><input class="field date" type="date" id="gfTarget" value="${esc(d.target || '')}"><label class="q">Steps <small>(optional. Each one can be daily, a few times a week, or once)</small></label>` : '<label class="q">Tasks <small>(simple things, like chores or habits)</small></label>'}
    ${rows}
    ${fam.length ? '<p class="foot">Tap the circle on a row to pick who does it. Everyone is the default.</p>' : ''}
    <div class="brow">${d.tasks.length < MAX_TASKS ? `<button type="button" class="btn link" data-addtask="1">+ Add another</button>` : ''}<button type="button" class="btn soft small" data-ideas="${d.section}:draft">💡 Ideas</button></div>
    <div class="actions"><button type="button" class="btn go-btn" data-savegoal="1">${esc(d.saveLabel)}</button></div>`;
}

export function renderTaskEdit(state, list, t, e) {
  const fam = people(state);
  return `<label class="q" for="teTitle">Task</label><input class="field" id="teTitle" maxlength="60" value="${esc(e.title)}" autocomplete="off">
    <div class="te-row"><div><label class="q">How often</label>${freqSelect('id="teFreq"', e.freq)}</div>
    ${fam.length ? `<div><label class="q">Who does it</label><div class="chips-row"><button type="button" class="pickchip${e.who ? '' : ' on'}" data-twho="">Everyone</button>${fam.map((m) => `<button type="button" class="pickchip${e.who === m.name ? ' on' : ''}" style="--c:${m.color}" data-twho="${esc(m.name)}">${esc(m.name)}</button>`).join('')}</div></div>` : ''}</div>
    <div class="actions"><button type="button" class="btn go-btn" data-tsave="${list.id}:${t.id}">Save</button><button type="button" class="btn soft" data-tpause="${list.id}:${t.id}">${t.paused ? 'Resume' : `${svgI('moon', 'currentColor', 14, 2.4)} Pause`}</button><button type="button" class="btn soft" data-tdel="${list.id}:${t.id}">Remove</button></div>
    <p class="foot">${t.paused ? 'This task is resting. It won’t show as due until you resume it.' : 'Pause it for a busy season, nothing is lost. Removing a task never takes away progress you’ve already made.'}</p>`;
}

export function renderGoalEdit(list, g, e, day) {
  const steps = list.tasks.filter((t) => t.goalId === g.id).length;
  return `<label class="q" for="geTitle">Goal</label><input class="field" id="geTitle" maxlength="60" value="${esc(e.title)}" autocomplete="off">
    <label class="q" for="geTarget">Target date <small>(optional)</small></label><div class="te-row"><input class="field date" type="date" id="geTarget" value="${esc(e.target || '')}">${e.target ? '<button type="button" class="btn link small" data-gclear="1">Clear date</button>' : ''}</div>
    ${g.target ? `<p class="hint">${targetLabel(g, day)}.</p>` : ''}
    <div class="actions"><button type="button" class="btn go-btn" data-gsave="${list.id}:${g.id}">Save</button><button type="button" class="btn soft" data-gpause="${list.id}:${g.id}">${g.paused ? 'Resume' : `${svgI('moon', 'currentColor', 14, 2.4)} Pause`}</button><button type="button" class="btn soft" data-gdel="${list.id}:${g.id}">Remove</button></div>
    <p class="foot">${g.paused ? 'This goal and its steps are resting.' : `Pausing rests the goal and its ${steps} ${steps === 1 ? 'step' : 'steps'}. Removing it also removes its steps.`}</p>`;
}

export function renderGoalDone(d) {
  return `<div class="gdone"><span class="gbig">🎯</span><b class="ttl">Completed “${esc(d.title)}”?</b>
    <p class="hint">Amazing. Before it goes in the trophy case, write a line to remember it by, like who was there, how it felt, or what you learned. Add a photo if you have one.</p></div>
    <div class="mem-form"><div class="photo-pick">${d.preview ? `<img src="${d.preview}" alt="Your photo">` : `<span>${svgI('camera', '#8A5A30', 34, 2)}<small>Add a photo</small></span>`}<input type="file" id="memPhoto" accept="image/*" aria-label="Choose a photo"></div>
    <div class="mem-fields"><label class="q" for="memText">Recap</label><textarea class="field" id="memText" rows="4" maxlength="280" placeholder="We did it! …">${esc(d.text || '')}</textarea></div></div>
    <div class="actions"><button type="button" class="btn go-btn" data-gconfirm="1">Yes! Save it and celebrate</button><button type="button" class="btn soft" data-close="1">Not yet</button></div>`;
}

export function renderIdeas(state, section, added) {
  const I = IDEAS[section];
  const plus = (key, done) => done ? '<span class="added">✓ Added</span>' : `<button type="button" class="btn go-btn small" data-idea="${key}">+ Add</button>`;
  const fl = (code) => FREQS.find(([v]) => v === code)?.[1] || 'Daily';
  return `<div class="sec-head" style="--c:${SECTIONS[section].color}">${sectionChip(section)}<span>Easy wins to start with. Add only what fits your life right now. Fewer, finished beats more, half-done.</span></div>
    <div class="h3">Quick tasks</div>${I.tasks.map(([t, f], k) => `<div class="idea-row"><span><b>${esc(t)}</b></span><span class="fpill">${fl(f)}</span>${plus(`t:${k}`, added.has(`t:${k}`))}</div>`).join('')}
    <div class="h3">Goals</div>${I.goals.map(([t, steps], k) => `<div class="idea-row"><span><b>🎯 ${esc(t)}</b><small>${steps.map(([x]) => esc(x)).join(' · ')}</small></span>${plus(`g:${k}`, added.has(`g:${k}`))}</div>`).join('')}
    <div class="h3">Ready-made plans</div>${I.plans.map((p, k) => `<div class="idea-row plan"><span><b>${esc(p.title)}</b><small>${esc(p.desc)}</small></span>${added.has(`p:${k}`) ? '<span class="added">✓ Joined</span>' : `<button type="button" class="btn go-btn small" data-idea="p:${k}">Join</button>`}</div>`).join('')}`;
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
  { id: 'biz', label: 'Main Street', rep: () => 'bakery' },
  { id: 'district', label: 'Budget District', rep: () => 'fair' },
  { id: 'shops', label: 'Shops & services', rep: () => 'grocery' },
  { id: 'roads', label: 'Decor & Roads', rep: () => 'fountain' },
  { id: 'townhall', label: 'Town Hall', rep: () => 'townhall' }
];
/* How many things in a category are ready right now (unlocked, not built, affordable). */
export function readyCount(state, cat) {
  const built = (id) => state.buildings.some((b) => b.type === id);
  if (SECTIONS[cat] && !sectionUnlocked(state, cat)) return 0;
  if (SECTIONS[cat]) {
    const open = state.lists.some((l) => l.section === cat);
    if (!open) return 1;
    return BUILDINGS.filter((b) => b.section === cat && b.tier > 1 && !built(b.id) && state.level >= b.level && (!b.money || (state.budget?.level || 1) >= b.money) && state.coins >= b.cost).length;
  }
  if (cat === 'district') return built('bank') ? DISTRICT.filter((d) => !built(d.building) && catActive(state, d.cat)).length : 0;
  if (cat === 'biz') return bizCount(state) < bizSlots(state) ? BUILDINGS.filter((b) => b.kind === 'biz' && state.level >= b.level && state.coins >= bizCost(state, b.id)).length ? 1 : 0 : 0;
  if (cat === 'shops') return BUILDINGS.filter((b) => b.kind === 'shop' && !built(b.id) && state.coins >= b.cost && state.level >= b.level && (!b.needsBank || built('bank'))).length;
  if (cat === 'homes') return BUILDINGS.filter((b) => b.kind === 'home' && state.level >= b.level && state.coins >= b.cost).length ? 1 : 0;
  if (cat === 'townhall') return canUpgradeTownHall(state).ok ? 1 : 0;
  if (cat === 'roads') return BUILDINGS.filter((b) => b.earned && isEarned(state, b.id) && !built(b.id)).length;
  return 0;
}
export function renderStore(state) {
  return `<div class="store">${STORE.map((c) => { const n = readyCount(state, c.id); const locked = SECTIONS[c.id] && !sectionUnlocked(state, c.id); return `<button type="button" class="stile${locked ? ' locked' : ''}" data-cat="${c.id}"${SECTIONS[c.id] ? ` style="--c:${SECTIONS[c.id].color}"` : ''}>
    <span class="stitle">${esc(c.label)}</span><span class="sart">${img(c.rep(state))}${locked ? `<span class="lock">${svgI('lock', '#fff', 14, 2.6)}${esc(unlockShort(state, c.id))}</span>` : ''}</span>${n ? `<span class="badge">${SECTIONS[c.id] && !state.lists.some((l) => l.section === c.id) ? 'New' : n}</span>` : ''}</button>`; }).join('')}</div>`;
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

/* ---------- Earned decorations (steady use) ---------- */
export function renderEarnedWin(e) {
  return `<div class="lvlup"><span class="earn-big">${img(e.id)}</span><b class="ttl">You earned the ${esc(e.name)}!</b>
    <p>For: ${esc(e.text)}. It can’t be bought, only earned. Place it anywhere, free.</p>
    <div class="actions"><button type="button" class="btn go-btn" data-pick="${e.id}">Place it now</button><button type="button" class="btn soft" data-close="1">Later</button></div>
    <p class="foot">Find it any time under Build → Decor &amp; roads, or Profile → Earned.</p></div>`;
}
export function renderEarnedGrid(state) {
  const placed = (id) => state.buildings.some((b) => b.type === id);
  return `<div class="earned-grid">${EARNED.map((e) => { const got = isEarned(state, e.id); const p = earnedProgress(state, e);
    return `<div class="earn${got ? ' got' : ''}"><span class="bimg">${img(e.id)}${got ? '' : `<span class="lock">${svgI('lock', '#fff', 12, 3)}</span>`}</span><b>${esc(e.name)}</b><small>${esc(e.text)}</small>
      ${got ? (placed(e.id) ? '<small class="ok">Placed in town</small>' : `<button type="button" class="btn go-btn small" data-pick="${e.id}">Place it · free</button>`) : `<div class="pbar"><i style="width:${((p.have / p.need) * 100).toFixed(0)}%"></i><em>${p.have}/${p.need}</em></div>`}</div>`; }).join('')}</div>`;
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
  const tabs = `<div class="seg wide">${[['info', 'Player info'], ['achievements', 'Achievements'], ['earned', 'Earned'], ['stickers', 'Sticker book']].map(([k, l]) => `<button type="button" data-ptab="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>`;
  let body;
  if (tab === 'achievements') {
    body = `<div class="ach-grid">${milestoneState(state).map((m) => `<div class="ach${m.claimed ? ' got' : m.ready ? ' ready' : ''}"><span class="ach-ic">${m.claimed || m.ready ? ART.trophy : `${ART.trophy}<i class="lk">${svgI('lock', '#fff', 12, 3)}</i>`}</span>
      <b>${esc(m.text)}</b><div class="pbar"><i style="width:${((m.now / m.at) * 100).toFixed(0)}%"></i><em>${m.now}/${m.at}</em></div>
      ${m.ready ? `<button type="button" class="btn go-btn small" data-claimm="${m.id}">Claim ${m.xp} XP</button>` : m.claimed ? '<small class="ok">Earned</small>' : ''}</div>`).join('')}</div>`;
  } else if (tab === 'earned') {
    body = `<p class="hint">These can’t be bought. They’re earned by showing up week after week.</p>${renderEarnedGrid(state)}`;
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
