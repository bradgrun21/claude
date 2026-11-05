import './fonts.js';
import './styles.css';
import * as THREE from 'three';
import { load, save, clearSave, createFromSetup } from './data/state.js';
import { demoState } from './data/demo.js';
import { AREA_INFO, MATERIALS } from './data/areas.js';
import { DISTRICTS } from './data/layout.js';
import { createStage } from './scene/stage.js';
import { detectQuality, fpsMeter } from './scene/quality.js';
import { waterUniforms } from './scene/water.js';
import { swayUniforms } from './world/bake.js';
import { createCity, tileW } from './world/city.js';
import { createActors } from './world/actors.js';
import { createSurprises } from './world/surprises.js';
import { createRain } from './world/rain.js';
import { createTrain } from './world/train.js';
import { createTags } from './world/tags.js';
import { createEffects } from './world/effects.js';
import { loadArtPack } from './world/gltf.js';
import { tween, tickTweens, easeInOut, REDUCED, later } from './world/tween.js';
import { mat, mesh, rand, pick } from './world/palette.js';
import { createSound } from './audio/sound.js';
import { runSetup } from './ui/setup.js';
import { svgI, IC, esc, fmt$ } from './ui/icons.js';
import { renderHud, renderToday, renderStorm, renderBuild, renderTogether, renderRating, matIcon } from './ui/panes.js';
import { dateKey, addDays, shortDate, monthYear, advancePayday, weekday } from './systems/time.js';
import { stormLabel, stormVisual, waterY, STARTER_CUSHION } from './systems/storm.js';
import { currentRating, ratingWord, easeBars } from './systems/rating.js';
import { completeTask } from './systems/tasks.js';
import { spend, COSTS, MAX_FLOORS } from './systems/build.js';
import { takeMaterials } from './systems/materials.js';
import { recipeById, effectiveNeeds, canBuildRecipe } from './systems/recipes.js';
import { refillOrders, deliverOrder, skipOrder, anyDeliverable, swapOrdersAtPayday } from './systems/orders.js';
import { trainArrives, openCrate, activeMaterials, starsNow, DECORATIONS } from './systems/train.js';
import { applyPayday, extraDebtPayment, stall, setPayoffDate, stormNow, checkUnlocks, debtClock, fullSafetyNet, DISTRICT_NEED } from './systems/money.js';
import { spotSticker, STICKERS } from './systems/surprises.js';
import { note } from './systems/journal.js';
import { buildPaper, cushionPct } from './systems/paper.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || params.has('fps');

/* ---------- Start: setup on first open, otherwise straight into the city ---------- */
function start() {
  const saved = load();
  if (saved && saved.setup.done) { boot(saved, { first: false }); return; }
  $('boot').classList.add('done');
  runSetup($('setup'), {
    today: dateKey(),
    onDone: (input) => { const s = createFromSetup(input, dateKey()); save(s, true); boot(s, { first: true }); },
    onDemo: () => { const s = demoState(dateKey()); save(s, true); boot(s, { first: true, demo: true }); }
  });
}

function boot(state, opts) {
  const sheet = $('sheet');
  ['hud', 'side', 'sheet'].forEach((id) => { $(id).hidden = false; });
  $('boot').classList.remove('done');
  const T = [['start', performance.now()]];
  const mark = (n) => T.push([n, performance.now()]);
  const stage = createStage($('scene'), sheet);
  if (!stage) { $('fail').style.display = 'flex'; ['hud', 'side', 'sheet', 'boot'].forEach((id) => { $(id).hidden = true; }); return; }
  const { scene, camera, controls } = stage;
  const quality = state.settings.quality === 'auto' ? detectQuality() : state.settings.quality;
  stage.setQuality(quality);

  let today = dateKey();
  const tags = createTags($('tags'));
  const fx = createEffects(scene, camera);
  mark('stage');
  const city = createCity({ stage, state, tags, fx });
  mark('city');
  const actors = createActors({ scene, city, state });
  const sur = createSurprises(scene, camera);
  const rain = createRain(scene);
  const train = createTrain(scene, fx);
  mark('actors+train');
  const sound = createSound(state.settings);
  const meter = fpsMeter();
  const persist = () => save(state);

  /* ---------- Derived values + rendering ---------- */
  let selected = null;
  let tab = 'today';
  const ctx = () => {
    const storm = stormNow(state);
    const rating = currentRating(state);
    return { state, today, storm, rating, ratingWord: ratingWord(rating), selected, activeMats: activeMaterials(state) };
  };
  const hudEls = { ringHud: $('ringHud'), ringHudTxt: $('ringHudTxt'), ratingWord: $('ratingWord'), cityName: $('cityName'), popLine: $('popLine'), pts: $('pts'), mats: $('mats') };
  const PANES = { today: ['paneToday', renderToday], storm: ['paneStorm', renderStorm], build: ['paneBuild', renderBuild], together: ['paneTogether', renderTogether], rate: ['paneRate', renderRating] };
  function render() {
    const c = ctx();
    renderHud(c, hudEls);
    const [id, fn] = PANES[tab];
    const pane = $(id);
    const scroll = pane.scrollTop;
    const focusId = document.activeElement && pane.contains(document.activeElement) ? document.activeElement.id : null;
    pane.innerHTML = fn(c);
    pane.scrollTop = scroll;
    if (focusId && $(focusId)) $(focusId).focus();
    const dot = state.orders.list.some((o) => (state.materials[o.material] || 0) >= o.qty) || state.train.cars.some((x) => !x.opened);
    const tb = sheet.querySelector('[data-tab="today"]');
    tb.innerHTML = 'Today' + (dot && tab !== 'today' ? '<span class="dot" aria-hidden="true"></span>' : '');
    refreshTags();
  }
  function showTab(which) {
    tab = which;
    sheet.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === which));
    for (const [k, [id]] of Object.entries(PANES)) $(id).hidden = k !== which;
    render();
  }
  function setMin(m) { sheet.classList.toggle('min', m); $('grab').setAttribute('aria-expanded', !m); }
  function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  /* ---------- Toast + cards ---------- */
  let toastTimer = 0;
  function toast(main, sub) {
    const t = $('toast');
    t.innerHTML = esc(main) + (sub ? `<small>${esc(sub)}</small>` : '');
    t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2800);
  }
  let cardActions = {};
  function openCard(title, html, buttons = []) {
    cardActions = {};
    const btns = buttons.map((b, i) => { cardActions['c' + i] = b.run; return `<button type="button" class="btn ${b.main ? 'main' : 'soft'}" data-card="c${i}"${b.disabled ? ' disabled' : ''}>${esc(b.label)}</button>`; }).join('');
    $('cardBody').innerHTML = `<h2 id="cardTitle">${esc(title)}</h2>${html}<div class="btns" style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${btns}<button type="button" class="btn soft" data-card="close" style="margin-left:auto">Close</button></div>`;
    $('card').hidden = false;
    ($('cardBody').querySelector('input') || $('cardBody').querySelector('[data-card]')).focus();
  }
  const closeCard = () => { $('card').hidden = true; };
  $('card').addEventListener('click', (e) => {
    if (e.target.id === 'card') { closeCard(); return; }
    const b = e.target.closest('[data-card]'); if (!b) return;
    if (b.dataset.card === 'close') { closeCard(); return; }
    const run = cardActions[b.dataset.card];
    closeCard();
    run && run($('cardBody'));
  });

  /* ---------- Floating tags ---------- */
  const UP = { townhall: 1.45, chapel: 1.75, park: 1.0, home: 1.55, diner: 1.25, bank: 1.2, grocery: 1.2, board: 1.05 };
  const placeObj = (place) => (place === 'home' ? city.specials.home : city.specials[place]);
  const bubbles = new Map();
  let boardBubble = null;
  const crateBubbles = [];
  const districtTags = {};
  const lockIcon = svgI('lock', 'currentColor', 13, 2.6);
  for (const key of ['riverside', 'bridgeview', 'hillside']) {
    if (state.unlocked[key]) continue;
    const d = DISTRICTS[key];
    districtTags[key] = tags.add(`<span class="t1">${lockIcon}${d.name}</span><span class="t2" data-need="${key}"></span>`, new THREE.Vector3(d.cx, 1.5, d.cz), '', { wideOnly: key !== 'riverside' });
  }
  const towerTag = tags.add('<span class="t1" style="color:#2E6E99">Cushion tower</span><span class="t2" id="towerPct"></span>', city.specials.tower.position.clone().add(new THREE.Vector3(0, 2.0, 0)), 'small');
  const clockTag = tags.add('<span class="t1" style="color:#4F5E6E">Debt-free clock</span><span class="t2" id="clockTxt"></span>', city.specials.clock.position.clone().add(new THREE.Vector3(0, 2.45, 0)), 'small', { wideOnly: true });
  const kidNames = state.family.filter((m) => m.kind === 'kid').map((m) => m.name);
  tags.add(`<span class="t1" style="color:#B0476A">${esc(kidNames.length ? (kidNames.length === 1 ? `${kidNames[0]}'s Corner` : `${kidNames.slice(0, 2).join(' & ')}'s Corner`) : 'Play Park')}</span>`, new THREE.Vector3(city.kidsCenter.x + 1.3, 1.25, city.kidsCenter.z - 1.2), 'small', { wideOnly: true });
  const stationTag = tags.add('<span class="t1" style="color:#2F6B43">Station</span><span class="t2" id="stationTxt"></span>', train.stationPos.clone().add(new THREE.Vector3(0, 0.6, 0)), 'small', { wideOnly: true });
  const owner = state.setup.cityName.match(/^(.+)'s Life City$/i)?.[1];
  const famLabel = state.family.length === 1 ? state.family[0].name : owner ? `${owner}'s family` : 'The family';
  const famTag = state.family.length ? tags.add(`<span class="t1" style="color:#B97F62">${esc(famLabel)}</span><span class="t2">Tap to say hi</span>`, new THREE.Vector3(), 'small', { bubble: true }) : null;
  if (famTag) famTag.el.querySelector('.card').addEventListener('click', () => sayHi());

  function bubbleHtml(icon, label, data, cls = '') {
    return `<button type="button" class="bub ${cls}" ${data} aria-label="${esc(label)}">${icon}</button><span class="bl">${esc(label)}</span>`;
  }
  function refreshTags() {
    /* Goal bubbles: only the family's own goals that aren't logged yet today. */
    const want = new Set();
    const perPlace = {};
    for (const g of state.goals) {
      if (!(g.perWeek > 0) || g.done.includes(today)) continue;
      want.add(g.id);
      if (bubbles.has(g.id)) continue;
      const place = AREA_INFO[g.area].place;
      const obj = placeObj(place);
      if (!obj) continue;
      const n = perPlace[place] = (perPlace[place] || 0) + state.goals.filter((x) => x.id !== g.id && AREA_INFO[x.area].place === place && bubbles.has(x.id)).length;
      const p = obj.position.clone().add(new THREE.Vector3(n * 0.42, UP[place] + n * 0.18, -n * 0.1));
      bubbles.set(g.id, tags.add(bubbleHtml(svgI(AREA_INFO[g.area].icon, '#8A5A10', 20), g.label, `data-task="${g.id}"`), p, 'bubble', { bubble: true }));
    }
    for (const [id, t] of bubbles) if (!want.has(id)) { tags.remove(t); bubbles.delete(id); }
    /* Order board bubble */
    const can = anyDeliverable(state);
    if (can && !boardBubble) boardBubble = tags.add(bubbleHtml(svgI('board', '#2E6E99', 20), 'Order ready', 'data-board="1"', 'blue'), city.specials.board.position.clone().add(new THREE.Vector3(0, UP.board, 0)), 'bubble', { bubble: true });
    if (!can && boardBubble) { tags.remove(boardBubble); boardBubble = null; }
    city.setBoardNotes(state.orders.list.length);
    /* Crate bubbles over the train cars */
    const cars = state.train.cars.slice(-3);
    for (let i = 0; i < 3; i++) {
      const c = cars[i];
      const show = c && !c.opened && !train.moving;
      if (show && !crateBubbles[i]) crateBubbles[i] = tags.add(bubbleHtml(svgI('crate', '#2F6B43', 20), 'Open crate', `data-crate="${c.id}"`, 'leafy'), train.carPos(i), 'bubble', { bubble: true });
      else if (show && crateBubbles[i]) crateBubbles[i].el.querySelector('[data-crate]').dataset.crate = c.id;
      if (!show && crateBubbles[i]) { tags.remove(crateBubbles[i]); crateBubbles[i] = null; }
    }
    /* Labels */
    const cp = cushionPct(state.money);
    const tp = $('towerPct'); if (tp) tp.textContent = cp.label === 'Starter Cushion' ? `${cp.pct}% full` : `Safety net ${cp.pct}%`;
    const clock = debtClock(state.money, today);
    const ct = $('clockTxt');
    if (ct) ct.textContent = clock.status === 'counting' ? `${monthYear(clock.date)}${clock.stolen ? ` · ${clock.stolen} ${clock.stolen === 1 ? 'day' : 'days'} stolen back` : ''}` : clock.status === 'free' ? 'Debt-free!' : clock.status === 'none' ? 'No debt to count' : 'Add a monthly payment';
    const st = $('stationTxt'); if (st) st.textContent = state.setup.pay.next ? `Next train ${weekday(state.setup.pay.next)}` : '';
    for (const [key, t] of Object.entries(districtTags)) {
      const el = t.el.querySelector('[data-need]');
      if (el) el.textContent = key === 'riverside' && state.money.cushion < STARTER_CUSHION ? `Starter Cushion · ${fmt$(STARTER_CUSHION - state.money.cushion)} to go` : `Opens with: ${DISTRICT_NEED[key]}`;
    }
  }

  /* ---------- Storm visuals ---------- */
  let stormTarget = stormNow(state);
  stage.storm = opts.first ? Math.min(1, stormTarget + 0.05) : stormTarget;
  let lastLabel = stormLabel(stormTarget);
  function updateStorm(dur = 1800) {
    const target = stormNow(state), s0 = stage.storm;
    const label = stormLabel(target);
    if (label !== lastLabel) { note(state, today, 'storm', { from: lastLabel, to: label }); lastLabel = label; }
    if (target < 0.25 && s0 > 0.4) later(Math.min(dur, 1800), () => { sur.showRainbow(); sticker('rainbow'); });
    stormTarget = target;
    tween(dur, (k) => { stage.storm = s0 + (target - s0) * easeInOut(k); });
    setTowerFill(true);
    setWalls(true);
  }
  let towerFill = 0;
  function setTowerFill(animate) {
    const m = state.money;
    const to = m.cushion < STARTER_CUSHION ? m.cushion / STARTER_CUSHION : m.cushion / fullSafetyNet(m);
    const f0 = towerFill;
    if (!animate) { towerFill = to; city.setTowerFill(to); return; }
    tween(1400, (k) => { towerFill = f0 + (to - f0) * easeInOut(k); city.setTowerFill(towerFill); });
  }
  function setWalls(animate) {
    const h = state.money.cushion >= STARTER_CUSHION ? 0.42 : state.money.payoffDate ? 0.24 : 0;
    if (h !== city.wallH) city.setWall(h, animate);
  }
  setTowerFill(false);
  setWalls(false);
  city.setGarden(state.garden.length);
  train.show(state.train.cars.slice(-3));

  /* ---------- Night ---------- */
  stage.night = state.settings.night ? 1 : 0;
  function setNightIcon() {
    $('dayIcon').innerHTML = state.settings.night ? IC.sun : IC.moon;
    $('dayBtn').setAttribute('aria-label', state.settings.night ? 'Switch to day' : 'Switch to night');
  }
  setNightIcon();
  $('dayBtn').onclick = () => {
    state.settings.night = !state.settings.night;
    setNightIcon();
    const n0 = stage.night, n1 = state.settings.night ? 1 : 0;
    tween(1400, (k) => { stage.night = n0 + (n1 - n0) * easeInOut(k); });
    persist();
  };
  function setSoundIcon() {
    $('soundIcon').innerHTML = state.settings.sound ? IC.sound : IC.mute;
    $('soundBtn').setAttribute('aria-label', state.settings.sound ? 'Mute sound' : 'Turn sound on');
  }
  setSoundIcon();
  $('soundBtn').onclick = () => { sound.setEnabled(!state.settings.sound); setSoundIcon(); persist(); if (state.settings.sound) sound.pop(); };
  $('homeBtn').onclick = () => stage.resetView();
  $('grab').onclick = () => setMin(!sheet.classList.contains('min'));
  $('mayorBtn').onclick = () => { setMin(false); showTab('rate'); };
  sheet.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { setMin(false); showTab(b.dataset.tab); } });

  /* ---------- Selection marker ---------- */
  const marker = new THREE.Group();
  { const cone = mesh(new THREE.ConeGeometry(0.14, 0.3, 4), mat.gold, true, false); cone.rotation.x = Math.PI; cone.rotation.y = Math.PI / 4; marker.add(cone); }
  marker.visible = false; scene.add(marker);
  function select(target) {
    selected = target;
    if (target) {
      let p, y = 0.75;
      if (target.kind === 'lot') p = city.lotByKey(target.key)?.pos;
      else { const b = state.buildings.find((x) => x.id === target.id); p = city.views.get(target.id)?.pos; y = 1.35 + (b?.floors || 1) * 0.3; }
      if (!p) { selected = null; marker.visible = false; render(); return; }
      marker.position.set(p.x, y, p.z); marker.userData.baseY = y; marker.visible = true;
      if (sheet.classList.contains('min')) setMin(false);
      showTab('build');
    } else { marker.visible = false; render(); }
  }

  /* ---------- Actions ---------- */
  const fly = (p) => {
    const t0 = controls.target.clone(), off = camera.position.clone().sub(t0);
    const t1 = new THREE.Vector3(p.x, 0, p.z);
    tween(900, (k) => { const e = easeInOut(k); controls.target.lerpVectors(t0, t1, e); camera.position.copy(controls.target).add(off); });
  };
  function sticker(kind) {
    if (spotSticker(state, kind)) { note(state, today, 'sticker', { kind }); toast(`You spotted ${STICKERS[kind]}!`, `Sticker book: ${state.stickers.length} of ${Object.keys(STICKERS).length} · just for fun`); persist(); if (tab === 'together') render(); }
  }
  function logTask(id) {
    const r = completeTask(state, id, today);
    if (!r) return;
    const place = AREA_INFO[r.goal.area].place;
    const obj = placeObj(place);
    if (obj) { fx.coinBurst(obj.position.clone().add(new THREE.Vector3(0, (UP[place] || 1) - 0.5, 0))); fx.bounce(obj); }
    sound.pop(); later(120, () => sound.coin());
    bump(document.querySelector('.points'));
    const mk = AREA_INFO[r.goal.area].material;
    if (r.material) later(50, () => { const chip = document.querySelector(`[data-mat="${mk}"]`); chip && bump(chip); });
    if (r.planted) city.setGarden(state.garden.length, true);
    const matLine = r.material ? `+1 ${MATERIALS[mk].one}` : `That's 3 ${MATERIALS[mk].label.toLowerCase()} today, the daily max`;
    toast(`${r.goal.label} +${r.points} points`, `${matLine} · ${Math.min(r.doneWeek, r.perWeek)} of ${r.perWeek} this week${r.planted ? ' · a crop sprouted' : ''}`);
    const all = state.goals.filter((g) => g.perWeek > 0).every((g) => g.done.includes(today));
    if (all) later(900, () => { fireworks(5); toast('Full day! The town is celebrating', 'Every goal in town is logged today'); });
    persist(); render();
  }
  function fireworks(n) {
    fx.fireworks(new THREE.Vector3(DISTRICTS.starter.cx, 0, DISTRICTS.starter.cz), n, () => sound.firework());
    sticker('fireworks');
  }
  const daysLogged = () => state.loggedDays.length;
  const logLine = () => { const n = daysLogged(); return `${n} ${n === 1 ? 'day' : 'days'} of logging`; };
  function newBuilding(kind, lot, extra = {}) {
    const rec = { id: `b${state.buildSeq++}`, kind, district: lot.d, x: lot.x, z: lot.z, rot: 0, variant: Math.floor(rand() * 5), floors: 1, builtOn: today, ...extra };
    state.buildings.push(rec);
    city.addBuilding(rec, true);
    city.syncLots(false);
    sound.thud();
    note(state, today, 'built', { name: extra.name || kind, kind });
    return rec;
  }
  function buildSmall(kind) {
    if (!selected) return;
    if (kind === 'upgrade') {
      const b = state.buildings.find((x) => x.id === selected.id);
      if (!b || b.floors >= MAX_FLOORS || !spend(state, 'upgrade')) return;
      b.floors++;
      (b.upgrades = b.upgrades || []).push({ on: today, days: daysLogged() });
      city.rebuild(b, true);
      sound.thud();
      note(state, today, 'built', { name: 'New floor', kind: 'upgrade' });
      toast(b.kind === 'family-home' ? 'Your home got a new floor' : 'Home upgraded', `−${COSTS.upgrade} points · +2 people`);
    } else {
      const lot = city.lotByKey(selected.key);
      if (!lot || !spend(state, kind)) return;
      const names = { road: 'Road', park: 'Park', home: 'Home' };
      newBuilding(kind, lot, { name: names[kind], story: logLine() });
      toast(kind === 'home' ? 'New home built' : kind === 'park' ? 'New park planted' : 'Road paved', `−${COSTS[kind]} points${kind === 'home' ? ' · +2 people moved in' : ''}`);
    }
    selected = null; marker.visible = false;
    persist(); render();
  }
  function buildRecipe(id) {
    const r = recipeById(id);
    const lot = selected?.kind === 'lot' ? city.lotByKey(selected.key) : null;
    if (!r || !lot || !canBuildRecipe(r, state, activeMaterials(state))) return;
    const needs = effectiveNeeds(r, activeMaterials(state));
    takeMaterials(state, needs);
    state.points -= r.points;
    const used = Object.entries(needs).map(([k, n]) => `${n} ${n === 1 ? MATERIALS[k].one : MATERIALS[k].label.toLowerCase()}`);
    newBuilding(r.type, lot, { recipe: r.id, name: r.name, story: `${used.join(', ')} + ${r.points} points` });
    later(500, () => fireworks(r.type === 'landmark' ? 6 : 3));
    toast(`${r.name} built!`, `${used.join(', ')} + ${r.points} points`);
    selected = null; marker.visible = false;
    persist(); render();
  }
  function placeDeco(id) {
    const d = state.decorations.find((x) => x.id === id);
    const lot = selected?.kind === 'lot' ? city.lotByKey(selected.key) : null;
    if (!d || d.placed || !lot) return;
    d.placed = true;
    const name = DECORATIONS.find((x) => x.id === d.kind)?.name || 'Decoration';
    newBuilding('deco', lot, { deco: d.kind, name, story: 'a gift from the payday train' });
    toast(`${name} placed`, 'Just for looks');
    selected = null; marker.visible = false;
    persist(); render();
  }
  function deliver(id) {
    const o = deliverOrder(state, id);
    if (!o) return;
    sound.chime();
    fx.coinBurst(city.specials.board.position.clone().add(new THREE.Vector3(0, 0.7, 0)), '#4E9BCB');
    note(state, today, 'delivered', { resident: o.resident, area: o.area });
    toast(`${o.resident} says thanks! +1 star`, `Stamp ${state.residents[o.resident].stamps} on their card · ${starsNow(state, today)} stars for the payday train`);
    persist(); render();
  }
  function skip(id) {
    const o = skipOrder(state, id, today);
    if (!o) return;
    toast('No problem', `${o.resident} will ask again another week`);
    persist(); render();
  }

  /* Payday: money steps, then the train pulls in. */
  function advanceNextPayday() {
    let n = state.setup.pay.next || today;
    let guard = 0;
    while (n <= today && guard++ < 60) n = advancePayday(n, state.setup.pay.freq);
    state.setup.pay.next = n;
  }
  function doUnlocks() {
    const opened = checkUnlocks(state, today);
    opened.forEach((key, i) => later(600 + i * 2400, () => {
      note(state, today, 'unlock', { district: key });
      city.unlock(key, true);
      if (districtTags[key]) { tags.remove(districtTags[key]); delete districtTags[key]; }
      later(1400, () => fireworks(6));
      toast(`${DISTRICTS[key].name} is open!`, `${DISTRICT_NEED[key]} · new lots are ready`);
      persist(); render();
    }));
    return opened;
  }
  function payday(amount) {
    const r = applyPayday(state, amount);
    const parts = [];
    if (r.toCushion) parts.push(`${fmt$(r.toCushion)} to the cushion`);
    if (r.toDebt) parts.push(`${fmt$(r.toDebt)} extra to debt`);
    if (r.toNet) parts.push(`${fmt$(r.toNet)} to the safety net`);
    if (r.toDebt) { city.spinClock(2); }
    if (parts.length) toast('The water dropped', parts.join(' · '));
    else toast('Payday logged', 'Nothing toward the plan this time. The water crept up a little. One step pushes it back.');
    note(state, today, 'money', {});
    updateStorm();
    doUnlocks();
    advanceNextPayday();
    if (state.demo || state.train.lastPayday !== today || !state.train.arrivals) later(parts.length ? 1600 : 1200, () => trainArrive());
    persist(); render();
  }
  function trainArrive(auto = false) {
    const r = trainArrives(state, today);
    swapOrdersAtPayday(state, today);
    note(state, today, 'payday', { cars: r.cars, stars: r.stars, crops: r.crops });
    persist();
    fly(train.stationPos);
    sound.whistle();
    train.arrive(state.train.cars.slice(-3), () => {
      sound.whistle();
      if (r.crops) { fx.coinBurst(city.specials.garden.position.clone().add(new THREE.Vector3(0, 0.3, 0))); city.setGarden(0); bump(document.querySelector('.points')); sound.coin(); }
      toast(`The payday train is in! ${r.cars} ${r.cars === 1 ? 'car' : 'cars'}`, `${r.stars} ${r.stars === 1 ? 'star' : 'stars'} earned · harvest: ${r.crops} ${r.crops === 1 ? 'crop' : 'crops'} → +${r.points} points${auto ? ' · log your payday in the Storm tab' : ''}`);
      render();
    });
    render();
  }
  function openCrateById(id) {
    const car = openCrate(state, id);
    if (!car) return;
    train.openCrate(id);
    sound.coin(); sound.pop();
    const items = Object.entries(car.mats).map(([k, n]) => `${n} ${n === 1 ? MATERIALS[k].one : MATERIALS[k].label.toLowerCase()}`);
    const deco = DECORATIONS.find((d) => d.id === car.deco)?.name || 'a decoration';
    toast('Crate opened!', `${items.join(', ')} + ${deco.toLowerCase()}`);
    Object.keys(car.mats).forEach((k) => { const chip = document.querySelector(`[data-mat="${k}"]`); chip && bump(chip); });
    persist(); render();
  }
  function setLevee() {
    if (state.money.payoffDate) return;
    const c = debtClock(state.money, today);
    setPayoffDate(state, c.key || addDays(today, 365 * 3));
    note(state, today, 'levee', {});
    toast('A wall went up', `Payoff date set${c.key ? ` for ${monthYear(c.date)}` : ''}. The water stays back while you keep pace.`);
    updateStorm();
    persist(); render();
  }
  function askAmount(title, text, def, run) {
    openCard(title, `<p>${esc(text)}</p><div class="money-in"><label for="amt">Amount</label><input class="field small" id="amt" inputmode="decimal" value="${def}"></div>`, [{ label: 'Log it', main: true, run: (body) => run(parseFloat(String(body.querySelector('#amt').value).replace(/[^0-9.]/g, '')) || 0) }]);
  }

  /* ---------- Story cards (tap any building) ---------- */
  const SPECIAL_INFO = {
    chapel: ['Chapel', 'Faith'], bank: ['Bank', 'Money'], grocery: ['Grocery', 'Home'], diner: ['Diner', 'Friends'], townhall: ['Town Hall', null], park: ['Main park', 'Health'], home: ['Your home', 'Marriage'],
    kids: ['Kids’ Corner', null]
  };
  function storyFor(rec) {
    if (rec.starter) return rec.kind === 'family-home' ? `Built ${shortDate(rec.builtOn)}: the day your family founded the city.` : `Here since ${shortDate(rec.builtOn)}, when the city was founded.`;
    let s = rec.kind === 'deco' ? `Placed ${shortDate(rec.builtOn)}: ${rec.story}.` : `Built ${shortDate(rec.builtOn)}: ${rec.story}.`;
    for (const u of rec.upgrades || []) s += ` New floor ${shortDate(u.on)}: ${u.days} ${u.days === 1 ? 'day' : 'days'} of logging.`;
    return s;
  }
  function showBuilding(id) {
    const rec = state.buildings.find((b) => b.id === id);
    if (!rec) return;
    const title = rec.kind === 'family-home' ? 'Your home' : rec.name || (rec.kind === 'home' ? 'Neighbor’s home' : rec.kind[0].toUpperCase() + rec.kind.slice(1));
    const homey = rec.kind === 'home' || rec.kind === 'family-home';
    const goals = rec.kind === 'family-home' ? state.goals.filter((g) => g.area === 'Marriage') : [];
    const html = `<p class="big" style="font-size:16px">${esc(storyFor(rec))}</p>${homey ? `<p>${rec.floors} ${rec.floors === 1 ? 'floor' : 'floors'}${rec.floors < MAX_FLOORS ? ` · a new floor costs ${COSTS.upgrade} points` : ' · fully upgraded'}</p>` : ''}${goals.length ? `<p>Goals logged here: ${goals.map((g) => esc(g.label)).join(', ')}</p>` : ''}`;
    const btns = homey && rec.floors < MAX_FLOORS ? [{ label: `Add a floor (${COSTS.upgrade})`, main: true, disabled: state.points < COSTS.upgrade, run: () => { selected = { kind: 'building', id }; buildSmall('upgrade'); } }] : [];
    openCard(title, html, btns);
  }
  function showSpecial(id) {
    const founded = shortDate(state.startDate);
    if (id === 'board') { setMin(false); showTab('today'); later(50, () => { const h = [...$('paneToday').querySelectorAll('.h2')][0]; h && h.scrollIntoView({ block: 'start', behavior: REDUCED ? 'auto' : 'smooth' }); }); return; }
    if (id === 'clock') {
      const c = debtClock(state.money, today);
      const body = c.status === 'counting' ? `<p class="big">${monthYear(c.date)}</p><p>Your debt-free date at today's pace.${c.stolen ? ` Extra payments have stolen back <b>${c.stolen} ${c.stolen === 1 ? 'day' : 'days'}</b> so far.` : ' Every extra payment moves it sooner.'}</p>` : c.status === 'free' ? '<p class="big">Debt-free</p><p>The clock tower rings for your family.</p>' : c.status === 'none' ? '<p>No debt to count down. Nice.</p>' : '<p>Add a monthly debt payment to see the date.</p>';
      openCard('Debt-free clock tower', body + `<p>Built ${founded}: the day your family founded the city.</p>`, state.money.debt > 0 ? [{ label: 'Log an extra payment', main: true, run: () => askAmount('Extra debt payment', 'Anything above the minimum steals days back.', 100, (a) => { const p = extraDebtPayment(state, a); if (p) { city.spinClock(3); note(state, today, 'money', {}); toast('Days stolen back!', `${fmt$(p)} extra to debt`); updateStorm(); doUnlocks(); persist(); render(); } }) }] : []);
      return;
    }
    if (id === 'tower') {
      const cp = cushionPct(state.money);
      openCard('Cushion tower', `<p class="big">${cp.pct}%</p><p>${cp.label} full. The fuller the tower, the lower the water.</p><p>Built ${founded}: the day your family founded the city.</p>`);
      return;
    }
    if (id === 'garden') {
      openCard('Family garden', `<p class="big">${state.garden.length} ${state.garden.length === 1 ? 'crop' : 'crops'}</p><p>Every day you log anything, one crop sprouts. The payday train harvests them at 5 build points each.</p><p>Built ${founded}: the day your family founded the city.</p>`);
      return;
    }
    const [name, area] = SPECIAL_INFO[id] || [id, null];
    const goals = area ? state.goals.filter((g) => g.area === area) : [];
    openCard(name, `<p>Built ${founded}: the day your family founded the city.</p>${goals.length ? `<p>${area} goals are logged here: ${goals.map((g) => esc(g.label)).join(', ')}.</p>` : area ? `<p>No ${area.toLowerCase()} goal set, so this one rests.</p>` : ''}`);
  }
  function showStation() {
    const stars = starsNow(state, today);
    openCard('Payday train station', `<p>The train comes every payday. Next: <b>${state.setup.pay.next ? `${weekday(state.setup.pay.next)}, ${shortDate(state.setup.pay.next)}` : 'soon'}</b>.</p><p>${stars} ${stars === 1 ? 'star' : 'stars'} so far. Every car brings 3 materials and a decoration, and the train harvests your garden.</p>`);
  }
  const FAM_LINES = () => {
    const kid = state.family.find((m) => m.kind === 'kid'), adult = state.family.find((m) => m.kind === 'adult') || state.family[0];
    const open = state.goals.find((g) => g.perWeek > 0 && !g.done.includes(today));
    if (open && adult) return [adult.name, `Want to ${open.label.toLowerCase()} today?`];
    if (kid) return [kid.name, 'Can we go to the park?'];
    if (state.money.cushion < STARTER_CUSHION && adult) return [adult.name, `${Math.round((state.money.cushion / STARTER_CUSHION) * 100)}% of the way to a full cushion!`];
    return [adult?.name || 'Us', 'This town feels good.'];
  };
  let famLineTimer = 0;
  function sayHi() {
    if (!famTag) return;
    const [who, line] = FAM_LINES();
    famTag.el.querySelector('.t2').textContent = `${who}: "${line}"`;
    clearTimeout(famLineTimer); famLineTimer = setTimeout(() => { famTag.el.querySelector('.t2').textContent = 'Tap to say hi'; }, 4200);
  }

  /* ---------- Paper + settings ---------- */
  function openPaper() {
    const p = buildPaper(state, today, stormNow(state));
    $('paperBody').innerHTML = `<div class="mast" id="paperTitle">${esc(p.title)}</div><div class="dateline"><span>${esc(p.date)}</span><span>${esc(p.city)}</span></div>
      <h2>${esc(p.headline)}</h2><p>${esc(p.lede)}</p>
      <div class="npcols"><div><h3>${p.cols[0].h}</h3><p>${esc(p.cols[0].p)}</p></div><div><h3>${p.cols[1].h}</h3><p>${esc(p.cols[1].p)}</p></div></div>
      <div class="npcols"><div><h3>${p.cols[2].h}</h3><p>${esc(p.cols[2].p)}</p></div><div><h3>${p.cols[3].h}</h3><p>${esc(p.cols[3].p)}</p></div></div>
      <button type="button" class="npclose" id="paperClose">Fold up the paper</button>`;
    $('paper').hidden = false;
    $('paperClose').focus();
  }
  $('paperBtn').onclick = openPaper;
  $('paper').addEventListener('click', (e) => { if (e.target.id === 'paper' || e.target.id === 'paperClose') $('paper').hidden = true; });
  function openSettings(confirming = false) {
    const q = state.settings.quality;
    const seg = (v, l) => `<button type="button" data-q="${v}" aria-pressed="${q === v}">${l}</button>`;
    $('settingsBody').innerHTML = `<h2 id="settingsTitle">Settings</h2>
      <div class="set-row"><span>Sound and haptics</span><label class="toggle"><input type="checkbox" id="setSound"${state.settings.sound ? ' checked' : ''}> On</label></div>
      <div class="set-row"><span>Quality<br><small style="font-weight:700;color:var(--ink-soft)">Now: ${stage.quality === 'high' ? 'High' : 'Battery saver'}</small></span><div class="seg">${seg('auto', 'Auto')}${seg('high', 'High')}${seg('saver', 'Battery saver')}</div></div>
      <div class="set-row"><span>Gentle mode<br><small style="font-weight:700;color:var(--ink-soft)">Softer storm visuals</small></span><label class="toggle"><input type="checkbox" id="setGentle"${state.settings.gentle ? ' checked' : ''}> On</label></div>
      <div class="set-row"><span>Start over<br><small style="font-weight:700;color:var(--ink-soft)">Clears this city from this device</small></span>${confirming ? '<button type="button" class="btn main" data-s="reset">Yes, start over</button>' : '<button type="button" class="btn soft" data-s="ask">Start over</button>'}</div>
      <p class="foot">Life City · Phase 1 demo · progress is saved in this browser only.${state.demo ? ' You are looking at the sample city.' : ''}</p>
      <button type="button" class="btn soft close" data-s="close">Done</button>`;
    $('settings').hidden = false;
  }
  $('settingsBtn').onclick = () => openSettings();
  $('settings').addEventListener('click', (e) => {
    if (e.target.id === 'settings') { $('settings').hidden = true; return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.q) {
      state.settings.quality = b.dataset.q;
      stage.setQuality(b.dataset.q === 'auto' ? detectQuality() : b.dataset.q);
      autoChecked = true;
      persist(); openSettings();
    }
    if (b.dataset.s === 'close') $('settings').hidden = true;
    if (b.dataset.s === 'ask') openSettings(true);
    if (b.dataset.s === 'reset') { clearSave(); location.reload(); }
  });
  $('settings').addEventListener('change', (e) => {
    if (e.target.id === 'setSound') { sound.setEnabled(e.target.checked); setSoundIcon(); }
    if (e.target.id === 'setGentle') { state.settings.gentle = e.target.checked; render(); }
    persist();
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('paper').hidden = true; $('settings').hidden = true; closeCard(); } });

  /* ---------- Panel clicks ---------- */
  sheet.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.go) {
      const g = state.goals.find((x) => x.id === d.go);
      const obj = g && placeObj(AREA_INFO[g.area].place);
      if (obj) fly(obj.position);
      const bub = bubbles.get(d.go);
      if (bub) { const el = bub.el.querySelector('.bub'); el.classList.remove('ping'); void el.offsetWidth; el.classList.add('ping'); }
    }
    if (d.deliver) deliver(d.deliver);
    if (d.skip) skip(d.skip);
    if (d.build) buildSmall(d.build);
    if (d.recipe) buildRecipe(d.recipe);
    if (d.deco) placeDeco(d.deco);
    if (d.a === 'crates') { fly(train.stationPos); }
    if (d.a === 'paper') openPaper();
    if (d.a === 'payday') payday(parseFloat(String($('payAmt')?.value || '0').replace(/[^0-9.]/g, '')) || 0);
    if (d.a === 'levee') setLevee();
    if (d.a === 'extra') askAmount('Extra debt payment', 'Anything above the minimum payment steals days back on the clock tower.', 100, (a) => { const p = extraDebtPayment(state, a); if (p) { city.spinClock(3); note(state, today, 'money', {}); toast('Days stolen back!', `${fmt$(p)} extra to debt · ${fmt$(state.money.debt)} left`); updateStorm(); doUnlocks(); persist(); render(); } });
    if (d.a === 'debtpaid') openCard('Paid off a debt?', '<p>Mark this when one whole debt is paid to zero. It’s a real money step, so it opens Bridgeview.</p>', [{ label: 'Yes, we paid one off', main: true, run: () => { state.money.firstDebtPaid = true; note(state, today, 'money', {}); doUnlocks(); updateStorm(); persist(); render(); } }]);
    if (d.a === 'stall') { stall(state, 2); toast('Two paydays, no progress', 'The water crept up a little. One step pushes it back.'); updateStorm(2600); persist(); render(); }
  });
  sheet.addEventListener('change', (e) => { if (e.target.id === 'gentle') { state.settings.gentle = e.target.checked; persist(); } });
  $('tags').addEventListener('click', (e) => {
    const t = e.target.closest('[data-task]'); if (t) { logTask(t.dataset.task); return; }
    if (e.target.closest('[data-board]')) { showSpecial('board'); return; }
    const c = e.target.closest('[data-crate]'); if (c) openCrateById(c.dataset.crate);
  });

  /* ---------- Tap vs drag in the 3D view ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null;
  const canvas = $('scene');
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), quick = performance.now() - down.t < 450;
    down = null;
    if (moved > 8 || !quick) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const surprise = ray.intersectObjects([...sur.targets, ...actors.tapTargets], true).find((h) => { let o = h.object; while (o && !o.userData.surprise) o = o.parent; return o && o.visible !== false; });
    if (surprise) {
      let o = surprise.object; while (o && !o.userData.surprise) o = o.parent;
      const kind = o.userData.surprise;
      if (kind === 'family') { sayHi(); return; }
      if (kind === 'pets') { actors.wag(); fx.heartPop(o.position); sticker('pets'); return; }
      if (kind === 'balloon') fx.heartPop(o.position);
      sound.pop(); sticker(kind); return;
    }
    const th = ray.intersectObjects(train.tapTargets, true)[0];
    if (th) {
      let o = th.object; while (o && o.userData.carId === undefined && o.parent && !train.tapTargets.includes(o)) o = o.parent;
      const id = o.userData.carId;
      const car = id && state.train.cars.find((c) => c.id === id);
      if (car && !car.opened && !train.moving) { openCrateById(id); return; }
      showStation(); return;
    }
    const hit = ray.intersectObjects(city.hitRoot.children, false)[0];
    if (!hit) { select(null); return; }
    const u = hit.object.userData;
    sound.tap();
    if (u.kind === 'lot') select({ kind: 'lot', key: u.key });
    else if (u.kind === 'building') { select({ kind: 'building', id: u.id }); showBuilding(u.id); }
    else if (u.kind === 'special') { select(null); showSpecial(u.id); }
  });
  /* Sound waits for the first tap anywhere. */
  addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });

  /* ---------- Layout ---------- */
  let tagMinY = 170;
  function resize() {
    stage.resize();
    tagMinY = $('hud').getBoundingClientRect().bottom + 52;
    document.documentElement.style.setProperty('--sheet-h', sheet.getBoundingClientRect().height + 'px');
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(sheet);

  /* ---------- Daily refresh (on load and when the date changes) ---------- */
  function daily() {
    today = dateKey();
    easeBars(state, today);
    refillOrders(state, today);
    let arrived = false;
    if (state.setup.pay.next && state.setup.pay.next <= today && (!state.train.lastPayday || state.train.lastPayday < state.setup.pay.next)) {
      advanceNextPayday();
      arrived = true;
    } else if (state.setup.pay.next && state.setup.pay.next < today) advanceNextPayday();
    persist();
    return arrived;
  }
  const paydayDue = daily();
  setInterval(() => { if (dateKey() !== today) { if (daily()) trainArrive(true); render(); } }, 60000);

  /* ---------- Art pack (if Brad has added one) ---------- */
  loadArtPack().then((art) => {
    if (!Object.keys(art).length) return;
    city.applyArt(art);
    if (art.car) actors.makeCars(art);
  }).catch(() => {});

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let autoChecked = state.settings.quality !== 'auto' || stage.quality !== 'high';
  let autoStart = 0, rainT = 0;
  const fpsEl = DEBUG ? Object.assign(document.createElement('div'), { style: 'position:fixed;left:8px;bottom:8px;z-index:50;background:#1E2B3C;color:#fff;font:700 12px monospace;padding:4px 8px;border-radius:8px;pointer-events:none' }) : null;
  if (fpsEl) document.body.appendChild(fpsEl);
  const _up = new THREE.Vector3(0, 0.55, 0);
  stage.renderer.info.autoReset = false;
  function frame(now) {
    stage.renderer.info.reset();
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    tickTweens(now);
    meter.tick(now);
    const sv = stormVisual(stage.storm, state.settings.gentle);
    waterUniforms.uTime.value = REDUCED ? 0 : t; waterUniforms.uStorm.value = sv;
    swayUniforms.uTime.value = REDUCED ? 0 : t; swayUniforms.uSway.value = REDUCED ? 0 : 0.06 + sv * 0.16; swayUniforms.uSpeed.value = 1.3 + sv * 1.5;
    stage.applyMood(stage.night, sv);
    const wy = waterY(sv); stage.water.position.y = wy; city.setWaterLevel(wy);
    rain.tick(t, sv);
    if ((rainT += dt) > 0.5) { rainT = 0; sound.setRain(rain.intensity); }
    city.tick(dt, t);
    actors.tick(dt, t, sv);
    sur.tick(dt, t);
    fx.tick(dt);
    if (marker.visible) marker.position.y = marker.userData.baseY + Math.sin(t * 4) * 0.08;
    if (famTag && actors.leaderPos()) famTag.pos.copy(actors.leaderPos()).add(_up);
    crateBubbles.forEach((b, i) => { if (b) b.pos.copy(train.carPos(i)); });
    controls.update();
    const cd = camera.position.distanceTo(controls.target); scene.fog.near = cd * 0.95; scene.fog.far = cd * 2.3;
    tags.place(camera, tagMinY);
    stage.render();
    /* Auto quality: if High can't hold ~45 fps after warm-up, step down to Battery saver. */
    if (!autoChecked) {
      if (!autoStart) autoStart = now;
      if (now - autoStart > 6000) {
        autoChecked = true;
        if (meter.fps < 42) { stage.setQuality('saver'); toast('Switched to Battery saver', 'For smoother play on this device. Change it in Settings.'); }
      }
    }
    if (fpsEl && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) fpsEl.textContent = `${meter.fps.toFixed(0)} fps · ${stage.quality} · ${stage.renderer.info.render.calls} draws`;
    requestAnimationFrame(frame);
  }

  resize();
  stage.resetView();
  showTab('today');
  if (!REDUCED) {
    const endPos = camera.position.clone();
    const hv = stage.homeView();
    const startPos = hv.target.clone().addScaledVector(hv.dir, hv.dist * 1.45).add(new THREE.Vector3(-6, 3, 4));
    camera.position.copy(startPos);
    tween(2200, (k) => { camera.position.lerpVectors(startPos, endPos, easeInOut(k)); });
  }
  mark('ui');
  requestAnimationFrame((n) => { frame(n); mark('first frame'); if (DEBUG) console.info('[timing] ' + T.map(([k, v], i) => i ? k + ' ' + Math.round(v - T[i - 1][1]) + 'ms' : '').join(' · ')); $('boot').classList.add('done'); });
  later(1600, () => updateStorm(3200));
  setInterval(() => { if (!document.hidden && !REDUCED) { const k = pick(['balloon', 'birds', 'icecream']); if (sur.launch(k) && k === 'birds') sound.birds(); } }, 16000);
  later(6000, () => sur.launch('balloon'));
  if (paydayDue) later(3000, () => trainArrive(true));

  /* First visit: the city appears at the family's real storm level, then one move drops the water. */
  if (opts.first && state.firstMove) later(2600, () => showFirstMove());
  function showFirstMove() {
    const el = $('callout');
    const lvl = stormLabel(stormNow(state));
    let html;
    if (state.money.debt > 0 && !state.money.payoffDate) html = `<b>Storm level: ${lvl}</b><p>That's your real starting point, and it's okay. One move drops it right now: pick a payoff date and a wall goes up.</p><button type="button" class="btn main" data-f="levee">Set a payoff date</button> <button type="button" class="btn link" data-f="later">Look around first</button>`;
    else if (state.money.cushion < STARTER_CUSHION) html = `<b>Storm level: ${lvl}</b><p>The next payday toward your Starter Cushion pushes it back. Open the Storm tab when it lands.</p><button type="button" class="btn main" data-f="storm">Open the Storm tab</button> <button type="button" class="btn link" data-f="later">Look around first</button>`;
    else html = `<b>Calm water around ${esc(state.setup.cityName)}</b><p>Log a goal at any bubble to earn your first build points.</p><button type="button" class="btn main" data-f="later">Let's go</button>`;
    el.innerHTML = html; el.hidden = false;
    el.onclick = (e) => {
      const f = e.target.closest('[data-f]')?.dataset.f; if (!f) return;
      el.hidden = true; state.firstMove = false; persist();
      if (f === 'levee') setLevee();
      if (f === 'storm') { setMin(false); showTab('storm'); }
    };
  }

  if (DEBUG) window.__lc = { state, stage, city, train, meter, actions: { logTask, payday, trainArrive, openCrateById, deliver, setLevee, select, buildSmall, buildRecipe } };
}

/* ---------- PWA: offline cache (production builds only) ---------- */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
}

start();
