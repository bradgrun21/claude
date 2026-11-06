import './fonts.js';
import './styles.css';
import * as THREE from 'three';
import { load, save, clearSave, newCity } from './data/state.js';
import { demoState } from './data/demo.js';
import { byId, SECTIONS, mainBuildingFor, ROAD_COST, MAX_HOME_LEVEL, homePop, homeUpgradeCost } from './data/catalog.js';
import { HALF, tileOf, tileCenter, key as tkey } from './data/map.js';
import { createStage } from './scene/stage.js';
import { detectQuality, fpsMeter } from './scene/quality.js';
import { waterUniforms } from './scene/water.js';
import { swayUniforms } from './world/bake.js';
import { createTerrain } from './world/terrain.js';
import { createRoads } from './world/roads.js';
import { createBuildings, createGhost, createWalkers, footprintCenter } from './world/town.js';
import { buildModel } from './world/townModels.js';
import { bakeGroup } from './world/bake.js';
import { createSurprises } from './world/surprises.js';
import { createTags } from './world/tags.js';
import { createEffects } from './world/effects.js';
import { tween, tickTweens, easeInOut, REDUCED, later } from './world/tween.js';
import { pick } from './world/palette.js';
import { createSound } from './audio/sound.js';
import { runSetup } from './ui/setup.js';
import { createTour } from './ui/tour.js';
import { svgI, IC, esc } from './ui/icons.js';
import { ART } from './ui/art.js';
import { renderListCard, renderBuild, renderLists, renderBuilding, renderBuilder, renderTaskEdit, renderGoalEdit, renderGoalDone, renderIdeas, renderLevelInfo, renderLevelUp, renderStore, renderRequests, renderProfile, requestItems, STORE, renderTownHall, renderEarnedWin } from './ui/panels.js';
import { dateKey, addDays, shortDate, weekday } from './systems/time.js';
import { levelNeed, population, checkLevelUp, levelBlocker, spend, canUpgradeTownHall, TOWNHALL } from './systems/economy.js';
import { canPlace, canPlaceRoad, canRemoveRoad, suggestSpot, footprint, perimeter } from './systems/placement.js';
import { createList, completeTask, achieveGoal, addGoal, addTask, updateTask, removeTask, updateGoal, removeGoal, setListPaused, freqCode, listFor, dueCount, totalDue, streak, fromFreq, useLevel, canReviewWeek, reviewWeek, weekSummary, WEEKLY_REVIEW } from './systems/lists.js';
import { sectionUnlocked, unlockHint, nextSection } from './systems/progression.js';
import { IDEAS } from './data/ideas.js';
import { createLiving } from './world/living.js';
import * as TL from './systems/tools.js';
import { renderTool, renderRibbon, TOOL_TABS } from './ui/tools.js';
import * as LB from './systems/logbook.js';
import { markUse, checkEarned, noteStreak, isEarned, earnedById } from './systems/earned.js';
import { dailyChallenges, challengeProgress, claimChallenge, milestoneState, claimMilestone, markQuickWin, claimQuickWin, QUICK_WINS, noteBuild } from './systems/challenges.js';
import { spotSticker, STICKERS } from './systems/surprises.js';
import { note, since } from './systems/journal.js';
import { addEvent, updateEvent, removeEvent, completeEvent, toIcs, eventsOn } from './systems/calendar.js';
import { addMemory, removeMemory } from './systems/memories.js';
import { putPhoto, deletePhoto, clearPhotos, compressImage, hydratePhotos } from './data/photos.js';
import { renderCalendar, renderEventForm, renderMemoryForm, renderMemories, renderMemoryView } from './ui/journal.js';
import { CATEGORIES, catById, setupBudget, addTransaction, ensureEmergencyFund, addFund, updateBalance, addDebt, payDebt, paydayDue, paydayBreakdown, recordPayday, paycheckDueAmount, money as toMoney } from './systems/budget.js';
import { renderBudgetSetup, renderBank, renderPaydayIn, renderPaydayBreakdown, renderMoneyLevelUp } from './ui/money.js';
import { createRailway } from './world/railway.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || params.has('fps');

function start() {
  const saved = load();
  if (saved) { boot(saved, {}); return; }
  $('boot').classList.add('done');
  runSetup($('setup'), {
    onDone: (input) => { const s = newCity(input, dateKey()); save(s, true); boot(s, { tour: true }); },
    onDemo: () => { const s = demoState(dateKey()); save(s, true); boot(s, {}); }
  });
}

function boot(state, opts) {
  $('hud').hidden = false;
  $('boot').classList.remove('done');
  const stage = createStage($('scene'));
  if (!stage) { $('fail').style.display = 'flex'; $('hud').hidden = true; $('boot').hidden = true; return; }
  const { scene, camera, controls, renderer } = stage;
  stage.setQuality(state.settings.quality === 'auto' ? detectQuality() : state.settings.quality);

  let today = dateKey();
  state.stats.lastDay = today;
  const terrain = createTerrain(scene, renderer);
  const roads = createRoads(scene);
  const fx = createEffects(scene, camera);
  const bld = createBuildings(scene, fx);
  const ghost = createGhost(scene);
  const walkers = createWalkers(scene);
  const sur = createSurprises(scene);
  const tags = createTags($('tags'));
  const rail = createRailway(scene, fx);
  const sound = createSound(state.settings);
  const meter = fpsMeter();
  const persist = () => save(state);
  for (const b of state.buildings) bld.add(b);
  walkers.addFamily(state.family);
  const living = createLiving(scene, { state, fx, bld, sound, today: () => today, onRebuilt: (id) => { const t = bubbles.get(id); if (t) { tags.remove(t.tag, false); bubbles.delete(id); } refreshBubbles(); } });

  /* ---------- Static HUD art ---------- */
  $('icoPop').innerHTML = ART.people; $('icoCoin').innerHTML = ART.coin; $('menuBtn').innerHTML = svgI('menu', '#fff', 24, 3);
  $('artBuild').innerHTML = ART.hardhat; $('artLists').innerHTML = ART.clipboard; $('artTrophy').innerHTML = ART.trophy; $('artWins').innerHTML = ART.wins; $('artCal').innerHTML = ART.calendar; $('artMem').innerHTML = ART.album;
  $('lvlStar').insertAdjacentHTML('afterbegin', ART.xp);
  $('panelClose').innerHTML = svgI('chevron', '#fff', 22, 3.2);

  /* ---------- World sync ---------- */
  function syncWorld() {
    roads.rebuild(state.roads);
    const blocked = new Set(state.roads);
    for (const b of state.buildings) for (const [i, j] of footprint(b.type, b.i, b.j, b.rot)) blocked.add(`${i},${j}`);
    terrain.sync(blocked);
    walkers.setRoads(state.roads);
    walkers.setCounts(Math.min(16, 2 + Math.floor(population(state) / 4)), Math.min(8, Math.floor(state.roads.length / 7)));
    living.refresh();
  }
  syncWorld();
  const th = state.buildings.find((b) => b.type === 'townhall');
  const thc = footprintCenter('townhall', th.i, th.j, 0);
  stage.setHome(thc.x + 1, thc.z + 2);

  /* ---------- HUD ---------- */
  function hud() {
    const need = levelNeed(state.level);
    const blocker = levelBlocker(state);
    $('lvl').textContent = state.level;
    $('xpFill').style.width = `${Math.min(100, (state.xp / need.xp) * 100).toFixed(1)}%`;
    $('xpTxt').textContent = blocker ? (blocker.kind === 'pop' ? `Need ${blocker.need} people` : `Upgrade Town Hall`) : `${state.xp} / ${need.xp}`;
    $('lvlBtn').classList.toggle('blocked', !!blocker);
    $('pop').textContent = population(state);
    $('coins').textContent = state.coins.toLocaleString('en-US');
    const due = totalDue(state, today);
    $('todayN').textContent = due;
    $('btnToday').classList.toggle('quiet', !due);
    const badge = (id, n) => { const el = $(id); el.hidden = !n; el.textContent = n; };
    badge('bdgLists', due);
    badge('bdgTrophy', milestoneState(state).filter((m) => m.ready).length + (state.earned || []).filter((e) => !state.buildings.some((b) => b.type === e.id)).length);
    badge('bdgCal', state.events.filter((e) => !e.done && e.date <= today).length);
    const winsLeft = QUICK_WINS.filter((q) => state.quickWins[q.id] !== 'claimed').length;
    $('lblWins').textContent = winsLeft ? 'Quick wins' : 'Challenges';
    badge('bdgWins', requestItems(state, today).length);
    const first = state.family[0];
    $('avatarIn').textContent = (state.cityName || 'L').trim()[0].toUpperCase();
    $('profileBtn').style.setProperty('--c', first ? first.color : '#3F8FE0');
    refreshBubbles();
  }
  const bubbles = new Map();
  function refreshBubbles() {
    const want = new Map();
    const dow = new Date(today + 'T12:00').getDay();
    for (const b of state.buildings) {
      const def = byId[b.type];
      const tool = TL.toolForBuilding(b.type);
      if (tool && TL.toolAvailable(state, tool.id) && !TL.toolOpened(state, tool.id)) { want.set(b.id, { sig: 'new', html: bubbleHtml(`<span class="bub-emoji">${tool.emoji}</span>`, `New: ${tool.name}`, b.id, def.section || null) }); continue; }
      if (tool && TL.toolOpened(state, tool.id)) {
        const tb = tool.id === 'care' && TL.careDueCount(state, today) ? ['🔧', 'Upkeep ready'] : tool.id === 'cards' && TL.cardsDueSoon(state, today) ? ['💌', 'Birthday soon'] : tool.id === 'subs' && TL.subsToReview(state, today).length ? ['📰', 'Check-in'] : tool.log && LB.LOGS[tool.id].reminder && LB.logDueSoon(state, tool.id, today) ? [tool.emoji, tool.id === 'records' ? 'Expiring soon' : 'Due soon'] : tool.id === 'meeting' && TL.canHoldMeeting(state, today) && (dow === 0 || dow >= 5) && !canUpgradeTownHall(state).ok ? ['🏛️', 'Family meeting'] : null;
        if (tb && !(def.kind === 'section' && listFor(state, b.id) && dueCount(listFor(state, b.id), today))) { want.set(b.id, { sig: `t${tb[1]}`, html: bubbleHtml(`<span class="bub-emoji">${tb[0]}</span>`, tb[1], b.id, def.section || null) }); continue; }
      }
      if (def.kind === 'section') {
        const list = listFor(state, b.id);
        if (!list) want.set(b.id, { sig: 'add', html: bubbleHtml(svgI('plus', SECTIONS[def.section].color, 20, 3), 'Add a list', b.id, def.section) });
        else { const n = dueCount(list, today); if (n) want.set(b.id, { sig: `due${n}`, html: bubbleHtml(svgI(SECTIONS[def.section].icon, SECTIONS[def.section].color, 20, 2.4), `${n} to do`, b.id, def.section) }); }
      } else if (b.type === 'station') { if (paydayDue(state.budget, today)) want.set(b.id, { sig: 'pay', html: bubbleHtml(svgI('coin', '#3E8E57', 20, 2.6), 'Payday!', b.id, null) }); }
      else if (b.type === 'bank' && !state.budget.setup) want.set(b.id, { sig: 'setup', html: bubbleHtml(svgI('coin', '#E0A23A', 20, 2.6), 'Set up budget', b.id, 'financial') });
      else if (def.kind === 'civic' && canUpgradeTownHall(state).ok) want.set(b.id, { sig: 'up', html: bubbleHtml(svgI('up', '#C98E25', 20, 3), 'Upgrade ready', b.id, null) });
    }
    for (const [id, t] of bubbles) if (!want.has(id) || want.get(id).sig !== t.sig) { tags.remove(t.tag, false); bubbles.delete(id); }
    for (const [id, w] of want) if (!bubbles.has(id)) { const v = bld.views.get(id); if (v) bubbles.set(id, { sig: w.sig, tag: tags.add(w.html, v.top, 'bubble', { bubble: true }) }); }
  }
  const bubbleHtml = (icon, label, id, section) => `<button type="button" class="bub" data-bub="${id}" style="--c:${section ? SECTIONS[section].color : '#F2B54A'}" aria-label="${esc(label)}">${icon}</button><span class="bl">${esc(label)}</span>`;
  $('tags').addEventListener('click', (e) => { const b = e.target.closest('[data-bub]'); if (b) { sound.tap(); openBuilding(b.dataset.bub); } });

  /* ---------- Toast + flying rewards ---------- */
  let toastTimer = 0;
  function toast(main, sub) {
    const t = $('toast');
    t.innerHTML = esc(main) + (sub ? `<small>${esc(sub)}</small>` : '');
    t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
  }
  function bump(el) { if (!el) return; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  function flyRewards(from, { coins = 0, xp = 0, pop = 0 }) {
    const targets = [['coin', coins, $('coinBtn')], ['xp', xp, $('lvlStar')], ['people', pop, $('popBtn')]];
    for (const [art, amount, target] of targets) {
      if (!amount) continue;
      const tr = target.getBoundingClientRect();
      const n = Math.min(5, Math.max(1, Math.round(amount / 10)));
      for (let k = 0; k < n; k++) {
        const el = document.createElement('i');
        el.className = 'flyer'; el.innerHTML = ART[art];
        $('fly').appendChild(el);
        const sx = from.x + (Math.random() - 0.5) * 50, sy = from.y + (Math.random() - 0.5) * 30;
        const ex = tr.left + 16, ey = tr.top + tr.height / 2;
        if (REDUCED || !el.animate) { el.remove(); bump(target); continue; }
        const a = el.animate([
          { transform: `translate(${sx}px, ${sy}px) scale(.4)`, opacity: 0 },
          { transform: `translate(${sx}px, ${sy - 40}px) scale(1.1)`, opacity: 1, offset: 0.25 },
          { transform: `translate(${ex}px, ${ey}px) scale(.7)`, opacity: 1 }
        ], { duration: 750 + k * 90, easing: 'cubic-bezier(.5,0,.4,1)' });
        a.onfinish = () => { el.remove(); bump(target); };
      }
      const label = document.createElement('b');
      label.className = 'flylabel'; label.textContent = `+${amount}${art === 'xp' ? ' XP' : ''}`;
      label.style.transform = `translate(${from.x}px, ${from.y - (art === 'xp' ? 22 : 0)}px)`;
      $('fly').appendChild(label);
      setTimeout(() => label.remove(), 1200);
    }
  }
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const screenOf = (v3) => { const v = v3.clone().project(camera); return { x: ((v.x + 1) / 2) * innerWidth, y: ((1 - v.y) / 2) * innerHeight }; };

  /* ---------- Events for the tour ---------- */
  const listeners = [];
  const emit = (name, data) => listeners.forEach((fn) => fn(name, data));

  /* ---------- Progress: quick wins, level ups ---------- */
  function win(id, from) {
    if (!markQuickWin(state, id)) return;
    const q = claimQuickWin(state, id);
    if (!q) return;
    later(450, () => { flyRewards(from || { x: innerWidth / 2, y: innerHeight / 2 }, q); toast(`Quick win: ${q.text}`, `+${q.coins} coins · +${q.xp} XP`); sound.chime(); });
  }
  function afterProgress() {
    const levels = checkLevelUp(state);
    if (levels.length) {
      const lv = levels.at(-1);
      note(state, today, 'levelup', { level: lv });
      if (lv >= 3) win('level3');
      if (lv >= 3 && !TL.toolOpened(state, 'meeting')) later(4200, () => toast('New at the Town Hall: Family Meeting', 'Tap the Town Hall to cut the ribbon'));
      later(700, () => {
        sound.chime(); sound.firework();
        fx.fireworks(controls.target, 5, () => sound.firework());
        if (spotSticker(state, 'fireworks')) persist();
        openPanel('levelup', { level: lv });
        emit('levelup', lv);
      });
    }
    if (new Set(state.lists.map((l) => l.section)).size >= 2) win('area2');
    const fresh = checkEarned(state, today);
    if (fresh.length) later(levels.length ? 2600 : 900, () => {
      const e = fresh[0];
      sound.chime(); fx.fireworks(controls.target, 3, () => sound.firework());
      note(state, today, 'built', { name: `Earned: ${e.name}` });
      if (!panel && !mode) showEarned(); else toast(`You earned the ${e.name}!`, 'Close this to celebrate');
      hud();
    });
    persist(); hud();
  }

  /* ---------- Panels ---------- */
  let panel = null;
  function openPanel(kind, o = {}) {
    if (mode) return;
    panel = { kind, ...o };
    if (kind === 'profile' && !panel.tab) panel.tab = 'info';
    renderPanel();
    $('panel').hidden = false;
    $('panelBody').scrollTop = 0;
    emit('panel:' + kind);
  }
  function closePanel() { $('panel').hidden = true; const k = panel?.kind; panel = null; if (k) emit('closed:' + k); if (k && k !== 'earned' && unseenEarned()) later(350, () => { if (!panel && !mode) showEarned(); }); }
  /* Earned decorations get their celebration the next time nothing else is on screen. */
  const unseenEarned = () => (state.earned || []).find((e) => !e.seen);
  function showEarned() { const e = unseenEarned(); if (!e) return; e.seen = true; persist(); openPanel('earned', { id: e.id }); }
  function renderPanel() {
    if (!panel) return;
    let title = '', tabs = '', body = '';
    const p = panel;
    $('win').dataset.kind = p.kind;
    if (p.kind === 'build') { if (!p.tab) { title = 'Store'; body = renderStore(state); } else { title = STORE.find((c) => c.id === p.tab).label; tabs = `<button type="button" class="wtab back" data-back="1">‹ Store</button>`; body = renderBuild(state, p.tab); } }
    else if (p.kind === 'lists') { title = p.due ? 'Due today' : 'Your lists'; tabs = `<button type="button" class="wtab${p.due ? ' on' : ''}" data-due="1">Due today</button><button type="button" class="wtab${p.due ? '' : ' on'}" data-due="0">All lists</button><button type="button" class="wtab${canReviewWeek(state, today) && state.lists.length ? ' glow' : ''}" data-reviewopen="1">Week in review</button>`; body = renderLists(state, today, p.due); }
    else if (p.kind === 'building') { const b = state.buildings.find((x) => x.id === p.id); if (!b) { closePanel(); return; } title = byId[b.type].name; body = renderBuilding(state, b, today); }
    else if (p.kind === 'goal') { title = p.draft.title; body = renderBuilder(p.draft); }
    else if (p.kind === 'taskEdit') { const l = state.lists.find((x) => x.id === p.listId); const t = l?.tasks.find((x) => x.id === p.taskId); if (!t) { closePanel(); return; } title = 'Edit task'; body = renderTaskEdit(state, l, t, p.edit); }
    else if (p.kind === 'goalEdit') { const l = state.lists.find((x) => x.id === p.listId); const g = l?.goals.find((x) => x.id === p.goalId); if (!g) { closePanel(); return; } title = 'Edit goal'; body = renderGoalEdit(l, g, p.edit, today); }
    else if (p.kind === 'goalDone') { title = 'Completed the goal?'; body = renderGoalDone(p.draft); }
    else if (p.kind === 'ideas') { title = `${SECTIONS[p.section].name} ideas`; tabs = p.draft ? `<button type="button" class="wtab back" data-ideaback="1">‹ Back</button>` : ''; body = renderIdeas(state, p.section, p.added); }
    else if (p.kind === 'review') { title = 'Week in review'; body = renderReview(); }
    else if (p.kind === 'earned') { const e = earnedById[p.id]; title = 'Earned!'; body = renderEarnedWin(e); }
    else if (p.kind === 'ribbon') { const b = state.buildings.find((x) => x.id === p.buildingId); title = 'Grand opening'; body = renderRibbon(p.tool, b ? byId[b.type].name : ''); }
    else if (p.kind === 'tool') {
      const t = TL.toolById[p.tool]; const b = state.buildings.find((x) => x.id === p.buildingId);
      const tl = [...(b && byId[b.type].kind === 'section' ? [['list', 'List']] : []), ...TOOL_TABS[p.tool], ...(p.tool === 'meeting' ? [['upgrade', 'Upgrade']] : [])];
      title = `${t.emoji} ${t.name}`;
      tabs = tl.map(([k, l]) => `<button type="button" class="wtab${p.tab === k || (p.tab === 'recipe' && k === 'recipes') ? ' on' : ''}" data-ttab="${k}">${l}</button>`).join('');
      body = p.tab === 'list' && b && byId[b.type].kind === 'section' ? renderBuilding(state, b, today) : p.tab === 'upgrade' ? renderTownHall(state) : renderTool(state, p, today);
    }
    else if (p.kind === 'requests') { title = 'Available tasks'; body = renderRequests(state, today); }
    else if (p.kind === 'profile') { title = 'Profile'; body = renderProfile(state, today, p.tab, streak(state, today), p.editing); }
    else if (p.kind === 'calendar') { title = 'Calendar'; body = renderCalendar(state, today, p.ym, p.sel); }
    else if (p.kind === 'event') { title = p.draft.id ? 'Edit outing' : 'Plan an outing'; body = renderEventForm(p.draft, state); }
    else if (p.kind === 'memories') { title = 'Memories'; body = renderMemories(state, p.filter); }
    else if (p.kind === 'memory') { title = p.draft.eventId ? 'How did it go?' : 'Add a memory'; body = renderMemoryForm(p.draft); }
    else if (p.kind === 'bank') { title = 'Bank'; body = renderBank(state, today, p.tab, p.ui) + (p.tab === 'list' ? (() => { const bk = state.buildings.find((x) => x.type === 'bank'); const l = bk && listFor(state, bk.id); return l ? renderListCard(state, l, today) : '<p class="hint">No list yet.</p>'; })() + `<div class="actions"><button type="button" class="btn soft" data-move="${state.buildings.find((x) => x.type === 'bank')?.id}">Move the Bank</button></div>` : ''); }
    else if (p.kind === 'budgetSetup') { title = 'Your budget'; body = renderBudgetSetup(p.draft); }
    else if (p.kind === 'payday') { title = 'Payday!'; body = p.step === 'bd' ? renderPaydayBreakdown(p.bd) : renderPaydayIn(p.amount); }
    else if (p.kind === 'moneyup') { title = 'Money level up!'; body = renderMoneyLevelUp(p.level); }
    else if (p.kind === 'memview') { const m = state.memories.find((x) => x.id === p.id); if (!m) { closePanel(); return; } title = 'Memory'; body = renderMemoryView(state, m); }
    else if (p.kind === 'level') { title = 'Your level'; body = renderLevelInfo(state); }
    else if (p.kind === 'levelup') { title = 'Level up!'; body = renderLevelUp(p.level); }
    else if (p.kind === 'menu') { title = 'Menu'; body = renderMenu(p.confirm); }
    else if (p.kind === 'paper') { title = 'Town paper'; body = renderPaper(); }
    $('panelTitle').textContent = title;
    $('panelTabs').innerHTML = tabs;
    $('panelTabs').hidden = !tabs;
    const keepScroll = $('panelBody').scrollTop;
    const focusId = document.activeElement?.closest?.('#panelBody') ? document.activeElement.id || document.activeElement.dataset.tt : null;
    $('panelBody').innerHTML = body;
    hydratePhotos($('panelBody'));
    $('panelBody').scrollTop = keepScroll;
    if (focusId) { const el = $(focusId) || $('panelBody').querySelector(`[data-tt="${focusId}"]`); el?.focus(); }
  }
  $('panelClose').onclick = closePanel;
  $('panel').addEventListener('click', (e) => { if (e.target.id === 'panel') closePanel(); });

  /* ---------- Task & goal builder ----------
   * mode 'unlock': the free first building of an area (placed after saving)
   * mode 'add':    add tasks or a goal to a building (creates its list if needed)
   * mode 'step':   add steps under an existing goal
   */
  const blankRows = (n, freq = 'daily') => Array.from({ length: n }, () => ({ title: '', freq, who: null }));
  const people = () => state.family.filter((m) => m.kind !== 'pet');
  function openBuilder(o) {
    const draft = { mode: o.mode, type: o.type, buildingId: o.buildingId, listId: o.listId, goalId: o.goalId || null, kind: o.kind || 'task', lockKind: !!o.lockKind, goal: '', target: '', family: people(), tasks: blankRows(2) };
    if (o.mode === 'unlock') {
      const def = byId[o.type];
      Object.assign(draft, { section: def.section, title: `Open ${SECTIONS[def.section].name}`, intro: `Add a few simple tasks, or one goal. Your ${def.name} is free.`, saveLabel: `Save & place the ${def.name}` });
    } else if (o.mode === 'step') {
      const l = state.lists.find((x) => x.id === o.listId); const g = l?.goals.find((x) => x.id === o.goalId);
      Object.assign(draft, { section: l.section, buildingId: l.buildingId, title: 'Add steps', intro: `Small steps toward “${g?.title || 'your goal'}”.`, saveLabel: 'Save steps', kind: 'task', lockKind: true, tasks: blankRows(1) });
    } else {
      const l = o.listId ? state.lists.find((x) => x.id === o.listId) : null;
      const b = state.buildings.find((x) => x.id === (l ? l.buildingId : o.buildingId)); const def = byId[b.type];
      Object.assign(draft, { section: def.section, buildingId: b.id, listId: l?.id || null, title: draft.kind === 'goal' && draft.lockKind ? 'New goal' : draft.lockKind ? 'New tasks' : def.name, intro: draft.kind === 'goal' ? 'A bigger thing. Break it into small steps if you like.' : 'Simple things you do, like chores or habits.', saveLabel: 'Save' });
      if (draft.kind === 'goal') draft.tasks = blankRows(1);
    }
    if (o.idea) applyIdeaToDraft(draft, o.idea);
    openPanel('goal', { draft, prev: o.prev || null });
    emit('goalform');
  }
  function readGoalForm() {
    const d = panel?.draft; if (!d || panel.kind !== 'goal') return;
    const g = $('gfGoal'); if (g) d.goal = g.value;
    const tg = $('gfTarget'); if (tg) d.target = tg.value;
    $('panelBody').querySelectorAll('[data-tt]').forEach((i) => { d.tasks[+i.dataset.tt].title = i.value; });
    $('panelBody').querySelectorAll('[data-tf]').forEach((i) => { d.tasks[+i.dataset.tf].freq = i.value; });
  }
  function readEdit() {
    const e = panel?.edit; if (!e) return;
    if ($('teTitle')) e.title = $('teTitle').value;
    if ($('teFreq')) e.freq = $('teFreq').value;
    if ($('geTitle')) e.title = $('geTitle').value;
    if ($('geTarget')) e.target = $('geTarget').value;
  }
  /* Put the draft's tasks/goal onto a list. Returns how many things were added. */
  function applyDraft(list, d) {
    const rows = d.tasks.filter((t) => t.title.trim());
    let goalId = d.goalId || null, n = 0;
    if (d.kind === 'goal') { const g = addGoal(state, list.id, d.goal, today, d.target || null); if (!g) return 0; goalId = g.id; n++; }
    for (const t of rows) if (addTask(state, list.id, { title: t.title, ...fromFreq(t.freq), goalId, who: t.who })) n++;
    return n;
  }
  $('panelBody').addEventListener('input', () => {
    if (panel?.kind === 'budgetSetup') readBudgetSetup();
    if (panel?.kind === 'bank' && panel.tab === 'tx') readTx(); if (panel?.kind === 'goal') readGoalForm(); if (panel?.kind === 'taskEdit' || panel?.kind === 'goalEdit') readEdit(); if (panel?.kind === 'event' || panel?.kind === 'memory' || panel?.kind === 'goalDone') readJournalForm(); });
  $('panelBody').addEventListener('input', (e) => { if (panel?.kind === 'tool' && e.target.dataset.uf) panel.ui[e.target.dataset.uf] = e.target.value; });
  $('panelBody').addEventListener('change', (e) => {
    if (panel?.kind !== 'tool') return;
    if (e.target.dataset.uf) panel.ui[e.target.dataset.uf] = e.target.value;
    if (e.target.dataset.meal) { TL.setMeal(state, e.target.dataset.meal, e.target.value); markUse(state, 'meals', today); persist(); afterProgress(); renderPanel(); }
  });
  $('panelBody').addEventListener('change', (e) => { if (panel?.kind === 'goal') readGoalForm(); if (panel?.kind === 'taskEdit' || panel?.kind === 'goalEdit') readEdit(); });
  function readJournalForm() {
    const d = panel?.draft; if (!d) return;
    const v = (id) => $(id)?.value;
    if (panel.kind === 'event') { d.title = v('evTitle') ?? d.title; d.date = v('evDate') || d.date; d.time = v('evTime') ?? d.time; d.place = v('evPlace') ?? d.place; d.budget = v('evBudget') ?? d.budget; d.notes = v('evNotes') ?? d.notes; }
    else { d.text = v('memText') ?? d.text; d.date = v('memDate') || d.date; if ($('memSpent')) d.spent = v('memSpent'); }
  }
  $('panelBody').addEventListener('change', async (e) => {
    if (e.target.id === 'logPhoto' && e.target.files?.[0] && panel?.kind === 'tool') {
      try { const blob = await compressImage(e.target.files[0]); if (panel.ui.photoPreview) URL.revokeObjectURL(panel.ui.photoPreview); panel.ui.photoBlob = blob; panel.ui.photoPreview = URL.createObjectURL(blob); renderPanel(); } catch (err) { toast('Couldn’t use that photo', 'Try another one'); }
      return;
    }
    if (e.target.id !== 'memPhoto' || !e.target.files?.[0] || (panel?.kind !== 'memory' && panel?.kind !== 'goalDone')) return;
    readJournalForm();
    try {
      const blob = await compressImage(e.target.files[0]);
      if (panel.draft.preview) URL.revokeObjectURL(panel.draft.preview);
      panel.draft.blob = blob; panel.draft.preview = URL.createObjectURL(blob);
      renderPanel();
    } catch (err) { toast('Couldn’t use that photo', 'Try another one'); }
  });
  const ymOf = (k) => k.slice(0, 7);
  const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  function openEventForm(o = {}) {
    const ev = o.id && state.events.find((x) => x.id === o.id);
    const draft = ev ? { ...ev, who: [...ev.who], budget: ev.budget || '' } : { title: '', date: o.date || today, time: '', section: 'relational', place: '', budget: '', who: state.family.filter((m) => m.kind !== 'pet').map((m) => m.name), notes: '' };
    openPanel('event', { draft });
  }
  function openMemoryForm(o = {}) {
    openPanel('memory', { draft: { section: o.section || 'relational', date: o.date || today, text: '', taskTitle: o.taskTitle || null, eventId: o.eventId || null, eventTitle: o.eventTitle || null, spent: o.spent ?? null } });
  }
  function downloadIcs(events, name) {
    if (!events.length) return;
    const blob = new Blob([toIcs(events, state.cityName)], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Calendar file ready', 'Open it to add to Apple, Google or Outlook Calendar');
  }
  /* ---------- Money: Bank hub, budget walkthrough, payday train ---------- */
  function openBuilding(id) {
    const b = state.buildings.find((x) => x.id === id);
    if (!b) return;
    if (b.type === 'bank') return openPanel('bank', { tab: 'budget', ui: {} });
    if (b.type === 'savings') return openPanel('bank', { tab: 'savings', ui: {} });
    if (b.type === 'payoff') return openPanel('bank', { tab: 'debts', ui: {} });
    if (b.type === 'station' && (payday || paydayDue(state.budget, today))) return startPayday();
    const tool = TL.toolForBuilding(b.type);
    if (tool && TL.toolAvailable(state, tool.id)) {
      if (!TL.toolOpened(state, tool.id)) return openPanel('ribbon', { tool: tool.id, buildingId: id });
      const l = byId[b.type].kind === 'section' && listFor(state, id);
      const tab = (l && dueCount(l, today)) ? 'list' : tool.id === 'meeting' && canUpgradeTownHall(state).ok ? 'upgrade' : TOOL_TABS[tool.id][0][0];
      return openPanel('tool', { tool: tool.id, buildingId: id, tab, ui: {} });
    }
    openPanel('building', { id });
  }
  const nextFridayKey = () => { let k = today; for (let i = 0; i < 7; i++) { const d = addDays(today, i); if (new Date(d + 'T12:00').getDay() === 5) { k = d; break; } } return k; };
  function openBudgetSetup() {
    const bdg = state.budget;
    const draft = { step: bdg.setup ? 1 : 0, incomes: bdg.incomes.length ? bdg.incomes.map((i) => ({ ...i })) : [{ name: state.family[0]?.name ? `${state.family[0].name}'s paycheck` : 'Paycheck', amount: '', freq: 'biweekly', next: nextFridayKey() }], expenses: { ...bdg.expenses } };
    openPanel('budgetSetup', { draft });
  }
  function readBudgetSetup() {
    const d = panel?.draft; if (!d) return;
    $('panelBody').querySelectorAll('[data-inc]').forEach((el) => { const [n, f] = el.dataset.inc.split(':'); d.incomes[+n][f] = el.value; });
    $('panelBody').querySelectorAll('[data-exp]').forEach((el) => { d.expenses[el.dataset.exp] = el.value; });
  }
  function moneyUp(lv) {
    if (!lv) return;
    if (lv >= 2) ensureEmergencyFund(state);
    later(500, () => { sound.chime(); fx.fireworks(controls.target, 4, () => sound.firework()); openPanel('moneyup', { level: lv }); });
  }
  function readTx() {
    const t = panel.ui.tx || (panel.ui.tx = { type: 'expense', cat: 'groceries', amount: '', note: '', date: today });
    if ($('txAmt')) { t.amount = $('txAmt').value; t.note = $('txNote').value; t.date = $('txDate').value || today; }
    return t;
  }
  function bankAction(a, el) {
    if (a === 'setup') return openBudgetSetup();
    if (a === 'logtx') { panel.tab = 'tx'; renderPanel(); $('txAmt')?.focus(); return; }
    if (a === 'payday') return startPayday();
    if (a === 'opensavings' || a === 'opendebts') return openPanel('bank', { tab: a === 'opensavings' ? 'savings' : 'debts', ui: {} });
    if (a === 'savetx') {
      const t = readTx();
      const r = addTransaction(state, t, today);
      if (!r) { toast('Enter an amount first'); $('txAmt')?.focus(); return; }
      if (r.reward) flyRewards(centerOf(el), r.reward);
      sound.coin();
      toast('Logged', r.tx.type === 'income' ? 'Money in' : `${catById(r.tx.cat).short} · keep it up, every log levels up your money skills`);
      panel.ui.tx = { ...t, amount: '', note: '' };
      moneyUp(r.levelUp);
    }
    if (a === 'addfund') {
      const name = $('fName').value.trim();
      if (!name) { toast('Name the sinking fund', 'Like Christmas or car repairs'); return; }
      moneyUp(addFund(state, { name, target: $('fTarget').value, monthly: $('fMonthly').value }).levelUp);
      toast('Sinking fund added', 'Set a little aside each month');
    }
    if (a === 'adddebt') {
      const name = $('dName').value.trim();
      if (!name || !(toMoney($('dBal').value) > 0)) { toast('Add a name and balance'); return; }
      moneyUp(addDebt(state, { name, balance: $('dBal').value, min: $('dMin').value }).levelUp);
    }
    if (a === 'calc') panel.ui.extra = $('dExtra').value;
    afterProgress(); renderPanel();
  }

  let payday = null;
  function startPayday() {
    if (!state.budget.setup) { openBudgetSetup(); return; }
    if (payday) { openPanel('payday', { step: payday.step, amount: payday.amount, bd: payday.bd }); return; }
    if (mode) endMode();
    closePanel();
    payday = { step: 'in', amount: paycheckDueAmount(state.budget, today) };
    stage.flyTo(rail.stationPos, tween, easeInOut, 20);
    sound.whistle();
    rail.arrive(() => { sound.whistle(); openPanel('payday', { step: 'in', amount: payday.amount }); });
  }
  function destBuilding(cat) {
    const find = (...types) => { for (const t of types) { const b = state.buildings.find((x) => x.type === t); if (b) return b; } return null; };
    const th = state.buildings.find((x) => x.type === 'townhall');
    const d = catById(cat).dest;
    return ({ home: () => find('house', 'cottage', 'townhouse', 'apartments'), grocery: () => find('grocery'), gasstation: () => find('gasstation'), newsstation: () => find('newsstation'), giving: () => find('church', 'garden', 'studyhall', 'pavilion'), debt: () => find('payoff', 'bank'), fun: () => find('cafe', 'diner', 'park', 'hall'), saved: () => find('savings', 'bank') }[d]?.() || th);
  }
  function roadPath(target) {
    const roads = new Set(state.roads);
    const st = state.buildings.find((b) => b.type === 'station');
    if (!st) return [];
    const starts = perimeter(footprint('station', st.i, st.j, st.rot)).map(([i, j]) => tkey(i, j)).filter((k) => roads.has(k));
    const goals = new Set(perimeter(footprint(target.type, target.i, target.j, target.rot)).map(([i, j]) => tkey(i, j)).filter((k) => roads.has(k)));
    const prev = new Map(starts.map((k) => [k, null]));
    const q = [...starts];
    while (q.length) {
      const k = q.shift();
      if (goals.has(k)) { const out = []; let c = k; while (c) { out.unshift(c); c = prev.get(c); } return out; }
      const [i, j] = k.split(',').map(Number);
      for (const n of [tkey(i + 1, j), tkey(i - 1, j), tkey(i, j + 1), tkey(i, j - 1)]) if (roads.has(n) && !prev.has(n)) { prev.set(n, k); q.push(n); }
    }
    return [];
  }
  function truckPoints(target) {
    const pts = [rail.stationPos.clone()];
    for (const k of roadPath(target)) { const [i, j] = k.split(',').map(Number); const [x, z] = tileCenter(i, j); pts.push(new THREE.Vector3(x, 0, z)); }
    const c = footprintCenter(target.type, target.i, target.j, target.rot);
    pts.push(new THREE.Vector3(c.x, 0, c.z).lerp(pts.at(-1), 0.4));
    return pts;
  }
  function paydayShow() {
    const amount = toMoney($('payAmt2')?.value) || payday.amount;
    payday.amount = amount;
    payday.bd = paydayBreakdown(state, amount, today);
    payday.step = 'bd';
    const list = [];
    for (const sl of payday.bd.slices) {
      const target = destBuilding(sl.cat);
      for (let k = 0; k < sl.full + sl.half; k++) list.push({ color: sl.color, half: k >= sl.full, cat: sl.cat, target: target.id, points: truckPoints(target) });
    }
    rail.park(list.slice(0, 14));
    payday.trucks = Math.min(14, list.length);
    panel.step = 'bd'; panel.bd = payday.bd; panel.amount = amount;
    renderPanel();
  }
  function paydaySend(el) {
    const r = recordPayday(state, payday.amount, today);
    const payday_trucks = payday.trucks || 0;
    if (!payday_trucks) later(600, () => rail.depart());
    flyRewards(centerOf(el), r.reward);
    closePanel();
    payday = null;
    let left = payday_trucks;
    rail.dispatch((t) => {
      const v = bld.views.get(t.target);
      if (v) { fx.coinBurst(v.top.clone().add(new THREE.Vector3(0, -0.3, 0))); bld.bounce(t.target); }
      sound.coin();
      if (--left <= 0) { rail.depart(); toast('Every dollar delivered', 'See you next payday'); }
    });
    toast('The trucks are rolling!', 'Watch them deliver to each building');
    note(state, today, 'payday', {});
    moneyUp(r.levelUp);
    afterProgress();
  }

  async function saveMemory(el, justDone = false) {
    readJournalForm();
    const d = panel.draft;
    let photoId = null;
    if (!justDone && d.blob) { photoId = `p${Date.now().toString(36)}`; await putPhoto(photoId, d.blob); }
    let mem = null, reward = null;
    if (!justDone) {
      const r = addMemory(state, { section: d.section, date: d.date, text: d.text, photoId, taskTitle: d.taskTitle, eventId: d.eventId }, today);
      if (!r && !d.eventId) { toast('Add a photo or a few words', 'Either one is perfect'); return; }
      if (r) { mem = r.mem; reward = r.reward; }
    }
    if (d.eventId) {
      const c = completeEvent(state, d.eventId, d.spent);
      if (c?.ev && mem) c.ev.memoryId = mem.id;
      if (c?.reward) reward = { coins: (reward?.coins || 0) + c.reward.coins, xp: (reward?.xp || 0) + c.reward.xp };
      note(state, today, 'outing', { title: c?.ev.title });
    }
    if (d.preview) URL.revokeObjectURL(d.preview);
    if (reward) flyRewards(centerOf(el), reward);
    sound.chime();
    if (mem) win('memory', centerOf(el));
    toast(d.eventId ? 'Outing marked done' : 'Memory saved', d.eventId ? 'Nice work getting out together' : 'Find it any time in Memories');
    const back = d.eventId ? { kind: 'calendar', ym: ymOf(d.date), sel: d.date } : { kind: 'memories' };
    afterProgress();
    openPanel(back.kind, back);
  }
  function saveGoalForm() {
    readGoalForm();
    const d = panel.draft;
    const rows = d.tasks.filter((t) => t.title.trim());
    if (d.kind === 'goal' && !d.goal.trim()) { toast('Name the goal first', 'Like “Run a 5K” or “Host friends for dinner”'); $('gfGoal')?.focus(); return; }
    if (d.kind !== 'goal' && !rows.length) { toast('Add at least one task', 'Something simple, like “Do the dishes”'); $('panelBody').querySelector('[data-tt]')?.focus(); return; }
    if (d.mode === 'unlock') {
      closePanel();
      if (d.kind === 'goal') win('goal');
      const pending = { ...d, tasks: d.tasks.map((t) => ({ ...t })) };
      const sec = byId[d.type].section;
      startPlacement({
        type: d.type,
        onPlace: (rec) => {
          if (sec === 'spiritual') state.spiritualStyle = d.type === 'garden' ? 'garden' : 'church';
          rec.story = pending.kind === 'goal' ? `your first ${SECTIONS[sec].name.toLowerCase()} goal: “${pending.goal.trim()}”` : `your first ${SECTIONS[sec].name.toLowerCase()} list`;
          const list = createList(state, rec, '', [], today);
          applyDraft(list, pending);
          note(state, today, 'opened', { section: sec });
          win('place', screenOf(bld.views.get(rec.id).top));
          if (d.type === 'bank') { later(3800, () => { toast('Next: set up your budget', 'Relational opens once your budget is set'); openBudgetSetup(); }); return; }
          const nx = nextSection(state);
          toast(`${SECTIONS[sec].name} is open!`, nx && sectionUnlocked(state, nx) ? `${SECTIONS[nx].name} is ready to open next` : 'Tap the bubble to check off a task');
        }
      });
      return;
    }
    const wasUnlocked = new Set(SECTION_LIST.filter((s) => sectionUnlocked(state, s)));
    let list = d.listId ? state.lists.find((x) => x.id === d.listId) : listFor(state, d.buildingId);
    if (!list) list = createList(state, state.buildings.find((x) => x.id === d.buildingId), '', [], today);
    const n = applyDraft(list, d);
    if (d.kind === 'goal') win('goal');
    const opened = SECTION_LIST.find((s) => !wasUnlocked.has(s) && sectionUnlocked(state, s));
    toast(d.kind === 'goal' ? 'Goal added' : n === 1 ? 'Task added' : `${n} added`, opened ? `${SECTIONS[opened].name} is ready to open in the Store!` : 'Fewer, finished beats more, half-done');
    back(panel.prev, d.buildingId);
    afterProgress();
  }
  const SECTION_LIST = ['todo', 'financial', 'relational', 'physical', 'spiritual'];
  /* Go back to the panel we came from (a building, the Lists, the Bank), or to the building. */
  function back(prev, buildingId) {
    if (prev) openPanel(prev.kind, { ...prev });
    else if (buildingId) { closePanel(); openBuilding(buildingId); }
    else closePanel();
  }
  const snapshot = () => (panel ? { ...panel } : null);

  /* ---------- Ideas (💡) ---------- */
  const ideaSource = (section, code) => {
    const [k, n] = code.split(':'); const I = IDEAS[section];
    if (k === 't') return { kind: 't', title: I.tasks[+n][0], freq: I.tasks[+n][1] };
    const src = k === 'g' ? I.goals[+n] : [I.plans[+n].title, I.plans[+n].tasks];
    return { kind: k, title: src[0], steps: src[1] };
  };
  function applyIdeaToDraft(d, code) {
    const it = ideaSource(d.section, code);
    const filled = d.tasks.filter((t) => t.title.trim());
    if (it.kind === 't') d.tasks = [...filled, { title: it.title, freq: it.freq }];
    else { d.kind = 'goal'; d.lockKind = false; d.goal = it.title; d.tasks = it.steps.map(([t, f]) => ({ title: t, freq: f })); }
    if (!d.tasks.length) d.tasks = blankRows(1);
  }
  function addIdea(code, el) {
    const p = panel;
    if (p.draft) { applyIdeaToDraft(p.draft, code); openPanel('goal', { draft: p.draft, prev: p.builderPrev }); return; }
    const list = state.lists.find((x) => x.id === p.listId); if (!list) return;
    const it = ideaSource(p.section, code);
    if (it.kind === 't') addTask(state, list.id, { title: it.title, ...fromFreq(it.freq) });
    else {
      const g = addGoal(state, list.id, it.title, today);
      for (const [t, f] of it.steps) addTask(state, list.id, { title: t, ...fromFreq(f), goalId: g.id });
      win('goal');
    }
    p.added.add(code);
    sound.pop(); bump(el);
    toast(it.kind === 't' ? 'Task added' : it.kind === 'g' ? 'Goal added' : 'Plan joined', 'It’s on the building’s list now');
    afterProgress(); renderPanel();
  }

  /* ---------- Finishing a goal: confirm, recap, memory, parade ---------- */
  function openGoalDone(listId, goalId) {
    const l = state.lists.find((x) => x.id === listId); const g = l?.goals.find((x) => x.id === goalId);
    if (!g) return;
    openPanel('goalDone', { draft: { listId, goalId, title: g.title, section: l.section, text: '' }, prev: snapshot() });
  }
  async function goalReached(el) {
    readJournalForm();
    const d = panel.draft;
    const r = achieveGoal(state, d.listId, d.goalId, today);
    if (!r) return;
    let photoId = null;
    if (d.blob) { photoId = `p${Date.now().toString(36)}`; try { await putPhoto(photoId, d.blob); } catch (e) { photoId = null; } }
    const m = addMemory(state, { section: d.section, date: today, text: d.text?.trim() || `We completed “${d.title}”!`, photoId, taskTitle: `🎯 ${d.title}` }, today);
    if (d.preview) URL.revokeObjectURL(d.preview);
    note(state, today, 'goal', { goal: r.goal.title, section: r.list.section });
    sound.chime(); flyRewards(centerOf(el), { coins: r.reward.coins, xp: r.reward.xp + (m?.reward?.xp || 0) });
    closePanel();
    const top = bld.views.get(r.list.buildingId)?.top || controls.target;
    fx.fireworks(top, 5, () => sound.firework());
    fx.confetti(top);
    const pp = living.parade(r.goal.title);
    if (pp) later(600, () => stage.flyTo(pp, tween, easeInOut, 11));
    toast(`Goal complete: ${r.goal.title}`, `+${r.reward.coins} coins · +${r.reward.xp} XP · saved to Memories`);
    win('memory');
    afterProgress();
  }

  /* ---------- Weekly review ---------- */
  function renderReview() {
    const w = weekSummary(state, today);
    const can = canReviewWeek(state, today);
    const secs = Object.entries(w.bySection).sort((a, b) => b[1] - a[1]);
    return `<div class="gdone"><span class="gbig">📅</span><b class="ttl">Your last 7 days</b>
      <p class="hint">${w.total ? `${w.total} check-offs over ${w.days} ${w.days === 1 ? 'day' : 'days'}.` : 'A quiet week. Rest counts too. One check mark starts the next streak.'}</p></div>
      ${secs.length ? `<div class="rev-secs">${secs.map(([s, n]) => `<span class="schip" style="--c:${SECTIONS[s].color}">${SECTIONS[s].name} · ${n}</span>`).join('')}</div>` : ''}
      ${w.goals.length ? `<p class="hint">🏆 Goals finished: ${w.goals.map((g) => `“${esc(g)}”`).join(', ')}</p>` : ''}
      <p class="hint">${streak(state, today)}-day streak. One rest day a week never breaks it.</p>
      <p class="hint">Anything feel like too much? Tap a task to change how often it repeats, or remove it. Keep only what fits this season.</p>
      <div class="actions">${can ? `<button type="button" class="btn go-btn" data-review="1">Done reviewing · +${WEEKLY_REVIEW.coins} coins</button>` : '<span class="cost done">Reviewed this week ✓</span>'}</div>`;
  }

  /* ---------- Building things ---------- */
  function pickBuilding(id) {
    const def = byId[id];
    if (def.earned) {
      if (!isEarned(state, id)) { toast(`${def.name} is earned, not bought`, earnedById[id].text); return; }
      if (state.buildings.some((b) => b.type === id)) { toast(`${def.name} is already in town`, 'Tap it to move it'); return; }
    }
    if (def.section && !sectionUnlocked(state, def.section)) { toast(`${SECTIONS[def.section].name} isn’t open yet`, `${unlockHint(state, def.section)}. One area at a time keeps it doable.`); return; }
    if (def.kind === 'section' && def.tier === 1) { openBuilder({ mode: 'unlock', type: id }); return; }
    const open = !def.section || state.lists.some((l) => l.section === def.section) || state.buildings.some((b) => byId[b.type].section === def.section);
    if (state.level < def.level) { toast(`${def.name} unlocks at level ${def.level}`, 'Check off tasks and build homes to level up'); return; }
    if (def.money && state.budget.level < def.money) { toast(`${def.name} unlocks at money level ${def.money}`, 'Log transactions and update balances at the Bank'); return; }
    if (def.needsBank && !state.buildings.some((b) => b.type === 'bank')) { toast('Build the Bank first', 'Set a Financial goal to open it'); return; }
    if (!open) { toast(`Open ${SECTIONS[def.section].name} first`, `Set a goal at the ${mainBuildingFor(def.section, state.spiritualStyle || 'church').name}`); return; }
    if (state.coins < def.cost) { toast(`${def.cost - state.coins} more coins needed`, 'Check off tasks to earn coins'); return; }
    startPlacement({
      type: id,
      onPlace: (rec) => {
        spend(state, def.cost);
        if (def.kind === 'section') rec.story = 'a new list for your family';
        flyRewards(screenOf(bld.views.get(rec.id).top), { pop: def.pop || 0 });
        if (def.kind === 'home') { win('home'); toast(`${def.name} built`, `+${def.pop} people moved in`); emit('home'); }
        else if (TL.toolForBuilding(id) && TL.toolAvailable(state, TL.toolForBuilding(id).id)) later(3600, () => { if (!panel && !mode) openBuilding(rec.id); });
        else if (def.kind === 'section') later(3600, () => { if (!panel && !mode) openBuilder({ mode: 'add', buildingId: rec.id }); });
        else toast(`${def.name} placed`);
      }
    });
  }
  function upgradeHome(id) {
    const b = state.buildings.find((x) => x.id === id);
    const lv = b.level || 1;
    if (lv >= MAX_HOME_LEVEL) return;
    const cost = homeUpgradeCost(b.type, lv);
    if (!spend(state, cost)) { toast(`${cost - state.coins} more coins needed`, 'Check off tasks to earn coins'); return; }
    const gain = homePop(b.type, lv + 1) - homePop(b.type, lv);
    b.level = lv + 1;
    bld.rebuild(b, true);
    sound.thud(); noteBuild(state, today);
    flyRewards(screenOf(bld.views.get(b.id).top), { pop: gain });
    toast(`${byId[b.type].name} upgraded`, `+${gain} people`);
    syncWorld(); afterProgress(); renderPanel();
  }
  function upgradeTownHall() {
    const c = canUpgradeTownHall(state);
    if (!c.ok) return;
    spend(state, c.next.coins);
    state.tcLevel = c.next.level;
    th.level = state.tcLevel;
    bld.rebuild(th, true);
    sound.thud(); noteBuild(state, today);
    note(state, today, 'built', { name: `Town Hall level ${state.tcLevel}` });
    fx.fireworks(thc, 4, () => sound.firework());
    toast(`Town Hall is level ${state.tcLevel}!`, `Tasks pay +${(state.tcLevel - 1) * 10}% coins`);
    closePanel(); afterProgress();
  }

  /* ---------- Placement mode ---------- */
  let mode = null;
  const modebar = $('modebar');
  function setModeUI(on) { $('bottombar').hidden = on; modebar.hidden = !on; terrain.showGrid(on); }
  function startPlacement(o) {
    closePanel();
    const def = byId[o.type];
    mode = { kind: 'place', ...o, rot: o.rot || 0 };
    const t = controls.target;
    const near = o.start || { i: t.x + HALF, j: t.z + HALF };
    const spot = o.start || suggestSpot(state, o.type, near) || { i: Math.floor(near.i), j: Math.floor(near.j) };
    ghost.show(o.type, spot.i, spot.j, mode.rot, () => bakeGroup(buildModel(o.type, def.size[0], o.level || 1, 1)));
    if (o.ignoreId) bld.views.get(o.ignoreId).obj.visible = false;
    setModeUI(true);
    mode.draw = () => { modebar.innerHTML = `<span class="mhint" id="mhint"></span><div class="mbtns">${panToggle()}<button type="button" class="btn soft" data-m="cancel">Cancel</button><button type="button" class="btn soft icon" data-m="rotate" aria-label="Rotate">${svgI('rotate', 'currentColor', 20, 2.6)}</button><button type="button" class="btn go-btn" data-m="place" id="placeBtn">Place</button></div>`; validate(); };
    mode.draw();
    validate();
    stage.flyTo(footprintCenter(o.type, spot.i, spot.j, mode.rot), tween, easeInOut);
    emit('placing');
  }
  function validate() {
    if (mode?.kind !== 'place') return;
    const r = canPlace(state, mode.type, ghost.i, ghost.j, ghost.rot, mode.ignoreId);
    ghost.setValid(r.ok); mode.ok = r.ok;
    $('mhint').textContent = mode.pan ? 'Looking around. Tap the hammer to go back to placing.' : r.ok ? `Drag it where you like, then tap Place.` : r.reason;
    $('mhint').classList.toggle('warn', !r.ok);
  }
  function confirmPlace() {
    if (!mode.ok) { toast('Can’t place it there', canPlace(state, mode.type, ghost.i, ghost.j, ghost.rot, mode.ignoreId).reason); return; }
    const o = mode;
    const { i, j, rot } = ghost;
    endMode();
    if (o.ignoreId) {
      const rec = state.buildings.find((b) => b.id === o.ignoreId);
      Object.assign(rec, { i, j, rot });
      bld.rebuild(rec, false);
      syncWorld(); persist(); hud();
      return;
    }
    const rec = { id: `b${state.buildSeq++}`, type: o.type, i, j, rot, level: 1, builtOn: today, story: '' };
    state.buildings.push(rec);
    const big = byId[o.type].kind !== 'decor';
    bld.add(rec, !big);
    if (big) living.construct(rec, () => { syncWorld(); });
    sound.thud(); noteBuild(state, today);
    note(state, today, 'built', { name: byId[o.type].name });
    syncWorld();
    o.onPlace && o.onPlace(rec);
    emit('placed', rec);
    afterProgress();
  }
  function endMode() {
    if (mode?.ignoreId) { const v = bld.views.get(mode.ignoreId); if (v) v.obj.visible = true; }
    mode = null; ghost.hide(); setModeUI(false); controls.enabled = true;
  }
  function startRoads() {
    closePanel();
    mode = { kind: 'road', erase: false, added: 0 };
    setModeUI(true);
    const draw = () => {
      modebar.innerHTML = `<span class="mhint" id="mhint">${mode.pan ? 'Looking around: drag to move, pinch to zoom. Tap the hammer to build again.' : mode.erase ? 'Tap or drag along a road to remove it.' : `Tap or drag across the grass to lay road · ${ROAD_COST} coins a tile`}</span><div class="mbtns">${panToggle()}<div class="seg"><button type="button" data-m="lay" aria-pressed="${!mode.erase}">Lay road</button><button type="button" data-m="erase" aria-pressed="${mode.erase}">Remove</button></div><button type="button" class="btn go-btn" data-m="done">Done</button></div>`;
    };
    mode.draw = draw; draw();
  }
  /* Move/Build switch: ✥ = look around (drag pans the map), 🔨 = build (drag lays road / moves the building). */
  function panToggle() {
    return mode.pan
      ? `<button type="button" class="btn soft icon tool-toggle on" data-m="pan" aria-label="Build mode">${svgI('hammer', 'currentColor', 22, 2.4)}<span>Build</span></button>`
      : `<button type="button" class="btn soft icon tool-toggle" data-m="pan" aria-label="Move around">${svgI('move', 'currentColor', 22, 2.2)}<span>Move</span></button>`;
  }
  function paintRoad(i, j) {
    const k = `${i},${j}`;
    if (mode.erase) {
      const r = canRemoveRoad(state, i, j);
      if (!r.ok) { if (state.roads.includes(k)) toast('That road is needed', r.reason); return; }
      state.roads.splice(state.roads.indexOf(k), 1);
    } else {
      if (!canPlaceRoad(state, i, j).ok) return;
      if (!spend(state, ROAD_COST)) { toast('Out of coins for roads', 'Check off tasks to earn more'); return; }
      state.roads.push(k); mode.added++;
      if (mode.added === 1) { win('road'); sound.pop(); }
    }
    syncWorld(); hud(); persist();
  }
  modebar.addEventListener('click', (e) => {
    const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
    if (m === 'pan') { mode.pan = !mode.pan; mode.draw(); return; }
    if (m === 'cancel') endMode();
    if (m === 'rotate') { ghost.move(ghost.i, ghost.j, (ghost.rot + 1) % 4); validate(); }
    if (m === 'place') confirmPlace();
    if (m === 'lay' || m === 'erase') { mode.erase = m === 'erase'; mode.draw(); }
    if (m === 'done') { if (mode.added) noteBuild(state, today); endMode(); afterProgress(); }
  });

  /* ---------- Pointer input ---------- */
  const canvas = $('scene');
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
  const pointers = new Set();
  let down = null, drag = null;
  function groundAt(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(ground, hitP) ? hitP.clone() : null;
  }
  const tileUnder = (p, fw = 1, fd = 1) => ({ i: Math.round(p.x + HALF - fw / 2), j: Math.round(p.z + HALF - fd / 2) });
  canvas.addEventListener('pointerdown', (e) => {
    pointers.add(e.pointerId);
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (pointers.size > 1) { drag = null; return; }
    const p = groundAt(e);
    if (mode?.pan) return;
    if (mode?.kind === 'place' && p) {
      const [w, d] = byId[mode.type].size; const [fw, fd] = ghost.rot % 2 ? [d, w] : [w, d];
      const c = footprintCenter(mode.type, ghost.i, ghost.j, ghost.rot);
      if (Math.abs(p.x - c.x) <= fw / 2 + 0.3 && Math.abs(p.z - c.z) <= fd / 2 + 0.3) { drag = { kind: 'ghost', fw, fd }; controls.enabled = false; }
    } else if (mode?.kind === 'road' && p && e.pointerType !== 'mouse' || (mode?.kind === 'road' && e.button === 0)) {
      drag = { kind: 'road', last: null }; controls.enabled = false;
      if (p) { const [ti, tj] = tileOf(p.x, p.z); drag.last = `${ti},${tj}`; paintRoad(ti, tj); }
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = groundAt(e); if (!p) return;
    if (drag.kind === 'ghost') { const t = tileUnder(p, drag.fw, drag.fd); if (t.i !== ghost.i || t.j !== ghost.j) { ghost.move(t.i, t.j); validate(); } }
    if (drag.kind === 'road') { const [ti, tj] = tileOf(p.x, p.z); const k = `${ti},${tj}`; if (k !== drag.last) { drag.last = k; paintRoad(ti, tj); } }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (drag) { drag = null; controls.enabled = true; return; }
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 450;
    down = null;
    if (moved > 8 || !quick || e.type === 'pointercancel') return;
    onTap(e);
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  function onTap(e) {
    const p = groundAt(e);
    if (mode?.kind === 'place') { if (p && !mode.pan) { const [w, d] = byId[mode.type].size; const t = tileUnder(p, ghost.rot % 2 ? d : w, ghost.rot % 2 ? w : d); ghost.move(t.i, t.j); validate(); } return; }
    if (mode) return;
    ray.setFromCamera(ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const sh = ray.intersectObjects([...sur.targets, ...walkers.familyObjs(), ...walkers.peopleObjs()], true).find((h) => { let o = h.object; while (o && !o.userData.surprise) o = o.parent; return o && o.visible; });
    if (sh) {
      let o = sh.object; while (o && !o.userData.surprise) o = o.parent;
      const kind = o.userData.surprise;
      if (kind === 'neighbor') { const n = living.neighborSays(o.userData.nb); walkers.pause(o, 2600); toast(`${n.name}: “${n.line}”`); fx.heartPop(o.position); sound.pop(); return; }
      if (kind === 'family') { const m = o.userData.member; toast(`${m.name} says hi!`, pick(['Nice work today.', 'This town feels like home.', 'What should we build next?', 'Let’s check something off together.'])); fx.heartPop(o.position); return; }
      fx.heartPop(o.position); sound.pop();
      if (spotSticker(state, kind)) { toast(`You spotted ${STICKERS[kind]}!`, `Sticker book ${state.stickers.length} of ${Object.keys(STICKERS).length} · just for fun`); persist(); }
      return;
    }
    const hit = ray.intersectObjects(bld.hits.children, false)[0];
    if (hit) { sound.tap(); bld.bounce(hit.object.userData.id); openBuilding(hit.object.userData.id); }
  }
  addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });

  /* ---------- Panel clicks ---------- */
  $('panel').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.id === 'panelClose') return;
    const d = b.dataset;
    if (d.tab) { panel.tab = d.tab; renderPanel(); $('panelBody').scrollTop = 0; emit('tab:' + d.tab); return; }
    if (d.cat) { sound.tap(); panel.tab = d.cat; renderPanel(); $('panelBody').scrollTop = 0; emit('tab:' + d.cat); return; }
    if (d.back) { panel.tab = null; renderPanel(); return; }
    if (d.go) { goAction(d.go); return; }
    if (d.ptab) { panel.tab = d.ptab; panel.editing = false; renderPanel(); return; }
    if (d.pf === 'edit') { panel.editing = true; renderPanel(); $('cityNameIn')?.focus(); return; }
    if (d.pf === 'save') { const v = $('cityNameIn').value.trim(); if (v) state.cityName = v; panel.editing = false; persist(); hud(); renderPanel(); return; }
    if (d.due !== undefined) { panel.due = d.due === '1'; renderPanel(); return; }
    if (d.pick) { pickBuilding(d.pick); return; }
    if (d.road) { startRoads(); return; }
    if (d.thup) { upgradeTownHall(); return; }
    if (d.done) { const [l, t] = d.done.split(':'); doTask(l, t, b); return; }
    if (d.gdone) { const [l, g] = d.gdone.split(':'); openGoalDone(l, g); return; }
    if (d.gconfirm) { goalReached(b); return; }
    if (d.addt) { openBuilder({ mode: 'add', listId: d.addt, kind: 'task', lockKind: true, prev: snapshot() }); return; }
    if (d.addg) { openBuilder({ mode: 'add', listId: d.addg, kind: 'goal', lockKind: true, prev: snapshot() }); return; }
    if (d.addsub) { const [l, g] = d.addsub.split(':'); openBuilder({ mode: 'step', listId: l, goalId: g, prev: snapshot() }); return; }
    if (d.newlist) { openBuilder({ mode: 'add', buildingId: d.newlist, prev: snapshot() }); return; }
    if (d.bkind) { readGoalForm(); const dr = panel.draft; dr.kind = d.bkind; renderPanel(); (d.bkind === 'goal' ? $('gfGoal') : $('panelBody').querySelector('[data-tt]'))?.focus(); return; }
    if (d.trm !== undefined && panel?.kind === 'goal') { readGoalForm(); panel.draft.tasks.splice(+d.trm, 1); renderPanel(); return; }
    if (d.tedit) { const [l, t] = d.tedit.split(':'); const task = state.lists.find((x) => x.id === l)?.tasks.find((x) => x.id === t); if (task) openPanel('taskEdit', { listId: l, taskId: t, edit: { title: task.title, freq: freqCode(task), who: task.who || null }, prev: snapshot() }); return; }
    if (d.twho !== undefined && panel?.kind === 'taskEdit') { readEdit(); panel.edit.who = d.twho || null; renderPanel(); return; }
    if (d.tsave) { readEdit(); const [l, t] = d.tsave.split(':'); updateTask(state, l, t, { title: panel.edit.title, freq: panel.edit.freq, who: panel.edit.who }); persist(); hud(); toast('Task updated'); back(panel.prev); return; }
    if (d.tpause) { const [l, t] = d.tpause.split(':'); const task = state.lists.find((x) => x.id === l)?.tasks.find((x) => x.id === t); if (!task) return; readEdit(); updateTask(state, l, t, { title: panel.edit.title, freq: panel.edit.freq, who: panel.edit.who, paused: !task.paused }); persist(); hud(); toast(task.paused ? 'Task is resting' : 'Welcome back!', task.paused ? 'It won’t show as due until you resume it' : 'It’s back on the list'); back(panel.prev); return; }
    if (d.tw !== undefined && panel?.kind === 'goal') { readGoalForm(); const row = panel.draft.tasks[+d.tw]; const names = [null, ...people().map((m) => m.name)]; row.who = names[(names.indexOf(row.who) + 1) % names.length]; renderPanel(); return; }
    if (d.gedit) { const [l, g] = d.gedit.split(':'); const goal = state.lists.find((x) => x.id === l)?.goals.find((x) => x.id === g); if (goal) openPanel('goalEdit', { listId: l, goalId: g, edit: { title: goal.title, target: goal.target || '' }, prev: snapshot() }); return; }
    if (d.gclear) { readEdit(); panel.edit.target = ''; renderPanel(); return; }
    if (d.gsave) { readEdit(); const [l, g] = d.gsave.split(':'); updateGoal(state, l, g, { title: panel.edit.title, target: panel.edit.target || null }); persist(); toast('Goal updated', panel.edit.target ? 'Target date set. No pressure, it’s just a guide.' : ''); back(panel.prev); return; }
    if (d.gpause) { const [l, g] = d.gpause.split(':'); const goal = state.lists.find((x) => x.id === l)?.goals.find((x) => x.id === g); if (!goal) return; updateGoal(state, l, g, { paused: !goal.paused }); persist(); hud(); toast(goal.paused ? 'Goal is resting' : 'Goal is back on', goal.paused ? 'Its steps won’t show as due' : 'Pick up right where you left off'); back(panel.prev); return; }
    if (d.gdel) { if (!panel.edit.confirm) { panel.edit.confirm = true; b.textContent = 'Tap again to remove'; return; } const [l, g] = d.gdel.split(':'); removeGoal(state, l, g); persist(); hud(); toast('Goal removed'); back(panel.prev); return; }
    if (d.lpause) { const [l, on] = d.lpause.split(':'); setListPaused(state, l, on === '1', today); persist(); hud(); toast(on === '1' ? 'This list is resting' : 'Welcome back!', on === '1' ? 'Nothing here is due. Your streak and progress are safe.' : 'Everything is back on the list'); renderPanel(); return; }
    if (d.tdel) { const [l, t] = d.tdel.split(':'); removeTask(state, l, t); persist(); hud(); toast('Task removed', 'Progress you made still counts'); back(panel.prev); return; }
    if (d.ideas) { const [sec, src] = d.ideas.split(':'); if (src === 'draft') { readGoalForm(); openPanel('ideas', { section: sec, draft: panel.draft, builderPrev: panel.prev, added: new Set() }); } else openPanel('ideas', { section: sec, listId: src, added: new Set(), prev: snapshot() }); return; }
    if (d.idea) { addIdea(d.idea, b); return; }
    if (d.ideaback) { openPanel('goal', { draft: panel.draft, prev: panel.builderPrev }); return; }
    if (d.ribbon) { cutRibbon(d.ribbon, b); return; }
    if (d.ta) { toolAction(d.ta, d.id, b); return; }
    if (d.reviewopen) { openPanel('review', { prev: snapshot() }); return; }
    if (d.review) { const r = reviewWeek(state, today); if (r) { flyRewards(centerOf(b), r.reward); sound.chime(); toast('Week reviewed', 'See you next week'); afterProgress(); renderPanel(); } return; }
    if (d.upgrade) { upgradeHome(d.upgrade); return; }
    if (d.move) { const r = state.buildings.find((x) => x.id === d.move); startPlacement({ type: r.type, ignoreId: r.id, start: { i: r.i, j: r.j }, rot: r.rot, level: r.level }); return; }
    if (d.remove) { const r = state.buildings.find((x) => x.id === d.remove); state.buildings.splice(state.buildings.indexOf(r), 1); bld.remove(r.id); syncWorld(); closePanel(); persist(); hud(); return; }
    if (d.addtask) { readGoalForm(); const dr = panel.draft; dr.tasks.push(...blankRows(1)); renderPanel(); $('panelBody').querySelector(`[data-tt="${dr.tasks.length - 1}"]`)?.focus(); return; }
    if (d.savegoal) { saveGoalForm(); return; }
    if (d.btab) { panel.tab = d.btab; renderPanel(); $('panelBody').scrollTop = 0; return; }
    if (d.bank) { bankAction(d.bank, b); return; }
    if (d.txtype) { readTx().type = d.txtype; renderPanel(); return; }
    if (d.txcat) { readTx().cat = d.txcat; renderPanel(); return; }
    if (d.bal) { const [kind, id] = d.bal.split(':'); const v = $('panelBody').querySelector(`[data-balin="${d.bal}"]`).value; const r = updateBalance(state, kind, id, v); if (r) { flyRewards(centerOf(b), r.reward); sound.coin(); toast('Balance updated', 'Keeping it current is a money skill too'); moneyUp(r.levelUp); afterProgress(); renderPanel(); } return; }
    if (d.pay && panel?.kind === 'bank') { const v = $('panelBody').querySelector(`[data-payin="${d.pay}"]`).value; const r = payDebt(state, d.pay, v, today); if (!r) { toast('Enter a payment amount'); return; } sound.coin(); if (r.paidOff) { fx.fireworks(controls.target, 6, () => sound.firework()); toast(`${r.debt.name} is paid off!`, 'Roll that whole payment onto the next debt. That’s the snowball.'); } else toast('Payment recorded', `${catById('debt').short} · snowball keeps rolling`); moneyUp(r.levelUp); afterProgress(); renderPanel(); return; }
    if (d.bs) { readBudgetSetup(); const dr = panel.draft; if (d.bs === 'back') { dr.step = Math.max(0, dr.step - 1); renderPanel(); return; } if (dr.step === 1 && !dr.incomes.some((i) => toMoney(i.amount) > 0)) { toast('Add at least one paycheck amount'); return; } if (dr.step < 3) { dr.step++; renderPanel(); $('panelBody').scrollTop = 0; return; } const r = setupBudget(state, { incomes: dr.incomes, expenses: dr.expenses }, today); if (r.first) { flyRewards(centerOf(b), { coins: 40, xp: 25 }); sound.chime(); toast('Your budget is set!', 'Log transactions at the Bank to level up your money skills'); } else toast('Budget updated'); moneyUp(r.levelUp); afterProgress(); openPanel('bank', { tab: 'budget', ui: {} }); return; }
    if (d.incadd) { readBudgetSetup(); panel.draft.incomes.push({ name: '', amount: '', freq: 'biweekly', next: nextFridayKey() }); renderPanel(); return; }
    if (d.incdel) { readBudgetSetup(); panel.draft.incomes.splice(+d.incdel, 1); renderPanel(); return; }
    if (d.pay2 === 'show') { paydayShow(); return; }
    if (d.pay2 === 'send') { paydaySend(b); return; }
    if (d.cal === 'prev' || d.cal === 'next') { panel.ym = shiftMonth(panel.ym, d.cal === 'prev' ? -1 : 1); panel.sel = panel.ym === ymOf(today) ? today : `${panel.ym}-01`; renderPanel(); return; }
    if (d.cal === 'budget') { const v = parseFloat(String($('outBudget').value).replace(/[^0-9.]/g, '')) || 0; state.settings.outingBudget = Math.round(v); persist(); renderPanel(); toast('Outing budget saved', v ? `$${Math.round(v)} a month for outings` : 'No monthly limit'); return; }
    if (d.cal === 'new') { openEventForm({ date: d.date }); return; }
    if (d.cal === 'icsall') { downloadIcs(state.events.filter((e) => e.date >= today && !e.done), 'life-city-outings.ics'); return; }
    if (d.day && panel?.kind === 'calendar') { panel.sel = d.day; panel.ym = ymOf(d.day); renderPanel(); return; }
    if (d.ics) { const ev = state.events.find((x) => x.id === d.ics); if (ev) downloadIcs([ev], `${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'outing'}.ics`); return; }
    if (d.evedit) { openEventForm({ id: d.evedit }); return; }
    if (d.esec) { readJournalForm(); panel.draft.section = d.esec; renderPanel(); return; }
    if (d.who) { readJournalForm(); const w = panel.draft.who; const i = w.indexOf(d.who); if (i >= 0) w.splice(i, 1); else w.push(d.who); renderPanel(); return; }
    if (d.evsave) {
      readJournalForm();
      const dr = panel.draft;
      if (!dr.title.trim()) { toast('Give it a name', 'Like “Zoo day” or “Pizza and a movie”'); $('evTitle')?.focus(); return; }
      if (dr.id) updateEvent(state, dr.id, { title: dr.title.trim(), date: dr.date, time: dr.time, section: dr.section, place: dr.place, budget: dr.budget, who: dr.who, notes: dr.notes });
      else { addEvent(state, dr); win('outing', centerOf(b)); sound.chime(); }
      note(state, today, 'planned', { title: dr.title });
      persist(); hud();
      openPanel('calendar', { ym: ymOf(dr.date), sel: dr.date });
      toast(dr.id ? 'Outing updated' : 'Outing added', dr.budget ? `$${dr.budget} set aside in this month's plan` : 'Tap “Add to my calendar” to put it on your phone');
      return;
    }
    if (d.evdel) { const dr = panel.draft; removeEvent(state, dr.id); persist(); hud(); openPanel('calendar', { ym: ymOf(dr.date), sel: dr.date }); return; }
    if (d.went) { const ev = state.events.find((x) => x.id === d.went); if (ev) openMemoryForm({ section: ev.section, date: ev.date, eventId: ev.id, eventTitle: ev.title, spent: ev.budget || '' }); return; }
    if (d.mem === 'new') { openMemoryForm({ date: d.date }); return; }
    if (d.memo) { const [lid, tid] = d.memo.split(':'); const l = state.lists.find((x) => x.id === lid); const t = l?.tasks.find((x) => x.id === tid); if (l) openMemoryForm({ section: l.section, taskTitle: t?.title }); return; }
    if (d.msec) { readJournalForm(); panel.draft.section = d.msec; renderPanel(); return; }
    if (d.memsave) { saveMemory(b); return; }
    if (d.memskip) { saveMemory(b, true); return; }
    if (d.mfilter !== undefined) { panel.filter = d.mfilter || null; renderPanel(); return; }
    if (d.memview) { openPanel('memview', { id: d.memview }); return; }
    if (d.memdel) { const m = removeMemory(state, d.memdel); if (m?.photoId) deletePhoto(m.photoId); persist(); openPanel('memories'); toast('Memory removed'); return; }
    if (d.ttab) { panel.tab = d.ttab; renderPanel(); return; }
    if (d.claimc) { const c = claimChallenge(state, d.claimc, today); if (c) { flyRewards(centerOf(b), c); sound.chime(); afterProgress(); renderPanel(); } return; }
    if (d.claimm) { const m = claimMilestone(state, d.claimm); if (m) { flyRewards(centerOf(b), m); sound.chime(); afterProgress(); renderPanel(); } return; }
    if (d.close) { if (panel?.kind === 'goalDone' && panel.prev) back(panel.prev); else closePanel(); return; }
    if (d.menu) { menuAction(d.menu, b); }
  });
  function doTask(listId, taskId, el) {
    const before = state.lists.find((l) => l.id === listId);
    const lv0 = before ? useLevel(before) : 1;
    const r = completeTask(state, listId, taskId, today);
    if (!r) return;
    sound.pop(); later(120, () => sound.coin());
    const extra = { coins: (r.visit?.coins || 0) + (r.streakBonus?.coins || 0), xp: (r.visit?.xp || 0) + (r.streakBonus?.xp || 0) };
    flyRewards(centerOf(el), { coins: r.reward.coins + extra.coins, xp: r.reward.xp + extra.xp });
    bld.bounce(r.list.buildingId);
    const v = bld.views.get(r.list.buildingId);
    if (v) fx.coinBurst(v.top.clone().add(new THREE.Vector3(0, -0.2, 0)));
    win('task', centerOf(el));
    if (r.streakBonus) { later(500, () => { sound.chime(); fx.confetti(v?.top || controls.target); toast(`${r.streakBonus.days}-day streak!`, `+${r.streakBonus.coins} coins · +${r.streakBonus.xp} XP bonus`); }); }
    else if (r.visit) toast('Welcome back!', `Daily visit +${r.visit.coins} coins${r.streakDays > 1 ? ` · ${r.streakDays}-day streak` : ''}`);
    else if (!r.full && !state.stats.tokenNoted) { state.stats.tokenNoted = true; toast('Over-achiever!', 'After 6 check-offs a day, extras earn a small bonus. Steady beats more.'); }
    /* Steady use grows the building. */
    const lv1 = useLevel(r.list);
    const rec = state.buildings.find((x) => x.id === r.list.buildingId);
    if (rec && lv1 > lv0 && lv1 > (rec.level || 1)) {
      rec.level = lv1;
      later(1200, () => { toast(`${byId[rec.type].name} is growing!`, `${lv1 === 2 ? 10 : 30} days of steady use`); living.construct(rec, () => { syncWorld(); persist(); }); });
    }
    noteStreak(state, today);
    if (r.task.who && state.family.some((m) => m.name === r.task.who && m.kind === 'kid')) { TL.ensureTools(state); markUse(state, 'kids', today); const st = TL.giveStar(state, r.task.who, 'Chore done', today); if (st) later(700, () => toast(`⭐ for ${r.task.who}!`, `${st.stars} stars · spend them in Kids’ Corner`)); }
    living.refresh();
    if (totalDue(state, today) === 0) later(900, () => { fx.fireworks(controls.target, 4, () => sound.firework()); toast('Everything due today is done!', 'The town is celebrating'); });
    emit('task');
    afterProgress(); renderPanel();
  }
  /* ---------- Building tools ---------- */
  function cutRibbon(id, el) {
    if (!TL.openTool(state, id, today)) return;
    const p = panel; const t = TL.toolById[id];
    const v = bld.views.get(p.buildingId);
    sound.chime(); later(250, () => sound.firework());
    if (v) { fx.confetti(v.top); fx.fireworks(v.top, 3, () => sound.firework()); bld.bounce(p.buildingId); }
    flyRewards(centerOf(el), { xp: 10 });
    state.xp += 10;
    note(state, today, 'built', { name: `${t.name} at the ${byId[state.buildings.find((x) => x.id === p.buildingId)?.type]?.name || 'town'}` });
    toast(`${t.name} is open!`, `${t.keeper} says welcome`);
    openPanel('tool', { tool: id, buildingId: p.buildingId, tab: TOOL_TABS[id][0][0], ui: {} });
    afterProgress();
  }
  function toolReward(el, r, main, sub) { if (r) { flyRewards(centerOf(el), r); sound.coin(); } else sound.pop(); if (main) toast(main, sub); }
  const KID_COLORS = ['#F28CA0', '#F2B54A', '#4CAF6A', '#9A72D6', '#4E9BCB', '#E8643F'];
  function toolAction(a, id, el) {
    const p = panel, ui = p.ui || (p.ui = {});
    const clear = (...keys) => keys.forEach((k) => { ui[k] = ''; });
    const need = (val, msg) => { if (val && String(val).trim()) return true; toast(msg); return false; };
    switch (a) {
      case 'tab': p.tab = id; break;
      case 'quest': { const r = TL.claimQuest(state, p.tool); if (r) { flyRewards(centerOf(el), r); sound.chime(); fx.confetti(bld.views.get(p.buildingId)?.top || controls.target); toast('First step done!', `+${r.coins} coins · +${r.xp} XP`); } break; }
      /* meals */
      case 'rnew': Object.assign(ui, { rid: null, rname: '', ring: '', rnotes: '' }); p.tab = 'recipe'; break;
      case 'redit': { const r = state.meals.recipes.find((x) => x.id === id); if (r) { Object.assign(ui, { rid: r.id, rname: r.name, ring: r.ingredients.join('\n'), rnotes: r.notes }); p.tab = 'recipe'; } break; }
      case 'rsave': { if (!need(ui.rname, 'Name the recipe first')) return; const data = { name: ui.rname, ingredients: ui.ring || '', notes: ui.rnotes || '' }; if (ui.rid) TL.updateRecipe(state, ui.rid, data); else TL.addRecipe(state, data); toolReward(el, null, ui.rid ? 'Recipe updated' : 'Recipe saved', 'Pick it for a night on This week'); clear('rname', 'ring', 'rnotes'); ui.rid = null; p.tab = 'recipes'; break; }
      case 'rdel': TL.removeRecipe(state, id); toast('Recipe removed'); p.tab = 'recipes'; break;
      case 'rstarter': { const [n, ing, notes] = TL.STARTER_RECIPES[+id]; TL.addRecipe(state, { name: n, ingredients: ing, notes }); toolReward(el, null, `${n} added`, 'Edit it any time to match how your family makes it'); break; }
      case 'mweek': ui.week = id; break;
      case 'gbuild': { const n = TL.buildGroceryList(state, ui.week || today); p.tab = 'list'; toast(n ? `${n} items added to the list` : 'Nothing new to add', n ? 'Check them off at the store' : 'Plan some dinners with recipes first'); break; }
      case 'gadd': if (!need(ui.gitem, 'Type an item first')) return; TL.addGroceryItem(state, ui.gitem); clear('gitem'); sound.pop(); break;
      case 'gtoggle': TL.toggleGroceryItem(state, id); sound.pop(); break;
      case 'gclear': TL.clearGroceryDone(state); toast('Cart cleared', 'Nice shopping trip'); break;
      case 'mclaim': { const r = TL.claimMealPlan(state, today); toolReward(el, r, 'Week of dinners planned!', 'Future you says thanks'); break; }
      /* car & home care */
      case 'thadd': { const th = TL.addThing(state, ui.thname, id); clear('thname'); toast(`${th.name} added`, 'We filled in the usual upkeep. Set when each was last done.'); break; }
      case 'cthdel': if (ui.confirm !== id) { ui.confirm = id; el.textContent = 'Tap again to remove'; return; } TL.removeThing(state, id); ui.confirm = null; break;
      case 'clast': { if (!need(ui[`last_${id}`], 'Pick the date it was last done')) return; const it = TL.setCareLast(state, id, ui[`last_${id}`]); toast('Got it', it ? `Next one: ${shortDate(TL.careNext(it))}` : ''); break; }
      case 'clog': { const r = TL.logCare(state, id, today); if (r) toolReward(el, r.reward, `${r.item.name} logged`, `Next one around ${shortDate(TL.careNext(r.item))}`); break; }
      case 'cidel': TL.removeCareItem(state, id); break;
      case 'ciadd': if (!need(ui[`cin_${id}`], 'Name it first')) return; TL.addCareItem(state, id, ui[`cin_${id}`], ui[`cim_${id}`] || 12); clear(`cin_${id}`); break;
      /* subscriptions */
      case 'sadd': if (!need(ui.sname, 'Name the subscription')) return; TL.addSub(state, { name: ui.sname, amount: ui.samt, cycle: ui.scycle, day: today }); clear('sname', 'samt'); sound.pop(); break;
      case 'skeep': { const r = TL.keepSub(state, id, today); if (r) toolReward(el, r.reward, `Keeping ${r.sub.name}`, 'Checked in. See you in 6 months.'); break; }
      case 'scancel': { const r = TL.cancelSub(state, id, today); if (r) { toolReward(el, r.reward, `${r.sub.name} canceled!`, 'That money stays with your family now'); fx.fireworks(bld.views.get(p.buildingId)?.top || controls.target, 3, () => sound.firework()); } break; }
      case 'sdel': TL.removeSub(state, id); break;
      /* birthdays & cards */
      case 'padd': { if (!need(ui.pname, 'Add a name')) return; if (!need(ui.pdate, 'Pick the date')) return; const pp = TL.addPerson(state, { name: ui.pname, date: ui.pdate, kind: ui.pkind, day: today }); if (pp) { clear('pname', 'pdate'); toast(`${pp.name} added`, `You’ll get a heads-up a week before`); sound.pop(); } break; }
      case 'pdel': TL.removePerson(state, id); break;
      case 'csent': { const r = TL.markCardSent(state, id, today); if (r) toolReward(el, r.reward, `Card for ${r.person.name} sent 💌`, 'Little things mean a lot'); break; }
      case 'tyadd': if (!need(ui.tyto, 'Who are you thanking?')) return; TL.addThanks(state, ui.tyto, ui.tyfor); clear('tyto', 'tyfor'); sound.pop(); break;
      case 'tysent': { const r = TL.thanksSent(state, id, today); if (r) toolReward(el, r.reward, `Thank-you to ${r.note.to} sent`, 'Gratitude is a good habit'); break; }
      /* date night jar */
      case 'dfilter': ui.dfilter = id; break;
      case 'ddraw': { const i = TL.drawDate(state, ui.dfilter || 'any'); if (!i) { toast('No ideas match', 'Add some under All ideas'); return; } ui.drawn = i.id; ui.ddate = ''; sound.pop(); break; }
      case 'ddate': break;
      case 'dplan': { const nf = (() => { for (let k = 1; k <= 7; k++) { const d2 = addDays(today, k); if (new Date(d2 + 'T12:00').getDay() === 5) return d2; } return addDays(today, 1); })(); const ev = TL.planDate(state, id, ui.ddate || nf, state.family.filter((m) => m.kind === 'adult').map((m) => m.name)); if (ev) { win('outing', centerOf(el)); sound.chime(); toast(`${ev.title} is on the calendar`, `${weekday(ev.date)}, ${shortDate(ev.date)} · have fun!`); ui.drawn = null; } break; }
      case 'dadd': if (!need(ui.dtext, 'Type an idea first')) return; TL.addDateIdea(state, ui.dtext, ui.dcost || 'free'); clear('dtext'); sound.pop(); break;
      case 'ddel': TL.removeDateIdea(state, id); break;
      /* kids */
      case 'kadd': { if (!need(ui.kname, 'Add a first name')) return; const m = TL.addKid(state, ui.kname, KID_COLORS[state.family.length % KID_COLORS.length]); if (!m) { toast('That name is already in the family'); return; } walkers.addFamily([m]); clear('kname'); toast(`Welcome, ${m.name}!`, 'Assign chores from any list under “Who does it”'); break; }
      case 'kpick': ui.kid = ui.kid === id ? '' : id; break;
      case 'kstar': { const [n, why] = id.split('|'); const r = TL.giveStar(state, n, why, today); if (r) { toolReward(el, r.reward, `⭐ for ${n}: ${why}`, `${r.stars} stars to spend on rewards`); ui.kid = ''; } break; }
      case 'kredeem': { const [n, rid] = id.split('|'); const r = TL.redeemReward(state, n, rid, today); if (r) { sound.chime(); fx.confetti(bld.views.get(p.buildingId)?.top || controls.target); toast(`${n} earned: ${r.name}! 🎉`, 'Enjoy it together'); } break; }
      case 'kradd': if (!need(ui.krname, 'Name the reward')) return; TL.addKidReward(state, ui.krname, ui.krcost || 10); clear('krname'); break;
      case 'krdel': TL.removeKidReward(state, id); break;
      case 'kbook': { if (!need(ui[`book_${id}`], 'Type the book title')) return; const r = TL.logBook(state, id, ui[`book_${id}`], today); if (r) { toolReward(el, r.reward, `📚 ${id} finished “${r.book.title}”`, `+1 star · ${TL.booksThisYear(state, id, today)} books this year`); clear(`book_${id}`); } break; }
      /* family meeting */
      case 'mfinish': {
        const checkins = {};
        for (const m of state.family.filter((x) => x.kind !== 'pet')) { const hi = ui[`hi_${m.name}`] || '', lo = ui[`lo_${m.name}`] || ''; if (hi || lo) checkins[m.name] = { high: hi, low: lo }; }
        const r = TL.holdMeeting(state, { wins: ui.mwins, checkins, focus: ui.mfocus, notes: ui.mnotes }, today);
        if (!r) return;
        flyRewards(centerOf(el), r.reward); sound.chime();
        fx.fireworks(thc, 4, () => sound.firework());
        note(state, today, 'meeting', { focus: r.meeting.focus });
        toast('Family meeting done!', r.meeting.focus ? `This week’s focus: ${r.meeting.focus}` : 'See you next week');
        p.ui = {};
        break;
      }
      /* logbooks */
      case 'lsub': ui.subject = id; break;
      case 'laddsubopen': ui.addsub = true; break;
      case 'laddsub': {
        const n = (ui.newsub || '').trim(); if (!need(n, 'Type a name')) return;
        if (p.tool === 'repair') TL.addThing(state, n, 'car');
        else if (p.tool === 'vet') { const m = LB.addPet(state, n, ['#C9A06A', '#3A2A1E', '#F2E2CF', '#8A5A30'][state.family.length % 4]); if (!m) { toast('That name is already in the family'); return; } walkers.addFamily([m]); }
        else LB.addLogPerson(state, n);
        Object.assign(ui, { subject: n, addsub: false, newsub: '' }); toast(`${n} added`); break;
      }
      case 'lnew': {
        for (const k of Object.keys(ui)) if (k.startsWith('f_')) delete ui[k];
        if (ui.photoPreview) URL.revokeObjectURL(ui.photoPreview);
        Object.assign(ui, { form: true, eid: null, photoBlob: null, photoPreview: null, photoId: null, f_subject: ui.subject || LB.logSubjects(state, p.tool)[0] || '' });
        if (id) ui.f_kind = id;
        p.tab = 'log'; break;
      }
      case 'ledit': {
        const e = state.logs[p.tool].find((x) => x.id === id); if (!e) return;
        for (const k of Object.keys(ui)) if (k.startsWith('f_')) delete ui[k];
        for (const f of LB.LOGS[p.tool].fields) if (f.type !== 'photo' && e[f.k] != null) ui[`f_${f.k}`] = String(e[f.k]);
        Object.assign(ui, { form: true, eid: e.id, f_subject: e.subject || '', photoBlob: null, photoPreview: null, photoId: e.photoId || null, confirm: null });
        p.tab = 'log'; $('panelBody').scrollTop = 0; break;
      }
      case 'lquick': ui.f_what = id; break;
      case 'lcancel': ui.form = false; ui.eid = null; break;
      case 'lsave': saveLog(el); return;
      case 'ldel': { if (ui.confirm !== id) { ui.confirm = id; el.textContent = 'Tap again to remove'; return; } const e = LB.removeLogEntry(state, p.tool, id); if (e?.photoId) deletePhoto(e.photoId); Object.assign(ui, { form: false, eid: null, confirm: null }); toast('Entry removed'); break; }
      case 'lhandled': {
        const e = LB.markHandled(state, p.tool, id); if (!e) return;
        if (p.tool === 'vet') { for (const k of Object.keys(ui)) if (k.startsWith('f_')) delete ui[k]; Object.assign(ui, { form: true, eid: null, f_subject: e.subject || '', f_what: e.what, f_type: e.type, photoBlob: null, photoPreview: null, photoId: null }); p.tab = 'log'; toast('Nice! Log the visit', 'Add the next due date if there is one'); }
        else { toast('Marked renewed', 'Edit the record to set the new expiration date'); ui.form = false; }
        break;
      }
      default: return;
    }
    const USE = { rsave: 'meals', rstarter: 'meals', mclaim: 'meals', gbuild: 'meals', clog: 'care', clast: 'care', sadd: 'subs', skeep: 'subs', scancel: 'subs', padd: 'cards', csent: 'cards', tyadd: 'cards', tysent: 'cards', dplan: 'dates', kstar: 'kids', kbook: 'kids', kredeem: 'kids', mfinish: 'meeting' };
    if (USE[a]) markUse(state, USE[a], today);
    persist(); hud(); afterProgress(); renderPanel();
  }
  async function saveLog(el) {
    const p = panel, ui = p.ui, def = LB.LOGS[p.tool];
    const data = { subject: def.subjects ? (ui.f_subject || ui.subject || LB.logSubjects(state, p.tool)[0] || null) : null };
    for (const f of def.fields) if (f.type !== 'photo') data[f.k] = ui[`f_${f.k}`] ?? '';
    const missing = def.fields.find((f) => f.req && !String(data[f.k] || '').trim());
    if (missing) { toast(`Fill in “${missing.label}”`); return; }
    if (def.subjects && !data.subject) { toast(`Add a ${def.subjectLabel.toLowerCase()} first`, `Tap “+ ${def.addLabel}” above`); return; }
    data.photoId = ui.photoId || null;
    if (ui.photoBlob) { const pid = `p${Date.now().toString(36)}`; try { await putPhoto(pid, ui.photoBlob); if (ui.photoId) deletePhoto(ui.photoId); data.photoId = pid; } catch (e) { /* keep going without the photo */ } }
    if (ui.photoPreview) URL.revokeObjectURL(ui.photoPreview);
    if (ui.eid) { LB.updateLogEntry(state, p.tool, ui.eid, data); toast('Entry updated'); }
    else {
      const r = LB.addLogEntry(state, p.tool, data, today);
      if (!r) { toast('Something’s missing'); return; }
      toolReward(el, r.reward, 'Logged', r.linked.length ? `Car Care updated too: ${r.linked.join(', ')}` : 'It’s in the history now');
      markUse(state, p.tool, today);
    }
    Object.assign(ui, { form: false, eid: null, photoBlob: null, photoPreview: null, photoId: null });
    persist(); hud(); afterProgress(); renderPanel();
  }

  /* ---------- Menu + paper ---------- */
  function renderMenu(confirm) {
    const q = state.settings.quality;
    const seg = (v, l) => `<button type="button" data-menu="q:${v}" aria-pressed="${q === v}">${l}</button>`;
    return `<p class="hint"><b>${esc(state.cityName)}</b> · started ${shortDate(state.startDate)} · ${streak(state, today)}-day streak</p>
      <div class="set-row"><span>Town paper</span><button type="button" class="btn soft small" data-menu="paper">Read it</button></div>
      <div class="set-row"><span>Sound and haptics</span><button type="button" class="btn soft small" data-menu="sound">${state.settings.sound ? 'On' : 'Off'}</button></div>
      <div class="set-row"><span>Day and night<br><small>Auto follows your clock</small></span><div class="seg">${['auto', 'day', 'night'].map((v) => `<button type="button" data-menu="sky:${v}" aria-pressed="${skyMode() === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div></div>
      <div class="set-row"><span>Quality<br><small>Now: ${stage.quality === 'high' ? 'High' : 'Battery saver'}</small></span><div class="seg">${seg('auto', 'Auto')}${seg('high', 'High')}${seg('saver', 'Battery saver')}</div></div>
      <div class="set-row"><span>Guided tour</span><button type="button" class="btn soft small" data-menu="tour">Replay</button></div>
      <div class="set-row"><span>Start over<br><small>Clears this town from this device</small></span>${confirm ? '<button type="button" class="btn go-btn small" data-menu="reset">Yes, start over</button>' : '<button type="button" class="btn soft small" data-menu="ask">Start over</button>'}</div>
      <p class="foot">Life City · progress is saved in this browser only.${state.demo ? ' You are looking at the sample town.' : ''}</p>`;
  }
  function menuAction(a) {
    if (a === 'paper') { openPanel('paper'); return; }
    if (a === 'sound') { sound.setEnabled(!state.settings.sound); if (state.settings.sound) sound.pop(); }
    if (a.startsWith('sky:')) { state.settings.sky = a.slice(4); state.settings.night = state.settings.sky === 'night'; easeSky(); }
    if (a.startsWith('q:')) { const v = a.slice(2); state.settings.quality = v; stage.setQuality(v === 'auto' ? detectQuality() : v); autoChecked = true; }
    if (a === 'tour') { closePanel(); state.tour = { step: 0, done: false }; runTour(); return; }
    if (a === 'ask') { panel.confirm = true; }
    if (a === 'reset') { clearSave(); clearPhotos().finally(() => location.reload()); return; }
    persist(); renderPanel();
  }
  function renderPaper() {
    const from = addDays(today, -6);
    const week = since(state, from);
    const doneIn = (l) => l.tasks.reduce((n, t) => n + t.done.filter((d) => d >= from && d <= today).length, 0);
    const bySec = {};
    for (const l of state.lists) bySec[l.section] = (bySec[l.section] || 0) + doneIn(l);
    const total = Object.values(bySec).reduce((a, b) => a + b, 0);
    const best = Object.entries(bySec).sort((a, b) => b[1] - a[1])[0];
    const goals = week.filter((e) => e.type === 'goal'), built = week.filter((e) => e.type === 'built'), lv = week.filter((e) => e.type === 'levelup').at(-1);
    const headline = lv ? `${state.cityName} reaches level ${lv.level}` : goals.length ? `Family reaches a big goal: “${goals.at(-1).goal}”` : built.length ? (built.length === 1 ? `New ${built[0].name} opens in town` : `${built.length} new builds go up around town`) : total ? `${total} tasks checked off this week` : `A quiet week in ${state.cityName}`;
    return `<article class="np"><div class="mast">The Life City Gazette</div><div class="dateline"><span>${weekday(today)}, ${shortDate(today)}</span><span>${esc(state.cityName)}</span></div>
      <h2>${esc(headline)}</h2><p>${total ? `The family checked off ${total} ${total === 1 ? 'task' : 'tasks'} this week${best && best[1] ? `, most of them in ${SECTIONS[best[0]].name.toLowerCase()}` : ''}.` : 'One check mark at any building wakes the town back up.'} Population is now ${population(state)}.</p>
      <div class="npcols"><div><h3>Around town</h3><p>${built.length ? `New this week: ${built.map((b) => esc(b.name)).join(', ')}.` : 'No new buildings this week.'}</p></div>
      <div><h3>By area</h3><p>${Object.entries(bySec).map(([s, n]) => `${SECTIONS[s].name} ${n}`).join(' · ') || 'No areas open yet.'}</p></div></div>
      <div class="npcols"><div><h3>Goals reached</h3><p>${goals.length ? goals.map((g) => `“${esc(g.goal)}”`).join(', ') : 'Keep going, the next one is close.'}</p></div>
      <div><h3>Streak</h3><p>${streak(state, today)} ${streak(state, today) === 1 ? 'day' : 'days'} in a row with something checked off.</p></div></div></article>`;
  }

  /* ---------- Bottom buttons ---------- */
  $('btnBuild').onclick = () => { sound.tap(); openPanel('build'); };
  $('btnLists').onclick = () => { sound.tap(); openPanel('lists', { due: false }); };
  $('btnToday').onclick = () => { sound.tap(); openPanel('lists', { due: true }); };
  $('btnTrophy').onclick = () => { sound.tap(); openPanel('profile', { tab: 'achievements' }); };
  $('btnCal').onclick = () => { sound.tap(); openPanel('calendar', { ym: ymOf(today), sel: today }); };
  $('btnMem').onclick = () => { sound.tap(); openPanel('memories'); };
  $('btnWins').onclick = () => { sound.tap(); openPanel('requests'); };
  $('profileBtn').onclick = () => { sound.tap(); openPanel('profile', { tab: 'info' }); };
  function goAction(code) {
    const [kind, id] = code.split(':');
    closePanel();
    const nx = nextSection(state); const unopened = nx && sectionUnlocked(state, nx) ? nx : null;
    if (kind === 'win') {
      if (id === 'task') return openPanel('lists', { due: true });
      if (id === 'home') return openPanel('build', { tab: 'homes' });
      if (id === 'road') return startRoads();
      if (id === 'level3') return openPanel('level');
      if (id === 'memory') return openMemoryForm();
      if (id === 'outing') return openEventForm();
      return openPanel('build', { tab: unopened || null });
    }
    if (id === 'build') return openPanel('build');
    return openPanel('lists', { due: true });
  }
  $('lvlBtn').onclick = () => openPanel('level');
  $('popBtn').onclick = () => openPanel('build', { tab: 'homes' });
  $('coinBtn').onclick = () => openPanel('lists', { due: true });
  $('menuBtn').onclick = () => openPanel('menu');
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (mode) endMode(); else closePanel(); } });

  /* ---------- Guided tour ---------- */
  const tourEl = createTour($('tour'), { onSkip: () => { state.tour.done = true; persist(); } });
  const rectOf = (sel) => () => { const el = typeof sel === 'string' ? document.querySelector(sel) : sel(); if (!el || el.offsetParent === null) return null; return el.getBoundingClientRect(); };
  const firstSection = () => state.buildings.find((b) => byId[b.type].kind === 'section');
  const TOUR = [
    { title: `Welcome to ${state.cityName}!`, text: 'I’m Rosie, your town planner. In this town, real-life goals are what build things. Let’s set up your first one.', button: 'Let’s go', cardAt: 'mid' },
    { title: 'Open the Build menu', text: 'Every part of life has its own building. Tap Build.', target: rectOf('#btnBuild'), until: 'panel:build', cardAt: 'mid' },
    { title: 'Start with To-Do', text: 'Tap the Community Job Board. It holds everyday chores and projects.', target: rectOf('[data-pick="jobboard"]'), until: 'goalform', cardAt: 'top', enter: () => { if (panel?.kind === 'build') { panel.tab = 'todo'; renderPanel(); } } },
    { title: 'Add a task or two', text: 'Something simple, like “Do the dishes”. Pick how often on the right. Want something bigger? Tap + Goal. Then tap Save.', target: rectOf('[data-savegoal]'), until: 'placing', cardAt: 'top' },
    { title: 'Place it by a road', text: 'Drag it where you like. Every building needs to touch a road that leads to the Town Hall. Then tap Place.', target: rectOf('#placeBtn'), until: 'placed', cardAt: 'top' },
    { title: 'Check off a task', text: 'Tap the bubble over your new building, then tap a circle to check off a task. Tasks pay coins and XP.', target: () => { const b = firstSection(); const t = b && document.querySelector(`[data-bub="${b.id}"]`); return t && t.offsetParent ? t.getBoundingClientRect() : (panel?.kind === 'building' ? $('panelBody').querySelector('.check:not([disabled])')?.getBoundingClientRect() : null); }, until: 'task', cardAt: 'top' },
    { title: 'Bring people to town', text: 'Homes add population. You need people to level up. Tap Build, then Housing, and build a Cottage.', target: () => (panel?.kind === 'build' ? (panel.tab === 'homes' ? $('panelBody').querySelector('[data-pick="cottage"]') : panel.tab ? $('panelTabs').querySelector('[data-back]') : $('panelBody').querySelector('[data-cat="homes"]'))?.getBoundingClientRect() : (mode ? $('placeBtn')?.getBoundingClientRect() : rectOf('#btnBuild')())), until: 'home', cardAt: 'top', enter: () => { if (panel && panel.kind !== 'build') closePanel(); } },
    { title: 'You’re on your way!', text: 'Areas open one at a time: Financial next, then Relational once your budget is set, then Physical and Spiritual. Tap 💡 on any list for easy ideas. Showing up daily matters more than adding more.', target: rectOf('#btnWins'), button: 'Finish tour', cardAt: 'mid' }
  ];
  function runTour() {
    const s = TOUR[state.tour.step];
    if (!s || state.tour.done) { tourEl.hide(); state.tour.done = true; persist(); return; }
    tourEl.show({ ...s, onButton: () => advance() });
    s.enter && s.enter();
  }
  function advance() { state.tour.step++; persist(); later(250, runTour); }
  listeners.push((name) => {
    const s = TOUR[state.tour.step];
    if (state.tour.done || !s || tourEl.current == null) return;
    if (s.until === name) advance();
    if (name === 'panel:build' && state.tour.step === 2) TOUR[2].enter?.();
  });

  /* ---------- Layout + daily refresh ---------- */
  addEventListener('resize', () => stage.resize());
  setInterval(() => { if (dateKey() !== today) { today = dateKey(); state.stats.lastDay = today; hud(); renderPanel(); persist(); } }, 60000);

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let autoChecked = state.settings.quality !== 'auto' || stage.quality !== 'high';
  let autoStart = 0;
  stage.renderer.info.autoReset = false;
  const fpsEl = DEBUG ? Object.assign(document.createElement('div'), { className: 'dbg' }) : null;
  if (fpsEl) document.body.appendChild(fpsEl);
  /* Real-clock day and night: dusk from 7pm, night 8:30pm–5:30am, dawn until 7am. */
  function skyMode() { return state.settings.sky || (state.settings.night ? 'night' : 'auto'); }
  function nightTarget() {
    const m = skyMode();
    if (m === 'day') return 0;
    if (m === 'night') return 1;
    const d = new Date(); const h = d.getHours() + d.getMinutes() / 60;
    if (h < 5.5 || h >= 20.5) return 1;
    if (h >= 7 && h < 19) return 0;
    return h < 7 ? 1 - (h - 5.5) / 1.5 : (h - 19) / 1.5;
  }
  function easeSky() { const n0 = stage.night, n1 = nightTarget(); if (Math.abs(n1 - n0) < 0.005) return; tween(1400, (k) => { stage.night = n0 + (n1 - n0) * easeInOut(k); }); }
  stage.night = nightTarget();
  setInterval(easeSky, 60000);
  waterUniforms.uStorm.value = 0.05;
  function frame(now) {
    stage.renderer.info.reset();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    tickTweens(now);
    meter.tick(now);
    waterUniforms.uTime.value = REDUCED ? 0 : t;
    swayUniforms.uTime.value = REDUCED ? 0 : t; swayUniforms.uSway.value = REDUCED ? 0 : 0.05;
    stage.applyMood(stage.night);
    living.tick(dt, t, stage.night);
    walkers.tick(dt, t);
    rail.tick(dt, t);
    sur.tick(dt, t);
    fx.tick(dt);
    ghost.tick(t);
    controls.update();
    stage.followShadows();
    const cd = camera.position.distanceTo(controls.target); scene.fog.near = cd * 1.4; scene.fog.far = cd * 3.2;
    tags.place(camera, 0);
    stage.render();
    if (!autoChecked) {
      if (!autoStart) autoStart = now;
      if (now - autoStart > 6000) { autoChecked = true; if (meter.fps < 42) { stage.setQuality('saver'); toast('Switched to Battery saver', 'For smoother play on this device. Change it in the menu.'); } }
    }
    if (fpsEl && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) fpsEl.textContent = `${meter.fps.toFixed(0)} fps · ${stage.quality} · ${stage.renderer.info.render.calls} draws`;
    requestAnimationFrame(frame);
  }

  stage.resize();
  stage.resetView();
  noteStreak(state, today);
  hud();
  if (!REDUCED) {
    const end = camera.position.clone();
    const startPos = end.clone().add(new THREE.Vector3(-8, 14, 10));
    camera.position.copy(startPos);
    tween(2000, (k) => { camera.position.lerpVectors(startPos, end, easeInOut(k)); });
  }
  requestAnimationFrame((n) => { frame(n); $('boot').classList.add('done'); });
  setInterval(() => { if (!document.hidden && !REDUCED) { const k = pick(['balloon', 'birds']); if (sur.launch(k) && k === 'birds') sound.birds(); } }, 20000);
  later(8000, () => sur.launch('balloon'));
  if (opts.tour || (!state.tour.done && state.tour.step > 0)) later(2200, runTour);
  later(3500, () => { if (state.tour.done && !panel && !mode && paydayDue(state.budget, today)) startPayday(); });
  persist();
  if (DEBUG) window.__lc = { state, stage, bld, meter, living, actions: { openBuilding, openPanel, pickBuilding, startPlacement, confirmPlace, doTask, startRoads, paintRoad, endMode, upgradeTownHall } };
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}

/*
 * Landscape only on phones. Browsers can't force a rotation by themselves, so:
 *  - the installed app's manifest asks for landscape (Android honors it),
 *  - Android Chrome can lock landscape once it's full screen (button on the rotate screen),
 *  - otherwise a held-upright phone sees a friendly "turn your phone sideways" screen.
 * Tablets and computers can use either orientation.
 */
const isPhone = () => (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) && Math.min(screen.width, screen.height) <= 600;
const canFull = !!(document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock);
async function lockLandscape(goFull) {
  try {
    if (goFull && !document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await screen.orientation.lock('landscape');
  } catch (e) { /* not allowed here (iPhone, desktop): the rotate screen covers it */ }
}
function checkOrientation() {
  const portraitPhone = isPhone() && innerHeight > innerWidth;
  $('rotate').hidden = !portraitPhone;
  $('rotateFull').hidden = !canFull;
  document.body.classList.toggle('phone', isPhone());
}
addEventListener('resize', checkOrientation);
addEventListener('orientationchange', () => setTimeout(checkOrientation, 120));
$('rotateFull').addEventListener('click', () => lockLandscape(true));
if (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches) {
  addEventListener('pointerdown', () => lockLandscape(false), { once: true });
}
checkOrientation();

start();
