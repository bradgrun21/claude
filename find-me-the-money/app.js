/* Find Me the Money: screens and interactions. All data stays in this browser (localStorage). */
(function () {
  'use strict';
  var F = window.FMTM;
  // shown at the bottom of Settings, so it's easy to tell which version a phone is running (keep in step with sw.js)
  var APP_VERSION = '11-01g';
  // milestones shown in the app ("days stolen back" ones are left out: they depend on payday predictions)
  var BADGES = F.BADGES.filter(function (b) { return !/^days-/.test(b.id); }).concat([{ id: 'ch30-l1', title: 'Level 1 complete', desc: 'Finished the 30-Day Challenge: 30 days in a row.', test: function (f) { return !!f.ch30done; } }]);

  // ---------- settings for the beta ----------
  var CONFIG = {
    feedbackUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSegoJHMVLzFlS6-o_XvC1Y6K4Dr_8qPa_fpCAMoywp8EnggzQ/viewform', // beta feedback form; shows a Feedback tab on every screen
    storageKey: 'fmtm.v1',
    // Optional accounts, so a plan follows someone to any phone. These two values are public by design;
    // each person can only read their own row (row level security on the plans table).
    supabaseUrl: 'https://ktgwaedkaxsrqencglnu.supabase.co',
    supabaseKey: 'sb_publishable_SRQX7Tks3rdEkwYcaavYbw_cAl5ce6q',
    // Payday reminders (OneSignal web push). The App ID is public; the key that sends lives only in Supabase.
    oneSignalAppId: '3c20b5fb-493d-4da3-b894-fdc3d9614d3b',
    shareUrl: 'findmethemoney.netlify.app', // printed on share cards
    supportEmail: '', // TODO(Brad): your support email, for "Message Brad" on the chat's care card and the privacy page (until then: the community link)
    youtubeUrl: 'https://www.youtube.com/channel/UCPJ-EMNmCkH4oom-kRxNapQ', // short videos; shown on the Community tab
    communityUrl: 'https://www.skool.com/find-me-the-money-1929/about', // your Skool community link; the Community tab's join button opens it
    coachingUrl: 'https://www.skool.com/find-me-the-money-1929/plans?src=join', // where "Learn about coaching" goes (paid level or booking page); empty uses the community link
    // Partner links for Earn challenges. Leave url empty until you're approved for an official affiliate or partner
    // program (not a personal referral code). The disclosure shows automatically next to any link that's set.
    partners: {
      resale: { label: 'Start selling', url: '' },
      rideshare: { label: 'Sign up to drive', url: '' },
      delivery: { label: 'Sign up to deliver', url: '' },
      care: { label: 'Find pet-sitting and babysitting gigs', url: '' }
    }
  };

  // ---------- small helpers ----------
  function money(n) { return '$' + Math.round(n || 0).toLocaleString('en-US'); }
  function money2(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(v) { var n = parseFloat(String(v).replace(/[$,\s]/g, '')); return isNaN(n) ? 0 : n; }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  // "today" is the date in the plan's time zone (Settings), so the daily checklist, the calendar and safe-to-spend
  // all turn over at the person's own midnight
  function today() { return F.fromIso(F.dayIn(typeof P !== 'undefined' && P ? P.tz : null, new Date())); }
  // Settings: the time zone (pre-filled from the phone) and the day weeks start on
  var TZ_US = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Phoenix', 'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu'];
  function tzName(z) { return String(z).replace(/^.*\//, '').replace(/_/g, ' ') + ' (' + z.split('/')[0] + ')'; }
  function daysCard() {
    var all = []; try { all = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []; } catch (e) {}
    var list = TZ_US.concat([P.tz, phoneTz()]).concat(all).filter(function (z, i, a) { return z && a.indexOf(z) === i; });
    return '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Your days</b>' +
      '<label class="setrow"><span>🕰️ Time zone</span><select data-set="tz" aria-label="Time zone">' + list.map(function (z) { return '<option value="' + esc(z) + '"' + (z === P.tz ? ' selected' : '') + '>' + esc(i18nTz(z)) + '</option>'; }).join('') + '</select></label>' +
      '<label class="setrow"><span>📅 My week starts on</span><select data-set="weekStart" aria-label="My week starts on">' + DOW.map(function (d, i) { return '<option value="' + i + '"' + (i === weekDay0() ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label></div>';
  }
  function i18nTz(z) { var n = { 'America/New_York': 'Eastern', 'America/Chicago': 'Central', 'America/Denver': 'Mountain', 'America/Phoenix': 'Arizona', 'America/Los_Angeles': 'Pacific', 'America/Anchorage': 'Alaska', 'Pacific/Honolulu': 'Hawaii' }[z]; return n ? n + ' time' : tzName(z); }
  function phoneTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'; } catch (e) { return 'America/Chicago'; } }
  // one week for the whole app, starting on the day picked in Settings (0 Sunday ... 6 Saturday)
  function weekDay0() { return typeof P !== 'undefined' && P && P.weekStart >= 0 && P.weekStart <= 6 ? +P.weekStart : 0; }
  var DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dowLetters() { var l = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], w = weekDay0(); return l.slice(w).concat(l.slice(0, w)); }
  function shortDate(d) { return d ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''; }
  function longDate(d) { return d ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''; }
  function dayMonth(d) { return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function span(days) {
    var y = Math.floor(days / 365), m = Math.floor((days - y * 365) / 30.44);
    if (y && m) return plural(y, 'year') + ', ' + plural(m, 'month');
    if (y) return plural(y, 'year');
    return m ? plural(m, 'month') : plural(Math.max(1, Math.round(days / 7)), 'week');
  }
  function parts(days) {
    if (days < 61) { var w = Math.floor(days / 7); return [[w, w === 1 ? 'week' : 'weeks'], [days - w * 7, days - w * 7 === 1 ? 'day' : 'days']]; }
    var y = Math.floor(days / 365), rem = days - y * 365, m = Math.floor(rem / 30.44), d = Math.round(rem - m * 30.44), out = [];
    if (y) out.push([y, y === 1 ? 'year' : 'years']);
    out.push([m, m === 1 ? 'month' : 'months'], [d, d === 1 ? 'day' : 'days']);
    return out;
  }
  function track(name) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'event-' + name, title: name, event: true }); } catch (e) {} actAdd(name); }
  // ---------- activity for signed-in people: what they did and when, never amounts or names ----------
  // events wait on the phone (setup happens before sign-in) and go up in small batches
  var ACT = 'fmtm.act', actTimer = null;
  function actAdd(name) {
    try { var q = JSON.parse(localStorage.getItem(ACT) || '[]'); q.push({ event: String(name).slice(0, 60), at: new Date().toISOString() }); localStorage.setItem(ACT, JSON.stringify(q.slice(-300))); } catch (e) {}
    if (typeof S !== 'undefined' && S) { clearTimeout(actTimer); actTimer = setTimeout(actFlush, 4000); }
  }
  function actFlush() {
    var q; try { q = JSON.parse(localStorage.getItem(ACT) || '[]'); } catch (e) { q = []; }
    if (!S || !q.length || !cloudOn()) return;
    fresh().then(function () { return sb('/rest/v1/activity', { method: 'POST', auth: true, body: q, headers: { Prefer: 'return=minimal' } }); }).then(function () {
      try { var now = JSON.parse(localStorage.getItem(ACT) || '[]'); localStorage.setItem(ACT, JSON.stringify(now.slice(q.length))); } catch (e) {}
    }, function () {});
  }
  // who this phone's person is: first name and email-list choice (not part of the plan, which a spouse may share)
  var ME_KEY = 'fmtm.me';
  function me() { try { return JSON.parse(localStorage.getItem(ME_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function setMe(x) { try { localStorage.setItem(ME_KEY, JSON.stringify(Object.assign(me(), x))); } catch (e) {} }
  function peopleSave() {
    if (!S || !cloudOn()) return;
    var m = me(), row = { user_id: S.uid, email: S.email || null, last_seen: new Date().toISOString(), step: P.setupDone ? Math.min(7, F.outlook(profile(), today()).step) : null };
    if (m.name) row.first_name = m.name;
    if (m.optIn != null) row.marketing_opt_in = !!m.optIn;
    fresh().then(function () { return sb('/rest/v1/people?on_conflict=user_id', { method: 'POST', auth: true, body: row, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } }); }).catch(function () {});
  }
  // on a new phone, bring back the name saved with the account
  function peopleLoad() {
    if (!S || !cloudOn()) return Promise.resolve();
    return fresh().then(function () { return sb('/rest/v1/people?user_id=eq.' + S.uid + '&select=first_name,marketing_opt_in', { auth: true }); }).then(function (rows) {
      var r = rows && rows[0], m = me();
      if (r && r.first_name && !m.name) setMe({ name: r.first_name });
      if (r && m.optIn == null) setMe({ optIn: r.marketing_opt_in });
    }).catch(function () {});
  }
  // once a day while signed in: last seen, current step, and any waiting events
  function peopleDaily() {
    if (!S) return;
    var d = F.isoDay(today()); try { if (localStorage.getItem('fmtm.seen') === d) { actFlush(); return; } localStorage.setItem('fmtm.seen', d); } catch (e) {}
    peopleLoad().then(function () { peopleSave(); actFlush(); if (U.screen === 'home') render(); });
  }
  function firstName() { return String(me().name || '').trim(); }

  // ---------- saved data ----------
  function blank() {
    return { v: 1, setupDone: false, paycheck: '', freq: 'biweekly', nextPay: F.isoDay(F.addDays(today(), 7)),
      bills: [['Rent', 'home'], ['Electricity', 'utilities'], ['Internet', 'utilities'], ['Phone', 'utilities'], ['Groceries', 'food'], ['Gas', 'transport'], ['Car insurance', 'transport']].map(function (x) { return { name: x[0], amount: '', group: x[1] }; }),
      debts: [], savings: '', givingPct: 0, giveMode: 'pct', giveMonthly: '', payVaries: false, payHist: [], payBasis: 'low', fun: '', goals: [], tx: [], txFrom: null, txTo: null, sorted: {}, lastHeadline: null, history: [],
      streak: { count: 0, best: 0, grace: 0, lastPayday: null }, totals: { debtPaid: 0, saved: 0, daysBack: 0 }, lastFree: null, prevSavings: null, prevGoals: {},
      challenges: [], challengesDone: 0, badges: {}, unseen: [], plans: [], plansDone: 0, shares: 0, basics: '', unlocked: {}, installSeen: false, communityJoined: false, funParts: [], found: null,
      efMonths: '', retire: '', kids: '', college: '', home: '', mortgage: '', qPay: '', qExp: '', qDebt: '', qMin: '', quick: null, spends: [], household: '', payLabel: '', incomes: [], retirements: [], otherIncome: [], storeLine: {}, weeks: {}, merchantMem: {}, intro: {}, qPayMonth: '', payAuto: false, basicsAuto: false,
      retirePct: '', retireMonthly: '', retireBal: '', retireFrom: '', collegeBal: '', collegeMonthly: '', mortgagePay: '', mortgageRate: '' };
  }
  var storageOk = true, firstOpen = false;
  function load() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey); if (!raw) { firstOpen = true; return blank(); }
      var d = JSON.parse(raw); delete d.x; delete d.moneyDate; delete d.moneyDates; if (d.remind) d.remind.payday = false;
      // plans saved before features unlocked gradually keep everything they already had
      if (d.setupDone && !d.unlocked) d.unlocked = { challenges: true, milestones: true };
      // one retirement answer becomes the first retirement account
      if (!d.retirements && (num(d.retirePct) || num(d.retireMonthly) || num(d.retireBal))) d.retirements = [{ id: uid(), owner: 0, type: d.retireFrom === 'post' ? 'IRA' : '401(k)', pct: d.retirePct || '', monthly: d.retireMonthly || '', bal: d.retireBal || '', from: d.retireFrom || 'pre' }];
      // bills saved before budget groups existed get placed by name
      (d.bills || []).forEach(function (b) { if (!b.group) b.group = F.groupFor(b.name); });
      // the challenge's days moved to the daily checklist everyone has
      window.FMTMDaily.migrate(d);
      return Object.assign(blank(), d);
    }
    catch (e) { storageOk = false; return blank(); }
  }
  // Before a plan is deleted or replaced, keep a copy for 30 days so it can be brought back.
  var TRASH = 'fmtm.v1.trash';
  function keepCopy() { try { if (P.setupDone || P.debts.length || P.paycheck) localStorage.setItem(TRASH, JSON.stringify({ at: F.isoDay(today()), plan: P })); } catch (e) {} }
  function trashed() {
    try { var t = JSON.parse(localStorage.getItem(TRASH) || 'null'); if (!t || !t.plan || F.daysBetween(F.fromIso(t.at), today()) > 30) return null; return t; } catch (e) { return null; }
  }
  // savedAt only moves when something really changed, so a phone that just opened the app never looks newer than the cloud
  var lastJ = null;
  function save() {
    try {
      var j = JSON.stringify(Object.assign({}, P, { savedAt: 0 }));
      if (j !== lastJ) { if (lastJ !== null) P.savedAt = Date.now(); lastJ = j; cloudQueue(); }
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(P)); storageOk = true;
    } catch (e) { storageOk = false; }
  }
  var P = load();
  if (!F.validTz(P.tz)) P.tz = phoneTz();
  if (!(P.weekStart >= 0 && P.weekStart <= 6)) P.weekStart = 0;
  lastJ = JSON.stringify(Object.assign({}, P, { savedAt: 0 }));

  // ---------- account and sync (Supabase, optional) ----------
  // Signed out, nothing leaves the phone. Signed in, the plan is saved to the person's own row after each change.
  var AUTH = 'fmtm.auth', C = { state: 'idle', ready: false, timer: null, busy: false };
  var S = (function () { try { return JSON.parse(localStorage.getItem(AUTH) || 'null'); } catch (e) { return null; } })();
  function cloudOn() { return !!(CONFIG.supabaseUrl && CONFIG.supabaseKey); }
  function keepAuth() { try { if (S) localStorage.setItem(AUTH, JSON.stringify(S)); else localStorage.removeItem(AUTH); } catch (e) {} }
  function setSession(r) {
    S = Object.assign(S || {}, { at: r.access_token, rt: r.refresh_token, exp: Date.now() + (r.expires_in || 3600) * 1000 });
    if (r.user) { S.uid = r.user.id; S.email = r.user.email; }
    keepAuth();
  }
  function sb(path, o) {
    o = o || {};
    var h = Object.assign({ apikey: CONFIG.supabaseKey, 'Content-Type': 'application/json' }, o.headers || {});
    if (o.auth && S) h.Authorization = 'Bearer ' + S.at;
    return fetch(CONFIG.supabaseUrl + path, { method: o.method || 'GET', headers: h, body: o.body ? JSON.stringify(o.body) : undefined }).then(function (r) {
      return r.text().then(function (t) { var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) { var er = new Error((d && (d.msg || d.error_description || d.message)) || 'HTTP ' + r.status); er.status = r.status; throw er; } return d; });
    });
  }
  function fresh() {
    if (!S) return Promise.reject(new Error('signed out'));
    if (S.exp - Date.now() > 60000) return Promise.resolve();
    return sb('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: S.rt } }).then(setSession, function (er) {
      if (er.status === 400 || er.status === 401) { S = null; keepAuth(); C.state = 'expired'; }
      throw er;
    });
  }
  // The last copy both sides agreed on, so two phones' changes can be combined instead of one replacing the other
  var BASE = 'fmtm.base';
  function getBase() { try { return JSON.parse(localStorage.getItem(BASE) || 'null'); } catch (e) { return null; } }
  function setBase(d) { try { localStorage.setItem(BASE, JSON.stringify(d)); } catch (e) {} }
  function J(x) { return JSON.stringify(x === undefined ? null : x); }
  function keyOf(x) { return x && typeof x === 'object' ? x.uid || x.id : null; }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  // three-way merge: a field only one side changed takes that side; lists of items with ids merge item by item
  function merge3(b, m, t) {
    b = isObj(b) ? b : {}; var out = {};
    Object.keys(Object.assign({}, m, t)).forEach(function (k) {
      var bj = J(b[k]), mj = J(m[k]), tj = J(t[k]), v;
      if (mj === tj || tj === bj) v = m[k];
      else if (mj === bj) v = t[k];
      else if (Array.isArray(m[k]) && Array.isArray(t[k]) && m[k].concat(t[k]).every(keyOf)) v = mergeList(Array.isArray(b[k]) ? b[k] : [], m[k], t[k]);
      else if (isObj(m[k]) && isObj(t[k])) v = merge3(b[k], m[k], t[k]);
      else v = m[k];
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  function mergeList(b, m, t) {
    var bm = {}, mm = {}, tm = {}, out = [];
    b.forEach(function (x) { if (keyOf(x)) bm[keyOf(x)] = x; }); m.forEach(function (x) { mm[keyOf(x)] = x; }); t.forEach(function (x) { tm[keyOf(x)] = x; });
    var take = function (k) {
      var inB = k in bm, x;
      if (k in mm && k in tm) x = J(mm[k]) === J(bm[k]) ? tm[k] : (J(tm[k]) === J(bm[k]) ? mm[k] : (isObj(mm[k]) && isObj(tm[k]) ? merge3(bm[k], mm[k], tm[k]) : mm[k]));
      else if (k in mm) x = !inB || J(mm[k]) !== J(bm[k]) ? mm[k] : null; // the other phone deleted it, unless this one changed it
      else x = !inB || J(tm[k]) !== J(bm[k]) ? tm[k] : null;
      if (x) out.push(x);
    };
    var seen = {};
    t.concat(m).forEach(function (x) { var k = keyOf(x); if (!seen[k]) { seen[k] = 1; take(k); } });
    return out;
  }
  // who this plan belongs to: your own, or the one your spouse shared with you
  function cloudWho() {
    return sb('/rest/v1/plan_members?select=owner_id,owner_email,member_id,member_email', { auth: true }).then(function (rows) {
      var mine = (rows || []).filter(function (r) { return r.member_id === S.uid; })[0], part = (rows || []).filter(function (r) { return r.owner_id === S.uid; })[0];
      S.owner = mine ? mine.owner_id : S.uid; S.role = mine ? 'member' : 'owner'; S.partner = mine ? mine.owner_email : part ? part.member_email : null; S.partnerId = part ? part.member_id : null; S.shareReady = true; keepAuth();
    }, function () { S.owner = S.uid; S.role = 'owner'; S.partner = null; S.shareReady = false; });
  }
  function shared() { return !!(S && S.partner); }
  function cloudPaint() { if ((U.screen === 'settings' || U.screen === 'account') && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) render(); }
  function adopt(row) {
    if (P.setupDone) keepCopy();
    P = Object.assign(blank(), row.data); lastJ = JSON.stringify(Object.assign({}, P, { savedAt: 0 }));
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(P)); } catch (e) {}
    S.synced = P.savedAt || 0; keepAuth(); setBase(row.data);
  }
  // Compares this phone with the account copy. Whichever changed since the last sync wins; if both did,
  // the newer one wins and the other is kept as the 30-day "bring back" copy.
  function cloudPull(first) {
    if (!S || !cloudOn()) return Promise.resolve();
    return fresh().then(cloudWho).then(function () { return sb('/rest/v1/plans?select=data,updated_at&user_id=eq.' + S.owner, { auth: true }); }).then(function (rows) {
      var row = rows && rows[0], remote = row && row.data;
      C.ready = true;
      if (!remote || !remote.setupDone) { if (P.setupDone) return cloudPush(); C.state = 'saved'; return; }
      var rAt = remote.savedAt || 0, lAt = P.savedAt || 0;
      if (S.synced == null && P.setupDone && JSON.stringify(Object.assign(blank(), remote, { savedAt: 0 })) !== lastJ) { C.ready = false; U.cloudPick = { at: rAt, row: row }; go('cloudpick'); return; }
      if (S.synced == null || !P.setupDone || (rAt > (S.synced || 0) && lAt <= (S.synced || 0))) {
        if (rAt !== lAt || !P.setupDone) { adopt(row); C.state = 'saved'; if (first || !P.setupDone) U.screen = 'home'; render(); return; }
      }
      if (rAt > (S.synced || 0) && lAt > (S.synced || 0)) { combine(remote); render(); return cloudPush(); }
      if (lAt > rAt) return cloudPush();
      S.synced = rAt; keepAuth(); setBase(remote); C.state = 'saved';
    }).catch(function () { C.state = S ? 'offline' : 'expired'; }).then(cloudPaint);
  }
  function cloudPush() {
    if (!S || !C.ready || !P.setupDone) return Promise.resolve();
    C.timer = null;
    if (C.busy) { cloudQueue(); return Promise.resolve(); }
    C.busy = true; C.state = 'saving';
    var at = P.savedAt || Date.now();
    return fresh().then(function () {
      // someone else saved since this phone last synced? fold their changes in first
      return sb('/rest/v1/plans?select=data&user_id=eq.' + (S.owner || S.uid), { auth: true }).then(function (rows) {
        var r = rows && rows[0] && rows[0].data;
        if (r && r.setupDone && (r.savedAt || 0) > (S.synced || 0) && S.synced != null) { combine(r); at = P.savedAt; render(); }
      });
    }).then(function () {
      return sb('/rest/v1/plans?on_conflict=user_id', { method: 'POST', auth: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: S.owner || S.uid, data: P, updated_at: new Date().toISOString() } });
    }).then(function () { if (S) { S.synced = at; keepAuth(); setBase(P); } C.state = 'saved'; }, function () { C.state = S ? 'offline' : 'expired'; })
      .then(function () { C.busy = false; cloudPaint(); });
  }
  function combine(remote) {
    var m = merge3(getBase(), JSON.parse(JSON.stringify(P)), remote);
    P = Object.assign(blank(), m); P.savedAt = Math.max(Date.now(), (remote.savedAt || 0) + 1);
    lastJ = JSON.stringify(Object.assign({}, P, { savedAt: 0 }));
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(P)); } catch (e) {}
  }
  function cloudQueue() { if (!S || !C.ready) return; clearTimeout(C.timer); C.timer = setTimeout(cloudPush, 1500); }
  function signedIn(r) {
    setSession(r); delete S.synced; keepAuth(); setBase(null); U.cloudStep = null; U.err = ''; track('account-signin');
    peopleLoad().then(function () { peopleSave(); actFlush(); });
    if (U.joinMode) { U.screen = 'account'; return cloudWho().then(function () { render(); var c = app.querySelector('[data-cjoin]'); if (c) c.focus(); }); }
    return cloudPull(true).then(function () {
      if (U.obAfter && U.screen !== 'cloudpick') { if (!P.setupDone) finishSetup(); U.obAfter = false; U.toast = null; peopleSave(); track('journey-saved'); go('steps'); return; }
      if (U.afterSave && U.screen !== 'cloudpick' && !standalone()) { U.toast = ['Saved to your account.', 'Your plan is safe now.', true]; go('saveinstall'); return; }
      if (U.afterSave && U.screen !== 'cloudpick') { U.toast = ['Saved to your account.', 'Your plan is safe now.', true]; go('saveinstall'); return; } if (U.screen !== 'cloudpick' && U.screen !== 'home' && !P.setupDone) { U.joinOpen = true; go('account'); return; } if (U.screen !== 'cloudpick' && U.screen !== 'home') { U.toast = ['You’re signed in.', 'Your plan now saves to your account and follows you to any phone.', true]; go(P.setupDone ? 'home' : 'welcome'); } else if (U.screen === 'home') { U.toast = ['You’re signed in.', 'Your plan came with you.', true]; render(); } });
  }
  // A sign-in link opened in this browser lands here with the session in the address
  function cloudStart() {
    if (!cloudOn()) return;
    var h = location.hash || '';
    if (/access_token=/.test(h)) {
      var q = {}; h.slice(1).split('&').forEach(function (kv) { var x = kv.split('='); q[x[0]] = decodeURIComponent(x[1] || ''); });
      try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
      S = { at: q.access_token, rt: q.refresh_token, exp: Date.now() + (+q.expires_in || 3600) * 1000 };
      sb('/auth/v1/user', { auth: true }).then(function (u) { signedIn({ access_token: S.at, refresh_token: S.rt, expires_in: +q.expires_in || 3600, user: u }); }, function () { S = null; keepAuth(); });
      return;
    }
    if (/error_description=/.test(h)) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} U.err = 'That sign-in link expired. Ask for a new code below.'; U.screen = 'account'; }
    if (S) cloudPull(false);
  }
  // ---------- payday reminders (OneSignal) ----------
  // The SDK loads only for people who turn reminders on. A daily job in Supabase decides who is due;
  // the phone just subscribes and links itself to the person's account.
  var OS = { p: null };
  function pushOk() { return !!(CONFIG.oneSignalAppId && 'Notification' in window && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')); }
  function oneSignal() {
    if (OS.p) return OS.p;
    OS.p = new Promise(function (res, rej) {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(function (os) {
        os.init({ appId: CONFIG.oneSignalAppId, serviceWorkerPath: 'sw.js', serviceWorkerParam: { scope: '/' }, notifyButton: { enable: false }, autoResubscribe: true }).then(function () { OS.os = os; res(os); }, rej);
      });
      var sc = document.createElement('script'); sc.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'; sc.defer = true;
      sc.onerror = function () { OS.p = null; rej(new Error('load')); }; document.head.appendChild(sc);
    });
    return OS.p;
  }
  function remindOn() {
    if (!S) return;
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    U.remErr = '';
    // iPhone only shows the prompt when it's asked right on the tap, so ask straight away when the SDK is ready
    var ask = OS.os ? Promise.resolve(OS.os.Notifications.requestPermission()).then(function () { return OS.os; }) : oneSignal().then(function (os) { return os.Notifications.requestPermission().then(function () { return os; }); });
    ask.then(function (os) {
      return Promise.resolve().then(function () {
        if (!os.Notifications.permission) throw new Error('denied');
        return os.login(S.uid).then(function () { return os.User.PushSubscription.optIn(); });
      });
    }).then(function () {
      P.remind = Object.assign({ payday: false, bills: true, hour: 9, challenge: true, chHour: 20 }, P.remind || {}, { on: true }, U.remWant || {}); P.tz = P.tz || tz || '';
      U.remWant = null; save(); track('reminders-on'); U.toast = ['Reminders are on.', 'Change them anytime in Settings.', true]; render();
    }, function (er) {
      U.remErr = er && er.message === 'denied' ? 'Your phone said no to notifications. Turn them on for this app in your phone\u2019s settings, then try again.' : 'We couldn\u2019t turn on reminders right now. Check your connection and try again.';
      render();
    });
  }
  function remindOff() {
    P.remind = Object.assign({}, P.remind || {}, { on: false }); save(); track('reminders-off');
    if (OS.p) OS.p.then(function (os) { return os.User.PushSubscription.optOut(); }).catch(function () {});
    render();
  }
  // a phone that already said yes reconnects quietly when the app opens
  function remindResume() { if (S && P.remind && P.remind.on && pushOk() && window.Notification && Notification.permission === 'granted') oneSignal().then(function (os) { return os.login(S.uid); }).catch(function () {}); }
  function remindCard(compact) {
    if (!CONFIG.oneSignalAppId) return '';
    var r = P.remind || {}, head = '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="eyebrow">Reminders</div><b>' + (compact ? 'Want a reminder when a bill is due?' : 'Reminders') + '</b>';
    var why = '<span style="font-size:14px;color:var(--muted)">A short note the day before a bill is due. Nothing else.</span>';
    if (!S) return compact ? '' : head + why + '<span style="font-size:14px">Save your plan with your email first. Reminders follow your account.</span><button type="button" class="outline" data-a="edit" data-v="account">Save my plan</button></div>';
    if (isIOS() && !standalone()) return head + why + '<span style="font-size:14px">On iPhone, reminders work from the Home Screen app. Add it there, open it, and turn them on.</span><button type="button" class="outline" data-a="edit" data-v="install">Show me how</button></div>';
    if (!pushOk()) return compact ? '' : head + '<span style="font-size:14px;color:var(--muted)">This browser can\u2019t show reminders. Try the Home Screen app, or Chrome on Android.</span></div>';
    if (window.Notification && Notification.permission === 'denied') return head + '<span style="font-size:14px">Notifications are blocked for this app. Turn them on in your phone\u2019s settings, then come back.</span></div>';
    if (!r.on) { oneSignal().catch(function () {}); }
    if (!r.on) return head + why + '<button type="button" class="primary" data-a="remindon">Turn on reminders</button>' + (U.remErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.remErr) + '</p>' : '') + '</div>';
    if (compact) return '';
    var tog = function (k, label) { var on = r[k] !== false; return '<div class="tglrow"><span>' + label + '</span><button type="button" role="switch" class="tgl' + (on ? ' on' : '') + '" aria-checked="' + on + '" aria-label="' + label + '" data-a="remindk" data-v="' + k + '"><i></i></button></div>'; };
    var chOn = r.challenge !== false, hr = r.chHour || 20;
    return head + '<span style="font-size:14px;color:var(--muted)">\u2713 On for this phone. At most one bill reminder and one challenge nudge a day.</span>' +
      '<div class="tgls">' + tog('bills', 'Bills due tomorrow') + tog('challenge', '30-Day Challenge nudge if today isn’t done') + '</div>' +
      (chOn ? '<label class="setrow"><span>🌙 Nudge me at</span><select data-set="chHour" aria-label="Nudge time">' + [18, 19, 20, 21, 22].map(function (h) { return '<option value="' + h + '"' + (h === hr ? ' selected' : '') + '>' + (h - 12) + ' pm</option>'; }).join('') + '</select></label>' : '') +
      '<button type="button" class="textbtn" data-a="remindoff" style="align-self:flex-start;color:var(--warn)">Turn off reminders</button></div>';
  }
  function syncText() {
    return { saving: 'Saving…', saved: '✓ Saved to your account', offline: 'Offline. It’ll save when you’re back online.', expired: 'Signed out. Sign in again to keep saving.' }[C.state] || 'Checking your account…';
  }
  function shareBlock() {
    if (!S || S.shareReady === false) return '';
    var top = '<div class="stack" style="gap:8px' + (U.screen === 'saveinstall' ? '' : ';border-top:1px solid var(--line, rgba(0,0,0,.08));padding-top:12px;margin-top:2px') + '"><b>Budget together</b>';
    if (S.role === 'member') return top + '<span style="font-size:14px;color:var(--muted)">You and <b>' + esc(S.partner || 'your spouse') + '</b> share this budget. Changes either of you make show up for both.</span>' +
      (U.cleave ? '<span style="font-size:14px">Leave? You keep a copy of the budget as your own; it stops updating with theirs.</span><div class="grid2"><button type="button" class="outline" data-a="cleaveno">Stay</button><button type="button" class="primary danger" data-a="cleaveyes">Leave</button></div>' : '<button type="button" class="linkbtn" data-a="cleave" style="align-self:flex-start">Leave the shared budget</button>') + '</div>';
    if (S.partner) return top + '<span style="font-size:14px;color:var(--muted)">Shared with <b>' + esc(S.partner) + '</b>. Changes either of you make show up for both.</span>' +
      (U.cunshare ? '<span style="font-size:14px">Stop sharing? They keep a copy, but it stops updating with yours.</span><div class="grid2"><button type="button" class="outline" data-a="cunshareno">Keep sharing</button><button type="button" class="primary danger" data-a="cunshareyes">Stop sharing</button></div>' : '<button type="button" class="linkbtn" data-a="cunshare" style="align-self:flex-start">Stop sharing</button>') + '</div>';
    if (U.invite) return top + '<span style="font-size:14px;color:var(--muted)">Have your spouse open Find Me the Money, tap <b>Joining your spouse\u2019s budget?</b> (or Settings \u2192 Have an invite code?), sign in with their own email and enter:</span>' +
      '<div class="invitecode" aria-label="Invite code">' + esc(U.invite) + '</div><span style="font-size:13px;color:var(--faint)">Works once, for 7 days.</span>' +
      '<button type="button" class="sharebtn" data-a="cinviteshare">Send it to my spouse</button></div>';
    return top + '<span style="font-size:14px;color:var(--muted)">Your spouse signs in with their own email and sees this same budget. Either of you can update it.</span>' +
      '<button type="button" class="sharebtn" data-a="cinvite" style="align-self:flex-start">Invite my spouse</button>' + joinBlock() + '</div>';
  }
  function joinBlock() {
    if (!U.joinOpen && !U.joinMode) return '<button type="button" class="linkbtn" data-a="cjoinopen" style="align-self:flex-start">Have an invite code?</button>';
    return '<span style="font-size:14px">' + (P.setupDone ? 'Joining replaces the budget on this phone with your spouse\u2019s. Yours is kept for 30 days, just in case.' : 'Enter the code your spouse sent you.') + '</span>' +
      '<label class="field">Invite code<input type="text" autocapitalize="characters" autocomplete="off" maxlength="8" data-cjoin placeholder="ABC123" style="text-transform:uppercase;letter-spacing:3px"></label><button type="button" class="primary" data-a="cjoin">Join the shared budget</button>';
  }
  function signInForm(ask) {
    var st = U.cloudStep, m = me();
    return (st && st.sent ? '<span style="font-size:14px">We emailed a sign-in code to <b>' + esc(st.email) + '</b>. Enter it here, or tap the link in the email. Not there in a minute? Check your junk or spam folder.</span>' +
        '<label class="field">Code<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" data-ccode placeholder="123456"></label>' +
        '<button type="button" class="primary" data-a="cverify">Sign in</button><div style="display:flex;gap:14px;flex-wrap:wrap"><button type="button" class="linkbtn" data-a="csend">Send a new code</button><button type="button" class="linkbtn" data-a="creset">Use a different email</button></div>'
        : (ask ? '<label class="field">First name<input type="text" autocomplete="given-name" autocapitalize="words" data-cname value="' + esc(m.name || '') + '" placeholder="Like Sarah"></label>' : '') +
          '<label class="field">Email<input type="email" inputmode="email" autocomplete="email" data-cemail value="' + esc(st && st.email || '') + '" placeholder="you@example.com"></label>' +
          (ask ? '<label class="optin"><input type="checkbox" data-coptin' + (m.optIn === false ? '' : ' checked') + '><span>Send me money tips and updates from Brad. Unsubscribe anytime.</span></label>' : '') +
          '<button type="button" class="primary" data-a="csend">Email me a sign-in code</button>') +
      (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '');
  }
  // Settings -> Delete my account and data: a backup first if they want it, then type DELETE. Signed in, the
  // delete-account function removes every row and the sign-in; then the phone is cleared and the front page shows.
  function wipeBox() {
    if (!U.wipe) return '<button type="button" class="textbtn" style="color:var(--warn)" data-a="wipe">Delete my account and data</button>';
    var member = S && S.role === 'member', partner = S && S.partner;
    return '<div class="wipebox stack"><b>Delete my account and data</b><span>' + (S ? 'This deletes your plan, your account and everything saved with it, on this phone and in your account. It can’t be undone.' : 'This deletes your plan from this phone. It can’t be undone.') + '</span>' +
      (member ? '<span>You’ll leave ' + esc(partner || 'your partner') + '’s budget. Their plan stays.</span>' : '') +
      (S && !member && partner ? '<div class="note" role="alert"><span>Your partner will lose access to this plan.</span></div><label class="optin"><input type="checkbox" data-wipehand' + (U.wipeHand ? ' checked' : '') + '><span>Give the plan to ' + esc(partner) + ' instead</span></label>' : '') +
      '<button type="button" class="outline" data-a="backup">Download a backup first</button>' +
      '<label class="field">Type DELETE to confirm<input type="text" data-wipe autocomplete="off" autocapitalize="characters" spellcheck="false"></label>' + (U.wipeErr ? '<p role="alert" class="scerr">' + esc(U.wipeErr) + '</p>' : '') +
      '<div class="grid2"><button type="button" class="outline" data-a="wipeno">Cancel</button><button type="button" class="primary wipego" data-a="wipeyes">Delete everything</button></div></div>';
  }
  // clear the phone: every fmtm.* key, the recipe photos, the reminder sign-in, then the front page
  function wipePhone() {
    try { if (OS.p) OS.p.then(function (os) { return os.logout(); }).catch(function () {}); } catch (e) {}
    S = null; C.ready = false; C.state = 'idle';
    try { Object.keys(localStorage).filter(function (k) { return /^fmtm/.test(k); }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    try { if (window.indexedDB) indexedDB.deleteDatabase('fmtm-recipes'); } catch (e) {}
    P = blank(); U.wipe = false; U.wipeErr = ''; U.wipeHand = false; U.toast = null; U.front = true; go('welcome');
  }
  function accountCard() {
    if (!cloudOn()) return '';
    if (S) return '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="eyebrow">Your account</div><b>' + esc((firstName() ? firstName() + ' \u00b7 ' : '') + (S.email || 'Signed in')) + '</b>' +
      '<label class="field">First name<input type="text" autocomplete="given-name" autocapitalize="words" data-mename value="' + esc(firstName()) + '" placeholder="Like Sarah"></label>' +
      '<label class="optin"><input type="checkbox" data-meoptin' + (me().optIn === false ? '' : ' checked') + '><span>Send me money tips and updates from Brad</span></label>' +
      '<span style="font-size:14px;color:var(--muted)" data-live="sync">' + syncText() + '</span>' +
      '<span style="font-size:14px;color:var(--muted)">Sign in with this email on any phone, in Safari or the Home Screen app, and your plan is there.</span>' + shareBlock() + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn ghost" data-a="cout">Sign out</button></div>' + '</div>';
    var st = U.cloudStep;
    return '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="eyebrow">Save to an account</div><b>Keep your plan on every phone</b>' +
      '<span style="font-size:14px;color:var(--muted)">Free. Sign in with your email and your plan follows you to a new phone, Safari or the Home Screen app. No password.</span>' +
      signInForm() + '</div>';
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // expenses from the 30-second screen include fun money, so no separate guess is added;
  // once fun money is set, it comes out of that one number instead of being counted twice
  function quickAll() { return !!(P.basicsAuto && P.quick && !itemized()); }
  function basicsNet() { return quickAll() && funSet() ? Math.max(0, num(P.basics) - num(P.fun)) : num(P.basics); }
  // a numeric copy of the saved data for the math, with a missed payday rolled forward
  function profile() {
    return {
      paycheck: householdPaycheck(), freq: P.freq, nextPay: F.rollPayday(P.nextPay, P.freq, today()), stepAmt: P.stepAmt === '' || P.stepAmt == null ? 0 : num(P.stepAmt), givingPct: giveAmt() ? 0 : P.givingPct, giveAmt: giveAmt() / F.FREQS[P.freq].perMonth, savings: num(P.savings),
      // until fun money is set, assume 10% of take-home pay so the countdown isn't too rosy
      fun: funSet() ? num(P.fun) : 0, funEst: false,
      // one "bills and basics" number until the person lists bills one by one
      bills: F.billGroups(P.bills.filter(function (b) { return !fromFund(b); })).concat([{ name: 'Spending categories', amount: catsMonthly() }, { name: 'Saving funds', amount: fundsMonthly() }, { name: 'Everything else', amount: elseMonthly() }]).filter(function (b) { return b.amount > 0; }),
      // interest is optional; a blank rate is estimated at 20%
      debts: P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).map(function (d) { return { id: d.id, name: d.name || 'Debt', bal: num(d.bal), min: num(d.min), apr: String(d.apr).trim() === '' ? 20 : num(d.apr) }; }),
      efMonths: efMonths(), saveRows: saveRows(),
      goals: P.goals.map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.kind || 'dream', months: g.months || 6, per: g.per || 0, byPer: g.by && !g.paused ? goalByPer(g) : 0, saved: num(g.saved) }; }).map(function (g, i) { if (P.goals[i].paused) g.per = 0; return g; })
    };
  }
  // paydays left before a goal's date, and what each one needs to set aside
  function paydaysUntil(iso) {
    var next = F.rollPayday(P.nextPay, P.freq, today()), days = F.FREQS[P.freq].days, gap = F.daysBetween(F.fromIso(next), F.fromIso(iso));
    return gap < 0 ? 0 : Math.floor(gap / days) + 1;
  }
  // what a goal sets aside each paycheck, with a switch to stop (nothing comes out of the budget for it then)
  function goalAside(g) {
    if (num(g.saved) >= num(g.amount)) return '';
    var per = g.by ? goalByPer(g) : num(g.per), on = !g.paused && per > 0;
    if (!g.by && !per) return '';
    var label = on ? 'Setting aside ' + money(per) + ' a paycheck' + (g.by ? ' until ' + shortDay(g.by) : '') : 'Not setting money aside';
    return '<span class="tglrow goalaside"><span>' + label + '</span><button type="button" role="switch" class="tgl' + (on ? ' on' : '') + '" aria-checked="' + on + '" aria-label="Set money aside each paycheck for ' + esc(g.name) + '" data-a="goalpause" data-v="' + esc(g.id) + '"></button></span>';
  }
  function goalByPer(g) { var left = Math.max(0, num(g.amount) - num(g.saved)), n = paydaysUntil(g.by); return left ? Math.ceil(left / Math.max(1, n)) : 0; }
  // ---------- household income: Paycheck 1 (P.paycheck) plus any others (P.incomes) ----------
  function extraIncomes() { return (P.incomes || []).filter(function (x) { return num(x.amount) > 0; }); }
  function monthlyIncome() { return num(P.paycheck) * F.FREQS[P.freq].perMonth + extraIncomes().reduce(function (t, x) { return t + num(x.amount) * F.FREQS[x.freq || 'biweekly'].perMonth; }, 0) + otherMonthly(); }
  function otherMonthly() { return (P.otherIncome || []).reduce(function (t, x) { return t + num(x.amount); }, 0); }
  var OTHER_INCOME = ['Side income', 'Child support', 'Rental income', 'Benefits', 'Something else'];
  // the plan runs on Paycheck 1's schedule; other paychecks join it as their monthly share
  function householdPaycheck() { return monthlyIncome() / F.FREQS[P.freq].perMonth; }
  function funSet() { return P.fun !== '' && P.fun != null; }
  function itemized() { return P.bills.some(function (b) { return F.billMonthly(b) > 0; }); }
  function billsTotal() { return P.bills.reduce(function (t, b) { return t + F.billMonthly(b); }, 0); }
  // retirement paid from take-home pay and college savings get their own budget lines (monthly)
  // whose pay a retirement % comes from: Paycheck 1, 2, ...
  function payOwners() {
    return [{ label: P.payLabel || 'You', monthly: num(P.paycheck) * F.FREQS[P.freq].perMonth }].concat((P.incomes || []).map(function (x) { return { label: x.label || 'Spouse', monthly: num(x.amount) * F.FREQS[x.freq || 'biweekly'].perMonth }; }));
  }
  // a % taken out before payday comes from pay before taxes (a.gross, per paycheck) when it's given
  function accMonthly(a) {
    var o = payOwners()[a.owner || 0] || payOwners()[0], inc = a.owner ? (P.incomes || [])[a.owner - 1] : null, ppm = F.FREQS[(inc && inc.freq) || P.freq].perMonth;
    if (num(a.monthly)) return num(a.monthly);
    return num(a.pct) / 100 * ((a.from || 'pre') === 'pre' && num(a.gross) ? num(a.gross) * ppm : o.monthly);
  }
  function retireOn() { return P.retire === 'some' || P.retire === 'full'; }
  function accLabel(a) { return (a.type || 'Retirement') + (payOwners().length > 1 ? ' \u00b7 ' + (payOwners()[a.owner || 0] || payOwners()[0]).label : ''); }
  function saveRows() {
    var out = [];
    if (retireOn()) (P.retirements || []).forEach(function (a, i) { if (a.from === 'post' && accMonthly(a) > 0) out.push({ label: 'Retirement \u00b7 ' + accLabel(a), amount: accMonthly(a), key: 'ret:' + i }); });
    if (P.kids === 'yes' && num(P.collegeMonthly) > 0) out.push({ label: 'College savings', amount: num(P.collegeMonthly) });
    return out;
  }
  // months until the mortgage is gone at the current payment
  function payoffMonths() {
    var bal = num(P.mortgage), pay = num(P.mortgagePay), r = num(P.mortgageRate) / 1200;
    if (!(bal > 0 && pay > 0)) return null;
    if (!r) return Math.ceil(bal / pay);
    if (pay <= bal * r) return Infinity;
    return Math.ceil(-Math.log(1 - r * bal / pay) / Math.log(1 + r));
  }
  function payoffNote() {
    var m = payoffMonths();
    if (m == null) return 'Add your balance and payment to see when it’s paid off.';
    if (m === Infinity) return 'That payment only covers the interest. Double-check the numbers.';
    return 'At this payment it’s paid off in ' + shortDate(F.addDays(today(), Math.round(m * 30.44))) + '. Step 6 is about getting there years sooner.';
  }
  function efMonths() { return Math.max(3, Math.min(6, Math.round(num(P.efMonths) || 3))); }
  function monthlyNeed() { var pl = F.plan(profile()); return pl.monthlyLiving; }
  var EF_WHY = [
    '3 months: a steady job, two incomes, or few people counting on you.',
    '4 months: steady income, with a few unknowns.',
    '5 months: some uncertainty, like one income, kids, or a job that could change.',
    '6 months: one income, commission or self-employed, kids, or health needs. Sleep-well money.'
  ];
  function savingsNote() {
    var sv = num(P.savings);
    if (!savingsSet()) return '';
    return sv >= 1000 ? 'Step 1 done. Your emergency fund is in place.' : money(1000 - sv) + ' to go to your $1,000 emergency fund.';
  }
  // giving: a share of pay, or a set dollar amount each month
  function giveAmt() { return P.giveMode === 'amt' ? num(P.giveMonthly) : 0; }
  function giveText() {
    var inc = monthlyIncome(), ppm = F.FREQS[P.freq].perMonth;
    if (P.giveMode === 'amt') { var a = num(P.giveMonthly); return a ? money(a) + ' a month \u00b7 ' + money(a / ppm) + ' each paycheck' + (inc ? ' \u00b7 about ' + Math.round(a / inc * 1000) / 10 + '% of your pay' : '') : 'Not giving for now'; }
    var pc = +P.givingPct || 0; return pc ? money(inc * pc / 100) + ' a month \u00b7 ' + money(inc * pc / 100 / ppm) + ' each paycheck' : 'Not giving for now';
  }
  function giveBox() {
    var amt = P.giveMode === 'amt', inc = monthlyIncome(), pc = +P.givingPct || 0, a = num(P.giveMonthly);
    var amax = Math.max(100, Math.ceil(inc * 0.2 / 50) * 50, Math.ceil(a / 50) * 50), pmax = Math.max(20, Math.ceil(pc));
    return '<div class="card stack" style="padding:18px;gap:14px"><div class="seg" role="group" aria-label="Give by" style="align-self:flex-start">' +
      [['pct', '% of pay'], ['amt', '$ a month']].map(function (o) { var on = (amt ? 'amt' : 'pct') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="givemode" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div style="font-family:var(--display);font-size:44px;font-weight:300;line-height:1" data-live="givebig">' + (amt ? money(a) : pc + '%') + '</div>' +
      '<span style="font-size:14px;color:var(--muted)" data-live="givetext">' + giveText() + '</span>' +
      (amt ? '<input type="range" min="0" max="' + amax + '" step="5" value="' + a + '" data-give="amt" aria-label="Dollars to give each month">' +
          '<label class="field">Or type an amount per month<input type="number" inputmode="decimal" min="0" data-give="amtnum" value="' + esc(P.giveMonthly || '') + '" placeholder="0"></label>'
        : '<input type="range" min="0" max="' + pmax + '" step="1" value="' + pc + '" data-give="pct" aria-label="Percent of pay to give">' +
          '<label class="field">Or type a percent<input type="number" inputmode="decimal" min="0" max="100" step="0.5" data-give="pctnum" value="' + (pc || '') + '" placeholder="0"></label>') + '</div>';
  }
  // a row of answer buttons; picks are saved as P[key]
  function choice(key, opts, action) {
    return '<div class="choices" role="group">' + opts.map(function (o) {
      var on = P[key] === o[0] || (key === 'givingPct' && P.givingPct === o[0]);
      return '<button type="button" class="choice' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="' + (action || 'answer') + '" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function savingsSet() { return P.savings !== '' && P.savings != null; }
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  // ---------- screen state (not saved) ----------
  var U = { front: firstOpen && !P.setupDone, screen: P.setupDone ? 'home' : 'welcome', toast: null, form: null, formErr: '', err: '', sortHist: [], back: 'home', next: 'home', confirmDelete: false, filter: 'all', showHelp: false };
  var app = document.getElementById('app');
  // Challenges and Milestones share the Wins tab, so the bar stays at five
  var TABS = [['home', 'Home', 'home'], ['plan', 'Budget', 'wallet'], ['plus', 'Add', 'plus'], ['journey', 'Challenge', 'flag'], ['meals', 'Meals', 'menu']];
  function tabOf(screen) { if (screen === 'catlog' || screen === 'spendlog') return 'plan'; return screen === 'chlesson' || screen === 'chjournal' || screen === 'challenges' || screen === 'milestones' || screen === 'community' || screen === 'plans' || screen === 'lesson' || screen === 'quiz' ? 'journey' : screen; }
  function render() {
    autoColorMap = null; ensureIds();
    chCheck();
    if (P.challenge && P.challenge.status === 'restart' && !U.chRestartShown && U.screen === 'home' && !U.sheet) { U.chRestartShown = true; U.screen = 'journey'; U.jTab = null; }
    if (P.setupDone && (U.screen === 'wins' || TABS.some(function (t) { return t[0] === tabOf(U.screen); }))) refresh();
    var u = P.unlocked || {};
    var tabs = TABS;
    var tabbed = P.setupDone && U.screen !== 'wins' && !(U.screen === 'meals' && mmSt().view === 'edit') && tabs.some(function (t) { return t[0] === tabOf(U.screen); });
    var html = (V[U.screen] || V.home)();
    if (U.sheet) html += sheetHtml();
    // beta: a small Feedback tab on every screen
    if (CONFIG.feedbackUrl && U.screen !== 'welcome' && U.screen !== 'steps') html += '<a class="fbtab" href="' + esc(CONFIG.feedbackUrl) + '" target="_blank" rel="noopener" data-a="feedback" aria-label="Send feedback">Feedback</a>';
    if (tabbed) {
      var news = P.unseen.length;
      html += '<nav class="tabbar" aria-label="Sections" style="grid-template-columns:repeat(' + tabs.length + ',minmax(0,1fr))">' + tabs.map(function (t) {
        var on = tabOf(U.screen) === t[0];
        if (t[0] === 'plus') return '<span class="fabslot"><button type="button" class="fab' + (U.plusOpen ? ' open' : '') + '" data-a="plusmenu" aria-label="Add" aria-expanded="' + !!U.plusOpen + '">' + ICON.plus + '</button></span>';
        return '<button type="button" data-a="go" data-v="' + t[0] + '"' + (on ? ' aria-current="page" class="on"' : '') + '>' + ICON[t[2]] + '<span>' + t[1] + '</span>' + (t[0] === 'community' && news && !on ? '<i class="badge-dot" aria-label="' + news + ' new"></i>' : '') + '</button>';
      }).join('') + '</nav>' + (U.plusOpen ? plusSheet() : '');
    }
    var ci0 = document.getElementById('chatIn'), ciVal = ci0 ? ci0.value : '', ciFocus = !!ci0 && document.activeElement === ci0;
    app.innerHTML = html;
    var ci1 = document.getElementById('chatIn'); if (ci1 && ciVal) ci1.value = ciVal; if (ci1 && ciFocus) ci1.focus();
    var front = U.screen === 'welcome' && U.front; document.body.classList.toggle('is-front', front); if (front) frontInit(); else clearInterval(wf.timer);
    tourMaybe();
    csvAutoplay();
    if (U.screen === 'chlesson') chAfter();
    document.body.classList.toggle('has-tabs', tabbed);
    document.body.classList.toggle('mm-editing', U.screen === 'meals' && mmSt().view === 'edit');
    if (U.screen !== 'recap') U.recapWk = null;
    if (U.screen !== 'meals' && mmSt().sheet && mmSt().sheet.type !== 'plan') mmClose();
  }
  // ---------- Add to Home Screen how-to: short animated scenes on a drawn phone ----------
  var HS_ICON = '<img class="ph-icon" src="icons/icon-192.png" alt="">';
  var HS_GRID = function (n) { var t = ''; for (var k = 0; k < 12; k++) t += k === n ? '<span class="ph-appwrap">' + HS_ICON.replace('ph-icon', 'ph-icon new tapme') + '<small>Find Money</small></span>' : '<span class="ph-appwrap"><i class="ph-blank"></i></span>'; return '<div class="ph-grid">' + t + '</div>'; };
  var IOS_SCENES = [
    ['Tap Share', 'In Safari, it\u2019s the square with an arrow, at the bottom of the screen.',
      '<div class="ph-title">Find Me the Money</div><div class="ph-card"><b>We found $1,100 a month</b><small>Want it back?</small></div><div class="ph-safari"><span class="ph-url2">findmethemoney.netlify.app</span><div class="ph-tools"><span>\u2039</span><span>\u203a</span><span class="ph-sh tapme">{SHARE}</span><span>\u2637</span><span>\u29C9</span></div></div>', [50, 91]],
    ['Scroll down, tap Add to Home Screen', 'It\u2019s in the list under the share options.',
      '<div class="ph-sheet"><div class="ph-row">Copy</div><div class="ph-row">Add to Reading List</div><div class="ph-row">Add Bookmark</div><div class="ph-row on tapme">Add to Home Screen<span>\u229E</span></div><div class="ph-row">Find on Page</div></div>', [50, 70]],
    ['Tap Add', 'Top right corner. The name can stay as it is.',
      '<div class="ph-bar"><span>Cancel</span><b>Add to Home Screen</b><span class="ph-add tapme">Add</span></div><div class="ph-addrow">' + HS_ICON + '<div><b>Find Money</b><small>findmethemoney.netlify.app</small></div></div>', [88, 8]],
    ['Open it from your Home Screen', 'Use the app from here from now on. Your plan stays put.', HS_GRID(5), [38, 27]]
  ];
  var ANDROID_SCENES = [
    ['Tap the \u22EE menu', 'Top right corner of Chrome.',
      '<div class="ph-chrome"><span class="ph-url2">findmethemoney.netlify.app</span><span class="ph-dots tapme">\u22EE</span></div><div class="ph-title">Find Me the Money</div><div class="ph-card"><b>We found $1,100 a month</b><small>Want it back?</small></div>', [90, 6]],
    ['Tap Add to Home screen', 'Some phones call it Install app.',
      '<div class="ph-menu"><div class="ph-row">New tab</div><div class="ph-row">History</div><div class="ph-row">Downloads</div><div class="ph-row on tapme">Add to Home screen</div><div class="ph-row">Settings</div></div>', [62, 46]],
    ['Tap Install', 'Or Add, depending on your phone.',
      '<div class="ph-dialog"><b>Install app?</b><div class="ph-addrow">' + HS_ICON + '<div><b>Find Money</b><small>findmethemoney.netlify.app</small></div></div><div class="ph-dlgbtns"><span>Cancel</span><span class="ph-add tapme">Install</span></div></div>', [78, 62]],
    ['Open it from your Home Screen', 'Use the app from here from now on. Your plan stays put.', HS_GRID(5), [38, 27]]
  ];
  var GUIDES = { ios: IOS_SCENES, android: ANDROID_SCENES };
  function guideScene(key, i) {
    var list = GUIDES[key], sc = list[i], n = list.length;
    return '<div class="csv-stage" key="' + i + '"><div class="phone"><div class="ph-screen">' + sc[2].replace('{SHARE}', ICON.share) + '<i class="ph-finger" style="left:' + sc[3][0] + '%;top:' + sc[3][1] + '%"></i></div></div>' +
      '<div class="csv-copy"><div class="eyebrow">Step ' + (i + 1) + ' of ' + n + '</div><b>' + sc[0] + '</b><p>' + sc[1] + '</p>' +
      '<div class="csv-dots">' + list.map(function (x, j) { return '<button type="button" class="' + (j === i ? 'on' : '') + '" data-a="guidestep" data-k="' + key + '" data-v="' + j + '" aria-label="Step ' + (j + 1) + '"></button>'; }).join('') + '</div>' +
      '<div class="csv-nav"><button type="button" class="sharebtn ghost" data-a="guidestep" data-k="' + key + '" data-v="' + ((i + n - 1) % n) + '" aria-label="Previous step">\u2039</button><button type="button" class="sharebtn" data-a="guidestep" data-k="' + key + '" data-v="' + ((i + 1) % n) + '">' + (i === n - 1 ? 'Watch again' : 'Next \u203a') + '</button></div></div></div>';
  }
  function guideBox(key) { U.gStep = U.gStep || {}; return '<div class="csvg card" data-guide="' + key + '">' + guideScene(key, U.gStep[key] || 0) + '</div>'; }
  // plays on its own, one scene every few seconds, on any screen showing a guide (not with reduced motion)
  var csvTimer = null;
  function csvAutoplay() {
    clearInterval(csvTimer); csvTimer = null;
    var el0 = app.querySelector('[data-guide]'); if (!el0) return;
    var key = el0.getAttribute('data-guide'); U.gPaused = U.gPaused || {}; if (U.gPaused[key]) return;
    try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
    csvTimer = setInterval(function () {
      var el = app.querySelector('[data-guide="' + key + '"]'); if (!el) { clearInterval(csvTimer); csvTimer = null; return; }
      U.gStep[key] = ((U.gStep[key] || 0) + 1) % GUIDES[key].length; el.innerHTML = guideScene(key, U.gStep[key]);
    }, 4200);
  }
  function go(s) {
    U.plusOpen = false;
    // old screens land on the Challenge tab (Milestones behind it)
    if (s === 'plans' || s === 'community' || s === 'challenges' || s === 'milestones' || s === 'planday' || s === 'quiz') { U.jTab = s === 'milestones' ? 'milestones' : null; s = 'journey'; }
    U.screen = s; U.err = ''; U.sheet = null; render();
    window.scrollTo(0, 0);
  }
  // the + menu: the quick things people do between paydays
  function plusSheet() {
    var items = [['scan', '\uD83E\uDDFE', 'Add purchases', 'Type them or snap a photo'], ['checkin', '\uD83D\uDCB0', 'Update balances', 'Savings, funds, debts'], ['mmplan', '\uD83D\uDCC5', 'Plan a meal', 'Pick a meal or make a new one']];
    return '<div class="plusback" data-a="plusclose" aria-hidden="true"></div><div class="plussheet" role="menu">' + items.map(function (x) {
      return '<button type="button" role="menuitem" data-a="' + x[0] + '"><span class="plusic" aria-hidden="true">' + x[1] + '</span><span class="plustx"><b>' + x[2] + '</b><small>' + x[3] + '</small></span></button>'; }).join('') + '</div>';
  }

  var ICON = {
    check: function (c, s) { s = s || 14; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M5 12l5 5L20 7"/></svg>'; },
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    logo: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.2" cy="10.2" r="6.3" fill="#3A554D" stroke="#FFC27E" stroke-width="2.4"/><path d="M14.6 14.6l4.6 4.6" stroke="#FF9A76" stroke-width="3.4" stroke-linecap="round"/><text x="10.2" y="10.6" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="8.6" fill="#FFD08A">$</text></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    file: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    flame: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>',
    flag: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    wallet: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7a2 2 0 012-2h11v4"/><path d="M4 7v11a2 2 0 002 2h13a1 1 0 001-1V10a1 1 0 00-1-1H6a2 2 0 01-2-2z"/><circle cx="16" cy="14.5" r="1.2" fill="currentColor"/></svg>',
    plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    people: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3.2 3.2 0 010 6.3M18 14.3c1.8.8 3 2.6 3 4.7"/></svg>',
    book: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M8 7h7"/></svg>',
    medal: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="6"/><path d="M8.5 9.2L6 3h4l2 4 2-4h4l-2.5 6.2"/><path d="M10 14l1.5 1.5L14.5 12"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>'
  };
  function back(to) { return '<button type="button" class="back" data-a="go" data-v="' + to + '" aria-label="Back">' + ICON.back + '</button>'; }
  function field(label, key, opts) {
    opts = opts || {};
    var v = opts.value != null ? opts.value : P[key];
    return '<label class="field">' + label + '<input type="' + (opts.type || 'number') + '"' + (opts.type === 'date' ? '' : ' inputmode="decimal"') + ' data-f="' + key + '"' +
      (opts.list ? ' data-list="' + opts.list + '" data-i="' + opts.i + '" data-k="' + opts.k + '"' : '') + ' value="' + esc(v) + '" placeholder="' + esc(opts.ph || '') + '"' + (opts.min != null ? ' min="' + opts.min + '"' : '') + ' autocomplete="off"></label>';
  }
  // The setup questions walk the path: each one belongs to a step, and the journey up top shows which.
  var WIZ = ['savings', 'debts', 'pay', 'basics', 'safety', 'retire', 'kids', 'house', 'give'];
  var WIZ_STEP = { savings: 1, debts: 2, pay: 3, basics: 3, bills: 3, safety: 3, retire: 4, kids: 5, house: 6, give: 7 };
  function wizIndex(n) { return typeof n === 'string' ? WIZ.indexOf(n === 'bills' ? 'basics' : n) + 1 : n; }
  function wizardHead(n, title, sub) {
    var name = typeof n === 'string' ? n : '', st = WIZ_STEP[name]; n = wizIndex(n);
    var top = P.setupDone ? '<div>' + back(U.wizReturn || 'settings') + '</div>'
      : '<div style="display:flex;align-items:center;gap:12px">' + back(n === 1 ? 'path' : WIZ[n - 2]) +
        '<div class="bar"><i style="width:' + (n / WIZ.length * 100) + '%"></i></div><span style="font-size:13px;font-weight:600;color:var(--faint)">' + n + ' of ' + WIZ.length + '</span></div>';
    var path = '';
    var mine = name === 'pay' || name === 'basics' || name === 'bills';
    var eyebrow = st ? '<div class="eyebrow">' + (mine ? 'Your numbers' : 'Step ' + st + ' \u00b7 ' + F.STEPS[st - 1][0]) + '</div>' : '';
    return top + path +
      '<div class="stack" style="gap:8px;margin-top:4px">' + eyebrow + '<h2>' + title + '</h2><p>' + sub + '</p></div>';
  }
  function wizNext(n) { n = wizIndex(n); return '<div class="push">' + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.err + '</p>' : '') + '<button type="button" class="primary" data-a="wiz" data-v="' + n + '">' + (P.setupDone ? 'Save' : n === WIZ.length ? 'See my plan' : 'Next') + '</button></div>'; }

  // needs vs wants from the imported transactions, scaled to one month
  function spending() {
    var days = F.spanDays(P.txFrom, P.txTo), scale = 30.44 / days, t = { need: 0, want: 0, skip: 0, unsorted: 0 };
    var stores = F.storeTotals(P.tx), by = {};
    stores.forEach(function (s) { s.split = { need: 0, want: 0, skip: 0, unsorted: 0 }; s.tx = []; by[s.m] = s; });
    P.tx.forEach(function (x, i) { var k = bucketOf(x); t[k] += x.amount; by[x.merchant].split[k] += x.amount; by[x.merchant].tx.push(i); });
    stores.forEach(function (s) {
      var ks = ['need', 'want', 'skip', 'unsorted'].filter(function (k) { return s.split[k]; });
      s.bucket = ks.length === 1 ? ks[0] : ks.length ? 'mixed' : (P.sorted[s.m] || 'unsorted');
    });
    return { stores: stores, t: t, days: days, scale: scale, monthly: { need: t.need * scale, want: t.want * scale }, unsorted: stores.filter(function (s) { return s.split.unsorted > 0; }) };
  }
  // A single purchase can override its store (a Target run can be groceries or decor).
  function bucketOf(x) { return x.b || P.sorted[x.merchant] || 'unsorted'; }
  function ladderHtml(current) {
    return '<div class="ladder">' + F.STEPS.map(function (st, i) {
      var n = i + 1, cls = n < current ? ' done' : n === current ? ' now' : '';
      return '<div class="rung' + cls + '"><div class="n">' + (n < current ? ICON.check('#fff') : n) + '</div><div><div class="t">' + st[0] + '</div><small>' + st[1] + '</small></div></div>';
    }).join('') + '</div>';
  }
  // ---------- the 7-step journey ----------
  var STEP_WHY = [
    'A small buffer, so a flat tire or a doctor visit doesn’t turn into new debt.',
    'List your debts smallest to largest. Knock out the smallest, then roll its payment into the next. Quick wins keep you going.',
    'With no payments eating your paycheck, your emergency fund grows into 3 to 6 months of real security.',
    'Put 15% of your income toward retirement, like a 401(k) or Roth IRA.',
    'If you have kids, start saving for their college so they don’t start out in debt.',
    'Throw extra at the mortgage. Imagine no house payment.',
    'Keep building wealth, and give more than you ever thought you could.'
  ];
  var CONFETTI = ['#FF9A76', '#FFD08A', '#2A6B66', '#6E5FB5', '#E8875F', '#9AD0C2', '#FFFFFF'];
  function confetti(n, delay) {
    var out = '';
    for (var k = 0; k < n; k++) {
      var a = (k / n) * Math.PI * 2 + Math.random() * 0.5, d = 38 + Math.random() * 46;
      out += '<i style="--dx:' + Math.round(Math.cos(a) * d) + 'px;--dy:' + Math.round(Math.sin(a) * d - 18) + 'px;--r:' + Math.round(Math.random() * 540 - 270) + 'deg;background:' + CONFETTI[k % CONFETTI.length] +
        ';animation-delay:' + delay.toFixed(2) + 's' + (k % 3 === 0 ? ';border-radius:50%' : '') + '"></i>';
    }
    return '<span class="confetti" aria-hidden="true">' + out + '</span>';
  }
  // Seven circles on a line. With from/to it fills from one step to the next and celebrates on arrival.
  // Each key animates once per visit, so a re-render doesn't replay it.
  function journey(step, opts) {
    opts = opts || {};
    var to = Math.max(1, Math.min(step, 7)), anim = opts.key && !(U.anim = U.anim || {})[opts.key], from = anim ? Math.max(0, Math.min(opts.from == null ? 0 : opts.from, to)) : to;
    if (opts.key) U.anim[opts.key] = true;
    var seg = 0.6, lead = 0.35, pos = function (n) { return n <= 1 ? 0 : (n - 1) / 6 * 100; };
    var arrive = function (n) { return n <= from ? 0 : lead + (n - Math.max(from, 1)) * seg; };
    var nodes = F.STEPS.map(function (st, i) {
      var n = i + 1, state = n < to ? (opts.focus ? 'seen' : 'done') : n === to ? 'now' : '', t = arrive(n);
      return '<span class="jnode ' + state + (anim && state && n > from ? ' anim' : '') + '" style="left:' + pos(n) + '%' + (anim && state && n > from ? ';--t:' + t.toFixed(2) + 's' : '') + '">' +
        '<b>' + (n < to && !opts.focus ? ICON.check('#fff') : n) + '</b>' + (n === to && anim && !opts.focus && opts.confetti !== false ? confetti(18, t + 0.15) : '') + '</span>';
    }).join('');
    // partway to the next circle, like a level bar
    var part = to < 7 ? Math.max(0, Math.min(1, opts.progress || 0)) * 100 / 6 : 0, end = pos(to) + part;
    var dur = anim ? Math.max(0.01, (to - Math.max(from, 1)) * seg + (part ? 0.8 : 0)) : 0;
    return '<div class="journey' + (opts.small ? ' small' : '') + '" role="img" aria-label="Step ' + to + ' of 7: ' + F.STEPS[to - 1][0] + '">' +
      '<div class="jline"><i class="jfill' + (anim ? ' anim' : '') + '" style="--w0:' + pos(Math.max(from, 1)) + '%;--w1:' + end + '%;width:' + end + '%' + (anim ? ';animation-duration:' + dur.toFixed(2) + 's;animation-delay:' + lead + 's' : '') + '"></i>' + nodes + '</div></div>';
  }
  // what the freed-up money does: compares the plan with fun money at the old wants level vs the new limit
  function foundImpact(limit, wants) {
    if (!(wants - limit > 0)) return 'Slide left to free up money for your plan.';
    var base = profile(), was = Object.assign({}, base, { fun: wants, funEst: false }), now = Object.assign({}, base, { fun: limit, funEst: false });
    var o0 = F.outlook(was, today()), o1 = F.outlook(now, today()), d0 = F.freedomDate(o0), d1 = F.freedomDate(o1);
    var where = o1.step === 1 ? 'your $1,000 emergency fund, then your debts' : o1.target ? 'your ' + o1.target.name : 'your safety net';
    if (d0 && d1 && d0 > d1) return 'It goes to ' + where + '. ' + (o1.target ? 'Debt-free ' : 'Safety net full ') + span(F.daysBetween(d1, d0)) + ' sooner, by ' + shortDate(d1) + '.';
    if (!d0 && d1) return 'It goes to ' + where + '. That turns “never” into ' + (o1.target ? 'debt-free' : 'a full safety net') + ' by ' + shortDate(d1) + '.';
    return 'It goes to ' + where + ': ' + money((wants - limit) * 12) + ' more a year working for you.';
  }
  var FUN_PARTS = ['Eating out & delivery', 'Coffee & treats', 'Shopping', 'Entertainment', 'Hobbies', 'Personal spending'];
  function funParts() { return (P.funParts || []).filter(function (x) { return num(x.amount) > 0; }); }
  function round2(n) { return Math.round(n * 100) / 100; }
  // save one edited amount; v is what was typed, in the units on screen
  function budgetCommit(key, raw) {
    var pl = F.plan(profile()), d = U.planMonth ? 1 : pl.ppm, v = Math.max(0, num(raw)), m = String(round2(v * d)), parts = key.split(':'), i = +parts[1];
    if (key === 'give') { if (giveAmt()) P.giveMonthly = m; else P.givingPct = Math.min(100, Math.round(v * 10) / 10); }
    else if (key === 'basics') { P.basics = m; P.basicsAuto = false; }
    else if (parts[0] === 'bill') P.bills[i].amount = P.bills[i].per === 'yr' ? String(round2(v)) : m;
    else if (parts[0] === 'dmin') P.debts[i].min = m;
    else if (key === 'fun') P.fun = m;
    else if (parts[0] === 'part') { P.funParts[i].amount = m; P.fun = String(funParts().reduce(function (t, x) { return t + num(x.amount); }, 0)); }
    else if (parts[0] === 'ret') { P.retirements[i].monthly = m; P.retirements[i].pct = ''; }
    else if (key === 'college') P.collegeMonthly = m;
    else if (key === 'step') P.stepAmt = String(round2(v * d / pl.ppm));
    else if (key === 'pay') { P.paycheck = String(round2(v * d / pl.ppm)); }
    save();
  }
  // ---------- spending, added by hand ----------
  function ensureIds() {
    (P.bills || []).forEach(function (b) { if (!b.id) b.id = uid(); });
    (P.funParts || []).forEach(function (x) { if (!x.id) x.id = uid(); });
    P.spends = P.spends || [];
  }
  function monthOf(iso) { return String(iso).slice(0, 7); }
  // the lines a purchase can count against: spending categories, fun money, everything else, recurring expenses
  // grp: spend | bill | other. cat stays need/want for older code (fun money is the want)
  function spendLines() {
    var out = [];
    cats().forEach(function (c) { out.push({ key: 'c:' + c.id, type: typeOf(c), label: c.name || 'Category', icon: c.icon || '\uD83E\uDDFE', grp: 'spend', cat: 'need', mon: catMonthly(c), per: c.per || 'month', amt: num(c.amount) }); });
    // the built-in lines take the name, icon and type picked for them, and leave once removed
    function bi(l) { var m = lineMeta(l.key); if (m.hidden) return; l.label = m.name || l.label; l.icon = m.icon || l.icon; l.type = m.type || l.type; out.push(l); }
    if (funParts().length) P.funParts.forEach(function (x) { if (num(x.amount) > 0) bi({ key: 'f:' + x.id, type: 'want', label: x.name || 'Fun money', icon: '\uD83C\uDF89', grp: 'spend', cat: 'want', mon: num(x.amount) }); });
    else if (funSet()) bi({ key: 'fun', type: 'want', label: 'Fun money', icon: '\uD83C\uDF89', grp: 'spend', cat: 'want', mon: num(P.fun) });
    bi({ key: 'give', type: 'need', label: 'Giving', icon: '\u26EA', grp: 'spend', cat: 'need', mon: giveMonthly() });
    bi({ key: 'edu', type: 'need', label: 'Education fund', icon: '\uD83C\uDF93', grp: 'spend', cat: 'need', mon: P.kids === 'yes' ? num(P.collegeMonthly) : 0 });
    bi({ key: 'basics', type: 'need', label: 'Everything else', icon: '\uD83E\uDDFE', grp: 'spend', cat: 'need', mon: elseMonthly() });
    funds().forEach(function (f) { var nm = f.name || 'Fund'; out.push({ key: 'u:' + f.id, label: nm + ' \u00b7 pay from fund', short: 'Pay from ' + nm, icon: f.icon || '\uD83D\uDCB0', grp: 'fund', cat: 'fund', mon: 0 }, { key: 'u+:' + f.id, label: nm + ' \u00b7 add to fund', short: 'Add to ' + nm, icon: f.icon || '\uD83D\uDCB0', grp: 'fund', cat: 'fund', mon: 0 }); });
    recurring().forEach(function (b) { out.push({ key: 'b:' + b.id, label: b.name || 'Bill', icon: b.icon || iconFor(b.name), grp: 'bill', cat: b.group === 'subs' ? 'want' : 'need', mon: F.billMonthly(b) }); });
    out.push({ key: 'other', label: 'Something else', icon: '\u2753', grp: 'other', cat: 'other', mon: 0 });
    return out;
  }
  // ---------- end of setup: the plan is built ----------
  function finishSetup() {
    P.setupDone = true; P.startedOn = P.startedOn || F.isoDay(today()); P.badges.plan = P.badges.plan || F.isoDay(today()); P.topStep = F.outlook(profile(), today()).step;
    if (!P.plans.some(function (p) { return p.id === 'reset7'; })) P.plans.push({ uid: uid(), id: 'reset7', start: F.isoDay(today()), done: [] });
    snapshot(); save(); track('setup-done');
    U.toast = ['Your plan is ready.', 'Start with the next step below. It takes 2 minutes.', true];
  }
  // ---------- Meal Math: what home-cooked meals cost, a week of breakfasts, lunches and dinners, and what eating
  // at home saved. Prices are the family's own (no price lookups). Data lives in the plan, so backups and sync carry it:
  //   P.pantryItems: { id, name, emoji, price|null, packageAmount, unit, updatedAt }
  //   a meal with kind: 'side' is a side dish; a planned meal can carry sideIds: [side meal ids] (its cost and the
  //   grocery list include them, and what it saves is the main's eating-out price minus main + sides)
  //   a meal can also carry recipePhotos: [page ids, up to 3] and recipeUrl (a recipe page or video).
  //   The pages themselves live in this phone's IndexedDB (fmtm-recipes), not in the plan: the plan is kept twice in
  //   localStorage (about 5 MB in all) and sent whole to the cloud on every change, so a few photos would fill it.
  //   P.meals: { id, name, emoji, color, plates, eatingOutCost|null, photo, items: [{ pantryItemId, amountUsed, alreadyHave }], createdAt }
  //   P.planEntries: { id, date, slot: breakfast|lunch|dinner, type: meal|leftovers|eatOut, mealId, budget, createdAt }
  // No suggestion buttons in this feature: it shows what was saved, never what to do with it.
  var MM_UNITS = ['servings', 'lb', 'oz', 'count', 'cups'];
  var MM_COLORS = [['Mint', '#7ED9C0'], ['Sunset', '#FF9F6E'], ['Gold', '#FFC97E'], ['Coral', '#FF8C8C'], ['Berry', '#E58BC8'], ['Lavender', '#B39DFF'], ['Sky', '#7EB6FF'], ['Lime', '#B8E07E']];
  var MM_MEAL_EMO = '🍛 🌮 🍝 🥞 🍲 🥗 🍕 🍔 🌯 🥪 🍜 🍳 🍗 🥩 🐟 🍤 🥘 🍱 🥙 🫔 🍚 🥣 🧆 🍽️'.split(' ');
  var MM_ING_EMO = '🍚 🍗 🥩 🥓 🐟 🍤 🥚 🧀 🥛 🧈 🍞 🌮 🍝 🥞 🥦 🥬 🍅 🧅 🧄 🥔 🥕 🌽 🫑 🌶️ 🥑 🍄 🥒 🫘 🍋 🍎 🍌 🍓 🥫 🍯 🧂 🛒'.split(' ');
  var MM_GUESS = [[/rice/, '🍚'], [/chicken|turkey/, '🍗'], [/bacon/, '🥓'], [/beef|steak|pork|sausage/, '🥩'], [/fish|salmon|tuna|tilapia/, '🐟'], [/shrimp/, '🍤'], [/egg/, '🥚'], [/cheese|parm/, '🧀'], [/milk|cream/, '🥛'], [/butter/, '🧈'], [/bread|bun|baguette|toast|biscuit/, '🍞'], [/tortilla|taco/, '🌮'], [/pasta|spaghetti|noodle/, '🍝'], [/pancake|waffle|flour/, '🥞'], [/broccoli/, '🥦'], [/lettuce|spinach|greens/, '🥬'], [/tomato|salsa/, '🍅'], [/onion/, '🧅'], [/garlic/, '🧄'], [/potato/, '🥔'], [/carrot/, '🥕'], [/corn/, '🌽'], [/bell pepper/, '🫑'], [/jalape|chili|pepper/, '🌶️'], [/avocado|guac/, '🥑'], [/mushroom/, '🍄'], [/bean/, '🫘'], [/lemon|lime/, '🍋'], [/apple/, '🍎'], [/banana/, '🍌'], [/berr/, '🍓'], [/syrup|honey/, '🍯'], [/salt|season|spice/, '🧂'], [/sauce|soup|can/, '🥫']];
  var MM_SLOTS = [['breakfast', 'Breakfast', '🌅'], ['lunch', 'Lunch', '☀️'], ['dinner', 'Dinner', '🌙']];
  function mmGuess(n) { n = String(n || '').toLowerCase(); for (var i = 0; i < MM_GUESS.length; i++) if (MM_GUESS[i][0].test(n)) return MM_GUESS[i][1]; return '🛒'; }
  function mmSlot(k) { return MM_SLOTS.filter(function (s) { return s[0] === k; })[0] || MM_SLOTS[2]; }
  // a number from a field, or null when blank or not a number (so nothing ever shows NaN)
  function mmNum(v) { if (v === '' || v == null) return null; var n = +v; return isFinite(n) ? n : null; }
  function mmR2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function mm$(x) { return x == null || !isFinite(x) ? '—' : '$' + mmR2(x).toFixed(2); }
  function mmW(x) { x = mmNum(x) || 0; return Number.isInteger(x) ? '$' + x : mm$(x); }
  function mmTint(hex) { return (hex || '#7ED9C0') + '38'; }
  function mmPantry() { return P.pantryItems || (P.pantryItems = []); }
  function mmMeals() { return P.meals || (P.meals = []); }
  function mmPlan() { return P.planEntries || (P.planEntries = []); }
  function mmItem(id) { return mmPantry().filter(function (p) { return p.id === id; })[0]; }
  function mmMeal(id) { return mmMeals().filter(function (m) { return m.id === id; })[0]; }
  function mmTile(m) { return m.photo ? '<img src="' + m.photo + '" alt="">' : esc(m.emoji || '🍽️'); }
  function mmUnitOne(u) { return { servings: 'serving', lb: 'lb', oz: 'oz', count: 'item', cups: 'cup' }[u] || u; }
  function mmPkgText(p) { return mm$(p.price) + ' for ' + (+p.packageAmount) + (p.unit === 'count' ? '' : ' ' + p.unit); }
  // Brad's formula: store price / amount in the package x amount the recipe uses, to the cent
  function mmLine(price, pkg, uses, have) {
    price = mmNum(price); pkg = mmNum(pkg); uses = mmNum(uses);
    if (have || price == null || !pkg || !uses) return 0;
    return mmR2(price / pkg * uses);
  }
  // a meal's total is the sum of its rounded lines; per plate and saves round to the cent too
  function mmTotals(lines, plates, out) {
    var total = 0, skipped = 0, skippedVal = 0;
    lines.forEach(function (it) {
      total += mmLine(it.price, it.packageAmount, it.amountUsed, it.alreadyHave);
      if (it.alreadyHave || mmNum(it.price) == null) { skipped++; skippedVal += mmLine(it.price, it.packageAmount, it.amountUsed, false); }
    });
    total = mmR2(total); out = mmNum(out); plates = mmNum(plates);
    return { total: total, plate: plates > 0 ? mmR2(total / plates) : null, saves: out != null ? mmR2(out - total) : null, skipped: skipped, skippedVal: mmR2(skippedVal) };
  }
  // a saved meal's lines, with the pantry's current prices (so a price change updates every meal)
  function mmLines(m) {
    return (m.items || []).map(function (it) { var p = mmItem(it.pantryItemId) || {}; return { pantryItemId: it.pantryItemId, name: p.name || '', emoji: p.emoji || mmGuess(p.name), price: p.price, packageAmount: p.packageAmount, unit: p.unit || 'servings', amountUsed: it.amountUsed, alreadyHave: !!it.alreadyHave }; });
  }
  function mmCalc(m) { return mmTotals(mmLines(m), m.plates, m.eatingOutCost); }
  function mmIsSide(m) { return !!m && m.kind === 'side'; }
  function mmSides() { return mmMeals().filter(mmIsSide); }
  function mmEntrySides(e) { return (e && e.sideIds || []).map(mmMeal).filter(Boolean); }
  // a planned meal with its sides: one total, per plate over the main's plates, saves against the main's eating-out price
  function mmEntryCalc(e) {
    var m = mmMeal(e.mealId), c = mmCalc(m), sides = mmEntrySides(e); if (!sides.length) return c;
    var total = mmR2(sides.reduce(function (t, x) { return t + mmCalc(x).total; }, c.total)), plates = mmNum(m.plates), out = mmNum(m.eatingOutCost);
    return { total: total, plate: plates > 0 ? mmR2(total / plates) : null, saves: out != null ? mmR2(out - total) : null, skipped: c.skipped, skippedVal: c.skippedVal };
  }
  // dates (local, Sunday to Saturday)
  function mmToday() { return F.isoDay(today()); }
  function mmAdd(s, n) { return F.isoDay(F.addDays(F.fromIso(s), n)); }
  function mmWeek(s) { return F.weekStartOf(s, weekDay0()); }
  function mmDay(s) { return F.fromIso(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function mmWeekLabel(ws) { return weekLabel({ start: ws, end: mmAdd(ws, 6) }); }
  // what a stretch of days added up to: entries dated today or earlier count as eaten; later ones are planned
  function mmStats(from, to) {
    var s = { home: 0, cooked: 0, left: 0, cost: 0, saved: 0, out: 0, outBudget: 0, planned: 0, byMeal: {} }, td = mmToday();
    mmPlan().forEach(function (e) {
      if (e.date < from || e.date > to) return;
      if (e.date > td) { s.planned++; return; }
      if (e.type === 'meal') { var m = mmMeal(e.mealId); if (!m) return; var c = mmEntryCalc(e); s.home++; s.cooked++; s.cost += c.total; if (c.saves > 0) s.saved += c.saves; s.byMeal[m.id] = (s.byMeal[m.id] || 0) + 1; }
      else if (e.type === 'leftovers') { s.home++; s.left++; }
      else if (e.type === 'eatOut') { s.out++; s.outBudget += mmNum(e.budget) || 0; }
    });
    s.cost = mmR2(s.cost); s.saved = mmR2(s.saved); s.outBudget = mmR2(s.outBudget); return s;
  }
  function mmEntry(date, slot) { return mmPlan().filter(function (e) { return e.date === date && e.slot === slot; })[0]; }
  function mmSt() { return U.mm || (U.mm = { view: 'week', wk: mmWeek(mmToday()), sort: 'plate', draft: null, backTo: 'meals', sheet: null }); }
  function mmGear() { return '<button type="button" class="back gearbtn" data-a="go" data-v="settings" aria-label="Settings">' + ICON.gear + '</button>'; }

  // ----- screens -----
  function mmWeekNav(wk, attr) {
    var cur = mmWeek(mmToday());
    return '<div class="mm-weeknav"><button type="button" class="mm-nav" ' + attr + '="-7" aria-label="Previous week">‹</button><div><b>' + mmWeekLabel(wk) + '</b><div class="mm-wk">' + (wk === cur ? 'This week' : wk < cur ? 'Past week' : 'Coming up') + '</div></div><button type="button" class="mm-nav" ' + attr + '="7" aria-label="Next week">›</button></div>';
  }
  function mmHead(active) {
    return '<div class="mm-top"><div><div class="mm-crumb">Meals</div><h2 class="mm-h1">Meal Math</h2></div><div class="mm-topr">' + (active === 'meals' ? '<button type="button" class="mm-pill" data-mm-go="pantry">🧺 Prices</button>' : '') + mmGear() + '</div></div>' +
      '<div class="mm-seg" role="group" aria-label="Meal Math"><button type="button" data-mm-go="week" aria-pressed="' + (active === 'week') + '">📅 Week</button><button type="button" data-mm-go="meals" aria-pressed="' + (active === 'meals') + '">🍲 Meals</button><button type="button" data-mm-go="list" aria-pressed="' + (active === 'list') + '">🛒 List</button></div>';
  }
  function mmEntryRow(e) {
    var em, name, sub, bg = '', s = mmSlot(e.slot);
    if (e.type === 'meal') { var m = mmMeal(e.mealId); if (!m) return ''; var c = mmEntryCalc(e), sd = mmEntrySides(e); em = mmTile(m); bg = 'background:' + mmTint(m.color); name = esc(m.name) + (sd.length ? '<span class="mm-sides">+ ' + sd.map(function (x) { return esc(x.emoji + ' ' + x.name); }).join(', ') + '</span>' : ''); sub = mm$(c.plate) + ' a plate' + (c.saves > 0 ? ' · <b>saves ' + mm$(c.saves) + '</b>' : '') + (mmHasRecipe(m) ? ' · 📖' : ''); }
    else if (e.type === 'leftovers') { em = '🥡'; name = 'Leftovers'; sub = 'Already paid for'; }
    else { em = '🍔'; name = 'Eat out'; sub = mmW(e.budget) + ' budget'; }
    return '<button type="button" class="mm-entry" data-mm-slot="' + e.date + '|' + e.slot + '"><span class="mm-sl">' + s[2] + ' ' + s[1] + '</span><span class="mm-em" style="' + bg + '">' + em + '</span><span class="mm-mid"><span class="mm-n">' + name + '</span><span class="mm-s">' + sub + '</span></span><span class="mm-chev">›</span></button>';
  }
  function mmWeekView() {
    var st = mmSt(), wk = st.wk, s = mmStats(wk, mmAdd(wk, 6)), td = mmToday(), days = [];
    for (var i = 0; i < 7; i++) days.push(mmAdd(wk, i));
    return mmHead('week') + mmWeekNav(wk, 'data-mm-wk') +
      '<div class="mm-strip"><span>🏠 <b>' + s.home + '</b> at home</span><span>💵 <b class="t">' + mm$(s.saved) + '</b> saved</span><span>🍔 <b>' + s.out + '</b> out</span></div>' +
      '<div class="mm-days">' + days.map(function (d) {
        var filled = MM_SLOTS.map(function (x) { return mmEntry(d, x[0]); }).filter(Boolean), empty = MM_SLOTS.filter(function (x) { return !mmEntry(d, x[0]); });
        return '<div class="mm-day' + (d < td ? ' past' : '') + '"><div class="mm-dhead"><b>' + mmDay(d) + '</b>' + (d === td ? '<span class="mm-today">Today</span>' : '') + '</div>' + filled.map(mmEntryRow).join('') +
          (empty.length ? '<div class="mm-empties">' + empty.map(function (x) { return '<button type="button" class="mm-emp" data-mm-slot="' + d + '|' + x[0] + '">+ ' + x[2] + ' ' + x[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function mmMealsView() {
    var st = mmSt(), rows = mmMeals().filter(function (m) { return !mmIsSide(m); }).map(function (m) { return { m: m, c: mmCalc(m) }; });
    var sides = mmSides().map(function (m) { return { m: m, c: mmCalc(m) }; }).sort(function (a, b) { return a.m.name.localeCompare(b.m.name); });
    var big = function (x) { return x == null ? 1e12 : x; };
    if (st.sort === 'plate') rows.sort(function (a, b) { return big(a.c.plate) - big(b.c.plate); });
    if (st.sort === 'saved') rows.sort(function (a, b) { return (b.c.saves == null ? -1e12 : b.c.saves) - (a.c.saves == null ? -1e12 : a.c.saves); });
    if (st.sort === 'new') rows.sort(function (a, b) { return (b.m.createdAt || '') < (a.m.createdAt || '') ? -1 : 1; });
    return mmHead('meals') + '<div class="mm-chips" role="group" aria-label="Sort meals">' + [['plate', 'Cheapest per plate'], ['saved', 'Most saved'], ['new', 'Newest']].map(function (o) { return '<button type="button" class="mm-chip" data-mm-sort="' + o[0] + '" aria-pressed="' + (st.sort === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="mm-meals">' + (rows.length ? rows.map(function (r, i) {
        return '<button type="button" class="mm-meal" data-mm-open="' + r.m.id + '"><div class="mm-tile" style="background:' + mmTint(r.m.color) + '">' + mmTile(r.m) + '</div><div class="mm-mid">' + (st.sort === 'plate' && i === 0 && rows.length > 1 ? '<div class="mm-rank">🏆 Cheapest meal</div>' : '') +
          '<div class="mm-name">' + esc(r.m.name) + '</div><div class="mm-meta">' + mm$(r.c.total) + ' · feeds ' + r.m.plates + (r.c.saves != null ? ' · <b>saves ' + mm$(r.c.saves) + '</b>' : '') + '</div></div><div class="mm-pp"><div class="v">' + mm$(r.c.plate) + '</div><div class="u">per plate</div></div></button>';
      }).join('') : '<div class="mm-empty">🍲 Add a meal you cook to see what it costs a plate.</div>') + '</div>' +
      '<button type="button" class="mm-addbtn" data-mm-new><span class="mm-plus">+</span> New meal</button>' +
      '<div class="mm-h2">🥗 Sides</div>' + (sides.length ? '<div class="mm-meals">' + sides.map(function (r) {
        return '<button type="button" class="mm-meal" data-mm-open="' + r.m.id + '"><div class="mm-tile" style="background:' + mmTint(r.m.color) + '">' + mmTile(r.m) + '</div><div class="mm-mid"><div class="mm-name">' + esc(r.m.name) + '</div><div class="mm-meta">' + mm$(r.c.total) + ' · feeds ' + r.m.plates + '</div></div><div class="mm-pp"><div class="v">' + mm$(r.c.plate) + '</div><div class="u">per plate</div></div></button>';
      }).join('') + '</div>' : '') +
      '<button type="button" class="mm-addbtn" data-mm-newside><span class="mm-plus">+</span> New side</button>';
  }
  function mmPantryView() {
    var used = function (id) { return mmMeals().filter(function (m) { return (m.items || []).some(function (i) { return i.pantryItemId === id; }); }).length; };
    var items = mmPantry().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<div class="mm-top"><button type="button" class="mm-back" data-mm-go="meals">‹ Meals</button>' + mmGear() + '</div><h2 class="mm-h1">🧺 Pantry prices</h2>' +
      '<div class="mm-list">' + (items.length ? items.map(function (p) {
        var u = used(p.id), priced = p.price != null && p.packageAmount;
        return '<button type="button" class="mm-row" data-mm-pedit="' + p.id + '"><span class="mm-em">' + esc(p.emoji || mmGuess(p.name)) + '</span><span class="mm-mid"><span class="mm-n">' + esc(p.name) + '</span><span class="mm-s">' + (priced ? mmPkgText(p) + ' · ' : '') + 'used in ' + plural(u, 'meal') + '</span></span><span class="mm-r">' + (priced ? mm$(p.price / p.packageAmount) + '/' + mmUnitOne(p.unit) : '—') + '</span></button>';
      }).join('') : '<div class="mm-empty">Ingredients you add to meals show up here.</div>') + '</div>';
  }
  function mmIrow(it) {
    var blank = mmNum(it.price) == null, c = mmLine(it.price, it.packageAmount, it.amountUsed, it.alreadyHave);
    var sub = it.alreadyHave ? '<span class="mm-s have">🧺 Already have it</span>' : blank ? '<span class="mm-s">No price · not counted</span>' :
      mmNum(it.packageAmount) && mmNum(it.amountUsed) ? '<span class="mm-s">' + (+it.amountUsed) + ' of ' + (+it.packageAmount) + (it.unit === 'count' ? '' : ' ' + it.unit) + '</span>' : '<span class="mm-s">Tap to finish</span>';
    return '<button type="button" class="mm-irow" data-mm-iedit="' + it.key + '"><span class="mm-em">' + esc(it.emoji || mmGuess(it.name)) + '</span><span class="mm-mid"><span class="mm-n">' + esc(it.name) + '</span>' + sub + '</span><span class="mm-c">' + (it.alreadyHave || blank ? '—' : mm$(c)) + '</span><span class="mm-chev">›</span></button>';
  }
  function mmEditView() {
    var d = mmSt().draft;
    return '<button type="button" class="mm-back" data-mm-back>‹ Back</button>' +
      '<button type="button" class="mm-hero" data-mm-look style="background:' + mmTint(d.color) + '">' + (d.photo ? '<img src="' + d.photo + '" alt="Meal photo">' : esc(d.emoji)) + '<span class="mm-edit">🎨 Change look</span></button>' +
      '<input class="mm-title" data-mm-f="name" placeholder="' + (d.kind === 'side' ? 'Name this side' : 'Name this meal') + '" value="' + esc(d.name) + '" aria-label="Name">' +
      '<div class="mm-chips mm-kind" role="group" aria-label="Main or side"><button type="button" class="mm-chip" data-mm-kind="main" aria-pressed="' + (d.kind !== 'side') + '">🍽️ Main</button><button type="button" class="mm-chip" data-mm-kind="side" aria-pressed="' + (d.kind === 'side') + '">🥗 Side</button></div>' +
      '<div class="mm-row2"><div class="mm-field"><span class="mm-lab">🍽️ Plates</span><div class="mm-stepper"><button type="button" data-mm-plates="-1" aria-label="Fewer plates">−</button><input data-mm-f="plates" inputmode="numeric" value="' + esc(d.plates) + '" aria-label="Plates"><button type="button" data-mm-plates="1" aria-label="More plates">+</button></div></div>' +
      (d.kind === 'side' ? '' : '<label class="mm-field"><span class="mm-lab">🍔 Same meal eating out</span><span class="mm-money"><span>$</span><input class="mm-in" data-mm-f="eatingOutCost" inputmode="decimal" value="' + esc(d.eatingOutCost == null ? '' : d.eatingOutCost) + '" placeholder="optional"></span></label>') + '</div>' +
      '<div class="mm-h2">Ingredients' + (d.items.length ? ' · ' + d.items.length : '') + '</div>' +
      '<div class="mm-ings">' + (d.items.length ? d.items.map(mmIrow).join('') : '<div class="mm-empty">Tap + to add your first ingredient</div>') + '</div>' +
      '<button type="button" class="mm-addbtn" data-mm-addi><span class="mm-plus">+</span> Add ingredient</button>' +
      mmRecipeEdit(d) +
      '<button type="button" class="mm-btn ghost mm-sharebtn" data-mm-share>📤 Share this meal</button>' +
      (d.id ? '<button type="button" class="mm-del" data-mm-del>Delete meal</button>' : '') +
      '<div class="mm-bar" id="mmbar">' + mmBarHtml() + '</div>';
  }
  // ----- the recipe: photos of the page (to read while cooking) and/or a link to a recipe or video -----
  var MM_PAGES = 3;
  function mmHasRecipe(m) { return !!(m && ((m.recipePhotos && m.recipePhotos.length) || mmSafeUrl(m.recipeUrl))); }
  function mmSafeUrl(u) {
    u = String(u || '').trim(); if (!u) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); return /^https?:$/.test(x.protocol) && x.hostname.indexOf('.') > 0 ? x.href : ''; } catch (e) { return ''; }
  }
  function mmIsVideo(u) { return /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|vimeo\.com|facebook\.com|fb\.watch)$/i.test((function () { try { return new URL(u).hostname; } catch (e) { return ''; } })()); }
  function mmLinkBtn(u) { var v = mmIsVideo(u); return '<a class="mm-btn ghost mm-rlink" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer" data-mm-rgo>' + (v ? '▶️ Watch the video' : '🔗 Open the recipe') + '</a>'; }
  function mmRecipeEdit(d) {
    var pages = d.recipePhotos || [], url = mmSafeUrl(d.recipeUrl);
    return '<div class="mm-h2">📖 Recipe</div><div class="mm-recipe">' +
      (pages.length ? '<div class="mm-pages">' + pages.map(function (id, i) { return '<span class="mm-page"><button type="button" class="mm-pagebtn" data-mm-rview="' + i + '" aria-label="Open recipe page ' + (i + 1) + '"><img data-rid="' + esc(id) + '" alt=""></button><button type="button" class="mm-pagex" data-mm-rdel="' + i + '" aria-label="Remove recipe page ' + (i + 1) + '">✕</button></span>'; }).join('') + '</div>' : '') +
      (pages.length < MM_PAGES ? '<label class="mm-addbtn mm-rbtn">📷 ' + (pages.length ? 'Add another page' : 'Take a picture of the recipe') + '<input type="file" accept="image/*" data-mm-rphoto class="sr"></label>' : '') +
      '<label class="mm-field"><span class="mm-lab">🔗 Recipe or video link</span><input class="mm-in" data-mm-f="recipeUrl" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Paste a link" value="' + esc(d.recipeUrl || '') + '"></label>' +
      '<div id="mmrlink">' + (url ? mmLinkBtn(url) : '') + '</div></div>';
  }
  // the page store: { id: JPEG data URL } in IndexedDB, with what's been read kept in memory
  var mmRc = {}, mmDbP = null;
  function mmDb() {
    if (!mmDbP) mmDbP = new Promise(function (ok, no) {
      if (!window.indexedDB) { no(new Error('no idb')); return; }
      var r = indexedDB.open('fmtm-recipes', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('pages'); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { mmDbP = null; no(r.error); };
    });
    return mmDbP;
  }
  function mmDbDo(mode, fn) { return mmDb().then(function (db) { return new Promise(function (ok, no) { var tx = db.transaction('pages', mode), st = tx.objectStore('pages'), res = fn(st); tx.oncomplete = function () { ok(res && res.result); }; tx.onerror = tx.onabort = function () { no(tx.error); }; }); }); }
  function mmPagePut(id, src) { return mmDbDo('readwrite', function (st) { st.put(src, id); }).then(function () { mmRc[id] = src; }); }
  function mmPageGet(id) { return id in mmRc ? Promise.resolve(mmRc[id]) : mmDbDo('readonly', function (st) { return st.get(id); }).then(function (v) { mmRc[id] = v || null; return mmRc[id]; }, function () { return null; }); }
  // pages no meal (or the open draft) uses any more are deleted
  function mmPageGc() {
    var keep = {}; mmMeals().concat(mmSt().draft ? [mmSt().draft] : []).forEach(function (m) { (m.recipePhotos || []).forEach(function (id) { keep[id] = 1; }); });
    mmDbDo('readonly', function (st) { return st.getAllKeys(); }).then(function (keys) {
      var gone = (keys || []).filter(function (k) { return !keep[k]; }); if (!gone.length) return;
      gone.forEach(function (k) { delete mmRc[k]; }); return mmDbDo('readwrite', function (st) { gone.forEach(function (k) { st.delete(k); }); });
    }).catch(function () {});
  }
  // fill every <img data-rid> on screen; a page taken on another phone isn't here
  function mmFillPages(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('img[data-rid]:not([src])'), function (img) {
      mmPageGet(img.getAttribute('data-rid')).then(function (src) {
        if (src) img.src = src; else { var ph = document.createElement('span'); ph.className = 'mm-nopage'; ph.textContent = '📷 On the phone that took it'; img.replaceWith(ph); }
      });
    });
  }
  // recipe pages are bigger than the meal photo so the words stay readable: about 1200px, JPEG
  function mmRecipePhoto(file) {
    if (!file) return;
    var d = mmSt().draft; if (!d) return;
    var rd = new FileReader();
    rd.onload = function () { var img = new Image(); img.onload = function () {
      var s = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      var id = uid();
      mmPagePut(id, c.toDataURL('image/jpeg', 0.75)).then(function () {
        if (mmSt().draft !== d) return;
        d.recipePhotos = (d.recipePhotos || []).concat([id]).slice(0, MM_PAGES); track('meal-recipe-photo'); render();
      }, function () { mmToast('Couldn’t save that photo on this phone'); });
    }; img.onerror = function () { mmToast('Couldn’t open that photo'); }; img.src = rd.result; };
    rd.readAsDataURL(file);
  }
  // full screen, for cooking: pages one under another, tap a page to zoom, and the screen stays on
  var mmWake = null;
  function mmRecipeOpen(m, at) {
    var pages = m.recipePhotos || [], url = mmSafeUrl(m.recipeUrl);
    var el = document.createElement('div'); el.id = 'mmrecipe'; el.className = 'mm-rview'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Recipe');
    el.innerHTML = '<div class="mm-rtop"><b>📖 ' + esc(m.name || 'Recipe') + '</b><span class="mm-rtopr"><button type="button" class="mm-close" data-mm-rshare aria-label="Share">📤</button><button type="button" class="mm-close" data-mm-rclose aria-label="Close">✕</button></span></div>' +
      '<div class="mm-rbody">' + pages.map(function (id, i) { return '<div class="mm-rimg" data-i="' + i + '"><img data-rid="' + esc(id) + '" alt="Recipe page ' + (i + 1) + '" role="button" tabindex="0" aria-label="Recipe page ' + (i + 1) + ', tap to zoom"></div>'; }).join('') +
      (url ? '<div class="mm-rfoot">' + mmLinkBtn(url) + '</div>' : '') + '</div>';
    document.body.appendChild(el); document.body.classList.add('mm-lock'); mmFillPages(el);
    var close = function () { el.remove(); if (!document.getElementById('mmsheet')) document.body.classList.remove('mm-lock'); document.removeEventListener('keydown', key, true); if (mmWake) { mmWake.release().catch(function () {}); mmWake = null; } };
    var key = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    el.querySelector('[data-mm-rclose]').onclick = close; document.addEventListener('keydown', key, true);
    el.querySelector('[data-mm-rshare]').onclick = function () { close(); mmShareOpen(m); };
    Array.prototype.forEach.call(el.querySelectorAll('.mm-rimg'), function (b) { var z = function () { b.classList.toggle('big'); }; b.firstChild.onclick = z; b.firstChild.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); z(); } }; });
    try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { mmWake = w; }).catch(function () {}); } catch (e) {}
    var first = el.querySelector('.mm-rimg[data-i="' + (at || 0) + '"]'); if (first && at) setTimeout(function () { first.scrollIntoView({ block: 'start' }); }, 30);
    el.querySelector('[data-mm-rclose]').focus({ preventScroll: true });
    track('meal-recipe-open');
  }
  // ----- share a meal as a card (plus its recipe photos, if they want) -----
  function mmQty(n, u) {
    n = mmR2(n || 0); u = u || 'servings'; if (!n) return '';
    if (u === 'count') return '× ' + n;
    return n + ' ' + (n === 1 && /s$/.test(u) ? u.slice(0, -1) : u);
  }
  function mmAmt(it) { return mmQty(mmNum(it.amountUsed), it.unit); }
  function mmShareData(m) {
    var draft = m === mmSt().draft, lines = draft ? m.items : mmLines(m), c = mmTotals(lines, m.plates, m.eatingOutCost), url = mmSafeUrl(m.recipeUrl), host = '';
    try { host = url ? new URL(url).hostname.replace(/^www\./, '') : ''; } catch (e) {}
    return { name: String(m.name || '').trim() || 'Untitled meal', emoji: m.emoji, color: m.color, photo: m.photo || null,
      plate: c.plate != null && c.total > 0 ? mm$(c.plate) : null, total: c.total > 0 ? mm$(c.total) : null, plates: Math.max(1, parseInt(m.plates, 10) || 1), saves: c.saves > 0 ? mm$(c.saves) : null,
      rows: lines.filter(function (it) { return String(it.name || '').trim(); }).map(function (it) { var have = it.alreadyHave || mmNum(it.price) == null; return { emoji: it.emoji || mmGuess(it.name), name: it.name, amt: mmAmt(it), cost: have ? '—' : mm$(mmLine(it.price, it.packageAmount, it.amountUsed)) }; }),
      link: host, video: !!url && mmIsVideo(url), url: url, footer: CONFIG.shareUrl || '', pages: (m.recipePhotos || []).slice() };
  }
  function mmBlob(dataUrl) { var b = atob(dataUrl.split(',')[1]), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return new Blob([a], { type: (/^data:([^;]+)/.exec(dataUrl) || [])[1] || 'image/jpeg' }); }
  function mmFileName(name, extra) { return (String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'meal') + extra; }
  function mmShareOpen(m) {
    var r = mmShareData(m), sh = { type: 'share', r: r, card: null, pages: [], withPages: true };
    mmOpen(sh); track('meal-share-open');
    window.FMTMShare.recipe(r, function (img) { if (mmSt().sheet !== sh) return; sh.card = img; mmSheetDraw(); });
    // the recipe photos, read now so the share opens straight from the tap
    Promise.all(r.pages.map(mmPageGet)).then(function (srcs) { sh.pages = srcs.filter(Boolean).map(function (src, i) { return new File([mmBlob(src)], mmFileName(r.name, '-recipe-' + (i + 1) + '.jpg'), { type: 'image/jpeg' }); }); if (mmSt().sheet === sh) mmSheetDraw(); });
  }
  function mmShareFiles(sh) { return [new File([sh.card.blob], mmFileName(sh.r.name, '-card.png'), { type: 'image/png' })].concat(sh.withPages ? sh.pages : []); }
  function mmShareSheet() {
    var sh = mmSt().sheet;
    return mmSheetHead('📤 Share this meal') +
      '<div class="mm-shprev">' + (sh.card ? '<img src="' + sh.card.url + '" alt="Recipe card for ' + esc(sh.r.name) + '">' : '<span class="mm-s">Making your card…</span>') + '</div>' +
      (sh.pages.length ? '<button type="button" class="mm-chip mm-shpages" data-mm-shpages aria-pressed="' + sh.withPages + '">📖 Add ' + (sh.pages.length > 1 ? 'the ' + sh.pages.length + ' recipe photos' : 'the recipe photo') + '</button>' : '') +
      '<div class="mm-acts"><button type="button" class="mm-btn ghost" data-mm-shsave' + (sh.card ? '' : ' disabled') + '>⬇️ Save image</button><button type="button" class="mm-btn gold" data-mm-shgo' + (sh.card ? '' : ' disabled') + '>📤 Share</button></div>';
  }
  function mmShareGo() {
    var sh = mmSt().sheet; if (!sh || !sh.card) return;
    var files = mmShareFiles(sh), text = sh.r.name + (sh.r.plate ? ' · ' + sh.r.plate + ' a plate' : '') + (sh.r.url ? '\n' + sh.r.url : '');
    if (!(navigator.canShare && navigator.canShare({ files: files })) && files.length > 1) files = files.slice(0, 1);
    if (navigator.canShare && navigator.canShare({ files: files })) {
      navigator.share({ files: files, text: text }).then(function () { track('meal-share'); }).catch(function (err) { if (err && err.name !== 'AbortError') { mmShareSave(); } });
    } else mmShareSave();
  }
  function mmShareSave() {
    var sh = mmSt().sheet; if (!sh || !sh.card) return;
    mmShareFiles(sh).forEach(function (f, i) { setTimeout(function () { download(f.name, f.type, f); }, i * 400); });
    track('meal-share-save'); mmToast('⬇️ Saved');
  }
  function mmBarHtml() {
    var d = mmSt().draft, c = mmTotals(d.items, d.plates, d.eatingOutCost);
    var note = c.skipped ? '🧺 ' + plural(c.skipped, 'item') + ' you already have, not counted' + (c.skippedVal ? ' (' + mm$(c.skippedVal) + ')' : '') : '';
    return '<div class="mm-bar-in">' + (note ? '<div class="mm-note">' + note + '</div>' : '') +
      '<div><div class="k">Meal total</div><div class="v">' + mm$(c.total) + '</div></div><div><div class="k">Per plate</div><div class="v">' + mm$(c.plate) + '</div></div>' +
      (d.kind === 'side' ? '' : '<div><div class="k">Saves</div><div class="v t">' + mm$(c.saves) + '</div></div>') + '<button type="button" class="mm-save" data-mm-save>Save</button></div>';
  }
  // ----- the grocery list: what the planned meals still need this week, plus anything else, to check off or copy -----
  // P.grocery = { checked: { 'sunday|pantryItemId': 1 (in the cart) or 2 (cleared) }, extras: [{ id, name, done }] }
  function mmGroc() { var g = P.grocery || (P.grocery = {}); g.checked = g.checked || {}; g.extras = g.extras || []; return g; }
  // meals planned from today to the end of the week, already-have items left out, the same item added up across meals
  function mmNeeds(wk) {
    var td = mmToday(), end = mmAdd(wk, 6), by = {}, out = [];
    mmPlan().filter(function (e) { return e.type === 'meal' && e.date >= wk && e.date <= end && e.date >= td; }).forEach(function (e) {
      var m0 = mmMeal(e.mealId); if (!m0) return;
      [m0].concat(mmEntrySides(e)).forEach(function (m) {
        (m.items || []).forEach(function (it) {
          var p = mmItem(it.pantryItemId); if (it.alreadyHave || !p) return;
          var r = by[p.id]; if (!r) { r = by[p.id] = { id: p.id, p: p, need: 0, meals: [] }; out.push(r); }
          r.need += mmNum(it.amountUsed) || 0; if (r.meals.indexOf(m.name) < 0) r.meals.push(m.name);
        });
      });
    });
    // the cost is whole packages: 5 servings from a 32-serving bag still means buying the bag
    out.forEach(function (r) { var pkg = mmNum(r.p.packageAmount), price = mmNum(r.p.price), packs = pkg && r.need ? Math.ceil(r.need / pkg - 1e-9) : null; r.cost = price != null && packs ? mmR2(packs * price) : null; });
    return out.sort(function (a, b) { return a.p.name.localeCompare(b.p.name); });
  }
  function mmGItems(wk) {
    var g = mmGroc();
    return mmNeeds(wk).map(function (r) { var c = g.checked[wk + '|' + r.id]; return { k: 'm:' + r.id, done: !!c, gone: c === 2, emoji: r.p.emoji || mmGuess(r.p.name), name: r.p.name, qty: mmQty(r.need, r.p.unit), sub: [mmQty(r.need, r.p.unit), r.meals.join(', ')].filter(Boolean).join(' · '), cost: r.cost }; })
      .concat(g.extras.map(function (x) { return { k: 'x:' + x.id, id: x.id, done: !!x.done, emoji: mmGuess(x.name), name: x.name, qty: '', sub: '', cost: null, extra: true }; }))
      .filter(function (it) { return !it.gone; });
  }
  function mmGRow(it) {
    return '<div class="mm-gitem' + (it.done ? ' done' : '') + '"><button type="button" class="mm-gcheck" role="checkbox" aria-checked="' + it.done + '" data-mm-gtick="' + esc(it.k) + '"><span class="mm-box" aria-hidden="true">' + (it.done ? '✓' : '') + '</span><span class="mm-em">' + esc(it.emoji) + '</span>' +
      '<span class="mm-mid"><span class="mm-n">' + esc(it.name) + '</span>' + (it.sub ? '<span class="mm-s">' + esc(it.sub) + '</span>' : '') + '</span>' + (it.cost != null ? '<span class="mm-c">' + mm$(it.cost) + '</span>' : '') + '</button>' +
      (it.extra ? '<button type="button" class="mm-gx" data-mm-gdel="' + esc(it.id) + '" aria-label="Remove ' + esc(it.name) + '">✕</button>' : '') + '</div>';
  }
  function mmListView() {
    var wk = mmSt().wk, items = mmGItems(wk), todo = items.filter(function (x) { return !x.done; }), got = items.filter(function (x) { return x.done; });
    var left = todo.reduce(function (t, x) { return t + (x.cost || 0); }, 0);
    return mmHead('list') + mmWeekNav(wk, 'data-mm-wk') +
      '<div class="mm-strip"><span>🛒 <b>' + todo.length + '</b> to get</span><span>✓ <b>' + got.length + '</b> in the cart</span>' + (left ? '<span>💵 about <b>' + mm$(mmR2(left)) + '</b></span>' : '') + '</div>' +
      '<form class="mm-gadd" data-mm-gform><input class="mm-in" id="mmGAdd" placeholder="Add an item" aria-label="Add an item" autocomplete="off" enterkeyhint="done" maxlength="60"><button type="submit" class="mm-btn gold">Add</button></form>' +
      (items.length ? '' : '<div class="mm-empty">No meals coming up this week</div>') +
      (todo.length ? '<div class="mm-list">' + todo.map(mmGRow).join('') + '</div>' : '') +
      (got.length ? '<div class="mm-h2">✓ In the cart</div><div class="mm-list">' + got.map(mmGRow).join('') + '</div>' : '') +
      (items.length ? '<div class="mm-acts"><button type="button" class="mm-btn ghost" data-mm-gcopy>📋 Copy list</button>' + (navigator.share ? '<button type="button" class="mm-btn ghost" data-mm-gshare>📤 Share</button>' : '') + '</div>' : '') +
      (got.length ? '<button type="button" class="mm-btn ghost mm-gclear" data-mm-gclear>🧹 Clear checked</button>' : '');
  }
  // what's left to get, as plain text for notes, messages or another list app
  function mmGText() {
    var wk = mmSt().wk, todo = mmGItems(wk).filter(function (x) { return !x.done; });
    return todo.length ? '🛒 Grocery list · ' + mmWeekLabel(wk) + '\n' + todo.map(function (x) { return '☐ ' + x.name + (x.qty ? ' (' + x.qty + ')' : ''); }).join('\n') : '';
  }
  function mmCopy(t, ev) {
    var done = function () { mmToast('📋 Copied'); track(ev || 'grocery-copy'); };
    var old = function () { var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { mmToast('Couldn’t copy here'); } ta.remove(); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(done, old); return; } } catch (e) {}
    old();
  }
  function mealsScreen() {
    var st = mmSt();
    if (st.view === 'edit' && !st.draft) st.view = 'meals';
    if (st.view === 'edit') setTimeout(function () { mmFillPages(app); }, 0);
    return '<div class="mm">' + (st.view === 'edit' ? mmEditView() : st.view === 'meals' ? mmMealsView() : st.view === 'pantry' ? mmPantryView() : st.view === 'list' ? mmListView() : mmWeekView()) + '</div>';
  }
  // the weekly recap's "Meals at home" section
  function mmRecap(ws) {
    if (!mmMeals().length && !mmPlan().length) return '';
    var s = mmStats(ws, mmAdd(ws, 6)), a = mmStats('0000-01-01', mmToday()), cur = mmWeek(mmToday());
    var cooked = Object.keys(s.byMeal).map(function (id) { return { m: mmMeal(id), n: s.byMeal[id] }; }).filter(function (x) { return x.m; }).sort(function (x, y) { return y.n - x.n; });
    return '<div class="card stack" style="padding:16px 18px;gap:10px"><b>🍽️ Meals at home</b>' +
      '<div class="mm-saved"><div class="lbl">🏠 Saved by eating at home' + (ws === cur ? ' so far this week' : ' this week') + '</div><div class="big">' + mm$(s.saved) + '</div><div class="sub">compared with eating the same meals out</div></div>' +
      '<div class="mm-stats"><div class="mm-stat"><div class="e">🍽️</div><div class="v">' + s.home + '</div><div class="k">meals at home</div></div><div class="mm-stat"><div class="e">🥡</div><div class="v">' + s.left + '</div><div class="k">leftover meals</div></div>' +
      '<div class="mm-stat"><div class="e">🛒</div><div class="v">' + mm$(s.cost) + '</div><div class="k">spent cooking ' + plural(s.cooked, 'meal') + '</div></div><div class="mm-stat"><div class="e">🍔</div><div class="v">' + s.out + '</div><div class="k">eating out' + (s.out ? ' · ' + mmW(s.outBudget) + ' budget' : '') + '</div></div></div>' +
      '<div class="mm-since"><div><div class="k">Since you started</div><div class="v">' + mm$(a.saved) + '</div></div><div class="s">saved by eating at home<br>' + plural(a.home, 'meal') + ' at home</div></div>' +
      (cooked.length ? '<div class="mm-h2" style="margin:6px 0 0">Cooked this week</div><div class="mm-list">' + cooked.map(function (x) { var c = mmCalc(x.m); return '<div class="mm-row"><span class="mm-em" style="background:' + mmTint(x.m.color) + '">' + mmTile(x.m) + '</span><span class="mm-mid"><span class="mm-n">' + esc(x.m.name) + (x.n > 1 ? ' ×' + x.n : '') + '</span><span class="mm-s">' + mm$(c.plate) + ' a plate</span></span><span class="mm-r t">' + (c.saves > 0 ? '+' + mm$(c.saves * x.n) : '') + '</span></div>'; }).join('') + '</div>' : '') +
      (s.planned ? '<div class="mm-s" style="margin-top:2px">📅 ' + plural(s.planned, 'more meal') + ' planned this week</div>' : '') + '</div>';
  }

  // ----- pop-ups (drawn over the app; nothing here re-draws the page under it until it's done) -----
  function mmOpen(sheet) { mmSt().sheet = sheet; mmSheetDraw(); }
  function mmClose(redraw) { var st = mmSt(); st.sheet = null; var el = document.getElementById('mmsheet'); if (el) el.remove(); document.body.classList.remove('mm-lock'); if (redraw) render(); }
  function mmSheetDraw() {
    var st = mmSt(), sh = st.sheet; if (!sh) return;
    var el = document.getElementById('mmsheet');
    if (!el) { el = document.createElement('div'); el.id = 'mmsheet'; el.className = 'mm-scrim'; el.innerHTML = '<div class="mm-panel" role="dialog" aria-modal="true"></div>'; document.body.appendChild(el); document.body.classList.add('mm-lock'); }
    el.firstChild.innerHTML = { plan: mmPlanSheet, pick: mmPickSheet, item: mmItemSheet, look: mmLookSheet, share: mmShareSheet }[sh.type]();
    if (sh.type === 'item') mmCalcLive();
  }
  function mmSheetHead(t) { return '<div class="mm-grab"></div><div class="mm-shtitle"><b>' + t + '</b><button type="button" class="mm-close" data-mm-close aria-label="Close">✕</button></div>'; }
  function mmPlanSheet() {
    var p = mmSt().sheet, cur = mmEntry(p.date, p.slot), td = mmToday();
    var meals = mmMeals().filter(function (m) { return !mmIsSide(m); }).map(function (m) { return { m: m, c: mmCalc(m) }; }).sort(function (a, b) { return (a.c.plate == null ? 1e12 : a.c.plate) - (b.c.plate == null ? 1e12 : b.c.plate); });
    var on = function (type, id) { return !!(cur && cur.type === type && (type !== 'meal' || cur.mealId === id)); };
    return mmSheetHead('📅 Plan a meal') +
      '<div class="mm-daterow"><button type="button" class="mm-nav" data-mm-pd="-1" aria-label="Previous day">‹</button><b>' + mmDay(p.date) + (p.date === td ? ' · Today' : '') + '</b><button type="button" class="mm-nav" data-mm-pd="1" aria-label="Next day">›</button></div>' +
      '<div class="mm-slots" role="group" aria-label="Meal">' + MM_SLOTS.map(function (x) { return '<button type="button" class="mm-chip" data-mm-ps="' + x[0] + '" aria-pressed="' + (x[0] === p.slot) + '">' + x[2] + ' ' + x[1] + '</button>'; }).join('') + '</div>' +
      (cur && cur.type === 'meal' && mmHasRecipe(mmMeal(cur.mealId)) ? '<button type="button" class="mm-btn gold mm-rsee" data-mm-rsee="' + cur.mealId + '">📖 Open the recipe</button>' : '') +
      '<div class="mm-h2">Your meals</div><div class="mm-list"><button type="button" class="mm-row new" data-mm-newmeal><span class="mm-em">+</span><span class="mm-mid"><span class="mm-n">New meal</span><span class="mm-s">Price out a meal you cook</span></span><span></span></button>' + (meals.length ? meals.map(function (x) {
        return '<button type="button" class="mm-row" data-mm-pm="' + x.m.id + '" aria-pressed="' + on('meal', x.m.id) + '"><span class="mm-em" style="background:' + mmTint(x.m.color) + '">' + mmTile(x.m) + '</span><span class="mm-mid"><span class="mm-n">' + esc(x.m.name) + '</span><span class="mm-s">' + mm$(x.c.plate) + ' a plate' + (x.c.saves > 0 ? ' · saves ' + mm$(x.c.saves) : '') + '</span></span><span class="mm-r">' + (on('meal', x.m.id) ? '✓' : '') + '</span></button>';
      }).join('') : '') + '</div>' +
      (cur && cur.type === 'meal' ? '<div class="mm-h2">🥗 Sides</div><div class="mm-list">' + mmSides().map(function (x) {
        var on2 = (cur.sideIds || []).indexOf(x.id) >= 0;
        return '<button type="button" class="mm-row" data-mm-pside="' + x.id + '" aria-pressed="' + on2 + '"><span class="mm-em" style="background:' + mmTint(x.color) + '">' + mmTile(x) + '</span><span class="mm-mid"><span class="mm-n">' + esc(x.name) + '</span><span class="mm-s">' + mm$(mmCalc(x).plate) + ' a plate</span></span><span class="mm-r">' + (on2 ? '✓' : '+') + '</span></button>';
      }).join('') + '<button type="button" class="mm-row new" data-mm-newside><span class="mm-em">+</span><span class="mm-mid"><span class="mm-n">New side</span></span><span></span></button></div>' +
        ((cur.sideIds || []).length ? '<div class="mm-s" style="margin-top:8px">' + esc(mmMeal(cur.mealId).name) + ' with sides: <b>' + mm$(mmEntryCalc(cur).plate) + ' a plate</b></div>' : '') +
        '<button type="button" class="mm-btn gold mm-rsee" data-mm-close>Done</button>' : '') +
      '<div class="mm-h2">Or</div><div class="mm-list">' +
      '<button type="button" class="mm-row" data-mm-left aria-pressed="' + on('leftovers') + '"><span class="mm-em">🥡</span><span class="mm-mid"><span class="mm-n">Leftovers</span><span class="mm-s">Counts as a meal at home</span></span><span class="mm-r">' + (on('leftovers') ? '✓' : '') + '</span></button>' +
      '<button type="button" class="mm-row" data-mm-out aria-pressed="' + on('eatOut') + '"><span class="mm-em">🍔</span><span class="mm-mid"><span class="mm-n">Eat out</span><span class="mm-s">' + (on('eatOut') ? mmW(cur.budget) + ' budget' : 'Set a dollar budget') + '</span></span><span class="mm-r">' + (on('eatOut') ? '✓' : '') + '</span></button></div>' +
      (p.outOpen ? '<div class="mm-outbox"><label class="mm-lab" for="mmOut">🍔 Eating out budget</label><span class="mm-money"><span>$</span><input class="mm-in" id="mmOut" inputmode="decimal" value="' + esc(p.budget == null ? '' : p.budget) + '" placeholder="0"></span><button type="button" class="mm-btn gold" data-mm-saveout>Save</button></div>' : '') +
      (cur ? '<div class="mm-acts"><button type="button" class="mm-btn ghost" data-mm-clear>Clear ' + mmSlot(p.slot)[1].toLowerCase() + '</button></div>' : '');
  }
  function mmSetEntry(fields) {
    var p = mmSt().sheet, st = mmSt();
    var was = mmEntry(p.date, p.slot);
    P.planEntries = mmPlan().filter(function (e) { return !(e.date === p.date && e.slot === p.slot); });
    var e = { id: uid(), date: p.date, slot: p.slot, type: fields.type, mealId: fields.mealId || null, sideIds: fields.type === 'meal' && was && was.type === 'meal' ? (was.sideIds || []).filter(function (x) { return x !== fields.mealId; }) : [], budget: fields.type === 'eatOut' ? (mmNum(fields.budget) || 0) : null, createdAt: new Date().toISOString() };
    P.planEntries.push(e); save(); track('meal-plan-' + e.type);
    var label = e.type === 'meal' ? mmMeal(e.mealId).name : e.type === 'leftovers' ? 'Leftovers' : 'Eat out · ' + mmW(e.budget);
    mmClose(); st.wk = mmWeek(p.date); st.view = 'week';
    if (U.screen !== 'meals') go('meals'); else render();
    mmToast('📅 ' + label + ' · ' + F.fromIso(p.date).toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + mmSlot(p.slot)[1].toLowerCase());
    setTimeout(function () { var el = app.querySelector('[data-mm-slot="' + p.date + '|' + p.slot + '"]'); if (el) el.scrollIntoView({ block: 'center' }); }, 60);
    if (e.type === 'meal' && mmSides().length) mmOpen({ type: 'plan', date: p.date, slot: p.slot });
  }
  function mmPickList() {
    var sh = mmSt().sheet, q = String(sh.q || '').trim().toLowerCase(), d = mmSt().draft;
    var inMeal = {}; d.items.forEach(function (i) { inMeal[String(i.name || '').toLowerCase()] = 1; });
    var list = mmPantry().filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    return '<button type="button" class="mm-row new" data-mm-newing><span class="mm-em">+</span><span class="mm-mid"><span class="mm-n">' + (q ? 'New: “' + esc(String(sh.q).trim()) + '”' : 'New ingredient') + '</span><span class="mm-s">Something you haven’t priced yet</span></span><span></span></button>' +
      list.map(function (p) {
        var has = inMeal[p.name.toLowerCase()], priced = p.price != null && p.packageAmount;
        return '<button type="button" class="mm-row" data-mm-pick="' + p.id + '"' + (has ? ' disabled' : '') + '><span class="mm-em">' + esc(p.emoji || mmGuess(p.name)) + '</span><span class="mm-mid"><span class="mm-n">' + esc(p.name) + '</span><span class="mm-s">' + (has ? 'Already in this meal' : priced ? mmPkgText(p) : 'No price yet') + '</span></span><span class="mm-r">' + (priced ? mm$(p.price / p.packageAmount) + '/' + mmUnitOne(p.unit) : '') + '</span></button>';
      }).join('');
  }
  function mmPickSheet() { return mmSheetHead('Add an ingredient') + '<input class="mm-in" id="mmQ" placeholder="🔎 Search your pantry" value="' + esc(mmSt().sheet.q || '') + '" autocomplete="off"><div class="mm-list" id="mmPickList">' + mmPickList() + '</div>'; }
  function mmItemSheet() {
    var sh = mmSt().sheet, f = sh.f, pantry = sh.mode === 'pantry';
    return mmSheetHead(pantry ? 'Edit price' : sh.key ? 'Edit ingredient' : 'Add to meal') +
      '<div class="mm-namerow"><button type="button" class="mm-emobtn" data-mm-emotoggle aria-label="Pick an icon">' + esc(f.emoji) + '</button><input class="mm-in" id="mmName" placeholder="Ingredient name" value="' + esc(f.name) + '" autocomplete="off"></div>' +
      '<div class="mm-grid" id="mmEmoGrid" hidden>' + MM_ING_EMO.map(function (e) { return '<button type="button" data-mm-ie="' + e + '" aria-pressed="' + (e === f.emoji) + '">' + e + '</button>'; }).join('') + '</div>' +
      '<div class="mm-sect"><span class="mm-lab">🛒 At the store</span><div class="mm-row2"><label class="mm-field"><span class="mm-lab">Price</span><span class="mm-money"><span>$</span><input class="mm-in" id="mmPrice" inputmode="decimal" value="' + esc(f.price) + '" placeholder="0.00"></span></label>' +
      '<label class="mm-field"><span class="mm-lab">How many in the package</span><input class="mm-in" id="mmPkg" inputmode="decimal" value="' + esc(f.packageAmount) + '"></label></div>' +
      '<div class="mm-units" role="group" aria-label="Unit">' + MM_UNITS.map(function (u) { return '<button type="button" class="mm-chip" data-mm-unit="' + u + '" aria-pressed="' + (u === f.unit) + '">' + u + '</button>'; }).join('') + '</div></div>' +
      (pantry ? '' : '<div class="mm-sect"><span class="mm-lab">🥄 This recipe uses</span><div class="mm-stepper"><button type="button" data-mm-uses="-1" aria-label="Less">−</button><input id="mmUses" inputmode="decimal" value="' + esc(f.amountUsed) + '" aria-label="Amount used"><span class="unit" id="mmUnit">' + f.unit + '</span><button type="button" data-mm-uses="1" aria-label="More">+</button></div>' +
        '<button type="button" class="mm-toggle" data-mm-have aria-pressed="' + !!f.alreadyHave + '">🧺 Already have it</button></div>') +
      '<div class="mm-calc"><span class="f" id="mmFormula"></span><span class="v" id="mmCost"></span></div>' +
      '<div class="mm-acts">' + (sh.key ? '<button type="button" class="mm-btn ghost warn" data-mm-iremove>Remove</button>' : '') + '<button type="button" class="mm-btn gold" data-mm-isave>' + (pantry ? 'Save price' : sh.key ? 'Done' : 'Add to meal') + '</button></div>';
  }
  function mmCalcLive() {
    var sh = mmSt().sheet; if (!sh || sh.type !== 'item') return; var f = sh.f, fe = document.getElementById('mmFormula'), ce = document.getElementById('mmCost'); if (!fe) return;
    var price = mmNum(f.price), pkg = mmNum(f.packageAmount), uses = mmNum(f.amountUsed);
    if (sh.mode === 'pantry') { if (price != null && pkg) { fe.textContent = mm$(price) + ' ÷ ' + pkg + ' ' + f.unit; ce.textContent = mm$(price / pkg) + '/' + mmUnitOne(f.unit); } else { fe.textContent = 'Add a price and package size'; ce.textContent = '—'; } return; }
    if (f.alreadyHave) { fe.textContent = 'Already have it · not counted'; ce.textContent = '$0.00'; }
    else if (price == null) { fe.textContent = 'No price yet · not counted'; ce.textContent = '—'; }
    else if (pkg && uses) { fe.textContent = mm$(price) + ' ÷ ' + pkg + ' × ' + uses; ce.textContent = mm$(mmLine(price, pkg, uses, false)); }
    else { fe.textContent = 'Add package size and amount'; ce.textContent = '—'; }
  }
  function mmLookSheet() {
    var d = mmSt().draft;
    return mmSheetHead('🎨 Make it yours') + '<span class="mm-lab">Icon</span><div class="mm-grid">' + MM_MEAL_EMO.map(function (e) { return '<button type="button" data-mm-me="' + e + '" aria-pressed="' + (!d.photo && e === d.emoji) + '">' + e + '</button>'; }).join('') + '</div>' +
      '<div class="mm-sect"><span class="mm-lab">Color</span><div class="mm-swatches">' + MM_COLORS.map(function (c) { return '<button type="button" class="mm-sw" data-mm-color="' + c[1] + '" aria-label="' + c[0] + '" aria-pressed="' + (c[1] === d.color) + '" style="background:' + c[1] + '"></button>'; }).join('') + '</div></div>' +
      '<div class="mm-sect"><span class="mm-lab">Photo</span><div class="mm-acts" style="margin-top:0"><label class="mm-btn ghost">📷 ' + (d.photo ? 'Change photo' : 'Add a photo') + '<input type="file" accept="image/*" data-mm-photo class="sr"></label>' + (d.photo ? '<button type="button" class="mm-btn ghost" data-mm-nophoto>Use icon instead</button>' : '') + '</div></div>' +
      '<div class="mm-acts"><button type="button" class="mm-btn gold" data-mm-close>Done</button></div>';
  }
  function mmOpenItem(mode, src, key) {
    mmOpen({ type: 'item', mode: mode, key: key || null, pid: src.pantryItemId || src.id || null, picked: false,
      f: { emoji: src.emoji || mmGuess(src.name), name: src.name || '', price: src.price == null ? '' : src.price, packageAmount: src.packageAmount == null ? '' : src.packageAmount, unit: src.unit || 'servings', amountUsed: src.amountUsed == null ? '' : src.amountUsed, alreadyHave: !!src.alreadyHave } });
    var focus = mode === 'pantry' ? 'mmPrice' : !src.name ? 'mmName' : mmNum(src.price) == null && !src.alreadyHave ? 'mmPrice' : 'mmUses';
    setTimeout(function () { var el = document.getElementById(focus); if (el) el.focus(); }, 60);
  }
  function mmSaveItem() {
    var st = mmSt(), sh = st.sheet, f = sh.f, name = String(f.name || '').trim();
    if (!name) { var n = document.getElementById('mmName'); if (n) n.focus(); return; }
    if (sh.mode === 'pantry') {
      var p = mmItem(sh.pid); if (!p) return mmClose(true);
      var clash = mmPantry().some(function (x) { return x.id !== p.id && x.name.toLowerCase() === name.toLowerCase(); });
      if (!clash) p.name = name;
      p.emoji = f.emoji; p.price = mmNum(f.price); p.packageAmount = mmNum(f.packageAmount); p.unit = f.unit; p.updatedAt = new Date().toISOString();
      save(); track('meal-price'); mmClose(true); mmToast('✓ ' + p.name + ' updated in every meal'); return;
    }
    var item = { name: name, emoji: f.emoji, price: f.price, packageAmount: f.packageAmount, unit: f.unit, amountUsed: f.amountUsed, alreadyHave: !!f.alreadyHave };
    if (sh.key) { var it = st.draft.items.filter(function (i) { return i.key === sh.key; })[0]; if (it) for (var k in item) it[k] = item[k]; }
    else { item.key = uid(); item.pantryItemId = sh.pid; st.draft.items.push(item); }
    mmClose(true);
  }
  function mmStartEdit(id, from, kind) {
    var st = mmSt(), m = id ? mmMeal(id) : null; st.backTo = from || 'meals';
    st.draft = m ? { id: m.id, kind: m.kind === 'side' ? 'side' : 'main', name: m.name, emoji: m.emoji, color: m.color, plates: m.plates, eatingOutCost: m.eatingOutCost, photo: m.photo || null, recipePhotos: (m.recipePhotos || []).slice(), recipeUrl: m.recipeUrl || '', items: mmLines(m).map(function (x) { x.key = uid(); return x; }) }
      : { id: null, kind: kind === 'side' ? 'side' : 'main', name: '', emoji: kind === 'side' ? '🥗' : '🍲', color: MM_COLORS[mmMeals().length % MM_COLORS.length][1], plates: 4, eatingOutCost: null, photo: null, recipePhotos: [], recipeUrl: '', items: [] };
    st.view = 'edit'; if (U.screen !== 'meals') go('meals'); else render(); window.scrollTo(0, 0);
  }
  function mmSaveDraft() {
    var st = mmSt(), d = st.draft, items = [], now = new Date().toISOString();
    d.items.forEach(function (it) {
      var name = String(it.name || '').trim(); if (!name) return;
      // one pantry item per name: its price lives there, so every meal that uses it updates
      var p = mmPantry().filter(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })[0];
      if (!p) { p = { id: uid(), name: name }; mmPantry().push(p); }
      p.emoji = it.emoji || mmGuess(name); p.price = mmNum(it.price); p.packageAmount = mmNum(it.packageAmount); p.unit = it.unit || 'servings'; p.updatedAt = now;
      items.push({ pantryItemId: p.id, amountUsed: mmNum(it.amountUsed) || 0, alreadyHave: !!it.alreadyHave });
    });
    var side = d.kind === 'side';
    var m = { name: String(d.name || '').trim() || (side ? 'Untitled side' : 'Untitled meal'), kind: side ? 'side' : 'main', emoji: d.emoji, color: d.color, plates: Math.max(1, parseInt(d.plates, 10) || 1), eatingOutCost: side ? null : mmNum(d.eatingOutCost), photo: d.photo || null, recipePhotos: (d.recipePhotos || []).slice(0, MM_PAGES), recipeUrl: mmSafeUrl(d.recipeUrl), items: items };
    var meal = d.id ? mmMeal(d.id) : null, before = meal ? JSON.stringify(meal) : null;
    if (meal) { for (var k in m) meal[k] = m[k]; } else { meal = m; meal.id = uid(); meal.createdAt = now; mmMeals().push(meal); }
    save();
    if (!storageOk) {
      // the phone's storage is full: put the meal back the way it was and keep the draft open
      if (before) { var old = JSON.parse(before); Object.keys(meal).forEach(function (k) { delete meal[k]; }); Object.assign(meal, old); } else P.meals = mmMeals().filter(function (x) { return x !== meal; });
      save(); mmToast('No room on this phone to save'); return;
    }
    if (!before) track(m.kind === 'side' ? 'meal-new-side' : 'meal-new');
    // a side made from Plan a meal goes on that planned meal, and the planner opens again
    var at = st.attachTo; st.attachTo = null;
    var ae = at && !before && meal.kind === 'side' ? mmEntry(at.date, at.slot) : null;
    if (ae && ae.type === 'meal') { ae.sideIds = (ae.sideIds || []).concat([meal.id]); save(); setTimeout(function () { mmOpen({ type: 'plan', date: at.date, slot: at.slot }); }, 0); }
    if (at && !before && meal.kind !== 'side') {
      P.planEntries = mmPlan().filter(function (e) { return !(e.date === at.date && e.slot === at.slot); });
      P.planEntries.push({ id: uid(), date: at.date, slot: at.slot, type: 'meal', mealId: meal.id, sideIds: [], budget: null, createdAt: now }); save(); track('meal-plan-meal');
      st.wk = mmWeek(at.date); st.backTo = 'week';
      if (mmSides().length) setTimeout(function () { mmOpen({ type: 'plan', date: at.date, slot: at.slot }); }, 0);
    }
    var c = mmCalc(meal);
    setTimeout(mmPageGc, 0); st.draft = null; st.view = st.backTo === 'week' ? 'week' : 'meals'; render(); window.scrollTo(0, 0);
    mmToast('🎉 Saved · ' + mm$(c.plate) + ' a plate');
  }
  // a photo, shrunk to about 700px on its long side and kept as a JPEG in the plan
  function mmPhoto(file) {
    if (!file) return;
    var rd = new FileReader();
    rd.onload = function () { var img = new Image(); img.onload = function () {
      var s = Math.min(1, 700 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); mmSt().draft.photo = c.toDataURL('image/jpeg', 0.78); render(); mmSheetDraw();
    }; img.src = rd.result; };
    rd.readAsDataURL(file);
  }
  var mmToastTimer;
  function mmToast(msg) { var t = document.getElementById('mmtoast'); if (!t) { t = document.createElement('div'); t.id = 'mmtoast'; t.className = 'mm-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(mmToastTimer); mmToastTimer = setTimeout(function () { t.hidden = true; }, 2200); }
  function mmOpenPlan(date, slot) { mmOpen({ type: 'plan', date: date || mmToday(), slot: slot || 'dinner' }); }

  // ----- taps and typing inside Meal Math (separate from the app's data-a buttons) -----
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    var inMM = t.closest('.mm, #mmsheet'); if (!inMM) return;
    var st = mmSt(), sh = st.sheet, d = st.draft, a = function (k) { return t.getAttribute('data-mm-' + k); }, has = function (k) { return t.hasAttribute('data-mm-' + k); };
    if (has('close')) { mmClose(true); return; }
    if (a('go')) { st.view = a('go'); render(); window.scrollTo(0, 0); return; }
    if (a('wk')) { st.wk = mmAdd(st.wk, +a('wk')); render(); return; }
    if (a('sort')) { st.sort = a('sort'); render(); return; }
    if (a('open')) { mmStartEdit(a('open'), 'meals'); return; }
    if (has('new')) { mmStartEdit(null, 'meals'); return; }
    // a new meal made from Plan a meal goes on that day and meal once it's saved
    if (has('newmeal')) { var at0 = sh ? { date: sh.date, slot: sh.slot } : null; if (sh) mmClose(); mmStartEdit(null, sh ? 'week' : 'meals'); st.attachTo = at0; return; }
    if (has('newside')) { var fromWk = !!sh, at = sh ? { date: sh.date, slot: sh.slot } : null; if (sh) mmClose(); mmStartEdit(null, fromWk ? 'week' : 'meals', 'side'); st.attachTo = at; return; }
    if (a('kind')) { d.kind = a('kind'); if (d.kind === 'side') d.eatingOutCost = null; render(); return; }
    if (a('pside')) {
      var ce = mmEntry(sh.date, sh.slot); if (!ce) return; ce.sideIds = ce.sideIds || [];
      var si = ce.sideIds.indexOf(a('pside')); if (si >= 0) ce.sideIds.splice(si, 1); else { ce.sideIds.push(a('pside')); track('meal-plan-side'); }
      save(); render(); mmSheetDraw(); return;
    }
    if (a('slot')) { var ds = a('slot').split('|'); mmOpenPlan(ds[0], ds[1]); return; }
    if (a('pd')) { sh.date = mmAdd(sh.date, +a('pd')); sh.outOpen = false; mmSheetDraw(); return; }
    if (a('ps')) { sh.slot = a('ps'); sh.outOpen = false; mmSheetDraw(); return; }
    if (a('pm')) { mmSetEntry({ type: 'meal', mealId: a('pm') }); return; }
    if (has('left')) { mmSetEntry({ type: 'leftovers' }); return; }
    if (has('out')) { var cur = mmEntry(sh.date, sh.slot); sh.outOpen = true; sh.budget = cur && cur.type === 'eatOut' ? cur.budget : ''; mmSheetDraw(); setTimeout(function () { var el = document.getElementById('mmOut'); if (el) el.focus(); }, 40); return; }
    if (has('saveout')) { mmSetEntry({ type: 'eatOut', budget: sh.budget }); return; }
    if (has('clear')) { var p = sh; P.planEntries = mmPlan().filter(function (x) { return !(x.date === p.date && x.slot === p.slot); }); save(); mmClose(true); mmToast('Cleared ' + mmSlot(p.slot)[1].toLowerCase()); return; }
    if (has('back')) { st.attachTo = null; st.draft = null; st.view = st.backTo === 'week' ? 'week' : 'meals'; render(); mmPageGc(); return; }
    if (has('save')) { mmSaveDraft(); return; }
    if (has('del')) {
      if (t.getAttribute('data-sure')) { var id = d.id; P.meals = mmMeals().filter(function (m) { return m.id !== id; }); P.planEntries = mmPlan().filter(function (x) { return x.mealId !== id; }); mmPlan().forEach(function (x) { if (x.sideIds) x.sideIds = x.sideIds.filter(function (s) { return s !== id; }); }); save(); st.draft = null; st.view = 'meals'; render(); mmToast('Meal deleted'); mmPageGc(); }
      else { t.setAttribute('data-sure', '1'); t.textContent = 'Tap again to delete'; }
      return;
    }
    if (a('plates')) { d.plates = Math.max(1, (parseInt(d.plates, 10) || 1) + (+a('plates'))); var pi = app.querySelector('[data-mm-f=plates]'); if (pi) pi.value = d.plates; mmBar(); return; }
    if (has('look')) { mmOpen({ type: 'look' }); return; }
    if (a('me')) { d.emoji = a('me'); d.photo = null; render(); mmSheetDraw(); return; }
    if (a('color')) { d.color = a('color'); render(); mmSheetDraw(); return; }
    if (a('rview')) { mmRecipeOpen(d, +a('rview')); return; }
    if (a('rdel')) { d.recipePhotos = (d.recipePhotos || []).filter(function (x, i) { return i !== +a('rdel'); }); render(); return; }
    if (a('gtick')) {
      var gk = a('gtick'), g = mmGroc();
      if (gk.indexOf('m:') === 0) { var ck = st.wk + '|' + gk.slice(2); if (g.checked[ck]) delete g.checked[ck]; else g.checked[ck] = 1; }
      else g.extras.forEach(function (x) { if ('x:' + x.id === gk) x.done = !x.done; });
      save(); render(); return;
    }
    if (a('gdel')) { mmGroc().extras = mmGroc().extras.filter(function (x) { return x.id !== a('gdel'); }); save(); render(); return; }
    if (has('gclear')) {
      var gc = mmGroc(); gc.extras = gc.extras.filter(function (x) { return !x.done; });
      Object.keys(gc.checked).forEach(function (k) { if (k.indexOf(st.wk + '|') === 0 && gc.checked[k] === 1) gc.checked[k] = 2; });
      save(); render(); return;
    }
    if (has('gcopy')) { var tx = mmGText(); if (tx) mmCopy(tx); else mmToast('Nothing left to get'); return; }
    if (has('gshare')) { var ts = mmGText(); if (!ts) { mmToast('Nothing left to get'); return; } navigator.share({ text: ts }).then(function () { track('grocery-share'); }).catch(function () {}); return; }
    if (has('share')) { mmShareOpen(d); return; }
    if (has('shpages')) { sh.withPages = !sh.withPages; mmSheetDraw(); return; }
    if (has('shgo')) { mmShareGo(); return; }
    if (has('shsave')) { mmShareSave(); return; }
    if (a('rsee')) { mmRecipeOpen(mmMeal(a('rsee')) || {}, 0); return; }
    if (has('nophoto')) { d.photo = null; render(); mmSheetDraw(); return; }
    if (has('addi')) { mmOpen({ type: 'pick', q: '' }); setTimeout(function () { var q = document.getElementById('mmQ'); if (q) q.focus(); }, 60); return; }
    if (has('newing')) { var qq = String(sh.q || '').trim(); qq = qq.charAt(0).toUpperCase() + qq.slice(1); mmOpenItem('meal', { name: qq, emoji: mmGuess(qq) }); return; }
    if (a('pick')) { var pp = mmItem(a('pick')); mmOpenItem('meal', { pantryItemId: pp.id, name: pp.name, emoji: pp.emoji, price: pp.price, packageAmount: pp.packageAmount, unit: pp.unit, amountUsed: '', alreadyHave: pp.price == null }); return; }
    if (a('iedit')) { var it = d.items.filter(function (i) { return i.key === a('iedit'); })[0]; if (it) mmOpenItem('meal', it, it.key); return; }
    if (a('pedit')) { mmOpenItem('pantry', mmItem(a('pedit'))); return; }
    if (has('emotoggle')) { var g = document.getElementById('mmEmoGrid'); g.hidden = !g.hidden; return; }
    if (a('ie')) { sh.f.emoji = a('ie'); sh.picked = true; document.querySelector('[data-mm-emotoggle]').textContent = a('ie'); Array.prototype.forEach.call(document.querySelectorAll('[data-mm-ie]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mm-ie') === a('ie')); }); document.getElementById('mmEmoGrid').hidden = true; return; }
    if (a('unit')) { sh.f.unit = a('unit'); Array.prototype.forEach.call(document.querySelectorAll('[data-mm-unit]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mm-unit') === a('unit')); }); var u = document.getElementById('mmUnit'); if (u) u.textContent = a('unit'); mmCalcLive(); return; }
    if (a('uses')) { var step = sh.f.unit === 'lb' || sh.f.unit === 'cups' ? 0.5 : 1, v = Math.max(0, mmR2((mmNum(sh.f.amountUsed) || 0) + step * (+a('uses')))); sh.f.amountUsed = v; document.getElementById('mmUses').value = v; mmCalcLive(); return; }
    if (has('have')) { sh.f.alreadyHave = !sh.f.alreadyHave; t.setAttribute('aria-pressed', sh.f.alreadyHave); mmCalcLive(); return; }
    if (has('isave')) { mmSaveItem(); return; }
    if (has('iremove')) { d.items = d.items.filter(function (i) { return i.key !== sh.key; }); mmClose(true); return; }
  });
  document.addEventListener('click', function (e) { if (e.target.id === 'mmsheet') mmClose(true); });
  document.addEventListener('keydown', function (e) {
    var sh = mmSt().sheet; if (!sh) return;
    if (e.key === 'Escape') mmClose(true);
    if (e.key === 'Enter' && e.target.id === 'mmOut') { e.preventDefault(); mmSetEntry({ type: 'eatOut', budget: sh.budget }); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-chatform')) { e.preventDefault(); var ci = document.getElementById('chatIn'); chatSend(ci ? ci.value : ''); return; }
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-mm-gform')) return;
    e.preventDefault();
    var inp = document.getElementById('mmGAdd'), name = String(inp && inp.value || '').trim().slice(0, 60); if (!name) return;
    mmGroc().extras.push({ id: uid(), name: name.charAt(0).toUpperCase() + name.slice(1), done: false }); save(); track('grocery-add'); render();
    var again = document.getElementById('mmGAdd'); if (again) again.focus();
  });
  document.addEventListener('change', function (e) {
    if (!e.target.hasAttribute) return;
    if (e.target.hasAttribute('data-mm-photo')) { mmPhoto(e.target.files && e.target.files[0]); e.target.value = ''; }
    if (e.target.hasAttribute('data-mm-rphoto')) { mmRecipePhoto(e.target.files && e.target.files[0]); e.target.value = ''; }
  });
  function mmBar() { var b = document.getElementById('mmbar'); if (b) b.innerHTML = mmBarHtml(); }
  document.addEventListener('input', function (e) {
    var t = e.target, st = mmSt(), sh = st.sheet;
    if (t.hasAttribute && t.hasAttribute('data-mm-f') && st.draft) {
      st.draft[t.getAttribute('data-mm-f')] = t.value;
      if (t.getAttribute('data-mm-f') === 'recipeUrl') { var rl = document.getElementById('mmrlink'), u = mmSafeUrl(t.value); if (rl) rl.innerHTML = u ? mmLinkBtn(u) : ''; } else mmBar();
      return;
    }
    if (!sh) return;
    if (t.id === 'mmOut') { sh.budget = t.value; return; }
    if (t.id === 'mmQ') { sh.q = t.value; document.getElementById('mmPickList').innerHTML = mmPickList(); return; }
    if (t.id === 'mmName') { sh.f.name = t.value; if (!sh.key && sh.mode === 'meal' && !sh.picked) { var g = mmGuess(t.value); sh.f.emoji = g; var b = document.querySelector('[data-mm-emotoggle]'); if (b) b.textContent = g; } return; }
    if (t.id === 'mmPrice') { sh.f.price = t.value; if (t.value !== '' && sh.f.alreadyHave) { sh.f.alreadyHave = false; var h = document.querySelector('[data-mm-have]'); if (h) h.setAttribute('aria-pressed', 'false'); } mmCalcLive(); return; }
    if (t.id === 'mmPkg') { sh.f.packageAmount = t.value; mmCalcLive(); return; }
    if (t.id === 'mmUses') { sh.f.amountUsed = t.value; mmCalcLive(); return; }
  });
  // ---------- the 30-Day Challenge (Level 1): 5 small things every day for 30 days; miss a day and it's back to Day 1 ----------
  // The daily checklist is for everyone: P.daily = { iso: { logged, noSpend, balUpdated, balancesConfirmed, noNewDebt, noEatingOut,
  //   lessonDone, lessonRef, gratitude, done } } (rules in daily.js). The challenge reads the same days:
  // P.challenge = { status: notStarted | active | restart | completed, level: 1, startDate, attempts, longestStreak, totalDaysCompleted, completedAt }
  // 'restart' is the calm stop between a missed day and "Start again". Only today can be checked off; past days stay as they were.
  // The challenge lessons live in challenge-lessons.js (placeholders until the real ones are in).
  var D = window.FMTMDaily;
  var CH_NAME = '30-Day Challenge', CH_DAYS = 30;
  var CH_TASKS = D.ITEMS;
  function chS() { var c = P.challenge || (P.challenge = { status: 'notStarted', level: 1, startDate: null, attempts: 0, longestStreak: 0, totalDaysCompleted: 0, completedAt: null }); return c; }
  function chToday() { return F.isoDay(today()); }
  function chRec(iso, make) { P.daily = P.daily || {}; if (make && !P.daily[iso]) P.daily[iso] = {}; return P.daily[iso] || {}; }
  function chCanEdit() { return D.canEdit(P, chToday(), chToday()); }
  // purchases saved today and dated today check off half of task 1
  function markLogged(dates) { var td = chToday(); if (dates.indexOf(td) >= 0 && chCanEdit() && !chRec(td).logged) { chRec(td, true).logged = true; track('daily-item'); } }
  // today's lesson: the challenge's lesson for the day; otherwise the next unread lesson in lessons.json, then the challenge lessons
  function lessonRefInfo(ref) {
    if (ref.indexOf('ch:') === 0) { var n = +ref.slice(3), L = chLesson(n); return { ref: ref, title: L.title, minutes: L.minutes || 5, a: 'chlesson', v: String(n) }; }
    var id = ref.slice(2), l = lessonFor(id) || { title: 'Lesson' }; return { ref: ref, title: l.title, minutes: 5, a: 'lessonopen', v: id };
  }
  function dailyLesson() {
    var td = chToday(), r = chRec(td);
    if (r.lessonRef) return lessonRefInfo(r.lessonRef);
    if (chLive()) return lessonRefInfo('ch:' + chDayN(td));
    var ids = LESSONS ? Object.keys(LESSONS).filter(function (k) { return LESSONS[k].chapter !== 'quiz'; }) : CUSHION_LESSONS.concat(SNOWBALL_LESSONS).map(function (x) { return x[0]; });
    var next = ids.filter(function (id) { return !lessonDone(id); })[0];
    return lessonRefInfo(next ? 'L:' + next : 'ch:' + ((P.chLessonsRead || 0) % CH_DAYS + 1));
  }
  function markLesson(ref) {
    if (!chCanEdit()) return false; var r = chRec(chToday(), true); if (r.lessonDone) return false;
    r.lessonDone = true; r.lessonRef = ref; if (ref.indexOf('ch:') === 0 && !chLive()) P.chLessonsRead = (P.chLessonsRead || 0) + 1; track('daily-item'); return true;
  }
  function chDayN(iso) { var c = chS(); return c.startDate ? F.daysBetween(F.fromIso(c.startDate), F.fromIso(iso || chToday())) + 1 : 0; }
  function chLive() { var c = chS(); return c.status === 'active' && !!c.startDate && c.startDate <= chToday(); }
  function chFirst() { var d = today(); return F.isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 1)); }
  function chDate(iso) { return F.fromIso(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function chLesson(n) { return (window.FMTM_CH_LESSONS || []).filter(function (x) { return x.day === n; })[0] || { day: n, title: 'Lesson ' + n + ' — coming soon', type: 'text', videoUrl: null, body: null, minutes: 5, placeholder: true }; }
  // a soft note only: a purchase in an eating-out kind of category, or a Meal Math "Eat out", that day
  function chEatOut(iso) {
    var lines = {}, re = /eat(ing)? out|restaurant|dining|take ?out|fast food|delivery/i; spendLines().forEach(function (l) { lines[l.key] = l.label; });
    return (P.spends || []).some(function (s) { return s.date === iso && re.test(lines[s.key] || ''); }) || mmPlan().some(function (e) { return e.date === iso && e.type === 'eatOut'; });
  }
  function chTasks(iso) { return D.tasks(P, iso); }
  // runs before every draw: in a challenge, a day left undone stops the run; for everyone, a day with all 5 done is a full day
  function chCheck() {
    if (!P.setupDone) return;
    var c = P.challenge, td = chToday();
    if (c && c.status === 'active' && c.startDate && c.startDate < td) {
      var rc = D.runCheck(P, c.startDate, td);
      if (rc.missed) {
        c.status = 'restart'; c.reached = rc.reached; c.missed = rc.missed; c.longestStreak = Math.max(c.longestStreak || 0, rc.reached);
        U.chRestartShown = false; track('challenge-restart-day-' + rc.reached); save(); return;
      }
    }
    var r = chRec(td);
    if (r.done || !D.full(P, td)) return;
    chRec(td, true).done = true; track('daily-full');
    if (chLive()) {
      var n = chDayN(td); c.totalDaysCompleted = (c.totalDaysCompleted || 0) + 1; c.longestStreak = Math.max(c.longestStreak || 0, n);
      track('challenge-day-complete-' + n);
      if (n >= CH_DAYS) { c.status = 'completed'; c.completedAt = td; track('challenge-complete'); }
      else setTimeout(function () { mmToast('✅ Day ' + n + ' done · ' + (CH_DAYS - n) + ' to go'); }, 30);
    } else setTimeout(function () { mmToast('✅ All 5 done. That’s a full day.'); }, 30);
    save();
  }
  // a day can roll over while the app is open
  var chDayNow = null;
  setInterval(function () { var d = F.isoDay(today()); if (chDayNow && d !== chDayNow && P.setupDone) render(); chDayNow = d; }, 60000);
  function chStart(when) {
    // moving a start that hasn't come yet isn't a new attempt
    var c = chS(), moving = c.status === 'active' && c.startDate > chToday();
    c.status = 'active'; c.level = 1; c.startDate = when === 'first' ? chFirst() : chToday(); if (!moving) c.attempts = (c.attempts || 0) + 1;
    c.reached = null; c.missed = null; c.completedAt = null; U.chQuit = false;
    // starting is a good moment to offer the evening nudge (once per start)
    U.chRemAsk = !!CONFIG.oneSignalAppId && !(P.remind && P.remind.on && P.remind.challenge !== false);
    save();
  }
  function chRemAsk() {
    if (!U.chRemAsk) return '';
    return '<div class="card chrem"><b>🌙 Want a nudge at 8 pm if today isn’t done?</b>' + (U.remErr ? '<small class="chnote">' + esc(U.remErr) + '</small>' : '') +
      '<div class="chbtns"><button type="button" class="chmini gold" data-a="chremyes">Yes</button><button type="button" class="chmini" data-a="chremno">Not now</button></div></div>';
  }
  function chStats() {
    var c = chS(), k = D.counts(P);
    return { attempts: c.attempts || 0, longest: c.longestStreak || 0, total: c.totalDaysCompleted || 0, lessons: k.lessons, grateful: k.grateful, full: k.full };
  }
  function chStatRow() {
    var s = chStats();
    return '<div class="chstats"><div><b>' + s.longest + '</b><small>longest run</small></div><div><b>' + s.total + '</b><small>days done</small></div><div><b>' + s.attempts + '</b><small>' + (s.attempts === 1 ? 'attempt' : 'attempts') + '</small></div></div>';
  }
  // the card on Home: today's 5 tasks as chips, and a ring that fills as they get done. In the challenge it's "Day 12 of 30";
  // otherwise it's "Today", with an offer to make it a challenge
  function chChips(t, locked) {
    return '<div class="chchips">' + CH_TASKS.map(function (x) {
      var on = t[x[0]], act = x[0] === 'debt' ? 'chdebt' : x[0] === 'eat' ? 'cheat' : 'chopen';
      return '<button type="button" class="chchip' + (on ? ' on' : '') + '" data-a="' + act + '" data-v="' + x[0] + '" aria-pressed="' + on + '" aria-label="' + esc(x[2]) + '"' + (locked && act !== 'chopen' ? ' disabled' : '') + '><span>' + x[1] + '</span>' + (on ? '<i aria-hidden="true">✓</i>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function chHome() {
    var c = chS(), td = chToday();
    if (!P.setupDone) return '';
    if (c.status === 'restart') return '<div class="card chhome stack"><b>🌱 ' + (c.reached ? 'You showed up ' + plural(c.reached, 'day') + ' in a row. That counts.' : 'A fresh start.') + '</b><small>Day 1 starts today.</small><button type="button" class="primary" data-a="chagain">Start again</button></div>';
    var t = chTasks(td), locked = !chCanEdit(), live = chLive();
    var top = live ? '<b>Day ' + chDayN(td) + ' of ' + CH_DAYS + '</b><small>' + (t.n === 5 ? '✅ Done for today' : plural(5 - t.n, 'task') + ' left today') + '</small>'
      : '<b>Today</b><small>' + (t.n === 5 ? '✅ All 5 done. That’s a full day.' : t.n + ' of 5') + '</small>';
    var foot = live ? '' : c.status === 'active' ? '<div class="chmake"><span>🔥 Your challenge starts ' + chDate(c.startDate) + '.</span></div>'
      : c.status === 'completed' ? '<div class="chmake"><span>🏆 ' + CH_NAME + ' done</span><button type="button" class="chmini" data-a="go" data-v="journey">See it</button></div>'
      : '<div class="chmake"><span>Make it a challenge: 30 days, all 5 every day.</span><button type="button" class="chmini gold" data-a="chintro">Start</button></div>';
    return '<div class="card chhome"><button type="button" class="chtop" data-a="go" data-v="journey"><span class="chring" style="--p:' + (t.n / 5 * 100) + '"><b>' + t.n + '/5</b></span><span>' + top + '</span><i aria-hidden="true">›</i></button>' +
      chChips(t, locked) + foot + '</div>';
  }
  function chDots() {
    var c = chS(), td = chToday(), out = '';
    for (var i = 0; i < CH_DAYS; i++) { var iso = mmAdd(c.startDate, i); out += '<i class="' + (iso <= td && D.full(P, iso) ? 'on' : iso === td ? 'now' : '') + '"></i>'; }
    return '<div class="chdots" role="img" aria-label="' + chStats().total + ' days done">' + out + '</div>';
  }
  function chTaskRow(key, on, body) {
    var x = CH_TASKS.filter(function (t) { return t[0] === key; })[0];
    return '<div class="chtask' + (on ? ' on' : '') + '"><span class="chbox" aria-hidden="true">' + (on ? '✓' : '') + '</span><div class="chtb"><b>' + x[1] + ' ' + x[2] + '</b>' + body + '</div></div>';
  }
  function chToggle(act, on, text, locked) { return '<button type="button" class="chtgl' + (on ? ' on' : '') + '" role="checkbox" aria-checked="' + on + '" data-a="' + act + '"' + (locked ? ' disabled' : '') + '><span class="chcb" aria-hidden="true">' + (on ? '✓' : '') + '</span>' + text + '</button>'; }
  function chToday5() {
    var td = chToday(), t = chTasks(td), r = chRec(td), live = chLive(), n = chDayN(td), L = dailyLesson(), lock = !chCanEdit(), g = String(r.gratitude || '');
    var log = '<div class="chsub"><span>' + (t.spent ? '✓ Purchases logged' : r.noSpend ? '✓ No spend today' : 'Purchases') + '</span>' +
        (t.spent ? '' : '<span class="chbtns">' + (r.noSpend ? '' : '<button type="button" class="chmini" data-a="scan">🧾 Add purchases</button>') + (lock ? '' : '<button type="button" class="chmini' + (r.noSpend ? ' on' : '') + '" data-a="chnospend">' + (r.noSpend ? 'Undo' : 'No spend today') + '</button>') + '</span>') + '</div>' +
      '<div class="chsub"><span>' + (r.balUpdated ? '✓ Balances updated' : r.balancesConfirmed ? '✓ Balances still right' : 'Balances') + '</span>' +
        (r.balUpdated ? '' : '<span class="chbtns">' + (r.balancesConfirmed ? '' : '<button type="button" class="chmini" data-a="sheetopen" data-v="bal">💰 Update</button>') + (lock ? '' : '<button type="button" class="chmini' + (r.balancesConfirmed ? ' on' : '') + '" data-a="chbalok">' + (r.balancesConfirmed ? 'Undo' : 'Balances still right ✓') + '</button>') + '</span>') + '</div>';
    var grat = g.trim() && !U.chGEdit
      ? '<p class="chquote">“' + esc(g) + '”</p><span class="chbtns">' + (lock ? '' : '<button type="button" class="chmini" data-a="chgedit">Edit</button>') + (CONFIG.communityUrl ? '<button type="button" class="chmini" data-a="chgpost">📣 Post it in the community</button>' : '') + '</span>'
      : '<textarea id="chGrat" class="chgrat" maxlength="280" rows="2" placeholder="Today I’m grateful for…" aria-label="One thing you’re grateful for">' + esc(g) + '</textarea><button type="button" class="chmini gold" data-a="chgsave">Save</button>';
    return '<div class="chtasks">' +
      chTaskRow('log', t.log, log) +
      chTaskRow('debt', t.debt, chToggle('chdebt', t.debt, 'I didn’t put anything on a credit card or buy-now-pay-later today.', lock)) +
      chTaskRow('eat', t.eat, chToggle('cheat', t.eat, 'I didn’t spend money eating out today.', lock) + (chEatOut(td) ? '<p class="chnote">You logged eating out today — does that break today’s rule?</p>' : '')) +
      chTaskRow('lesson', t.lesson, '<button type="button" class="chlink" data-a="' + L.a + '" data-v="' + esc(L.v) + '">' + (t.lesson ? '✓ ' : live ? 'Day ' + n + ' · ' : '') + esc(L.title) + ' · ' + L.minutes + ' min <span aria-hidden="true">›</span></button>') +
      chTaskRow('grat', t.grat, grat) + '</div>' +
      (r.done ? '<div class="chdone">' + confetti(14, 0) + (live ? '<b>✅ Day ' + n + ' done</b>' + (n < CH_DAYS ? '<small>Tomorrow: ' + esc(chLesson(n + 1).title) + '</small>' : '') : '<b>✅ All 5 done</b><small>That’s a full day.</small>') + '</div>' : '');
  }
  function chLinks(quit) {
    var g = chStats().grateful;
    return '<div class="card chlinks">' + (g ? '<button type="button" class="linkrow" data-a="go" data-v="chjournal"><span>🙏 Gratitude journal</span><small>' + g + '</small><i aria-hidden="true">›</i></button>' : '') +
      '<button type="button" class="linkrow chms" data-a="jtab" data-v="milestones"><span>🏅 Milestones</span><small>' + Object.keys(P.badges || {}).filter(function (k) { return BADGES.some(function (b) { return b.id === k; }); }).length + '</small><i aria-hidden="true">›</i></button>' +
      (quit ? '<button type="button" class="linkrow chquit" data-a="ch30quit"><span>' + (U.chQuit ? 'Tap again to quit' : 'Quit challenge') + '</span></button>' : '') + '</div>';
  }
  function chIntro() {
    var first = chFirst();
    return '<div class="chintro" id="chintro"><div class="eyebrow">Make it a challenge</div><h3>' + CH_NAME + '</h3><p class="chlead">All 5, every day, for 30 days.</p>' +
      '<div class="card chlist">' + CH_TASKS.map(function (x) { return '<div><span>' + x[1] + '</span>' + x[2] + '</div>'; }).join('') + '</div>' +
      '<p class="chrule">Miss one and you’re back to Day 1 — not back to zero. Your stats stay.</p>' +
      '<div class="chstart"><button type="button" class="primary" data-a="ch30start" data-v="today">Start today</button><button type="button" class="outline" data-a="ch30start" data-v="first">Start ' + chDate(first) + '</button></div></div>';
  }
  function chScreen() {
    var c = chS(), td = chToday(), head = function (title, sub, eb) { return '<div class="chhead">' + mmGear() + '<div class="eyebrow">' + (eb || CH_NAME + ' · Level ' + (c.level || 1)) + '</div><h2>' + title + '</h2>' + (sub || '') + '</div>'; };
    var todayHead = function () { var t = chTasks(td); return head('Today', '<div class="chmeta"><span>' + chDate(td) + '</span><span>' + t.n + ' of 5</span></div>', 'Your 5 a day'); };
    if (c.status === 'restart') {
      return head(c.reached ? 'You showed up ' + plural(c.reached, 'day') + ' in a row.' : 'A fresh start.', '<p class="chlead">' + (c.reached ? 'That counts. ' : '') + 'Day 1 starts today.</p>') +
        '<button type="button" class="primary" data-a="chagain">Start again</button>' + chStatRow() + chLinks(false);
    }
    if (c.status === 'completed') {
      return head('30 days. Done.', '<div class="chfinish">' + confetti(26, 0) + '<span class="chtrophy">🏆</span><b>Level 1 complete</b></div>') +
        '<div class="chstats"><div><b>30</b><small>days in a row</small></div><div><b>30</b><small>lessons</small></div><div><b>30</b><small>things you were grateful for</small></div></div>' +
        '<div class="chstart"><button type="button" class="primary" data-a="chshare">' + ICON.share + ' Share it</button>' + (CONFIG.communityUrl ? '<button type="button" class="outline" data-a="chpost">📣 Post it in the community</button>' : '') + '</div>' +
        '<button type="button" class="textbtn" data-a="chagain">Do it again</button><div class="chsec">Today</div>' + chToday5() + chLinks(false);
    }
    // not in a challenge: today's 5 for everyone, then the offer to make it a challenge
    if (c.status !== 'active') return todayHead() + chToday5() + chIntro() + chLinks(false);
    if (c.startDate > td) return todayHead() + chToday5() +
      '<div class="chintro"><div class="eyebrow">' + CH_NAME + '</div><h3>Starts ' + chDate(c.startDate) + '</h3><p class="chlead">Day 30 is ' + chDate(mmAdd(c.startDate, CH_DAYS - 1)) + '.</p>' +
      '<button type="button" class="outline" data-a="ch30start" data-v="today">Start today instead</button></div>' + chRemAsk() + chLinks(true);
    var n = chDayN(td);
    return head('Day ' + n + ' of ' + CH_DAYS, chDots() + '<div class="chmeta"><span>' + (CH_DAYS - n) + ' to go</span><span>Ends ' + chDate(mmAdd(c.startDate, CH_DAYS - 1)) + '</span></div>') + chRemAsk() + chToday5() + chStatRow() + chLinks(true);
  }
  function chLessonScreen() {
    var n = U.chLessonN || chDayN() || 1, L = chLesson(n), dl = dailyLesson(), isToday = chCanEdit() && dl.ref === 'ch:' + n, done = isToday && !!chRec(chToday()).lessonDone;
    var isFile = L.videoUrl && /\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(L.videoUrl), safe = L.videoUrl ? mmSafeUrl(L.videoUrl) : '';
    var media = L.type === 'video' && safe ? (isFile ? '<video id="chvid" class="chvideo" src="' + esc(safe) + '" controls playsinline preload="metadata"></video>' : '<iframe class="chvideo" src="' + esc(safe) + '" title="' + esc(L.title) + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>') : '';
    var body = L.body ? String(L.body).split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') : (L.placeholder || !media ? '<div class="note">' + ICON.info + '<span>Lesson coming soon. Tap “I read it” to check it off for now.</span></div>' : '');
    var btn = !isToday ? '' : done ? '<div class="chdone"><b>✓ Lesson done</b></div>' : media && isFile ? '<p class="chrule">Checks off when the video ends.</p>' : '<button type="button" class="primary" data-a="chread">' + (media ? 'I watched it' : 'I read it') + '</button>';
    return back('journey') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + (chLive() ? 'Day ' : 'Lesson ') + n + ' · ' + (L.minutes || 5) + ' minutes</div><h2>' + esc(L.title) + '</h2></div>' + media + '<div class="chbody">' + body + '</div>' + btn;
  }
  function chJournal() {
    var dd = P.daily || {}, days = Object.keys(dd).filter(function (k) { return String(dd[k].gratitude || '').trim(); }).sort().reverse();
    return back('journey') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + plural(days.length, 'entry') + '</div><h2>🙏 Gratitude journal</h2></div>' +
      '<div class="card chjournal">' + (days.length ? days.map(function (k) { return '<div class="row"><div><small>' + chDate(k) + '</small><span>' + esc(dd[k].gratitude) + '</span></div></div>'; }).join('') : '<div class="row"><span>Nothing yet.</span></div>') + '</div>';
  }
  // after a lesson video draws: it checks itself off when it plays to the end
  function chAfter() {
    var v = document.getElementById('chvid'); if (!v || v.chHooked) return; v.chHooked = true;
    v.addEventListener('ended', function () { var n = U.chLessonN || chDayN() || 1; if (dailyLesson().ref === 'ch:' + n && markLesson('ch:' + n)) { save(); mmToast('🎧 Lesson done'); go('journey'); } });
  }
  // copy the text, then open the community to paste it (Skool has no way to post from another site)
  function chPost(text, ev) { mmCopy(text, ev); if (CONFIG.communityUrl) window.open(CONFIG.communityUrl, '_blank', 'noopener'); }
  // finished challenges (the 30-Day Challenge, and the older small ones) stay on the Milestones screen
  function finishedChallenges() {
    var c = chS(), old = (P.challenges || []).filter(function (x) { return x.ended === 'done' && F.challengeDef(x.id); }).slice().reverse();
    if (!old.length && !c.completedAt) return '';
    var row = function (title, when, act, v) { return '<div class="row"><div style="min-width:0">' + esc(title) + '<small>Completed ' + dayMonth(F.fromIso(when)) + '</small></div><button type="button" class="textbtn" style="min-height:36px;padding:0 4px" data-a="' + act + '" data-v="' + esc(v) + '">' + ICON.share + ' Share</button></div>'; };
    return '<div class="card"><div class="row"><b>Finished challenges</b><span></span></div>' + (c.completedAt ? row(CH_NAME + ' · Level 1', c.completedAt, 'chshare', '') : '') +
      old.map(function (x) { return row(F.challengeDef(x.id).title, x.endedOn, 'sharech', x.uid); }).join('') + '</div>';
  }
  function ch30Card() {
    return { eyebrow: CH_NAME + ' · Level 1', title: '30 days in a row', sub: '30 lessons, 30 things I was grateful for, and no new debt.', chips: ['Level 1 complete'], caption: 'I finished the ' + CH_NAME + '! 30 days in a row.' };
  }

  // ---------- the guided tour: once per page, a spotlight on each feature with one short line ----------
  // Seen pages are kept on this phone (fmtm.tour), not in the plan, so a spouse sharing the budget gets their own.
  var TOUR_KEY = 'fmtm.tour';
  function tourSeen() { try { return JSON.parse(localStorage.getItem(TOUR_KEY) || '{}'); } catch (e) { return {}; } }
  function tourMark(k) { try { var t = tourSeen(); t[k] = F.isoDay(today()); localStorage.setItem(TOUR_KEY, JSON.stringify(t)); } catch (e) {} }
  // a Budget section or a card, found by its heading
  // a section is its heading plus everything under it up to the next heading
  function bySec(title) {
    return function () {
      var b = Array.prototype.filter.call(app.querySelectorAll('.bud-sec b'), function (x) { return x.textContent === title; })[0], h = b && b.closest('.bud-sec'); if (!h) return null;
      var span = [h]; for (var n = h.nextElementSibling; n && !n.classList.contains('bud-sec') && !n.classList.contains('tabbar'); n = n.nextElementSibling) { span.push(n); if (n.classList.contains('outline')) break; }
      h.tourSpan = span; return h;
    };
  }
  function tourRect(el) {
    var list = el.tourSpan || [el], r = { top: 1e9, left: 1e9, right: -1e9, bottom: -1e9 };
    list.forEach(function (x) { var q = x.getBoundingClientRect(); if (!q.height) return; r.top = Math.min(r.top, q.top); r.left = Math.min(r.left, q.left); r.right = Math.max(r.right, q.right); r.bottom = Math.max(r.bottom, q.bottom); });
    r.width = r.right - r.left; r.height = r.bottom - r.top; return r;
  }
  function byCard(title) { return function () { var b = Array.prototype.filter.call(app.querySelectorAll('.card b, .card .eyebrow'), function (x) { return x.textContent === title; })[0]; return b && b.closest('.card'); }; }
  function budTab(t) { return function () { if (U.bTab !== t) { U.bTab = t; render(); } }; }
  // [where, title, one line, what to switch to first]
  var TOUR = {
    home: [
      ['.hero', 'Your next goal', 'How much is left on the step you’re on. It fills as you save and pay down debt.'],
      ['.chhome', '30-Day Challenge', 'Today’s tasks at a glance. Tap to open the challenge.'],
      [function () { return null; }, 'Your challenge', 'A challenge you started. Log your progress right here.'],
      ['.recaprow', 'Weekly recap', 'Your week at a glance: spending, balances and meals at home.'],
      ['.cal', 'Your month', 'Paydays, bills coming up and your wins. Tap a day to see it.'],
      ['.commcard', 'Your community', 'Free help from people on the same path, or a coach. Tap one to see more.'],
      ['.fab', 'Add anything', 'Add purchases, update balances or set a goal.']
    ],
    plan: [
      ['.inc-card', 'This month’s money', 'Your pay this month and what still needs a job. Tap Edit to change your income.', budTab('spend')],
      ['.bud-tabs', 'Three tabs', 'Spending, Saving and Debt. Everything about your money lives here.'],
      ['.bud-top', 'Left to spend', 'What’s left this month, and a safe amount for each day.'],
      [bySec('Spending'), 'Spending categories', 'Tap a card to change its amount, name, color or type.'],
      [bySec('Recurring expenses'), 'Recurring expenses', 'Bills that repeat. They show on your calendar, and a fund can pay them.'],
      ['[data-a=sheetopen][data-v=bal]', 'Update balances', 'Type what your bank shows. Debt paid and money saved add up as you go.', budTab('save')],
      [bySec('Saving funds'), 'Saving funds', 'Set money aside each week for bills that come later, like car insurance.'],
      [bySec('Goals'), 'Goals', 'Save for something with a date. Each paycheck puts a little toward it.'],
      ['.bud-top', 'Your debt', 'What’s left and how much you’ve paid off.', budTab('debt')],
      [bySec('Smallest first'), 'Smallest first', 'Pay the smallest debt first, then roll that payment into the next one.']
    ],
    journey: [
      ['.chhead', '30-Day Challenge', 'Five small money habits a day for 30 days. Miss a day and you’re back to Day 1, not zero.'],
      ['.chtasks', 'Today’s 5 tasks', 'Check each one off before midnight.'],
      ['.chms', 'Milestones', 'Your wins and goals live here now.']
    ],
    meals: [
      ['.mm-seg', 'Week, meals and list', 'Plan the week, price out the meals you cook, and shop from your grocery list.'],
      ['.mm-strip', 'This week', 'Meals at home, what eating at home saved, and meals out.'],
      ['.mm-day', 'Plan a day', 'Tap a meal slot to pick a meal, leftovers or eating out.'],
      ['.gearbtn', 'Settings', 'Your account, reminders and data live here now.']
    ],
    settings: [
      [byCard('Reminders'), 'Reminders', 'A short note the day before a bill is due.'],
      ['.linkrow[data-v=install]', 'Home Screen', 'Add the app to your Home Screen so it’s one tap away.'],
      [byCard('Your data'), 'Your data', 'Save a backup, bring a plan over, or start fresh.']
    ]
  };
  var tourNow = null;
  // a step shows on the tab set by the nearest switch at or before it (so Back lands on the right Budget tab)
  function tourTab(steps, k) { for (var j = k; j >= 0; j--) if (steps[j][3]) { steps[j][3](); return; } }
  function tourFind(sel) {
    var el = typeof sel === 'function' ? sel() : app.querySelector(sel) || document.querySelector(sel);
    return el && el.getBoundingClientRect().height > 0 ? el : null;
  }
  function tourStart(page) {
    if (!TOUR[page] || tourNow) return;
    // which steps this person's page has (checked on every Budget tab before anything shows, so the count holds steady)
    var steps = TOUR[page], avail = [];
    steps.forEach(function (x, k) { tourTab(steps, k); if (tourFind(x[0])) avail.push(k); });
    if (!avail.length) { tourMark(page); return; }
    tourNow = { page: page, avail: avail, pos: -1 }; track('tour-' + page + '-start'); tourStep(1);
  }
  function tourEnd(how) {
    var t = tourNow; if (!t) return; tourNow = null; tourMark(t.page); track('tour-' + t.page + '-' + how);
    var el = document.getElementById('tour'); if (el) el.remove(); document.removeEventListener('keydown', tourKey);
    if (t.page === 'plan' && U.screen === 'plan' && U.bTab !== 'spend') { U.bTab = 'spend'; render(); }
    window.scrollTo(0, 0);
  }
  function tourKey(e) { if (!tourNow) return; if (e.key === 'Escape') tourEnd('skip'); else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); tourStep(1); } else if (e.key === 'ArrowLeft') tourStep(-1); }
  function tourStep(dir) {
    var t = tourNow; if (!t) return;
    // only the steps this person's page has (no challenge running, reminders not set up, ...)
    var steps = TOUR[t.page], pos = t.pos + dir;
    if (pos < 0) return;
    if (pos >= t.avail.length) { tourEnd('done'); return; }
    var i = t.avail[pos]; tourTab(steps, i);
    var el = tourFind(steps[i][0]); if (!el) { t.pos = pos; tourStep(dir); return; }
    t.pos = pos;
    var root = document.getElementById('tour');
    if (!root) {
      root = document.createElement('div'); root.id = 'tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Tour');
      root.innerHTML = '<div class="tour-spot" aria-hidden="true"></div><div class="tour-card"><small class="tour-n"></small><b class="tour-t"></b><p class="tour-p"></p><div class="tour-btns"><button type="button" class="tour-skip">Skip</button><span><button type="button" class="tour-back" aria-label="Back">‹</button><button type="button" class="tour-next">Next</button></span></div></div>';
      document.body.appendChild(root);
      root.querySelector('.tour-skip').onclick = function () { tourEnd('skip'); };
      root.querySelector('.tour-next').onclick = function () { tourStep(1); };
      root.querySelector('.tour-back').onclick = function () { tourStep(-1); };
      document.addEventListener('keydown', tourKey);
    }
    var last = pos === t.avail.length - 1;
    root.querySelector('.tour-n').textContent = (pos + 1) + ' of ' + t.avail.length;
    root.querySelector('.tour-t').textContent = steps[i][1];
    root.querySelector('.tour-p').textContent = steps[i][2];
    root.querySelector('.tour-next').textContent = last ? 'Done' : 'Next';
    root.querySelector('.tour-back').style.visibility = pos > 0 ? 'visible' : 'hidden';
    // bring the feature into view, then the spotlight on it and the card above or below
    var fixed = !!el.closest('.tabbar');
    if (!fixed) { var r0 = tourRect(el), room = window.innerHeight - 250; window.scrollTo(0, Math.max(0, window.scrollY + r0.top - (r0.height < room ? Math.max(70, (room - r0.height) / 2) : 70))); }
    t.el = el; tourPlace(el);
    root.querySelector('.tour-next').focus({ preventScroll: true });
  }
  function tourPlace(el) {
    var root = document.getElementById('tour'); if (!root || !el) return;
    var r = tourRect(el), pad = 8, spot = root.querySelector('.tour-spot'), card = root.querySelector('.tour-card'), round = el.classList.contains('fab');
    var ch0 = card.offsetHeight || 190, top = Math.max(6, r.top - pad), h = Math.min(r.height + pad * 2, window.innerHeight - 12);
    // a tall section: light up its top part and leave room for the card under it
    if (top + h + 12 + ch0 > window.innerHeight - 8 && top - 12 - ch0 < 8) h = Math.max(80, window.innerHeight - 8 - ch0 - 12 - top);
    spot.style.cssText = 'top:' + top + 'px;left:' + Math.max(6, r.left - pad) + 'px;width:' + Math.min(r.width + pad * 2, window.innerWidth - 12) + 'px;height:' + h + 'px;border-radius:' + (round ? '50%' : '22px');
    var ch = card.offsetHeight || 150, below = top + h + 12, above = top - 12 - ch;
    card.style.top = (below + ch <= window.innerHeight - 8 ? below : above >= 8 ? above : Math.max(8, window.innerHeight - ch - 8)) + 'px';
  }
  window.addEventListener('resize', function () { if (tourNow && tourNow.el) tourPlace(tourNow.el); });
  window.addEventListener('scroll', function () { if (tourNow && tourNow.el) tourPlace(tourNow.el); }, { passive: true });
  // after a page draws: its tour the first time it's seen
  function tourMaybe() {
    if (tourNow || !P.setupDone || U.sheet || U.plusOpen || U.coachTest != null) return;
    var page = U.screen; if (!TOUR[page] || tourSeen()[page]) return;
    if (page === 'journey' && U.jTab === 'milestones') return;
    setTimeout(function () { if (U.screen === page && !tourNow && !tourSeen()[page] && !U.sheet && !U.plusOpen) tourStart(page); }, 450);
  }
  // ---------- the front page: first open only, before the intro ----------
  // Three app screens drawn at phone size (375 x 812) and scaled into a CSS iPhone. Demo numbers:
  // $2,100 twice a month = $4,200; 4,200 - 2,610 - 748 = $842 a month, $10,104 a year, $421 a payday.
  var WF_CAPS = [['Find it', 'See the money you didn’t know you had', 'Four numbers and you’ll know what you can take back each month.'],
    ['Plan it', 'Give every dollar a job', 'Know what’s safe to spend today, all the way to payday.'],
    ['Live it', 'Five small things a day', 'Log it, skip new debt, learn a little, and watch your days fill in.']];
  function wfGauge(lit, big) {
    var out = '';
    for (var i = 0; i < 22; i++) { var a = Math.PI - i / 21 * Math.PI; out += '<line x1="' + (110 + 74 * Math.cos(a)).toFixed(1) + '" y1="' + (104 - 74 * Math.sin(a)).toFixed(1) + '" x2="' + (110 + 96 * Math.cos(a)).toFixed(1) + '" y2="' + (104 - 96 * Math.sin(a)).toFixed(1) + '"' + (i < lit ? ' class="on"' : '') + '/>'; }
    return '<svg class="wf-gauge' + (big ? ' big' : '') + '" viewBox="0 0 220 112" aria-hidden="true">' + out + '</svg>';
  }
  function wfTabs(on) {
    var ic = { Home: '<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/>', Budget: '<path d="M4 7a2 2 0 012-2h11v4"/><path d="M4 7v11a2 2 0 002 2h13a1 1 0 001-1V10a1 1 0 00-1-1H6a2 2 0 01-2-2z"/>',
      Challenge: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', Meals: '<path d="M4 6h16M4 12h16M4 18h16"/>', Settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>' };
    var svg = function (d, w) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 2) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>'; };
    return '<div class="wf-tabs">' + ['Home', 'Budget', '', 'Challenge', 'Meals'].map(function (t) {
      return t ? '<div' + (t === on ? ' class="on"' : '') + '>' + svg(ic[t]) + '<span>' + t + '</span></div>' : '<div class="wf-fab">' + svg('<path d="M12 5v14M5 12h14"/>', 2.6) + '</div>';
    }).join('') + '</div>';
  }
  function wfSlides() {
    var arrow = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#141414" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    var check = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#141414" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var cols = ['#FFC97E', '#FFAD8C', '#7ED9C0', '#9A8BD3', '#2A6B66', '#FF9F7A'];
    var conf = [[208, 8, 20], [236, 30, -35], [262, 4, 60], [290, 40, 15], [318, 18, -20], [340, 58, 45], [300, 92, -60], [330, 118, 25], [268, 132, -15], [226, 112, 70], [196, 60, -40], [352, 150, 10], [248, 74, 35], [284, 160, -50], [214, 150, 20], [322, 84, -30]].map(function (c, i) {
      return '<i style="left:' + c[0] + 'px;top:' + c[1] + 'px;transform:rotate(' + c[2] + 'deg);background:' + cols[i % cols.length] + '"></i>'; }).join('');
    var reveal = '<div class="wf-back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F4F3EF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></div>' +
      '<div class="wf-conf">' + conf + '</div>' +
      '<div class="wf-rv"><div class="wf-mut" style="font-size:17px">Maya, we found</div><div class="wf-big">$842<small>a month</small></div>' +
      '<div class="wf-yr">That’s <span class="wf-hi">$10,104</span> a year.</div><div class="wf-eq">$4,200 − $2,610 bills − $748 debt payments = $842/mo</div>' +
      '<div style="font-size:18px;line-height:1.35">Plus <b class="wf-hi">$748/mo</b> more once you’re debt-free.</div></div>' +
      '<div class="wf-rvb"><div class="wf-btn"><span>Reclaim my money</span>' + arrow + '</div><div class="wf-hi" style="font-weight:700;font-size:16px">Join the free community →</div></div>';
    var budget = '<div class="wf-bh"><b>Budget</b><div class="wf-mo"><i>‹</i>November 2026<i>›</i></div></div>' +
      '<div class="wf-card wf-inc"><div class="wf-edit">Edit</div><div class="wf-mut" style="font-size:15px">Income for November</div><div class="wf-amt">$4,200</div><div class="wf-mut" style="font-size:13px">2 paychecks</div>' +
      '<div class="wf-ltb"><span>Left to budget</span><b>$842</b></div><div class="wf-leg"><span style="--c:#7ED9C0">Needs $2,610</span><span style="--c:#FFAD8C">Debt $748</span></div></div>' +
      '<div class="wf-seg"><div class="on">Spending</div><div>Saving</div><div>Debt</div></div>' +
      '<div class="wf-card wf-spend"><div class="wf-ok">On track</div><div class="wf-gw">' + wfGauge(12) + '<div class="wf-gm"><div class="wf-mut" style="font-size:15px">Left to spend</div><div class="wf-v">$1,370.00</div></div></div>' +
      '<div class="wf-safe"><b>$91.33/day</b> safe to spend · 15 days left</div></div>' + wfTabs('Budget');
    // screen 3: Home's Today card and the activity calendar (Sun Nov 16, 2026; paydays Nov 6 and 20)
    var full = [1, 2, 3, 5, 6, 7, 9, 10, 12, 13, 14], some = [4, 8, 11, 15], cal = '';
    for (var dn = 1; dn <= 30; dn++) cal += '<span class="' + (full.indexOf(dn) >= 0 ? 'f' : some.indexOf(dn) >= 0 ? 's' : '') + (dn === 6 || dn === 20 ? ' p' : '') + (dn === 16 ? ' t' : '') + '">' + dn + '</span>';
    var task = function (ic, t, on) { return '<div class="wf-tsk"><i class="' + (on ? 'y' : '') + '">' + (on ? check : '') + '</i><span class="' + (on ? 'done' : '') + '">' + ic + ' ' + t + '</span></div>'; };
    var journey = '<div class="wf-card wf-today"><div class="wf-th"><b>Today</b><span>3 of 5</span></div>' +
      task('🧾', 'Log purchases', true) + task('💳', 'No new debt', true) + task('🍽️', 'No eating out', true) + task('🎧', 'Today’s lesson', false) + task('🙏', 'One thing I’m grateful for', false) +
      '<div class="wf-mk"><span>Make it a challenge: 30 days, all 5 every day.</span><u>Start</u></div></div>' +
      '<div class="wf-card wf-act"><div class="wf-ah"><b>November 2026</b><span class="wf-mut">11 full days this month</span></div>' +
      '<div class="wf-cg">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<em>' + x + '</em>'; }).join('') + cal + '</div>' +
      '<div class="wf-lg"><span><i class="f"></i>All 5</span><span><i class="s"></i>Some</span><span><i class="p"></i>Payday</span></div></div>' + wfTabs('Home');
    var labels = ['1 of 3: Maya found $842 a month', '2 of 3: November budget, $1,370 left to spend', '3 of 3: Today, 3 of 5 done, 11 full days this month'];
    return [reveal, budget, journey].map(function (h, i) { return '<div class="wf-slide" role="group" aria-roledescription="slide" aria-label="' + labels[i] + '"><div class="wf-cv">' + h + '</div></div>'; }).join('');
  }
  function frontPage() {
    if (!U.frontSeen) { U.frontSeen = true; track('welcome-view'); }
    var bars = '<svg width="18" height="12" viewBox="0 0 18 12" fill="#F4F3EF"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>' +
      '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="#F4F3EF" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 4.2a9.6 9.6 0 0113 0M4 7a6 6 0 018 0"/><circle cx="8" cy="10" r="1.3" fill="#F4F3EF" stroke="none"/></svg>' +
      '<svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".5" y=".5" width="22" height="11" rx="3.2" stroke="#F4F3EF" opacity=".45"/><rect x="2.3" y="2.3" width="16" height="7.4" rx="1.8" fill="#F4F3EF"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="#F4F3EF" opacity=".45"/></svg>';
    var chev = function (d) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
    return '<div class="wf">' +
      '<section class="wf-copy"><div class="wf-brand"><img src="icons/icon.svg" alt="" width="30" height="30">Find Me the Money</div>' +
      '<h1>find the <span class="wf-hi">money</span> you didn’t know you had</h1>' +
      '</section>' +
      '<section class="wf-stage" aria-label="A look inside the app"><div class="wf-glow" aria-hidden="true"></div>' +
      '<div class="wf-phone"><div class="wf-screen"><div class="wf-track" tabindex="0" aria-roledescription="carousel" aria-label="App screens, swipe to see more">' + wfSlides() + '</div>' +
      '<div class="wf-cv wf-over" aria-hidden="true"><div class="wf-sb"><span>9:41</span><span class="wf-ic">' + bars + '</span></div><div class="wf-island"></div><div class="wf-home"></div></div></div></div>' +
      '<div class="wf-cap">' + WF_CAPS.map(function (c, i) { return '<div class="wf-capi" aria-hidden="true"><div class="wf-eb">' + (i + 1) + ' of 3 \u00b7 ' + c[0] + '</div><div class="wf-ct">' + c[1] + '</div><div class="wf-cd">' + c[2] + '</div></div>'; }).join('') + '<span class="sr" aria-live="polite"></span></div>' +
      '<div class="wf-ctrl"><button type="button" class="wf-arrow" data-wf="-1" aria-label="Previous screen">' + chev('M15 5l-7 7 7 7') + '</button><div class="wf-dots">' +
      WF_CAPS.map(function (c, i) { return '<button type="button" class="wf-dot" data-wfdot="' + i + '" aria-label="Show screen ' + (i + 1) + ': ' + c[0] + '"></button>'; }).join('') +
      '</div><button type="button" class="wf-arrow" data-wf="1" aria-label="Next screen">' + chev('M9 5l7 7-7 7') + '</button></div></section>' +
      '<section class="wf-act">' + obBtn('Find my money', 'frontstart') +
      '<div class="wf-trust"><span>Free</span><span>No bank login</span><span>Made by a certified financial coach</span></div>' +
      (cloudOn() ? '<div class="wf-signin">Already have an account? <button type="button" class="wf-link" data-a="go" data-v="account">Sign in</button></div>' : '') + '<a class="wf-priv" href="privacy.html">Privacy</a></section></div>';
  }
  // the carousel runs on its own (no re-render): swipe, drag, arrows, dots, keys, and auto-advance until first touch
  var wf = { timer: null, cur: 0, swiped: false };
  function frontInit() {
    clearInterval(wf.timer);
    var root = app.querySelector('.wf'); if (!root) return;
    var screen = root.querySelector('.wf-screen'), trk = root.querySelector('.wf-track'), n = WF_CAPS.length, dots = root.querySelectorAll('.wf-dot');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fit = function () { screen.style.setProperty('--s', (screen.clientWidth / 375).toFixed(4)); };
    fit(); if (window.ResizeObserver) new ResizeObserver(fit).observe(screen); else window.addEventListener('resize', fit);
    var paint = function (i) {
      wf.cur = i;
      Array.prototype.forEach.call(dots, function (d, k) { d.setAttribute('aria-current', k === i ? 'true' : 'false'); });
      Array.prototype.forEach.call(root.querySelectorAll('.wf-capi'), function (c, k) { c.classList.toggle('on', k === i); });
      root.querySelector('.wf-cap .sr').textContent = WF_CAPS[i][1] + '. ' + WF_CAPS[i][2];
    };
    var go = function (i) {
      var wrap = i < 0 || i >= n; i = (i + n) % n; paint(i);
      var x = i * trk.clientWidth; clearTimeout(wf.mv);
      if (reduce) { trk.scrollLeft = x; return; }
      if (wrap) { screen.classList.add('fade'); wf.mv = setTimeout(function () { trk.classList.add('moving'); trk.scrollLeft = x; trk.classList.remove('moving'); screen.classList.remove('fade'); }, 180); return; }
      trk.classList.add('moving'); trk.scrollTo({ left: x, behavior: 'smooth' });
      wf.mv = setTimeout(function () { trk.classList.remove('moving'); }, 650);
    };
    var touched = function () { clearInterval(wf.timer); if (!wf.swiped) { wf.swiped = true; track('welcome-swipe'); } };
    var raf; trk.addEventListener('scroll', function () { if (trk.classList.contains('moving')) return; cancelAnimationFrame(raf); raf = requestAnimationFrame(function () { var i = Math.round(trk.scrollLeft / trk.clientWidth); if (i !== wf.cur && i >= 0 && i < n) paint(i); }); }, { passive: true });
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (e) { trk.addEventListener(e, touched, { passive: true }); });
    root.querySelectorAll('[data-wf]').forEach(function (b) { b.addEventListener('click', function () { touched(); go(wf.cur + +b.getAttribute('data-wf')); }); });
    Array.prototype.forEach.call(dots, function (d, i) { d.addEventListener('click', function () { touched(); go(i); }); });
    // mouse drag on desktop (touch swipes natively)
    var down = false, x0 = 0, s0 = 0, moved = 0;
    trk.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; x0 = e.clientX; s0 = trk.scrollLeft; moved = 0; trk.classList.add('dragging'); try { trk.setPointerCapture(e.pointerId); } catch (er) {} });
    trk.addEventListener('pointermove', function (e) { if (down) { moved = e.clientX - x0; trk.scrollLeft = s0 - moved; } });
    var up = function () { if (!down) return; down = false; trk.classList.remove('dragging'); var w = trk.clientWidth, t = Math.round(s0 / w); if (moved < -w * 0.12) t++; else if (moved > w * 0.12) t--; go(Math.max(0, Math.min(n - 1, t))); };
    trk.addEventListener('pointerup', up); trk.addEventListener('pointercancel', up);
    wf.key = function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { if (/input|textarea|select/i.test((e.target || {}).tagName || '')) return; e.preventDefault(); touched(); go(wf.cur + (e.key === 'ArrowRight' ? 1 : -1)); } };
    paint(wf.cur); if (wf.cur) trk.scrollLeft = wf.cur * trk.clientWidth;
    if (!reduce && !wf.swiped) wf.timer = setInterval(function () { if (!document.hidden && app.contains(trk)) go(wf.cur + 1); else if (!app.contains(trk)) clearInterval(wf.timer); }, 5000);
  }
  document.addEventListener('keydown', function (e) { if (U.front && U.screen === 'welcome' && wf.key) wf.key(e); });
  // ---------- the intro: one question per screen, then sign in, then the 7-step path ----------
  var OB = ['story1', 'story2', 'name', 'feel', 'first', 'way', 'heard', 'four', 'pay', 'freq', 'nextpay', 'exp', 'debt', 'mins', 'finding', 'found', 'first4', 'save'];
  var OB_ASK = ['name', 'feel', 'first', 'way', 'heard', 'four', 'pay', 'freq', 'nextpay', 'exp', 'debt', 'mins'];
  // the one-tap answers: [key, what they tap, where they want to go]
  var OB_FIRST = [['cushion', 'Build an emergency fund', 'An emergency fund, so a surprise doesn\u2019t become debt.'], ['debt', 'Pay off debt', 'Out of debt, one payoff at a time.'], ['payday', 'Stop running out before payday', 'Making it to payday with money left.'], ['same', 'Build wealth', 'Building wealth that lasts.']];
  // [key, what they tap, what the app does about it]
  var OB_WAY = [['where', 'I don\u2019t know where it goes', 'your weekly purchases show exactly where it goes.'], ['payments', 'Debt payments', 'the snowball pays off the smallest first and rolls each payment into the next.'], ['oneincome', 'Not enough income', 'your payday plan gives every dollar a job, so your income goes further.'], ['talk', 'I don\u2019t know what to do', 'your plan shows the next step, one at a time.']];
  // "Every other Friday, so your next payday plan starts Friday, Nov 6."
  function payEcho() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(P.nextPay)) return '';
    var d = F.fromIso(P.nextPay), wd = d.toLocaleDateString('en-US', { weekday: 'long' }), when = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    var how = P.freq === 'weekly' ? 'Every ' + wd : P.freq === 'biweekly' ? 'Every other ' + wd : P.freq === 'semimonthly' ? 'Twice a month' : 'Once a month, on the ' + ordinal(d.getDate());
    return how + ', so your next payday plan starts ' + hi(when) + '.';
  }
  function communityLink() { return CONFIG.communityUrl ? '<div class="freecomm"><a href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener" data-a="joincommunity">Join the free community \u2192</a><small>Share your win, get your questions answered, and do the monthly challenge.</small></div>' : ''; }
  function obAt() { var i = OB.indexOf(U.ob); return i < 0 ? 0 : i; }
  function obGo(k) { U.ob = k; U.err = ''; render(); window.scrollTo(0, 0); var f = app.querySelector('.ob input:not([type=checkbox])'); if (f && k !== 'save') setTimeout(function () { try { f.focus(); } catch (e) {} }, 60); }
  // the numbers from the intro become the plan: rough expenses, one total for debt, savings
  function obApply() {
    quickApply();
    P.basics = String(Math.round(num(P.qExp))); P.basicsAuto = false; P.budgetV2 = true;
    var d = num(P.qDebt), m = num(P.qMin);
    P.debts = P.debts.filter(function (x) { return !x.lump; });
    if (d > 0 && !P.debts.length) P.debts.push({ id: uid(), name: 'My debts', bal: String(Math.round(d)), orig: Math.round(d), min: String(Math.round(m)), apr: '', lump: true });
    if (P.savings === '') P.savings = '0';
    save();
  }
  // a line of big type with some words lit up: hi('a plan') marks a highlighted word
  function hi(t) { return '<em>' + t + '</em>'; }
  function obArrow() { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'; }
  function obBtn(label, a, v) { return '<button type="button" class="obbtn" data-a="' + a + '"' + (v ? ' data-v="' + v + '"' : '') + '><span>' + label + '</span>' + obArrow() + '</button>'; }
  function obInput(key, ph, pre) { return '<label class="obin">' + (pre ? '<span>' + pre + '</span>' : '') + '<input type="number" inputmode="decimal" min="0" data-f="' + key + '" value="' + esc(P[key]) + '" placeholder="' + ph + '" autocomplete="off"></label>'; }
  // ---------- weekly purchases: scan a bank app screenshot, or add by hand ----------
  // the week we're in (the app's one kind of week)
  function payWeeks() {
    var w = weekOf(today());
    return [{ start: w[0], end: w[1], open: true, now: true, done: !!(P.weeks || {})[w[0]] }];
  }
  function weekNow() { var w = payWeeks(); return w.filter(function (x) { return x.now; })[0] || w[w.length - 1]; }
  function weekLabel(w) { var a = F.fromIso(w.start), b = F.fromIso(w.end), m = function (d) { return d.toLocaleDateString('en-US', { month: 'short' }); }; return m(a) + ' ' + a.getDate() + '–' + (m(a) === m(b) ? '' : m(b) + ' ') + b.getDate(); }
  function merchKey(m) { return String(m || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  // store words -> the budget line they usually belong to: [store pattern, line name pattern, need or want]
  // gas comes first so "H-E-B Gas Station" lands on Gas, not Groceries
  var STORE_RULES = [
    [/\b(shell|chevron|exxon|mobil|circle k|quiktrip|qt|valero|bp|racetrac|speedway|7-eleven|wawa|sunoco|marathon|gas|fuel|buc-?ee'?s)\b/i, /gas|fuel|car|auto|transport/i, 'need'],
    [/\b(h-?e-?b|kroger|aldi|safeway|publix|costco|sam'?s club|whole foods|trader joe'?s|food lion|winco|grocery|market|wegmans|meijer|albertsons|sprouts|walmart|heb)\b/i, /grocer|food|basics/i, 'need'],
    [/\b(chick-fil-a|mcdonald|starbucks|sonic|chipotle|taco|pizza|coffee|brew|restaurant|grill|cafe|wendy|burger|subway|dunkin|panera|whataburger|doordash|uber eats|grubhub|kfc|popeyes|dutch bros|raising cane)/i, /eat|dining|restaurant|takeout|coffee|food out|fun/i, 'want'],
    [/\b(netflix|spotify|hulu|disney|youtube|apple|skool|prime video|hbo|max|paramount|peacock|audible)\b/i, /subscri|stream|apps?\b|fun/i, 'want'],
    [/\b(target|amazon|amzn|dollar general|dollar tree|walgreens|cvs|home depot|lowe'?s)\b/i, /household|home|shopping|supplies|basics/i, 'need']
  ];
  function suggestKey(merchant, lines) {
    var mem = (P.merchantMem || {})[merchKey(merchant)];
    if (mem && lines.some(function (l) { return l.key === mem; })) return { key: mem, tag: 'Remembered' };
    for (var i = 0; i < STORE_RULES.length; i++) {
      var r = STORE_RULES[i]; if (!r[0].test(merchant)) continue;
      var hit = lines.filter(function (l) { return l.grp !== 'other' && r[1].test(l.label); })[0];
      if (!hit && r[2] === 'need') hit = lines.filter(function (l) { return l.key === 'basics'; })[0];
      if (!hit && r[2] === 'want') hit = lines.filter(function (l) { return l.key === 'fun'; })[0] || lines.filter(function (l) { return l.key === 'basics'; })[0];
      if (hit) return { key: hit.key, tag: 'Suggested' };
    }
    return { key: '', tag: '' };
  }
  // Add purchases is one chat: what they type and the photos they add on the right, what came back on the left
  function newScan(week) { return { week: week || weekNow().start, msgs: [], attach: false }; }
  function openScan(week) { dropScan(); U.scan = newScan(week); U.scanBack = U.screen === 'scan' ? U.scanBack : U.screen; go('scan'); }
  // the photos only live on this screen: let them go when the chat closes
  function dropScan() { (U.scan && U.scan.msgs || []).forEach(function (m) { (m.urls || []).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); }); }
  function scanPaint(sc, down) { if (U.screen !== 'scan' || U.scan !== sc) return; render(); if (down) chatDown(); }
  function chatDown() { setTimeout(function () { window.scrollTo(0, document.documentElement.scrollHeight); }, 30); }
  function scanMsg(v) { return U.scan && U.scan.msgs[+String(v).split('.')[0]] || null; }
  function chatAt(v) { var p = String(v).split('.'), m = scanMsg(p[0]); return m && m.st ? m.st.cards[+p[1]] || null : null; }
  // read picked screenshots on this phone, one at a time; nothing is uploaded or kept
  // ---------- AI snaps: a receipt or a bank screenshot, read by the ai Edge Function (signed-in accounts only) ----------
  // 10 snaps a month in the app, 20 after joining the free community, unlimited with group coaching. Typing is always free.
  function aiCall(route, body) { return fresh().then(function () { return sb('/functions/v1/ai/' + route, { method: 'POST', auth: true, body: body || {} }); }); }
  function aiStatus(force) {
    if (!S || !cloudOn()) { U.ai = null; return; }
    if (U.ai && !force && Date.now() - U.ai.at < 60000) return;
    U.ai = Object.assign(U.ai || {}, { at: Date.now() });
    aiCall('status').then(function (r) { U.ai = Object.assign({ at: Date.now() }, r); if (U.screen === 'scan') render(); }, function () {});
  }
  function aiCats() { return spendLines().map(function (l) { return { key: l.key, label: l.label }; }); }
  function snapFiles(input) {
    var kind = input.getAttribute('data-kind') === 'bank' ? 'bank' : 'receipt', picked = Array.prototype.slice.call(input.files || []), sc = U.scan;
    if (!picked.length || !sc) return;
    sc.attach = false;
    if (!S || !window.FMTMAI) { sc.msgs.push({ t: 'snap', rows: [], err: 'Sign in to use snaps.' }); render(); chatDown(); return; }
    // copy each photo into memory first: iPhone Safari empties picked files once the picker is cleared
    Promise.all(picked.map(function (f) { return f.arrayBuffer().then(function (b) { return new Blob([b], { type: f.type }); }, function () { return f; }); })).then(function (files) {
      input.value = '';
      var urls = files.map(function (f) { try { return URL.createObjectURL(f); } catch (e) { return ''; } }).filter(Boolean);
      var m = { t: 'snap', rows: [], err: '', reading: 1, total: files.length };
      sc.msgs.push({ t: 'pics', urls: urls, kind: kind }, m); scanPaint(sc, true); track('snap-start');
      var lines = spendLines(), seen = P.spends.map(function (x) { return FMTMEntry.rowKey({ date: x.date, amount: num(x.amount), merchant: x.note || '' }); }), stop = false, found = 0, failed = 0;
      // rows still waiting in earlier snaps in this chat count as seen too
      sc.msgs.forEach(function (x) { if (x.t === 'snap' && x !== m && !x.saved) x.rows.forEach(function (r) { seen.push(FMTMEntry.rowKey(r)); }); });
      return files.reduce(function (chain, f, i) {
        return chain.then(function () {
          if (stop) return;
          m.reading = i + 1; scanPaint(sc);
          return FMTMAI.prepare(f).then(function (images) {
            return aiCall('snap', { images: images, kind: kind, categories: aiCats(), today: F.isoDay(today()) });
          }).then(function (r) {
            r = r || {};
            if (r.paused) { stop = true; m.blocked = true; U.ai = Object.assign(U.ai || {}, { paused: true }); track('snap-paused'); return; }
            if (r.limitReached) { stop = true; m.blocked = true; U.ai = Object.assign(U.ai || {}, { level: r.level, snaps: { used: r.used, limit: r.used } }); track(r.level === 'community' ? 'snap-limit-20' : 'snap-limit-10'); return; }
            if (r.slow) { stop = true; m.err = 'One moment. Try that one again in a minute.'; return; }
            if (U.ai && U.ai.snaps && r.used != null) U.ai.snaps.used = r.used;
            var rows = r.rows || []; found += rows.length; if (!rows.length) failed++;
            FMTMEntry.dedupe(m.rows.concat(rows), seen).slice(m.rows.length).forEach(function (row) {
              // a store they've categorized before wins, then the AI's category, then our own guess
              // a remembered or AI category only counts while it's still in their budget (a removed category leaves no key)
              var has = function (k) { return !!k && lines.some(function (l) { return l.key === k; }); };
              var mem = (P.merchantMem || {})[merchKey(row.merchant)], g = row.skip ? { key: '', tag: '' } : suggestKey(row.merchant, lines);
              if (!has(mem)) mem = ''; if (!has(row.key)) row.key = '';
              row.key = row.skip ? '' : mem || row.key || g.key; if (!row.tag && !row.skip && !mem && !row.key) row.tag = g.tag;
              row.ok = !row.skip && !row.low && !!row.key; row.src = 'ai'; m.rows.push(row);
            });
            if (rows.length) track('snap-ok');
          }, function (er) {
            failed++;
            if (er && er.status === 413) m.err = 'That photo is too big. Try a screenshot of it instead.';
            else if (er && er.status === 502) m.err = 'The photo reader is having trouble right now. Your snap wasn’t counted. Try again in a minute, or type them in.';
            else if (er && er.status >= 500) m.err = 'Something went wrong on our side. Your snap wasn’t counted. Try again, or type them in.';
            else if (er && (er.status === 401 || er.message === 'signed out')) { stop = true; m.err = 'Sign in to use snaps.'; }
          });
        });
      }, Promise.resolve()).then(function () {
        m.reading = 0;
        if (!m.err && failed && !m.rows.length) m.err = 'We couldn’t read purchases in that photo. Try again, or type them in.';
        else if (!m.err && !m.rows.length && found) m.err = 'Everything in that photo is already saved.';
        aiStatus(true); scanPaint(sc, true);
      });
    });
  }
  // ---------- chat: "HEB 84.20 groceries and 12 at Sonic yesterday" ----------
  // Cheap first: entry.js reads plain purchases on the phone (no AI, never counts). Only what it can't read goes to the
  // ai function, which answers with proposed actions. Every action is a card with Confirm / Edit / Skip and nothing
  // changes until Confirm. The only sentences shown are Brad's (FMTMAI.REPLIES and CHAT_SAY) and the person's own words.
  var CHAT_AI_WORDS = /\b((from|in|since|back in) (1[89]|20)\d\d|ago|last (week|month|year)|years?|months?|balance|savings|checking|account|grateful|thankful|should|how much|left|spend today|spent nothing|nothing today|didn'?t|did not|lesson|debt|credit card|eat(ing)? out|invest\w*|401k|crypto)\b|\?/i;
  var CHAT_SAY = {
    signin: 'Sign in to use chat. A purchase typed like “HEB 84.20” still works.',
    paused: 'Chat is resting until the 1st. A purchase typed like “HEB 84.20” still works.',
    limit: 'You’ve used this month’s chat messages. A purchase typed like “HEB 84.20” still works.',
    slow: 'One moment. Try that again in a minute.',
    error: 'That didn’t go through. Try again.'
  };
  // the accounts a balance can go to: emergency savings, saving funds, goals, debts
  function chatAccounts() {
    return [{ k: 'savings', label: 'Emergency savings' }].concat(funds().map(function (f) { return { k: 'fund:' + f.id, label: f.name || 'Fund' }; }),
      (P.goals || []).map(function (g, i) { return { k: 'goal:' + i, label: g.name || 'Goal' }; }), (P.debts || []).map(function (d) { return { k: 'debt:' + d.id, label: d.name || 'Debt' }; }));
  }
  function chatMatch(hint) {
    var w = String(hint || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (x) { return x.length > 2 && !/^(the|my|account|balance)$/.test(x); });
    var hits = chatAccounts().filter(function (a) { var l = a.label.toLowerCase(); return w.some(function (x) { return l.indexOf(x) >= 0; }); });
    return hits.length === 1 ? hits[0].k : '';
  }
  // what's left this month in each spending line (the app answers "how much is left"; the AI never does the math)
  // the same numbers as the Budget tab: a weekly category is this week's money, the rest this month's (from the start day)
  function chatLeft() {
    var now = today(), ym = monthOf(F.isoDay(now)), m = spentMap(ym), share = budFrom(ym).share;
    return spendLines().filter(function (l) { return l.grp === 'spend'; }).map(function (l) {
      var wk = l.per === 'week' ? weekOf(now) : null;
      var sp = wk ? linePurchases(l.key, wk[0], wk[1]).reduce(function (t, x) { return t + num(x.amount); }, 0) : m[l.key] || 0;
      var cap = wk ? l.amt : (l.per === 'week' ? l.amt * weeksIn(now.getFullYear(), now.getMonth()) : l.mon) * share;
      return { key: l.key, label: l.label, icon: l.icon, week: !!wk, left: round2(cap - sp) };
    });
  }
  function chatCard(a) {
    var c = { id: uid(), a: a, state: 'open' };
    if (a.type === 'add_purchase') {
      var ls = spendLines(), has = function (k) { return !!k && ls.some(function (l) { return l.key === k; }); }, mem = (P.merchantMem || {})[merchKey(a.merchant)];
      c.key = (has(mem) && mem) || (has(a.category_key) && a.category_key) || suggestKey(a.merchant, ls).key || '';
    }
    if (a.type === 'update_balance') c.acct = chatMatch(a.account_hint);
    if (a.type === 'how_much_left') c.state = 'info';
    return c;
  }
  function chatSend(text) {
    text = String(text || '').trim().slice(0, FMTMAI.CHAT_MAX); var sc = U.scan; if (!text || !sc) return;
    var st = { text: text, cards: [], busy: false, reply: '', report: '' };
    sc.msgs.push({ t: 'you', text: text }, { t: 'chat', st: st }); sc.attach = false;
    var ci = document.getElementById('chatIn'); if (ci) ci.value = '';
    var paint = function () { scanPaint(sc, true); };
    // hard money stress: no logging, a calm card instead (checked here before any AI, so it works even when AI is off)
    if (FMTMAI.needsCare(text)) { st.reply = 'care'; track('chat-care'); paint(); return; }
    if (!CHAT_AI_WORDS.test(text)) {
      var rows = FMTMEntry.parseTyped(FMTMAI.maskDigits(text), today());
      rows = rows.filter(function (r) { return r.amount < 10000; });
      // the same date rule as the AI: the last 60 days, nothing in the future
      var dd = rows.map(function (r) { return F.daysBetween(F.fromIso(r.date), today()); });
      if (dd.some(function (d) { return d > 60 || d < -1; })) { st.reply = 'old_date'; paint(); return; }
      if (rows.length) { st.cards = rows.map(function (r) { return chatCard({ type: 'add_purchase', date: r.date, merchant: r.merchant, amount: r.amount, category_key: null }); }); track('chat-local'); paint(); return; }
    }
    if (!S) { st.reply = 'signin'; paint(); return; }
    st.busy = true; paint(); track('chat-ai');
    aiCall('chat', { text: FMTMAI.maskDigits(text), categories: aiCats(), budgetLeft: chatLeft().map(function (x) { return { key: x.key, left: x.left }; }), today: F.isoDay(today()) }).then(function (r) {
      r = r || {}; st.busy = false;
      if (r.paused) st.reply = 'paused';
      else if (r.limitReached) { st.reply = 'limit'; track('chat-limit'); }
      else if (r.slow) st.reply = 'slow';
      else (r.actions || []).forEach(function (a) {
        if (a.type === 'reply') { st.reply = a.topic; if (a.topic === 'care') track('chat-care'); }
        else if (a.type === 'refused') st.reply = 'old_date';
        else st.cards.push(chatCard(a));
      });
      if (!st.reply && !st.cards.length) st.reply = 'unclear';
      paint();
    }, function (er) { st.busy = false; st.reply = er && (er.status === 401 || er.message === 'signed out') ? 'signin' : 'error'; paint(); });
  }
  var CHAT_ITEM = { debt: ['💳', 'No new debt today'], eat: ['🍽️', 'No eating out today'], lesson: ['🎧', 'I did today’s lesson'] };
  // a day the way people say it: Today, Yesterday, else "Thu, Nov 5"
  function chDay(iso) { var td = F.isoDay(today()); return !iso || iso === td ? 'Today' : iso === F.isoDay(F.addDays(today(), -1)) ? 'Yesterday' : chDate(iso); }
  var PENCIL = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 00-3-3l-10 10z"/></svg>';
  // one row: an icon in a circle, a name with a small line under it, the amount, and an action on the right
  function ccRow(icon, tint, title, sub, amt, act) {
    return '<div class="ccrow"><span class="ccic" style="background:' + tint + '" aria-hidden="true">' + icon + '</span><span class="ccmid"><b>' + title + '</b><small>' + sub + '</small></span>' + (amt ? '<b class="ccamt">' + amt + '</b>' : '') + (act || '') + '</div>';
  }
  function chatCardHtml(c, i) {
    var a = c.a, extra = '', row = '', btns = true, done = c.state === 'done', mark = '<span class="ccdone" aria-label="Added">✓</span>';
    if (c.state === 'skipped') return '';
    if (a.type === 'add_purchase') {
      var lines = spendLines(), groups = [['spend', 'Spending'], ['bill', 'Recurring'], ['fund', 'Saving funds'], ['other', 'Not in my budget']], l = lines.filter(function (x) { return x.key === c.key; })[0];
      row = ccRow(l ? l.icon : '🧾', l ? colorFor(l.key) : 'var(--card2)', esc(a.merchant), (l ? esc(l.short || l.label) : '<span class="ccpick">Pick a category</span>') + ' · ' + chDay(a.date), money2(a.amount),
        done ? mark : '<button type="button" class="ccedit' + (c.edit ? ' on' : '') + '" data-a="chatedit" data-v="' + i + '" aria-label="' + (c.edit ? 'Done editing' : 'Edit') + '">' + (c.edit ? '✓' : PENCIL) + '</button>');
      if (!done && c.edit) extra = '<div class="chatedit"><label>$<input type="number" inputmode="decimal" step="0.01" data-cc="' + i + '" data-ccf="amount" value="' + esc(a.amount) + '" aria-label="Amount"></label><input type="text" data-cc="' + i + '" data-ccf="merchant" value="' + esc(a.merchant) + '" maxlength="40" aria-label="Store"><input type="date" data-cc="' + i + '" data-ccf="date" value="' + esc(a.date) + '" aria-label="Date"></div>';
      if (!done && (c.edit || !c.key)) extra += '<select data-cckey="' + i + '" aria-label="Category"' + (c.key ? '' : ' class="unset"') + '><option value="">Choose a category</option>' + groups.map(function (g) { var m = lines.filter(function (x) { return x.grp === g[0]; }); return m.length ? '<optgroup label="' + g[1] + '">' + m.map(function (x) { return '<option value="' + x.key + '"' + (x.key === c.key ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</optgroup>' : ''; }).join('') + '</select>';
      // big or old: just checking
      if (!done && (a.amount > 1000 || (a.date && F.daysBetween(F.fromIso(a.date), today()) > 14))) extra += '<p class="chatwarn">Just checking: ' + money2(a.amount) + ' on ' + chDate(a.date) + '?</p>';
    } else if (a.type === 'no_spend_today') row = ccRow('✅', 'var(--green-soft)', 'No spend today', 'Daily checklist · Today', '', done ? mark : '');
    else if (a.type === 'check_daily_item') row = ccRow(CHAT_ITEM[a.item][0], 'var(--green-soft)', CHAT_ITEM[a.item][1], 'Daily checklist · Today', '', done ? mark : '');
    else if (a.type === 'gratitude') row = ccRow('🙏', 'var(--green-soft)', '“' + esc(a.text) + '”', 'Grateful for · Today', '', done ? mark : '');
    else if (a.type === 'update_balance') {
      var acct = chatAccounts().filter(function (x) { return x.k === c.acct; })[0];
      row = ccRow('💰', 'var(--green-soft)', acct ? esc(acct.label) : 'Which account?', 'New balance', money2(a.amount), done ? mark : '');
      if (!acct && !done) extra = '<div class="chatpick">' + chatAccounts().map(function (x) { return '<button type="button" class="chmini" data-a="chatacct" data-v="' + i + '|' + esc(x.k) + '">' + esc(x.label) + '</button>'; }).join('') + '</div>';
    } else if (a.type === 'how_much_left') {
      var cl = chatLeft().filter(function (x) { return x.key === a.category_key; })[0]; btns = false;
      row = cl ? ccRow(cl.icon, colorFor(cl.key), esc(cl.label), (cl.left < 0 ? 'Over this ' : 'Left this ') + (cl.week ? 'week' : 'month'), money2(Math.abs(cl.left)), '') : '<p class="chatsay">That category isn’t in your budget.</p>';
    }
    return '<div class="chatcard cc' + (done ? ' done' : '') + '">' + row + extra + (c.err ? '<p class="chatwarn">' + esc(c.err) + '</p>' : '') + '</div>' +
      (btns && !done ? '<div class="ccbtns"><button type="button" class="ccno" data-a="chatskip" data-v="' + i + '">Cancel</button><button type="button" class="ccyes" data-a="chatok" data-v="' + i + '">Confirm</button></div>' : '');
  }
  // what came back for one chat message: Brad's reply, and a card per action
  function chatReplyHtml(st, j) {
    var say = st.reply ? (FMTMAI.REPLIES[st.reply] || CHAT_SAY[st.reply] || '') : '';
    return (st.busy ? '<div class="chatcard"><span class="spin" aria-hidden="true"></span> Reading…</div>' : '') +
      (st.reply === 'care' ? '<div class="chatcard care"><p>' + esc(say) + '</p><div class="chatbtns"><a class="chmini gold" href="tel:988">Call 988</a><a class="chmini" href="sms:988">Text 988</a>' +
          (CONFIG.supportEmail ? '<a class="chmini" href="mailto:' + esc(CONFIG.supportEmail) + '">Message Brad</a>' : CONFIG.communityUrl ? '<a class="chmini" href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener">Message Brad</a>' : '') + '</div></div>'
        : say ? '<div class="chatsay"><p>' + esc(say) + '</p>' + (st.reply === 'advice' ? '<div class="chatbtns">' + (CONFIG.communityUrl ? '<a class="chmini gold" href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener" data-a="joincommunity">Free community</a>' : '') + (CONFIG.coachingUrl ? '<a class="chmini" href="' + esc(CONFIG.coachingUrl) + '" target="_blank" rel="noopener" data-a="coaching">Coaching</a>' : '') + '</div>' : '') + '</div>' : '') +
      (function () { var n = st.cards.filter(function (c) { return c.state === 'open'; }).length; return n ? '<p class="chatsay">Got it. Take a quick look and tap Confirm to add ' + (n > 1 ? 'them' : 'it') + ' 👇</p>' : ''; })() +
      st.cards.map(function (c, i) { return chatCardHtml(c, j + '.' + i); }).join('') +
      (st.cards.length && st.cards.every(function (c) { return c.state === 'skipped'; }) ? '<small class="chatnote">Canceled. Nothing was added.</small>' :
       st.cards.length && !st.busy ? (st.report === 'open' ? '<div class="chatcard"><p>Send this to Brad? He’ll see your message and what came back.</p><div class="chatbtns"><button type="button" class="chmini gold" data-a="chatreport" data-v="send:' + j + '">Send</button><button type="button" class="chmini" data-a="chatreport" data-v="no:' + j + '">Cancel</button></div></div>'
        : st.report === 'sent' ? '<small class="chatnote">Sent. Thanks.</small>' : '<button type="button" class="linkbtn chatwrong" data-a="chatreport" data-v="open:' + j + '">Something look wrong?</button>') : '');
  }
  // what came back from a photo: the rows to check, then Save
  function snapReplyHtml(m, j) {
    if (m.reading) return '<div class="chatcard scread" role="status"><span class="spin" aria-hidden="true"></span><b>Reading ' + (m.total > 1 ? 'photo ' + m.reading + ' of ' + m.total : 'your photo') + '…</b><small>A few seconds each.</small></div>';
    if (m.saved) return '<div class="chatcard cc done">' + ccRow('✓', 'var(--green)', plural(m.saved.n, 'purchase') + ' saved', 'From your photo · ' + chDay(F.isoDay(today())), money2(m.saved.total), '') + '</div>';
    var block = m.blocked ? snapBlock() : '';
    if (!m.rows.length) return block ? '<div class="chatcard">' + block + '</div>' : m.err ? '<div class="chatsay"><p>' + esc(m.err) + '</p></div>' : '';
    var lines = spendLines(), groups = [['spend', 'Spending'], ['bill', 'Recurring'], ['fund', 'Saving funds'], ['other', 'Not in my budget']];
    var select = function (r, k) {
      return '<select data-scan-key="' + k + '" aria-label="Category for ' + esc(r.merchant) + '"' + (r.key ? '' : ' class="unset"') + '><option value="">Choose a category</option>' + groups.map(function (g) {
        var ms = lines.filter(function (l) { return l.grp === g[0]; }); return ms.length ? '<optgroup label="' + g[1] + '">' + ms.map(function (l) { return '<option value="' + l.key + '"' + (l.key === r.key ? ' selected' : '') + '>' + esc(l.label) + '</option>'; }).join('') + '</optgroup>' : '';
      }).join('') + '</select>';
    };
    var okRows = m.rows.filter(function (r) { return r.ok; }), n = okRows.length, total = okRows.reduce(function (t, r) { return t + r.amount; }, 0), open = m.rows.filter(function (r) { return !r.ok && !r.skip; }).length;
    var rows = m.rows.map(function (r, i) {
      var sub = [r.date ? dayMonth(F.fromIso(r.date)) : 'No date found'].concat(r.flag ? ['<span class="sctag warn">' + esc(r.flag) + '</span>'] : []).concat(r.tag ? ['<span class="sctag">' + r.tag + '</span>'] : []).concat(r.low && !r.flag ? ['<span class="sctag warn">Double-check</span>'] : []);
      return '<div class="scrow' + (r.ok ? ' on' : '') + (r.low ? ' low' : '') + (r.skip && !r.ok ? ' skip' : '') + '"><label class="scchk"><input type="checkbox" data-scan-ok="' + j + '.' + i + '"' + (r.ok ? ' checked' : '') + ' aria-label="Keep ' + esc(r.merchant) + ' ' + money2(r.amount) + '"></label>' +
        '<div class="scmid"><div class="sctop"><b>' + esc(r.merchant) + '</b><b class="scamt">' + money2(r.amount) + '</b></div><small>' + sub.join(' · ') + '</small>' + select(r, j + '.' + i) + '</div></div>';
    }).join('');
    return '<p class="chatsay">Found ' + plural(m.rows.length, 'purchase') + '. Check the right ones, pick a category, then tap Save 👇 AI can misread, so take a quick look.</p>' +
      '<div class="chatcard snapreply">' + (open ? '<div class="snaphead"><button type="button" class="linkbtn" data-a="scanall" data-v="' + j + '">Check all</button></div>' : '') +
      '<div class="scl">' + rows + '</div>' + (m.err ? '<p role="alert" class="scerr">' + esc(m.err) + '</p>' : '') + block +
      '<button type="button" class="primary" data-a="scansave" data-v="' + j + '"' + (n ? '' : ' disabled') + '>' + (n ? 'Save ' + plural(n, 'purchase') + ' · ' + money2(total) : 'Check the purchases to save') + '</button></div>';
  }
  // the bar at the bottom: add a photo, type, send. The + opens the photo choices (or why snaps are resting).
  function chatDock() {
    var sc = U.scan, ai = U.ai || {}, sn = ai.snaps || {}, lim = sn.limit, left = lim == null ? null : Math.max(0, lim - (sn.used || 0));
    var block = snapBlock(), file = function (k) { return '<input type="file" accept="image/*" multiple data-file="snap" data-kind="' + k + '" id="snap-' + k + '" class="sr" tabindex="-1">'; };
    var menu = !sc.attach ? '' : '<div class="chatmenu">' + (block || '<label class="chatopt" for="snap-receipt">🧾<span><b>Snap a receipt</b><small>A photo of a paper receipt</small></span></label><label class="chatopt" for="snap-bank">🏦<span><b>Add a bank screenshot</b><small>Your bank app’s list of purchases</small></span></label>' +
      '<small class="snapleft">' + (ai.level === 'paid' ? 'Unlimited snaps' : lim != null ? left + ' of ' + lim + ' snaps left this month' : '') + '</small>') +
      '<button type="button" class="chatopt" data-a="weekhand">✍️<span><b>Add one by hand</b><small>Amount, store and category</small></span></button></div>';
    return '<div class="chatdock">' + menu + (block ? '' : file('receipt') + file('bank')) +
      '<form class="chatbar" data-chatform><button type="button" class="chatplus' + (sc.attach ? ' on' : '') + '" data-a="chatattach" aria-label="Add a photo" aria-expanded="' + !!sc.attach + '">' + ICON.plus + '</button>' +
      '<input type="text" id="chatIn" maxlength="' + FMTMAI.CHAT_MAX + '" placeholder="Tell me what you spent…" aria-label="Tell me what you spent" autocomplete="off" enterkeyhint="send">' +
      '<button type="submit" class="chatsend" aria-label="Send"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button></form>' +
      '<small class="chatfoot">Educational tool, not financial advice.</small></div>';
  }
  function chatConfirm(v) {
    var c = chatAt(v); if (!c || c.state !== 'open') return;
    var a = c.a, td = chToday();
    if (a.type === 'add_purchase') {
      if (!(num(a.amount) > 0)) { c.err = 'Enter how much it was.'; render(); return; }
      if (!c.key) { c.err = 'Pick a category.'; render(); return; }
      var date = /^\d{4}-\d{2}-\d{2}$/.test(String(a.date)) ? a.date : td;
      P.spends.push({ id: uid(), date: date, amount: String(round2(num(a.amount))), key: c.key, note: String(a.merchant || '').trim().slice(0, 40), src: 'chat' });
      P.merchantMem = P.merchantMem || {}; if (a.merchant) P.merchantMem[merchKey(a.merchant)] = c.key;
      wkMark('cat'); markLogged([date]);
    } else if (a.type === 'update_balance') {
      if (!c.acct) { c.err = 'Pick the account.'; render(); return; }
      var before = balancesNow(), val = String(round2(Math.max(0, num(a.amount)))), k = c.acct.split(':');
      if (k[0] === 'savings') P.savings = val;
      else if (k[0] === 'goal') { var g = P.goals[+k[1]]; if (g) g.saved = num(val); }
      else if (k[0] === 'fund') funds().forEach(function (f) { if (f.id === k[1]) f.start = String(round2(num(val) - fundNet(f))); });
      else if (k[0] === 'debt') P.debts.forEach(function (d) { if (d.id === k[1]) { d.bal = val; if (num(val) > num(d.orig)) d.orig = num(val); } });
      recordBalances(before); wkMark('bal'); if (chCanEdit()) chRec(td, true).balUpdated = true;
    } else {
      // the daily checklist: only today, and not once the day is full
      if (!chCanEdit()) { c.err = 'Today’s checklist is already full.'; render(); return; }
      var r = chRec(td, true);
      if (a.type === 'no_spend_today') r.noSpend = true;
      else if (a.type === 'gratitude') r.gratitude = String(a.text).slice(0, 280);
      else if (a.item === 'debt') r.noNewDebt = true;
      else if (a.item === 'eat') r.noEatingOut = true;
      else if (a.item === 'lesson') markLesson(dailyLesson().ref);
      track('daily-item');
    }
    c.state = 'done'; c.err = ''; save(); track('chat-confirm'); render();
  }
  // why snaps can't be used right now (signed out, resting, used up), or '' when they can
  function snapBlock() {
    var ai = U.ai || {}, sn = ai.snaps || {}, lim = sn.limit, left = lim == null ? null : Math.max(0, lim - (sn.used || 0));
    var typeLine = '<small class="snapfree">You can always type them in. That’s free.</small>';
    if (!S) return '<div class="snapcard"><b>📸 Snap a receipt or your bank app</b><span>Sign in to use snaps.</span><button type="button" class="outline" data-a="go" data-v="account">Sign in</button>' + typeLine + '</div>';
    if (ai.paused) return '<div class="snapcard"><b>😴 Snaps are resting until the 1st.</b>' + typeLine + '</div>';
    if (lim != null && left === 0) {
      var alt = U.altOpen ? '<div class="typeit"><input type="email" data-alt autocomplete="email" placeholder="The email you joined with" aria-label="The email you joined the community with"><button type="button" class="sharebtn" data-a="altsave">Save</button></div>' + (U.altMsg ? '<small class="snapfree">' + esc(U.altMsg) + '</small>' : '')
        : (U.altMsg ? '<small class="snapfree">' + esc(U.altMsg) + '</small>' : '<button type="button" class="linkbtn" data-a="altopen">Joined with a different email?</button>');
      return ai.level === 'community'
        ? '<div class="snapcard"><b>You’ve used your 20 snaps this month.</b><span>Unlimited snaps come with group coaching ($29/mo).</span>' + (CONFIG.coachingUrl ? '<a class="primary" style="text-decoration:none;display:grid;place-items:center" href="' + esc(CONFIG.coachingUrl) + '" target="_blank" rel="noopener" data-a="coaching">Learn about coaching</a>' : '') + typeLine + '</div>'
        : '<div class="snapcard"><b>You’ve used your 10 snaps this month.</b><span>Join the free community and get 10 more.</span>' + (CONFIG.communityUrl ? '<a class="primary" style="text-decoration:none;display:grid;place-items:center" href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener" data-a="joincommunity">Join the free community</a>' : '') + alt + typeLine + '</div>';
    }
    return '';
  }
  function weekDone(ws, how) { wkMark('cat'); P.weeks = P.weeks || {}; if (!P.weeks[ws] || how === 'saved') P.weeks[ws] = how; }
  // ---------- the budget: spending categories, recurring expenses, everything else ----------
  // spending categories people can add, with an icon each
  var SPEND_SUGGEST = [['Groceries', '🛒'], ['Gas', '⛽'], ['Eating out', '🍔'], ['Shopping', '🛍️'], ['Kids', '🧸'], ['Household', '🧺'], ['Personal care', '💇'], ['Pets', '🐾'], ['Gifts', '🎁'], ['Coffee', '☕'], ['Entertainment', '🎬'], ['Medical', '💊']];
  var RECUR_SUGGEST = [['Rent', '🏠'], ['Mortgage', '🏡'], ['Electricity', '💡'], ['Water', '💧'], ['Internet', '📶'], ['Phone', '📱'], ['Car insurance', '🚗'], ['Health insurance', '🩺'], ['Childcare', '👶'], ['Streaming', '📺'], ['Music', '🎵'], ['Gym', '🏋️'], ['Trash', '🗑️']];
  var ICON_PICKS = ['🛒', '⛽', '🍔', '🛍️', '🧸', '🧺', '💇', '🐾', '🎁', '☕', '🎬', '💊', '🏠', '💡', '💧', '📶', '📱', '🚗', '🩺', '👶', '📺', '🎵', '🏋️', '🎉', '⛪', '🎓', '📚', '✈️', '🧾'];
  var CAT_COLORS = ['#7ED9C0', '#FFC97E', '#FF9F7A', '#C8BCF5', '#9AD0F5', '#FFB4D0', '#B5E48C', '#F5D76E', '#FF8A8A', '#8EE3F5'];
  // what a budget line is for; spending categories and recurring expenses pick one
  var TYPES = [['need', 'Need'], ['want', 'Want'], ['debt', 'Debt'], ['save', 'Savings / goal']];
  var WANT_WORDS = /eating out|shopping|gifts|coffee|entertainment|stream|music|gym|fun|subscri/i;
  // every budget line is a Need or a Want (lines saved as Debt or Savings before fall back by name)
  function typeOf(x) { return x.type === 'need' || x.type === 'want' ? x.type : (WANT_WORDS.test(x.name || '') || x.group === 'subs' ? 'want' : 'need'); }
  // an icon for bills saved before icons existed, by name
  function iconFor(name) {
    var n = String(name || '').toLowerCase(), m = [[/rent|mortgage|home|house/, '🏠'], [/electric|power|light/, '💡'], [/water|sewer/, '💧'], [/internet|wifi/, '📶'], [/phone|cell/, '📱'], [/car|auto|gas|fuel/, '🚗'], [/health|doctor|dental|medical|prescription/, '🩺'], [/child|daycare|kid|school/, '👶'], [/stream|netflix|hulu|disney/, '📺'], [/music|spotify/, '🎵'], [/gym|fitness/, '🏋️'], [/grocer|food/, '🛒'], [/insurance/, '🛡️'], [/pet|vet/, '🐾'], [/trash/, '🗑️'], [/church|tithe|giv/, '⛪']];
    for (var i = 0; i < m.length; i++) if (m[i][0].test(n)) return m[i][1];
    return '🧾';
  }
  // the built-in lines (fun, giving, education fund, everything else): what was picked for them
  var BUILT_IN = [['fun', 'Fun money', '\uD83C\uDF89'], ['give', 'Giving', '\u26EA'], ['edu', 'Education fund', '\uD83C\uDF93'], ['basics', 'Everything else', '\uD83E\uDDFE']];
  function lineMeta(k) { return (P.lineMeta || {})[k] || {}; }
  // undefined leaves a field as it is, '' clears it
  function setMeta(k, o) { P.lineMeta = P.lineMeta || {}; var m = P.lineMeta[k] = P.lineMeta[k] || {}; Object.keys(o).forEach(function (x) { if (o[x] === '') delete m[x]; else if (o[x] !== undefined) m[x] = o[x]; }); if (!Object.keys(m).length) delete P.lineMeta[k]; }
  // a line's own color if one was picked, else a steady one from its key
  function colorFor(key) {
    var k = String(key), own = k.indexOf('c:') === 0 ? (P.cats || []).filter(function (x) { return 'c:' + x.id === k; })[0] : k.indexOf('b:') === 0 ? P.bills.filter(function (x) { return 'b:' + x.id === k; })[0] : k.indexOf('u:') === 0 ? funds().filter(function (x) { return 'u:' + x.id === k; })[0] : lineMeta(k);
    if (own && own.color) return own.color;
    var m = autoColors(); return m[k] || colorAuto(key);
  }
  // lines without a picked color take the next color nobody else is using, in budget order
  var autoColorMap = null;
  function autoColors() {
    if (autoColorMap) return autoColorMap;
    var m = autoColorMap = {}, keys = spendLines().filter(function (l) { return l.grp !== 'other'; }).map(function (l) { return l.key.replace(/^u\+:/, 'u:'); }).concat(P.goals.map(function (g) { return 'g:' + g.id; }));
    var picked = function (k) { var o = k.indexOf('c:') === 0 ? cats().filter(function (x) { return 'c:' + x.id === k; })[0] : k.indexOf('b:') === 0 ? P.bills.filter(function (x) { return 'b:' + x.id === k; })[0] : k.indexOf('u:') === 0 ? funds().filter(function (x) { return 'u:' + x.id === k; })[0] : lineMeta(k); return o && o.color; };
    var used = {}, n = 0; keys.forEach(function (k) { var c = picked(k); if (c) used[c] = 1; });
    keys.forEach(function (k) { if (m[k] || picked(k)) return; var free = CAT_COLORS.filter(function (c) { return !used[c]; }), c = free.length ? free[0] : CAT_COLORS[n++ % CAT_COLORS.length]; m[k] = c; used[c] = 1; });
    return m;
  }
  function colorAuto(key) { var h = 0; String(key).split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) % 997; }); return CAT_COLORS[h % CAT_COLORS.length]; }
  function cats() { return P.cats || (P.cats = []); }
  // saving funds (sinking funds): money set aside each week or month for a bill that comes later.
  // A purchase can be paid from a fund (key u:id) or add to it (key u+:id); the balance is where it
  // started (f.start) plus what was added minus what was paid from it.
  function funds() { return P.funds || (P.funds = []); }
  function fundMonthly(f) { return num(f.amount) * (f.per === 'week' ? 52 / 12 : 1); }
  function fundsMonthly() { return funds().reduce(function (t, f) { return t + fundMonthly(f); }, 0); }
  function fundNet(f) {
    var paid = {}; P.bills.forEach(function (b) { if (b.fund === f.id) paid['b:' + b.id] = 1; });
    return (P.spends || []).reduce(function (t, x) { return t + (x.key === 'u+:' + f.id ? num(x.amount) : x.key === 'u:' + f.id || paid[x.key] ? -num(x.amount) : 0); }, 0);
  }
  function fundBal(f) { return num(f.start) + fundNet(f); }
  function isFundKey(k) { return /^u\+?:/.test(String(k || '')); }
  function recurring() { return P.bills.filter(function (b) { return F.billMonthly(b) > 0; }); }
  // a recurring expense paid from a saving fund is covered by the fund, so it isn't counted again in the budget
  function fromFund(b) { return b.fund && funds().some(function (f) { return f.id === b.fund; }) ? b.fund : ''; }
  function budgetMonthly(b) { return fromFund(b) ? 0 : F.billMonthly(b); }
  function recurMonthly() { return recurring().reduce(function (t, b) { return t + budgetMonthly(b); }, 0); }
  // a category's amount is per month, or per week when c.per is 'week'
  function catMonthly(c) { return num(c.amount) * (c.per === 'week' ? 52 / 12 : 1); }
  function catsMonthly() { return cats().reduce(function (t, c) { return t + catMonthly(c); }, 0); }
  // Sunday to Saturday around a day
  function weekOf(d) { var s0 = F.fromIso(F.weekStartOf(F.isoDay(d), weekDay0())); return [F.isoDay(s0), F.isoDay(F.addDays(s0, 6))]; }
  // giving each month, whether it's set as a percent or a dollar amount
  function giveMonthly() { return giveAmt() ? giveAmt() : P.givingPct ? Math.round(monthlyIncome() * num(P.givingPct) / 100) : 0; }
  function funMonthly() { return funSet() ? num(P.fun) : 0; }
  // P.basics is the rough monthly total (everything but debt payments). "Everything else" is what the
  // categories and recurring expenses haven't covered yet. Adding one splits the total; changing or
  // removing one changes the total. Plans from before (no budgetV2) keep their old math until touched.
  function elseMonthly() {
    if (lineMeta('basics').hidden) return 0;
    if (!P.budgetV2) return itemized() ? 0 : basicsNet();
    return Math.max(0, num(P.basics) - recurMonthly() - catsMonthly() - funMonthly() - fundsMonthly());
  }
  function budgetV2() {
    if (P.budgetV2) return;
    P.basics = String(Math.round(recurMonthly() + (itemized() ? 0 : basicsNet()) + funMonthly() + catsMonthly())); P.budgetV2 = true; P.basicsAuto = false;
  }
  function shiftRough(delta) { if (P.budgetV2 && delta) P.basics = String(Math.max(0, Math.round(num(P.basics) + delta))); }
  var FREQ_LABEL = { monthly: 'a month', biweekly: 'every 2 weeks', weekly: 'a week', yearly: 'a year' };
  function dueText2(b) {
    if (!b.due) return '';
    var d = F.fromIso(b.due), f = b.freq || b.rep || 'monthly';
    return f === 'monthly' ? 'Due the ' + ordinal(d.getDate()) : f === 'yearly' ? 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' each year' : (f === 'weekly' ? 'Every ' : 'Every other ') + d.toLocaleDateString('en-US', { weekday: 'long' });
  }
  // the next date with this day of the month, starting today
  function nextDay(day) { var t = today(), y = t.getFullYear(), m = t.getMonth(); if (day < t.getDate()) m++; var dim = new Date(y, m + 1, 0).getDate(); return F.isoDay(new Date(y, m, Math.min(day, dim))); }
  // ---------- edit sheets: nothing changes until Save ----------
  function sheetHtml() {
    var sh = U.sheet, body = '', title = '';
    if (sh.k === 'cat') {
      var l = spendLines().filter(function (x) { return x.key === sh.key; })[0]; if (!l) { U.sheet = null; return ''; }
      var c = sh.key.indexOf('c:') === 0 ? cats().filter(function (x) { return 'c:' + x.id === sh.key; })[0] : null, ic = sh.icon || (c && c.icon) || l.icon;
      title = l.icon + ' ' + esc(l.label);
      body = '<label class="field">Name<input type="text" data-catname value="' + esc(c ? c.name : l.label) + '" maxlength="30"></label>' +
        (c ? '<div class="field">Budget it<div class="seg" role="group">' + [['month', 'Monthly'], ['week', 'Weekly']].map(function (t) { var on = (sh.per || c.per || 'month') === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-a="catper" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' : '') +
        '<label class="field"><span data-live="catamtlabel">' + ((sh.per || (c && c.per) || 'month') === 'week' ? 'Each week' : 'Each month') + '</span><input type="number" inputmode="decimal" min="0" data-catamt value="' + (c ? (c.amount !== '' ? Math.round(num(c.amount)) : '') : l.mon ? Math.round(l.mon) : '') + '" placeholder="$0"></label>' +
        ('<div class="field">Type<div class="seg wrap" role="group">' + TYPES.slice(0, 2).map(function (t) { var on = (sh.type || (c ? typeOf(c) : l.type)) === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-a="cattype" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
          '<div class="field">Color<div class="swatches">' + CAT_COLORS.map(function (x) { var on = (sh.color || colorFor(sh.key)) === x; return '<button type="button" class="swatch' + (on ? ' on' : '') + '" style="--c:' + x + '" data-a="catcolor" data-v="' + x + '" aria-label="Color"></button>'; }).join('') + '</div></div>' +
          '<div class="field">Icon<div class="icgrid">' + ICON_PICKS.map(function (x) { return '<button type="button" class="icpick' + (ic === x ? ' on' : '') + '" data-a="caticon" data-v="' + x + '">' + x + '</button>'; }).join('') + '</div></div>') +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="catsave" data-v="' + sh.key + '">Save</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>' +
        '<button type="button" class="textbtn" style="color:var(--warn)" data-a="catdel" data-v="' + sh.key + '">Remove this category</button>';
    } else if (sh.k === 'recur') {
      var f = U.form || {}, freq = f.freq || 'monthly', days = '';
      for (var d = 1; d <= 31; d++) days += '<option value="' + d + '"' + (+f.day === d ? ' selected' : '') + '>' + ordinal(d) + '</option>';
      title = f.id ? 'Edit ' + esc(f.name || 'expense') : 'Add a recurring expense';
      body = (f.id ? '' : '<div class="chips">' + RECUR_SUGGEST.filter(function (x) { return !P.bills.some(function (b) { return F.billMonthly(b) > 0 && String(b.name).toLowerCase() === x[0].toLowerCase(); }); }).map(function (x) { return '<button type="button" class="chip" data-a="recursug" data-v="' + esc(x[0]) + '" data-i="' + x[1] + '">' + x[1] + ' ' + esc(x[0]) + '</button>'; }).join('') + '</div>') +
        '<label class="field">Name<input type="text" data-g="name" maxlength="40" value="' + esc(f.name || '') + '" placeholder="Like Rent or Internet"></label>' +
        '<div class="field">Icon<div class="icgrid">' + ICON_PICKS.map(function (x) { return '<button type="button" class="icpick' + (f.icon === x ? ' on' : '') + '" data-a="recuricon" data-v="' + x + '">' + x + '</button>'; }).join('') + '</div></div>' +
        '<label class="field">Amount each time<input type="number" inputmode="decimal" min="0" data-g="amount" value="' + esc(f.amount || '') + '" placeholder="$0"></label>' +
        '<div class="field">How often<div class="seg wrap" role="group">' + [['monthly', 'Monthly'], ['biweekly', 'Every 2 weeks'], ['weekly', 'Weekly'], ['yearly', 'Yearly']].map(function (o) { var on = freq === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="recurfreq" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        (freq === 'monthly' ? '<label class="field">Due on the<select data-g="day">' + days + '</select></label>' : '<label class="field">Next due date<input type="date" data-g="due" value="' + esc(f.due || '') + '"></label>') +
        '<div class="field">Type<div class="seg wrap" role="group">' + TYPES.slice(0, 2).map(function (t) { var on = typeOf(f) === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-a="recurtype" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="field">Color<div class="swatches">' + CAT_COLORS.map(function (x) { var on = (f.color || (f.id ? colorFor('b:' + f.id) : '')) === x; return '<button type="button" class="swatch' + (on ? ' on' : '') + '" style="--c:' + x + '" data-a="recurcolor" data-v="' + x + '" aria-label="Color"></button>'; }).join('') + '</div></div>' +
        (funds().length ? '<div class="field">Paid from<div class="seg wrap" role="group">' + [['', 'My budget']].concat(funds().map(function (x) { return [x.id, (x.icon || '\uD83D\uDCB0') + ' ' + esc(x.name || 'Fund')]; })).map(function (o) { var on = (f.fund || '') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="recurfund" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' : '') +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="recursave">' + (f.id ? 'Save' : 'Add it') + '</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>' +
        (f.id ? '<button type="button" class="textbtn" style="color:var(--warn)" data-a="recurdel">Remove this expense</button>' : '');
    } else if (sh.k === 'day') {
      var d0 = F.fromIso(sh.iso), list = (P.spends || []).filter(function (x) { return x.date === sh.iso; }), lines = {}, tot = 0;
      spendLines().forEach(function (l) { lines[l.key] = l; });
      list.forEach(function (x) { tot += num(x.amount); });
      title = d0.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      body = '<p class="daysub">' + (list.length ? plural(list.length, 'purchase') + ' · ' + money2(tot) : 'No purchases') + '</p>' +
        (list.length ? '<div class="card rlist">' + list.map(function (x) { var l = lines[x.key] || { icon: '🧾', label: 'Removed category' }; return '<div class="rrow">' + icoBox(l.icon, x.key) + '<span class="cmid"><b>' + esc(x.note || l.label) + '</b><small>' + esc(x.note ? l.label : '') + '</small></span><span class="ramt">' + money2(num(x.amount)) + '</span></div>'; }).join('') + '</div>'
          : '<div class="dayempty"><span aria-hidden="true">🗂️</span>No purchases on this date</div>') +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="spendon" data-v="' + sh.iso + '">+ Add a purchase</button><button type="button" class="outline" data-a="sheetclose">Close</button></div>';
    } else if (sh.k === 'income') {
      title = 'Your income';
      body = '<label class="field">Take-home pay, each paycheck<input type="number" inputmode="decimal" min="0" data-incpay value="' + esc(P.paycheck) + '" placeholder="$0"></label>' +
        '<div class="field">How often<div class="seg wrap" role="group">' + [['weekly', 'Every week'], ['biweekly', 'Every 2 weeks'], ['semimonthly', 'Twice a month'], ['monthly', 'Once a month']].map(function (f) { var on = (sh.freq || P.freq) === f[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-a="incfreq" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div></div>' +
        '<label class="field">Next payday<input type="date" data-incnext value="' + esc(P.nextPay) + '"></label>' +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="incsave">Save</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>' +
        '<button type="button" class="textbtn" data-a="edit" data-v="pay">More income options</button>';
    } else if (sh.k === 'bal') {
      title = 'Update balances';
      body = '<label class="field">Emergency savings<input type="number" inputmode="decimal" min="0" data-bal="savings" value="' + esc(P.savings) + '"></label>' +
        funds().map(function (f) { return '<label class="field">' + esc(f.name || 'Fund') + '<input type="number" inputmode="decimal" min="0" data-bal="fund" data-v="' + f.id + '" value="' + round2(fundBal(f)) + '"></label>'; }).join('') +
        P.goals.map(function (g, i) { return '<label class="field">' + esc(g.name) + ' saved<input type="number" inputmode="decimal" min="0" data-bal="goal" data-i="' + i + '" value="' + esc(g.saved || 0) + '"></label>'; }).join('') +
        P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).map(function (d) { return '<label class="field">' + esc(d.name || 'Debt') + ' balance<input type="number" inputmode="decimal" min="0" data-bal="debt" data-v="' + d.id + '" value="' + esc(d.bal) + '"></label>'; }).join('') +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="balsave">Save</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>';
    } else if (sh.k === 'fund') {
      var fd = U.form || {}, fper = fd.per || 'week';
      title = fd.id ? (fd.icon || '\uD83D\uDCB0') + ' ' + esc(fd.name || 'Fund') : 'Add a saving fund';
      body = '<label class="field">Name<input type="text" data-g="name" maxlength="30" value="' + esc(fd.name || '') + '" placeholder="Like Bills or Car insurance"></label>' +
        '<div class="field">Save<div class="seg" role="group">' + [['week', 'Weekly'], ['month', 'Monthly']].map(function (t) { var on = fper === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" data-a="fundper" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
        (fper === 'week' ? '<div class="field">Save on<div class="daypick" role="group" aria-label="Day of the week">' + DOW.map(function (d, i) { var on = (fd.day != null ? +fd.day : fundDay({})) === i; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" aria-label="' + d + '" data-a="fundday" data-v="' + i + '">' + d.charAt(0) + '</button>'; }).join('') + '</div></div>' : '') +
        '<label class="field"><span data-live="fundamtlabel">' + (fper === 'week' ? 'Each week' : 'Each month') + '</span><input type="number" inputmode="decimal" min="0" data-g="amount" value="' + esc(fd.amount || '') + '" placeholder="$0"></label>' +
        '<label class="field">In the fund now<input type="number" inputmode="decimal" min="0" data-g="bal" value="' + esc(fd.bal != null ? fd.bal : '') + '" placeholder="$0"></label>' +
        '<div class="field">Color<div class="swatches">' + CAT_COLORS.map(function (x) { var on = (fd.color || (fd.id ? colorFor('u:' + fd.id) : '')) === x; return '<button type="button" class="swatch' + (on ? ' on' : '') + '" style="--c:' + x + '" data-a="fundcolor" data-v="' + x + '" aria-label="Color"></button>'; }).join('') + '</div></div>' +
        '<div class="field">Icon<div class="icgrid">' + ICON_PICKS.concat(['\uD83D\uDCB0']).map(function (x) { return '<button type="button" class="icpick' + ((fd.icon || '\uD83D\uDCB0') === x ? ' on' : '') + '" data-a="fundicon" data-v="' + x + '">' + x + '</button>'; }).join('') + '</div></div>' +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="fundsave">' + (fd.id ? 'Save' : 'Add it') + '</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>' +
        (fd.id ? '<button type="button" class="textbtn" style="color:var(--warn)" data-a="funddel">Remove this fund</button>' : '');
    } else if (sh.k === 'stepmo') {
      var pl = F.plan(profile()), o = F.outlook(profile(), today());
      title = 'Each month to ' + (o.step === 1 ? 'your $1,000 Emergency Fund' : o.step === 2 && o.target ? esc(o.target.name) : 'your step');
      body = '<label class="field">Amount each month<input type="number" inputmode="decimal" min="0" data-stepin value="' + Math.round(pl.toStep * pl.ppm) + '"></label>' +
        '<div class="sheetbtns"><button type="button" class="primary" data-a="stepsave">Save</button><button type="button" class="outline" data-a="sheetclose">Cancel</button></div>';
    }
    return '<div class="sheetback" data-a="sheetclose" aria-hidden="true"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + title.replace(/<[^>]+>/g, '') + '"><div class="sheetgrab" aria-hidden="true"></div><h3>' + title + '</h3><div class="stack" style="gap:14px">' + body + '</div></div>';
  }
  // ---------- Budget tabs ----------
  function icoBox(ic, key) { return '<span class="cicon" style="--c:' + colorFor(key) + '">' + ic + '</span>'; }
  // a semicircle of segments; lit segments show what's left
  function gauge(frac, status) {
    var n = 22, lit = Math.round(Math.max(0, Math.min(1, frac)) * n), out = '';
    for (var i = 0; i < n; i++) {
      var a = Math.PI - i / (n - 1) * Math.PI, r1 = 74, r2 = 96, cx = 110, cy = 104;
      out += '<line x1="' + (cx + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (cy - r1 * Math.sin(a)).toFixed(1) + '" x2="' + (cx + r2 * Math.cos(a)).toFixed(1) + '" y2="' + (cy - r2 * Math.sin(a)).toFixed(1) + '" class="' + (i < lit ? 'on' : '') + '"/>';
    }
    return '<svg class="gauge g-' + (status || 'ok') + '" viewBox="0 0 220 112" aria-hidden="true">' + out + '</svg>';
  }
  // paydays on a schedule that land in a calendar month
  function paydaysIn(anchorIso, freq, y, m) {
    var step = F.FREQS[freq].days, anchor = F.fromIso(anchorIso), first = new Date(y, m, 1), last = new Date(y, m + 1, 0), n = 0;
    for (var k = Math.floor(F.daysBetween(anchor, first) / step) - 1; k <= Math.ceil(F.daysBetween(anchor, last) / step) + 1; k++) { var d = F.addDays(anchor, k * step); if (d >= first && d <= last) n++; }
    return n;
  }
  // what a recurring expense really costs in one calendar month: weekly and every-2-weeks ones count each
  // date they land on (4 or 5 Fridays), yearly ones count only in the month they're due; without a due date, the average
  function billInMonth(b, y, m) {
    var f = b.freq || b.rep, a = num(b.amount);
    if (!b.due || !f || f === 'monthly') return F.billMonthly(b);
    if (f === 'weekly' || f === 'biweekly') return a * paydaysIn(b.due, f, y, m);
    if (f === 'yearly') return F.fromIso(b.due).getMonth() === m ? a : 0;
    return F.billMonthly(b);
  }
  // weeks (Sunday to Saturday) that start in a month: a weekly category or fund counts once for each
  // how many weeks start in a month (a weekly category's spending month)
  function weeksIn(y, m) { var n = 0, dim = new Date(y, m + 1, 0).getDate(), w = weekDay0(); for (var d = 1; d <= dim; d++) if (new Date(y, m, d).getDay() === w) n++; return n; }
  function catInMonth(c, y, m) { return c.per === 'week' ? num(c.amount) * weeksIn(y, m) : catMonthly(c); }
  function fundInMonth(f, y, m) { return f.per === 'week' ? num(f.amount) * daysIn(fundDay(f), y, m) : fundMonthly(f); }
  // the day a weekly fund saves on (0 Sunday ... 6 Saturday); payday's weekday until one is picked
  function fundDay(f) { return f.day >= 0 && f.day <= 6 ? +f.day : F.fromIso(P.nextPay || F.isoDay(today())).getDay(); }
  function daysIn(wd, y, m) { var n = 0, dim = new Date(y, m + 1, 0).getDate(); for (var d = 1; d <= dim; d++) if (new Date(y, m, d).getDay() === wd) n++; return n; }
  // this month's income (pay x paychecks that land in it) and what's left after everything with a job
  function monthMoney(ym) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1, n = paydaysIn(P.nextPay, P.freq, y, m), pl = F.plan(profile()), ppm = pl.ppm;
    var income = num(P.paycheck) * n + extraIncomes().reduce(function (t, x) { return t + num(x.amount) * paydaysIn(x.nextPay || P.nextPay, x.freq || 'biweekly', y, m); }, 0) + otherMonthly();
    var by = { need: 0, want: 0, debt: 0, save: 0, give: 0 };
    recurring().forEach(function (b) { if (!fromFund(b)) by[typeOf(b)] += billInMonth(b, y, m); });
    cats().forEach(function (c) { by[typeOf(c)] += catInMonth(c, y, m); });
    funds().forEach(function (f) { by.save += fundInMonth(f, y, m); }); by[lineMeta('fun').type || 'want'] += funMonthly(); by[lineMeta('basics').type || 'need'] += elseMonthly();
    pl.rows.forEach(function (r) { if (r.kind === 'min') by.debt += r.amount * ppm; else if (r.kind === 'give') by.give += r.amount * ppm; else if (r.kind === 'save') by.save += r.amount * ppm; else if (r.kind === 'goal') by.save += r.amount * n; });
    // the step takes its amount from each paycheck, but never more than this month has left
    var before = by.need + by.want + by.debt + by.save + by.give;
    by.save += Math.min(pl.toStep * n, Math.max(0, income - before));
    var budgeted = by.need + by.want + by.debt + by.save + by.give;
    return { income: income, paychecks: n, budgeted: budgeted, left: income - budgeted, by: by };
  }
  function incomeCard(ym) {
    var mm = monthMoney(ym), a = ym.split('-'), mname = new Date(+a[0], +a[1] - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    var chips = [['need', 'Needs'], ['want', 'Wants'], ['debt', 'Debt'], ['save', 'Savings'], ['give', 'Giving']].filter(function (t) { return mm.by[t[0]] > 0.5; });
    return '<div class="card inc-card"><button type="button" class="inc-edit" data-a="sheetopen" data-v="income">Edit</button><small>Income for ' + mname + '</small><div class="inc-big">' + money(mm.income) + '</div><small class="inc-n">' + plural(mm.paychecks, 'paycheck') + '</small>' +
      '<div class="inc-left' + (mm.left < -0.5 ? ' over' : Math.abs(mm.left) < 0.5 ? ' zero' : '') + '"><span>Left to budget</span><b>' + (mm.left < -0.5 ? '−' + money(-mm.left) : money(mm.left)) + '</b></div>' +
      (chips.length ? '<div class="inc-types">' + chips.map(function (t) { return '<span class="t-' + t[0] + '"><i></i>' + t[1] + ' ' + money(mm.by[t[0]]) + '</span>'; }).join('') + '</div>' : '') + '</div>';
  }
  // the month a plan starts in only counts from the start date (or the earliest purchase logged that month, if earlier):
  // someone who sets up on the 25th hasn't logged the 1st to the 24th, so the whole month's budget isn't theirs to spend
  function budFrom(ym) {
    var dim = new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate(), st = P.startedOn || (P.badges || {}).plan, from = 1;
    if (st && monthOf(st) === ym) {
      from = +st.slice(8, 10);
      (P.spends || []).forEach(function (x) { if (monthOf(x.date) === ym) from = Math.min(from, +String(x.date).slice(8, 10)); });
    }
    return { from: from, dim: dim, share: (dim - from + 1) / dim, started: !!st && monthOf(st) === ym && from === +st.slice(8, 10) };
  }
  function budSpend(ym) {
    var m = spentMap(ym), lines = spendLines().filter(function (l) { return l.grp === 'spend'; }), now = today(), isNow = ym === monthOf(F.isoDay(now));
    var bf = budFrom(ym), yy = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1, monOf = function (l) { return (l.per === 'week' ? l.amt * weeksIn(yy, mo) : l.mon) * bf.share; };
    var budget = lines.reduce(function (t, l) { return t + monOf(l); }, 0), spent = lines.reduce(function (t, l) { return t + (m[l.key] || 0); }, 0), left = budget - spent;
    var dl = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1, perDay = isNow && left > 0 ? left / dl : 0;
    // on track = spending at or under where the month's pace says it should be
    var pace = isNow ? budget * Math.max(1, now.getDate() - bf.from + 1) / (bf.dim - bf.from + 1) : budget;
    var status = !budget ? '' : spent > budget + 0.5 ? 'over' : isNow && spent > pace * 1.1 + 1 ? 'fast' : 'ok';
    var top = '<div class="card bud-top">' + (status ? '<span class="bstat ' + status + '">' + (status === 'over' ? 'Over budget' : status === 'fast' ? 'Spending fast' : 'On track') + '</span>' : '') +
      gauge(budget ? Math.max(0, left) / budget : 0, status) +
      '<div class="gmid"><small>' + (isNow ? 'Left to spend' : 'Spent') + '</small><div class="bud-big' + (left < -0.5 ? ' over' : '') + '">' + (isNow ? (left < -0.5 ? '−' + money2(-left) : money2(left)) : money2(spent)) + '</div></div>' +
      '<div class="bud-safe">' + (isNow ? (left < -0.5 ? money(-left) + ' over this month. It happens: next month is a fresh start.' : '<b>' + money2(perDay) + '/day</b> safe to spend · ' + plural(dl, 'day') + ' left') : money(spent) + ' of ' + money(budget) + ' budgeted') + '</div>' +
      (bf.from > 1 ? '<small class="bud-from">Counting from ' + F.fromIso(ym + '-' + String(bf.from).padStart(2, '0')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (bf.started ? ', when you started' : ', your first purchase') + '</small>' : '') + '</div>';
    var cards = lines.map(function (l) {
      var wk = l.per === 'week' && isNow ? weekOf(now) : null;
      var sp = wk ? linePurchases(l.key, wk[0], wk[1]).reduce(function (t, x) { return t + num(x.amount); }, 0) : m[l.key] || 0;
      var cap = wk ? l.amt : monOf(l), lf = cap - sp, pct = cap ? Math.round(sp / cap * 100) : (sp ? 100 : 0);
      var card = '<button type="button" class="ccard" data-a="catopen" data-v="' + l.key + '">' + icoBox(l.icon, l.key) + '<span class="cmid"><b>' + esc(l.label) + (l.type ? ' <span class="ttag t-' + l.type + '">' + TYPES.filter(function (t) { return t[0] === l.type; })[0][1] + '</span>' : '') + '</b><span class="cbar' + (lf < -0.5 ? ' over' : '') + '"><i style="width:' + Math.min(100, pct) + '%;background:' + colorFor(l.key) + '"></i></span>' +
        '<span class="crow"><span>' + (lf < -0.5 ? money2(-lf) + ' over' : money2(lf) + ' left') + (wk ? ' this week' + (wk[0].slice(0, 7) !== ym ? ' (since ' + shortDay(wk[0]) + ')' : '') : '') + '</span><span>' + money2(cap) + (l.per === 'week' ? '/wk' : '') + '</span></span>' + '</span></button>';
      return card;
    }).join('');
    var have = {}; lines.forEach(function (l) { have[l.label.toLowerCase()] = 1; });
    var add = U.catAdd ? '<div class="card stack" style="padding:14px 16px;gap:10px"><b>Add a spending category</b><div class="chips">' + BUILT_IN.filter(function (x) { return lineMeta(x[0]).hidden || (x[0] === 'fun' && !funSet()); }).map(function (x) { var m = lineMeta(x[0]); return '<button type="button" class="chip" data-a="catback" data-v="' + x[0] + '">' + (m.icon || x[2]) + ' ' + esc(m.name || x[1]) + '</button>'; }).join('') + SPEND_SUGGEST.filter(function (x) { return !have[x[0].toLowerCase()]; }).map(function (x) { return '<button type="button" class="chip" data-a="catadd" data-v="' + esc(x[0]) + '" data-i="' + x[1] + '">' + x[1] + ' ' + esc(x[0]) + '</button>'; }).join('') + '</div>' +
      '<div class="badd"><input type="text" data-catnew placeholder="Or name your own" maxlength="30" aria-label="Category name"><button type="button" class="sharebtn" data-a="catnew">Add</button></div><button type="button" class="textbtn" data-a="catadd" data-v="">Close</button></div>'
      : '<button type="button" class="outline" data-a="catadd" data-v="open">+ Add a category</button>';
    var rec = recurring().slice().sort(function (x, y) { return (x.due ? F.fromIso(x.due).getDate() : 40) - (y.due ? F.fromIso(y.due).getDate() : 40); });
    var recHtml = '<div class="bud-sec"><div><b>Recurring expenses</b></div><span>' + money(recurring().reduce(function (t, b) { return t + (fromFund(b) ? 0 : billInMonth(b, yy, mo)); }, 0)) + ' in ' + new Date(yy, mo, 1).toLocaleDateString('en-US', { month: 'short' }) + '</span></div>' +
      (rec.length ? '<div class="card rlist">' + rec.map(function (b) {
        var f = b.freq || 'monthly', nx = b.due ? nextDue(b, now) : null;
        return '<button type="button" class="rrow" data-a="recuropen" data-v="' + b.id + '">' + icoBox(b.icon || iconFor(b.name), 'b:' + b.id) + '<span class="cmid"><b>' + esc(b.name || 'Bill') + ' <span class="ttag t-' + typeOf(b) + '">' + TYPES.filter(function (t) { return t[0] === typeOf(b); })[0][1] + '</span></b><small>' + (b.due ? dueText2(b) + (nx ? ' · next ' + dayMonth(F.fromIso(nx)) : '') : 'Add a due date') + (fromFund(b) ? ' · from ' + esc((funds().filter(function (x) { return x.id === b.fund; })[0] || {}).name || 'fund') : '') + '</small></span><span class="ramt">' + money2(num(b.amount)) + '<small>' + (b.freq ? FREQ_LABEL[f] : b.per === 'yr' ? 'a year' : 'a month') + '</small></span></button>';
      }).join('') + '</div>' : '') +
      '<button type="button" class="outline" data-a="recuropen" data-v="">+ Add a recurring expense</button>';
    return top + '<div class="bud-sec"><div><b>Spending</b></div><span>' + money(budget) + '/mo</span></div>' + cards + add +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="sharebtn" data-a="spendnew">+ Add spending</button><button type="button" class="sharebtn ghost" data-a="go" data-v="spendlog">See all purchases</button></div>' + recHtml;
  }
  function budSave() {
    var p = profile(), o = F.outlook(p, today()), pl = o.plan, step = o.step, ppm = pl.ppm, sv = num(P.savings);
    var goal = step <= 2 ? F.CUSHION : pl.safetyNet, gname = step <= 2 ? '$1,000 Emergency Fund' : 'Full safety net';
    var where = step === 1 ? 'your $1,000 Emergency Fund' : step === 2 ? esc(o.target ? o.target.name : 'your smallest debt') : step === 3 ? 'your Full Safety Net' : 'investing';
    var stepCard = step <= 3 ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>To ' + where + '</b><div class="row" style="border:0;padding:4px 0"><span>Each month</span><span style="display:flex;gap:10px;align-items:center"><b>' + money(pl.toStep * ppm) + '</b><button type="button" class="sharebtn" data-a="sheetopen" data-v="stepmo">Change</button></span></div>' +
      '</div>' : '';
    var cushion = '<div class="card ccard static"' + (step >= 3 ? ' role="button" data-a="edit" data-v="safety"' : '') + '>' + icoBox('🛟', 'cushion') + '<span class="cmid"><b>' + gname + '</b><span class="cbar"><i style="width:' + Math.min(100, goal ? sv / goal * 100 : 0) + '%;background:var(--green)"></i></span><span class="crow"><span>' + money(sv) + ' saved</span><span>' + money(goal) + '</span></span></span></div>';
    var goals = P.goals.map(function (g) {
      return '<div class="card ccard static">' + icoBox('🎯', 'g:' + g.id) + '<span class="cmid"><b>' + esc(g.name) + '</b><span class="cbar"><i style="width:' + Math.min(100, num(g.amount) ? num(g.saved) / num(g.amount) * 100 : 0) + '%;background:' + colorFor('g:' + g.id) + '"></i></span><span class="crow"><span>' + money(num(g.saved)) + ' saved</span><span>' + money(num(g.amount)) + '</span></span>' + goalAside(g) + '</span></div>'; }).join('');
    var ret = retireOn() ? (P.retirements || []).filter(function (a) { return accMonthly(a) > 0; }).map(function (a, i) {
      return '<button type="button" class="ccard" data-a="edit" data-v="retire">' + icoBox('\uD83C\uDF34', 'ret:' + i) + '<span class="cmid"><b>' + esc(accLabel(a)) + '</b><span class="crow"><span>' + money(accMonthly(a)) + ' a month</span><span>' + (a.from === 'post' ? 'from take-home' : 'before payday · not in this budget') + '</span></span></span></button>'; }).join('') : '';
    var fym = curSpendMonth().split('-'), fy = +fym[0], fm = +fym[1] - 1, fThis = funds().reduce(function (t, f) { return t + fundInMonth(f, fy, fm); }, 0);
    var fundHtml = '<div class="bud-sec"><div><b>Saving funds</b></div>' + (funds().length ? '<span>' + money(fThis) + ' in ' + new Date(fy, fm, 1).toLocaleDateString('en-US', { month: 'short' }) + '</span>' : '') + '</div>' + funds().map(function (f) {
      return '<button type="button" class="ccard" data-a="fundopen" data-v="' + f.id + '">' + icoBox(f.icon || '\uD83D\uDCB0', 'u:' + f.id) + '<span class="cmid"><b>' + esc(f.name || 'Fund') + '</b><span class="crow"><span>' + money2(fundBal(f)) + '</span><span>+' + money2(num(f.amount)) + (f.per === 'week' ? ' every ' + DOW[fundDay(f)].slice(0, 3) : '/mo') + '</span></span></span></button>'; }).join('') +
      '<button type="button" class="outline" data-a="fundopen" data-v="">+ Add a fund</button>';
    return '<button type="button" class="primary" data-a="sheetopen" data-v="bal">Update balances</button>' + cushion + stepCard + fundHtml + '<div class="bud-sec"><div><b>Goals</b></div></div>' + goals + '<button type="button" class="outline" data-a="goalnew">+ Add a goal</button>' +
      '<div class="bud-sec"><div><b>Retirement</b></div></div>' + ret + '<button type="button" class="outline" data-a="edit" data-v="retire">' + (ret ? 'Edit retirement' : '+ Add retirement') + '</button>';
  }
  function homeRow() {
    var t = P.home === 'free' ? 'Paid off' : P.home === 'mortgage' ? (num(P.mortgage) ? money(num(P.mortgage)) + ' left' : 'Mortgage') : P.home === 'rent' ? 'Renting' : 'Not set';
    return '<div class="bud-sec"><div><b>Your home</b></div></div><button type="button" class="ccard" data-a="edit" data-v="house">' + icoBox('\uD83C\uDFE0', 'home') + '<span class="cmid"><b>Home</b><span class="crow"><span>' + t + '</span><span></span></span></span></button>';
  }
  function budDebt() {
    var o = F.outlook(profile(), today()), list = P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).slice().sort(function (a, b) { return (num(a.bal) || 1e12) - (num(b.bal) || 1e12); });
    var total = list.reduce(function (t, d) { return t + num(d.bal); }, 0), orig = list.reduce(function (t, d) { return t + Math.max(num(d.orig), num(d.bal)); }, 0), pays = {};
    (o.payoffs || []).forEach(function (x) { pays[x.id] = x; });
    if (!list.length) return '<div class="card bud-top"><small>Debt</small><div class="bud-big">$0</div></div><button type="button" class="outline" data-a="edit" data-v="debts">+ Add a debt</button>' + homeRow();
    return '<div class="card bud-top"><small>Debt left</small><div class="bud-big">' + money(total) + '</div><span class="spbar big"><i style="width:' + (orig ? (orig - total) / orig * 100 : 0) + '%;background:var(--green)"></i></span>' +
      '<div class="bud-safe">' + money(orig - total) + ' paid so far · ' + money(total) + ' to go</div></div>' +
      '<div class="bud-sec"><div><b>Smallest first</b></div></div>' +
      list.map(function (d, i) {
        var bal = num(d.bal), og = Math.max(num(d.orig), bal), x = pays[d.id], paid = bal <= 0;
        return '<div class="card ccard static' + (i === 0 && !paid ? ' first' : '') + '">' + icoBox(paid ? '✅' : '💳', 'd:' + d.id) + '<span class="cmid"><b>' + esc(d.name || 'Debt') + (i === 0 && !paid ? ' <span class="tag">Up next</span>' : '') + '</b><span class="cbar"><i style="width:' + (og ? (og - bal) / og * 100 : 0) + '%;background:var(--green)"></i></span>' +
          '<span class="crow"><span>' + (paid ? 'Paid off' : money(bal) + ' left · ' + money(num(d.min)) + '/mo') + '</span><span>' + (og ? Math.round((og - bal) / og * 100) + '% paid' : '') + '</span></span></span></div>';
      }).join('') +
      '<button type="button" class="outline" data-a="edit" data-v="debts">' + (list.length === 1 && list[0].lump ? 'List my debts' : 'Edit debts') + '</button>' + homeRow();
  }
  function shortDay(iso) { return F.fromIso(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function curSpendMonth() { return U.spendMonth || monthOf(F.isoDay(today())); }
  function monthName(ym) { var a = ym.split('-'); return new Date(+a[0], +a[1] - 1, 1).toLocaleDateString('en-US', { month: 'long' }); }
  // purchases added by hand, plus imported purchases from stores placed in a budget line
  function spentMap(month) {
    var m = {}, sl = P.storeLine || {}; month = month || curSpendMonth();
    P.spends.forEach(function (x) { if (monthOf(x.date) === month) m[x.key] = (m[x.key] || 0) + num(x.amount); });
    P.tx.forEach(function (x) { var k = sl[x.merchant]; if (k && monthOf(x.date) === month) m[k] = (m[k] || 0) + num(x.amount); });
    return m;
  }
  function linePurchases(key, from, to) {
    var sl = P.storeLine || {};
    return P.spends.filter(function (x) { return x.key === key && x.date >= from && x.date <= to; })
      .concat(P.tx.filter(function (x) { return sl[x.merchant] === key && x.date >= from && x.date <= to; }).map(function (x) { return { date: x.date, amount: x.amount, key: key, note: x.merchant, imported: true }; }))
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  }
  function spendTotals() {
    var m = spentMap(), lines = spendLines(), spent = 0, bud = 0;
    lines.forEach(function (l) { if (l.grp !== 'fund') { spent += m[l.key] || 0; bud += l.mon; } });
    Object.keys(m).forEach(function (k) { if (!isFundKey(k) && !lines.some(function (l) { return l.key === k; })) spent += m[k]; });
    return { spent: spent, bud: bud };
  }
  // imported stores (not transfers) that don't have a budget line yet, biggest first
  function unassignedStores() {
    if (!P.tx.length) return [];
    var sl = P.storeLine || {};
    return F.storeTotals(P.tx).filter(function (x) { return !sl[x.m] && P.sorted[x.m] !== 'skip'; }).sort(function (a, b) { return b.total - a.total; });
  }
  function assignTo(key) {
    var q = unassignedStores(); if (!q.length) return;
    P.storeLine = P.storeLine || {}; P.storeLine[q[0].m] = key; U.assignHist = U.assignHist || []; U.assignHist.push(q[0].m);
    // show the month the file covers, so the bars have something to count
    var last = P.txTo || P.tx[P.tx.length - 1].date; if (monthOf(last) !== curSpendMonth() && !P.spends.some(function (x) { return monthOf(x.date) === curSpendMonth(); })) U.spendMonth = monthOf(last);
    save(); render();
  }
  // "What if you found more?": extra dollars a month pull the next big date closer
  function whatIfGoal(o) { return o.target ? { label: 'Debt-free', date: o.debtFree } : o.step === 3 || o.step === 1 ? { label: 'Full safety net', date: o.safetyNet } : null; }
  function whatIfText(extra) {
    var base = profile(), o0 = F.outlook(base, today()), g0 = whatIfGoal(o0); if (!g0) return null;
    var now = today(), out = { label: g0.label };
    if (!extra) {
      out.date = g0.date ? shortDate(g0.date) : 'Not on this plan yet';
      out.sub = g0.date ? span(F.daysBetween(now, g0.date)) + ' from now' : 'Your paycheck doesn’t reach it yet. Slide to see what would.';
      return out;
    }
    var p1 = Object.assign({}, base, { paycheck: base.paycheck + extra / F.FREQS[base.freq].perMonth }), g1 = whatIfGoal(F.outlook(p1, now));
    var d1 = g1 && g1.date;
    out.date = d1 ? shortDate(d1) : 'Not on this plan yet';
    out.sub = '+' + money(extra) + ' a month' + (d1 && g0.date && g0.date > d1 ? ' · ' + span(F.daysBetween(d1, g0.date)) + ' sooner' : d1 && !g0.date ? ' · now within reach' : '');
    return out;
  }
  // goals, with the tradeoff slider; lives on the Plans & Goals tab
  function goalsCard() {
    var p = profile(), o = F.outlook(p, today()), pl = o.plan, step = o.step;
    var maxPer = Math.max(0, Math.min(500, Math.floor(Math.max(0, pl.extra + o.plan.rows.filter(function (r) { return r.kind === 'goal'; }).reduce(function (t2, r) { return t2 + r.amount; }, 0)) / 10) * 10));
    var goals = '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0 0 4px"><h3>Your goals</h3><span style="font-size:13px;color:var(--faint)">' + P.goals.length + ' of 3</span></div>' +
      (P.goals.length ? P.goals.map(function (g, i) {
        var go2 = o.goals[i], done = num(g.saved) >= g.amount;
        var slider = g.kind === 'dream' && !g.by && !done && step <= 2 ? (maxPer ? '<label class="field" style="font-weight:500;font-size:13px">Put toward it now: <b data-gv="' + g.id + '" style="color:var(--ink)">' + money(g.per || 0) + ' per paycheck</b>' +
          '<input type="range" min="0" max="' + maxPer + '" step="10" value="' + Math.min(g.per || 0, maxPer) + '" data-slide="' + g.id + '"></label>' : '') : '';
        return '<div class="debt"><div class="top"><span>' + esc(g.name) + '<span class="tag">' + (g.kind === 'fund' ? 'Plan-for-it' : 'Dream') + '</span></span><b>' + money(num(g.saved)) + ' of ' + money(g.amount) + '</b></div>' +
          '<div class="bar goalbar" style="flex:none"><i style="width:' + Math.max(1, num(g.saved) / g.amount * 100) + '%"></i></div>' +
          '<div style="font-size:13px;color:var(--muted)" data-gp="' + g.id + '">' + (done ? 'Fully funded. Go enjoy it.' : goalText(g, go2, o)) + '</div>' + slider +
          '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="goaldel" data-i="' + i + '">Remove</button></div>';
      }).join('') : '<p style="font-size:14px;padding:4px 0 2px">A trip, a car, a concert, a gift. Name it and we’ll give it a date.</p>') +
      (P.goals.length < 3 ? '<button type="button" class="outline" style="min-height:44px;margin:8px 0 12px;font-size:15px" data-a="goalnew">+ Add a goal</button>' : '') + '</div>';
    return goals;
  }
  // ---------- the activity calendar ----------
  // paydays in a month (they keep their ring on the calendar: the app runs on paydays)
  function paydaySet(y, m) {
    var out = {}, first = new Date(y, m, 1), last = new Date(y, m + 1, 0), add = function (iso) { var d = F.fromIso(iso); if (d.getFullYear() === y && d.getMonth() === m) out[iso] = 1; };
    var walk = function (anchorIso, freq) { var step = F.FREQS[freq].days, an = F.fromIso(anchorIso); for (var k = Math.floor(F.daysBetween(an, first) / step) - 1; k <= Math.ceil(F.daysBetween(an, last) / step) + 1; k++) add(F.isoDay(F.addDays(an, k * step))); };
    walk(P.nextPay, P.freq);
    extraIncomes().forEach(function (x) { walk(x.nextPay || P.nextPay, x.freq || 'biweekly'); });
    return out;
  }
  // purchases by day: { iso: [{ note, amount }] }
  function spendByDay(y, m) {
    var out = {}, add = function (iso, note, amt) { var d = F.fromIso(iso); if (d.getFullYear() !== y || d.getMonth() !== m) return; (out[iso] = out[iso] || []).push({ note: note, amount: num(amt) }); };
    var lines = {}; spendLines().forEach(function (l) { lines[l.key] = l.label; });
    (P.spends || []).forEach(function (x) { add(x.date, x.note || lines[x.key] || 'Purchase', x.amount); });
    return out;
  }
  // the Activity calendar: each day's circle comes from the daily checklist (light = some done, dark = all 5),
  // today is an open ring until it's full, paydays keep their ring. Never red, never an X, even on a challenge restart day.
  function calendarCard() {
    var now = today(), cur = U.calMonth || [now.getFullYear(), now.getMonth()], y = cur[0], m = cur[1];
    if (U.calTab === 'spend') return calSpendCard(now, y, m);
    var pays = paydaySet(y, m), first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), todayIso = F.isoDay(now), cells = '', fullN = 0, mon = first.toLocaleDateString('en-US', { month: 'long' });
    for (var b = 0; b < (first.getDay() - weekDay0() + 7) % 7; b++) cells += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var iso = F.isoDay(new Date(y, m, d)), st = D.state(P, iso, todayIso), n = st === 'future' ? 0 : D.tasks(P, iso).n;
      if (st === 'full') fullN++;
      var label = d + ' ' + mon + (st === 'future' ? '' : ': ' + n + ' of 5') + (pays[iso] ? ', payday' : '');
      cells += '<button type="button" class="cday act s-' + st + (pays[iso] ? ' pay' : '') + (iso === todayIso ? ' today' : '') + (U.calDay === iso ? ' sel' : '') + '" data-a="calday" data-v="' + iso + '" aria-label="' + esc(label) + '"><span>' + d + '</span></button>';
    }
    // a day's panel: read-only, its 5 tasks and its gratitude line
    var sel = '';
    if (U.calDay && U.calDay.slice(0, 7) === F.isoDay(first).slice(0, 7) && U.calDay <= todayIso) {
      var t = D.tasks(P, U.calDay), g = String(chRec(U.calDay).gratitude || '').trim();
      sel = '<div class="calsel"><b>' + chDate(U.calDay) + (pays[U.calDay] ? ' · Payday' : '') + '</b>' +
        CH_TASKS.map(function (x) { return '<div class="' + (t[x[0]] ? 'on' : '') + '"><i aria-hidden="true">' + (t[x[0]] ? '✓' : '') + '</i>' + x[1] + ' ' + esc(x[2]) + '</div>'; }).join('') +
        (g ? '<p class="chquote">“' + esc(g) + '”</p>' : '') +
        (U.calDay === todayIso ? '<button type="button" class="linkbtn" data-a="go" data-v="journey">Open today ›</button>' : '') + '</div>';
    }
    var nb = upcomingBills(14).sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; })[0];
    return '<div class="card stack cal" style="padding:16px 18px;gap:10px">' + calTabs() + '<div style="display:flex;justify-content:space-between;align-items:center"><button type="button" class="back calnav" data-a="calmove" data-v="-1" aria-label="Previous month">‹</button>' +
      '<div style="text-align:center"><b>' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</b><small style="display:block;color:var(--faint);font-size:12px">' + (fullN ? plural(fullN, 'full day') + ' this month' : 'Your days show up here') + '</small></div>' +
      '<button type="button" class="back calnav" data-a="calmove" data-v="1" aria-label="Next month">›</button></div>' +
      '<div class="cgrid" aria-hidden="true">' + dowLetters().map(function (x) { return '<span class="cdow">' + x + '</span>'; }).join('') + '</div>' +
      '<div class="cgrid">' + cells + '</div>' + sel +
      '<div class="clegend"><span><i class="lg-full"></i>All 5</span><span><i class="lg-some"></i>Some</span><span><i class="cal-pay ring"></i>Payday</span></div>' +
      (nb ? '<button type="button" class="linkbtn calbill" data-a="go" data-v="plan">Next bill: ' + esc(nb.name) + ' · ' + chDate(nb.iso) + ' · ' + money(nb.amt) + ' ›</button>' : '') + '</div>';
  }
  function calTabs() { return '<div class="seg caltabs" role="group" aria-label="Calendar view">' + [['due', 'Activity'], ['spend', 'Spending']].map(function (t) { var on = (U.calTab || 'due') === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="caltab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>'; }
  // the same month, with what was spent on each day
  function calSpendCard(now, y, m) {
    var by = spendByDay(y, m), first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), todayIso = F.isoDay(now), cells = '', total = 0;
    for (var b = 0; b < (first.getDay() - weekDay0() + 7) % 7; b++) cells += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var iso = F.isoDay(new Date(y, m, d)), list = by[iso] || [], sum = list.reduce(function (t, x) { return t + x.amount; }, 0); total += sum;
      cells += '<button type="button" class="cday sp' + (iso === todayIso ? ' today' : '') + (iso > todayIso ? ' future' : '') + '" data-a="spday" data-v="' + iso + '" aria-label="' + esc(d + ' ' + first.toLocaleDateString('en-US', { month: 'long' }) + (sum ? ': ' + money(sum) + ' spent' : '')) + '"><span>' + d + '</span><em class="spamt">' + (sum ? '$' + (sum >= 1000 ? (sum / 1000).toFixed(1) + 'k' : Math.round(sum)) : '') + '</em></button>';
    }
    var sel = '', pm = new Date(y, m - 1, 1), prev = spendByDay(pm.getFullYear(), pm.getMonth()), prevTotal = Object.keys(prev).reduce(function (t, k) { return t + prev[k].reduce(function (a, x) { return a + x.amount; }, 0); }, 0);
    var vs = prevTotal > 0 ? Math.round((total - prevTotal) / prevTotal * 100) : null, pmName = pm.toLocaleDateString('en-US', { month: 'long' });
    return '<div class="card stack cal" style="padding:16px 18px;gap:10px">' + calTabs() + '<div style="display:flex;justify-content:space-between;align-items:center"><button type="button" class="back calnav" data-a="calmove" data-v="-1" aria-label="Previous month">‹</button>' +
      '<div style="text-align:center"><b>' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</b><small style="display:block;color:var(--faint);font-size:12px">' + (total ? money(total) + ' spent' : 'Purchases you add show up here') + '</small>' +
        (vs != null ? '<span class="calvs ' + (vs <= 0 ? 'down' : 'up') + '">' + (vs <= 0 ? '↓ ' : '↑ ') + Math.abs(vs) + '% vs ' + pmName + '</span>' : '') + '</div>' +
      '<button type="button" class="back calnav" data-a="calmove" data-v="1" aria-label="Next month">›</button></div>' +
      '<div class="cgrid" aria-hidden="true">' + dowLetters().map(function (x) { return '<span class="cdow">' + x + '</span>'; }).join('') + '</div>' +
      '<div class="cgrid">' + cells + '</div>' + sel + '</div>';
  }
  // ---------- bill due dates, repeating, shown on the calendar ----------
  var REPEATS = [['monthly', 'Monthly'], ['biweekly', 'Every 2 weeks'], ['weekly', 'Weekly'], ['yearly', 'Yearly'], ['once', 'One time']];
  function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function dueText(b) {
    var d = F.fromIso(b.due), rp = b.rep || 'monthly';
    if (rp === 'monthly') return 'Due the ' + ordinal(d.getDate()) + ' \u00b7 monthly';
    if (rp === 'yearly') return 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' \u00b7 yearly';
    if (rp === 'weekly') return 'Due ' + d.toLocaleDateString('en-US', { weekday: 'long' }) + 's \u00b7 weekly';
    if (rp === 'biweekly') return 'Every 2 weeks \u00b7 next ' + dayMonth(F.fromIso(nextDue(b, today())));
    return 'Due ' + dayMonth(d);
  }
  // the pill next to a bill's name: "Date" until set, then the short due day
  function dueShort(b) {
    var d = F.fromIso(b.due), rp = b.rep || 'monthly';
    return rp === 'monthly' ? ordinal(d.getDate()) : rp === 'yearly' ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : rp === 'weekly' ? 'Every ' + d.toLocaleDateString('en-US', { weekday: 'short' }) : rp === 'biweekly' ? 'Every 2 wks' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function duePill(b, i) {
    return '<button type="button" class="duepill' + (b.due ? ' set' : '') + '" data-a="duedit" data-i="' + i + '" aria-label="' + (b.due ? esc(dueText(b)) + '. Change due date' : 'Add a due date') + '">' + (b.due ? dueShort(b) : 'Date') + '</button>';
  }
  // what one payment of this bill is, from its monthly (or yearly) amount
  function dueAmount(b) {
    var rp = b.rep || 'monthly', mo = F.billMonthly(b);
    return rp === 'yearly' ? (b.per === 'yr' ? num(b.amount) : mo * 12) : rp === 'weekly' ? mo * 12 / 52 : rp === 'biweekly' ? mo * 12 / 26 : rp === 'once' ? num(b.amount) : mo;
  }
  // every date a bill is due between two days (inclusive)
  function billDates(b, from, to) {
    if (!b.due) return [];
    var start = F.fromIso(b.due), rp = b.rep || 'monthly', out = [], fi = F.isoDay(from), ti = F.isoDay(to), push = function (d) { var i = F.isoDay(d); if (i >= fi && i <= ti && i >= b.due) out.push(i); };
    if (rp === 'once') push(start);
    else if (rp === 'weekly' || rp === 'biweekly') {
      var st = rp === 'weekly' ? 7 : 14, k = Math.max(0, Math.floor(F.daysBetween(start, from) / st));
      for (var d = F.addDays(start, k * st); F.isoDay(d) <= ti; d = F.addDays(d, st)) push(d);
    } else {
      for (var y = from.getFullYear(), m = from.getMonth(); new Date(y, m, 1) <= to; m++) {
        if (rp === 'yearly' && m % 12 !== start.getMonth()) continue;
        var dim = new Date(y, m + 1, 0).getDate(); push(new Date(y, m, Math.min(start.getDate(), dim)));
      }
    }
    return out;
  }
  function nextDue(b, from) { var l = billDates(b, from, F.addDays(from, 400)); return l[0] || b.due; }
  function dueForm(i) {
    var f = U.dueForm || {};
    return '<div class="dueform"><label class="field">First due date<input type="date" data-duedate value="' + esc(f.date || '') + '"></label>' +
      '<div class="field">Repeats<div class="seg wrap" role="group" aria-label="Repeats">' + REPEATS.map(function (x) { var on = f.rep === x[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="duerep" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn" data-a="duesave" data-i="' + i + '">Save</button>' + (P.bills[i].due ? '<button type="button" class="sharebtn ghost" data-a="dueclear" data-i="' + i + '">Remove date</button>' : '') + '<button type="button" class="sharebtn ghost" data-a="duecancel">Cancel</button></div></div>';
  }
  function upcomingBills(days) {
    var now = today(), to = F.addDays(now, days), out = [];
    if (itemized()) P.bills.forEach(function (b) { if (F.billMonthly(b) > 0 || b.rep === 'once') billDates(b, now, to).forEach(function (iso) { out.push({ iso: iso, name: b.name || 'Bill', amt: dueAmount(b) }); }); });
    return out.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; });
  }
  // ---------- the 30-second "find my money" ----------
  // the money to reclaim: debt payments you keep once the debt is gone, plus money that has no job yet
  function quickMath() {
    var q = P.quick || {}, pay = num(q.pay), exp = num(q.exp), debt = num(q.debt), min = num(q.min), noJob = Math.round(pay - exp - min);
    return { pay: pay, exp: exp, debt: debt, min: Math.round(min), noJob: noJob, total: Math.max(0, Math.round(min + Math.max(0, noJob))) };
  }
  // Pay that changes: plan on a safe number from recent paychecks
  function payStats() {
    var v = (P.payHist || []).map(function (x) { return num(x.amount); }).filter(function (n) { return n > 0; });
    if (v.length < 2) return null;
    return { n: v.length, low: Math.min.apply(null, v), avg: v.reduce(function (a, b) { return a + b; }, 0) / v.length, high: Math.max.apply(null, v) };
  }
  function payFromHist() { var st = payStats(); if (st && P.payVaries) P.paycheck = String(Math.round(P.payBasis === 'avg' ? st.avg : st.low)); }
  function payVaryBox() {
    var st = payStats(), hist = P.payHist || [];
    return '<div class="field">Does your pay change from check to check?<div class="seg" role="group" aria-label="Does your pay change" style="align-self:flex-start">' +
      [[false, 'About the same'], [true, 'It changes']].map(function (o) { var on = !!P.payVaries === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="payvary" data-v="' + (o[0] ? '1' : '') + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      (!P.payVaries ? '' : '<div class="stack" style="gap:10px"><small style="color:var(--muted);font-size:14px">Tips, commission, gig work or changing hours? Add your last few paychecks. We’ll plan on a safe number.</small>' +
        hist.map(function (x, i) { return '<div class="rowedit" style="grid-template-columns:minmax(0,1fr) auto"><input type="number" inputmode="decimal" aria-label="Paycheck ' + (i + 1) + '" data-f="x" data-list="payHist" data-i="' + i + '" data-k="amount" value="' + esc(x.amount) + '" placeholder="$ take-home"><button type="button" class="x" data-a="rm" data-v="payHist" data-i="' + i + '" aria-label="Remove paycheck ' + (i + 1) + '">×</button></div>'; }).join('') +
        (hist.length < 8 ? '<button type="button" class="chip" data-a="payhistadd" style="align-self:flex-start">+ Add a paycheck</button>' : '') +
        '<div data-live="paystats">' + payStatsHtml(st) + '</div></div>');
  }
  function payStatsHtml(st) {
    if (!st) return '<small style="color:var(--faint)">Add at least 2 to see your safe number. Until then, use a lower-than-usual paycheck above.</small>';
    return '<div class="field">Plan on<div class="seg" role="group" aria-label="Plan on" style="align-self:flex-start">' + [['low', 'My lowest: ' + money(st.low)], ['avg', 'My average: ' + money(st.avg)]].map(function (o) {
      var on = (P.payBasis || 'low') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="paybasis" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<small style="color:var(--muted);font-size:14px">' + ((P.payBasis || 'low') === 'low' ? 'Safest: your plan works even on a slow payday. Bigger checks go to your step.' : 'Your plan follows a typical payday. On slower ones, lean on your emergency fund or fun money.') + '</small>';
  }
  // Paycheck 2, 3...: name, amount, how often, next payday. compact = the 30-second screen
  function incomeCards(compact) {
    return (P.incomes || []).map(function (x, i) {
      var at = function (k, label, ph, type) { return '<label class="field">' + label + '<input type="' + (type || 'number') + '"' + (type ? '' : ' inputmode="decimal" min="0"') + ' data-f="x" data-list="incomes" data-i="' + i + '" data-k="' + k + '" value="' + esc(x[k] || '') + '" placeholder="' + ph + '"></label>'; };
      return '<div class="' + (compact ? 'stack' : 'card stack') + '" style="' + (compact ? 'gap:10px' : 'padding:16px 18px;gap:14px') + '"><div class="paylabel"><b>Paycheck ' + (i + 2) + '</b><input type="text" data-f="x" data-list="incomes" data-i="' + i + '" data-k="label" value="' + esc(x.label || '') + '" placeholder="Spouse" aria-label="Whose paycheck" maxlength="20">' +
        '<button type="button" class="x" data-a="rm" data-v="incomes" data-i="' + i + '" aria-label="Remove paycheck ' + (i + 2) + '">\u00d7</button></div>' +
        at('amount', 'Take-home pay per paycheck', '1400') +
        '<div class="field">How often?<div class="seg wrap" role="group" aria-label="How often">' + Object.keys(F.FREQS).map(function (k) {
          var on = (x.freq || 'biweekly') === k; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="incfreq" data-i="' + i + '" data-v="' + k + '">' + F.FREQS[k].label + '</button>'; }).join('') + '</div></div>' +
        (compact ? '' : at('nextPay', 'Next payday', '', 'date')) + '</div>';
    }).join('');
  }
  function quickMonthNote() {
    var m = monthlyIncome();
    return m > 0 ? '\u2248 ' + money(m) + ' a month after taxes' + (extraIncomes().length ? ', together' : '') : 'What actually lands in your account after taxes.';
  }
  function quickApply() {
    P.quick = { pay: monthlyIncome(), exp: num(P.qExp), debt: num(P.qDebt), min: num(P.qMin) };
    // the 30-second numbers only power the estimate; the budget starts empty and the person fills it in
  }
  // how far along the current step is, 0 to 1
  function stepProgress(o) {
    if (o.step === 1) return num(P.savings) / 1000;
    if (o.step === 2) { var orig = 0, bal = 0; P.debts.forEach(function (d) { orig += Math.max(num(d.orig), num(d.bal)); bal += num(d.bal); }); return orig ? 1 - bal / orig : 0; }
    if (o.step === 3) return o.plan.safetyNet ? num(P.savings) / o.plan.safetyNet : 0;
    return 0;
  }
  // the one date the home screen counts down to, by step
  function headline(o) {
    if (o.step === 1) return { kind: 'cushion', date: o.cushion, label: 'Step 1 · $1,000 Emergency Fund' };
    if (o.step === 2) return { kind: 'debt-' + o.target.id, date: o.targetDone, label: 'Step 2 · ' + esc(o.target.name) + ' paid off in' };
    if (o.step === 3) return { kind: 'safety', date: o.safetyNet, label: 'Step 3 · Full Safety Net in' };
    return { kind: 'done', date: null, label: 'Step 4 · Future You' };
  }

  var V = {
    welcome: function () { return U.front ? frontPage() : V.ob(); },
    meals: function () { return mealsScreen(); },
    ob: function () {
      var k = OB[obAt()], i = obAt(), name = firstName(), who = esc(name || 'friend'), err = U.err ? '<p class="oberr" role="alert">' + esc(U.err) + '</p>' : '', it = P.intro || {};
      // one screen-view event per screen, so drop-off shows step by step (no answers or numbers are sent)
      U.obSeen = U.obSeen || {}; if (!U.obSeen[k]) { U.obSeen[k] = 1; track('fo-' + (i + 1) + '-' + k); }
      var top = i > 0 ? '<div class="obtop"><button type="button" class="obback" data-a="obback" aria-label="Back">\u2039</button>' + (OB_ASK.indexOf(k) >= 0 ? '<div class="obbar"><i style="width:' + Math.round((OB_ASK.indexOf(k) + 1) / OB_ASK.length * 100) + '%"></i></div>' : '') + '</div>' : '';
      var wrap = function (body, foot) { return '<div class="ob ob-' + k + '">' + top + '<div class="obbody">' + body + '</div><div class="obfoot">' + err + foot + '</div></div>'; };
      var tap = '<button type="button" class="obtap" data-a="obnext">Tap to continue ' + obArrow() + '</button>';
      var pick = function (key, opts) { return '<div class="obopts">' + opts.map(function (o) { return '<button type="button" class="obopt' + (it[key] === o[0] ? ' on' : '') + '" data-a="obpick" data-k="' + key + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
      if (k === 'story1') return wrap('<h1 class="obbig">ever wonder where your ' + hi('paycheck') + ' goes?</h1>' +
          '<p class="obline">payday hits<br>a week later<br>' + hi('it\u2019s already gone') + '</p>' +
          '<p class="obline">coffee, takeout, a few clicks online<br>it ' + hi('adds up fast') + '</p>' +
          '<p class="obline">you\u2019re not bad with money<br>you just ' + hi('don\u2019t have a plan') + ' yet</p>',
        tap + (cloudOn() && !S ? '<button type="button" class="oblink" data-a="go" data-v="account">Already have an account? Sign in</button>' : '') +
        (storageOk ? '' : '<p class="oberr">This browser is blocking saved data (private browsing?), so your plan won\u2019t be kept. Open it in a regular tab.</p>'));
      if (k === 'story2') return wrap('<h1 class="obbig">your money needs ' + hi('a plan') + '<br>not more willpower</h1>' +
          '<p class="obline">Find Me the Money gives every dollar ' + hi('a job') + '</p>' +
          '<p class="obline">finds the money ' + hi('slipping away') + '</p>' +
          '<p class="obline">and walks you through ' + hi('your journey') + ' from stressed to peace</p>', tap);
      if (k === 'name') return wrap('<p class="obkicker">first things first</p><h1 class="obq">What should we call you?</h1>' +
          '<label class="obin"><input type="text" autocomplete="given-name" autocapitalize="words" data-obname value="' + esc(name) + '" placeholder="First name" maxlength="40"></label>', obBtn('Continue', 'obnext'));
      if (k === 'feel') { var fv = it.feel == null ? 50 : it.feel;
        return wrap('<p class="obkicker">about you</p><h1 class="obq">' + who + ', how does money feel right now?</h1>' +
          '<div class="obslide"><input type="range" min="0" max="100" step="1" value="' + fv + '" data-obfeel aria-label="How money feels, calm to stressed"><div class="obends"><span>calm</span><span>stressed</span></div></div>', obBtn('Continue', 'obnext')); }
      if (k === 'first') return wrap('<p class="obkicker">about you</p><h1 class="obq">What would you do with extra money?</h1>' + pick('first', OB_FIRST), '');
      if (k === 'way') return wrap('<p class="obkicker">about you</p><h1 class="obq">What\u2019s in the way?</h1>' + pick('way', OB_WAY), '');
      if (k === 'heard') {
        var f0 = OB_FIRST.filter(function (x) { return x[0] === it.first; })[0], w0 = OB_WAY.filter(function (x) { return x[0] === it.way; })[0], fe = it.feel == null ? 50 : it.feel;
        // TODO: a "you're not alone" line goes here only with a real, cited statistic from Brad. Never make one up.
        return wrap('<p class="obkicker">here\u2019s what we heard</p>' +
          '<div class="obheard"><small>where you want to go</small><b>' + (f0 ? f0[2] : 'A plan that works') + '</b></div>' +
          '<div class="obheard"><small>where you are now</small><b>' + (fe < 34 ? 'Pretty calm, and ready to make it better.' : fe < 67 ? 'Some days fine, some days tight.' : 'Stressed, and tired of it.') + '</b></div>' +
          '<div class="obheard"><small>what\u2019s in the way</small><b>' + (w0 ? w0[1] : 'Not sure yet') + '</b>' + (w0 ? '<span>\u2192 ' + w0[2] + '</span>' : '') + '</div>', obBtn('Continue', 'obnext'));
      }
      if (k === 'four') return wrap('<h1 class="obbig">let\u2019s find your ' + hi('money') + '</h1><p class="obline">4 numbers \u00b7 about 60 seconds</p>' +
          '<div class="obfour">' + ['Take-home pay', 'Monthly bills', 'Total debt', 'Debt payments'].map(function (t, n) { return '<div><b>' + (n + 1) + '</b>' + t + '</div>'; }).join('') + '</div>' +
          '<p class="obhint" style="margin-top:0">A rough guess is fine. Your progress saves as you go.</p>', obBtn('Let\u2019s go', 'obnext'));
      if (k === 'pay') return wrap('<p class="obkicker">your numbers \u00b7 1 of 4</p><h1 class="obq">How much is your take-home pay?</h1>' + obInput('paycheck', '0', '$') +
          '<p class="obhint">What lands in your account each payday, after taxes. A rough guess is fine.</p>', obBtn('Continue', 'obnext'));
      if (k === 'exp') return wrap('<p class="obkicker">your numbers \u00b7 2 of 4</p><h1 class="obq">About how much are your monthly bills?</h1>' + obInput('qExp', '0', '$') +
          '<p class="obhint">Rent, utilities, groceries, gas, phone, everything you spend except debt payments.</p>', obBtn('Continue', 'obnext'));
      if (k === 'debt') return wrap('<p class="obkicker">your numbers \u00b7 3 of 4</p><h1 class="obq">How much debt do you have, besides your home?</h1>' + obInput('qDebt', '0', '$') +
          '<p class="obhint">Credit cards, car, student loans, buy now pay later, medical. One rough total.</p>',
        obBtn('Continue', 'obnext') + '<button type="button" class="oblink" data-a="obnodebt">I don\u2019t have any debt</button>');
      if (k === 'mins') return wrap('<p class="obkicker">your numbers \u00b7 4 of 4</p><h1 class="obq">What are your debt payments each month?</h1>' + obInput('qMin', '0', '$') +
          '<p class="obhint">All your minimum payments added together.</p>', obBtn('Continue', 'obnext'));
      if (k === 'freq') return wrap('<p class="obkicker">your numbers \u00b7 1 of 4</p><h1 class="obq">How often do you get paid?</h1><div class="obopts">' + [['weekly', 'Every week'], ['biweekly', 'Every other week'], ['semimonthly', 'Twice a month'], ['monthly', 'Once a month']].map(function (f) {
          return '<button type="button" class="obopt' + (P.freq === f[0] ? ' on' : '') + '" data-a="obfreq" data-v="' + f[0] + '">' + f[1] + '</button>'; }).join('') + '</div>', '');
      if (k === 'nextpay') return wrap('<p class="obkicker">your numbers \u00b7 1 of 4</p><h1 class="obq">When\u2019s your next payday?</h1>' +
          '<label class="obin"><input type="date" data-f="nextPay" data-obecho value="' + esc(P.nextPay) + '"></label><p class="obline obecho" data-live="obecho" style="font-size:18px">' + payEcho() + '</p>', obBtn('Continue', 'obnext'));
      if (k === 'finding') {
        // a short "finding your money" moment: real steps, then the reveal
        clearTimeout(U.obTimer); U.obTimer = setTimeout(function () { if (U.screen === 'welcome' && OB[obAt()] === 'finding') obGo('found'); }, 2100);
        return wrap('<h1 class="obbig" style="font-size:32px">finding your ' + hi('money') + '\u2026</h1><div class="obfind">' + ['adding up your bills', 'setting aside debt payments', 'finding what\u2019s left'].map(function (t, n) {
          return '<div style="--d:' + (0.25 + n * 0.55).toFixed(2) + 's"><b>' + ICON.check('#141414', 14) + '</b>' + t + '</div>'; }).join('') + '</div>', '');
      }
      if (k === 'found') {
        var q = quickMath(), fm = q.noJob, math = money(q.pay) + ' \u2212 ' + money(q.exp) + ' bills' + (q.min > 0 ? ' \u2212 ' + money(q.min) + ' debt payments' : '') + ' = ' + (fm < 0 ? '\u2212' + money(-fm) : money(fm)) + '/mo';
        if (fm <= 0) return wrap('<p class="obkicker">' + who + ', here\u2019s where you are</p><h1 class="obbig" style="font-size:32px">your bills and payments use up ' + hi(fm < 0 ? 'more than' : 'all of') + ' your paycheck right now.</h1>' +
            '<p class="obmath">' + math + '</p><p class="obline">That\u2019s more common than you think, and it\u2019s exactly where the plan starts. First we ' + hi('make room') + ': a short lesson on needs and wants, a fun-money limit, and one canceled subscription.</p>',
          obBtn('Show me how', 'obnext') + communityLink());
        return wrap('<div class="obconf" aria-hidden="true">' + confetti(26, 0) + '</div><p class="obkicker">' + who + ', we found</p><div class="obfound">' + money(fm) + '<span>a month</span></div>' +
            '<h1 class="obbig" style="font-size:30px">That\u2019s ' + hi(money(fm * 12)) + ' a year.</h1><p class="obmath">' + math + '</p>' +
            (q.min > 0 ? '<p class="obline" style="font-size:17px">Plus ' + hi(money(q.min) + '/mo') + ' more once you\u2019re debt-free.</p>' : ''),
          obBtn('Reclaim my money', 'obnext') + communityLink());
      }
      if (k === 'first4') {
        // the first goal in plain words: no dates, no payday counts
        var qq = quickMath(), per = Math.round(qq.noJob / F.FREQS[P.freq].perMonth);
        if (!(per > 0)) return wrap('<p class="obkicker">' + who + ', here’s where we start</p><h1 class="obq">First, we make room.</h1>' +
            '<div class="obfirst4">' + [['1', 'Needs vs wants', 'A 1-minute lesson'], ['2', 'Set a limit for fun spending', 'Eating out, shopping, extras'], ['3', 'Cancel one subscription', 'One you won’t miss']].map(function (r, n) { return '<div style="--d:' + (0.15 + n * 0.2).toFixed(2) + 's"><small>' + r[0] + ' · ' + r[2] + '</small><b>' + r[1] + '</b></div>'; }).join('') + '</div>' +
            '<p class="obline" style="font-size:17px">Once there’s room, your money starts going to ' + hi('$1,000 for emergencies') + '.</p>', obBtn('Start my plan', 'obnext'));
        return wrap('<p class="obkicker">' + who + ', your first goal</p><div class="obfound" style="font-size:60px">$1,000<span>for emergencies</span></div>' +
            '<p class="obline">So a flat tire or a doctor visit doesn’t go on a credit card.</p>', obBtn('Start my plan', 'obnext'));
      }
      // save: email, then the code
      var st = U.cloudStep, m = me();
      if (!cloudOn()) return wrap('<h1 class="obbig">your plan is ' + hi('ready') + '.</h1>', obBtn('Show me my path', 'obskip'));
      if (st && st.sent) return wrap('<p class="obkicker">almost there</p><h1 class="obq">Check your email</h1><p class="obline" style="font-size:17px">We sent a sign-in code to ' + hi(esc(st.email)) + '. Not there in a minute? Check your junk folder.</p>' +
          '<label class="obin"><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" data-ccode placeholder="Code"></label>' +
          '<div class="oblinks"><button type="button" class="oblink" data-a="csend">Send a new code</button><button type="button" class="oblink" data-a="creset">Use a different email</button></div>',
        obBtn('Sign in', 'cverify') + ((U.codeTries || 0) >= 2 ? '<button type="button" class="oblink" data-a="obskip">Having trouble? Continue for now</button>' : ''));
      return wrap('<p class="obkicker">last step</p><h1 class="obq">Save your plan</h1><p class="obline" style="font-size:17px">So it\u2019s ' + hi('safe') + ' if you lose your phone or get a new one. Free, and no password: we email you a code.</p>' +
          '<label class="obin"><input type="email" inputmode="email" autocomplete="email" data-cemail value="' + esc(st && st.email || '') + '" placeholder="you@example.com"></label>' +
          '<label class="optin"><input type="checkbox" data-coptin' + (m.optIn === false ? '' : ' checked') + '><span>Send me money tips and updates from Brad. Unsubscribe anytime.</span></label>',
        obBtn('Email me a code', 'csend') + ((U.codeTries || 0) >= 2 ? '<button type="button" class="oblink" data-a="obskip">Having trouble? Continue for now</button>' : ''));
    },
    // right after sign-in: the 7-step path, filling up to the person's step
    steps: function () {
      var o = F.outlook(profile(), today()), cur = Math.min(o.step, 7), name = firstName();
      return '<div class="ob ob-steps"><div class="obbody"><p class="obkicker">' + (name ? esc(name) + ', here’s your path' : 'here’s your path') + '</p><h1 class="obbig" style="font-size:32px">7 steps from ' + hi('stressed') + ' to ' + hi('free') + '</h1>' +
        '<div class="obpath">' + F.STEPS.map(function (stp, i) {
          var n = i + 1, cls = n < cur ? 'done' : n === cur ? 'now' : '';
          return '<div class="obstep ' + cls + '" style="--d:' + (0.2 + i * 0.32).toFixed(2) + 's"><b>' + (n < cur ? ICON.check('#141414', 16) : n) + '</b><div><div class="t">' + stp[0] + (n === cur ? ' <span class="obhere">You’re here</span>' : '') + '</div>' + (n === cur ? '<small>' + STEP_WHY[i] + '</small>' : '') + '</div></div>';
        }).join('') + '</div></div><div class="obfoot">' + obBtn('Take me home', 'obhome') + '</div></div>';
    },
    pay: function () {
      var two = P.household === 'shared' || (P.incomes || []).length > 0;
      return wizardHead('pay', two ? 'Your paychecks' : 'Your paycheck', 'What actually lands in your account, after taxes. If it changes from check to check, tell us below.' + (P.quick && num(P.quick.pay) ? ' Already filled in from your quick numbers. Just add your next payday.' : '')) +
        '<div class="field">Whose paychecks are in this plan?' + choice('household', [['single', 'Just mine'], ['shared', 'Mine and my spouse\u2019s']], 'household') + '</div>' +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + (two ? '<div class="paylabel"><b>Paycheck 1</b><input type="text" data-f="payLabel" value="' + esc(P.payLabel || '') + '" placeholder="You" aria-label="Whose paycheck" maxlength="20"></div>' : '') +
        field('Take-home pay per paycheck', 'paycheck', { ph: '1600', min: 0 }) + payVaryBox() +
        '<div class="field">How often' + (two ? '?' : ' are you paid?') + '<div class="seg wrap" role="group" aria-label="How often">' + Object.keys(F.FREQS).map(function (k) {
          return '<button type="button" class="' + (P.freq === k ? 'on' : '') + '" aria-pressed="' + (P.freq === k) + '" data-a="freq" data-v="' + k + '">' + F.FREQS[k].label + '</button>'; }).join('') + '</div></div>' +
        field('Next payday', 'nextPay', { type: 'date' }) + '</div>' +
        incomeCards(false) +
        '<button type="button" class="outline" data-a="incadd" style="min-height:46px;font-size:15px">+ Add another paycheck</button>' +
        '<div class="card stack" style="padding:16px 18px;gap:12px"><div><b>Other money coming in</b><small style="display:block;color:var(--muted);font-size:14px">Optional. A monthly amount for anything that isn\u2019t a paycheck.</small></div>' +
        (P.otherIncome || []).map(function (x, i) {
          return '<div class="rowedit"><input type="text" aria-label="Income name" data-f="x" data-list="otherIncome" data-i="' + i + '" data-k="label" value="' + esc(x.label) + '" placeholder="Name">' +
            '<input type="number" inputmode="decimal" aria-label="' + esc(x.label || 'Income') + ' per month" data-f="x" data-list="otherIncome" data-i="' + i + '" data-k="amount" value="' + esc(x.amount) + '" placeholder="$/mo">' +
            '<button type="button" class="x" data-a="rm" data-v="otherIncome" data-i="' + i + '" aria-label="Remove ' + esc(x.label || 'income') + '">\u00d7</button></div>';
        }).join('') +
        '<div class="chips">' + OTHER_INCOME.map(function (n) { return '<button type="button" class="chip" data-a="otheradd" data-v="' + (n === 'Something else' ? '' : n) + '">+ ' + n + '</button>'; }).join('') + '</div></div>' +
        (extraIncomes().length || otherMonthly() ? '<p data-live="together" style="font-size:14px;font-weight:600;color:var(--green)">Together: about ' + money(monthlyIncome()) + ' a month after taxes.</p>' : '') + wizNext('pay');
    },
    basics: function () {
      var picks = [1500, 2000, 2500, 3000, 3500];
      // during setup, the rough number from "Find my money" carries over; this is the chance to change it
      var carried = !P.setupDone && P.quick && num(P.quick.exp) > 0;
      if (carried && P.basics === '' && !itemized()) P.basics = String(Math.round(num(P.quick.exp)));
      var qHint = carried ? '<div class="note">' + ICON.info + '<span>We carried over <b>' + money(P.quick.exp) + '</b> a month from your quick numbers. Change it if it\u2019s off, or tap Next.</span></div>' : '';
      return qHint + wizardHead('basics', 'Your monthly expenses', 'About how much do you spend in a month on everything but debt payments? Rent, bills, groceries, gas, eating out, shopping. A rough number is fine.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Each month, about', 'basics', { ph: '2000', min: 0 }) +
        '<div class="chips">' + picks.map(function (v) { var on = num(P.basics) === v; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="basicpick" data-v="' + v + '">' + money(v) + '</button>'; }).join('') + '</div>' +
        '<p style="font-size:13px">Leave out debt payments; those come next.</p></div>' +
        (P.setupDone ? '<button type="button" class="textbtn" data-a="go" data-v="bills" style="align-self:center">Or build it category by category</button>' : '<p style="font-size:13px;text-align:center">You can list bills one by one later in Settings.</p>') + wizNext('basics');
    },
    bills: function () {
      var total = billsTotal(), monthPay = monthlyIncome();
      return wizardHead('bills', 'Your monthly bills', 'Pick what you pay from each group and add an amount. Yearly bills get set aside a little every month, so they never surprise you. Leave out debt payments; those come next.') +
        F.BUDGET.map(function (g) {
          var rows = [], used = {};
          P.bills.forEach(function (b, i) { if (b.group === g.id) { rows.push(i); used[String(b.name).toLowerCase()] = 1; } });
          var sub = rows.reduce(function (t, i) { return t + F.billMonthly(P.bills[i]); }, 0);
          var open = U.billOpen ? !!U.billOpen[g.id] : rows.length > 0;
          var head = '<button type="button" class="grouphead" data-a="billgrp" data-v="' + g.id + '" aria-expanded="' + open + '"><span class="chev' + (open ? ' open' : '') + '" aria-hidden="true">›</span>' +
            '<span style="flex:1;min-width:0"><b>' + g.label + '</b><small>' + (rows.length ? plural(rows.length, 'item') : g.hint) + '</small></span><b data-gtotal="' + g.id + '">' + (sub ? money(sub) + '/mo' : '') + '</b></button>';
          if (!open) return '<div class="card billgroup">' + head + '</div>';
          var picks = g.items.filter(function (it) { return !used[it[0].toLowerCase()]; });
          return '<div class="card billgroup">' + head + '<div class="stack" style="gap:10px;padding-top:4px">' + rows.map(function (i) {
            var b = P.bills[i], it = g.items.filter(function (x) { return x[0].toLowerCase() === String(b.name).toLowerCase(); })[0], yr = b.per === 'yr';
            return '<div><div class="rowedit bill"><input type="text" aria-label="Bill name" data-f="x" data-list="bills" data-i="' + i + '" data-k="name" value="' + esc(b.name) + '" placeholder="Bill name">' +
              '<input type="number" inputmode="decimal" aria-label="' + esc(b.name || 'Bill') + (yr ? ' per year' : ' per month') + '" data-f="x" data-list="bills" data-i="' + i + '" data-k="amount" value="' + esc(b.amount) + '" placeholder="' + (it ? '~' + it[1] : '$0') + '">' +
              '<button type="button" class="per" data-a="billper" data-i="' + i + '" aria-label="' + (yr ? 'Paid yearly. Switch to monthly' : 'Paid monthly. Switch to yearly') + '">' + (yr ? '/yr' : '/mo') + '</button>' +
              '<button type="button" class="x" data-a="rm" data-v="bills" data-i="' + i + '" aria-label="Remove ' + esc(b.name || 'bill') + '">×</button></div>' +
              (yr ? '<small class="permo" data-permo="' + i + '">' + (num(b.amount) ? 'Sets aside ' + money(num(b.amount) / 12) + ' a month' : 'Enter the yearly cost') + '</small>' : '') +
              '<div style="margin:6px 0 0 4px">' + duePill(b, i) + '</div>' +
              (U.dueEdit === i ? dueForm(i) : '') + '</div>';
          }).join('') +
            '<div class="chips">' + picks.map(function (it) {
              return '<button type="button" class="chip" data-a="billadd" data-g="' + g.id + '" data-v="' + esc(it[0]) + '"' + (it[2] ? ' data-per="yr"' : '') + '>+ ' + esc(it[0]) + (it[2] ? ' <span style="color:var(--faint)">yearly</span>' : '') + '</button>';
            }).join('') + '<button type="button" class="chip" data-a="billadd" data-g="' + g.id + '" data-v="">+ Something else</button></div></div></div>';
        }).join('') +
        '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0"><span style="color:var(--muted)">Bills per month</span><b data-total="bills">' + money(total) + '</b></div>' +
        (monthPay ? '<small style="color:var(--faint)" data-totalpct>' + Math.round(total / monthPay * 100) + '% of your ' + money(monthPay) + ' monthly take-home</small>' : '') + '</div>' + wizNext('basics');
    },
    debts: function () {
      // during setup: one total and one monthly payment, carried over from "Find my money"; each card and loan can be listed later
      if (!P.setupDone && P.debts.length <= 1) {
        var q0 = P.quick || {};
        if (!P.debts.length && num(q0.debt) > 0) P.debts.push({ id: uid(), name: 'My debts', bal: String(Math.round(num(q0.debt))), orig: '', min: num(q0.min) > 0 ? String(Math.round(num(q0.min))) : '', apr: '', lump: true });
        var d0 = P.debts[0], lumpField = function (k, label, ph) { return '<label class="field">' + label + '<input type="number" inputmode="decimal" min="0" data-debtlump="' + k + '" value="' + esc(d0 ? d0[k] : '') + '" placeholder="' + ph + '"></label>'; };
        return wizardHead('debts', 'What do you owe?', 'Everything except your home: credit cards, car loan, student loans, buy-now-pay-later, medical bills. A rough total is fine.') +
          (d0 && num(q0.debt) > 0 ? '<div class="note">' + ICON.info + '<span>We carried over your quick numbers. Change them if they\u2019re off, or tap Next.</span></div>' : '') +
          '<div class="card stack" style="padding:16px 18px;gap:14px">' + lumpField('bal', 'Total debt', '0') + lumpField('min', 'Monthly payments, all debts together', '0') +
          '<p style="font-size:13px">No debt? Leave it at $0. Later, you can list each card and loan in Settings so the snowball pays off the smallest first.</p></div>' + wizNext('debts');
      }
      var hasQuick = P.debts.some(function (d) { return d.quick; });
      return (hasQuick ? '' : '') + wizardHead('debts', 'What do you owe?', 'List everything except your home: credit cards, car loan, student loans, buy-now-pay-later, medical bills. Married? Include the debts you share or pay together. We line them up smallest to largest and knock them out one at a time. Your card and loan apps show each balance and minimum. Interest is optional.') +
        (hasQuick ? '<div class="note">' + ICON.info + '<span>We started with your total. <b>Split it into each card and loan</b> (rename this one, then + Add a debt) so the snowball can knock out the smallest first.</span></div>' : '') +
        (!hasQuick && P.quick && num(P.quick.debt) > 0 && !P.debts.some(function (d) { return num(d.bal) > 0; }) ? '<div class="note">' + ICON.info + '<span>On the quick screen you said about <b>' + money(P.quick.debt) + '</b> in debt, with ' + money(P.quick.min) + ' a month in payments. Add each card and loan below.</span></div>' : '') +
        (P.debts.length ? P.debts.map(function (d, i) {
          var at = function (k, label, ph, type) { return '<label class="field" style="font-size:13px">' + label + '<input type="' + (type || 'number') + '"' + (type ? '' : ' inputmode="decimal"') + ' data-f="x" data-list="debts" data-i="' + i + '" data-k="' + k + '" value="' + esc(d[k]) + '" placeholder="' + ph + '"></label>'; };
          return '<div class="card stack" style="padding:14px 18px;gap:10px">' + at('name', 'Name', 'Credit card', 'text') +
            '<div class="grid3">' + at('bal', 'Balance', '$0') + at('min', 'Minimum / mo', '$0') + at('apr', 'Interest %', 'Not sure') + '</div>' +
            '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="rm" data-v="debts" data-i="' + i + '">Remove</button></div>';
        }).join('') : '<div class="note">' + ICON.info + '<span>No debts? That’s great. Tap Next.</span></div>') +
        '<button type="button" class="outline" style="min-height:48px" data-a="add" data-v="debts">+ Add a debt</button>' + wizNext('debts');
    },
    savings: function () {
      var sv = num(P.savings);
      return wizardHead('savings', 'How much do you have saved?', 'Count cash you could get to this week: savings, or extra sitting in checking. Not retirement accounts.') +
        (P.setupDone ? '' : '<div class="note">' + ICON.info + '<span><b>What’s an emergency fund?</b> Money set aside only for the unexpected: a car repair, a medical bill, a lost job. Not a vacation or Christmas. Step 1 is $1,000 of it. It’s small on purpose, so you can get there fast and start attacking debt.</span></div>') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Saved for emergencies right now', 'savings', { ph: '0', min: 0 }) +
        '<div class="chips">' + [0, 250, 500, 1000, 2500, 5000].map(function (v) { var on = savingsSet() && sv === v; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="savepick" data-v="' + v + '">' + money(v) + '</button>'; }).join('') + '</div>' +
        '<p data-live="savings" style="font-size:14px;font-weight:600;color:var(--ink)">' + savingsNote() + '</p></div>' + wizNext('savings');
    },
    safety: function () {
      var m = efMonths(), monthly = monthlyNeed();
      return wizardHead('safety', 'How big should your safety net be?', 'Your full emergency fund covers 3 to 6 months of expenses, so a lost job or a big emergency doesn’t undo your progress. You build it right after you’re debt-free.') +
        '<div class="card stack" style="padding:18px;gap:12px"><div class="row" style="border:0;padding:0"><b data-live="efm">' + m + ' months</b><b data-live="eft">' + money(monthly * m) + '</b></div>' +
        '<input type="range" min="3" max="6" step="1" value="' + m + '" data-ef="1" aria-label="Months of expenses" aria-valuetext="' + m + ' months">' +
        '<div class="row" style="border:0;padding:0;font-size:13px;color:var(--faint)"><span>More risk</span><span>Less risk</span></div>' +
        '<p data-live="efwhy" style="font-size:14px">' + EF_WHY[m - 3] + '</p>' +
        '<small style="color:var(--faint)" data-live="efmath">' + m + ' × ' + money(monthly) + ' a month in expenses</small></div>' +
        '<div class="note">' + ICON.info + '<span><b>Keep it as cash you can reach in a day or two</b>, like a high-yield savings account. Not in the stock market, not in retirement accounts. This money’s job is to be there, not to grow.</span></div>' + wizNext('safety');
    },
    retire: function () {
      return wizardHead('retire', 'Are you saving for retirement?', 'Once you’re debt-free with a full safety net, 15% of your income goes toward retirement, in accounts like a 401(k), 403(b) or Roth IRA.') +
        choice('retire', [['none', 'Not yet'], ['some', 'Yes, under 15%'], ['full', 'Yes, 15% or more'], ['unsure', 'Not sure']]) +
        (retireOn() ? (P.retirements || []).map(function (a, i) {
          var at = function (k, label, ph) { return '<label class="field">' + label + '<input type="number" inputmode="decimal" min="0" data-f="x" data-list="retirements" data-i="' + i + '" data-k="' + k + '" value="' + esc(a[k] || '') + '" placeholder="' + ph + '"></label>'; };
          var chips = function (act, cur, opts) { return '<div class="chips" style="margin-top:6px">' + opts.map(function (o) { var on = cur === o[0]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="' + act + '" data-i="' + i + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
          var owners = payOwners();
          return '<div class="card stack" style="padding:16px 18px;gap:12px"><div class="paylabel"><b>Account ' + (i + 1) + '</b><span style="flex:1"></span><button type="button" class="x" data-a="rm" data-v="retirements" data-i="' + i + '" aria-label="Remove account ' + (i + 1) + '">\u00d7</button></div>' +
            (owners.length > 1 ? '<div class="field">Whose?' + chips('retowner', String(a.owner || 0), owners.map(function (o, k) { return [String(k), esc(o.label)]; })) + '</div>' : '') +
            '<div class="field">What kind?' + chips('rettype', a.type || '', [['401(k)', '401(k)'], ['403(b)', '403(b)'], ['IRA', 'IRA'], ['Roth IRA', 'Roth IRA'], ['Pension', 'Pension'], ['Other', 'Other']]) + '</div>' +
            '<div class="field">How does it get there?' + chips('retfrom', a.from || 'pre', [['pre', 'Taken out before payday'], ['post', 'I pay it from my take-home']]) + '</div>' +
            ((a.from || 'pre') === 'pre' ? at('gross', 'Pay before taxes, each paycheck', '2500') : '') +
            '<div class="grid2">' + at('pct', '% of pay', '5') + at('monthly', 'Or $ per month', '200') + '</div>' + at('bal', 'Saved so far', '0') +
            '<p style="font-size:13px">' + (a.from === 'post' ? 'We\u2019ll add it to your budget as its own line.' : 'Taken out before payday? It\u2019s already left out of your take-home pay, so nothing changes in your budget.') + '</p></div>';
        }).join('') + '<button type="button" class="outline" data-a="retadd" style="min-height:46px;font-size:15px">+ Add another account</button>' : '') +
        '<p style="font-size:13px">Already investing while you pay off debt? Some people pause it for a while to throw more at the snowball. That’s your call, and we’ll remind you when you reach Step 4.</p>' + wizNext('retire');
    },
    kids: function () {
      return wizardHead('kids', 'Do you have kids?', 'Step 5 is saving for their college, so they can start adult life without loans. Accounts like a 529 plan grow tax-free for school.') +
        choice('kids', [['none', 'No'], ['yes', 'Yes'], ['someday', 'Someday']]) +
        (P.kids === 'yes' ? '<div class="field">Saving for their college yet?' + choice('college', [['no', 'Not yet'], ['some', 'A little'], ['yes', 'Yes, on track']]) + '</div>' : '') +
        (P.kids === 'yes' && (P.college === 'some' || P.college === 'yes') ? '<div class="card stack" style="padding:16px 18px;gap:12px"><div class="grid2">' + field('Saved so far', 'collegeBal', { ph: '0', min: 0 }) + field('Adding per month', 'collegeMonthly', { ph: '50', min: 0 }) + '</div>' +
          '<p style="font-size:13px">What you add each month goes in your budget as its own line.</p></div>' : '') +
        wizNext('kids');
    },
    house: function () {
      return wizardHead('house', 'Do you own your home?', 'Step 6 is paying your home off early. It comes after the steps before it, so your mortgage isn’t part of the debt snowball.') +
        choice('home', [['rent', 'I rent'], ['mortgage', 'Own, with a mortgage'], ['free', 'Own it outright'], ['family', 'Living with family']]) +
        (P.home === 'mortgage' ? '<div class="card stack" style="padding:16px 18px;gap:12px">' + field('Balance left', 'mortgage', { ph: '0', min: 0 }) + '<div class="grid2">' + field('Monthly payment', 'mortgagePay', { ph: '1600', min: 0 }) + field('Interest %', 'mortgageRate', { ph: '6.5', min: 0 }) + '</div>' +
          '<p style="font-size:13px" data-live="payoff">' + payoffNote() + '</p><p style="font-size:13px">Your payment counts as a bill. ' + (itemized() ? 'Add it under Home in your bills.' : 'It should be part of your monthly expenses number.') + '</p></div>' : '') + wizNext('house');
    },
    give: function () {
      return wizardHead('give', 'Would you like to give?', 'Church, a cause you love, a neighbor in need. Giving comes off the top of every paycheck, even while you pay off debt. Step 7 is where it grows: build wealth and give more than you ever thought you could.') +
        giveBox() + '<p style="font-size:13px">Slide to zero for not now. You can change it anytime.</p>' + wizNext('give');
    },
    fun: function () {
      var parts = P.funParts || [], used = {}, sp = P.tx.length && !spending().unsorted.length ? spending() : null;
      parts.forEach(function (x) { used[String(x.name).toLowerCase()] = 1; });
      return wizardHead(0, 'Fun money', 'Your wants for a month: eating out, coffee, shopping, entertainment. It\u2019s yours to spend guilt-free, as long as you stay inside the limit.') +
        (sp ? '<div class="note">' + ICON.info + '<span>Your bank file showed about <b>' + money(sp.monthly.want) + ' a month</b> on wants.</span></div>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + (funParts().length ? '<div class="row" style="border:0;padding:0"><span>Fun money per month</span><b data-total="fun">' + money(num(P.fun)) + '</b></div>' : field('Fun money per month', 'fun', { ph: '300', min: 0 })) + '</div>' +
        '<div class="card stack" style="padding:16px 18px;gap:12px"><div><b>Break it down</b><small style="display:block;color:var(--muted);font-size:14px">Optional. Giving each want a job makes it easier to stick to.</small></div>' +
        parts.map(function (x, i) {
          return '<div class="rowedit"><input type="text" aria-label="Want name" data-f="x" data-list="funParts" data-i="' + i + '" data-k="name" value="' + esc(x.name) + '" placeholder="Name">' +
            '<input type="number" inputmode="decimal" aria-label="' + esc(x.name || 'Want') + ' per month" data-f="x" data-list="funParts" data-i="' + i + '" data-k="amount" value="' + esc(x.amount) + '" placeholder="$0">' +
            '<button type="button" class="x" data-a="rm" data-v="funParts" data-i="' + i + '" aria-label="Remove ' + esc(x.name || 'want') + '">\u00d7</button></div>';
        }).join('') +
        '<div class="chips">' + FUN_PARTS.filter(function (n) { return !used[n.toLowerCase()]; }).map(function (n) { return '<button type="button" class="chip" data-a="funadd" data-v="' + esc(n) + '">+ ' + esc(n) + '</button>'; }).join('') +
        '<button type="button" class="chip" data-a="funadd" data-v="">+ Something else</button></div></div>' + wizNext(0);
    },

    install: function () {
      var ios = isIOS();
      return back(U.wizReturn || 'home') + '<div class="stack" style="gap:6px"><h2>Add it to your Home Screen</h2><p>' + (ios ? 'On iPhone, Safari can clear saved data from websites you haven\u2019t opened in about a week. Apps on your Home Screen are safe, and they open like a real app.' : 'It opens like a real app and is one tap away on payday.') + '</p></div>' +
        (ios && !standalone() && P.setupDone && cloudOn() ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>' + (S ? 'Your plan comes with you' : 'First: save your plan with your email') + '</b><span style="font-size:14px;color:var(--muted)">' + (S ? 'Open the Home Screen app and sign in with ' + esc(S.email || 'your email') + '. Your plan will be there.' : 'The Home Screen app starts empty. Save your plan first, then sign in there with the same email.') + '</span>' + (S ? '' : '<button type="button" class="outline" data-a="edit" data-v="account">Save my plan</button>') + '</div>' : '') +
        (ios && !standalone() && P.setupDone && !cloudOn() ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>First: bring your plan with you</b><span style="font-size:14px;color:var(--muted)">The Home Screen app starts empty. Copy your plan first, then open the app, tap <b>Sign in</b>, then <b>Have a backup file instead?</b> to paste it.</span>' +
          '<button type="button" class="outline" data-a="copyplan">' + (U.copiedPlan ? '\u2713 Plan copied. Now add it to your Home Screen' : 'Copy my plan') + '</button>' + (U.copiedPlan && U.planCode ? '<div class="stack" style="gap:6px"><small style="color:var(--green);font-weight:600">\u2713 Copied. This text is your whole plan:</small><textarea class="plancode" readonly rows="2" aria-label="Your copied plan">' + esc(U.planCode) + '</textarea><small style="color:var(--muted)">Now open the other app and tap <b>Sign in</b>, then <b>Have a backup file instead?</b> (or Settings \u2192 Bring a plan here), then <b>Paste my copied plan</b>. Nothing is deleted here.</small></div>' : '') + '</div>' : '') +
        guideBox(ios ? 'ios' : 'android') +
        '<p style="font-size:14px">Your data stays in the browser you use now, so add it from this same browser.</p>' +
        '<div class="push"><button type="button" class="primary" data-a="installdone">Done</button><button type="button" class="outline" data-a="backup">Save a backup file too</button></div>';
    },

    plan: function () {
      var tab = U.bTab || 'spend', ym = curSpendMonth(), a = ym.split('-'), mname = new Date(+a[0], +a[1] - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      var head = '<div class="bud-head"><h2>Budget</h2>' + mmGear() + '<div class="bud-month"><button type="button" class="mnav" data-a="spendmonth" data-v="-1" aria-label="Previous month">\u2039</button><span>' + mname + '</span><button type="button" class="mnav" data-a="spendmonth" data-v="1" aria-label="Next month">\u203a</button></div></div>';
      return head + incomeCard(ym) + '<div class="seg bud-tabs" role="group" aria-label="Budget">' + [['spend', 'Spending'], ['save', 'Saving'], ['debt', 'Debt']].map(function (t) { var on = tab === t[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="btab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' + (tab === 'save' ? budSave() : tab === 'debt' ? budDebt() : budSpend(ym));
    },
    // add or change one recurring expense: name, icon, amount, how often, when it's due
    goal: function () {
      var f = U.form, presets = [['Vacation', 2400], ['A car', 5000], ['Concert tickets', 350], ['Christmas gifts', 600], ['Car repairs', 800], ['Something else', '']];
      U.presets = presets;
      return back(U.back) + '<div class="stack" style="gap:6px"><div class="eyebrow">Your goals</div><h2>What are you saving for?</h2></div>' +
        '<div class="chips">' + presets.map(function (p, i) { var on = f.name === p[0]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="preset" data-i="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>' +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' +
        '<label class="field">Goal name<input id="g-name" type="text" data-g="name" maxlength="40" value="' + esc(f.name) + '" placeholder="Hawaii trip" autocomplete="off"></label>' +
        '<label class="field">How much?<input type="number" inputmode="decimal" data-g="amount" min="1" value="' + esc(f.amount) + '" placeholder="2400"></label>' +
        '<label class="field">By when?<input type="date" data-g="by" min="' + F.isoDay(F.addDays(today(), 1)) + '" value="' + esc(f.by || '') + '"></label>' +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') + '</div>' +
        '<div class="push"><button type="button" class="primary" data-a="goalsave">Save my goal</button><button type="button" class="textbtn" data-a="go" data-v="' + U.next + '">Cancel</button></div>';
    },

    home: function () {
      if (U.coachTest != null && !coachSeen()) return homeTop('') + coachCard(U.coachTest === true ? foundMonthly() : U.coachTest) + '<button type="button" class="textbtn" data-a="coachtestoff">Close preview</button>';
      var p = profile(), o = F.outlook(p, today()), pl = o.plan, step = o.step, h = headline(o), now = today();
      var toast = U.toast ? (U.toast[2] ? '<div class="sunburst" aria-hidden="true"></div>' : '') + '<div class="toast pop' + (U.toast[2] ? ' win' : '') + '" role="status"><b>' + U.toast[0] + '</b>' + U.toast[1] + '</div>' : '';
      var stepChip = '<span class="hchip">Step ' + Math.min(step, 7) + ' · ' + F.STEPS[Math.min(step, 7) - 1][0] + '</span>';
      // one big number: dollars left to the current goal (no dates: paydays can bring more or less)
      var hero = '<div class="hero">' + stepChip + progGauge(o, p) + '</div>';
      return homeTop(toast) + hero + chHome() + '<button type="button" class="card recaprow" data-a="recapopen"><span>\uD83D\uDCCA</span><b>Weekly recap</b><small>' + weekLabel({ start: weekOf(today())[0], end: weekOf(today())[1] }) + '</small><i aria-hidden="true">\u203a</i></button>' + homeRest();
    },

    recap: function () {
      // the recap's week: this one, or an earlier/later one with the arrows (the steps and balances belong to this week)
      var thisWk = weekOf(today())[0], ws = U.recapWk || thisWk, we = mmAdd(ws, 6), isNow = ws === thisWk, r = wkRec(ws), by = weekSpend(ws, we), lines = {};
      spendLines().forEach(function (l) { lines[l.key] = l; });
      var rows = Object.keys(by).map(function (k) { var l = lines[k] || { label: 'Removed category', icon: '\uD83E\uDDFE' }; return { k: k, label: l.label, icon: l.icon, v: by[k], c: colorFor(k) }; }).sort(function (a, b) { return b.v - a.v; });
      var tot = rows.reduce(function (t, x) { return t + x.v; }, 0), top = rows.slice(0, 5), rest = rows.slice(5).reduce(function (t, x) { return t + x.v; }, 0);
      var parts = top.concat(rest ? [{ k: 'rest', label: 'Other', v: rest, c: 'rgba(255,255,255,.28)' }] : []);
      // this week's budget: each spending category's weekly share (a weekly one counts as is)
      var wkBud = spendLines().filter(function (l) { return l.grp === 'spend'; }).reduce(function (t, l) { return t + (l.per === 'week' ? l.amt : l.mon * 12 / 52); }, 0);
      var spentBud = Object.keys(by).filter(function (k) { return lines[k] && lines[k].grp === 'spend'; }).reduce(function (t, k) { return t + by[k]; }, 0), lf = wkBud - spentBud;
      var now = balSnap(), was = prevSnap(ws), chg = function (a, b, good) { if (b == null) return ''; var d = round2(a - b); if (Math.abs(d) < 0.5) return '<small class="rc">no change</small>'; var up = d > 0, ok = good === 'down' ? !up : up; return '<small class="rc ' + (ok ? 'ok' : 'bad') + '">' + (up ? '+' : '\u2212') + money(Math.abs(d)) + '</small>'; };
      var balRow = function (ic, label, val, b, good) { return '<div class="row"><span>' + ic + ' ' + esc(label) + '</span><span class="bright"><b>' + money(val) + '</b>' + chg(val, b, good) + '</span></div>'; };
      var spendCard = '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Spending</b>' +
        '<div class="rcpie">' + donut(parts) + '<div class="rcmid"><b>' + money(tot) + '</b><small>spent</small></div></div>' +
        (top.length ? '<div class="rclist">' + top.map(function (x) { return '<div class="row"><span><i class="rcdot" style="background:' + x.c + '"></i>' + x.icon + ' ' + esc(x.label) + '</span><span class="bright"><b>' + money2(x.v) + '</b><small class="rc">' + Math.round(x.v / tot * 100) + '%</small></span></div>'; }).join('') + '</div>' : '<p style="font-size:14px">No purchases this week yet.</p>') + '</div>';
      var budCard = '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="row" style="border:0;padding:0"><b>Vs. budget</b><span class="bstat ' + (lf < -0.5 ? 'over' : 'ok') + '">' + (lf < -0.5 ? money(-lf) + ' over' : money(lf) + ' under') + '</span></div>' +
        '<span class="cbar' + (lf < -0.5 ? ' over' : '') + '"><i style="width:' + Math.min(100, wkBud ? spentBud / wkBud * 100 : (spentBud ? 100 : 0)) + '%;background:' + (lf < -0.5 ? 'var(--warn)' : '#6FDB8E') + '"></i></span>' +
        '<div class="crow"><span>' + money(spentBud) + ' spent</span><span>' + money(wkBud) + ' budgeted this week</span></div></div>';
      var balCard = '<div class="card stack" style="padding:16px 18px;gap:4px"><b style="margin-bottom:4px">Balances</b>' +
        balRow('\uD83D\uDEDF', 'Emergency savings', now.sv, was && was.sv, 'up') +
        funds().map(function (f) { return balRow(f.icon || '\uD83D\uDCB0', f.name || 'Fund', now.funds[f.id], was && was.funds ? was.funds[f.id] : null, 'up'); }).join('') +
        P.goals.map(function (g) { return balRow('\uD83C\uDFAF', g.name, now.goals[g.id], was && was.goals ? was.goals[g.id] : null, 'up'); }).join('') +
        (P.debts.length ? balRow('\uD83D\uDCB3', 'Debt', now.debt, was && was.debt, 'down') : '') + '</div>';
      return back(U.recapBack || 'journey') + '<div class="stack" style="gap:6px"><div class="eyebrow">Weekly recap</div><h2>Your week</h2></div>' +
        '<div class="mm-weeknav"><button type="button" class="mm-nav" data-a="recapwk" data-v="-7" aria-label="Previous week">\u2039</button><div><b>' + weekLabel({ start: ws, end: we }) + '</b><div class="mm-wk">' + (isNow ? 'This week' : ws < thisWk ? 'Past week' : 'Coming up') + '</div></div><button type="button" class="mm-nav" data-a="recapwk" data-v="7" aria-label="Next week">\u203a</button></div>' +
        (U.recapToast ? (function () { var t = U.recapToast; U.recapToast = null; return '<div class="toast pop win" role="status"><b>' + ICON.check('#7ED9C0', 16) + ' ' + t + '</b></div>'; })() : '') +
        (U.recapCoach && !coachSeen() ? coachCard(foundMonthly()) : '') + spendCard + budCard + mmRecap(ws) + (isNow ? balCard +
        '<div class="card stack" style="padding:14px 18px;gap:6px">' + wkCheck(!!r.cat, 'Categorize transactions', 'recapgo', 'cat') + wkCheck(!!r.bal, 'Update balances', 'recapgo', 'bal') + wkCheck(!!r.done, 'Read your weekly recap') + '</div>' +
        (r.done ? '' : '<div class="push"><button type="button" class="primary" data-a="recapdone">Mark recap complete</button></div>') : '');
    },
    wins: function () {
      var r = U.result; if (!r) { go('home'); return ''; }
      var w = r.w, t = P.totals, title = r.paid.length ? esc(r.paid[0]) + ': PAID OFF' : esc(r.goal) + ': FULLY FUNDED';
      var savedStat = w.saved >= 0 ? stat(money(w.saved), 'saved') : stat('\u2013' + money(-w.saved), 'from savings');
      return '<div class="sunburst" aria-hidden="true"></div><div class="eyebrow" style="margin-top:12px">Balance update \u00b7 ' + dayMonth(today()) + '</div>' +
        recapCard(r, title, savedStat) +
        (r.paid.length ? '<button type="button" class="primary" data-a="sharepaid">' + ICON.share + ' Share this payoff</button>' : '<button type="button" class="primary" data-a="sharegoal">' + ICON.share + ' Share this goal</button>') +
        (r.paid.length > 1 ? '<p style="text-align:center">Also paid off: ' + r.paid.slice(1).map(esc).join(', ') + '. The snowball grows.</p>' : r.paid.length ? '<p style="text-align:center">That payment now rolls into your next debt. The snowball grows.</p>' : '') +
        celebration(9) +
        '<div class="card"><div class="row"><span style="font-weight:600">Since you started</span><span></span></div>' +
        '<div class="row"><span style="color:var(--muted)">Debt paid</span><b>' + money(t.debtPaid) + '</b></div><div class="row"><span style="color:var(--muted)">Money saved</span><b>' + money(t.saved) + '</b></div></div>' +
        '<div class="push"><button type="button" class="outline" data-a="winsdone">Back to my plan</button></div>';
    },

    // the Challenge tab: the 30-Day Challenge, with Milestones behind it
    journey: function () {
      if (U.jTab === 'milestones') return '<button type="button" class="back" data-a="jtab" data-v="ch" aria-label="Back">' + ICON.back + '</button>' + V.milestones() + finishedChallenges() + goalsCard();
      return chScreen();
    },
    chlesson: function () { return chLessonScreen(); },
    chjournal: function () { return chJournal(); },
    lesson: function () {
      var L = U.lesson || {}, l = lessonFor(L.id) || { title: 'Lesson', card1: '', card2: '', card3: '' }, cards = [l.card1, l.card2, l.card3].filter(Boolean), i = Math.min(U.lessonCard || 0, cards.length - 1), last = i === cards.length - 1, done = lessonDone(L.id);
      return back('journey') + '<div class="stack" style="gap:6px"><div class="eyebrow">Lesson \u00b7 1 minute</div><h2>' + esc(l.title) + '</h2></div>' +
        '<div class="card lessoncard">' + esc(cards[i] || '') + '</div><div class="ldots">' + cards.map(function (_, n) { return '<i class="' + (n <= i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        (last && l.skoolUrl ? '<p style="font-size:14px">Want more? <a href="' + esc(l.skoolUrl) + '" target="_blank" rel="noopener" style="color:var(--green);font-weight:600">Watch the video in the community</a></p>' : '') +
        (last && l.action ? '<button type="button" class="outline" data-a="lessonact" data-v="' + esc(l.action) + '">' + esc(l.actionLabel || 'Do it now') + ' \u203a</button>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="' + (last ? 'lessondone' : 'lessonnext') + '">' + (last ? (done ? 'Back' : 'Got it') : 'Next') + '</button></div>';
    },

    scan: function () {
      var sc = U.scan; if (!sc || !sc.msgs) { U.scan = sc = newScan(sc && sc.week); U.scanBack = U.scanBack || U.wizReturn || 'journey'; }
      aiStatus();
      var w = payWeeks().filter(function (x) { return x.start === sc.week; })[0] || weekNow();
      var hello = '<div class="chatsay"><p>Tell me what you spent, like “HEB 84.20 groceries.” Or tap <b>+</b> to snap a receipt or a screenshot of your bank app.</p></div>';
      var thread = sc.msgs.map(function (m, j) {
        if (m.t === 'you') return '<div class="chatyou">' + esc(FMTMAI.maskDigits(m.text)) + '</div>';
        if (m.t === 'pics') return '<div class="chatyou pics">' + m.urls.map(function (u) { return '<img src="' + esc(u) + '" alt="' + (m.kind === 'bank' ? 'Your bank screenshot' : 'Your receipt') + '">'; }).join('') + '</div>';
        if (m.t === 'chat') return chatReplyHtml(m.st, j);
        if (m.t === 'snap') return snapReplyHtml(m, j);
        if (m.t === 'note') return '<div class="chatcard cc done">' + ccRow('✓', 'var(--green)', esc(m.text), 'Added by hand · ' + chDay(F.isoDay(today())), '', '') + '</div>';
        return '';
      }).join('');
      return back(U.scanBack || 'journey') + '<div class="stack" style="gap:2px"><div class="eyebrow">' + (w.now ? 'This week' : 'Week of') + ' · ' + weekLabel(w) + '</div><h2>Add purchases</h2></div>' +
        '<div class="chatthread" aria-live="polite">' + hello + thread + '</div>' + chatDock();
    },
    spendadd: function () {
      var f = U.form || {}, lines = spendLines(), last = f.key;
      var chips = function (cat, title) {
        var mine = lines.filter(function (l) { return l.grp === cat; }); if (!mine.length) return '';
        return '<div class="field">' + title + '<div class="chips" style="margin-top:8px">' + mine.map(function (l) {
          var on = last === l.key; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="spendcat" data-v="' + l.key + '">' + esc(l.short || l.label) + '</button>'; }).join('') + '</div></div>';
      };
      return back(U.spendBack || 'plan') + '<div class="stack" style="gap:6px"><h2>Add a purchase</h2></div>' +
        (U.spendSaved ? '<div class="toast pop" role="status"><b>' + ICON.check('#7ED9C0', 16) + ' ' + U.spendSaved + '</b></div>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:14px"><label class="field">Amount<input class="bigamt" type="number" inputmode="decimal" min="0" step="any" data-g="amount" value="' + esc(f.amount || '') + '" placeholder="$0.00" autocomplete="off"></label>' +
        '<label class="field">Where? (optional)<input type="text" data-g="note" value="' + esc(f.note || '') + '" placeholder="Like Kroger, Shell or Target" autocomplete="off"></label>' +
        chips('spend', 'Spending') + chips('bill', 'Recurring') + chips('fund', 'Saving funds') + chips('other', 'Not in my budget') +
        '<label class="field">Date<input type="date" data-g="date" value="' + esc(f.date || F.isoDay(today())) + '"></label></div>' +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="spendsave">Save</button><button type="button" class="outline" data-a="spendsave" data-v="again">Save &amp; add another</button></div>';
    },
    // one spending category's purchases: this week for a weekly one (or the whole month), the month for the rest
    catlog: function () {
      var key = U.catKey, l = spendLines().filter(function (x) { return x.key === key; })[0];
      if (!l) { U.screen = 'plan'; return V.plan(); }
      var ym = curSpendMonth(), y = +ym.slice(0, 4), mo = +ym.slice(5, 7) - 1, isNow = ym === monthOf(F.isoDay(today()));
      var wk = l.per === 'week' && isNow && !U.catAll ? weekOf(today()) : null;
      var from = wk ? wk[0] : ym + '-01', to = wk ? wk[1] : F.isoDay(new Date(y, mo + 1, 0));
      var list = linePurchases(key, from, to), spent = list.reduce(function (t, x) { return t + num(x.amount); }, 0);
      var cap = wk ? l.amt : (l.per === 'week' ? l.amt * weeksIn(y, mo) : l.mon) * budFrom(ym).share, lf = cap - spent;
      var days = {}; list.forEach(function (x) { (days[x.date] = days[x.date] || []).push(x); });
      var period = wk ? 'This week · ' + weekLabel({ start: wk[0], end: wk[1] }) : monthName(ym);
      return back('plan') + '<div class="catlog-head">' + icoBox(l.icon, l.key) + '<div><div class="eyebrow">' + esc(period) + '</div><h2>' + esc(l.label) + '</h2></div></div>' +
        (l.per === 'week' && isNow ? '<div class="seg" role="group" aria-label="Show">' + [['0', 'This week'], ['1', monthName(ym)]].map(function (o) { var on = (U.catAll ? '1' : '0') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="catall" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' : '') +
        '<div class="card catlog-sum"><div><b class="' + (lf < -0.5 ? 'over' : '') + '">' + (lf < -0.5 ? money2(-lf) + ' over' : money2(lf) + ' left') + '</b><small>' + money2(spent) + ' spent of ' + money2(cap) + '</small></div></div>' +
        '<div class="grid2"><button type="button" class="primary" data-a="spendnew" data-v="' + esc(key) + '">+ Add spending</button><button type="button" class="outline" data-a="catedit" data-v="' + esc(key) + '">Edit category</button></div>' +
        (list.length ? Object.keys(days).map(function (d) {
          return '<div class="card" style="padding:6px 18px"><div class="eyebrow" style="padding:10px 0 4px">' + dayMonth(F.fromIso(d)) + '</div>' + days[d].map(function (x) {
            return '<div class="row" style="padding:10px 0"><span style="min-width:0">' + esc(x.note || l.label) + '</span><span class="bright"><b>' + money2(num(x.amount)) + '</b>' + (x.imported ? '<span class="impt" title="From your bank file">bank</span>' : '<button type="button" class="x" data-a="spenddel" data-v="' + x.id + '" aria-label="Delete ' + esc(x.note || l.label) + '">\u00d7</button>') + '</span></div>';
          }).join('') + '</div>';
        }).join('') : '<p style="padding:8px 0">No purchases ' + (wk ? 'this week' : 'in ' + monthName(ym)) + '.</p>');
    },
    spendlog: function () {
      var month = curSpendMonth(), lines = spendLines(), byKey = {}, t = spendTotals(), sl = P.storeLine || {};
      lines.forEach(function (l) { byKey[l.key] = l; });
      var imported = P.tx.filter(function (x) { return sl[x.merchant] && monthOf(x.date) === month; }).map(function (x) { return { date: x.date, amount: x.amount, key: sl[x.merchant], note: x.merchant, imported: true }; });
      var mine = P.spends.filter(function (x) { return monthOf(x.date) === month; }).concat(imported).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      var days = {}; mine.forEach(function (x) { (days[x.date] = days[x.date] || []).push(x); });
      return back('plan') + '<div class="stack" style="gap:6px"><div style="display:flex;align-items:center;gap:8px"><button type="button" class="mnav" data-a="spendmonth" data-v="-1" aria-label="Previous month">\u2039</button><div class="eyebrow" style="flex:1;text-align:center">' + monthName(month) + '</div><button type="button" class="mnav" data-a="spendmonth" data-v="1" aria-label="Next month">\u203a</button></div><h2>' + money(t.spent) + ' spent</h2><p>Out of ' + money(t.bud) + ' budgeted for needs and wants.</p></div>' +
        '<button type="button" class="primary" data-a="spendnew">+ Add spending</button>' +
        (mine.length ? Object.keys(days).map(function (d) {
          return '<div class="card" style="padding:6px 18px"><div class="eyebrow" style="padding:10px 0 4px">' + dayMonth(F.fromIso(d)) + '</div>' + days[d].map(function (x) {
            var l = byKey[x.key] || { label: 'Removed category' };
            return '<div class="row" style="padding:10px 0"><span style="min-width:0">' + esc(x.note || l.label) + '<small>' + esc(x.note ? l.label : '') + '</small></span><span class="bright"><b>' + money2(num(x.amount)) + '</b>' + (x.imported ? '<span class="impt" title="From your bank file">bank</span>' : '<button type="button" class="x" data-a="spenddel" data-v="' + x.id + '" aria-label="Delete ' + esc(x.note || l.label) + '">\u00d7</button>') + '</span></div>';
          }).join('') + '</div>';
        }).join('') : '<p style="padding:8px 0">Nothing yet this month.</p>');
    },
    milestones: function () {
      var f = facts(), earned = BADGES.filter(function (b) { return P.badges[b.id]; }), locked = BADGES.filter(function (b) { return !P.badges[b.id]; });
      var o = F.outlook(profile(), today()), st = Math.min(o.step, 7), mt = U.msTab || 'next';
      var grp = function (id) { return /^(plan|sorted|checkin-1|plan-1|storyteller)$/.test(id) ? 'start' : /^(saved-|cushion|safety-net|goal-)/.test(id) ? 'saving' : /^(payoff-|paid-|debt-free)/.test(id) ? 'debt' : /^streak-/.test(id) ? 'streak' : /^days-/.test(id) ? 'days' : 'more'; };
      var nextUp = locked.slice().sort(function (a, b) { var pa = F.badgeProgress(a, f), pb = F.badgeProgress(b, f); return (pb ? pb.ratio : 0) - (pa ? pa.ratio : 0); });
      var shown = mt === 'next' ? (U.msAll ? nextUp : nextUp.slice(0, 3)) : locked.filter(function (b) { return grp(b.id) === mt; });
      var pathCard = '<div class="card stack" style="padding:16px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div class="eyebrow">Your path</div><b>Step ' + st + ': ' + F.STEPS[st - 1][0] + '</b></div>' +
        '<button type="button" class="sharebtn" data-a="sharestep" data-v="">' + ICON.share + ' Share</button></div>' + journey(st, { small: true, progress: stepProgress(o) }) + '</div>';
      return '<div style="margin-top:8px"><div class="eyebrow">' + earned.length + ' of ' + BADGES.length + ' earned</div><h2>Milestones</h2><p style="margin-top:6px">Little wins along the way. Tap one to share it.</p></div>' + celebration(9, 'badge') + pathCard +
        tabChips('mstab', mt, [['next', 'Up next'], ['start', 'Getting started'], ['saving', 'Saving'], ['debt', 'Debt'], ['streak', 'Streaks'], ['days', 'Days back'], ['more', 'Challenges & earning'], ['earned', 'Earned' + (earned.length ? ' (' + earned.length + ')' : '')]]) +
        (mt === 'earned'
          ? (earned.length ? '<div class="grid2">' + earned.map(function (b) {
          return '<button type="button" class="tile medal-tile" data-a="sharebadge" data-v="' + b.id + '"><span class="medal on">' + ICON.medal + '</span><b>' + b.title + '</b><span class="k">' + b.desc + '</span><span class="k" style="color:var(--sun-ink)">' + ICON.share + ' Share</span></button>';
        }).join('') + '</div>' : '<div class="note">' + ICON.info + '<span>Milestones you earn land here, each with a card to share.</span></div>')
          : (shown.length ? '<div class="grid2">' + shown.map(function (b) {
              var pr = F.badgeProgress(b, f);
              return '<div class="tile medal-tile locked"><span class="medal">' + ICON.medal + '</span><b>' + b.title + '</b><span class="k">' + b.desc + '</span>' +
                (pr ? '<span class="bar goalbar" style="flex:none;height:5px"><i style="width:' + Math.max(2, pr.ratio * 100) + '%"></i></span><span class="k">' + pr.label + '</span>' : '') + '</div>';
            }).join('') + '</div>' : '<div class="note">' + ICON.info + '<span>You\u2019ve earned every milestone in this group.</span></div>') +
            (mt === 'next' && !U.msAll && nextUp.length > 3 ? '<button type="button" class="outline" style="min-height:44px;font-size:15px" data-a="msall">Show all ' + nextUp.length + '</button>' : ''));
    },

    share: function () {
      var c = U.card, hasAmt = c.subNoAmt != null && c.subNoAmt !== c.sub;
      return back(U.shareBack) + '<div class="stack" style="gap:6px"><h2>Share your win</h2><p>Made on this phone. Share it wherever you like, or save it.</p></div>' +
        '<div class="field">Made for<div class="seg fmt" role="group" aria-label="Card shape">' + CARD_FORMATS.map(function (o) {
          var on = (U.fmt || 'post') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="sharefmt" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
          '<small style="color:var(--faint);font-weight:400">' + CARD_FORMATS.filter(function (o) { return o[0] === (U.fmt || 'post'); })[0][2] + '</small></div>' +
        '<div class="sharewrap ' + (U.fmt || 'post') + '">' + (U.cardImg ? '<img src="' + U.cardImg.url + '" alt="' + esc(c.title + '. ' + (U.showAmt ? c.sub : c.subNoAmt || c.sub)) + '">' : '<div class="spinner" aria-label="Making your card"></div>') + '</div>' +
        (hasAmt ? '<div class="field">Dollar amounts<div class="seg" role="group" aria-label="Dollar amounts" style="align-self:flex-start">' + [['1', 'Show'], ['0', 'Hide']].map(function (o) {
          var on = (U.showAmt ? '1' : '0') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="shareamt" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' : '') +
        '<button type="button" class="primary" data-a="doshare"' + (U.cardImg ? '' : ' disabled') + '>' + ICON.share + ' Share</button>' +
        (CONFIG.communityUrl ? '<button type="button" class="outline" data-a="postcommunity"' + (U.cardImg ? '' : ' disabled') + '>Post it in the community</button>' : '') +
        '<button type="button" class="outline" data-a="saveimg"' + (U.cardImg ? '' : ' disabled') + '>Save image</button>' +
        '<div class="card stack" style="padding:14px 18px;gap:8px"><span style="font-size:13px;color:var(--faint)">Caption</span><span id="caption">' + esc(caption()) + '</span>' +
        '<button type="button" class="textbtn" style="align-self:flex-start;min-height:32px;padding:0" data-a="copycap">' + (U.copied ? 'Copied' : 'Copy caption') + '</button></div>' +
        (U.shareErr ? '<p role="status" style="font-size:14px;color:var(--muted)">' + U.shareErr + '</p>' : '');
    },
    settings: function () {
      return back('home') + '<h2>Settings</h2>' + accountCard() + remindCard(false) + daysCard() +
        '<div class="card">' + [['install', 'Add to Home Screen', 'edit'], ['', 'Show me around again', 'tourreplay']].map(function (x) {
          return '<button type="button" class="row linkrow" data-a="' + x[2] + '" data-v="' + x[0] + '"><span>' + x[1] + '</span><span aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px"><b>Your data</b><p style="font-size:14px">' + (S ? 'Your plan is on this phone and saved to your account.' : 'Everything is saved only on this phone. Sign in at the top, or save a backup file now and then, in case you switch phones or clear your browser.') + '</p>' +
        '<button type="button" class="outline" data-a="copyplan">' + (U.copiedPlan ? '\u2713 Plan copied' : 'Copy my plan (to move it to the Home Screen app)') + '</button>' + (U.copiedPlan && U.planCode ? '<div class="stack" style="gap:6px"><small style="color:var(--green);font-weight:600">\u2713 Copied. This text is your whole plan:</small><textarea class="plancode" readonly rows="2" aria-label="Your copied plan">' + esc(U.planCode) + '</textarea><small style="color:var(--muted)">Now open the other app and tap <b>Sign in</b>, then <b>Have a backup file instead?</b> (or Settings \u2192 Bring a plan here), then <b>Paste my copied plan</b>. Nothing is deleted here.</small></div>' : '') +
        '<button type="button" class="outline" data-a="backup">Save a backup file</button><button type="button" class="outline" data-a="go" data-v="restore">Bring a plan here</button>' +
        wipeBox() + '</div>' +
        (CONFIG.feedbackUrl ? '<a class="outline" style="text-decoration:none;color:var(--ink)" href="' + esc(CONFIG.feedbackUrl) + '" target="_blank" rel="noopener">Send feedback</a>' : '') +
        '<a class="textbtn" style="text-align:center;text-decoration:none;display:block;padding-top:12px" href="privacy.html">Privacy</a>' +
        '<p class="fine">An educational budgeting tool, not financial, tax or investment advice. Beta \u00b7 version ' + APP_VERSION + '</p>';
    },
    saveinstall: function () {
      var ios = isIOS();
      if (standalone()) return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:10px;margin-top:18px"><div class="eyebrow">\u2713 Saved</div><h2>Budgeting with a spouse?</h2><p>Invite them and you\u2019ll both see one budget.</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:8px">' + shareBlock() + '</div>' +
        '<div class="push"><button type="button" class="primary" data-a="installok">Go to my plan</button></div>';
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:10px;margin-top:18px"><div class="eyebrow">' + (S ? '\u2713 Saved \u00b7 one more thing' : 'One more thing') + '</div><h2>Put it on your Home Screen</h2>' +
        '<p>It opens like an app, one tap away on payday.' + (S ? ' When you open it from there, sign in with the same email and your plan will be waiting.' : '') + '</p></div>' +
        guideBox(ios ? 'ios' : 'android') +
        (S ? '<div class="card stack" style="padding:16px 18px;gap:8px">' + shareBlock() + '</div>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="installok">Done, go to my plan</button><button type="button" class="textbtn" data-a="installlater">I\u2019ll do it later</button></div>';
    },
    savesetup: function () {
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:10px;margin-top:18px"><div class="eyebrow">' + (U.savePrompt ? 'One quick thing' : 'Last step') + '</div><h2>Save your progress</h2>' +
        '<p>' + (U.savePrompt ? 'Your plan lives only on this phone right now. Save it with your email so it\u2019s safe if you lose your phone or get a new one. Free, and no password.' : 'Your plan is built. Save it with your email so it\u2019s safe if you lose your phone or get a new one. Free, and no password.') + (!standalone() ? ' Next, we\u2019ll show you how to put it on your Home Screen.' : '') + '</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px">' + signInForm(true) + '</div>' +
        ((U.codeTries || 0) >= 2 ? '<button type="button" class="textbtn" data-a="saveskip" style="align-self:center">Having trouble? Continue for now</button>' : '') +
        '<p style="font-size:14px;text-align:center;color:var(--muted)">Budgeting with a spouse? Save first, then you can invite them on the next screen.</p>';
    },
    account: function () {
      if (S && !P.setupDone) return back('welcome') + '<div class="stack" style="gap:8px"><div class="eyebrow">\u2713 Signed in as ' + esc(S.email || '') + '</div><h2>Let\u2019s get your plan going</h2><p>Joining your spouse\u2019s budget? Enter the code they sent you. Starting your own? It takes 30 seconds.</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px">' + joinBlock() + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '') + '</div>' +
        '<div class="push"><button type="button" class="outline" data-a="go" data-v="welcome">Start my own plan</button></div>';
      return back(P.setupDone ? U.wizReturn || 'settings' : 'welcome') + '<h2>' + (S ? 'Your account' : U.joinMode ? 'Join your spouse\u2019s budget' : 'Sign in') + '</h2>' +
        (S ? '' : U.joinMode ? '<p>First sign in with your own email. Then enter the invite code your spouse sent you.</p>' : '<p>Your plan comes right back. Joining your spouse\u2019s budget? Sign in with your own email, then enter their code.</p>') + accountCard() + (!S ? '<button type="button" class="textbtn" data-a="go" data-v="restore" style="align-self:center;font-size:14px">Have a backup file instead?</button>' : '');
    },
    cloudpick: function () {
      var pk = U.cloudPick; if (!pk) return V.home();
      var when = function (t) { return t ? new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'earlier'; };
      return '<h2>Which plan do you want?</h2><p>Your account already has a plan, and so does this phone. Pick the one to keep. The other is saved for 30 days, so you can bring it back from Settings.</p>' +
        '<button type="button" class="choice best" data-a="cpick" data-v="cloud" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>The plan in my account</b><span class="d">Last changed ' + when(pk.at) + '</span></div></button>' +
        '<button type="button" class="choice" data-a="cpick" data-v="local" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>The plan on this phone</b><span class="d">Last changed ' + when(P.savedAt) + '</span></div></button>';
    },
    restore: function () {
      var tr = trashed();
      return back(P.setupDone ? 'settings' : 'welcome') + (tr ? '<button type="button" class="choice best" data-a="untrash" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>Bring back your earlier plan</b><span class="d">Saved ' + dayMonth(F.fromIso(tr.at)) + ' before it was deleted or replaced.</span></div></button>' : '') + '<h2>Bring your plan here</h2><p>Paste the plan you copied in Safari, or pick a backup file. It replaces what\u2019s on this phone.</p>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px"><b>Paste your plan</b><span style="font-size:14px;color:var(--muted)">In Safari: Find Me the Money \u2192 Settings \u2192 <b>Copy my plan</b>. Then press and hold below and tap <b>Paste</b>.</span>' +
        '<button type="button" class="outline" data-a="pasteclip">Paste my copied plan</button>' +
        '<textarea data-paste rows="3" placeholder="Or press and hold here, then Paste" aria-label="Paste your plan"></textarea><button type="button" class="primary" data-a="pasteplan">Bring my plan over</button>' +
        (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '') + '</div>' +
        '<label class="choice" style="cursor:pointer"><div class="ic">' + ICON.file + '</div><div><b>Or choose a backup file</b><span class="d">A .json file named find-me-the-money-backup</span></div><input type="file" accept=".json,application/json" data-file="backup" class="sr"></label>';
    }
  };

  function goalDateNote(f) {
    if (!f.by || !(num(f.amount) > 0)) return 'Pick a date and an amount to see what it takes.';
    if (f.by <= F.isoDay(today())) return 'Pick a date after today.';
    var n = paydaysUntil(f.by), per = Math.ceil(num(f.amount) / Math.max(1, n));
    return money(per) + ' each paycheck \u00b7 ' + plural(Math.max(1, n), 'payday') + ' until ' + longDate(F.fromIso(f.by));
  }
  // a goal in dollars: saved so far and what goes aside, no dates
  function goalText(g, go2, o) {
    var line = money(num(g.saved)) + ' of ' + money(num(g.amount)) + ' saved';
    if (g.kind === 'fund') return line + ' · ' + money(F.perCheck({ amount: g.amount, months: g.months || 6, kind: 'fund', saved: num(g.saved) }, F.FREQS[P.freq].perMonth)) + ' set aside each paycheck';
    if (g.per) return line + ' · ' + money(g.per) + ' each paycheck';
    return line + (o.state.debts.some(function (d) { return d.bal > 0; }) ? ' · starts once your debt is gone' : ' · funded from your extra');
  }

  // ---------- actions ----------
  function validate(n) {
    var w = WIZ[n - 1];
    if (w === 'pay') {
      if (!(num(P.paycheck) > 0)) return 'Enter your take-home pay per paycheck.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(P.nextPay)) return 'Pick your next payday.';
    }
    if (w === 'debts') {
      for (var i = 0; i < P.debts.length; i++) { var d = P.debts[i]; if (num(d.bal) > 0 && !(num(d.min) > 0)) return 'Add the minimum payment for ' + (d.name || 'each debt') + '. Your card or loan app shows it.'; }
    }
    return '';
  }
  function balancesNow() {
    var cur = { debts: {}, savings: num(P.savings), goals: {} };
    P.debts.forEach(function (d) { cur.debts[d.id] = num(d.bal); });
    P.goals.forEach(function (g) { cur.goals[g.id] = num(g.saved); });
    return cur;
  }
  // after balances change: count debt paid and money saved since last time, and any payoff or funded goal
  function recordBalances(before) {
    var prevDebts = before.debts;
    P.debts.forEach(function (d) { if (num(d.bal) > num(d.orig)) d.orig = num(d.bal); });
    var cur = balancesNow(), w = F.winsBetween(before, cur);
    P.totals.debtPaid += w.debtPaid; P.totals.saved += Math.max(0, w.saved);
    var paid = P.debts.filter(function (d) { return num(d.bal) <= 0 && num(prevDebts[d.id]) > 0; }).map(function (d) { return d.name; });
    var goal = P.goals.filter(function (g) { return num(g.saved) >= g.amount && !g.celebrated; })[0]; if (goal) goal.celebrated = true;
    P.history.push({ date: F.isoDay(today()), debt: P.debts.reduce(function (t, d) { return t + num(d.bal); }, 0), savings: num(P.savings), debtPaid: w.debtPaid, saved: w.saved });
    snapshot();
    return { w: w, paid: paid, goal: goal ? goal.name : null };
  }
  // ---------- coach offer: once, right after the first weekly recap ----------
  var COACH_KEY = 'fmtm.coach';
  function coachSeen() { try { return !!localStorage.getItem(COACH_KEY); } catch (e) { return false; } }
  function coachCard(found) {
    var f = Math.round(found || 0);
    return '<div class="coachcard" role="region" aria-label="Coaching"><h3>Want a coach in your corner?</h3>' +
      '<p>For $29 a month, get group coaching, people who check in with you, and unlimited snaps.</p>' +
      '<p class="coachline">' + (f >= 100 ? 'You found ' + money(f) + ' a month. Founding Members pay $29.' : 'Not much found yet? That\u2019s exactly what coaching is for.') + '</p>' +
      '<a class="coachbtn" href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener" data-a="coachgo">Become a Founding Member</a>' +
      '<button type="button" class="textbtn" data-a="coachlater">Maybe later</button></div>';
  }
  // the found money from "Find my money": monthly, can be $0 (or below, when there's a gap)
  function foundMonthly() { return quickMath().noJob; }
  // the payday recap: one card to screenshot or share
  function recapCard(r, title, savedStat) {
    var w = r.w, o = F.outlook(profile(), today()), sv = num(P.savings), prog = '';
    if (o.step <= 1) prog = ['$1,000 Emergency Fund', sv / F.CUSHION, money(sv) + ' of $1,000'];
    else if (o.step === 2 && o.target) { var d0 = P.debts.filter(function (d) { return d.id === o.target.id; })[0], og = Math.max(num(d0 && d0.orig), o.target.bal); prog = [esc(o.target.name), og ? (og - o.target.bal) / og : 0, money(o.target.bal) + ' left']; }
    else if (o.step === 3) prog = ['Full safety net', Math.min(1, sv / o.plan.safetyNet), money(sv) + ' of ' + money(o.plan.safetyNet)];
    var who = firstName();
    return '<div class="lime pop recap"><div class="recap-top"><span>Since your last update</span></div>' +
      '<div style="font-family:var(--display);font-size:30px;font-weight:600;line-height:1.15;margin-top:4px">' + title + '</div>' +
      '<div class="grid3 stats" style="margin-top:14px">' + stat(money(w.debtPaid), 'debt paid') + savedStat + (wkStreak() ? stat(String(wkStreak()), wkStreak() === 1 ? 'week in a row' : 'weeks in a row') : stat(money(P.totals.debtPaid), 'paid so far')) + '</div>' +
      (prog ? '<div class="recap-prog"><div><span>' + prog[0] + '</span><span>' + prog[2] + '</span></div><span class="rbar"><i style="width:' + Math.max(2, Math.min(100, prog[1] * 100)) + '%"></i></span></div>' : '') +
      '</div>';
  }
  // remembers where things stood, so the next balance update can count what changed
  function snapshot() {
    var o = F.outlook(profile(), today()), h = headline(o), free = F.freedomDate(o), cur = balancesNow();
    P.lastHeadline = h.date ? { kind: h.kind, date: F.isoDay(h.date) } : null;
    P.lastFree = free ? F.isoDay(free) : null;
    P.prevBalances = cur.debts; P.prevSavings = cur.savings; P.prevGoals = cur.goals;
  }
  // what the milestones and challenges look at
  function facts() {
    var p = profile(), pl = F.plan(p), open = p.debts.some(function (d) { return d.bal > 0; });
    return { setupDone: P.setupDone, sortedAll: P.tx.length > 0 && !spending().unsorted.length, checkins: Object.keys(P.wk || {}).filter(function (k) { return wkFull(P.wk[k]); }).length,
      streakBest: wkBest(), savings: p.savings, debtsPaid: P.debts.filter(function (d) { return num(d.orig) > 0 && num(d.bal) <= 0; }).length,
      debtPaidTotal: P.totals.debtPaid, daysBack: P.totals.daysBack, debtFree: P.debts.length > 0 && !open && P.debts.some(function (d) { return num(d.orig) > 0; }),
      safetyNet: !open && p.savings >= pl.safetyNet, goalsFunded: P.goals.filter(function (g) { return num(g.saved) >= g.amount; }).length, challengesDone: P.challengesDone || 0,
      earned: num(P.totals.earned), plansDone: P.plansDone || 0, ch30done: !!(P.challenge && P.challenge.completedAt), shares: P.shares || 0 };
  }
  // finishes challenges and awards milestones; new ones wait in P.unseen until celebrated
  function refresh() {
    if (!P.setupDone) return;
    var f = facts(), now = today(), iso = F.isoDay(now), changed = false;
    P.challenges.forEach(function (c) {
      if (c.ended) return;
      var st = F.challengeStatus(c, now, f);
      if (st.state === 'active') return;
      c.ended = st.state; c.endedOn = iso; changed = true;
      if (st.state === 'done') { P.challengesDone = (P.challengesDone || 0) + 1; P.unseen.push({ type: 'challenge', id: c.uid }); }
      else if (st.state === 'missed') c.note = st.label;
    });
    (P.plans || []).forEach(function (pl) {
      if (pl.ended || F.planStatus(pl, now).state !== 'done') return;
      pl.ended = 'done'; pl.endedOn = iso; P.plansDone = (P.plansDone || 0) + 1; P.unseen.push({ type: 'plan', id: pl.uid }); changed = true;
    });
    f.challengesDone = P.challengesDone || 0; f.plansDone = P.plansDone || 0;
    // features unlock one at a time, so a new plan isn't a wall of tabs
    var reset = (P.plans || []).filter(function (p) { return p.id === 'reset7'; }), rdone = [];
    reset.forEach(function (p) { rdone = rdone.concat(p.done || []); });
    P.unlocked = P.unlocked || {};
    if (!P.unlocked.milestones && (rdone.indexOf(1) >= 0 || f.checkins >= 1)) { P.unlocked.milestones = true; P.unseen.push({ type: 'unlock', id: 'milestones' }); changed = true; }
    // (the old small challenges are gone, so they no longer unlock)
    // a new step on the path is the biggest win of all
    var stepNow = F.outlook(profile(), now).step;
    if (P.topStep == null) P.topStep = stepNow;
    else if (stepNow > P.topStep) { P.unseen.unshift({ type: 'level', id: String(stepNow), from: P.topStep }); P.topStep = stepNow; changed = true; }
    BADGES.forEach(function (b) { if (!P.badges[b.id] && b.test(f)) { P.badges[b.id] = iso; P.unseen.push({ type: 'badge', id: b.id }); changed = true; } });
    if (P.challenges.length > 40) P.challenges = P.challenges.filter(function (c) { return !c.ended; }).concat(P.challenges.filter(function (c) { return c.ended; }).slice(-30));
    if (changed) save();
  }
  function unseenItem(u) {
    if (u.type === 'badge') { var b = BADGES.filter(function (x) { return x.id === u.id; })[0]; return b ? { eyebrow: 'New milestone', title: b.title, desc: b.desc, share: 'sharebadge', v: b.id } : null; }
    if (u.type === 'level') { var sn = Math.min(+u.id, 7); return { eyebrow: 'Level up · Step ' + sn + ' of 7', title: 'Welcome to ' + F.STEPS[sn - 1][0], desc: STEP_WHY[sn - 1], share: 'sharestep', v: u.id, journey: journey(sn, { key: 'level' + u.id, from: u.from }) }; }
    if (u.type === 'unlock') return u.id === 'challenges'
      ? { eyebrow: 'New: Challenges', title: 'Small sprints, real wins', desc: 'Start with the Emergency Fund Sprint or Cook at Home 7. Finish one and you get a card to share.', share: 'openunlock', v: 'challenges', label: 'Take a look' }
      : { eyebrow: 'New: Milestones', title: 'Your wins, all in one place', desc: 'Little milestones along the way, from your first $250 saved to debt-free.', share: 'openunlock', v: 'milestones', label: 'Take a look' };
    if (u.type === 'plan') { var pl = P.plans.filter(function (x) { return x.uid === u.id; })[0]; if (!pl) return null; var pd = F.planDef(pl.id); return { eyebrow: 'Plan complete', title: pd.title, desc: pd.share, share: 'shareplan', v: pl.uid }; }
    var c = P.challenges.filter(function (x) { return x.uid === u.id; })[0]; if (!c) return null;
    var d = F.challengeDef(c.id); return { eyebrow: 'Challenge complete', title: d.title, desc: d.share, share: 'sharech', v: c.uid };
  }
  // the sunrise "you did it" card; shows up to max new wins of one type (or any)
  function celebration(max, type) {
    var items = P.unseen.filter(function (u) { return !type || (Array.isArray(type) ? type.indexOf(u.type) >= 0 : u.type === type); }).slice(0, max).map(function (u) { return [u, unseenItem(u)]; }).filter(function (x) { return x[1]; });
    if (!items.length) return '';
    var more = P.unseen.length - items.length;
    return '<div class="sunburst" aria-hidden="true"></div>' + items.map(function (x, i) {
      var it = x[1];
      return '<div class="toast win stack" role="status" style="gap:8px"><span style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8">' + it.eyebrow + '</span>' + (it.journey || '') + '<b>' + it.title + '</b><span>' + it.desc + '</span>' +
        '<div style="display:flex;gap:10px;margin-top:4px"><button type="button" class="sharebtn" data-a="' + it.share + '" data-v="' + it.v + '">' + (it.label || ICON.share + ' Share') + '</button><button type="button" class="sharebtn ghost" data-a="seen" data-v="' + x[0].type + ':' + x[0].id + '">Nice!</button></div>' +
        (i === items.length - 1 && more > 0 && max === 1 ? '<span style="font-size:13px">+' + more + ' more in Milestones</span>' : '') + '</div>';
    }).join('');
  }
  function markSeen(key) { P.unseen = P.unseen.filter(function (u) { return u.type + ':' + u.id !== key; }); save(); }
  function caption() {
    var c = U.card; return (c.caption || c.title) + ' #FindMeTheMoney';
  }
  var CARD_FORMATS = [['post', 'Post', 'Instagram and Facebook feeds (4:5)'], ['story', 'Story', 'Instagram, Facebook and TikTok stories (9:16)'], ['square', 'Square', 'Works almost anywhere (1:1)'], ['wide', 'Skool', 'Skool, Facebook and X posts (16:9)']];
  function openShare(card) {
    U.card = card; U.showAmt = true; U.cardImg = null; U.shareErr = ''; U.copied = false;
    if (U.screen !== 'share') U.shareBack = U.screen;
    go('share'); drawCard();
  }
  function drawCard() {
    var c = U.card;
    window.FMTMShare.build({ eyebrow: c.eyebrow, title: c.title, sub: U.showAmt ? c.sub : (c.subNoAmt || c.sub), chips: U.showAmt ? c.chips : (c.chipsNoAmt || c.chips), footer: CONFIG.shareUrl ? CONFIG.shareUrl : null, step: c.step }, function (img) {
      U.cardImg = img; if (U.screen === 'share') render();
    }, U.fmt || 'post');
  }
  function streakChips() {
    var out = [];
    var n = wkStreak(); if (n >= 2) out.push(n + ' weeks in a row');
    return out;
  }
  function cardForStep() {
    var o = F.outlook(profile(), today()), st = Math.min(o.step, 7), name = F.STEPS[st - 1][0];
    return { eyebrow: 'Step ' + st + ' of 7', title: st === 1 ? 'I started my path to debt-free' : 'I made it to ' + name, sub: STEP_WHY[st - 1], step: st,
      chips: streakChips().length ? streakChips() : ['On the 7-step path'], caption: st === 1 ? 'Day one of my 7-step path to debt-free.' : 'Step ' + st + ' of 7: ' + name + '.' };
  }
  function cardForBadge(id) {
    var b = BADGES.filter(function (x) { return x.id === id; })[0], money1 = /^(paid|saved)-|^cushion$/.test(id);
    return { eyebrow: 'Milestone unlocked', title: b.title, sub: b.desc, subNoAmt: money1 ? (/^paid/.test(id) ? 'Another debt milestone, paid down.' : 'My emergency savings keep growing.') : b.desc,
      chips: ['Milestone ' + Object.keys(P.badges).length + ' of ' + BADGES.length].concat(streakChips()).slice(0, 3), caption: 'Milestone unlocked: ' + b.title + '.' };
  }
  function cardForChallenge(uid) {
    var c = P.challenges.filter(function (x) { return x.uid === uid; })[0], d = F.challengeDef(c.id);
    var extra = d.kind === 'amount' && c.amount ? ['$' + Math.round(c.amount) + ' found'] : [];
    var len = [(d.kind === 'count' ? d.target + ' in ' + d.days + ' days' : d.days + '-day challenge')];
    return { eyebrow: 'Challenge complete', title: d.title, sub: d.share, chips: len.concat(extra, streakChips()).slice(0, 3), chipsNoAmt: len.concat(streakChips()).slice(0, 3), caption: 'Challenge complete: ' + d.title + '!' };
  }
  // ---------- lessons (lessons.json): the daily checklist reads them ----------
  var LESSONS = null;
  try { fetch('lessons.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (l) { LESSONS = {}; l.forEach(function (x) { LESSONS[x.id] = x; }); if (U.screen === 'lesson' || U.screen === 'journey') render(); }).catch(function () {}); } catch (e) {}
  // Step 1's lessons: all about the $1,000 emergency fund (text in lessons.json; titles here until it loads)
  var CUSHION_LESSONS = [['C1', 'Why $1,000 comes first'], ['C2', 'Where to keep it'], ['C3', 'What counts as an emergency'], ['C4', 'Make it a payday habit']];
  // Step 2's lessons: the debt snowball
  var SNOWBALL_LESSONS = [['D1', 'Smallest debt first'], ['D2', 'Stop adding new debt'], ['D3', 'Roll it forward'], ['D4', 'Speed it up']];
  function lessonFor(id) {
    if (LESSONS && LESSONS[id]) return LESSONS[id];
    var c = CUSHION_LESSONS.concat(SNOWBALL_LESSONS).filter(function (x) { return x[0] === id; })[0]; if (c) return { id: id, title: c[1], card1: '', card2: '', card3: '', action: '', actionLabel: '', skoolUrl: '' };
    var m = /^reset7-(\d)$/.exec(id); if (!m) return null;
    var d = F.planDef('reset7').days[+m[1]], r = d.read.concat(['']);
    return { id: id, title: d.title, card1: r[0], card2: r[1], card3: r[2] || '', action: d.action[1], actionLabel: d.action[0], skoolUrl: '' };
  }
  function lessonDone(id) { if (((P.journey || {}).done || []).indexOf(id) >= 0) return true; var m = /^reset7-(\d)$/.exec(id); if (m) { var run = P.plans.filter(function (p) { return p.id === 'reset7'; })[0]; return !!run && run.done.indexOf(+m[1]) >= 0; } return ((P.journey || {}).done || []).indexOf(id) >= 0; }
  // the step's progress: the gauge, dollars left in the middle, saved and goal under it (Home)
  function progGauge(o, p) {
    var pl = o.plan, step = o.step;
    var prog = '';
    if (step === 1) prog = [p.savings / F.CUSHION, money(p.savings) + ' saved', money(F.CUSHION) + ' goal'];
    else if (step === 2) { var t = o.target, d0 = P.debts.filter(function (d) { return d.id === t.id; })[0], orig = Math.max(num(d0.orig), t.bal); prog = [(orig - t.bal) / orig, money(orig - t.bal) + ' paid', money(orig) + ' total']; }
    else if (step === 3) prog = [Math.min(1, p.savings / pl.safetyNet), money(p.savings) + ' saved', money(pl.safetyNet) + ' goal (' + efMonths() + ' months)'];
    var left = step === 1 ? Math.max(0, F.CUSHION - p.savings) : step === 2 && o.target ? o.target.bal : step === 3 ? Math.max(0, pl.safetyNet - p.savings) : 0;
    var leftText = step === 1 ? 'left to your $1,000 Emergency Fund' : step === 2 && o.target ? 'left on ' + esc(o.target.name) : step === 3 ? 'left to your Full Safety Net' : '';
    return gauge(prog ? prog[0] : 1, step >= 4 ? 'ok' : 'prog') +
      (step <= 3 ? '<div class="hmid"><div class="hbig' + (money(left).length > 6 ? ' word' : '') + '">' + money(left) + '</div><small>' + leftText + '</small></div>'
        : '<div class="hmid"><div class="hbig" style="font-size:30px">Debt-free</div><small>with a full safety net</small></div>') +
      (prog ? '<div class="hpill"><span>' + prog[1] + '</span><b>' + Math.round(Math.min(1, prog[0]) * 100) + '%</b><span>' + prog[2] + '</span></div>' : '');
  }
  // a row of bubble tabs that scrolls sideways
  function tabChips(action, cur, opts) {
    return '<div class="tabchips" role="tablist">' + opts.map(function (o) { var on = cur === o[0]; return '<button type="button" role="tab" class="chip' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-a="' + action + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function homeTop(toast) {
    toast = toast || '';
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px"><span class="brand"><span class="logo" style="width:30px;height:30px;border-radius:10px">' + ICON.logo + '</span>Find Me the Money</span>' +
      '<span class="hdricons">' + (CONFIG.communityUrl ? '<a class="back ytbtn" href="' + esc(CONFIG.communityUrl) + '" target="_blank" rel="noopener" data-a="joincommunity" aria-label="Open the community on Skool"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect width="22" height="22" rx="6" fill="#1F2A44"/><text x="11" y="15.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#fff">S</text></svg></a>' : '') + (CONFIG.youtubeUrl ? '<a class="back ytbtn" href="' + esc(CONFIG.youtubeUrl) + '" target="_blank" rel="noopener" data-a="youtube" aria-label="Watch on YouTube"><svg width="22" height="16" viewBox="0 0 22 16" aria-hidden="true"><rect width="22" height="16" rx="4" fill="#FF0033"/><path d="M9 4.5v7l6-3.5z" fill="#fff"/></svg></a>' : '') +
      '<button type="button" class="back" data-a="go" data-v="settings" aria-label="Settings">' + ICON.gear + '</button></span></div>' +
      toast + celebration(1);
  }
  function pathCard(o, step) {
    return '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0"><div style="min-width:0"><b>Step ' + Math.min(step, 7) + ' of 7: ' + F.STEPS[Math.min(step, 7) - 1][0] + '</b><small>' + F.STEPS[Math.min(step, 7) - 1][1] + '</small></div>' +
      '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px;white-space:nowrap" data-a="ladder" aria-expanded="' + !!U.showLadder + '">' + (U.showLadder ? 'Hide' : 'All 7 steps') + '</button></div>' + (U.showLadder ? journey(step, { small: true, progress: stepProgress(o) }) + ladderHtml(step) : '') + '</div>';
  }
  // the community lives on Skool; Home always shows it, switching between the free community and coaching
  function communityCard() {
    var url = CONFIG.communityUrl, curl = CONFIG.coachingUrl || url; if (!url) return '';
    var ct = U.commTab || '', coach = ct === 'coach';
    var items = coach
      ? [['2 live coaching calls a month', 'Bring your questions, leave with a clear next step.'], ['An accountability group', 'People who check in with you on the hard months.'], ['Feedback on your budget', 'A coach looks at your plan and tells you what to change.'], ['Unlimited snaps', 'Snap every receipt and bank screenshot you want.']]
      : [['Weekly recaps, together', 'Share how your week went. Streaks are easier with company.'], ['Live challenges', 'Run a No-Spend Weekend or Emergency Fund Sprint with a group.'], ['Ask anything', 'Stuck on a bill or a tough month? Ask people on the same path.']];
    return '<div class="card stack commcard" style="padding:16px 18px;gap:10px"><b style="font-size:18px">You don\u2019t have to do this alone</b>' +
      tabChips('commtab', ct, [['free', 'Free Community'], ['coach', 'Partner with a Coach']]) + (!ct ? '</div>' :
      '<div class="stack" style="gap:8px">' + items.map(function (x) { return '<div><b style="font-size:15px">' + x[0] + '</b><small style="display:block;color:var(--muted);font-size:14px">' + x[1] + '</small></div>'; }).join('') + '</div>' +
      (coach ? '<small style="color:var(--muted);font-size:13px"><b>Who\u2019s Brad?</b> I\u2019m a certified financial coach. My family found financial freedom so we could do what we believe God called us to, like my wife staying home with our kids on one income.</small>' +
          '<a class="primary" style="text-decoration:none;display:grid;place-items:center" href="' + esc(curl) + '" target="_blank" rel="noopener" data-a="coaching">Learn about coaching</a><small style="text-align:center;color:var(--muted);font-size:13px">\ud83c\udf05 Founding Members: $29 a month, price locked for life, first 25 only</small>'
        : '<a class="primary" style="text-decoration:none;display:grid;place-items:center" href="' + esc(url) + '" target="_blank" rel="noopener" data-a="joincommunity">' + (P.communityJoined ? 'Open the community' : 'Join the FREE community') + '</a>') +
      '</div>');
  }
  function homeRest() {
    return calendarCard() + communityCard() + '<p class="fine">Find Me the Money is an educational budgeting tool, not financial, tax or investment advice.</p>';
  }
  function stat(v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; }
  // ---------- the weekly recap: a week (Sunday to Saturday) counts when its 3 steps are done ----------
  // P.wk[sunday] = { cat: day purchases were categorized, bal: day balances were updated, done: day the recap was read, snap }
  function wkStart(d) { return weekOf(d || today())[0]; }
  function wkRec(ws) { P.wk = P.wk || {}; return P.wk[ws || wkStart()] || {}; }
  // a week whose 3 steps are all done sends "week-done" once (the coaching view counts weeks and streaks from it)
  function wkMark(k) { P.wk = P.wk || {}; var ws = wkStart(), r = P.wk[ws] = P.wk[ws] || {}, was = wkFull(r); if (!r[k]) r[k] = F.isoDay(today()); if (!was && wkFull(r)) track('week-done'); }
  function wkFull(r) { return !!(r && r.cat && r.bal && r.done); }
  function wkBest() {
    var ks = Object.keys(P.wk || {}).filter(function (k) { return wkFull(P.wk[k]); }).sort(), best = 0, run = 0, last = null;
    ks.forEach(function (k) { run = last && F.daysBetween(F.fromIso(last), F.fromIso(k)) === 7 ? run + 1 : 1; best = Math.max(best, run); last = k; });
    return best;
  }
  function wkStreak() {
    var ws = wkStart(), n = 0, d = F.fromIso(ws);
    if (!wkFull(wkRec(ws))) d = F.addDays(d, -7);
    while (wkFull(wkRec(F.isoDay(d)))) { n++; d = F.addDays(d, -7); }
    return n;
  }
  function balSnap() {
    var o = { sv: num(P.savings), debt: P.debts.reduce(function (t, d) { return t + num(d.bal); }, 0), funds: {}, goals: {} };
    funds().forEach(function (f) { o.funds[f.id] = round2(fundBal(f)); }); P.goals.forEach(function (g) { o.goals[g.id] = num(g.saved); });
    return o;
  }
  // the last recap read before this week, to show what changed
  function prevSnap(ws) { var ks = Object.keys(P.wk || {}).filter(function (k) { return k < ws && P.wk[k].snap; }).sort(); return ks.length ? P.wk[ks[ks.length - 1]].snap : null; }
  function weekSpend(ws, we) {
    var fundPaid = {}; P.bills.forEach(function (b) { if (fromFund(b)) fundPaid['b:' + b.id] = 1; });
    var by = {}, sl = P.storeLine || {}, add = function (k, a) { if (!k || isFundKey(k) || fundPaid[k]) return; by[k] = (by[k] || 0) + num(a); };
    (P.spends || []).forEach(function (x) { if (x.date >= ws && x.date <= we) add(x.key, x.amount); });
    (P.tx || []).forEach(function (x) { if (x.date >= ws && x.date <= we) add(sl[x.merchant], x.amount); });
    return by;
  }
  function donut(parts) {
    var tot = parts.reduce(function (t, x) { return t + x.v; }, 0), r = 52, c = 2 * Math.PI * r, at = 0;
    if (!tot) return '<svg class="donut" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="' + r + '" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="20"/></svg>';
    return '<svg class="donut" viewBox="0 0 140 140" aria-hidden="true"><g transform="rotate(-90 70 70)">' + parts.map(function (x) {
      var len = x.v / tot * c, seg = '<circle cx="70" cy="70" r="' + r + '" fill="none" stroke="' + x.c + '" stroke-width="20" stroke-dasharray="' + Math.max(0, len - (parts.length > 1 ? 1.5 : 0)).toFixed(2) + ' ' + c.toFixed(2) + '" stroke-dashoffset="' + (-at).toFixed(2) + '"/>';
      at += len; return seg;
    }).join('') + '</g></svg>';
  }
  function wkCheck(on, label, act, v) {
    return '<div class="wkstep' + (on ? ' on' : '') + '"><span class="wkc">' + (on ? ICON.check('#141414', 14) : '') + '</span><span class="wkl">' + label + '</span>' + (on || !act ? '' : '<button type="button" class="sharebtn" data-a="' + act + '"' + (v ? ' data-v="' + v + '"' : '') + '>Go</button>') + '</div>';
  }
  function selectCaption() { var el = document.getElementById('caption'); if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  function download(name, type, text) {
    var blob = text instanceof Blob ? text : new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function readFile(input, cb) {
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { U.err = 'That file is bigger than 5 MB. Try a shorter date range.'; render(); return; }
    var r = new FileReader(); r.onload = function () { cb(String(r.result)); }; r.onerror = function () { U.err = 'We couldn’t open that file.'; render(); }; r.readAsText(f);
  }

  var CONFIRM_FIRST = { rm: 1, spenddel: 1, goaldel: 1, dueclear: 1, catdel: 1, recurdel: 1, funddel: 1 };
  function resetConfirm() {
    clearTimeout(U.confirmTimer);
    var el = U.confirmEl; if (el && el.isConnected) { el.innerHTML = el.getAttribute('data-was'); el.classList.remove('confirmdel'); }
    U.confirmDel = null; U.confirmEl = null;
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), i = +b.getAttribute('data-i');
    // deleting takes two taps: the first turns the button into "Delete?"
    if (CONFIRM_FIRST[a]) {
      var sig = a + '|' + v + '|' + b.getAttribute('data-i');
      if (U.confirmDel !== sig) {
        resetConfirm(); U.confirmDel = sig; U.confirmEl = b; b.setAttribute('data-was', b.innerHTML);
        b.innerHTML = 'Delete?'; b.classList.add('confirmdel'); U.confirmTimer = setTimeout(resetConfirm, 4000);
        return;
      }
      clearTimeout(U.confirmTimer); U.confirmDel = null; U.confirmEl = null;
    } else resetConfirm();
    switch (a) {
      case 'go': if (v === 'journey' && b.closest('.tabbar')) U.jTab = null; if (v === 'savings' && U.screen === 'path') track('setup-start'); if (v === 'sort') U.sortHist = []; U.confirmDelete = false; if (v === 'found') U.limit = null; go(v); break;
      case 'freq': P.freq = v; save(); render(); break;
      case 'givemode': (function () {
        var inc = monthlyIncome();
        // switching keeps about the same amount
        if (v === 'amt' && P.giveMode !== 'amt') P.giveMonthly = P.givingPct && inc ? String(Math.round(inc * P.givingPct / 100)) : P.giveMonthly;
        if (v === 'pct' && P.giveMode === 'amt') P.givingPct = num(P.giveMonthly) && inc ? Math.round(num(P.giveMonthly) / inc * 100) : P.givingPct;
        P.giveMode = v; save(); render();
      })(); break;
      case 'answer': P[b.getAttribute('data-k')] = v;
        if (b.getAttribute('data-k') === 'retire' && (v === 'some' || v === 'full') && !(P.retirements || []).length) P.retirements = [{ id: uid(), owner: 0, type: '401(k)', pct: '', monthly: '', bal: '', from: 'pre' }];
        save(); render(); break;
      case 'retadd': P.retirements = P.retirements || []; P.retirements.push({ id: uid(), owner: (P.incomes || []).length && P.retirements.length ? 1 : 0, type: '', pct: '', monthly: '', bal: '', from: 'pre' }); save(); render(); break;
      case 'retowner': P.retirements[i].owner = +v; save(); render(); break;
      case 'rettype': P.retirements[i].type = v; save(); render(); break;
      case 'retfrom': P.retirements[i].from = v; save(); render(); break;
      case 'otheradd': P.otherIncome = P.otherIncome || []; P.otherIncome.push({ id: uid(), label: v, amount: '' }); save(); render(); (function () { var ins = app.querySelectorAll('[data-list=otherIncome][data-i="' + (P.otherIncome.length - 1) + '"]'); if (ins.length) ins[v ? 1 : 0].focus(); })(); break;
      case 'savepick': P.savings = v; save(); render(); break;
      case 'add':
        if (v === 'bills') P.bills.push({ name: '', amount: '' });
        else P.debts.push({ id: uid(), name: '', bal: '', orig: '', min: '', apr: '' });
        save(); render(); break;
      case 'rm': P[v].splice(i, 1); if (v === 'funParts') { var fs = P.funParts.reduce(function (a, x) { return a + num(x.amount); }, 0); if (fs > 0) P.fun = String(fs); } if (v === 'payHist') payFromHist(); save(); render(); break;
      case 'billadd': (function (g) {
        P.bills.push({ name: v, amount: '', group: g, per: b.getAttribute('data-per') || '' }); save(); render();
        var ins = app.querySelectorAll('[data-list=bills][data-i="' + (P.bills.length - 1) + '"]'); if (ins.length) ins[v ? 1 : 0].focus();
      })(b.getAttribute('data-g')); break;
      case 'funadd':
        P.funParts = P.funParts || []; P.funParts.push({ name: v, amount: '' }); save(); render();
        (function () { var ins = app.querySelectorAll('[data-list=funParts][data-i="' + (P.funParts.length - 1) + '"]'); if (ins.length) ins[v ? 1 : 0].focus(); })(); break;
      case 'billper': P.bills[i].per = P.bills[i].per === 'yr' ? '' : 'yr'; save(); render(); break;
      case 'billgrp': (function () {
        if (!U.billOpen) { U.billOpen = {}; P.bills.forEach(function (x) { U.billOpen[x.group] = true; }); }
        U.billOpen[v] = !U.billOpen[v];
      })(); render(); break;
      case 'guidestep': (function () { var k = b.getAttribute('data-k'); U.gStep = U.gStep || {}; U.gPaused = U.gPaused || {}; U.gStep[k] = +v; U.gPaused[k] = true; clearInterval(csvTimer); csvTimer = null; var el = app.querySelector('[data-guide="' + k + '"]'); if (el) el.innerHTML = guideScene(k, U.gStep[k]); })(); break;
      case 'obback': (function () { var i = obAt(); if (i > 0) { if (OB[i] === 'save' && U.cloudStep && U.cloudStep.sent) { U.cloudStep = null; render(); return; } var to = OB[i - 1] === 'finding' ? (num(P.qDebt) > 0 ? 'mins' : 'debt') : OB[i - 1]; obGo(to); } })(); break;
      case 'obnext': (function () {
        var k = OB[obAt()], it = P.intro = P.intro || {};
        if (k === 'name') { var nv = String((app.querySelector('[data-obname]') || {}).value || '').trim().replace(/\s+/g, ' ').slice(0, 40); if (!nv) { U.err = 'Add your first name.'; render(); return; } setMe({ name: nv }); }
        if (k === 'feel') { var fr = app.querySelector('[data-obfeel]'); it.feel = fr ? +fr.value : 50; save(); }
        if (k === 'pay' && !(num(P.paycheck) > 0)) { U.err = 'Enter your take-home pay per paycheck. A rough guess is fine.'; render(); return; }
        if (k === 'exp' && !(num(P.qExp) > 0)) { U.err = 'Enter about how much your bills are a month. A rough guess is fine.'; render(); return; }
        if (k === 'mins' && num(P.qDebt) > 0 && !(num(P.qMin) > 0)) { U.err = 'Add your monthly debt payments. A rough guess is fine.'; render(); return; }
        if (k === 'nextpay' && !/^\d{4}-\d{2}-\d{2}$/.test(P.nextPay)) { U.err = 'Pick your next payday.'; render(); return; }
        if (k === 'mins') { obApply(); track('quick-done'); }
        if (k === 'found') track('reveal-reached');
        if (k === 'first4') { track('claim'); U.obAfter = true; U.afterSave = false; U.cloudStep = null; }
        if (k === 'story1') track('setup-start');
        obGo(OB[Math.min(obAt() + 1, OB.length - 1)]);
      })(); break;
      case 'obpick': (function () { var it = P.intro = P.intro || {}; it[b.getAttribute('data-k')] = v; save(); obGo(OB[obAt() + 1]); })(); break;
      case 'obfreq': P.freq = v; save(); obGo('nextpay'); break;
      case 'obnodebt': P.qDebt = ''; P.qMin = ''; save(); obApply(); track('quick-done'); obGo('finding'); break;
      case 'obhome': U.obAfter = false; go('home'); break;
      case 'obskip': if (!P.setupDone) finishSetup(); track('save-skip'); U.obAfter = false; U.cloudStep = null; U.afterSave = false; go('steps'); break;
      case 'btab': U.bTab = v; U.sheet = null; U.catAdd = false; render(); break;
      case 'catopen': if (!v) { U.sheet = null; render(); break; } U.catKey = v; U.catAll = false; U.catAdd = false; go('catlog'); break;
      case 'catedit': U.sheet = { k: 'cat', key: v }; render(); break;
      case 'catall': U.catAll = v === '1'; render(); break;
      case 'sheetopen': U.sheet = { k: v }; render(); break;
      case 'mmplan': U.plusOpen = false; render(); mmOpenPlan(mmToday(), 'dinner'); break;
      case 'mmnew': U.plusOpen = false; mmStartEdit(null, 'meals'); break;
      case 'recapwk': U.recapWk = mmAdd(U.recapWk || weekOf(today())[0], +v); render(); break;
      case 'recapopen': U.recapBack = U.screen; U.recapWk = null; go('recap'); break;
      case 'tourreplay': try { localStorage.removeItem(TOUR_KEY); } catch (e) {} track('tour-replay'); U.bTab = 'spend'; U.jTab = null; go('home'); break;
      case 'frontstart': U.front = false; clearInterval(wf.timer); track('welcome-start'); U.ob = OB[0]; render(); window.scrollTo(0, 0); break;
      case 'recapgo': if (v === 'cat') { openScan(); } else { U.bTab = 'save'; go('plan'); U.sheet = { k: 'bal' }; render(); } break;
      case 'recapdone': U.recapCoach = !coachSeen() && !!CONFIG.communityUrl && !Object.keys(P.wk || {}).some(function (k) { return P.wk[k].done; }); wkMark('done'); P.wk[wkStart()].snap = balSnap(); save(); track('recap-done'); U.recapToast = wkFull(wkRec()) ? plural(wkStreak(), 'week') + ' in a row' : 'Recap done'; render(); window.scrollTo(0, 0); break;
      case 'fundopen': (function () {
        var f = v ? funds().filter(function (x) { return x.id === v; })[0] : null;
        U.form = f ? { id: f.id, name: f.name, amount: f.amount, per: f.per || 'week', day: fundDay(f), bal: round2(fundBal(f)), icon: f.icon, color: f.color } : { name: '', amount: '', per: 'week', day: fundDay({}), bal: '' };
        U.formErr = ''; U.sheet = { k: 'fund' }; render();
      })(); break;
      case 'fundper': U.form.per = v; render(); break;
      case 'goalpause': P.goals.forEach(function (g) { if (g.id === v) g.paused = !g.paused; }); save(); track('goal-aside-toggle'); render(); break;
      case 'fundday': U.form.day = +v; render(); break;
      case 'fundcolor': U.form.color = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=fundcolor]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'fundicon': U.form.icon = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=fundicon]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'fundsave': (function () {
        var fd = U.form, nm = String(fd.name || '').trim().slice(0, 30);
        if (!nm) { U.formErr = 'Give the fund a name.'; render(); return; }
        var f = fd.id ? funds().filter(function (x) { return x.id === fd.id; })[0] : null;
        budgetV2(); var was = f ? fundMonthly(f) : null;
        if (!f) { f = { id: uid() }; funds().push(f); track('fund-add'); }
        f.name = nm; f.amount = String(round2(Math.max(0, num(fd.amount)))); f.per = fd.per || 'week'; if (f.per === 'week') f.day = fd.day != null ? +fd.day : fundDay({}); f.icon = fd.icon || f.icon || '\uD83D\uDCB0'; if (fd.color) f.color = fd.color;
        f.start = String(round2(Math.max(0, num(fd.bal)) - fundNet(f)));
        if (was != null) shiftRough(fundMonthly(f) - was);
        U.sheet = null; U.form = null; save(); render();
      })(); break;
      case 'funddel': budgetV2(); funds().forEach(function (x) { if (x.id === U.form.id) shiftRough(-fundMonthly(x)); }); P.bills.forEach(function (b) { if (b.fund === U.form.id) { delete b.fund; shiftRough(F.billMonthly(b)); } }); P.funds = funds().filter(function (x) { return x.id !== U.form.id; }); U.sheet = null; U.form = null; save(); render(); break;
      case 'sheetclose': U.sheet = null; U.formErr = ''; render(); break;
      case 'incfreq': U.sheet.freq = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=incfreq]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'incsave': (function () {
        var pay = app.querySelector('[data-incpay]'), nx = app.querySelector('[data-incnext]');
        if (pay && pay.value !== '' && num(pay.value) > 0) P.paycheck = String(round2(num(pay.value)));
        if (U.sheet.freq) P.freq = U.sheet.freq;
        if (nx && /^\d{4}-\d{2}-\d{2}$/.test(nx.value)) P.nextPay = nx.value;
        save(); track('income-edit'); U.sheet = null; render();
      })(); break;
      case 'balsave': (function () {
        var before = balancesNow();
        Array.prototype.forEach.call(app.querySelectorAll('[data-bal]'), function (el) {
          if (el.value === '') return; var k = el.getAttribute('data-bal'), val = String(round2(Math.max(0, num(el.value))));
          if (k === 'savings') P.savings = val;
          else if (k === 'goal') { var g = P.goals[+el.getAttribute('data-i')]; if (g) g.saved = num(val); }
          else if (k === 'fund') funds().forEach(function (f) { if (f.id === el.getAttribute('data-v')) f.start = String(round2(num(val) - fundNet(f))); });
          else if (k === 'debt') P.debts.forEach(function (d) { if (d.id === el.getAttribute('data-v')) { d.bal = val; if (num(val) > num(d.orig)) d.orig = num(val); } });
        });
        var res = recordBalances(before); wkMark('bal'); if (chCanEdit()) { if (!chRec(chToday()).balUpdated) track('daily-item'); chRec(chToday(), true).balUpdated = true; } save(); track('balance-update'); U.sheet = null;
        if (res.paid.length || res.goal) { U.result = res; go('wins'); } else render();
      })(); break;
      case 'stepsave': (function () { var el = app.querySelector('[data-stepin]'); if (el && el.value !== '') { P.stepAmt = String(round2(Math.max(0, num(el.value)) / F.FREQS[P.freq].perMonth)); save(); track('step-assign'); } U.sheet = null; render(); })(); break;
      case 'catadd': (function () {
        if (v === 'open') { U.catAdd = true; U.sheet = null; render(); return; }
        if (!v) { U.catAdd = false; render(); return; }
        budgetV2(); var c = { id: uid(), type: WANT_WORDS.test(v) ? 'want' : 'need', name: v, icon: b.getAttribute('data-i') || '🧾', amount: '' }; cats().push(c); U.catAdd = false; U.sheet = { k: 'cat', key: 'c:' + c.id }; save(); track('cat-add'); render();
        var am = app.querySelector('[data-catamt]'); if (am) am.focus();
      })(); break;
      case 'catnew': (function () {
        var nm = String((app.querySelector('[data-catnew]') || {}).value || '').trim().slice(0, 30); if (!nm) return;
        budgetV2(); var c = { id: uid(), type: WANT_WORDS.test(nm) ? 'want' : 'need', name: nm, icon: iconFor(nm), amount: '' }; cats().push(c); U.catAdd = false; U.sheet = { k: 'cat', key: 'c:' + c.id }; save(); track('cat-add'); render();
      })(); break;
      case 'catper': U.sheet.per = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=catper]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); (function () { var lb = app.querySelector('[data-live=catamtlabel]'); if (lb) lb.textContent = v === 'week' ? 'Each week' : 'Each month'; })(); break;
      case 'cattype': U.sheet.type = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=cattype]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'catcolor': U.sheet.color = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=catcolor]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'caticon': U.sheet.icon = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=caticon]'), function (x) { x.classList.toggle('on', x.getAttribute('data-v') === v); }); break;
      case 'catsave': (function () {
        budgetV2();
        var amt = app.querySelector('[data-catamt]'), nmI = app.querySelector('[data-catname]'), val = amt && amt.value !== '' ? Math.max(0, num(amt.value)) : null;
        // a first amount splits the total; a change to an amount changes the total
        if (v.indexOf('c:') === 0) { var c = cats().filter(function (x) { return 'c:' + x.id === v; })[0]; if (c) { var was = c.amount !== '' ? catMonthly(c) : null; if (U.sheet && U.sheet.per) c.per = U.sheet.per; if (val != null) c.amount = String(round2(val)); if (was != null) shiftRough(catMonthly(c) - was); if (nmI && nmI.value.trim()) c.name = nmI.value.trim().slice(0, 30); if (U.sheet && U.sheet.icon) c.icon = U.sheet.icon; if (U.sheet && U.sheet.type) c.type = U.sheet.type; if (U.sheet && U.sheet.color) c.color = U.sheet.color; } }
        else if (v === 'give' && val != null) { P.giveMode = 'amt'; P.giveMonthly = String(round2(val)); P.givingPct = 0; }
        else if (v === 'edu' && val != null) { P.collegeMonthly = String(round2(val)); if (val > 0) P.kids = 'yes'; }
        else if (v === 'fun' && val != null) { if (funSet()) shiftRough(val - num(P.fun)); P.fun = String(round2(val)); P.funParts = []; }
        // everything else: the rough total becomes the details plus this amount
        else if (v === 'basics' && val != null) { P.basics = String(Math.round(recurMonthly() + catsMonthly() + funMonthly() + fundsMonthly() + val)); }
        else if (v.indexOf('f:') === 0 && val != null) { var fp = (P.funParts || []).filter(function (x) { return 'f:' + x.id === v; })[0]; if (fp) { shiftRough(val - num(fp.amount)); fp.amount = String(round2(val)); P.fun = String((P.funParts || []).reduce(function (t, x) { return t + num(x.amount); }, 0)); } }
        if (v.indexOf('c:') !== 0) {
          var dn = (BUILT_IN.filter(function (x) { return x[0] === v; })[0] || [])[1], nm = nmI ? nmI.value.trim().slice(0, 30) : '', sh = U.sheet || {};
          if (v.indexOf('f:') === 0) { var fq = (P.funParts || []).filter(function (x) { return 'f:' + x.id === v; })[0]; if (fq && nm) fq.name = nm; nm = undefined; }
          setMeta(v, { name: nm === undefined ? undefined : nm && nm !== dn ? nm : '', icon: sh.icon, type: sh.type, color: sh.color });
        }
        U.sheet = null; save(); render();
      })(); break;
      case 'catdel': budgetV2();
        if (v.indexOf('c:') === 0) { cats().forEach(function (x) { if ('c:' + x.id === v) shiftRough(-catMonthly(x)); }); P.cats = cats().filter(function (x) { return 'c:' + x.id !== v; }); }
        else if (v.indexOf('f:') === 0) { (P.funParts || []).forEach(function (x) { if ('f:' + x.id === v) shiftRough(-num(x.amount)); }); P.funParts = P.funParts.filter(function (x) { return 'f:' + x.id !== v; }); delete (P.lineMeta || {})[v]; P.fun = P.funParts.length ? String(P.funParts.reduce(function (t, x) { return t + num(x.amount); }, 0)) : ''; }
        else {
          if (v === 'fun') { shiftRough(-funMonthly()); P.fun = ''; P.funParts = []; }
          else if (v === 'give') { P.giveMode = 'amt'; P.giveMonthly = '0'; P.givingPct = 0; }
          else if (v === 'edu') P.collegeMonthly = '';
          else if (v === 'basics') P.basics = String(Math.round(recurMonthly() + catsMonthly() + funMonthly() + fundsMonthly()));
          setMeta(v, { hidden: true });
        }
        U.sheet = null; save(); track('cat-remove'); render(); break;
      case 'catback': budgetV2(); setMeta(v, { hidden: '' });
        if (v === 'fun' && !funSet()) { P.fun = '0'; P.funParts = []; }
        if (v === 'basics') P.basics = String(Math.round(recurMonthly() + catsMonthly() + funMonthly() + fundsMonthly()));
        U.catAdd = false; U.sheet = { k: 'cat', key: v }; save(); render();
        (function () { var am = app.querySelector('[data-catamt]'); if (am) am.focus(); })(); break;
      case 'recuropen': (function () {
        var bl = v ? P.bills.filter(function (x) { return x.id === v; })[0] : null;
        U.form = bl ? { id: bl.id, name: bl.name, icon: bl.icon || iconFor(bl.name), type: bl.type || typeOf(bl), color: bl.color || '', amount: bl.amount, freq: bl.freq || (bl.per === 'yr' ? 'yearly' : 'monthly'), day: bl.due ? F.fromIso(bl.due).getDate() : 1, due: bl.due || '', fund: fromFund(bl) } : { name: '', icon: '🧾', amount: '', freq: 'monthly', day: 1, due: '', fund: '' };
        U.formErr = ''; U.sheet = { k: 'recur' }; render();
      })(); break;
      case 'recursug': U.form.name = v; U.form.icon = b.getAttribute('data-i'); render(); break;
      case 'recuricon': U.form.icon = v; render(); break;
      case 'recurtype': U.form.type = v; render(); break;
      case 'recurcolor': U.form.color = v; render(); break;
      case 'recurfund': U.form.fund = v; Array.prototype.forEach.call(app.querySelectorAll('[data-a=recurfund]'), function (x) { var on = x.getAttribute('data-v') === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); break;
      case 'recurfreq': U.form.freq = v; if (v !== 'monthly' && !U.form.due) U.form.due = F.isoDay(today()); render(); break;
      case 'recursave': (function () {
        var f = U.form, nm = String(f.name || '').trim().slice(0, 40);
        if (!nm) { U.formErr = 'Give it a name.'; render(); return; }
        if (!(num(f.amount) > 0)) { U.formErr = 'Add how much it is each time.'; render(); return; }
        var due = f.freq === 'monthly' ? nextDay(+f.day || 1) : (/^\d{4}-\d{2}-\d{2}$/.test(f.due || '') ? f.due : F.isoDay(today()));
        budgetV2();
        var bl = f.id ? P.bills.filter(function (x) { return x.id === f.id; })[0] : null, before = bl ? budgetMonthly(bl) : 0, wasFund = bl ? !!fromFund(bl) : false;
        if (!bl) { bl = { id: uid() }; P.bills.push(bl); }
        bl.name = nm; bl.icon = f.icon; bl.amount = String(round2(num(f.amount))); bl.freq = f.freq; bl.rep = f.freq; bl.due = due; delete bl.per; bl.group = F.groupFor(nm); bl.type = typeOf({ type: f.type, name: nm }); if (f.color) bl.color = f.color;
        if (f.fund) bl.fund = f.fund; else delete bl.fund;
        if (before > 0 || wasFund) shiftRough(budgetMonthly(bl) - before);
        save(); track('recurring-save'); U.sheet = null; render();
      })(); break;
      case 'recurdel': budgetV2(); P.bills.forEach(function (x) { if (x.id === U.form.id) shiftRough(-budgetMonthly(x)); }); P.bills = P.bills.filter(function (x) { return x.id !== U.form.id; }); save(); U.sheet = null; render(); break;
      case 'spday': U.sheet = { k: 'day', iso: v }; render(); break;
      case 'spendon': U.spendBack = U.screen; U.form = { amount: '', note: '', key: U.lastSpendKey || '', date: v }; U.formErr = ''; U.spendSaved = ''; go('spendadd'); break;
      case 'caltab': U.calTab = v; U.calDay = null; render(); break;
      case 'scan': openScan(); break;
      case 'weekadd': openScan(v); break;
      case 'chatopen': openScan(); setTimeout(function () { var el = document.getElementById('chatIn'); if (el) el.focus(); }, 80); break;
      case 'chatattach': if (U.scan) { U.scan.attach = !U.scan.attach; render(); if (U.scan.attach) chatDown(); } break;
      case 'chatok': chatConfirm(v); break;
      case 'chatskip': (function () { var cc = chatAt(v); if (cc) { cc.state = 'skipped'; render(); } })(); break;
      case 'chatedit': (function () { var cc = chatAt(v); if (cc) { cc.edit = !cc.edit; render(); } })(); break;
      case 'chatacct': (function () { var pr = String(v).split('|'), cc = chatAt(pr[0]); if (cc) { cc.acct = pr.slice(1).join('|'); cc.err = ''; render(); } })(); break;
      case 'chatreport': (function () {
        var pv = String(v).split(':'), cm = scanMsg(pv[1]), st = cm && cm.st; if (!st) return; v = pv[0];
        if (v === 'open') st.report = 'open'; else if (v === 'no') st.report = '';
        else if (v === 'send') { st.report = 'sent'; if (S) aiCall('report', { what: 'chat', input: FMTMAI.maskDigits(st.text), output: st.cards.map(function (c) { return c.a; }) }).catch(function () {}); track('chat-report'); }
        render();
      })(); break;
      case 'wipe': U.wipe = true; U.wipeErr = ''; U.wipeHand = false; render(); break;
      case 'wipeno': U.wipe = false; U.wipeErr = ''; render(); break;
      case 'wipeyes': (function () {
        var el = app.querySelector('[data-wipe]');
        if (String(el && el.value || '').trim().toUpperCase() !== 'DELETE') { U.wipeErr = 'Type DELETE to confirm.'; render(); return; }
        track('account-delete');
        if (!S) { wipePhone(); return; }
        U.wipeErr = 'Deleting…'; render();
        fresh().then(function () { return sb('/functions/v1/delete-account', { method: 'POST', auth: true, body: { handOver: !!U.wipeHand } }); })
          .then(function () { wipePhone(); }, function () { U.wipeErr = 'We couldn’t reach your account, so nothing was deleted. Try again when you’re online.'; render(); });
      })(); break;
      case 'altopen': U.altOpen = true; U.altMsg = ''; render(); break;
      case 'altsave': (function () {
        var el = app.querySelector('[data-alt]'), e = String(el && el.value || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { U.altMsg = 'Enter the email you joined with.'; render(); return; }
        fresh().then(function () { return sb('/rest/v1/people?on_conflict=user_id', { method: 'POST', auth: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: { user_id: S.uid, alt_email: e } }); })
          .then(function () { U.altMsg = 'Saved. Your extra snaps show up once the community has your email.'; U.altOpen = false; track('alt-email'); aiStatus(true); render(); }, function () { U.altMsg = 'That didn’t save. Try again.'; render(); });
      })(); break;
      case 'scanall': (function () { var sm = scanMsg(v); if (!sm || !sm.rows) return; sm.rows.forEach(function (r) { if (!r.skip) r.ok = true; }); sm.err = ''; render(); })(); break;
      case 'scansave': (function () {
        var sc = U.scan, sm = scanMsg(v); if (!sm || !sm.rows || sm.saved) return;
        var keep = sm.rows.filter(function (r) { return r.ok; }), ks = spendLines().map(function (l) { return l.key; }), miss = keep.filter(function (r) { return !r.key || ks.indexOf(r.key) < 0; })[0];
        if (!keep.length) return;
        if (miss) { sm.err = 'Choose a category for ' + miss.merchant + ' (' + money2(miss.amount) + ').'; render(); return; }
        var w = payWeeks().filter(function (x) { return x.start === sc.week; })[0], fallback = F.isoDay(today());
        if (w && w.end < fallback) fallback = w.end;
        P.merchantMem = P.merchantMem || {};
        keep.forEach(function (r) { P.spends.push({ id: uid(), date: r.date || fallback, amount: String(round2(r.amount)), key: r.key, note: r.merchant, src: r.src || (r.typed ? 'typed' : 'scan') }); P.merchantMem[merchKey(r.merchant)] = r.key; });
        markLogged(keep.map(function (r) { return r.date || fallback; }));
        weekDone(sc.week, 'saved'); track('scan-save');
        // what was read from the photo is dropped here; the chat keeps a short ✓ line
        sm.saved = { n: keep.length, total: keep.reduce(function (t, r) { return t + r.amount; }, 0) }; sm.rows = []; sm.err = ''; save(); render();
      })(); break;
      case 'weeknone': weekDone(U.scan.week, 'none'); track('scan-none'); U.planToast = 'Got it: no purchases this week.'; U.scan = null; U.jTab = null; save(); go('journey'); break;
      case 'weekhand': U.spendBack = 'scan'; U.form = { amount: '', note: '', key: U.lastSpendKey || '', date: F.isoDay(today()) }; U.formErr = ''; U.spendSaved = ''; go('spendadd'); break;
      case 'spendnew': U.spendBack = U.screen === 'spendadd' ? U.spendBack : U.screen; U.form = { amount: '', note: '', key: v || U.lastSpendKey || '', date: F.isoDay(today()) }; U.formErr = ''; U.spendSaved = ''; go('spendadd'); break;
      case 'spendcat': U.form.key = v; U.formErr = ''; render(); break;
      case 'spendsave':
        if (!(num(U.form.amount) > 0)) { U.formErr = 'Enter how much you spent.'; render(); break; }
        if (!U.form.key) { U.formErr = 'Pick what it was for.'; render(); break; }
        P.spends.push({ id: uid(), date: U.form.date || F.isoDay(today()), amount: String(round2(num(U.form.amount))), key: U.form.key, note: String(U.form.note || '').trim() });
        U.lastSpendKey = U.form.key; wkMark('cat'); markLogged([U.form.date || F.isoDay(today())]);
        if (U.spendBack === 'scan' && U.scan) {
          weekDone(U.scan.week, 'saved'); if (String(U.form.note || '').trim()) { P.merchantMem = P.merchantMem || {}; P.merchantMem[merchKey(U.form.note)] = U.form.key; }
          var hl = spendLines().filter(function (l) { return l.key === U.form.key; })[0];
          if (U.scan.msgs) U.scan.msgs.push({ t: 'note', text: (String(U.form.note || '').trim() ? String(U.form.note).trim().slice(0, 40) + ' · ' : '') + money2(num(U.form.amount)) + ' added to ' + (hl ? hl.label : 'your budget') });
        }
        save(); track('spend-add');
        if (v === 'again') {
          var sl = spendLines().filter(function (l) { return l.key === U.form.key; })[0];
          U.spendSaved = money2(num(U.form.amount)) + ' added to ' + (sl ? sl.label : 'your budget') + '.';
          U.form = { amount: '', note: '', key: U.form.key, date: U.form.date }; U.formErr = ''; render();
          var ai = app.querySelector('[data-g=amount]'); if (ai) ai.focus();
        } else go(U.spendBack || 'plan');
        break;
      case 'spendmonth': (function () { var a = curSpendMonth().split('-'), d = new Date(+a[0], +a[1] - 1 + (+v), 1); U.spendMonth = F.isoDay(d).slice(0, 7); })(); render(); break;
      case 'spenddel': P.spends = P.spends.filter(function (x) { return x.id !== v; }); save(); render(); break;
      case 'plusmenu': U.plusOpen = !U.plusOpen; render(); break;
      case 'plusclose': U.plusOpen = false; render(); break;
      case 'copyplan': (function () {
        var code = 'FMTM1:' + btoa(unescape(encodeURIComponent(JSON.stringify(P))));
        U.planCode = code;
        var done = function () { U.copiedPlan = true; track('copy-plan'); render(); };
        try { navigator.clipboard.writeText(code).then(done, function () { window.prompt('Copy this, then paste it in the Home Screen app:', code); done(); }); }
        catch (err) { window.prompt('Copy this, then paste it in the Home Screen app:', code); done(); }
      })(); break;
      case 'pasteplan': (function () {
        var el = app.querySelector('[data-paste]'), txt = String(el && el.value || '').trim();
        try {
          if (txt.indexOf('FMTM1:') !== 0) throw new Error('bad');
          var d = JSON.parse(decodeURIComponent(escape(atob(txt.slice(6)))));
          if (!d || d.v !== 1 || !Array.isArray(d.debts)) throw new Error('bad');
          if (P.setupDone) keepCopy(); P = Object.assign(blank(), d); save(); track('paste-plan'); U.err = '';
          U.toast = ['Your plan is here.', 'Everything came over: budget, streaks and history.', true]; go(P.setupDone ? 'home' : 'welcome');
        } catch (err) { U.err = 'That doesn\u2019t look like a copied plan. In Safari, tap Copy my plan again, then paste here.'; render(); }
      })(); break;
      case 'untrash': (function () { var t = trashed(); if (!t) return; var cur = P; P = Object.assign(blank(), t.plan); save(); try { if (cur.setupDone) localStorage.setItem(TRASH, JSON.stringify({ at: F.isoDay(today()), plan: cur })); else localStorage.removeItem(TRASH); } catch (e) {} track('untrash'); U.toast = ['Your plan is back.', 'Everything is just how you left it.', true]; go(P.setupDone ? 'home' : 'welcome'); })(); break;
      case 'pasteclip': (function () {
        try { navigator.clipboard.readText().then(function (t) { var el = app.querySelector('[data-paste]'); if (el) el.value = t; var bt = app.querySelector('[data-a=pasteplan]'); if (bt) bt.click(); }, function () { U.err = 'Your phone didn\u2019t allow pasting here. Press and hold in the box and tap Paste instead.'; render(); }); }
        catch (err) { U.err = 'Press and hold in the box and tap Paste instead.'; render(); }
      })(); break;
      case 'duedit': (function () { var b = P.bills[i]; U.dueEdit = U.dueEdit === i ? null : i; U.dueForm = { date: b.due || F.isoDay(today()), rep: b.rep || (b.per === 'yr' ? 'yearly' : 'monthly') }; })(); render(); break;
      case 'duerep': (function () { var el = app.querySelector('[data-duedate]'); if (el) U.dueForm.date = el.value; U.dueForm.rep = v; })(); render(); break;
      case 'duesave': (function () { var el = app.querySelector('[data-duedate]'), dt = el && el.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dt || '')) return; P.bills[i].due = dt; P.bills[i].rep = U.dueForm.rep; U.dueEdit = null; save(); track('bill-due'); })(); render(); break;
      case 'dueclear': delete P.bills[i].due; delete P.bills[i].rep; U.dueEdit = null; save(); render(); break;
      case 'duecancel': U.dueEdit = null; render(); break;
      case 'household': P.household = v; if (v === 'single') P.incomes = extraIncomes(); if (v === 'shared' && !(P.incomes || []).length) { P.incomes = [{ id: uid(), label: '', amount: '', freq: P.freq, nextPay: P.nextPay }]; } save(); render(); break;
      case 'incadd': P.incomes = P.incomes || []; P.incomes.push({ id: uid(), label: '', amount: '', freq: P.freq, nextPay: P.nextPay }); if (!P.household) P.household = 'shared'; save(); render(); break;
      case 'incfreq': P.incomes[i].freq = v; save(); render(); break;
      case 'calday': U.calDay = U.calDay === v ? null : v; render(); break;
      case 'calmove': (function () { var n = today(), c = U.calMonth || [n.getFullYear(), n.getMonth()], d = new Date(c[0], c[1] + (+v), 1); U.calMonth = [d.getFullYear(), d.getMonth()]; U.calDay = null; })(); render(); break;
      case 'badd': U.bAdd = v; U.bEdit = null; render(); (function () { var inp = app.querySelector('[data-baddname]'); if (inp) inp.focus(); })(); break;
      case 'wiz':
        var n = +v; U.err = validate(n);
        if (U.err) { render(); break; }
        if (WIZ[n - 1] === 'debts') { P.debts = P.debts.filter(function (d) { return !(d.lump && !(num(d.bal) > 0)); }); P.debts.forEach(function (d) { if (num(d.bal) > num(d.orig)) d.orig = num(d.bal); }); }
        save();
        if (P.setupDone) { snapshot(); save(); go(U.wizReturn || 'settings'); }
        else go(n < WIZ.length ? WIZ[n] : 'reveal');
        break;
      case 'saveskip': track('save-skip'); U.afterSave = false; U.savePrompt = false; go('home'); break;
      case 'installlater': U.afterSave = false; go('home'); break;
      case 'installok': P.installSeen = true; save(); U.afterSave = false; track('install-seen'); go('home'); break;
      case 'edit': if (v === 'recurring') { U.bTab = 'spend'; go('plan'); break; } U.wizReturn = U.screen === 'planday' ? 'planday' : U.screen; U.err = ''; go(v); break;
      case 'basicpick': P.basicsAuto = false; P.basics = v; save(); render(); break;
      case 'ladder': U.showLadder = !U.showLadder; render(); break;
      case 'installdone': U.copiedPlan = false; P.installSeen = true; save(); go(U.wizReturn || 'home'); break;
      case 'openunlock': markSeen('unlock:' + v); go(v); break;
      case 'goalnew': U.form = { name: '', amount: '', by: F.isoDay(F.addDays(today(), 182)) }; U.formErr = ''; U.back = U.screen; U.next = U.screen; go('goal'); break;
      case 'preset':
        var pr = U.presets[i], other = pr[0] === 'Something else';
        U.form = { name: other ? '' : pr[0], amount: pr[1], by: U.form.by }; U.formErr = ''; render();
        if (other) { var el = document.getElementById('g-name'); if (el) el.focus(); }
        break;
      case 'goalsave':
        var nm = String(U.form.name || '').trim(), amt = Math.round(num(U.form.amount));
        if (!nm || !(amt > 0)) { U.formErr = 'Give your goal a name and an amount above $0.'; render(); break; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(U.form.by || '') || U.form.by <= F.isoDay(today())) { U.formErr = 'Pick a date after today.'; render(); break; }
        if (P.goals.length >= 3) { U.formErr = 'You can have 3 goals at a time. Finish or remove one first.'; render(); break; }
        P.goals.push({ id: uid(), name: nm, amount: amt, kind: 'fund', months: Math.max(1, Math.round(F.daysBetween(today(), F.fromIso(U.form.by)) / 30.44)), per: 0, saved: 0, by: U.form.by });
        save(); track('goal'); go(U.next); break;
      case 'goaldel': P.goals.splice(i, 1); save(); render(); break;
      case 'checkin': U.bTab = 'save'; go('plan'); U.sheet = { k: 'bal' }; render(); break;
      case 'backup': download('find-me-the-money-backup-' + F.isoDay(today()) + '.json', 'application/json', JSON.stringify(P, null, 2)); break;
      case 'payvary': P.payVaries = !!v; if (P.payVaries && !(P.payHist || []).length) P.payHist = [{ id: uid(), amount: P.paycheck || '' }, { id: uid(), amount: '' }]; payFromHist(); save(); render(); break;
      case 'payhistadd': P.payHist = P.payHist || []; P.payHist.push({ id: uid(), amount: '' }); save(); render(); (function () { var el = app.querySelectorAll('[data-list=payHist]'); if (el.length) el[el.length - 1].focus(); })(); break;
      case 'paybasis': P.payBasis = v; payFromHist(); save(); render(); break;
      case 'commtab': U.commTab = U.commTab === v ? '' : v; render(); break;
      case 'remindon': remindOn(); break;
      case 'remindoff': remindOff(); break;
      case 'remindk': P.remind = P.remind || {}; P.remind[v] = P.remind[v] === false; save(); render(); break;
      case 'mstab': U.msTab = v; U.msAll = false; render(); break;
      case 'msall': U.msAll = true; render(); break;
      case 'csend': (function () {
        var el = app.querySelector('[data-cemail]'), em = String(el ? el.value : (U.cloudStep && U.cloudStep.email) || '').trim(), nm = app.querySelector('[data-cname]'), oi = app.querySelector('[data-coptin]');
        if (nm) { var nmv = String(nm.value || '').trim().replace(/\s+/g, ' ').slice(0, 40); if (!nmv) { U.err = 'Add your first name.'; render(); return; } setMe({ name: nmv }); }
        if (oi) setMe({ optIn: oi.checked });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { U.err = 'That email doesn\u2019t look right.'; render(); return; }
        U.codeTries = (U.codeTries || 0) + 1;
        U.cloudStep = { email: em, sent: false }; U.err = '';
        var bt = app.querySelector('[data-a=csend]'); if (bt) { bt.disabled = true; bt.textContent = 'Sending\u2026'; }
        sb('/auth/v1/otp?redirect_to=' + encodeURIComponent(location.origin + location.pathname), { method: 'POST', body: { email: em, create_user: true } })
          .then(function () { U.cloudStep = { email: em, sent: true }; track('account-code'); }, function (er) { U.err = er.status === 429 ? 'Too many codes asked for. Wait a minute, then try again.' : 'We couldn\u2019t send the email. ' + (er.status ? 'The account service said: ' + er.message + ' (' + er.status + ')' : 'Check your connection and try again.'); })
          .then(function () { render(); var c = app.querySelector('[data-ccode]'); if (c) c.focus(); });
      })(); break;
      case 'cverify': (function () {
        var el = app.querySelector('[data-ccode]'), code = String(el && el.value || '').replace(/\s/g, '');
        if (!/^\d{6,10}$/.test(code)) { U.err = 'Enter the code from the email.'; render(); return; }
        var bt = app.querySelector('[data-a=cverify]'); if (bt) { bt.disabled = true; bt.textContent = 'Signing in\u2026'; }
        sb('/auth/v1/verify', { method: 'POST', body: { type: 'email', email: U.cloudStep.email, token: code } })
          .then(signedIn, function (er) { U.codeTries = (U.codeTries || 0) + 1; U.err = er.status >= 500 || !er.status ? 'We couldn\u2019t check the code' + (er.status ? ': ' + er.message : '. Check your connection.') : 'That code didn\u2019t work. Check it, or send a new one.'; render(); });
      })(); break;
      case 'creset': U.cloudStep = null; U.err = ''; render(); break;
      case 'cout': if (OS.p) OS.p.then(function (os) { return os.logout(); }).catch(function () {}); if (S) sb('/auth/v1/logout', { method: 'POST', auth: true }).catch(function () {}); S = null; keepAuth(); C.ready = false; C.state = 'idle'; U.toast = ['Signed out.', 'Your plan stays on this phone.', true]; render(); break;
      case 'cjoinopen': U.joinOpen = true; render(); var cj = app.querySelector('[data-cjoin]'); if (cj) cj.focus(); break;
      case 'cinvite': (function () {
        var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', code = '';
        for (var k = 0; k < 6; k++) code += A[Math.floor(Math.random() * A.length)];
        fresh().then(function () { return sb('/rest/v1/plan_invites?owner_id=eq.' + S.uid, { method: 'DELETE', auth: true }); })
          .then(function () { return sb('/rest/v1/plan_invites', { method: 'POST', auth: true, headers: { Prefer: 'return=minimal' }, body: { code: code, owner_id: S.uid } }); })
          .then(function () { U.invite = code; track('share-invite'); render(); }, function () { U.err = 'We couldn\u2019t make an invite right now. Try again in a minute.'; render(); });
      })(); break;
      case 'cinviteshare': (function () {
        var t = 'Join our budget on Find Me the Money. Open https://' + CONFIG.shareUrl + ', tap \u201cJoining your spouse\u2019s budget?\u201d, sign in with your email, and enter this code: ' + U.invite;
        if (navigator.share) navigator.share({ text: t }).catch(function () {});
        else try { navigator.clipboard.writeText(t); U.toast = ['Invite copied.', 'Paste it in a text to your spouse.', true]; render(); } catch (err) { window.prompt('Copy this and send it:', t); }
      })(); break;
      case 'cjoin': (function () {
        var el = app.querySelector('[data-cjoin]'), code = String(el && el.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (code.length < 6) { U.err = 'Enter the 6-character code from your spouse.'; render(); return; }
        var bt = app.querySelector('[data-a=cjoin]'); if (bt) { bt.disabled = true; bt.textContent = 'Joining\u2026'; }
        fresh().then(function () { return sb('/rest/v1/rpc/join_plan', { method: 'POST', auth: true, body: { invite: code } }); })
          .then(cloudWho).then(function () { return sb('/rest/v1/plans?select=data,updated_at&user_id=eq.' + S.owner, { auth: true }); })
          .then(function (rows) {
            U.joinMode = false; U.joinOpen = false; C.ready = true; C.state = 'saved'; track('share-join');
            if (rows && rows[0] && rows[0].data && rows[0].data.setupDone) adopt(rows[0]);
            U.toast = ['You\u2019re in.', 'You and ' + (S.partner || 'your spouse') + ' now share one budget.', true]; go(P.setupDone ? 'home' : 'welcome');
          }, function (er) { U.err = /not found|invalid/i.test(er.message) ? 'That code didn\u2019t work. It may have expired or been used. Ask for a new one.' : /own/i.test(er.message) ? 'That\u2019s your own invite. Your spouse enters it on their phone.' : 'We couldn\u2019t join right now. Try again in a minute.'; render(); });
      })(); break;
      case 'cleave': U.cleave = true; render(); break;
      case 'cleaveno': U.cleave = false; render(); break;
      case 'cleaveyes': U.cleave = false;
        fresh().then(function () { return sb('/rest/v1/plan_members?member_id=eq.' + S.uid, { method: 'DELETE', auth: true }); })
          .then(function () { S.owner = S.uid; S.role = 'owner'; S.partner = null; S.synced = -1; keepAuth(); setBase(null); C.ready = true; return cloudPush(); })
          .then(function () { U.toast = ['You left the shared budget.', 'This copy is yours now.', true]; render(); }, function () { U.err = 'We couldn\u2019t reach your account. Try again when you\u2019re online.'; render(); });
        break;
      case 'cunshare': U.cunshare = true; render(); break;
      case 'cunshareno': U.cunshare = false; render(); break;
      case 'cunshareyes': U.cunshare = false;
        fresh().then(function () { return sb('/rest/v1/plan_members?owner_id=eq.' + S.uid, { method: 'DELETE', auth: true }); })
          .then(function () { S.partner = null; keepAuth(); U.toast = ['Sharing stopped.', 'The budget is just yours again.', true]; render(); }, function () { U.err = 'We couldn\u2019t reach your account. Try again when you\u2019re online.'; render(); });
        break;
      case 'cpick': (function () {
        var pk = U.cloudPick; U.cloudPick = null; C.ready = true;
        if (v === 'cloud') adopt(pk.row);
        else { try { localStorage.setItem(TRASH, JSON.stringify({ at: F.isoDay(today()), plan: Object.assign(blank(), pk.row.data) })); } catch (err) {} S.synced = -1; keepAuth(); cloudPush(); }
        U.toast = ['You\u2019re signed in.', 'Your plan now saves to your account.', true];
        if (U.obAfter && !P.setupDone) { finishSetup(); U.obAfter = false; U.toast = null; go('steps'); return; }
        go(P.setupDone ? 'home' : 'welcome');
      })(); break;
      case 'seen': markSeen(v); render(); break;
      case 'earnadd':
        var ea = app.querySelector('[data-earnamt="' + v + '"]'), en = app.querySelector('[data-earnnote="' + v + '"]'), amtE = ea ? num(ea.value) : 0;
        if (!(amtE > 0)) break;
        var ce = P.challenges.filter(function (c) { return c.uid === v; })[0];
        ce.log = ce.log || []; ce.log.push({ date: F.isoDay(today()), amt: Math.round(amtE * 100) / 100, note: en ? en.value.trim().slice(0, 40) : '' });
        P.totals.earned = num(P.totals.earned) + amtE; U.pitw = { uid: v, amt: amtE };
        save(); track('earn'); render(); break;
      case 'pitw':
        var amtP = U.pitw ? U.pitw.amt : 0;
        if (v === 'savings') P.savings = String(num(P.savings) + amtP);
        else if (v === 'debt') { var tgt = P.debts.filter(function (d) { return num(d.bal) > 0; }).sort(function (a, b) { return num(a.bal) - num(b.bal); })[0]; if (tgt) tgt.bal = String(Math.max(0, num(tgt.bal) - amtP)); }
        else if (v.indexOf('goal:') === 0) { var gp = P.goals.filter(function (g) { return g.id === v.slice(5); })[0]; if (gp) gp.saved = num(gp.saved) + amtP; }
        U.pitw = null; save(); render(); break;
      case 'lessonopen': U.lesson = { id: v }; U.lessonCard = 0; go('lesson'); break;
      case 'lessonnext': U.lessonCard = (U.lessonCard || 0) + 1; render(); break;
      case 'ch30start': if (!(chS().status === 'active' && chS().startDate > chToday())) track('challenge-start'); chStart(v); window.scrollTo(0, 0); render(); break;
      case 'chagain': chStart('today'); track('challenge-start'); U.screen = 'journey'; U.jTab = null; window.scrollTo(0, 0); render(); break;
      case 'ch30quit': if (!U.chQuit) { U.chQuit = true; render(); break; } (function () { var c = chS(); c.status = 'notStarted'; c.startDate = null; U.chQuit = false; save(); track('challenge-quit'); render(); })(); break;
      case 'chnospend': case 'chbalok': case 'chdebt': case 'cheat': (function () {
        if (!chCanEdit()) return; var r = chRec(chToday(), true);
        var k = { chnospend: 'noSpend', chbalok: 'balancesConfirmed', chdebt: 'noNewDebt', cheat: 'noEatingOut' }[a]; r[k] = !r[k]; if (r[k]) track('daily-item'); save(); render();
      })(); break;
      case 'chremno': U.chRemAsk = false; render(); break;
      case 'chremyes': (function () {
        track('reminder-optin-challenge'); U.chRemAsk = false;
        if (P.remind && P.remind.on) { P.remind.challenge = true; P.remind.chHour = P.remind.chHour || 20; save(); U.toast = ['Nudge is on.', 'We’ll check in at 8 pm on days that aren’t done.', true]; render(); return; }
        if (!S) { go('settings'); return; }
        U.remWant = { challenge: true, chHour: 20 }; remindOn(); render();
      })(); break;
      case 'chintro': U.jTab = null; go('journey'); setTimeout(function () { var el = document.getElementById('chintro'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); break;
      case 'chopen': if (v === 'lesson') { var dlo = dailyLesson(); if (dlo.a === 'lessonopen') { U.lesson = { id: dlo.v }; U.lessonCard = 0; go('lesson'); } else { U.chLessonN = +dlo.v; go('chlesson'); } } else { U.jTab = null; go('journey'); if (v === 'grat') setTimeout(function () { var g = document.getElementById('chGrat'); if (g) { g.scrollIntoView({ block: 'center' }); g.focus(); } }, 60); } break;
      case 'chlesson': U.chLessonN = v ? +v : null; go('chlesson'); break;
      case 'chread': if (markLesson('ch:' + (U.chLessonN || chDayN() || 1))) { save(); mmToast('🎧 Lesson done'); } U.jTab = null; go('journey'); break;
      case 'chgsave': (function () {
        var el = document.getElementById('chGrat'), t = String(el && el.value || '').trim().slice(0, 280); if (!t || !chCanEdit()) return;
        var r = chRec(chToday(), true), was = !!String(r.gratitude || '').trim(); r.gratitude = t; U.chGEdit = false; if (!was) track('daily-item'); save(); render();
      })(); break;
      case 'chgedit': U.chGEdit = true; render(); setTimeout(function () { var g = document.getElementById('chGrat'); if (g) g.focus(); }, 30); break;
      case 'chgpost': chPost(String(chRec(chToday()).gratitude || ''), 'challenge-gratitude-shared'); break;
      case 'chshare': openShare(ch30Card()); break;
      case 'chpost': chPost(ch30Card().caption, 'challenge-complete-shared'); break;
      case 'jtab': U.jTab = v; render(); window.scrollTo(0, 0); break;
      case 'lessondone': (function () {
        var id = U.lesson && U.lesson.id;
        if (id && dailyLesson().ref === 'L:' + id) markLesson('L:' + id);
        if (id && !lessonDone(id)) { P.journey = P.journey || { done: [] }; P.journey.done.push(id); track('lesson-' + id); }
        save(); U.jTab = null; go('journey');
      })(); break;
      case 'lessonact': (function () {
        U.wizReturn = 'lesson';
        if (v === 'plan') { go('plan'); return; }
        if (v === 'goalnew') { U.form = { name: '', amount: '', by: F.isoDay(F.addDays(today(), 182)) }; U.formErr = ''; U.back = 'lesson'; U.next = 'lesson'; go('goal'); return; }
        if (v === 'spend') { openScan(); return; }
        go(v);
      })(); break;
      case 'winsdone': P.unseen = P.unseen.filter(function (u) { return u.type !== 'badge'; }); save(); go('home'); break;
      case 'sharebadge': markSeen('badge:' + v); openShare(cardForBadge(v)); break;
      case 'sharech': markSeen('challenge:' + v); openShare(cardForChallenge(v)); break;
      case 'sharepaid':
        var nm2 = U.result.paid[0], dp = P.debts.filter(function (d) { return d.name === nm2; })[0], count2 = facts().debtsPaid;
        openShare({ eyebrow: 'Debt paid off', title: nm2 + ': paid off', sub: 'Debt #' + count2 + ' down. ' + money(num(dp && dp.orig)) + ' gone for good.', subNoAmt: 'Debt #' + count2 + ' down. The snowball grows.',
          chips: streakChips(), caption: 'Paid off my ' + nm2.toLowerCase() + '! Debt #' + count2 + ' down.' });
        break;
      case 'sharegoal':
        var gg = P.goals.filter(function (g) { return g.name === U.result.goal; })[0];
        openShare({ eyebrow: 'Goal funded', title: gg.name, sub: 'Saved ' + money(gg.amount) + ' for it without touching a credit card.', subNoAmt: 'Saved for it without touching a credit card.', chips: streakChips(), caption: 'Fully funded: ' + gg.name + '. No credit card needed.' });
        break;
      case 'shareamt': U.showAmt = v === '1'; U.cardImg = null; render(); drawCard(); break;
      case 'sharefmt': U.fmt = v; U.cardImg = null; render(); drawCard(); break;
      case 'sharestep': if (v) markSeen('level:' + v); openShare(cardForStep()); break;
      case 'doshare':
        var file = new File([U.cardImg.blob], 'find-me-the-money-win.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: caption() }).then(function () { P.shares = (P.shares || 0) + 1; save(); }).catch(function (err) { if (err && err.name !== 'AbortError') { U.shareErr = 'Sharing didn\u2019t open here. Use Save image, then share it from your photos.'; render(); } });
        } else { U.shareErr = 'This browser can\u2019t share images directly. Use Save image, then share it from your photos.'; render(); }
        track('share'); break;
      case 'saveimg': P.shares = (P.shares || 0) + 1; save(); download('find-me-the-money-win.png', 'image/png', U.cardImg.blob); track('share-save'); break;
      case 'youtube': track('youtube'); break;
      case 'feedback': track('feedback-' + U.screen); break;
      case 'coaching': track('coaching'); break;
      case 'coachtestoff': U.coachTest = null; render(); break;
      case 'coachgo': case 'coachlater': try { localStorage.setItem(COACH_KEY, F.isoDay(today())); } catch (er) {} U.coachTest = null; if (a === 'coachlater') render(); else setTimeout(render, 300); break;
      case 'joincommunity': P.communityJoined = true; save(); track('community'); setTimeout(render, 300); break;
      case 'postcommunity':
        // Skool can't take a post from another site, so copy the caption, save the card, and open the community to paste it
        try { navigator.clipboard.writeText(caption()); } catch (err) {}
        track('post-community');
        (function () { var a = document.createElement('a'); a.href = U.cardImg.url; a.download = 'find-me-the-money-win.png'; document.body.appendChild(a); a.click(); a.remove(); })();
        window.open(CONFIG.communityUrl, '_blank', 'noopener');
        U.shareErr = 'Caption copied and image saved. Paste them into a new post in the community.'; render(); break;
      case 'copycap':
        var txt = caption();
        var ok = function () { U.copied = true; render(); };
        try { navigator.clipboard.writeText(txt).then(ok, function () { selectCaption(); }); } catch (err) { selectCaption(); }
        break;
    }
  });

  // typing updates the saved data in place, so the keyboard never loses its place
  // the return key moves the intro along, and adds a typed purchase; Escape closes an edit sheet
  app.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && U.sheet) { U.sheet = null; render(); return; }
    if (e.key !== 'Enter' || !e.target.closest || !e.target.closest('.ob')) return;
    var bt = app.querySelector('.ob .obbtn'); if (bt) { e.preventDefault(); bt.click(); }
  });
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (U.err) { U.err = ''; var al = app.querySelector('[role=alert]'); if (al) al.remove(); }
    if (t.hasAttribute('data-obecho')) { P.nextPay = t.value; var ec = app.querySelector('[data-live=obecho]'); if (ec) ec.innerHTML = payEcho(); }
    if (t.hasAttribute('data-debtlump')) { if (!P.debts.length) P.debts.push({ id: uid(), name: 'My debts', bal: '', orig: '', min: '', apr: '', lump: true }); P.debts[0][t.getAttribute('data-debtlump')] = t.value; save(); return; }
    if (t.hasAttribute('data-f')) {
      if (t.hasAttribute('data-list')) P[t.getAttribute('data-list')][+t.getAttribute('data-i')][t.getAttribute('data-k')] = t.value;
      if (t.getAttribute('data-f') === 'basics') P.basicsAuto = false;
      if (t.getAttribute('data-list') === 'payHist') { payFromHist(); var pin = app.querySelector('[data-f=paycheck]'); if (pin && pin !== t) pin.value = P.paycheck; var ps = app.querySelector('[data-live=paystats]'); if (ps) ps.innerHTML = payStatsHtml(payStats()); }
      if (t.getAttribute('data-list') === 'debts' && P.debts[+t.getAttribute('data-i')]) delete P.debts[+t.getAttribute('data-i')].quick;
      if (t.getAttribute('data-list') === 'funParts') {
        var fsum = (P.funParts || []).reduce(function (a, x) { return a + num(x.amount); }, 0);
        if (fsum > 0) P.fun = String(fsum);
        var ft = app.querySelector('[data-total="fun"]'); if (ft) ft.textContent = money(fsum);
      }
      else if (t.getAttribute('data-f') !== 'x') { if (t.getAttribute('data-f') === 'fun' && funSet()) shiftRough(num(t.value) - num(P.fun)); P[t.getAttribute('data-f')] = t.value; }
      save();
      var sl = app.querySelector('[data-live="savings"]'); if (sl) sl.textContent = savingsNote();
      var qm = app.querySelector('[data-live="qmonth"]'); if (qm) qm.textContent = quickMonthNote();
      if ((t.getAttribute('data-list') === 'incomes' || t.getAttribute('data-list') === 'otherIncome') && t.getAttribute('data-k') === 'amount' && U.screen === 'pay') { var tg = app.querySelector('[data-live="together"]'); if (tg) tg.textContent = 'Together: about ' + money(monthlyIncome()) + ' a month after taxes.'; }
      if (t.getAttribute('data-f') === 'savings') Array.prototype.forEach.call(app.querySelectorAll('[data-a=savepick]'), function (c) { var on = t.value !== '' && +c.getAttribute('data-v') === num(t.value); c.classList.toggle('on', on); c.setAttribute('aria-pressed', on); });
      var po = app.querySelector('[data-live="payoff"]'); if (po) po.textContent = payoffNote();
      var tot = app.querySelector('[data-total="bills"]');
      if (tot) {
        var all = billsTotal(), mp = monthlyIncome(), pct = app.querySelector('[data-totalpct]');
        tot.textContent = money(all);
        if (pct && mp) pct.textContent = Math.round(all / mp * 100) + '% of your ' + money(mp) + ' monthly take-home';
        F.BUDGET.forEach(function (g) {
          var el = app.querySelector('[data-gtotal="' + g.id + '"]'); if (!el) return;
          var sub = P.bills.reduce(function (t, x) { return t + (x.group === g.id ? F.billMonthly(x) : 0); }, 0);
          el.textContent = sub ? money(sub) + '/mo' : '';
        });
        var bi = t.getAttribute('data-list') === 'bills' ? +t.getAttribute('data-i') : -1, pm = bi >= 0 && app.querySelector('[data-permo="' + bi + '"]');
        if (pm) pm.textContent = num(P.bills[bi].amount) ? 'Sets aside ' + money(num(P.bills[bi].amount) / 12) + ' a month' : 'Enter the yearly cost';
      }
      return;
    }
    if (t.hasAttribute('data-g')) { U.form[t.getAttribute('data-g')] = t.value; var gp = app.querySelector('[data-live="gper"]'); if (gp) gp.textContent = goalDateNote(U.form); return; }
    if (t.hasAttribute('data-thispay')) {
      U.thisPay = t.value; var tp = num(t.value), plan = num(P.paycheck), el = app.querySelector('[data-live=thispay]');
      if (el) el.textContent = !tp ? 'Your plan uses ' + money(plan) + '.' : tp > plan ? money(tp - plan) + ' more than your plan. Put it toward your step: add it to your savings or debt below.' : tp < plan ? money(plan - tp) + ' less than your plan. Cover it from fun money or a flexible bill this time.' : 'Right on your plan.';
      return;
    }
    if (t.hasAttribute('data-give')) {
      var gk = t.getAttribute('data-give'), gv = Math.max(0, num(t.value));
      if (gk === 'pct' || gk === 'pctnum') P.givingPct = Math.min(100, Math.round(gv * 10) / 10); else P.giveMonthly = t.value === '' ? '' : String(Math.round(gv * 100) / 100);
      var twin = app.querySelector('[data-give="' + { pct: 'pctnum', pctnum: 'pct', amt: 'amtnum', amtnum: 'amt' }[gk] + '"]');
      if (twin) { if (twin.type === 'range' && gv > +twin.max) twin.max = Math.ceil(gv); twin.value = gk.indexOf('num') > 0 ? gv : (gv || ''); }
      var gb = app.querySelector('[data-live=givebig]'), gt = app.querySelector('[data-live=givetext]');
      if (gb) gb.textContent = P.giveMode === 'amt' ? money(num(P.giveMonthly)) : (+P.givingPct || 0) + '%';
      if (gt) gt.textContent = giveText();
      save(); return;
    }
    if (t.hasAttribute('data-whatif')) {
      U.whatIf = +t.value; var w = whatIfText(U.whatIf);
      if (w) { var dEl = app.querySelector('[data-live="wiDate"]'), sEl = app.querySelector('[data-live="wiSub"]'); if (dEl) dEl.textContent = w.date; if (sEl) sEl.textContent = w.sub; }
      t.setAttribute('aria-valuetext', '+' + money(U.whatIf) + ' a month');
      return;
    }
    if (t.hasAttribute('data-ef')) {
      P.efMonths = +t.value; save();
      var m = efMonths(), mo = monthlyNeed(), set = function (k, v) { var el = app.querySelector('[data-live="' + k + '"]'); if (el) el.textContent = v; };
      t.setAttribute('aria-valuetext', m + ' months');
      set('efm', m + ' months'); set('eft', money(mo * m)); set('efwhy', EF_WHY[m - 3]); set('efmath', m + ' × ' + money(mo) + ' a month in expenses');
      return;
    }
    if (t.hasAttribute('data-range')) {
      U.limit = +t.value;
      var wants = Math.round(spending().monthly.want / 10) * 10, found = Math.max(0, wants - U.limit);
      app.querySelector('[data-live="limit"]').textContent = '\u2212 ' + money(U.limit) + '/mo';
      app.querySelector('[data-live="found"]').textContent = money(found);
      app.querySelector('[data-live="found2"]').textContent = money(found) + '/mo';
      app.querySelector('[data-live="foundyr"]').textContent = 'a month for your plan \u00b7 ' + money(found * 12) + ' a year';
      app.querySelector('[data-live="impact"]').textContent = foundImpact(U.limit, wants);
      return;
    }
    if (t.hasAttribute('data-slide')) {
      var id = t.getAttribute('data-slide'), g = P.goals.filter(function (x) { return x.id === id; })[0];
      g.per = +t.value;
      var o = F.outlook(profile(), today()), idx = P.goals.indexOf(g);
      app.querySelector('[data-gv="' + id + '"]').textContent = money(g.per) + ' per paycheck';
      app.querySelector('[data-gp="' + id + '"]').textContent = goalText(g, o.goals[idx], o);
    }
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.hasAttribute('data-slide')) { save(); render(); return; }
    if (t.getAttribute('data-set') === 'chHour') { var hv = +t.value; if (hv >= 18 && hv <= 22) { P.remind = P.remind || {}; P.remind.chHour = hv; save(); } return; }
    if (t.getAttribute('data-set') === 'tz') { if (F.validTz(t.value)) { P.tz = t.value; save(); track('set-tz'); render(); } return; }
    if (t.getAttribute('data-set') === 'weekStart') { var wsv = +t.value; if (wsv >= 0 && wsv <= 6) { P.weekStart = wsv; if (U.mm) U.mm.wk = mmWeek(mmToday()); save(); track('set-week-start'); render(); } return; }
    if (t.hasAttribute('data-mename')) { var nv = String(t.value || '').trim().replace(/\s+/g, ' ').slice(0, 40); if (nv) { setMe({ name: nv }); peopleSave(); render(); } return; }
    if (t.hasAttribute('data-meoptin')) { setMe({ optIn: t.checked }); peopleSave(); track(t.checked ? 'email-list-on' : 'email-list-off'); return; }
    if (t.getAttribute('data-file') === 'snap') { snapFiles(t); return; }
    if (t.hasAttribute('data-wipehand')) { U.wipeHand = t.checked; return; }
    if (t.hasAttribute('data-cckey')) { var ck = chatAt(t.getAttribute('data-cckey')); if (ck) { ck.key = t.value; ck.err = ''; render(); } return; }
    if (t.hasAttribute('data-cc')) { var ce = chatAt(t.getAttribute('data-cc')); if (ce) { var f = t.getAttribute('data-ccf'); ce.a[f] = f === 'amount' ? round2(num(t.value)) : String(t.value).slice(0, 40); } return; }
    if (t.hasAttribute('data-scan-ok')) { var po = t.getAttribute('data-scan-ok').split('.'), mo = scanMsg(po[0]), so = mo && mo.rows && mo.rows[+po[1]]; if (so) { so.ok = t.checked; mo.err = ''; render(); } return; }
    if (t.hasAttribute('data-scan-key')) { var pk = t.getAttribute('data-scan-key').split('.'), mk = scanMsg(pk[0]), sk = mk && mk.rows && mk.rows[+pk[1]]; if (sk) { sk.key = t.value; sk.tag = ''; if (t.value) sk.ok = true; mk.err = ''; render(); } return; }
    if (t.getAttribute('data-file') === 'backup') readFile(t, function (text) {
      try { var d = JSON.parse(text); if (!d || d.v !== 1 || !Array.isArray(d.debts)) throw new Error('bad'); if (P.setupDone) keepCopy(); P = Object.assign(blank(), d); save(); U.toast = ['Backup restored.', 'Welcome back.', false]; go(P.setupDone ? 'home' : 'welcome'); }
      catch (err) { U.err = 'That doesn’t look like a Find Me the Money backup file.'; render(); }
    });
  });

  // ---------- swipe to sort ----------
  function decide(v) {
    var q = spending().unsorted; if (!q.length) return;
    P.sorted[q[0].m] = v; U.sortHist.push(q[0].m); save();
    if (!spending().unsorted.length) { U.limit = null; track('sorted'); go('found'); } else render();
  }
  function flyAndDecide(card, v) {
    card.classList.remove('dragging');
    card.style.transform = 'translateX(' + (v === 'need' ? 520 : -520) + 'px) rotate(' + (v === 'need' ? 18 : -18) + 'deg)';
    card.style.opacity = '0';
    setTimeout(function () { decide(v); }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 230);
  }
  var drag = null;
  function bucketAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest && el.closest('[data-bucket]'); }
  app.addEventListener('pointermove', function (e) {
    if (!dcard) return;
    dcard.el.style.transform = 'translate(' + (e.clientX - dcard.x) + 'px,' + (e.clientY - dcard.y) + 'px) scale(.92)';
    dcard.el.style.pointerEvents = 'none'; var bk = bucketAt(e.clientX, e.clientY); dcard.el.style.pointerEvents = '';
    Array.prototype.forEach.call(app.querySelectorAll('.bucket.hover'), function (x) { if (x !== bk) x.classList.remove('hover'); });
    if (bk) bk.classList.add('hover');
  });
  function dropCard(e) {
    if (!dcard) return; var d = dcard; dcard = null;
    d.el.style.pointerEvents = 'none'; var bk = e && e.type === 'pointerup' ? bucketAt(e.clientX, e.clientY) : null; d.el.style.pointerEvents = '';
    if (bk) assignTo(bk.getAttribute('data-bucket')); else { d.el.classList.remove('dragging'); d.el.style.transform = ''; }
  }
  app.addEventListener('pointerup', dropCard);
  app.addEventListener('pointercancel', dropCard);
  app.addEventListener('focusout', function (e) {
    var t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-bedit')) return;
    budgetCommit(t.getAttribute('data-bedit'), t.value);
    U.bEdit = U.bNext || null; U.bNext = null; render();
    var inp = app.querySelector('[data-bedit]'); if (inp) { inp.focus(); inp.select(); }
  });
  app.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.hasAttribute && t.hasAttribute('data-bedit')) {
      if (e.key === 'Enter') { e.preventDefault(); t.blur(); }
      if (e.key === 'Escape') { U.bEdit = null; U.bNext = null; t.removeAttribute('data-bedit'); render(); }
    }
    if (t.hasAttribute && (t.hasAttribute('data-baddamt') || t.hasAttribute('data-baddname')) && e.key === 'Enter') { e.preventDefault(); var sb = app.querySelector('[data-a=baddsave]'); if (sb) sb.click(); }
    if (t.hasAttribute && (t.hasAttribute('data-baddamt') || t.hasAttribute('data-baddname')) && e.key === 'Escape') { U.bAdd = null; render(); }
  });
  var dcard = null;
  app.addEventListener('pointerdown', function (e) {
    var dc = e.target.closest && e.target.closest('[data-drag]');
    if (dc) { dcard = { el: dc, x: e.clientX, y: e.clientY }; dc.classList.add('dragging'); try { dc.setPointerCapture(e.pointerId); } catch (err) {} return; }
    var nx = e.target.closest && e.target.closest('[data-a=bedit]');
    if (nx && U.bEdit) U.bNext = nx.getAttribute('data-v');
    var card = e.target.closest('[data-swipe]'); if (!card) return;
    drag = { card: card, x: e.clientX, dx: 0 }; card.classList.add('dragging');
    try { card.setPointerCapture(e.pointerId); } catch (err) {}
  });
  app.addEventListener('pointermove', function (e) {
    if (!drag) return;
    drag.dx = e.clientX - drag.x;
    drag.card.style.transform = 'translateX(' + drag.dx + 'px) rotate(' + drag.dx / 20 + 'deg)';
    drag.card.querySelector('.swipe-hint.want').style.opacity = Math.max(0, Math.min(1, -drag.dx / 90));
    drag.card.querySelector('.swipe-hint.need').style.opacity = Math.max(0, Math.min(1, drag.dx / 90));
  });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    if (Math.abs(d.dx) > 90) { flyAndDecide(d.card, d.dx > 0 ? 'need' : 'want'); return; }
    d.card.classList.remove('dragging'); d.card.style.transform = '';
    Array.prototype.forEach.call(d.card.querySelectorAll('.swipe-hint'), function (h) { h.style.opacity = 0; });
  }
  app.addEventListener('pointerup', endDrag);
  app.addEventListener('pointercancel', endDrag);

  // a fresh day can make a payday due; re-render when the app comes back to the front
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (C.timer) { clearTimeout(C.timer); cloudPush(); } return; } if (S && !C.busy) cloudPull(false); if (U.screen === 'home') render(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  try {
    var qs = new URLSearchParams(location.search);
    if (qs.has('coachreset')) localStorage.removeItem(COACH_KEY);
    if (qs.has('coachtest')) { localStorage.removeItem(COACH_KEY); U.coachTest = qs.get('coachtest') !== '' && !isNaN(+qs.get('coachtest')) ? +qs.get('coachtest') : true; }
  } catch (e) {}
  cloudStart();
  remindResume();
  if (cloudOn() && P.setupDone && !S && U.screen === 'home') { U.savePrompt = true; U.afterSave = true; U.screen = 'savesetup'; track('save-prompt'); }
  peopleDaily();
  // a shared budget checks for the other person's changes every minute while it's open
  setInterval(function () { if (shared() && !document.hidden && !C.busy && C.ready && !C.timer) cloudPull(false); }, 60000);
  render();
})();
