import './fonts.js';
import './styles.css';
import * as THREE from 'three';
import { load, save, clearSave, newCity } from './data/state.js';
import { demoState } from './data/demo.js';
import { byId, SECTIONS, mainBuildingFor, ROAD_COST, MAX_HOME_LEVEL, homePop, homeUpgradeCost } from './data/catalog.js';
import { HALF, tileOf } from './data/map.js';
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
import { renderBuild, renderLists, renderBuilding, renderGoalForm, renderLevelInfo, renderLevelUp, renderStore, renderRequests, renderProfile, requestItems, STORE } from './ui/panels.js';
import { dateKey, addDays, shortDate, weekday } from './systems/time.js';
import { levelNeed, population, checkLevelUp, levelBlocker, spend, canUpgradeTownHall, TOWNHALL } from './systems/economy.js';
import { canPlace, canPlaceRoad, canRemoveRoad, suggestSpot, footprint } from './systems/placement.js';
import { createList, completeTask, achieveGoal, listFor, dueCount, totalDue, makeTask, MAX_TASKS, streak } from './systems/lists.js';
import { dailyChallenges, challengeProgress, claimChallenge, milestoneState, claimMilestone, markQuickWin, claimQuickWin, QUICK_WINS, noteBuild } from './systems/challenges.js';
import { spotSticker, STICKERS } from './systems/surprises.js';
import { note, since } from './systems/journal.js';

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
  const sound = createSound(state.settings);
  const meter = fpsMeter();
  const persist = () => save(state);
  for (const b of state.buildings) bld.add(b);
  walkers.addFamily(state.family);

  /* ---------- Static HUD art ---------- */
  $('icoPop').innerHTML = ART.people; $('icoCoin').innerHTML = ART.coin; $('menuBtn').innerHTML = svgI('menu', '#fff', 24, 3);
  $('artBuild').innerHTML = ART.hardhat; $('artLists').innerHTML = ART.clipboard; $('artTrophy').innerHTML = ART.trophy; $('artWins').innerHTML = ART.wins;
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
    badge('bdgTrophy', milestoneState(state).filter((m) => m.ready).length);
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
    for (const b of state.buildings) {
      const def = byId[b.type];
      if (def.kind === 'section') {
        const list = listFor(state, b.id);
        if (!list) want.set(b.id, { sig: 'add', html: bubbleHtml(svgI('plus', SECTIONS[def.section].color, 20, 3), 'Add a list', b.id, def.section) });
        else { const n = dueCount(list, today); if (n) want.set(b.id, { sig: `due${n}`, html: bubbleHtml(svgI(SECTIONS[def.section].icon, SECTIONS[def.section].color, 20, 2.4), `${n} to do`, b.id, def.section) }); }
      } else if (def.kind === 'civic' && canUpgradeTownHall(state).ok) want.set(b.id, { sig: 'up', html: bubbleHtml(svgI('up', '#C98E25', 20, 3), 'Upgrade ready', b.id, null) });
    }
    for (const [id, t] of bubbles) if (!want.has(id) || want.get(id).sig !== t.sig) { tags.remove(t.tag, false); bubbles.delete(id); }
    for (const [id, w] of want) if (!bubbles.has(id)) { const v = bld.views.get(id); if (v) bubbles.set(id, { sig: w.sig, tag: tags.add(w.html, v.top, 'bubble', { bubble: true }) }); }
  }
  const bubbleHtml = (icon, label, id, section) => `<button type="button" class="bub" data-bub="${id}" style="--c:${section ? SECTIONS[section].color : '#F2B54A'}" aria-label="${esc(label)}">${icon}</button><span class="bl">${esc(label)}</span>`;
  $('tags').addEventListener('click', (e) => { const b = e.target.closest('[data-bub]'); if (b) { sound.tap(); openPanel('building', { id: b.dataset.bub }); } });

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
      later(700, () => {
        sound.chime(); sound.firework();
        fx.fireworks(controls.target, 5, () => sound.firework());
        if (spotSticker(state, 'fireworks')) persist();
        openPanel('levelup', { level: lv });
        emit('levelup', lv);
      });
    }
    if (new Set(state.lists.map((l) => l.section)).size >= 2) win('area2');
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
  function closePanel() { $('panel').hidden = true; const k = panel?.kind; panel = null; if (k) emit('closed:' + k); }
  function renderPanel() {
    if (!panel) return;
    let title = '', tabs = '', body = '';
    const p = panel;
    $('win').dataset.kind = p.kind;
    if (p.kind === 'build') { if (!p.tab) { title = 'Store'; body = renderStore(state); } else { title = STORE.find((c) => c.id === p.tab).label; tabs = `<button type="button" class="wtab back" data-back="1">‹ Store</button>`; body = renderBuild(state, p.tab); } }
    else if (p.kind === 'lists') { title = p.due ? 'Due today' : 'Your lists'; tabs = `<button type="button" class="wtab${p.due ? ' on' : ''}" data-due="1">Due today</button><button type="button" class="wtab${p.due ? '' : ' on'}" data-due="0">All lists</button>`; body = renderLists(state, today, p.due); }
    else if (p.kind === 'building') { const b = state.buildings.find((x) => x.id === p.id); if (!b) { closePanel(); return; } title = byId[b.type].name; body = renderBuilding(state, b, today); }
    else if (p.kind === 'goal') { title = p.draft.title; body = renderGoalForm(p.draft); }
    else if (p.kind === 'requests') { title = 'Available tasks'; body = renderRequests(state, today); }
    else if (p.kind === 'profile') { title = 'Profile'; body = renderProfile(state, today, p.tab, streak(state, today), p.editing); }
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
    $('panelBody').scrollTop = keepScroll;
    if (focusId) { const el = $(focusId) || $('panelBody').querySelector(`[data-tt="${focusId}"]`); el?.focus(); }
  }
  $('panelClose').onclick = closePanel;
  $('panel').addEventListener('click', (e) => { if (e.target.id === 'panel') closePanel(); });

  /* ---------- Goal form ---------- */
  function openGoalForm(o) {
    const draft = { mode: o.mode, type: o.type, buildingId: o.buildingId, listId: o.listId, goal: '', tasks: [] };
    if (o.mode === 'unlock') {
      const def = byId[o.type];
      Object.assign(draft, { section: def.section, title: `Open ${SECTIONS[def.section].name}`, intro: `Set one big ${SECTIONS[def.section].name.toLowerCase()} goal. Your ${def.name} is free.`, saveLabel: `Save & place the ${def.name}` });
    } else if (o.mode === 'new') {
      const b = state.buildings.find((x) => x.id === o.buildingId); const def = byId[b.type];
      Object.assign(draft, { section: def.section, title: `${def.name} list`, intro: `A new ${SECTIONS[def.section].name.toLowerCase()} goal. Tasks here pay ${[1, 1.5, 2, 3][def.tier - 1]}× coins.`, saveLabel: 'Save list' });
    } else {
      const l = state.lists.find((x) => x.id === o.listId);
      Object.assign(draft, { section: l.section, title: 'Edit list', intro: 'Change the goal or the tasks. Progress on tasks you keep is saved.', saveLabel: 'Save', goal: l.goal, tasks: l.tasks.map((t) => ({ id: t.id, title: t.title, kind: t.kind, per: t.per })) });
    }
    if (!draft.tasks.length) draft.tasks = [{ title: '', kind: 'daily', per: 3 }, { title: '', kind: 'weekly', per: 3 }];
    draft.placeholder = { spiritual: 'like “Read through the Psalms”', physical: 'like “Walk a 5K by spring”', financial: 'like “Save a $1,000 cushion”', relational: 'like “Weekly date night”', todo: 'like “Clean out the garage”' }[draft.section];
    openPanel('goal', { draft });
    emit('goalform');
  }
  function readGoalForm() {
    const d = panel?.draft; if (!d) return;
    const g = $('gfGoal'); if (g) d.goal = g.value;
    $('panelBody').querySelectorAll('[data-tt]').forEach((i) => { d.tasks[+i.dataset.tt].title = i.value; });
  }
  $('panelBody').addEventListener('input', () => { if (panel?.kind === 'goal') readGoalForm(); });
  function saveGoalForm() {
    readGoalForm();
    const d = panel.draft;
    const tasks = d.tasks.filter((t) => t.title.trim());
    if (!d.goal.trim()) { toast('Add your big goal first', 'One sentence is plenty'); $('gfGoal')?.focus(); return; }
    if (!tasks.length) { toast('Add at least one small task', 'Something you can check off this week'); return; }
    if (d.mode === 'unlock') {
      closePanel();
      win('goal');
      const pending = { goal: d.goal, tasks };
      startPlacement({
        type: d.type,
        onPlace: (rec) => {
          if (byId[d.type].section === 'spiritual') state.spiritualStyle = d.type === 'garden' ? 'garden' : 'church';
          rec.story = `your first ${SECTIONS[byId[d.type].section].name.toLowerCase()} goal: “${pending.goal}”`;
          createList(state, rec, pending.goal, pending.tasks, today);
          note(state, today, 'opened', { section: byId[d.type].section });
          win('place', screenOf(bld.views.get(rec.id).top));
          toast(`${SECTIONS[byId[d.type].section].name} is open!`, 'Tap the bubble to check off a task');
        }
      });
      return;
    }
    if (d.mode === 'new') {
      const b = state.buildings.find((x) => x.id === d.buildingId);
      createList(state, b, d.goal, tasks, today);
      win('goal');
      closePanel(); toast('List saved', 'Tap the bubble when you check something off');
    } else {
      const l = state.lists.find((x) => x.id === d.listId);
      l.goal = d.goal.trim();
      l.tasks = tasks.slice(0, MAX_TASKS).map((t) => { const old = l.tasks.find((x) => x.id === t.id); if (old) { old.title = t.title.trim(); old.kind = t.kind; old.per = t.kind === 'weekly' ? t.per : 1; return old; } return makeTask(t.title, t.kind, t.per); });
      closePanel(); toast('List updated');
    }
    afterProgress();
  }

  /* ---------- Building things ---------- */
  function pickBuilding(id) {
    const def = byId[id];
    if (def.kind === 'section' && def.tier === 1) { openGoalForm({ mode: 'unlock', type: id }); return; }
    const open = !def.section || state.lists.some((l) => l.section === def.section) || state.buildings.some((b) => byId[b.type].section === def.section);
    if (state.level < def.level) { toast(`${def.name} unlocks at level ${def.level}`, 'Check off tasks and build homes to level up'); return; }
    if (!open) { toast(`Open ${SECTIONS[def.section].name} first`, `Set a goal at the ${mainBuildingFor(def.section, state.spiritualStyle || 'church').name}`); return; }
    if (state.coins < def.cost) { toast(`${def.cost - state.coins} more coins needed`, 'Check off tasks to earn coins'); return; }
    startPlacement({
      type: id,
      onPlace: (rec) => {
        spend(state, def.cost);
        flyRewards(screenOf(bld.views.get(rec.id).top), { pop: def.pop || 0 });
        if (def.kind === 'home') { win('home'); toast(`${def.name} built`, `+${def.pop} people moved in`); emit('home'); }
        else if (def.kind === 'section') later(700, () => openGoalForm({ mode: 'new', buildingId: rec.id }));
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
    modebar.innerHTML = `<span class="mhint" id="mhint"></span><div class="mbtns"><button type="button" class="btn soft" data-m="cancel">Cancel</button><button type="button" class="btn soft icon" data-m="rotate" aria-label="Rotate">${svgI('rotate', 'currentColor', 20, 2.6)}</button><button type="button" class="btn go-btn" data-m="place" id="placeBtn">Place</button></div>`;
    validate();
    stage.flyTo(footprintCenter(o.type, spot.i, spot.j, mode.rot), tween, easeInOut);
    emit('placing');
  }
  function validate() {
    if (mode?.kind !== 'place') return;
    const r = canPlace(state, mode.type, ghost.i, ghost.j, ghost.rot, mode.ignoreId);
    ghost.setValid(r.ok); mode.ok = r.ok;
    $('mhint').textContent = r.ok ? `Drag to move it, then tap Place.` : r.reason;
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
    bld.add(rec, true);
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
      modebar.innerHTML = `<span class="mhint" id="mhint">${mode.erase ? 'Tap or drag along a road to remove it.' : `Tap or drag across the grass to lay road · ${ROAD_COST} coins a tile`}</span><div class="mbtns"><div class="seg"><button type="button" data-m="lay" aria-pressed="${!mode.erase}">Lay road</button><button type="button" data-m="erase" aria-pressed="${mode.erase}">Remove</button></div><button type="button" class="btn go-btn" data-m="done">Done</button></div>`;
    };
    mode.draw = draw; draw();
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
    if (mode?.kind === 'place') { if (p) { const [w, d] = byId[mode.type].size; const t = tileUnder(p, ghost.rot % 2 ? d : w, ghost.rot % 2 ? w : d); ghost.move(t.i, t.j); validate(); } return; }
    if (mode) return;
    ray.setFromCamera(ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
    const sh = ray.intersectObjects([...sur.targets, ...walkers.familyObjs()], true).find((h) => { let o = h.object; while (o && !o.userData.surprise) o = o.parent; return o && o.visible; });
    if (sh) {
      let o = sh.object; while (o && !o.userData.surprise) o = o.parent;
      const kind = o.userData.surprise;
      if (kind === 'family') { const m = o.userData.member; toast(`${m.name} says hi!`, pick(['Nice work today.', 'This town feels like home.', 'What should we build next?', 'Let’s check something off together.'])); fx.heartPop(o.position); return; }
      fx.heartPop(o.position); sound.pop();
      if (spotSticker(state, kind)) { toast(`You spotted ${STICKERS[kind]}!`, `Sticker book ${state.stickers.length} of ${Object.keys(STICKERS).length} · just for fun`); persist(); }
      return;
    }
    const hit = ray.intersectObjects(bld.hits.children, false)[0];
    if (hit) { sound.tap(); bld.bounce(hit.object.userData.id); openPanel('building', { id: hit.object.userData.id }); }
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
    if (d.goaldone) { goalReached(d.goaldone, b); return; }
    if (d.editlist) { openGoalForm({ mode: 'edit', listId: d.editlist }); return; }
    if (d.newlist) { openGoalForm({ mode: 'new', buildingId: d.newlist }); return; }
    if (d.upgrade) { upgradeHome(d.upgrade); return; }
    if (d.move) { const r = state.buildings.find((x) => x.id === d.move); startPlacement({ type: r.type, ignoreId: r.id, start: { i: r.i, j: r.j }, rot: r.rot, level: r.level }); return; }
    if (d.remove) { const r = state.buildings.find((x) => x.id === d.remove); state.buildings.splice(state.buildings.indexOf(r), 1); bld.remove(r.id); syncWorld(); closePanel(); persist(); hud(); return; }
    if (d.kind) { readGoalForm(); const [i, k] = d.kind.split(':'); panel.draft.tasks[+i].kind = k; renderPanel(); return; }
    if (d.per) { readGoalForm(); const [i, n] = d.per.split(':').map(Number); const t = panel.draft.tasks[i]; t.per = Math.max(1, Math.min(7, t.per + n)); renderPanel(); return; }
    if (d.addtask) { readGoalForm(); panel.draft.tasks.push({ title: '', kind: 'daily', per: 3 }); renderPanel(); $('panelBody').querySelector(`[data-tt="${panel.draft.tasks.length - 1}"]`)?.focus(); return; }
    if (d.savegoal) { saveGoalForm(); return; }
    if (d.ttab) { panel.tab = d.ttab; renderPanel(); return; }
    if (d.claimc) { const c = claimChallenge(state, d.claimc, today); if (c) { flyRewards(centerOf(b), c); sound.chime(); afterProgress(); renderPanel(); } return; }
    if (d.claimm) { const m = claimMilestone(state, d.claimm); if (m) { flyRewards(centerOf(b), m); sound.chime(); afterProgress(); renderPanel(); } return; }
    if (d.close) { closePanel(); return; }
    if (d.menu) { menuAction(d.menu, b); }
  });
  function doTask(listId, taskId, el) {
    const r = completeTask(state, listId, taskId, today);
    if (!r) return;
    sound.pop(); later(120, () => sound.coin());
    flyRewards(centerOf(el), r.reward);
    bld.bounce(r.list.buildingId);
    const v = bld.views.get(r.list.buildingId);
    if (v) fx.coinBurst(v.top.clone().add(new THREE.Vector3(0, -0.2, 0)));
    win('task', centerOf(el));
    if (totalDue(state, today) === 0) later(900, () => { fx.fireworks(controls.target, 4, () => sound.firework()); toast('Everything due today is done!', 'The town is celebrating'); });
    emit('task');
    afterProgress(); renderPanel();
  }
  function goalReached(listId, el) {
    const r = achieveGoal(state, listId, today);
    if (!r) return;
    note(state, today, 'goal', { goal: r.list.achieved.at(-1).goal, section: r.list.section });
    sound.chime(); flyRewards(centerOf(el), r.reward);
    fx.fireworks(bld.views.get(r.list.buildingId)?.top || controls.target, 5, () => sound.firework());
    toast('Big goal reached!', `+${r.reward.coins} coins · +${r.reward.xp} XP · set the next one when you're ready`);
    afterProgress(); renderPanel();
  }

  /* ---------- Menu + paper ---------- */
  function renderMenu(confirm) {
    const q = state.settings.quality;
    const seg = (v, l) => `<button type="button" data-menu="q:${v}" aria-pressed="${q === v}">${l}</button>`;
    return `<p class="hint"><b>${esc(state.cityName)}</b> · started ${shortDate(state.startDate)} · ${streak(state, today)}-day streak</p>
      <div class="set-row"><span>Town paper</span><button type="button" class="btn soft small" data-menu="paper">Read it</button></div>
      <div class="set-row"><span>Sound and haptics</span><button type="button" class="btn soft small" data-menu="sound">${state.settings.sound ? 'On' : 'Off'}</button></div>
      <div class="set-row"><span>Night</span><button type="button" class="btn soft small" data-menu="night">${state.settings.night ? 'On' : 'Off'}</button></div>
      <div class="set-row"><span>Quality<br><small>Now: ${stage.quality === 'high' ? 'High' : 'Battery saver'}</small></span><div class="seg">${seg('auto', 'Auto')}${seg('high', 'High')}${seg('saver', 'Battery saver')}</div></div>
      <div class="set-row"><span>Guided tour</span><button type="button" class="btn soft small" data-menu="tour">Replay</button></div>
      <div class="set-row"><span>Start over<br><small>Clears this town from this device</small></span>${confirm ? '<button type="button" class="btn go-btn small" data-menu="reset">Yes, start over</button>' : '<button type="button" class="btn soft small" data-menu="ask">Start over</button>'}</div>
      <p class="foot">Life City · progress is saved in this browser only.${state.demo ? ' You are looking at the sample town.' : ''}</p>`;
  }
  function menuAction(a) {
    if (a === 'paper') { openPanel('paper'); return; }
    if (a === 'sound') { sound.setEnabled(!state.settings.sound); if (state.settings.sound) sound.pop(); }
    if (a === 'night') { state.settings.night = !state.settings.night; const n0 = stage.night, n1 = state.settings.night ? 1 : 0; tween(1400, (k) => { stage.night = n0 + (n1 - n0) * easeInOut(k); }); }
    if (a.startsWith('q:')) { const v = a.slice(2); state.settings.quality = v; stage.setQuality(v === 'auto' ? detectQuality() : v); autoChecked = true; }
    if (a === 'tour') { closePanel(); state.tour = { step: 0, done: false }; runTour(); return; }
    if (a === 'ask') { panel.confirm = true; }
    if (a === 'reset') { clearSave(); location.reload(); return; }
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
  $('btnWins').onclick = () => { sound.tap(); openPanel('requests'); };
  $('profileBtn').onclick = () => { sound.tap(); openPanel('profile', { tab: 'info' }); };
  function goAction(code) {
    const [kind, id] = code.split(':');
    closePanel();
    const unopened = ['todo', 'physical', 'financial', 'relational', 'spiritual'].find((s) => !state.lists.some((l) => l.section === s));
    if (kind === 'win') {
      if (id === 'task') return openPanel('lists', { due: true });
      if (id === 'home') return openPanel('build', { tab: 'homes' });
      if (id === 'road') return startRoads();
      if (id === 'level3') return openPanel('level');
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
    { title: 'Set your goal', text: 'Write one thing you want to get done, add a task or two that move it forward, then tap Save.', target: rectOf('[data-savegoal]'), until: 'placing', cardAt: 'top' },
    { title: 'Place it by a road', text: 'Drag it where you like. Every building needs to touch a road that leads to the Town Hall. Then tap Place.', target: rectOf('#placeBtn'), until: 'placed', cardAt: 'top' },
    { title: 'Check off a task', text: 'Tap the bubble over your new building, then tap a circle to check off a task. Tasks pay coins and XP.', target: () => { const b = firstSection(); const t = b && document.querySelector(`[data-bub="${b.id}"]`); return t && t.offsetParent ? t.getBoundingClientRect() : (panel?.kind === 'building' ? $('panelBody').querySelector('.check:not([disabled])')?.getBoundingClientRect() : null); }, until: 'task', cardAt: 'top' },
    { title: 'Bring people to town', text: 'Homes add population. You need people to level up. Tap Build, then Housing, and build a Cottage.', target: () => (panel?.kind === 'build' ? (panel.tab === 'homes' ? $('panelBody').querySelector('[data-pick="cottage"]') : panel.tab ? $('panelTabs').querySelector('[data-back]') : $('panelBody').querySelector('[data-cat="homes"]'))?.getBoundingClientRect() : (mode ? $('placeBtn')?.getBoundingClientRect() : rectOf('#btnBuild')())), until: 'home', cardAt: 'top', enter: () => { if (panel && panel.kind !== 'build') closePanel(); } },
    { title: 'You’re on your way!', text: 'Open Spiritual, Physical, Financial and Relational by setting a goal in each. Quick wins have more rewards, and leveling up unlocks new buildings with new lists.', target: rectOf('#btnWins'), button: 'Finish tour', cardAt: 'mid' }
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
  stage.night = state.settings.night ? 1 : 0;
  waterUniforms.uStorm.value = 0.05;
  function frame(now) {
    stage.renderer.info.reset();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    tickTweens(now);
    meter.tick(now);
    waterUniforms.uTime.value = REDUCED ? 0 : t;
    swayUniforms.uTime.value = REDUCED ? 0 : t; swayUniforms.uSway.value = REDUCED ? 0 : 0.05;
    stage.applyMood(stage.night);
    walkers.tick(dt, t);
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
  persist();
  if (DEBUG) window.__lc = { state, stage, bld, meter, actions: { openPanel, pickBuilding, startPlacement, confirmPlace, doTask, startRoads, paintRoad, endMode, upgradeTownHall } };
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
