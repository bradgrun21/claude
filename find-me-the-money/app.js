/* Find Me the Money: screens and interactions. All data stays in this browser (localStorage). */
(function () {
  'use strict';
  var F = window.FMTM;

  // ---------- settings for the beta ----------
  var CONFIG = {
    feedbackUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSegoJHMVLzFlS6-o_XvC1Y6K4Dr_8qPa_fpCAMoywp8EnggzQ/viewform', // beta feedback form; shows a Feedback tab on every screen
    storageKey: 'fmtm.v1',
    // Optional accounts, so a plan follows someone to any phone. These two values are public by design;
    // each person can only read their own row (row level security on the plans table).
    supabaseUrl: 'https://ktgwaedkaxsrqencglnu.supabase.co',
    supabaseKey: 'sb_publishable_SRQX7Tks3rdEkwYcaavYbw_cAl5ce6q',
    shareUrl: 'findmethemoney.netlify.app', // printed on share cards
    youtubeUrl: 'https://www.youtube.com/channel/UCPJ-EMNmCkH4oom-kRxNapQ', // short videos; shown on the Community tab
    communityUrl: 'https://www.skool.com/find-me-the-money-1929/about', // your Skool community link; the Community tab's join button opens it
    coachingUrl: '', // where "Learn about coaching" goes (paid level or booking page); empty uses the community link
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
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
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
  function track(name) { try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'event-' + name, title: name, event: true }); } catch (e) {} }

  // ---------- saved data ----------
  function blank() {
    return { v: 1, setupDone: false, paycheck: '', freq: 'biweekly', nextPay: F.isoDay(F.addDays(today(), 7)),
      bills: [['Rent', 'home'], ['Electricity', 'utilities'], ['Internet', 'utilities'], ['Phone', 'utilities'], ['Groceries', 'food'], ['Gas', 'transport'], ['Car insurance', 'transport']].map(function (x) { return { name: x[0], amount: '', group: x[1] }; }),
      debts: [], savings: '', givingPct: 0, giveMode: 'pct', giveMonthly: '', payVaries: false, payHist: [], payBasis: 'low', fun: '', goals: [], tx: [], txFrom: null, txTo: null, sorted: {}, lastHeadline: null, history: [],
      streak: { count: 0, best: 0, grace: 0, lastPayday: null }, totals: { debtPaid: 0, saved: 0, daysBack: 0 }, lastFree: null, prevSavings: null, prevGoals: {},
      challenges: [], challengesDone: 0, badges: {}, unseen: [], plans: [], plansDone: 0, shares: 0, basics: '', unlocked: {}, installSeen: false, communityJoined: false, funParts: [], found: null,
      efMonths: '', retire: '', kids: '', college: '', home: '', mortgage: '', qPay: '', qExp: '', qDebt: '', qMin: '', quick: null, spends: [], household: '', payLabel: '', incomes: [], retirements: [], otherIncome: [], moneyDate: null, moneyDates: [], storeLine: {}, payAuto: false, basicsAuto: false,
      retirePct: '', retireMonthly: '', retireBal: '', retireFrom: '', collegeBal: '', collegeMonthly: '', mortgagePay: '', mortgageRate: '' };
  }
  var storageOk = true;
  function load() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey); if (!raw) return blank();
      var d = JSON.parse(raw); delete d.x;
      // plans saved before features unlocked gradually keep everything they already had
      if (d.setupDone && !d.unlocked) d.unlocked = { challenges: true, milestones: true };
      // one retirement answer becomes the first retirement account
      if (!d.retirements && (num(d.retirePct) || num(d.retireMonthly) || num(d.retireBal))) d.retirements = [{ id: uid(), owner: 0, type: d.retireFrom === 'post' ? 'IRA' : '401(k)', pct: d.retirePct || '', monthly: d.retireMonthly || '', bal: d.retireBal || '', from: d.retireFrom || 'pre' }];
      // bills saved before budget groups existed get placed by name
      (d.bills || []).forEach(function (b) { if (!b.group) b.group = F.groupFor(b.name); });
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
      S.owner = mine ? mine.owner_id : S.uid; S.role = mine ? 'member' : 'owner'; S.partner = mine ? mine.owner_email : part ? part.member_email : null; S.shareReady = true; keepAuth();
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
    if (U.joinMode) { U.screen = 'account'; return cloudWho().then(function () { render(); var c = app.querySelector('[data-cjoin]'); if (c) c.focus(); }); }
    return cloudPull(true).then(function () {
      if (U.afterSave && U.screen !== 'cloudpick' && !standalone()) { U.toast = ['Saved to your account.', 'Your plan is safe now.', true]; go('saveinstall'); return; }
      if (U.afterSave && U.screen !== 'cloudpick') { U.afterSave = false; U.toast = ['Saved to your account.', 'Your plan is safe now.', true]; go('home'); return; } if (U.screen !== 'cloudpick' && U.screen !== 'home') { U.toast = ['You’re signed in.', 'Your plan now saves to your account and follows you to any phone.', true]; go(P.setupDone ? 'home' : 'welcome'); } else if (U.screen === 'home') { U.toast = ['You’re signed in.', 'Your plan came with you.', true]; render(); } });
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
  function syncText() {
    return { saving: 'Saving…', saved: '✓ Saved to your account', offline: 'Offline. It’ll save when you’re back online.', expired: 'Signed out. Sign in again to keep saving.' }[C.state] || 'Checking your account…';
  }
  function shareBlock() {
    if (!S || S.shareReady === false) return '';
    var top = '<div class="stack" style="gap:8px;border-top:1px solid var(--line, rgba(0,0,0,.08));padding-top:12px;margin-top:2px"><b>Budget together</b>';
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
  function signInForm() {
    var st = U.cloudStep;
    return (st && st.sent ? '<span style="font-size:14px">We emailed a 6-digit code to <b>' + esc(st.email) + '</b>. Enter it here, or tap the link in the email. Not there in a minute? Check your junk or spam folder.</span>' +
        '<label class="field">Code<input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" data-ccode placeholder="123456"></label>' +
        '<button type="button" class="primary" data-a="cverify">Sign in</button><div style="display:flex;gap:14px;flex-wrap:wrap"><button type="button" class="linkbtn" data-a="csend">Send a new code</button><button type="button" class="linkbtn" data-a="creset">Use a different email</button></div>'
        : '<label class="field">Email<input type="email" inputmode="email" autocomplete="email" data-cemail value="' + esc(st && st.email || '') + '" placeholder="you@example.com"></label><button type="button" class="primary" data-a="csend">Email me a sign-in code</button>') +
      (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '');
  }
  function saveNudge() {
    if (!cloudOn() || S || P.saveNudgeOff || !(P.history || []).length) return '';
    return '<div class="card" style="padding:14px 16px;display:flex;gap:12px;align-items:center"><div style="flex:1;min-width:0"><b>Save your plan</b><span style="display:block;font-size:14px;color:var(--muted)">So it\u2019s safe if you lose or switch phones.</span></div>' +
      '<button type="button" class="sharebtn" data-a="edit" data-v="account">Save it</button><button type="button" class="x" data-a="savenudgeoff" aria-label="Hide this">\u00d7</button></div>';
  }
  function accountCard() {
    if (!cloudOn()) return '';
    if (S) return '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="eyebrow">Your account</div><b>' + esc(S.email || 'Signed in') + '</b>' +
      '<span style="font-size:14px;color:var(--muted)" data-live="sync">' + syncText() + '</span>' +
      '<span style="font-size:14px;color:var(--muted)">Sign in with this email on any phone, in Safari or the Home Screen app, and your plan is there.</span>' + shareBlock() + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '') +
      (U.cdel ? '<div class="note" role="alert" style="border-color:rgba(138,58,30,.4)"><span>This deletes the copy saved in your account and signs you out. Your plan stays on this phone.</span></div><div class="grid2"><button type="button" class="outline" data-a="cdelno">Keep it</button><button type="button" class="primary danger" data-a="cdelyes">Delete it</button></div>'
        : '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn ghost" data-a="cout">Sign out</button><button type="button" class="sharebtn ghost" data-a="cdel" style="color:var(--warn)">Delete my account copy</button></div>') + '</div>';
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
      paycheck: householdPaycheck(), freq: P.freq, nextPay: F.rollPayday(P.nextPay, P.freq, today()), givingPct: giveAmt() ? 0 : P.givingPct, giveAmt: giveAmt() / F.FREQS[P.freq].perMonth, savings: num(P.savings),
      // until fun money is set, assume 10% of take-home pay so the countdown isn't too rosy
      fun: funSet() ? num(P.fun) : 0, funEst: false,
      // one "bills and basics" number until the person lists bills one by one
      bills: itemized() ? F.billGroups(P.bills) : [{ name: 'Bills and basics', amount: basicsNet() }],
      // interest is optional; a blank rate is estimated at 20%
      debts: P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).map(function (d) { return { id: d.id, name: d.name || 'Debt', bal: num(d.bal), min: num(d.min), apr: String(d.apr).trim() === '' ? 20 : num(d.apr) }; }),
      efMonths: efMonths(), saveRows: saveRows(),
      goals: P.goals.map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.by ? 'fund' : g.kind, months: g.months, per: g.per || 0, byPer: g.by ? goalByPer(g) : 0, saved: num(g.saved) }; })
    };
  }
  // paydays left before a goal's date, and what each one needs to set aside
  function paydaysUntil(iso) {
    var next = F.rollPayday(P.nextPay, P.freq, today()), days = F.FREQS[P.freq].days, gap = F.daysBetween(F.fromIso(next), F.fromIso(iso));
    return gap < 0 ? 0 : Math.floor(gap / days) + 1;
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
  function accMonthly(a) { var o = payOwners()[a.owner || 0] || payOwners()[0]; return num(a.monthly) || num(a.pct) / 100 * o.monthly; }
  function retireOn() { return P.retire === 'some' || P.retire === 'full'; }
  function retireMonthly() { return retireOn() ? (P.retirements || []).reduce(function (t, a) { return t + accMonthly(a); }, 0) : 0; }
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
    return sv >= 1000 ? 'Step 1 done. Your starter cushion is in place.' : money(1000 - sv) + ' to go to your $1,000 starter cushion.';
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
  var U = { screen: P.setupDone ? 'home' : 'welcome', toast: null, form: null, formErr: '', err: '', sortHist: [], back: 'home', next: 'home', confirmDelete: false, filter: 'all', showHelp: false };
  var app = document.getElementById('app');
  // Challenges and Milestones share the Wins tab, so the bar stays at five
  var TABS = [['home', 'Home', 'home'], ['plan', 'Budget', 'wallet'], ['plus', 'Add', 'plus'], ['plans', 'Plans & Goals', 'book'], ['community', 'Community & Wins', 'people']];
  function tabOf(screen) { return screen === 'challenges' || screen === 'milestones' ? 'community' : screen; }
  function render() {
    ensureIds();
    if (P.setupDone && (U.screen === 'wins' || TABS.some(function (t) { return t[0] === tabOf(U.screen); }))) refresh();
    var u = P.unlocked || {};
    var tabs = TABS;
    var tabbed = P.setupDone && U.screen !== 'wins' && tabs.some(function (t) { return t[0] === tabOf(U.screen); });
    if (U.screen === 'plans' || U.screen === 'planday') U.planCtx = null;
    var html = (V[U.screen] || V.home)();
    if (U.planCtx) html = planBar() + html;
    // beta: a small Feedback tab on every screen
    if (CONFIG.feedbackUrl) html += '<a class="fbtab" href="' + esc(CONFIG.feedbackUrl) + '" target="_blank" rel="noopener" data-a="feedback" aria-label="Send feedback">Feedback</a>';
    if (tabbed) {
      var news = P.unseen.length;
      html += '<nav class="tabbar" aria-label="Sections" style="grid-template-columns:repeat(' + tabs.length + ',minmax(0,1fr))">' + tabs.map(function (t) {
        var on = tabOf(U.screen) === t[0];
        if (t[0] === 'plus') return '<span class="fabslot"><button type="button" class="fab' + (U.plusOpen ? ' open' : '') + '" data-a="plusmenu" aria-label="Add" aria-expanded="' + !!U.plusOpen + '">' + ICON.plus + '</button></span>';
        return '<button type="button" data-a="go" data-v="' + t[0] + '"' + (on ? ' aria-current="page" class="on"' : '') + '>' + ICON[t[2]] + '<span>' + t[1] + '</span>' + (t[0] === 'community' && news && !on ? '<i class="badge-dot" aria-label="' + news + ' new"></i>' : '') + '</button>';
      }).join('') + '</nav>' + (U.plusOpen ? plusSheet() : '');
    }
    app.innerHTML = html;
    csvAutoplay();
    document.body.classList.toggle('has-tabs', tabbed);
  }
  // ---------- the CSV how-to: five short animated scenes on a drawn phone ----------
  var CSV_SCENES = [
    ['Log in to your bank\u2019s website', 'Use Safari or a computer. Most bank apps can\u2019t export a file.',
      '<div class="ph-url">\uD83D\uDD12 yourbank.com</div><div class="ph-title">Accounts</div><div class="ph-item tapme">Everyday Checking<span>$1,284.50</span></div><div class="ph-item">Savings<span>$300.00</span></div><div class="ph-item">Credit card<span>$412.08</span></div>', [50, 47]],
    ['Open Activity, then tap Download', 'It might be a \u2913 icon, or say Export.',
      '<div class="ph-url">\uD83D\uDD12 yourbank.com</div><div class="ph-title">Activity<span class="ph-dl tapme">\u2913</span></div><div class="ph-item">Kroger<span>\u2212$71.30</span></div><div class="ph-item">DoorDash<span>\u2212$24.10</span></div><div class="ph-item">Shell<span>\u2212$41.00</span></div><div class="ph-item">Paycheck<span>+$970.00</span></div>', [84, 30]],
    ['Pick CSV and the last 30 days', 'It might be called Spreadsheet or Excel instead.',
      '<div class="ph-sheet"><div class="ph-title">Download activity</div><div class="ph-opt">PDF</div><div class="ph-opt on tapme">CSV (spreadsheet)</div><div class="ph-opt">Quicken</div><div class="ph-range">Last 30 days \u25BE</div><div class="ph-btn">Download</div></div>', [50, 50]],
    ['It saves to Files \u2192 Downloads', 'On a computer? AirDrop or email it to yourself.',
      '<div class="ph-title">Downloads</div><div class="ph-file new"><span class="ph-ic">CSV</span>activity.csv<small>Just now</small></div><div class="ph-file"><span class="ph-ic pdf">PDF</span>statement.pdf<small>Sep 30</small></div>', [50, 34]],
    ['Come back here and choose it', 'Tap Choose a CSV file, then Browse \u2192 Downloads.',
      '<div class="ph-card tapme"><b>Choose a CSV file</b><small>Read on this phone, never uploaded</small></div><div class="ph-file new later"><span class="ph-ic">CSV</span>activity.csv<small>Tap to import</small></div>', [50, 28]]
  ];
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
  var GUIDES = { csv: CSV_SCENES, ios: IOS_SCENES, android: ANDROID_SCENES };
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
  // "‹ Day 1 · Find your number  ○": a way back to today's plan, and a check to finish it from here
  function planBar() {
    var run = P.plans.filter(function (p) { return p.uid === U.planCtx.uid; })[0]; if (!run) { U.planCtx = null; return ''; }
    var d = F.planDef(run.id).days[U.planCtx.day], done = (run.done || []).indexOf(U.planCtx.day) >= 0;
    return '<div class="planbar"><button type="button" class="pb-back" data-a="planback"><span aria-hidden="true">\u2039</span><span><small>Back to your plan</small>Day ' + (U.planCtx.day + 1) + ' \u00b7 ' + d.title + '</span></button>' +
      '<button type="button" class="pb-check' + (done ? ' on' : '') + '" data-a="planmark" aria-label="Mark day ' + (U.planCtx.day + 1) + ' complete">' + ICON.check(done ? '#fff' : '#2A6B66', 16) + '<span>Done</span></button></div>';
  }
  function go(s) {
    U.plusOpen = false;
    var toWins = s === 'challenges' || s === 'milestones';
    if (toWins) { U.winsView = s; s = 'community'; }
    U.screen = s; U.err = ''; render();
    var w = toWins && app.querySelector('#wins');
    if (w) w.scrollIntoView(); else window.scrollTo(0, 0);
  }
  // the + menu: the quick things people do between paydays
  function plusSheet() {
    var items = [['spendnew', '', 'Add spending', 'Five seconds per purchase'], ['checkin', '', 'Update my balances', 'Check in on payday, or anytime'], ['edit', 'import', 'Import a bank file', 'Sort it into your budget'], ['goalnew', '', 'Add a goal', 'A trip, a car, a gift']];
    return '<div class="plusback" data-a="plusclose" aria-hidden="true"></div><div class="plussheet" role="menu">' + items.map(function (x) {
      return '<button type="button" role="menuitem" data-a="' + x[0] + '"' + (x[1] ? ' data-v="' + x[1] + '"' : '') + '><b>' + x[2] + '</b><small>' + x[3] + '</small></button>'; }).join('') + '</div>';
  }

  var ICON = {
    check: function (c, s) { s = s || 14; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M5 12l5 5L20 7"/></svg>'; },
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    logo: '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.2" cy="10.2" r="6.3" fill="#3A554D" stroke="#FFC27E" stroke-width="2.4"/><path d="M14.6 14.6l4.6 4.6" stroke="#FF9A76" stroke-width="3.4" stroke-linecap="round"/><text x="10.2" y="10.6" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="8.6" fill="#FFD08A">$</text></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
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
  function winsSwitch(cur) {
    return '<div class="seg" role="group" aria-label="Wins" style="align-self:flex-start;margin-top:8px">' + [['challenges', 'Challenges'], ['milestones', 'Milestones']].map(function (o) {
      var on = cur === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="go" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
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
  function wizNext(n) { n = wizIndex(n); return '<div class="push">' + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.err + '</p>' : '') + '<button type="button" class="primary" data-a="wiz" data-v="' + n + '">' + (P.setupDone ? 'Save' : n === WIZ.length ? 'See my countdown' : 'Next') + '</button></div>'; }

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
  function storeTx(m) { return P.tx.filter(function (x) { return x.merchant === m; }); }
  function splitHtml(t) {
    var keys = ['need', 'want', 'unsorted'].filter(function (k) { return t[k] > 0; }), all = t.need + t.want + t.unsorted || 1;
    return '<span class="split" role="img" aria-label="Needs ' + Math.round(t.need / all * 100) + '%, wants ' + Math.round(t.want / all * 100) + '%' + (t.unsorted ? ', not sorted ' + Math.round(t.unsorted / all * 100) + '%' : '') + '">' +
      keys.map(function (k) { return '<i class="c-' + (k === 'unsorted' ? 'uns' : k) + '" style="flex:' + t[k] + '"></i>'; }).join('') + '</span>';
  }
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
    'With no payments eating your paycheck, your cushion grows into 3 to 6 months of real security.',
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
    var where = o1.step === 1 ? 'your $1,000 starter cushion, then your debts' : o1.target ? 'your ' + o1.target.name : 'your safety net';
    if (d0 && d1 && d0 > d1) return 'It goes to ' + where + '. ' + (o1.target ? 'Debt-free ' : 'Safety net full ') + span(F.daysBetween(d1, d0)) + ' sooner, by ' + shortDate(d1) + '.';
    if (!d0 && d1) return 'It goes to ' + where + '. That turns “never” into ' + (o1.target ? 'debt-free' : 'a full safety net') + ' by ' + shortDate(d1) + '.';
    return 'It goes to ' + where + ': ' + money((wants - limit) * 12) + ' more a year working for you.';
  }
  // ---------- the budget, in plain sections ----------
  var BUDGET_SECTIONS = [['give', 'Giving'], ['need', 'Needs'], ['want', 'Wants'], ['save', 'Saving & goals']];
  var FUN_PARTS = ['Eating out & delivery', 'Coffee & treats', 'Shopping', 'Entertainment', 'Hobbies', 'Personal spending'];
  function funParts() { return (P.funParts || []).filter(function (x) { return num(x.amount) > 0; }); }
  // Each budget line knows how to edit itself. Amounts are stored monthly; d turns them into what's on screen.
  function budgetRows(pl, mo) {
    var out = [], d = mo ? 1 : pl.ppm, K = mo ? pl.ppm : 1;
    var line = function (o) { o.amount = o.amount || 0; return o; };
    pl.rows.forEach(function (r) {
      if (r.kind === 'give') return out.push(line({ cat: 'give', label: esc(r.label), amount: r.amount * K, strong: true, edit: 'give', raw: giveAmt() ? round2(giveAmt() / d) : P.givingPct || 0, unit: giveAmt() ? '' : '%' }));
      if (r.kind === 'bill' && r.group) {
        var kids = [];
        P.bills.forEach(function (b, i) {
          if (b.group !== r.group) return;
          var yr = b.per === 'yr';
          kids.push(line({ billIdx: i, skey: 'b:' + b.id, mon: F.billMonthly(b), label: esc(b.name || 'Bill'), sub: yr ? 'Paid yearly \u00b7 set aside monthly' : '', amount: F.billMonthly(b) / d, edit: 'bill:' + i, raw: yr ? num(b.amount) : round2(num(b.amount) / d), unit: yr ? 'yr' : '', rm: ['bills', i] }));
        });
        return out.push(line({ cat: r.group === 'subs' ? 'want' : 'need', label: esc(r.label), amount: r.amount * K, open: 'g:' + r.group, kids: kids, skeys: kids.map(function (k) { return k.skey; }), mon: r.amount * pl.ppm }));
      }
      if (r.kind === 'bill') return out.push(line({ skey: 'basics', mon: num(P.basics), cat: 'need', label: esc(r.label), sub: 'One number for now. Add needs below to list them one by one.', amount: r.amount * K, edit: 'basics', raw: round2(basicsNet() / d) }));
      if (r.kind === 'min') {
        var dk = [];
        P.debts.forEach(function (x, i) { if (num(x.bal) > 0) dk.push(line({ label: esc(x.name || 'Debt'), sub: money(num(x.bal)) + ' left', amount: num(x.min) / d, edit: 'dmin:' + i, raw: round2(num(x.min) / d) })); });
        return out.push(line({ cat: 'need', label: 'Debt minimums', sub: 'Required payments on every debt', amount: r.amount * K, open: 'min', kids: dk }));
      }
      if (r.kind === 'fun') {
        if (funParts().length) {
          (P.funParts || []).forEach(function (x, i) { if (num(x.amount) > 0) out.push(line({ skey: 'f:' + x.id, mon: num(x.amount), cat: 'want', label: esc(x.name || 'Fun money'), amount: num(x.amount) / d, edit: 'part:' + i, raw: round2(num(x.amount) / d), rm: ['funParts', i] })); });
          return;
        }
        return out.push(line({ skey: 'fun', mon: profile().fun, cat: 'want', label: 'Fun money' + (funSet() ? '' : ' \u00b7 estimate'), sub: 'Eating out, coffee, shopping', amount: r.amount * K, edit: 'fun', raw: round2(profile().fun / d) }));
      }
      if (r.kind === 'save') { var ri = r.key && r.key.indexOf('ret:') === 0 ? +r.key.slice(4) : -1; return out.push(line({ cat: 'save', label: esc(r.label), amount: r.amount * K, edit: ri >= 0 ? r.key : 'college', raw: round2((ri >= 0 ? accMonthly(P.retirements[ri]) : num(P.collegeMonthly)) / d) })); }
      out.push(line({ cat: 'save', label: esc(r.label), amount: r.amount * K, strong: true }));
    });
    return out;
  }
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
    save();
  }
  // add a need (files itself into the right bill group) or a want (a part of fun money)
  function budgetAdd(cat, name, raw) {
    var pl = F.plan(profile()), d = U.planMonth ? 1 : pl.ppm, m = String(round2(Math.max(0, num(raw)) * d));
    name = String(name || '').trim(); if (!name && !(num(raw) > 0)) return;
    if (cat === 'need') {
      // switching from one "bills and basics" number to a list keeps that number as "Everything else"
      if (!itemized() && num(P.basics) > 0) P.bills.push({ name: 'Everything else', amount: String(num(P.basics)), group: 'other' });
      var same = P.bills.filter(function (b) { return String(b.name).toLowerCase() === name.toLowerCase() && !(num(b.amount) > 0); })[0];
      if (same) same.amount = m; else P.bills.push({ name: name || 'Bill', amount: m, group: F.groupFor(name) });
      U.bOpen = U.bOpen || {}; U.bOpen['g:' + (same ? same.group : F.groupFor(name))] = true;
    } else {
      P.funParts = P.funParts || [];
      if (!funParts().length && funSet() && num(P.fun) > 0) P.funParts.push({ name: 'Fun money', amount: String(num(P.fun)) });
      P.funParts.push({ name: name || 'Want', amount: m });
      P.fun = String(funParts().reduce(function (t, x) { return t + num(x.amount); }, 0));
    }
    save();
  }
  function budgetLine(r, mo) {
    var unit = r.unit === '%' ? '%' : r.unit === 'yr' ? '/yr' : mo ? '/mo' : '/paycheck';
    var amt = r.edit && U.bEdit === r.edit
      ? '<span class="bedit"><input type="number" inputmode="decimal" min="0" step="any" data-bedit="' + r.edit + '" value="' + r.raw + '" aria-label="' + r.label + ' amount"><span>' + unit + '</span></span>'
      : r.edit ? '<button type="button" class="bamt" data-a="bedit" data-v="' + r.edit + '" aria-label="Change ' + r.label + ', now ' + money(r.amount) + '">' + money(r.amount) + '</button>' : '<b>' + money(r.amount) + '</b>';
    // groups start open; a tap on the name folds one away
    var open = r.open && !(U.bOpen && U.bOpen[r.open] === false);
    var name = r.open ? '<button type="button" class="bname" data-a="btoggle" data-v="' + r.open + '" aria-expanded="' + !!open + '"><span class="chev' + (open ? ' open' : '') + '" aria-hidden="true">\u203a</span>' + r.label + '</button>' : r.label;
    if (r.billIdx != null) name = '<span class="bname-row">' + name + duePill(P.bills[r.billIdx], r.billIdx) + '</span>';
    return '<div class="row brow"><span style="min-width:0;flex:1;' + (r.strong ? 'font-weight:600' : 'color:var(--muted)') + '">' + name + (r.sub ? '<small>' + r.sub + '</small>' : '') + spentBar(r) + '</span>' +
      '<span class="bright">' + amt + (r.rm ? '<button type="button" class="x" data-a="rm" data-v="' + r.rm[0] + '" data-i="' + r.rm[1] + '" aria-label="Remove ' + r.label + '">\u00d7</button>' : '') + '</span></div>' +
      (r.billIdx != null && U.dueEdit === r.billIdx ? dueForm(r.billIdx) : '') +
      (open ? '<div class="bkids">' + (r.kids.length ? r.kids.map(function (c) { return budgetLine(c, mo); }).join('') : '<p style="font-size:13px;padding:6px 0">Nothing here yet.</p>') + '</div>' : '');
  }
  // ---------- spending, added by hand ----------
  function ensureIds() {
    (P.bills || []).forEach(function (b) { if (!b.id) b.id = uid(); });
    (P.funParts || []).forEach(function (x) { if (!x.id) x.id = uid(); });
    P.spends = P.spends || [];
  }
  function monthOf(iso) { return String(iso).slice(0, 7); }
  // the categories a purchase can count against: the spending lines in their own budget
  function spendLines() {
    var out = [];
    if (itemized()) P.bills.forEach(function (b) { if (F.billMonthly(b) > 0) out.push({ key: 'b:' + b.id, label: b.name || 'Bill', cat: b.group === 'subs' ? 'want' : 'need', mon: F.billMonthly(b) }); });
    else out.push({ key: 'basics', label: 'Bills and basics', cat: 'need', mon: num(P.basics) });
    if (funParts().length) P.funParts.forEach(function (x) { if (num(x.amount) > 0) out.push({ key: 'f:' + x.id, label: x.name || 'Fun money', cat: 'want', mon: num(x.amount) }); });
    else out.push({ key: 'fun', label: 'Fun money', cat: 'want', mon: profile().fun });
    out.push({ key: 'other', label: 'Something else', cat: 'other', mon: 0 });
    return out;
  }
  function curSpendMonth() { return U.spendMonth || monthOf(F.isoDay(today())); }
  function monthName(ym) { var a = ym.split('-'); return new Date(+a[0], +a[1] - 1, 1).toLocaleDateString('en-US', { month: 'long' }); }
  function tracking() { return P.spends.length > 0 || Object.keys(P.storeLine || {}).length > 0; }
  // purchases added by hand, plus imported purchases from stores placed in a budget line
  function spentMap(month) {
    var m = {}, sl = P.storeLine || {}; month = month || curSpendMonth();
    P.spends.forEach(function (x) { if (monthOf(x.date) === month) m[x.key] = (m[x.key] || 0) + num(x.amount); });
    P.tx.forEach(function (x) { var k = sl[x.merchant]; if (k && monthOf(x.date) === month) m[k] = (m[k] || 0) + num(x.amount); });
    return m;
  }
  function spentBar(r) {
    if (!tracking() || !(r.skey || r.skeys)) return '';
    var m = spentMap(), spent = r.skeys ? r.skeys.reduce(function (t, k) { return t + (m[k] || 0); }, 0) : (m[r.skey] || 0), bud = r.mon || 0;
    if (!spent && !bud) return '';
    var over = spent > bud + 0.5, left = bud - spent;
    return '<span class="spbar' + (over ? ' over' : '') + '"><i style="width:' + Math.min(100, bud ? spent / bud * 100 : 100) + '%"></i></span>' +
      '<small class="spnote' + (over ? ' over' : '') + '">' + money(spent) + ' spent \u00b7 ' + (over ? money(-left) + ' over' : money(left) + ' left') + '</small>';
  }
  function spendTotals() {
    var m = spentMap(), lines = spendLines(), spent = 0, bud = 0;
    lines.forEach(function (l) { spent += m[l.key] || 0; bud += l.mon; });
    Object.keys(m).forEach(function (k) { if (!lines.some(function (l) { return l.key === k; })) spent += m[k]; });
    return { spent: spent, bud: bud };
  }
  function homeSpend() {
    var t = spendTotals(), on = tracking() && t.spent > 0;
    return '<div class="card" style="padding:12px 14px 12px 18px;display:flex;align-items:center;gap:12px"><div style="flex:1;min-width:0"><b>' + (on ? money(t.spent) + ' spent in ' + monthName(curSpendMonth()) : 'Track what you spend') + '</b>' +
      '<small style="display:block;color:var(--muted);font-size:13px">' + (on ? money(Math.max(0, t.bud - t.spent)) + ' left in your budget' : 'Five seconds per purchase. See it count against your budget.') + '</small></div>' +
      '<button type="button" class="sharebtn" data-a="spendnew">+ Add</button></div>';
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
  function spendSummary() {
    var t = spendTotals(), over = t.spent > t.bud + 0.5, ym = curSpendMonth(), on = tracking(), left = unassignedStores().length;
    return '<div class="card stack spsum" style="padding:14px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">' +
      (on ? '<button type="button" class="mnav" data-a="spendmonth" data-v="-1" aria-label="Previous month">\u2039</button>' : '') + '<b style="flex:1">' + monthName(ym) + ' spending</b>' +
      '<span style="font-size:14px;color:var(--muted)">' + (on ? money(t.spent) + ' of ' + money(t.bud) : 'Nothing tracked yet') + '</span>' +
      (on ? '<button type="button" class="mnav" data-a="spendmonth" data-v="1" aria-label="Next month">\u203a</button>' : '') + '</div>' +
      (left ? '<button type="button" class="linkbtn" data-a="assignstart" style="align-self:flex-start">Put ' + plural(left, 'imported store') + ' in your budget \u203a</button>' : '') +
      (on ? '<span class="spbar big' + (over ? ' over' : '') + '"><i style="width:' + Math.min(100, t.bud ? t.spent / t.bud * 100 : 0) + '%"></i></span>' : '<p style="font-size:14px">Add what you spend and see it count against your budget, line by line.</p>') +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn" data-a="spendnew">+ Add spending</button>' + (on ? '<button type="button" class="sharebtn ghost" data-a="go" data-v="spendlog">See all</button>' : '') + '</div></div>';
  }
  function budgetAddRow(cat, mo) {
    if (cat === 'save') return '<button type="button" class="baddbtn" data-a="goalnew">+ Add a goal</button>';
    if (cat !== 'need' && cat !== 'want') return '';
    if (U.bAdd !== cat) return '<button type="button" class="baddbtn" data-a="badd" data-v="' + cat + '">+ Add a ' + cat + '</button>';
    return '<div class="badd"><input type="text" data-baddname placeholder="' + (cat === 'need' ? 'Like Rent, Gas or Daycare' : 'Like Concerts or Golf') + '" aria-label="Name">' +
      '<input type="number" inputmode="decimal" min="0" data-baddamt placeholder="' + (mo ? '$ a month' : '$ a paycheck') + '" aria-label="Amount">' +
      '<button type="button" class="sharebtn" data-a="baddsave" data-v="' + cat + '">Add</button><button type="button" class="x" data-a="baddcancel" aria-label="Cancel">\u00d7</button></div>';
  }
  // money found = what the bank file showed on wants, minus today's fun money
  function foundNow() { return P.found && P.found.from ? Math.max(0, P.found.from - num(P.fun)) : 0; }
  function wantsNote(mo, ppm) {
    var amt = foundNow(); if (!amt) return '';
    var d = mo ? 1 : ppm, unit = mo ? ' a month' : ' a paycheck';
    return '<p class="bnote">Your bank file showed about ' + money(P.found.from / d) + unit + ' on wants. You chose ' + money(num(P.fun) / d) + '. The other ' + money(amt / d) + ' goes to work below.</p>';
  }
  // "What if you found more?": extra dollars a month pull the next big date closer
  function whatIfGoal(o) { return o.target ? { label: 'Debt-free', date: o.debtFree } : o.step === 3 || o.step === 1 ? { label: 'Full safety net', date: o.safetyNet } : null; }
  function whatIfMax() { return Math.max(300, Math.round(monthlyIncome() * 0.25 / 50) * 50); }
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
  function whatIfHtml(o, inBudget) {
    var w = whatIfText(U.whatIf || 0); if (!w) return '';
    var perMonth = Math.max(0, o.plan.extra) * o.plan.ppm, max = whatIfMax(), v = Math.min(U.whatIf || 0, max);
    return '<div class="card stack whatif" style="padding:18px;gap:10px"><div class="eyebrow">What if you found more?</div>' +
      '<div><span style="color:var(--muted);font-size:14px">' + w.label + '</span><div class="wi-date" data-live="wiDate">' + w.date + '</div><small data-live="wiSub" style="color:var(--muted);font-size:14px">' + w.sub + '</small></div>' +
      '<input type="range" min="0" max="' + max + '" step="25" value="' + v + '" data-whatif="1" aria-label="Extra dollars a month">' +
      '<div class="row" style="border:0;padding:0;font-size:13px;color:var(--faint)"><span>+$0</span><span>+' + money(max) + ' a month</span></div>' +
      '<p style="font-size:13px">Right now about <b>' + money(perMonth) + ' a month</b> goes to this step. Every extra dollar here goes straight at it.</p>' +
      (inBudget || P.setupDone ? '<div class="chips">' + [['import', 'Find it in my bank file'], ['challenges', 'Try an earn challenge'], ['fun', 'Lower my fun money']].filter(function (x) { return x[0] !== 'challenges' || (P.unlocked && P.unlocked.challenges); }).map(function (x) {
        return '<button type="button" class="chip" data-a="' + (x[0] === 'challenges' ? 'go' : 'edit') + '" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' : '') + '</div>';
  }
  // one line per step for the reveal: [status, done?]
  function pathGlance(o, p) {
    var owed = p.debts.reduce(function (t, d) { return t + d.bal; }, 0), n = p.debts.filter(function (d) { return d.bal > 0; }).length;
    return [
      p.savings >= 1000 ? ['✓ ' + money(p.savings) + ' saved', true] : [money(p.savings) + ' of $1,000', false],
      n ? [plural(n, 'debt') + ' · ' + money(owed), false] : ['✓ No debt', true],
      [money(o.plan.safetyNet) + ' goal · ' + efMonths() + ' mo', false],
      retireOn() ? (function () { var acc = P.retirements || [], bal = acc.reduce(function (t, a) { return t + num(a.bal); }, 0); return [(P.retire === 'full' ? '\u2713 ' : '') + (acc.length > 1 ? plural(acc.length, 'account') : acc[0] && num(acc[0].pct) ? num(acc[0].pct) + '%' : retireMonthly() ? money(retireMonthly()) + '/mo' : P.retire === 'full' ? '15% or more' : 'Started') + (bal ? ' \u00b7 ' + money(bal) : ''), P.retire === 'full']; })() : ['Not yet', false],
      P.kids === 'yes' ? (P.college === 'yes' || P.college === 'some' ? [(P.college === 'yes' ? '\u2713 ' : '') + (num(P.collegeBal) ? money(num(P.collegeBal)) + ' saved' : 'Started') + (num(P.collegeMonthly) ? ' \u00b7 ' + money(num(P.collegeMonthly)) + '/mo' : ''), P.college === 'yes'] : ['Not yet', false]) : ['Skip for now', false],
      P.home === 'free' ? ['\u2713 Paid off', true] : P.home === 'mortgage' ? [num(P.mortgage) ? money(num(P.mortgage)) + ' left' + (payoffMonths() && payoffMonths() !== Infinity ? ' \u00b7 ' + F.addDays(today(), Math.round(payoffMonths() * 30.44)).getFullYear() : '') : 'Mortgage', false] : P.home === 'rent' ? ['Renting', false] : ['Later', false],
      giveAmt() ? ['Giving ' + money(giveAmt()) + ' a month', true] : P.givingPct ? ['Giving ' + P.givingPct + '%', true] : ['Someday', false]
    ];
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
        return '<div class="debt"><div class="top"><span>' + esc(g.name) + '<span class="tag">' + (g.by ? 'By ' + shortDate(F.fromIso(g.by)) : g.kind === 'fund' ? 'Plan-for-it' : 'Dream') + '</span></span><b>' + money(num(g.saved)) + ' of ' + money(g.amount) + '</b></div>' +
          '<div class="bar goalbar" style="flex:none"><i style="width:' + Math.max(1, num(g.saved) / g.amount * 100) + '%"></i></div>' +
          '<div style="font-size:13px;color:var(--muted)" data-gp="' + g.id + '">' + (done ? 'Fully funded. Go enjoy it.' : goalText(g, go2, o)) + '</div>' + slider +
          '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="goaldel" data-i="' + i + '">Remove</button></div>';
      }).join('') : '<p style="font-size:14px;padding:4px 0 2px">A trip, a car, a concert, a gift. Name it and we’ll give it a date.</p>') +
      (P.goals.length < 3 ? '<button type="button" class="outline" style="min-height:44px;margin:8px 0 12px;font-size:15px" data-a="goalnew">+ Add a goal</button>' : '') + '</div>';
    return goals;
  }
  // ---------- the activity calendar ----------
  var CAL_KINDS = { mdate: ['Money date', 'cal-mdate'], bill: ['Bill due', 'cal-bill'], payday: ['Payday', 'cal-pay'], checkin: ['Check-in', 'cal-check'], milestone: ['Milestone', 'cal-mile'], challenge: ['Challenge done', 'cal-ch'], plan: ['Plan finished', 'cal-plan'], start: ['Started my plan', 'cal-start'] };
  function calEvents(y, m) {
    var ev = {}, add = function (iso, kind, text) { if (!iso) return; var d = F.fromIso(iso); if (d.getFullYear() !== y || d.getMonth() !== m) return; (ev[iso] = ev[iso] || []).push([kind, text]); };
    // paydays: step from the next payday in both directions
    var step = F.FREQS[P.freq].days, anchor = F.fromIso(P.nextPay), first = new Date(y, m, 1), last = new Date(y, m + 1, 0);
    var kMin = Math.floor(F.daysBetween(anchor, first) / step) - 1, kMax = Math.ceil(F.daysBetween(anchor, last) / step) + 1;
    for (var k = kMin; k <= kMax; k++) add(F.isoDay(F.addDays(anchor, k * step)), 'payday', 'Payday' + (extraIncomes().length ? ' \u00b7 ' + (P.payLabel || 'You') : ''));
    extraIncomes().forEach(function (x) {
      var st2 = F.FREQS[x.freq || 'biweekly'].days, an2 = F.fromIso(x.nextPay || P.nextPay);
      for (var k2 = Math.floor(F.daysBetween(an2, first) / st2) - 1; k2 <= Math.ceil(F.daysBetween(an2, last) / st2) + 1; k2++) add(F.isoDay(F.addDays(an2, k2 * st2)), 'payday', 'Payday \u00b7 ' + (x.label || 'Spouse'));
    });
    (P.history || []).forEach(function (h) { add(h.date, 'checkin', h.payday ? 'Payday check-in' : 'Balance update'); });
    Object.keys(P.badges || {}).forEach(function (id) { var b = F.BADGES.filter(function (x) { return x.id === id; })[0]; if (id === 'plan') add(P.badges[id], 'start', 'Started my plan'); else if (b) add(P.badges[id], 'milestone', b.title); });
    (P.challenges || []).forEach(function (c) { if (c.ended === 'done') add(c.endedOn, 'challenge', F.challengeDef(c.id).title); });
    (P.plans || []).forEach(function (pl) { if (pl.ended === 'done') add(pl.endedOn, 'plan', F.planDef(pl.id).title); });
    if (itemized()) P.bills.forEach(function (b) { billDates(b, first, last).forEach(function (iso) { add(iso, 'bill', (b.name || 'Bill') + ' due \u00b7 ' + money(dueAmount(b))); }); });
    if (P.moneyDate && P.moneyDate.due) billDates({ due: P.moneyDate.due, rep: 'monthly' }, first, last).forEach(function (iso) { add(iso, 'mdate', 'Money date'); });
    (P.moneyDates || []).forEach(function (iso) { add(iso, 'checkin', 'Money date done'); });
    return ev;
  }
  function calendarCard() {
    var now = today(), cur = U.calMonth || [now.getFullYear(), now.getMonth()], y = cur[0], m = cur[1], ev = calEvents(y, m);
    var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate(), lead = first.getDay(), todayIso = F.isoDay(now), cells = '';
    for (var b = 0; b < lead; b++) cells += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var iso = F.isoDay(new Date(y, m, d)), e = ev[iso] || [], kinds = {}, isPay = e.some(function (x) { return x[0] === 'payday'; });
      e.forEach(function (x) { if (x[0] !== 'payday') kinds[x[0]] = 1; });
      var dots = Object.keys(kinds).slice(0, 3).map(function (k) { return '<i class="' + CAL_KINDS[k][1] + '"></i>'; }).join('');
      var label = d + ' ' + first.toLocaleDateString('en-US', { month: 'long' }) + (e.length ? ': ' + e.map(function (x) { return x[1]; }).join(', ') : '');
      cells += '<button type="button" class="cday' + (isPay ? ' pay' : '') + (iso === todayIso ? ' today' : '') + (U.calDay === iso ? ' sel' : '') + (iso > todayIso ? ' future' : '') + '" data-a="calday" data-v="' + iso + '" aria-label="' + esc(label) + '"><span>' + d + '</span><em>' + dots + '</em></button>';
    }
    var sel = U.calDay && ev[U.calDay] ? '<div class="calsel"><b>' + dayMonth(F.fromIso(U.calDay)) + '</b>' + ev[U.calDay].map(function (x) { return '<div><i class="' + CAL_KINDS[x[0]][1] + '"></i>' + esc(x[1]) + '</div>'; }).join('') + '</div>' : '';
    var count = Object.keys(ev).reduce(function (t, k) { return t + ev[k].filter(function (x) { return x[0] !== 'payday' && x[0] !== 'bill'; }).length; }, 0);
    var soon = upcomingBills(14);
    var mdn = mdNext(now); if (mdn && F.daysBetween(now, F.fromIso(mdn)) <= 14) soon.push({ iso: mdn, name: 'Money date', amt: null, md: true });
    soon = soon.sort(function (a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; }).slice(0, 5);
    var soonHtml = soon.length ? '<div class="soon"><div class="eyebrow">Coming up</div>' + soon.map(function (x) { return '<div class="row" style="padding:7px 0"><span><i class="' + (x.md ? 'cal-mdate' : 'cal-bill') + '"></i>' + esc(x.name) + '<small>' + dayMonth(F.fromIso(x.iso)) + '</small></span><b>' + (x.md ? '' : money(x.amt)) + '</b></div>'; }).join('') + '</div>'
      : (itemized() && !P.bills.some(function (b) { return b.due; }) ? '<button type="button" class="linkbtn" data-a="go" data-v="plan" style="align-self:flex-start;font-size:13px">Add due dates to your bills to see them here \u203a</button>' : '');
    return '<div class="card stack cal" style="padding:16px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><button type="button" class="back calnav" data-a="calmove" data-v="-1" aria-label="Previous month">\u2039</button>' +
      '<div style="text-align:center"><b>' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</b><small style="display:block;color:var(--faint);font-size:12px">' + (count ? plural(count, 'win') + ' this month' : 'Your activity shows up here') + '</small></div>' +
      '<button type="button" class="back calnav" data-a="calmove" data-v="1" aria-label="Next month">\u203a</button></div>' +
      '<div class="cgrid" aria-hidden="true">' + ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<span class="cdow">' + x + '</span>'; }).join('') + '</div>' +
      '<div class="cgrid">' + cells + '</div>' + sel +
      '<div class="clegend"><span><i class="cal-pay ring"></i>Payday</span><span><i class="cal-bill"></i>Bill due</span>' + (P.moneyDate && P.moneyDate.due ? '<span><i class="cal-mdate"></i>Money date</span>' : '') + '<span><i class="cal-check"></i>Check-in</span><span><i class="cal-mile"></i>Milestone</span><span><i class="cal-ch"></i>Challenge</span></div>' + soonHtml + '</div>';
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
    return rp === 'monthly' ? ordinal(d.getDate()) : rp === 'yearly' ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : rp === 'weekly' ? d.toLocaleDateString('en-US', { weekday: 'short' }) + 's' : rp === 'biweekly' ? 'Every 2 wks' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  // ---------- the monthly money date ----------
  var MD_STEPS = [
    ['Celebrate one win since last time', 'Even a small one. Say it out loud.', 'milestones', 'See my wins'],
    ['Look back at last month', 'Spent vs budget, line by line. No blame, just notice.', 'mdlast', 'Open last month'],
    ['Update your balances', 'Savings and every debt, so the countdown is real.', 'checkin', 'Update now'],
    ['Look ahead', 'Bills coming up, birthdays, trips, anything different next month.', 'home', 'See the calendar'],
    ['Adjust next month\u2019s budget', 'Move money where it\u2019s needed. Every dollar gets a job.', 'plan', 'Open the budget'],
    ['Check your goals', 'Still the right ones? On track for the date?', 'plans', 'See goals'],
    ['Pick one small thing to try', 'A challenge, a bill to cancel, one habit.', 'challenges', 'Pick a challenge']
  ];
  function mdNext(from) {
    if (!P.moneyDate || !P.moneyDate.due) return null;
    var b = { due: P.moneyDate.due, rep: 'monthly' }, n = nextDue(b, from || today());
    // Done a few days early? That one counts, so point to the month after.
    if (n && (P.moneyDates || []).some(function (x) { return x >= F.isoDay(F.addDays(F.fromIso(n), -7)); })) n = nextDue(b, F.addDays(F.fromIso(n), 1));
    return n;
  }
  function mdDueNow() {
    if (!P.moneyDate || !P.moneyDate.due) return false;
    var now = today(), last = billDates({ due: P.moneyDate.due, rep: 'monthly' }, F.addDays(now, -3), now).pop();
    return !!last && !(P.moneyDates || []).some(function (x) { return x >= last; });
  }
  function moneyDateCard() {
    var md = P.moneyDate, two = extraIncomes().length > 0 || P.household === 'shared';
    if (!md || !md.due || U.mdEdit) return '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="eyebrow">Monthly money date</div><b>' + (two ? 'Twenty minutes, once a month, together' : 'Twenty minutes, once a month, with yourself') + '</b>' +
      '<span style="font-size:14px;color:var(--muted)">Celebrate a win, look back, look ahead, and give next month\u2019s money a job. ' + (two ? 'Couples who do this fight less about money.' : 'It\u2019s the habit that keeps a plan alive.') + '</span>' +
      '<label class="field">Pick the first one<input type="date" data-mddate value="' + esc(md && md.due || F.isoDay(F.addDays(today(), 7))) + '"></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn" data-a="mdset">Set my money date</button>' + (U.mdEdit ? '<button type="button" class="sharebtn ghost" data-a="mdcancel">Cancel</button>' : '') + '</div></div>';
    var nx = mdNext(today()), due = mdDueNow();
    return '<div class="card stack mdcard' + (due ? ' due' : '') + '" style="padding:16px 18px;gap:10px"><div class="eyebrow">Monthly money date</div><b>' + (due ? 'It\u2019s money date day' : 'Next: ' + dayMonth(F.fromIso(nx))) + '</b>' +
      '<span style="font-size:14px;color:var(--muted)">Repeats on the ' + ordinal(F.fromIso(md.due).getDate()) + ' of every month.' + ((P.moneyDates || []).length ? ' ' + plural(P.moneyDates.length, 'money date') + ' done.' : '') + '</span>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="sharebtn" data-a="go" data-v="moneydate">' + (due ? 'Start it now' : 'Open the checklist') + '</button><button type="button" class="sharebtn ghost" data-a="mdics">Add to my calendar</button><button type="button" class="sharebtn ghost" data-a="mdchange">Change day</button></div></div>';
  }
  function mdIcs() {
    var d = F.fromIso(mdNext(today()) || P.moneyDate.due), day = F.isoDay(d).replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Find Me the Money//Money date//EN', 'BEGIN:VEVENT', 'UID:fmtm-moneydate-' + uid() + '@findmethemoney', 'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + day, 'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + Math.min(28, d.getDate()), 'SUMMARY:Money date (Find Me the Money)', 'DESCRIPTION:Twenty minutes: celebrate a win\\, look back\\, look ahead\\, give next month a plan.',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Money date today', 'TRIGGER:PT18H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  // ---------- the 30-second "find my money" ----------
  // the money to reclaim: debt payments you keep once the debt is gone, plus money that has no job yet
  function quickMath() {
    var q = P.quick || {}, pay = num(q.pay), exp = num(q.exp), debt = num(q.debt), min = num(q.min), noJob = Math.round(pay - exp - min);
    return { pay: pay, exp: exp, debt: debt, min: Math.round(min), noJob: noJob, total: Math.max(0, Math.round(min + Math.max(0, noJob))) };
  }
  // Pay that changes: plan on a safe number from recent paychecks; every check-in adds the real amount
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
      (!P.payVaries ? '' : '<div class="stack" style="gap:10px"><small style="color:var(--muted);font-size:14px">Tips, commission, gig work or changing hours? Add your last few paychecks. We’ll plan on a safe number, and every payday check-in adds the real one.</small>' +
        hist.map(function (x, i) { return '<div class="rowedit" style="grid-template-columns:minmax(0,1fr) auto"><input type="number" inputmode="decimal" aria-label="Paycheck ' + (i + 1) + '" data-f="x" data-list="payHist" data-i="' + i + '" data-k="amount" value="' + esc(x.amount) + '" placeholder="$ take-home"><button type="button" class="x" data-a="rm" data-v="payHist" data-i="' + i + '" aria-label="Remove paycheck ' + (i + 1) + '">×</button></div>'; }).join('') +
        (hist.length < 8 ? '<button type="button" class="chip" data-a="payhistadd" style="align-self:flex-start">+ Add a paycheck</button>' : '') +
        '<div data-live="paystats">' + payStatsHtml(st) + '</div></div>');
  }
  function payStatsHtml(st) {
    if (!st) return '<small style="color:var(--faint)">Add at least 2 to see your safe number. Until then, use a lower-than-usual paycheck above.</small>';
    return '<div class="field">Plan on<div class="seg" role="group" aria-label="Plan on" style="align-self:flex-start">' + [['low', 'My lowest: ' + money(st.low)], ['avg', 'My average: ' + money(st.avg)]].map(function (o) {
      var on = (P.payBasis || 'low') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="paybasis" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      '<small style="color:var(--muted);font-size:14px">' + ((P.payBasis || 'low') === 'low' ? 'Safest: your plan works even on a slow payday. Bigger checks go to your step at check-in.' : 'Your plan follows a typical payday. On slower ones, lean on your cushion or fun money.') + '</small>';
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
    if (P.quick.exp && (!num(P.basics) || P.basicsAuto)) { P.basics = String(P.quick.exp); P.basicsAuto = true; }
    // one starter line for debts; the debt step asks them to split it into each card and loan
    var ph = P.debts.filter(function (d) { return d.quick; })[0];
    if (P.quick.debt > 0) {
      var min = P.quick.min || Math.max(25, Math.round(P.quick.debt * 0.03));
      if (ph) { ph.bal = String(P.quick.debt); ph.orig = String(P.quick.debt); ph.min = String(min); }
      else if (!P.debts.length) P.debts.push({ id: uid(), name: 'My debts', bal: String(P.quick.debt), orig: String(P.quick.debt), min: String(min), apr: '', quick: true });
    } else if (ph) P.debts.splice(P.debts.indexOf(ph), 1);
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
    if (o.step === 1) return { kind: 'cushion', date: o.cushion, label: 'Step 1 · Starter Cushion full in' };
    if (o.step === 2) return { kind: 'debt-' + o.target.id, date: o.targetDone, label: 'Step 2 · ' + esc(o.target.name) + ' paid off in' };
    if (o.step === 3) return { kind: 'safety', date: o.safetyNet, label: 'Step 3 · Full Safety Net in' };
    return { kind: 'done', date: null, label: 'Step 4 · Future You' };
  }

  var V = {
    welcome: function () {
      var promises = ['Your budget, built for you. You just say yes.', 'A 7-step plan, from $1,000 saved to debt-free to generous', 'Private: your numbers stay on your phone unless you save them to your account'];
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:14px;margin-top:28px"><h1>Find the <span class="sunword">money</span> you didn’t know you had.</h1>' +
        '<p style="font-size:17px">Tell us what comes in and what goes out. We build your budget, count down to debt-free, and give your goals a real date.</p></div>' +
        '<div class="stack" style="gap:12px">' + promises.map(function (t) { return '<div class="check"><div class="dot">' + ICON.check('#FFFFFF') + '</div>' + t + '</div>'; }).join('') + '</div>' +
        (trashed() ? '<button type="button" class="choice best" data-a="untrash" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>Bring back your plan</b><span class="d">The one you deleted or replaced on ' + dayMonth(F.fromIso(trashed().at)) + '. Kept for 30 days.</span></div></button>' : '') +
        (cloudOn() && !S ? '<button type="button" class="choice" data-a="cjoinstart" style="text-align:left"><div class="ic">' + ICON.people + '</div><div><b>Joining your spouse\u2019s budget?</b><span class="d">Sign in and enter the invite code they sent you.</span></div></button>' : '') +
        (cloudOn() && !S ? '<button type="button" class="choice" data-a="go" data-v="account" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>Already have an account?</b><span class="d">Sign in and your plan comes right back.</span></div></button>' : '') +
        (standalone() ? '<button type="button" class="choice" data-a="go" data-v="restore" style="text-align:left"><div class="ic">' + ICON.file + '</div><div><b>Started in Safari?</b><span class="d">Bring your plan over in two taps.</span></div></button>' : '') +
        (storageOk ? '' : '<div class="note">' + ICON.info + '<span>This browser is blocking saved data (private browsing?), so your plan won’t be kept. Open it in a regular tab.</span></div>') +
        '<div class="push"><button type="button" class="primary" data-a="go" data-v="quick">Find my money \u00b7 30 seconds</button>' +
        '<button type="button" class="textbtn" data-a="go" data-v="restore">I have a backup file</button>' +
        '<div class="fine">Beta · an educational budgeting tool, not financial advice</div></div>';
    },

    path: function () {
      var anim = !(U.anim = U.anim || {}).path; U.anim.path = true;
      return back(P.quick ? 'claim' : 'welcome') + '<div class="stack" style="gap:8px;margin-top:4px"><div class="eyebrow">The path</div><h2>7 steps from stressed to free</h2>' +
        '<p>Everyone walks the same path, one step at a time. A few quick questions and we’ll show you where you are.</p></div>' +
        '<div class="card path' + (anim ? ' anim' : '') + '">' + F.STEPS.map(function (st, i) {
          return '<div class="pstep" style="--d:' + (0.25 + i * 0.42).toFixed(2) + 's"><div class="pdot"><b>' + (i + 1) + '</b></div><div><div class="t">' + st[0] + '</div><small>' + STEP_WHY[i] + '</small></div></div>';
        }).join('') + '</div>' +
        '<div class="push"><button type="button" class="primary" data-a="go" data-v="savings">Find my step</button></div>';
    },
    quick: function () {
      return back('welcome') + '<div class="stack" style="gap:8px;margin-top:4px"><div class="eyebrow">30 seconds \u00b7 rough numbers are fine</div><h2>Let\u2019s find your money</h2>' +
        '<p>Three quick numbers. We\u2019ll show you how much is slipping away each month.</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Take-home pay per paycheck', 'paycheck', { ph: '1000', min: 0 }) +
        '<div class="field" style="margin-top:-4px">How often?<div class="seg wrap" role="group" aria-label="How often you\u2019re paid">' + Object.keys(F.FREQS).map(function (k) {
          return '<button type="button" class="' + (P.freq === k ? 'on' : '') + '" aria-pressed="' + (P.freq === k) + '" data-a="freq" data-v="' + k + '">' + F.FREQS[k].label + '</button>'; }).join('') + '</div></div>' +
        (P.incomes && P.incomes.length ? incomeCards(true) : '<button type="button" class="linkbtn" data-a="incadd" style="align-self:flex-start;font-size:14px">+ Add a second paycheck (spouse or second job)</button>') +
        '<small class="qhint" data-live="qmonth">' + quickMonthNote() + '</small>' +
        field('Monthly expenses', 'qExp', { ph: '2400', min: 0 }) + '<small class="qhint">Everything you spend in a month: rent, bills, groceries, gas, eating out, shopping. Leave out debt payments.</small>' +
        '<div class="grid2">' + field('Total debt', 'qDebt', { ph: '0', min: 0 }) + field('Debt payments / mo', 'qMin', { ph: '0', min: 0 }) + '</div>' +
        '<small class="qhint">Credit cards, car, student loans, buy-now-pay-later. Not your home.</small></div>' +
        (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.err + '</p>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="quickgo">Show me</button></div>';
    },
    claim: function () {
      var q = quickMath(), short = q.noJob < 0;
      var rows = [];
      if (q.min > 0) rows.push(['Debt payments you\u2019d keep', money(q.min) + '/mo', (q.debt ? 'On ' + money(q.debt) + ' of debt. ' : '') + 'Pay it off, stay out of it, and this money is yours every month.']);
      if (q.noJob > 0) rows.push(['Money with no job yet', money(q.noJob) + '/mo', 'What\u2019s left after expenses and debt payments. Money without a plan usually disappears.']);
      if (short) rows.push(['Short each month', money(-q.noJob) + '/mo', 'Your expenses and payments are more than your pay. Let\u2019s close that gap.']);
      var big = short && q.total <= 0 ? money(-q.noJob) : money(q.total);
      return '<div class="eyebrow" style="margin-top:20px">' + (short && q.total <= 0 ? 'Here\u2019s the gap' : 'We found') + '</div>' +
        '<div class="lime pop"><div style="font-weight:600">Find Me the Money</div><div class="big" style="font-size:60px;margin-top:6px">' + big + '<span style="font-size:22px"> a month</span></div>' +
        '<div style="font-weight:600;font-size:18px">' + (short && q.total <= 0 ? 'to find, so every bill is covered' : 'That\u2019s ' + money(q.total * 12) + ' a year.') + '</div></div>' +
        (rows.length ? '<div class="card stack" style="padding:6px 18px">' + rows.map(function (r) { return '<div class="row" style="align-items:flex-start;padding:12px 0"><div><b>' + r[0] + '</b><small style="color:var(--muted);font-size:13px;margin-top:2px">' + r[2] + '</small></div><b style="color:#2A6B66">' + r[1] + '</b></div>'; }).join('') + '</div>' : '') +
        '<h2 style="text-align:center;margin-top:6px">' + (short && q.total <= 0 ? 'Want to find it?' : 'Want it back?') + '</h2>' +
        '<div class="push"><button type="button" class="primary" data-a="claimgo">' + (short && q.total <= 0 ? 'Find my money \u203a' : 'Reclaim my money \u203a') + '</button>' +
        '<button type="button" class="textbtn" data-a="claimshare">Share this</button><button type="button" class="textbtn" data-a="go" data-v="quick">Change my numbers</button></div>';
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
        (extraIncomes().length || otherMonthly() ? '<p data-live="together" style="font-size:14px;font-weight:600;color:#2A6B66">Together: about ' + money(monthlyIncome()) + ' a month after taxes.</p>' : '') + wizNext('pay');
    },
    basics: function () {
      var picks = [1500, 2000, 2500, 3000, 3500];
      return wizardHead('basics', 'Your monthly expenses', 'About how much do you spend in a month on everything but debt payments? Rent, bills, groceries, gas, eating out, shopping. A rough number is fine.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Each month, about', 'basics', { ph: '2000', min: 0 }) +
        '<div class="chips">' + picks.map(function (v) { var on = num(P.basics) === v; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="basicpick" data-v="' + v + '">' + money(v) + '</button>'; }).join('') + '</div>' +
        '<p style="font-size:13px">Leave out debt payments; those come next.</p></div>' +
        '<button type="button" class="textbtn" data-a="go" data-v="bills" style="align-self:center">Or build it category by category</button>' + wizNext('basics');
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
      var hasQuick = P.debts.some(function (d) { return d.quick; });
      return (hasQuick ? '' : '') + wizardHead('debts', 'What do you owe?', 'List everything except your home: credit cards, car loan, student loans, buy-now-pay-later, medical bills. Married? Include the debts you share or pay together. We line them up smallest to largest and knock them out one at a time. Your card and loan apps show each balance and minimum. Interest is optional.') +
        (hasQuick ? '<div class="note">' + ICON.info + '<span>We started with your total. <b>Split it into each card and loan</b> (rename this one, then + Add a debt) so the snowball can knock out the smallest first.</span></div>' : '') +
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
        (P.setupDone ? '' : '<div class="note">' + ICON.info + '<span><b>What’s an emergency fund?</b> Money set aside only for the unexpected: a car repair, a medical bill, a lost job. Not a vacation or Christmas. Step 1 is a starter cushion of $1,000. It’s small on purpose, so you can get there fast and start attacking debt.</span></div>') +
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
            '<div class="grid2">' + at('pct', '% of pay', '6') + at('monthly', 'Or $ per month', '200') + '</div>' + at('bal', 'Saved so far', '0') +
            '<div class="field">How does it get there?' + chips('retfrom', a.from || 'pre', [['pre', 'Taken out before payday'], ['post', 'I pay it from my take-home']]) + '</div>' +
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

    reveal: function () {
      var p = profile(), o = F.outlook(p, today()), pl = o.plan, rows = [];
      var head, sub;
      var short = pl.extra <= 0 && o.step <= 3 ? Math.ceil(-pl.extra) : -1;
      if (short >= 0) { head = short > 0 ? 'Let\u2019s find ' + money(short) : 'Let\u2019s find a little extra'; sub = short > 0 ? 'Your plan is ' + money(short) + ' short each paycheck. Find it and your countdown starts. We\u2019ll show you where to look.' : 'Every dollar has a job, with nothing left for your step yet. A little extra starts your countdown.'; }
      else if (o.target) {
        var gap = o.debtFree && o.debtFreeMins ? F.daysBetween(o.debtFree, o.debtFreeMins) : 0;
        head = o.debtFree ? 'Debt-free by ' + shortDate(o.debtFree) : 'Let\u2019s find more room';
        sub = o.debtFree ? (o.debtFreeMins ? (gap > 0 ? span(gap) + ' sooner than paying minimums.' : 'Every dollar has a job.') : 'Minimum payments alone would never get you there.') : 'Right now your paycheck doesn\u2019t cover everything. We\u2019ll find the money together.';
        if (o.step === 1 && o.cushion && short < 0) rows.push(['First: your $1,000 cushion', shortDate(o.cushion)]);
        if (o.targetDone) rows.push([o.state.debts.length > 1 ? 'Then ' + esc(o.target.name) + ' is paid off' : 'Then you\u2019re debt-free', longDate(o.targetDone)]);
      } else {
        head = 'No debt to pay off'; sub = 'Nice. Your plan starts with savings.';
        if (o.cushion && o.step === 1) rows.push(['Your $1,000 cushion', shortDate(o.cushion)]);
        if (o.safetyNet) rows.push(['Full safety net (' + efMonths() + ' months)', shortDate(o.safetyNet)]);
      }
      return '<div class="eyebrow" style="margin-top:20px">Your countdown</div>' +
        '<div class="lime pop"><div style="font-weight:600">Find Me the Money</div><div style="font-family:var(--display);font-size:38px;font-weight:500;line-height:1.1;margin-top:8px">' + head + '</div><div style="font-weight:600;margin-top:8px">' + sub + '</div></div>' +
        '<div class="card stack" style="padding:18px 18px 16px;gap:12px"><div class="eyebrow">Where you are on the path</div>' + journey(o.step, { key: 'reveal', from: 0, progress: stepProgress(o) }) +
        '<div><b>Step ' + Math.min(o.step, 7) + ': ' + F.STEPS[Math.min(o.step, 7) - 1][0] + '</b><small style="display:block;color:var(--muted);font-size:14px;margin-top:2px">' + STEP_WHY[Math.min(o.step, 7) - 1] + '</small></div>' +
        '<div class="glance">' + pathGlance(o, p).map(function (r, i) { return '<div class="row' + (i + 1 === o.step ? ' here' : '') + '"><span><span class="gn">' + (i + 1) + '</span>' + F.STEPS[i][0] + '</span><span class="gs' + (r[1] ? ' ok' : '') + '">' + r[0] + '</span></div>'; }).join('') + '</div></div>' +
        (rows.length && short < 0 ? '<div class="card">' + rows.map(function (r) { return '<div class="row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' : '') +
        '<div class="note">' + ICON.info + '<span>An estimate from your answers. It gets sharper as you go.</span></div>' +
        '<div class="push"><button type="button" class="primary" data-a="finish">Start my plan</button><button type="button" class="textbtn" data-a="go" data-v="savings">Change my answers</button></div>';
    },
    install: function () {
      var ios = isIOS();
      return back(U.wizReturn || 'home') + '<div class="stack" style="gap:6px"><h2>Add it to your Home Screen</h2><p>' + (ios ? 'On iPhone, Safari can clear saved data from websites you haven\u2019t opened in about a week. Apps on your Home Screen are safe, and they open like a real app.' : 'It opens like a real app and is one tap away on payday.') + '</p></div>' +
        (ios && !standalone() && P.setupDone && cloudOn() ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>' + (S ? 'Your plan comes with you' : 'First: save your plan with your email') + '</b><span style="font-size:14px;color:var(--muted)">' + (S ? 'Open the Home Screen app and sign in with ' + esc(S.email || 'your email') + '. Your plan will be there.' : 'The Home Screen app starts empty. Save your plan first, then sign in there with the same email.') + '</span>' + (S ? '' : '<button type="button" class="outline" data-a="edit" data-v="account">Save my plan</button>') + '</div>' : '') +
        (ios && !standalone() && P.setupDone && !cloudOn() ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>First: bring your plan with you</b><span style="font-size:14px;color:var(--muted)">The Home Screen app starts empty. Copy your plan first, then open the app and tap <b>Started in Safari?</b> to paste it.</span>' +
          '<button type="button" class="outline" data-a="copyplan">' + (U.copiedPlan ? '\u2713 Plan copied. Now add it to your Home Screen' : 'Copy my plan') + '</button>' + (U.copiedPlan && U.planCode ? '<div class="stack" style="gap:6px"><small style="color:#2A6B66;font-weight:600">\u2713 Copied. This text is your whole plan:</small><textarea class="plancode" readonly rows="2" aria-label="Your copied plan">' + esc(U.planCode) + '</textarea><small style="color:var(--muted)">Now open the other app and tap <b>Started in Safari?</b> (or Settings \u2192 Bring a plan here), then <b>Paste my copied plan</b>. Nothing is deleted here.</small></div>' : '') + '</div>' : '') +
        guideBox(ios ? 'ios' : 'android') +
        '<p style="font-size:14px">Your data stays in the browser you use now, so add it from this same browser.</p>' +
        '<div class="push"><button type="button" class="primary" data-a="installdone">Done</button><button type="button" class="outline" data-a="backup">Save a backup file too</button></div>';
    },
    habit: function () {
      return back('planday') + '<div class="stack" style="gap:6px"><div class="eyebrow">Day 7 \u00b7 Make it a payday habit</div><h2>Two minutes, every payday</h2><p>Set it up once and payday reminds you.</p></div>' +
        '<button type="button" class="choice best" data-a="ics"><div class="ic">' + ICON.flame + '</div><div><b>Add payday check-ins to my calendar</b><span class="d">A reminder every payday at 9 a.m., on your schedule.</span></div></button>' +
        (standalone() ? '' : '<button type="button" class="choice" data-a="edit" data-v="install"><div class="ic">' + ICON.home + '</div><div><b>Add the app to my Home Screen</b><span class="d">One tap away, and your plan stays safe.</span></div></button>') +
        '<button type="button" class="choice" data-a="backup"><div class="ic">' + ICON.file + '</div><div><b>Save a backup file</b><span class="d">In case you ever switch phones.</span></div></button>' +
        '<div class="push"><button type="button" class="outline" data-a="go" data-v="planday">Back to day 7</button></div>';
    },

    import: function () {
      return back(U.wizReturn || 'home') + '<div class="stack" style="gap:6px"><div class="eyebrow">Optional · about a minute</div><h2>See where your money went</h2>' +
        '<p>Download last month’s transactions from your bank or card as a CSV file, then pick it here. The file is read on this phone and never uploaded.</p></div>' +
        '<label class="choice best" style="cursor:pointer"><div class="ic">' + ICON.file + '</div><div><b>Choose a CSV file</b><span class="d">From your bank’s website or app: Activity → Download → CSV.</span></div>' +
        '<input type="file" accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel" data-file="csv" class="sr"></label>' +
        (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '') +
        '<div class="eyebrow" style="margin-top:6px">How to get the file \u00b7 30 seconds</div>' +
        guideBox('csv') +
        '<button type="button" class="textbtn" data-a="help" style="align-self:flex-start">' + (U.showHelp ? 'Hide tips' : 'Still stuck? Tips for common banks') + '</button>' +
        (U.showHelp ? '<div class="card stack" style="padding:14px 18px;font-size:14px;color:var(--muted);gap:10px">' +
          '<span><b>No download button in your bank\u2019s app?</b> Most banks only offer it on their <b>website</b>. In Safari, log in to your bank, tap <b>aA</b> in the address bar, then <b>Request Desktop Website</b>.</span>' +
          '<span><b>Look for</b> Download, Export, or a \u2913 icon on your account activity. The format might be called CSV, Spreadsheet or Excel. Pick the last 30 days.</span>' +
          '<span><b>On a computer?</b> Download it there, then AirDrop or email it to yourself and save it to Files. Import it here on your phone, where your plan lives.</span>' +
          '<span><b>Apple Card:</b> Wallet \u2192 Apple Card \u2192 Card Balance \u2192 a monthly statement \u2192 Export Transactions \u2192 CSV.</span>' +
          '<span><b>Still can\u2019t find it?</b> Search your bank\u2019s help for \u201cexport transactions CSV.\u201d Use the account you spend from most. You can add another file later.</span></div>' : '') +
        (P.setupDone ? '<button type="button" class="outline" data-a="spendnew">No file? Add your spending by hand</button>' : '') +
        '<div class="push"><button type="button" class="textbtn" data-a="go" data-v="' + (U.wizReturn || 'home') + '">Skip for now</button></div>';
    },
    sort: function () {
      var q = spending().unsorted, done = U.sortHist.length, total = q.length + done, cur = q[0];
      if (!cur) return V.found();
      return back(P.setupDone ? 'home' : 'import') + '<div class="stack" style="gap:6px"><div class="eyebrow">Sort your spending · ' + (done + 1) + ' of ' + total + '</div><h2>Need or want?</h2>' +
        '<p>You decide. Swipe right for a need, left for a want. Every purchase at this store gets sorted the same way' + (cur.count > 1 ? ', unless you sort them one by one below' : '') + '.</p></div>' +
        '<div class="bar" style="flex:none"><i style="width:' + (done / total * 100) + '%"></i></div>' +
        '<div class="swipe-wrap">' + (q[1] ? '<div class="swipe-next" aria-hidden="true"></div>' : '') +
        '<div class="swipe-card" data-swipe="1"><span class="swipe-hint want" aria-hidden="true">Want</span><span class="swipe-hint need" aria-hidden="true">Need</span>' +
        '<span style="font-family:var(--display);font-size:30px;font-weight:500;letter-spacing:-.02em;line-height:1.15">' + esc(cur.m) + '</span>' +
        '<span class="big" style="font-size:52px">' + money2(cur.total) + '</span>' +
        '<span style="color:var(--muted);font-size:15px">' + plural(cur.count, 'purchase') + '</span></div></div>' +
        (function () {
          var open = U.sortOpen === cur.m, ids = cur.tx.slice().sort(function (a, b) { return P.tx[a].date < P.tx[b].date ? 1 : -1; });
          var html = '<button type="button" class="textbtn" data-a="sortpeek" data-m="' + esc(cur.m) + '" aria-expanded="' + open + '" style="align-self:center">' + (open ? 'Hide the purchases' : cur.count > 1 ? 'See the ' + cur.count + ' purchases' : 'See the purchase') + '</button>';
          if (!open) return html;
          return html + '<div class="card peek">' + ids.map(function (i) {
            var tx = P.tx[i], k = tx.b, raw = tx.desc && tx.desc.toUpperCase() !== cur.m.toUpperCase() ? '<small class="raw">' + esc(tx.desc) + '</small>' : '';
            return '<div class="row txrow"><div style="min-width:0">' + dayMonth(F.fromIso(tx.date)) + ' · <b>' + money2(tx.amount) + '</b>' + raw + '</div>' +
              (cur.count > 1 ? '<div class="seg mini" role="group" aria-label="' + dayMonth(F.fromIso(tx.date)) + ': need or want">' + ['need', 'want'].map(function (v) {
                return '<button type="button" class="' + (k === v ? 'on ' + v : '') + '" aria-pressed="' + (k === v) + '" data-a="ttog" data-i="' + i + '" data-v="' + v + '">' + (v === 'need' ? 'Need' : 'Want') + '</button>'; }).join('') + '</div>' : '') + '</div>';
          }).join('') + '</div>';
        })() +
        '<div class="sortbtns"><button type="button" class="sortbtn want" data-a="pick" data-v="want">← Want</button><button type="button" class="sortbtn need" data-a="pick" data-v="need">Need →</button></div>' +
        '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap">' +
        '<button type="button" class="textbtn" data-a="pick" data-v="skip">Not spending (a transfer or payment)</button>' +
        (done ? '<button type="button" class="textbtn" data-a="undo">Undo ' + esc(U.sortHist[done - 1]) + '</button>' : '') + '</div>';
    },
    found: function () {
      var s = spending(), wants = Math.round(s.monthly.want / 10) * 10;
      if (U.limit == null) U.limit = Math.round(wants * 2 / 3 / 10) * 10;
      var found = Math.max(0, wants - U.limit);
      var top = s.stores.filter(function (x) { return x.split.want > 0; }).sort(function (a, b) { return b.split.want - a.split.want; }).slice(0, 4);
      return '<div class="eyebrow" style="margin-top:12px">Based on ' + s.days + ' days of spending</div>' +
        '<div class="lime pop"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600">Find Me the Money</span><span style="font-size:12px;font-weight:600">found you</span></div>' +
        '<div class="big" style="font-size:64px;margin-top:10px" data-live="found">' + money(found) + '</div><div style="font-weight:600;font-size:17px" data-live="foundyr">a month for your plan · ' + money(found * 12) + ' a year</div></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px">' +
        '<p style="font-size:14px;color:var(--ink)">This is money you were already spending on wants. Pick a fun-money limit you can live with, and the rest goes to work.</p>' +
        '<div class="math"><div class="row"><span>You spend on wants</span><b>' + money(wants) + '/mo</b></div>' +
        '<div class="row"><span>You keep for fun</span><b data-live="limit">− ' + money(U.limit) + '/mo</b></div>' +
        '<div class="row total"><span>Freed up for your plan</span><b data-live="found2">' + money(found) + '/mo</b></div></div>' +
        '<input type="range" min="0" max="' + Math.max(10, wants) + '" step="10" value="' + U.limit + '" data-range="limit" aria-label="Fun-money limit per month">' +
        '<div class="row" style="border:0;padding:0;font-size:13px;color:var(--faint)"><span>Keep less, free more</span><span>Keep it all</span></div>' +
        '<p data-live="impact" style="font-size:14px;font-weight:600;color:#2A6B66">' + foundImpact(U.limit, wants) + '</p></div>' +
        (top.length ? '<div class="card stack" style="padding:14px 18px;gap:2px"><div class="eyebrow" style="margin-bottom:4px">Where your wants go</div>' + top.map(function (x) {
          return '<div class="row" style="padding:8px 0"><span>' + esc(x.m) + '</span><b>' + money(x.split.want * s.scale) + '/mo</b></div>'; }).join('') +
          '<p style="font-size:13px;margin-top:6px">You don’t have to cut any one thing. Spend your fun money however you like, just within the limit.</p></div>' : '') +
        '<button type="button" class="textbtn" data-a="go" data-v="spend" style="align-self:center">See needs vs wants for every store</button>' +
        '<div class="push"><button type="button" class="primary" data-a="setfun">Use this limit</button></div>';
    },
    spend: function () {
      var s = spending(), f = U.filter, t = s.t, all = t.need + t.want + t.unsorted || 1;
      var shown = s.stores.filter(function (x) { return x.bucket !== 'skip' && (f === 'all' || x.split[f] > 0); }).sort(function (a, b) { return b.total - a.total; });
      var seg = function (label, cur, attrs) {
        return '<div class="seg mini" role="group" aria-label="' + label + ': need or want">' + ['need', 'want'].map(function (v) {
          return '<button type="button" class="' + (cur === v ? 'on ' + v : '') + '" aria-pressed="' + (cur === v) + '" ' + attrs + ' data-v="' + v + '">' + (v === 'need' ? 'Need' : 'Want') + '</button>'; }).join('') + '</div>';
      };
      var row = function (k, label) { return '<div class="row" style="padding:8px 0"><div><span class="key c-' + (k === 'unsorted' ? 'uns' : k) + '"></span>' + label + '</div><b>' + money(t[k] * s.scale) + '/mo <span style="font-weight:400;color:var(--faint)">' + Math.round(t[k] / all * 100) + '%</span></b></div>'; };
      return back(P.setupDone ? 'home' : 'found') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + s.days + ' days · ' + P.tx.length + ' transactions</div><h2>Needs vs wants</h2><p>Sorted by you. Change any store with its toggle, or tap a store to sort each purchase.</p></div>' +
        (s.unsorted.length ? '<button type="button" class="primary" data-a="sortstart">Sort ' + plural(s.unsorted.length, 'store') + ' left</button>' : '') +
        '<div class="card stack" style="padding:18px;gap:8px">' + splitHtml(t) + row('need', 'Needs') + row('want', 'Wants') + (t.unsorted ? row('unsorted', 'Not sorted yet') : '') + '</div>' +
        '<div class="seg" role="group" aria-label="Show" style="align-self:flex-start">' + [['all', 'All'], ['need', 'Needs'], ['want', 'Wants']].map(function (o) {
          return '<button type="button" class="' + (f === o[0] ? 'on' : '') + '" aria-pressed="' + (f === o[0]) + '" data-a="filter" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        '<div class="card">' + (shown.length ? shown.map(function (x) {
          var open = U.openStore === x.m;
          var sub = plural(x.count, 'purchase') + ' · ' + money2(x.total) + (x.bucket === 'mixed' ? ' · <span class="mixed">Mixed: ' + money(x.split.need) + ' need, ' + money(x.split.want) + ' want</span>' : '');
          var head = '<div class="row" style="padding:10px 0' + (open ? ';border-bottom:0' : '') + '"><button type="button" class="storebtn" data-a="storeopen" data-m="' + esc(x.m) + '" aria-expanded="' + open + '">' +
            '<span class="chev' + (open ? ' open' : '') + '" aria-hidden="true">\u203a</span><span style="min-width:0">' + esc(x.m) + '<small>' + sub + '</small></span></button>' +
            seg(esc(x.m), x.bucket, 'data-a="tog" data-m="' + esc(x.m) + '"') + '</div>';
          if (!open) return head;
          return head + '<div class="txlist">' + x.tx.slice().sort(function (a, b) { return P.tx[a].date < P.tx[b].date ? 1 : -1; }).map(function (i) {
            var tx = P.tx[i], k = bucketOf(tx);
            return '<div class="row txrow"><div>' + dayMonth(F.fromIso(tx.date)) + '<small>' + money2(tx.amount) + '</small></div>' + seg(esc(x.m) + ', ' + dayMonth(F.fromIso(tx.date)), k, 'data-a="ttog" data-i="' + i + '"') + '</div>';
          }).join('') + '</div>';
        }).join('') : '<p style="padding:12px 0">Nothing here yet.</p>') + '</div>' +
        '<button type="button" class="outline" data-a="go" data-v="import">Import another file</button>';
    },

    plan: function () {
      var p = profile(), o = F.outlook(p, today()), pl = o.plan, step = o.step;
      var last = step === 1 ? 'Starter Cushion' : step === 2 ? 'Snowball → ' + esc(o.target.name) : step === 3 ? 'Full Safety Net' : 'Future You (investing)';
      var mo = !!U.planMonth, k = mo ? pl.ppm : 1;
      var rows = budgetRows(pl, mo), found = foundNow();
      var hero = { label: last, amount: Math.max(0, pl.extra) * k, sub: found && pl.extra > 0 ? 'Includes the ' + money(found / (mo ? 1 : pl.ppm)) + (mo ? ' a month' : ' a paycheck') + ' you found' : '' };
      return (P.setupDone ? '' : back('import')) + '<div class="eyebrow" style="margin-top:8px">Your Payday Plan · Step ' + step + ' of 7</div><h2>' + (mo ? 'Every month: ' + money(p.paycheck * k) : 'Every paycheck: ' + money(p.paycheck)) + '. Every dollar has a job.</h2>' +
        '<p style="font-size:14px">' + (step === 1 ? 'First, $1,000 for emergencies, so a flat tire doesn’t go on a credit card. Then every spare dollar attacks debt.' : step === 2 ? 'Your cushion is in place. Every spare dollar goes to your smallest debt first.' : step === 3 ? 'No debt to attack. Every spare dollar builds ' + efMonths() + ' months of expenses.' : 'Debt-free with a full safety net. Time to invest 15% and give generously.') + '</p>' +
        '<div class="seg" role="group" aria-label="Show the plan" style="align-self:flex-start">' + [['check', 'Per paycheck'], ['month', 'Per month']].map(function (o) {
          var on = (o[0] === 'month') === mo; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="plview" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        (mo ? '<p style="font-size:13px;margin-top:-6px">' + (pl.ppm === 1 ? 'You’re paid monthly, so this matches your paycheck.' : 'We do the math for you. A few months a year bring an extra paycheck, a nice bonus for your plan.') + '</p>' : '') +
        (P.setupDone ? spendSummary() : '') +
        '<p style="font-size:13px;margin-top:-4px">Tap any amount to change it.</p>' +
        '<div class="card budget">' + BUDGET_SECTIONS.map(function (sec) {
          var mine = rows.filter(function (r) { return r.cat === sec[0]; }); if (!mine.length && sec[0] === 'give') return '';
          var tot = mine.reduce(function (t, r) { return t + r.amount; }, 0);
          return '<div class="bhead"><span><span class="key c-' + sec[0] + '"></span>' + sec[1] + '</span><span>' + money(tot) + '</span></div>' + mine.map(function (r) { return budgetLine(r, mo); }).join('') +
            (sec[0] === 'want' ? wantsNote(mo, pl.ppm) : '') + budgetAddRow(sec[0], mo);
        }).join('') + (hero.amount > 0 ? '<div class="row hero-row" style="padding-block:10px"><span style="min-width:0;font-weight:600">' + hero.label + (hero.sub ? '<small>' + hero.sub + '</small>' : '') + '</span><b>' + money(hero.amount) + '</b></div>' : '') + '</div>' +
        '<div class="left' + (pl.tight ? ' tight' : '') + '"><span>Left to assign</span><span>' + (pl.tight ? '–' + money(-pl.extra * k) : '$0 ✓') + '</span></div>' +
        (P.setupDone ? whatIfHtml(o, true) : '') +
        (pl.tight ? '<p style="font-size:14px;color:var(--warn)">This paycheck doesn’t cover everything yet. Lower your fun money or a flexible bill, or look for money in your bank file.</p>' : '') +
        (P.setupDone ? nwCard() + snow0(o, step) : '') + (P.setupDone ? '<button type="button" class="textbtn" data-a="go" data-v="settings" style="align-self:center">Debts, savings and other details</button>'
          : '<div class="push"><button type="button" class="primary" data-a="finish">Start my plan</button></div>');
    },

    goal: function () {
      var f = U.form, presets = [['Vacation', 2400, 'dream'], ['A car', 5000, 'dream'], ['Concert tickets', 350, 'dream'], ['Christmas gifts', 600, 'fund', 6], ['Car repairs', 800, 'fund', 6], ['Something else', '', 'dream']];
      U.presets = presets;
      return back(U.back) + '<div class="stack" style="gap:6px"><div class="eyebrow">Your goals</div><h2>What are you saving for?</h2><p>A trip, a car, a concert, a gift. Name it and we’ll give it a real date.</p></div>' +
        '<div class="chips">' + presets.map(function (p, i) { var on = f.name === p[0]; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="preset" data-i="' + i + '">' + p[0] + '</button>'; }).join('') + '</div>' +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' +
        '<label class="field">Goal name<input id="g-name" type="text" data-g="name" maxlength="40" value="' + esc(f.name) + '" placeholder="Hawaii trip" autocomplete="off"></label>' +
        '<label class="field">How much?<input type="number" inputmode="decimal" data-g="amount" min="1" value="' + esc(f.amount) + '" placeholder="2400"></label>' +
        '<div class="field">What kind of goal?<div class="seg" role="group" aria-label="Goal type" style="align-self:flex-start">' + [['dream', 'Dream'], ['fund', 'Plan-for-it']].map(function (k) {
          return '<button type="button" class="' + (f.kind === k[0] ? 'on' : '') + '" aria-pressed="' + (f.kind === k[0]) + '" data-a="gkind" data-v="' + k[0] + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
        '<p style="font-size:13px">' + (f.kind === 'fund' ? 'Gifts, car repairs, registration, yearly bills: costs you know are coming that would otherwise land on a credit card. A little goes aside every paycheck, in every step.' : 'Trips, concerts, a new car. While you pay off debt, dreams wait their turn, then your snowball money funds them. Want a small one sooner? Use the slider on your home screen to see the tradeoff.') + '</p>' +
        '<div class="field">When do you want it?<div class="seg wrap" role="group" aria-label="When" style="align-self:flex-start">' + (f.kind === 'fund' ? [[3, 'In 3 months'], [6, 'In 6 months'], [12, 'In 12 months'], ['date', 'Pick a date']] : [['asap', 'When my plan allows'], ['date', 'Pick a date']]).map(function (m) {
          var on = f.when === 'date' ? m[0] === 'date' : f.kind === 'fund' ? f.months === m[0] : m[0] === 'asap';
          return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="gmonths" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div></div>' +
        (f.when === 'date' ? '<label class="field">Date<input type="date" data-g="by" min="' + F.isoDay(F.addDays(today(), 1)) + '" value="' + esc(f.by || '') + '"></label><p data-live="gper" style="font-size:14px;font-weight:600;color:#2A6B66">' + goalDateNote(f) + '</p>' : '') +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') + '</div>' +
        '<div class="push"><button type="button" class="primary" data-a="goalsave">Save my goal</button><button type="button" class="textbtn" data-a="go" data-v="' + U.next + '">Cancel</button></div>';
    },

    home: function () {
      var p = profile(), o = F.outlook(p, today()), pl = o.plan, step = o.step, h = headline(o), now = today();
      var due = !!F.paydayFor(P.nextPay, P.freq, now), next = F.fromIso(p.nextPay), sv = F.streakView(P.streak, P.nextPay, P.freq, now);
      var cdDays = h.date ? Math.max(0, F.daysBetween(now, h.date)) : null;
      var cd = cdDays != null ? parts(cdDays) : null;
      var prog = '';
      if (step === 1) prog = [p.savings / F.CUSHION, money(p.savings) + ' saved', money(F.CUSHION) + ' goal'];
      else if (step === 2) { var t = o.target, d0 = P.debts.filter(function (d) { return d.id === t.id; })[0], orig = Math.max(num(d0.orig), t.bal); prog = [(orig - t.bal) / orig, money(orig - t.bal) + ' paid', money(t.bal) + ' left']; }
      else if (step === 3) prog = [Math.min(1, p.savings / pl.safetyNet), money(p.savings) + ' saved', money(pl.safetyNet) + ' goal (' + efMonths() + ' months)'];
      var vs = '';
      if (o.debtFree && o.debtFreeMins && step <= 2) {
        var nxt = step === 2 ? o.state.debts.filter(function (d) { return d.bal > 0 && d.id !== o.target.id; }).sort(function (a, b) { return a.bal - b.bal; })[0] : null;
        var lead = step === 1 ? 'Then debt-free ' + shortDate(o.debtFree) + ', ' : (nxt ? 'Next up: ' + esc(nxt.name) + '. ' : 'Last one! ') + 'Debt-free ' + shortDate(o.debtFree) + ', ';
        var gap = F.daysBetween(o.debtFree, o.debtFreeMins);
        vs = gap > 0 ? lead + '<b style="color:var(--sun-soft)">' + span(gap) + ' sooner</b> than paying minimums' : lead.replace(/, $/, '.');
      } else if (o.debtFree && !o.debtFreeMins && step <= 2) vs = 'Debt-free ' + shortDate(o.debtFree) + '. Minimum payments alone would never get you there.';
      var where = step === 1 ? 'Starter Cushion' : step === 2 ? esc(o.target.name) : step === 3 ? 'Full Safety Net' : 'investing';
      var pdIso = due ? F.paydayFor(P.nextPay, P.freq, now) : null;
      var paydayStrip = '<div class="pstrip"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>' + (due ? (F.daysBetween(F.fromIso(pdIso), now) > 0 ? 'Check-in time' : 'It\u2019s payday!') : 'Next payday') + '</b><span>' + dayMonth(due ? F.fromIso(pdIso) : next) + '</span></div>' +
        '<div class="ps-sub">' + money(p.paycheck) + ' in \u00b7 ' + money(Math.max(0, pl.extra)) + ' to ' + where + '</div>' +
        '<button type="button" class="' + (due ? 'sunbtn' : 'ghostbtn') + '" data-a="checkin">' + (due ? (sv.count ? 'Check in \u00b7 make it ' + (sv.count + 1) + ' in a row' : 'Check in and start my streak') : 'Update my balances') + '</button></div>';
      var short = step <= 3 && pl.extra <= 0 ? Math.ceil(-pl.extra) : -1;
      if (short >= 0) return homeTop(toast) + '<div class="dark stack" style="gap:14px;border-radius:24px;padding:22px"><div class="sub" style="font-weight:500">Step ' + step + ' \u00b7 ' + F.STEPS[step - 1][0] + '</div>' +
        '<div style="font-family:var(--display);font-size:34px;line-height:1.1;color:var(--sun-soft)">' + (short > 0 ? 'You\u2019re ' + money(short) + ' short each paycheck.' : 'Every dollar has a job. None is left for your step yet.') + '</div>' +
        '<div style="font-size:15px;color:rgba(255,255,255,.88)">Find ' + (short > 0 ? 'it' : 'a little extra') + ' and your countdown starts. Pick one:</div>' +
        '<div class="stack" style="gap:8px">' + [!funSet() ? ['edit', 'basics', 'Lower my monthly expenses'] : ['edit', 'fun', 'Lower my fun money'], ['go', 'plan', 'Trim a bill in my budget'], ['go', 'import', 'Find it in my bank file']].map(function (x) { return '<button type="button" class="ghostbtn" data-a="' + x[0] + '" data-v="' + x[1] + '">' + x[2] + '</button>'; }).join('') + '</div>' + paydayStrip + '</div>' +
        homeRest(o, step, snow0(o, step));
      var hero = '<div class="dark stack" style="gap:14px;border-radius:24px;padding:22px"><div class="sub" style="font-weight:500">' + h.label + '</div>' +
        (cd ? '<div class="cd" style="grid-template-columns:repeat(' + cd.length + ',minmax(0,1fr))">' + cd.map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div><div style="font-size:15px">on ' + longDate(h.date) + '</div>'
          : step >= 4 ? '<div style="font-family:var(--display);font-size:36px;line-height:1.1;color:var(--sun-soft)">Debt-free with a full safety net.</div>'
          : '<div style="font-family:var(--display);font-size:26px;color:var(--sun-soft)">Your plan needs a little more room. Check your Payday Plan.</div>') +
        (prog ? '<div class="pbar"><i style="width:' + Math.max(1, prog[0] * 100) + '%"></i></div><div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.72)"><span>' + prog[1] + '</span><span>' + prog[2] + '</span></div>' : '') +
        (vs ? '<div style="font-size:14px;color:rgba(255,255,255,.88);border-top:1px solid rgba(255,255,255,.18);padding-top:12px">' + vs + '</div>' : '') + paydayStrip + '</div>';
      var toast = U.toast ? (U.toast[2] ? '<div class="sunburst" aria-hidden="true"></div>' : '') + '<div class="toast pop' + (U.toast[2] ? ' win' : '') + '" role="status"><b>' + U.toast[0] + '</b>' + U.toast[1] + '</div>' : '';
      var snow = snow0(o, step);
      var nw = nwCard();
      return homeTop(toast) + hero + homeRest(o, step, snow, nw);
    },

    checkin: function () {
      var o = F.outlook(profile(), today());
      return back('home') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + (F.paydayFor(P.nextPay, P.freq, today()) ? 'Payday check-in' : 'Balance update') + ' \u00b7 2 minutes</div><h2>What do your balances say today?</h2>' +
        '<p>Already filled in with last time\u2019s numbers. Check your bank and card apps and change only what\u2019s different. We\u2019ll count your wins.</p></div>' +
        (P.debts.length ? '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Debts</b>' + P.debts.map(function (d, i) {
          var ppm = o.plan.ppm, bal = num(d.bal), isT = o.target && o.target.id === d.id && o.step === 2;
          var quick = bal > 0 ? '<div class="chips">' + (isT ? '<button type="button" class="chip" data-a="quick" data-l="debts" data-k="bal" data-i="' + i + '" data-v="' + Math.max(0, Math.round(bal - num(d.min) / ppm - Math.max(0, o.plan.extra))) + '">Paid the plan</button>' : '') +
            '<button type="button" class="chip" data-a="quick" data-l="debts" data-k="bal" data-i="' + i + '" data-v="' + Math.max(0, Math.round(bal - num(d.min) / ppm)) + '">Paid the minimum</button>' +
            '<button type="button" class="chip" data-a="quick" data-l="debts" data-k="bal" data-i="' + i + '" data-v="0">Paid it off!</button></div>' : '';
          return '<label class="field">' + esc(d.name) + ' balance<input type="number" inputmode="decimal" data-f="x" data-list="debts" data-i="' + i + '" data-k="bal" value="' + esc(d.bal) + '"></label>' + quick; }).join('') + '</div>' : '') +
        (P.payVaries ? '<div class="card stack" style="padding:16px 18px;gap:10px"><b>This paycheck</b><label class="field">What landed in your account?<input type="number" inputmode="decimal" data-thispay value="' + esc(U.thisPay || '') + '" placeholder="' + esc(P.paycheck) + '"></label><span data-live="thispay" style="font-size:14px;color:var(--muted)">Your plan uses ' + money(num(P.paycheck)) + '.</span></div>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Savings</b>' + field('Emergency savings', 'savings') +
        ((o.step === 1 || o.step === 3) && o.plan.extra > 0 ? '<div class="chips"><button type="button" class="chip" data-a="quick" data-k="savings" data-v="' + Math.round(num(P.savings) + o.plan.extra) + '">Added the plan amount (' + money(o.plan.extra) + ')</button></div>' : '') +
        P.goals.map(function (g, i) { return '<label class="field">Saved for ' + esc(g.name) + '<input type="number" inputmode="decimal" data-f="x" data-list="goals" data-i="' + i + '" data-k="saved" value="' + esc(g.saved || 0) + '"></label>'; }).join('') + '</div>' +
        '<p style="font-size:13px">Paycheck different this time, or a bill changed? <button type="button" class="textbtn" style="min-height:0;padding:0;font-size:13px;text-decoration:underline" data-a="go" data-v="settings">Edit your numbers</button></p>' +
        '<div class="push"><button type="button" class="primary" data-a="checkdone">Update my countdown</button></div>' + (o ? '' : '');
    },

    wins: function () {
      var r = U.result, w = r.w, t = P.totals, s = r.streak, v = F.streakView(P.streak, P.nextPay, P.freq, today());
      var title = r.paid.length ? esc(r.paid[0]) + ': PAID OFF' : r.goal ? esc(r.goal) + ': FULLY FUNDED' : r.daysBack > 0 ? plural(r.daysBack, 'day') + ' stolen back' : r.daysBack === 0 && (w.debtPaid > 0 || w.saved > 0) ? 'Right on plan.' : w.debtPaid > 0 || w.saved > 0 ? 'Progress, on the record.' : 'Checked in.';
      var win = r.paid.length || r.goal || r.daysBack > 0 || w.debtPaid > 0 || w.saved > 0;
      var msg = !r.counted ? (r.repeat ? 'You already checked in for this payday, so your numbers are updated and your streak stays the same.' : 'Balances updated. Payday check-ins (the ones that build your streak) open the day before payday.')
        : s.milestone ? MILESTONE_TEXT[s.milestone]
        : s.broke ? 'A new streak starts today. Your best is ' + v.best + '. Let\u2019s beat it.'
        : s.usedGrace ? 'You missed a payday, so your grace pass covered it. Streak saved.'
        : s.earnedGrace ? 'You earned a grace pass. It covers one missed payday.'
        : 'See you next payday, ' + dayMonth(F.fromIso(P.nextPay)) + '.';
      var savedStat = w.saved >= 0 ? stat(money(w.saved), 'saved') : stat('\u2013' + money(-w.saved), 'from savings');
      return (win ? '<div class="sunburst" aria-hidden="true"></div>' : '') + '<div class="eyebrow" style="margin-top:12px">' + (r.counted ? 'Payday check-in' : 'Balance update') + ' \u00b7 ' + dayMonth(today()) + '</div>' +
        '<div class="lime pop"><div style="font-weight:600">' + (r.counted ? 'This payday' : 'Since your last update') + '</div>' +
        '<div style="font-family:var(--display);font-size:30px;font-weight:500;line-height:1.15;margin-top:4px">' + title + '</div>' +
        '<div class="grid3 stats" style="margin-top:16px">' + stat(money(w.debtPaid), 'debt paid') + savedStat + stat((r.daysBack > 0 ? '+' : '') + r.daysBack, 'days stolen back') + '</div></div>' +
        (r.paid.length ? '<button type="button" class="primary" data-a="sharepaid">' + ICON.share + ' Share this payoff</button>' : r.goal ? '<button type="button" class="primary" data-a="sharegoal">' + ICON.share + ' Share this goal</button>' : '') +
        (r.paid.length > 1 ? '<p style="text-align:center">Also paid off: ' + r.paid.slice(1).map(esc).join(', ') + '. The snowball grows.</p>' : r.paid.length ? '<p style="text-align:center">That payment now rolls into your next debt. The snowball grows.</p>' : '') +
        (r.daysBack < 0 ? '<div class="note">' + ICON.info + '<span>Your date slipped ' + plural(-r.daysBack, 'day') + '. It happens. Your Payday Plan shows what to adjust before next time.</span></div>' : '') +
        (w.saved < 0 ? '<div class="note">' + ICON.info + '<span>You used some savings. That\u2019s exactly what it\u2019s there for. You\u2019ll rebuild it.</span></div>' : '') +
        '<div class="card" style="padding:16px 18px;display:flex;gap:12px;align-items:center"><span class="flame' + (v.count ? ' lit' : '') + '">' + ICON.flame + '</span><div>' +
        '<div style="font-family:var(--display);font-weight:600;font-size:19px">' + (v.count ? plural(v.count, 'payday') + ' in a row' : 'Payday streak') + (P.streak.grace ? ' <span class="tag">1 grace pass</span>' : '') + '</div><div style="font-size:14px;color:var(--muted)">' + msg + '</div>' +
        (v.count >= 2 ? '<button type="button" class="textbtn" style="min-height:32px;padding:0;margin-top:4px" data-a="sharestreak">' + ICON.share + ' Share my streak</button>' : '') + '</div></div>' +
        celebration(9) +
        '<div class="card"><div class="row"><span style="font-weight:600">Since you started</span><span></span></div>' +
        '<div class="row"><span style="color:var(--muted)">Debt paid</span><b>' + money(t.debtPaid) + '</b></div><div class="row"><span style="color:var(--muted)">Money saved</span><b>' + money(t.saved) + '</b></div>' +
        '<div class="row"><span style="color:var(--muted)">Days stolen back</span><b style="color:var(--sun-ink)">' + (t.daysBack > 0 ? '+' + t.daysBack : t.daysBack) + '</b></div></div>' +
        '<div class="push"><button type="button" class="' + (r.paid.length || r.goal ? 'outline' : 'primary') + '" data-a="winsdone">Back to my plan</button></div>';
    },

    challenges: function () {
      var f = facts(), now = today(), active = P.challenges.filter(function (c) { return !c.ended; }), activeIds = active.map(function (c) { return c.id; });
      var done = P.challenges.filter(function (c) { return c.ended; }).slice(-8).reverse();
      var card = function (c) {
        var st = F.challengeStatus(c, now, f), d = st.def, act = ACTION[d.id] || '';
        var body = '';
        if (d.kind === 'daily') body = '<div class="dots" role="group" aria-label="Days">' + st.dots.map(function (x, i) {
          var tap = true;
          return tap ? '<button type="button" class="dot' + (x.done ? ' on' : '') + (x.today ? ' today' : '') + '" aria-pressed="' + x.done + '" aria-label="Day ' + (i + 1) + (x.done ? ', done' : '') + '" data-a="chdot" data-v="' + c.uid + '" data-d="' + x.iso + '">' + (x.done ? ICON.check('#fff', 12) : i + 1) + '</button>'
            : '<span class="dot' + (x.done ? ' on' : '') + (x.future ? ' future' : '') + '" aria-label="Day ' + (i + 1) + (x.done ? ', done' : '') + '">' + (x.done ? ICON.check('#fff', 12) : i + 1) + '</span>';
        }).join('') + '</div>' + (st.canMark ? '<button type="button" class="primary" style="min-height:48px" data-a="chdot" data-v="' + c.uid + '" data-d="' + F.isoDay(now) + '">I did it today</button>' : st.marked && st.canMark ? '<p style="font-size:13px">Today\u2019s checked. Tap any other day above to check it off.</p>' : '');
        else if (d.kind === 'count') body = st.canMark ? '<button type="button" class="primary" style="min-height:48px" data-a="chplus" data-v="' + c.uid + '">+1 \u00b7 ' + act + '</button>' : '';
        else if (d.kind === 'clean') body = U.slip === c.uid ? '<div class="grid2"><button type="button" class="outline" data-a="chslipno">Never mind</button><button type="button" class="primary danger" data-a="chslip" data-v="' + c.uid + '">Yes, it happened</button></div>'
          : '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><button type="button" class="textbtn" style="min-height:36px;padding:0" data-a="chslipask" data-v="' + c.uid + '">' + act + '</button>' +
            '<button type="button" class="sharebtn" data-a="chcomplete" data-v="' + c.uid + '">' + ICON.check('#2A6B66', 14) + ' I made it</button></div>';
        else if (d.kind === 'earn') {
          var log = c.log || [];
          body = ('<div class="rowedit" style="grid-template-columns:minmax(0,1fr) 96px auto"><input type="text" aria-label="What you earned it from" placeholder="From what?" data-earnnote="' + c.uid + '"><input type="number" inputmode="decimal" aria-label="Amount earned" placeholder="$0" data-earnamt="' + c.uid + '"><button type="button" class="primary" style="min-height:46px;width:auto" data-a="earnadd" data-v="' + c.uid + '">Add</button></div>') +
            (log.length ? '<div>' + log.slice(-3).reverse().map(function (x) { return '<div class="row" style="padding:6px 0;font-size:14px"><span>' + esc(x.note || 'Earned') + ' <span style="color:var(--faint)">' + dayMonth(F.fromIso(x.date)) + '</span></span><b style="color:var(--sun-ink)">+' + money(x.amt) + '</b></div>'; }).join('') + '</div>' : '') +
            partnerHtml(d) + '<p style="font-size:12px;color:var(--faint)">Side income is usually taxable, and many apps don\u2019t hold anything back. Set some aside for taxes and ask a tax pro how much.</p>';
        }
        else if (d.kind === 'amount') body = '<div class="rowedit" style="grid-template-columns:minmax(0,1fr) auto"><input type="number" inputmode="decimal" aria-label="Amount found" placeholder="$ found" data-chamt="' + c.uid + '"><button type="button" class="primary" style="min-height:46px;width:auto" data-a="chadd" data-v="' + c.uid + '">Add</button></div>';
        else if (d.kind === 'cushion') body = '<button type="button" class="outline" style="min-height:46px" data-a="checkin">Update my savings</button>';
        else body = st.canMark ? '<button type="button" class="primary" style="min-height:48px" data-a="chonce" data-v="' + c.uid + '">' + act + '</button>' : '';
        return '<div class="card stack" style="padding:16px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="tag" style="margin:0">' + d.tag + '</span><span style="font-size:13px;color:var(--faint)">' + plural(st.daysLeft, 'day') + ' left</span></div>' +
          '<h3>' + d.title + '</h3><div class="bar goalbar" style="flex:none"><i style="width:' + Math.max(2, st.progress * 100) + '%"></i></div><div style="font-size:14px;color:var(--muted)">' + st.label + '</div>' + body +
          '<button type="button" class="textbtn" style="align-self:flex-end;min-height:30px;padding:0;font-size:13px" data-a="chquit" data-v="' + c.uid + '">Stop this challenge</button></div>';
      };
      var pick = F.CHALLENGES.filter(function (d) { return activeIds.indexOf(d.id) < 0; });
      var startCard = function (d) {
        return '<div class="card stack" style="padding:14px 18px;gap:6px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>' + d.title + '</b><span class="tag" style="margin:0">' + (d.kind === 'count' ? d.target + ' in ' + d.days + ' days' : d.days + ' days') + '</span></div>' +
          '<span style="font-size:14px;color:var(--muted)">' + d.blurb + '</span>' +
          '<button type="button" class="outline" style="min-height:42px;font-size:15px;margin-top:4px" data-a="chstart" data-v="' + d.id + '"' + (active.length >= 3 ? ' disabled' : '') + '>Start</button></div>';
      };

      var allDone = P.challenges.filter(function (c) { return c.ended === 'done'; }).reverse();
      var tab = U.chTab || 'suggested';
      var inTab = function (d) { return tab === 'bills' ? d.tag === 'Bills' || d.tag === 'Debt' : tab === 'earn' ? d.tag === 'Earn' || d.tag === 'Income' : d.tag === tab; };
      var easy = pick.slice().sort(function (a, b) { return (a.days || 99) - (b.days || 99); });
      var list = tab === 'suggested' ? (U.chAllSug ? easy : easy.slice(0, 3)) : pick.filter(inTab);
      var body = tab === 'done'
        ? (allDone.length ? '<div class="card">' + allDone.map(function (c) {
            var d = F.challengeDef(c.id);
            return '<div class="row"><div style="min-width:0">' + d.title + '<small>Completed ' + dayMonth(F.fromIso(c.endedOn)) + (c.note ? ' · ' + esc(c.note) : '') + '</small></div>' +
              '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px" data-a="sharech" data-v="' + c.uid + '">' + ICON.share + ' Share</button></div>';
          }).join('') + '</div>' : '<div class="note">' + ICON.info + '<span>Finished challenges land here, each with a card to share.</span></div>')
        : (tab === 'earn' ? '<p style="font-size:14px">Cutting has a limit. Earning doesn’t.</p>' : '') + (list.length ? list.map(startCard).join('') : '<div class="note">' + ICON.info + '<span>You’re running every challenge in this group.</span></div>') +
          (tab === 'suggested' && !U.chAllSug && easy.length > 3 ? '<button type="button" class="outline" style="min-height:44px;font-size:15px" data-a="challsug">Show all ' + easy.length + '</button>' : '');
      return '<div style="margin-top:8px"><div class="eyebrow">Small, winnable sprints</div><h2>Challenges</h2><p style="margin-top:6px">Pick up to 3 at a time. Finish one and you get a card to share.</p></div>' + (U.pitw ? pitwHtml() : '') + celebration(1, 'challenge') +
        (active.length ? active.map(card).join('') : '') +
        (active.length >= 3 ? '<p style="margin-top:10px">You’re running 3. Finish or stop one to start another.</p>' : '') +
        tabChips('chtab', tab, [['suggested', 'Suggested'], ['Food', 'Food'], ['Spending', 'Spending'], ['bills', 'Bills & debt'], ['Savings', 'Saving'], ['earn', 'Earn more'], ['done', 'Completed' + (allDone.length ? ' (' + allDone.length + ')' : '')]]) + body;
    },

    moneydate: function () {
      var two = extraIncomes().length > 0 || P.household === 'shared', ck = U.mdChecks || {}, done = Object.keys(ck).filter(function (k) { return ck[k]; }).length;
      return back(U.mdBack || 'plans') + '<div class="stack" style="gap:6px"><div class="eyebrow">Monthly money date \u00b7 about 20 minutes</div><h2>' + (two ? 'Your money date' : 'Your money date') + '</h2>' +
        '<p>' + (two ? 'Sit down together, phones on this screen. Both voices count, nobody gets blamed, and you end with something fun.' : 'Grab a coffee and go top to bottom. This is how a plan keeps working.') + '</p></div>' +
        '<div class="card" style="padding:6px 18px">' + MD_STEPS.map(function (x, i) {
          var on = !!ck[i];
          return '<div class="row mdrow" style="align-items:flex-start;padding:12px 0"><button type="button" class="mdcheck' + (on ? ' on' : '') + '" data-a="mdcheck" data-i="' + i + '" aria-pressed="' + on + '" aria-label="' + esc(x[0]) + '">' + (on ? ICON.check('#fff', 14) : '') + '</button>' +
            '<div style="flex:1;min-width:0"><b>' + x[0] + '</b><small style="display:block;color:var(--muted);font-size:13px;margin-top:2px">' + x[1] + '</small><button type="button" class="linkbtn" data-a="mdgo" data-v="' + x[2] + '" style="font-size:13px;margin-top:4px">' + x[3] + ' \u203a</button></div></div>';
        }).join('') + '</div>' +
        '<div class="push"><button type="button" class="primary" data-a="mddone">' + (done >= MD_STEPS.length ? 'Money date done' : 'Mark money date done') + '</button></div>';
    },
    plans: function () {
      var now = today(), list = F.PLANS.map(function (def) {
        var run = P.plans.filter(function (p) { return p.id === def.id && !p.ended; })[0];
        if (!run) {
          var finished = P.plans.filter(function (p) { return p.id === def.id && p.ended === 'done'; }).length;
          return '<div class="card stack" style="padding:16px 18px;gap:8px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>' + def.title + '</h3><span class="tag" style="margin:0">' + def.days.length + ' days</span></div>' +
            '<span style="font-size:14px;color:var(--muted)">' + def.blurb + '</span>' + (finished ? '<span style="font-size:13px;color:var(--sun-ink)">Finished ' + plural(finished, 'time') + '</span>' : '') +
            '<button type="button" class="primary" style="min-height:48px;margin-top:4px" data-a="planstart" data-v="' + def.id + '">' + (finished ? 'Start again' : 'Start the plan') + '</button></div>';
        }
        var st = F.planStatus(run, now);
        return '<div class="card stack" style="padding:16px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>' + def.title + '</h3><span style="font-size:13px;color:var(--faint)">' + st.doneCount + ' of ' + def.days.length + '</span></div>' +
          '<div class="bar goalbar" style="flex:none"><i style="width:' + Math.max(2, st.progress * 100) + '%"></i></div>' +
          '<div>' + st.days.map(function (d, i) {
            var when = d.done ? 'Done' : i === st.next ? 'Up next' : 'Open';
            var inner = '<span class="dot' + (d.done ? ' on' : '') + (d.open && !d.done ? ' today' : '') + (!d.open ? ' future' : '') + '" aria-hidden="true">' + (d.done ? ICON.check('#fff', 12) : i + 1) + '</span><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">Day ' + (i + 1) + ': ' + d.title + '</span><small style="color:var(--faint)">' + when + '</small></span>';
            return d.open ? '<button type="button" class="planrow" data-a="planopen" data-v="' + run.uid + '" data-i="' + i + '">' + inner + '<span aria-hidden="true">\u203a</span></button>' : '<div class="planrow locked">' + inner + '</div>';
          }).join('') + '</div></div>';
      }).join('');
      return '<div style="margin-top:8px"><h2>Plans & Goals</h2><p style="margin-top:6px">Give your money a destination, and build the habit one small step a day.</p></div>' +
        (U.planToast ? (function () { var t = U.planToast; U.planToast = null; return '<div class="toast pop" role="status"><b>' + ICON.check('#2A6B66', 16) + ' ' + t + '</b></div>'; })() : '') +
        celebration(2, ['plan', 'unlock']) + goalsCard() + calendarCard() + moneyDateCard() + (function () { var o = F.outlook(profile(), today()); return pathCard(o, o.step); })() +
        '<div class="stack" style="gap:6px;margin-top:6px"><div class="eyebrow">Reading plans</div><p style="font-size:14px">A short read and one action each day. A new day opens every morning, and you can always catch up.</p></div>' + list + '<p class="fine">More plans are coming.</p>';
    },
    planday: function () {
      var run = P.plans.filter(function (p) { return p.uid === U.planUid; })[0], def = F.planDef(run.id), i = U.planDay, d = def.days[i], done = (run.done || []).indexOf(i) >= 0;
      return back('plans') + '<div class="stack" style="gap:6px"><div class="eyebrow">Day ' + (i + 1) + ' of ' + def.days.length + ' \u00b7 ' + def.title + '</div><h2>' + d.title + '</h2></div>' +
        '<div class="card stack" style="padding:18px;gap:12px;font-size:17px;line-height:1.6">' + d.read.map(function (para) { return '<p style="color:var(--ink)">' + para + '</p>'; }).join('') + '</div>' +
        '<div class="eyebrow" style="margin-top:6px">Today\u2019s one action</div>' +
        '<button type="button" class="outline" data-a="planact" data-v="' + d.action[1] + '">' + d.action[0] + ' \u203a</button>' +
        '<div class="push">' + (done ? '<div class="left"><span>Day ' + (i + 1) + ' complete</span><span>\u2713</span></div><button type="button" class="textbtn" data-a="go" data-v="plans">Back to the plan</button>'
          : '<button type="button" class="primary" data-a="planmark">Mark day ' + (i + 1) + ' complete</button>') + '</div>';
    },

    spendadd: function () {
      var f = U.form || {}, lines = spendLines(), last = f.key;
      var chips = function (cat, title) {
        var mine = lines.filter(function (l) { return l.cat === cat; }); if (!mine.length) return '';
        return '<div class="field">' + title + '<div class="chips" style="margin-top:8px">' + mine.map(function (l) {
          var on = last === l.key; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="spendcat" data-v="' + l.key + '">' + esc(l.label) + '</button>'; }).join('') + '</div></div>';
      };
      return back(U.spendBack || 'plan') + '<div class="stack" style="gap:6px"><div class="eyebrow">5 seconds</div><h2>Add spending</h2><p>What did you spend, and on what? It counts against that line in your budget.</p></div>' +
        (U.spendSaved ? '<div class="toast pop" role="status"><b>' + ICON.check('#2A6B66', 16) + ' ' + U.spendSaved + '</b></div>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:14px"><label class="field">Amount<input class="bigamt" type="number" inputmode="decimal" min="0" step="any" data-g="amount" value="' + esc(f.amount || '') + '" placeholder="$0.00" autocomplete="off"></label>' +
        '<label class="field">Where? (optional)<input type="text" data-g="note" value="' + esc(f.note || '') + '" placeholder="Like Kroger, Shell or Target" autocomplete="off"></label>' +
        chips('need', 'Needs') + chips('want', 'Wants') + chips('other', 'Not in my budget') +
        '<label class="field">Date<input type="date" data-g="date" value="' + esc(f.date || F.isoDay(today())) + '"></label></div>' +
        (U.formErr ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.formErr + '</p>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="spendsave">Save</button><button type="button" class="outline" data-a="spendsave" data-v="again">Save &amp; add another</button></div>';
    },
    assign: function () {
      var q = unassignedStores(), done = (U.assignHist || []).length, total = q.length + done, cur = q[0], lines = spendLines();
      if (!cur) return '<div class="stack" style="gap:8px;margin-top:20px"><div class="eyebrow">All set</div><h2>Every store has a home in your budget</h2><p>Your budget lines now count what you spent in ' + monthName(curSpendMonth()) + '. New files go to the same lines automatically.</p></div>' +
        '<div class="push"><button type="button" class="primary" data-a="go" data-v="plan">See my budget</button></div>';
      var tile = function (l) { return '<button type="button" class="bucket ' + l.cat + '" data-bucket="' + l.key + '" data-a="assignpick" data-v="' + l.key + '">' + esc(l.label) + '</button>'; };
      var group = function (cat, title) { var m = lines.filter(function (l) { return l.cat === cat; }); return m.length ? '<div class="eyebrow" style="margin-top:4px">' + title + '</div><div class="buckets">' + m.map(tile).join('') + '</div>' : ''; };
      var b = P.sorted[cur.m];
      return back(U.assignBack || 'plan') + '<div class="stack" style="gap:6px"><div class="eyebrow">Put it in your budget \u00b7 ' + (done + 1) + ' of ' + total + '</div><h2>Where does this go?</h2>' +
        '<p>Drag the store onto a budget line, or tap the line. We\u2019ll remember it for next time.</p></div>' +
        '<div class="bar" style="flex:none"><i style="width:' + (done / total * 100) + '%"></i></div>' +
        '<div class="dragcard" data-drag="1"><b>' + esc(cur.m) + '</b><span>' + money2(cur.total) + ' \u00b7 ' + plural(cur.count, 'purchase') + '</span>' + (b === 'need' || b === 'want' ? '<i class="tag ' + b + '">' + (b === 'need' ? 'Need' : 'Want') + '</i>' : '') + '</div>' +
        group('need', 'Needs') + group('want', 'Wants') + group('other', 'Not in my budget') +
        '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap">' + (done ? '<button type="button" class="textbtn" data-a="assignundo">Undo ' + esc(U.assignHist[done - 1]) + '</button>' : '') +
        '<button type="button" class="textbtn" data-a="go" data-v="' + (U.assignBack || 'plan') + '">Finish later</button></div>';
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
    community: function () {
      var url = CONFIG.communityUrl, joined = P.communityJoined, latest = Object.keys(P.badges).filter(function (k) { return F.BADGES.some(function (b) { return b.id === k; }); }).sort(function (a, b) { return P.badges[a] < P.badges[b] ? -1 : 1; }).pop();
      var free = [
        ['Payday check-ins, together', 'Every payday, a thread where everyone shares how it went. Streaks are easier with company.'],
        ['Live challenges', 'Run the Cushion Sprint or a No-Spend Weekend with a group, and cheer each other on.'],
        ['Ask anything', 'Stuck on a bill, a debt or a tough month? Ask people walking the same path.']
      ];
      var coach = [
        ['Live coaching calls', 'Group calls with Brad, a certified financial coach. Bring your questions, leave with a next step.'],
        ['A coach looks at your budget', 'Post your plan and get real feedback on what to change.'],
        ['An accountability group', 'A small group that checks in with you, so you keep going on the hard months.'],
        ['One-on-one coaching', 'A private session each month to work through your plan together. Limited spots.']
      ];
      var list = function (l) { return '<div class="card stack" style="padding:6px 18px">' + l.map(function (x) { return '<div class="row" style="align-items:flex-start;padding:12px 0"><div><b>' + x[0] + '</b><small style="color:var(--muted);font-size:14px;margin-top:3px;display:block">' + x[1] + '</small></div></div>'; }).join('') + '</div>'; };
      var curl = CONFIG.coachingUrl || url;
      return '<div style="margin-top:8px"><div class="eyebrow">The Find Me the Money community</div><h2>You don’t have to do this alone</h2>' +
        '<p style="margin-top:6px">People who stick with a plan usually have someone in their corner.</p></div>' +
        '<div class="stack" style="gap:10px"><div class="eyebrow">Free community</div><h3>Walk the 7 steps with others</h3>' + list(free) +
        (url ? '<a class="primary" style="text-decoration:none;display:grid;place-items:center" href="' + esc(url) + '" target="_blank" rel="noopener" data-a="joincommunity">' + (joined ? 'Open the community' : 'Join the FREE community') + '</a>'
          : '<button type="button" class="primary" disabled>Community opening soon</button>') + '</div>' +
        '<div class="stack coachsec" style="gap:10px;margin-top:10px"><div class="eyebrow">Coaching</div><h3>Get a coach in your corner</h3><p style="font-size:15px">For when you want a plan built with you, not just for you.</p>' + list(coach) +
        (curl ? '<a class="outline" style="text-decoration:none;display:grid;place-items:center;color:var(--ink)" href="' + esc(curl) + '" target="_blank" rel="noopener" data-a="coaching">Learn about coaching</a>' : '') + '</div>' +
        (latest && url ? '<button type="button" class="outline" data-a="sharebadge" data-v="' + latest + '">Post your latest win</button>' : '') +
        (CONFIG.youtubeUrl ? '<a class="card ytcard" href="' + esc(CONFIG.youtubeUrl) + '" target="_blank" rel="noopener" data-a="youtube"><span class="yt-ic" aria-hidden="true">\u25B6</span><span><b>Watch on YouTube</b><small>Short videos: find your money, payday wins, debt-free date reveals</small></span><span aria-hidden="true">\u203a</span></a>' : '') +
        '<div class="note">' + ICON.info + '<span>The community lives on Skool. Your budget stays private. Only what you choose to post is shared.</span></div>' +
        // your wins, right under the community: challenges and milestones
        '<div id="wins" class="stack" style="gap:10px;margin-top:14px;scroll-margin-top:16px"><div class="eyebrow">Your wins</div>' + (P.setupDone ? streakCard() : '') +
        '<div class="seg wins-seg" role="group" aria-label="Wins" style="align-self:flex-start">' + [['challenges', 'Challenges'], ['milestones', 'Milestones']].map(function (o) {
          var on = (U.winsView || 'challenges') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="winsview" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
        (U.winsView === 'milestones' ? V.milestones() : V.challenges());
    },
    milestones: function () {
      var f = facts(), earned = F.BADGES.filter(function (b) { return P.badges[b.id]; }), locked = F.BADGES.filter(function (b) { return !P.badges[b.id]; });
      var o = F.outlook(profile(), today()), st = Math.min(o.step, 7), mt = U.msTab || 'next';
      var grp = function (id) { return /^(plan|sorted|checkin-1|plan-1|storyteller)$/.test(id) ? 'start' : /^(saved-|cushion|safety-net|goal-)/.test(id) ? 'saving' : /^(payoff-|paid-|debt-free)/.test(id) ? 'debt' : /^streak-/.test(id) ? 'streak' : /^days-/.test(id) ? 'days' : 'more'; };
      var nextUp = locked.slice().sort(function (a, b) { var pa = F.badgeProgress(a, f), pb = F.badgeProgress(b, f); return (pb ? pb.ratio : 0) - (pa ? pa.ratio : 0); });
      var shown = mt === 'next' ? (U.msAll ? nextUp : nextUp.slice(0, 3)) : locked.filter(function (b) { return grp(b.id) === mt; });
      var pathCard = '<div class="card stack" style="padding:16px 18px;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><div class="eyebrow">Your path</div><b>Step ' + st + ': ' + F.STEPS[st - 1][0] + '</b></div>' +
        '<button type="button" class="sharebtn" data-a="sharestep" data-v="">' + ICON.share + ' Share</button></div>' + journey(st, { small: true, progress: stepProgress(o) }) + '</div>';
      return '<div style="margin-top:8px"><div class="eyebrow">' + earned.length + ' of ' + F.BADGES.length + ' earned</div><h2>Milestones</h2><p style="margin-top:6px">Little wins along the way. Tap one to share it.</p></div>' + celebration(9, 'badge') + pathCard +
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
      var cal = { weekly: 1, biweekly: 1, semimonthly: 1, monthly: 1 }[P.freq];
      return back('home') + '<h2>Settings</h2>' + accountCard() +
        '<div class="card">' + [['pay', 'Paycheck and payday'], [itemized() ? 'bills' : 'basics', 'Bills and basics'], ['bills', 'List bills one by one'], ['debts', 'Debts'], ['savings', 'Emergency savings'], ['safety', 'Safety net size'], ['give', 'Giving'], ['retire', 'Retirement'], ['kids', 'Kids'], ['house', 'Your home'], ['fun', 'Fun money'], ['import', 'Import a bank file'], ['install', 'Add to Home Screen']].map(function (x) {
          return '<button type="button" class="row linkrow" data-a="edit" data-v="' + x[0] + '"><span>' + x[1] + '</span><span aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
        (cal ? '<button type="button" class="outline" data-a="ics">Add payday check-ins to my calendar</button>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:10px"><b>Your data</b><p style="font-size:14px">' + (S ? 'Your plan is on this phone and saved to your account.' : 'Everything is saved only on this phone. Sign in at the top, or save a backup file now and then, in case you switch phones or clear your browser.') + '</p>' +
        '<button type="button" class="outline" data-a="copyplan">' + (U.copiedPlan ? '\u2713 Plan copied' : 'Copy my plan (to move it to the Home Screen app)') + '</button>' + (U.copiedPlan && U.planCode ? '<div class="stack" style="gap:6px"><small style="color:#2A6B66;font-weight:600">\u2713 Copied. This text is your whole plan:</small><textarea class="plancode" readonly rows="2" aria-label="Your copied plan">' + esc(U.planCode) + '</textarea><small style="color:var(--muted)">Now open the other app and tap <b>Started in Safari?</b> (or Settings \u2192 Bring a plan here), then <b>Paste my copied plan</b>. Nothing is deleted here.</small></div>' : '') +
        '<button type="button" class="outline" data-a="backup">Save a backup file</button><button type="button" class="outline" data-a="go" data-v="restore">Bring a plan here</button>' +
        (U.confirmDelete ? '<div class="note" role="alert" style="border-color:rgba(138,58,30,.4)"><span>This erases your plan from this phone' + (S ? ' and signs you out. The copy in your account stays, so you can sign in again to get it back.' : '. It can’t be undone unless you have a backup.') + '</span></div><div class="grid2"><button type="button" class="outline" data-a="delno">Keep it</button><button type="button" class="primary danger" data-a="delyes">Erase everything</button></div>'
          : '<button type="button" class="textbtn" style="color:var(--warn)" data-a="del">Delete everything</button>') + '</div>' +
        (CONFIG.feedbackUrl ? '<a class="outline" style="text-decoration:none;color:var(--ink)" href="' + esc(CONFIG.feedbackUrl) + '" target="_blank" rel="noopener">Send feedback</a>' : '') +
        '<a class="textbtn" style="text-align:center;text-decoration:none;display:block;padding-top:12px" href="privacy.html">Privacy</a>' +
        '<p class="fine">An educational budgeting tool, not financial, tax or investment advice. Beta.</p>';
    },
    saveinstall: function () {
      var ios = isIOS();
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:10px;margin-top:18px"><div class="eyebrow">' + (S ? '\u2713 Saved \u00b7 one more thing' : 'One more thing') + '</div><h2>Put it on your Home Screen</h2>' +
        '<p>It opens like an app, one tap away on payday.' + (S ? ' When you open it from there, sign in with the same email and your plan will be waiting.' : '') + '</p></div>' +
        guideBox(ios ? 'ios' : 'android') +
        '<div class="push"><button type="button" class="primary" data-a="installok">Done, go to my plan</button><button type="button" class="textbtn" data-a="installlater">I\u2019ll do it later</button></div>';
    },
    savesetup: function () {
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:10px;margin-top:18px"><div class="eyebrow">Last step</div><h2>Save your progress</h2>' +
        '<p>Your plan is built. Save it with your email so it\u2019s safe if you lose your phone or get a new one. Free, and no password.' + (!standalone() ? ' Next, we\u2019ll show you how to put it on your Home Screen.' : '') + '</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px">' + signInForm() + '</div>' +
        '<button type="button" class="textbtn" data-a="saveskip" style="align-self:center">Not now</button>';
    },
    account: function () {
      return back(P.setupDone ? U.wizReturn || 'settings' : 'welcome') + '<h2>' + (S ? 'Your account' : U.joinMode ? 'Join your spouse\u2019s budget' : 'Sign in') + '</h2>' +
        (S ? '' : U.joinMode ? '<p>First sign in with your own email. Then enter the invite code your spouse sent you.</p>' : '<p>Already saved a plan to your account? Sign in and it comes right back.</p>') + accountCard();
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
  function goalText(g, go2, o) {
    if (g.by) {
      var per = goalByPer(g), late = go2 && go2.ready && F.isoDay(go2.ready) > g.by;
      return 'By ' + longDate(F.fromIso(g.by)) + ' \u00b7 ' + money(per) + ' set aside each paycheck' + (late ? ' \u00b7 your plan is tight, so it may land ' + shortDate(go2.ready) : '');
    }
    if (!go2 || !go2.ready) return 'Not reachable yet at this pace.';
    var t = 'Ready ' + shortDate(go2.ready);
    if (g.kind === 'fund') return t + ' · ' + money(F.perCheck({ amount: g.amount, months: g.months, kind: 'fund', saved: num(g.saved) }, F.FREQS[P.freq].perMonth)) + ' set aside each paycheck';
    if (!g.per) return t + (o.state.debts.some(function (d) { return d.bal > 0; }) ? ' · starts the day you’re debt-free' : ' · funded from your snowball money');
    var sooner = go2.ready0 && go2.ready0 > go2.ready ? ' (' + span(F.daysBetween(go2.ready, go2.ready0)) + ' sooner)' : ' (no sooner: your snowball would fund it on the same schedule)';
    var later = o.debtFree && go2.debtFree0 && o.debtFree > go2.debtFree0 ? ' · debt-free ' + span(F.daysBetween(go2.debtFree0, o.debtFree)) + ' later' : '';
    return t + sooner + later;
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
  var MILESTONE_TEXT = {
    3: 'Three paydays in a row. That\u2019s a habit forming.',
    6: 'Six in a row. You\u2019re paying yourself first now.',
    13: 'Thirteen paydays. Months of showing up for your future.',
    26: 'Twenty-six paydays in a row. That\u2019s a year for most people.',
    52: 'Fifty-two paydays. You\u2019re not budgeting anymore; you\u2019re just like this.',
    104: 'A hundred and four paydays. Legendary.'
  };
  function balancesNow() {
    var cur = { debts: {}, savings: num(P.savings), goals: {} };
    P.debts.forEach(function (d) { cur.debts[d.id] = num(d.bal); });
    P.goals.forEach(function (g) { cur.goals[g.id] = num(g.saved); });
    return cur;
  }
  function checkDone() {
    if (P.payVaries && num(U.thisPay) > 0) { P.payHist = (P.payHist || []).concat([{ id: uid(), amount: String(num(U.thisPay)), date: F.isoDay(today()) }]).slice(-8); payFromHist(); }
    U.thisPay = '';
    var now = today(), prevDebts = P.prevBalances || {};
    P.debts.forEach(function (d) { if (num(d.bal) > num(d.orig)) d.orig = num(d.bal); });
    var cur = balancesNow();
    var w = F.winsBetween({ debts: prevDebts, savings: P.prevSavings != null ? P.prevSavings : cur.savings, goals: P.prevGoals || {} }, cur);
    var free = F.freedomDate(F.outlook(profile(), now));
    var daysBack = P.lastFree && free ? F.daysBetween(free, F.fromIso(P.lastFree)) : 0;
    var pd = F.paydayFor(P.nextPay, P.freq, now), sr = pd ? F.applyCheckin(P.streak, pd, F.isoDay(now), P.freq) : null;
    if (sr) {
      P.streak = sr.st;
      var nx = F.nextAfter(pd, P.freq);
      while (F.daysBetween(now, F.fromIso(nx)) <= 0) nx = F.nextAfter(nx, P.freq);
      P.nextPay = nx;
    }
    P.totals.debtPaid += w.debtPaid; P.totals.saved += Math.max(0, w.saved); P.totals.daysBack += daysBack;
    var paid = P.debts.filter(function (d) { return num(d.bal) <= 0 && num(prevDebts[d.id]) > 0; }).map(function (d) { return d.name; });
    var goal = P.goals.filter(function (g) { return num(g.saved) >= g.amount && !g.celebrated; })[0];
    if (goal) goal.celebrated = true;
    U.result = { w: w, daysBack: daysBack, counted: !!sr && !sr.repeat, repeat: !!(sr && sr.repeat), streak: sr ? sr.out : null, paid: paid, goal: goal ? goal.name : null };
    P.history.push({ date: F.isoDay(now), debt: P.debts.reduce(function (t, d) { return t + num(d.bal); }, 0), savings: num(P.savings), debtPaid: w.debtPaid, saved: w.saved, daysBack: daysBack, payday: pd });
    snapshot(); save(); track(sr && !sr.repeat ? 'checkin-payday' : 'checkin-update');
    // the beta's key number: people who come back for a second payday
    if (sr && !sr.repeat && P.history.filter(function (h) { return h.payday; }).length === 2) track('second-payday');
    U.toast = null; go('wins');
  }
  // remembers where things stood, so the next check-in can count what changed
  function snapshot() {
    var o = F.outlook(profile(), today()), h = headline(o), free = F.freedomDate(o), cur = balancesNow();
    P.lastHeadline = h.date ? { kind: h.kind, date: F.isoDay(h.date) } : null;
    P.lastFree = free ? F.isoDay(free) : null;
    P.prevBalances = cur.debts; P.prevSavings = cur.savings; P.prevGoals = cur.goals;
  }
  var ACTION = { lunch10: 'Packed a lunch', sell3: 'Sold one', nofees30: 'A late fee happened', nooverdraft30: 'I overdrafted', nocard30: 'I added card debt', cancel1: 'I cancelled one', boost50: 'I paid the extra $50' };
  // what the milestones and challenges look at
  function facts() {
    var p = profile(), pl = F.plan(p), open = p.debts.some(function (d) { return d.bal > 0; });
    return { setupDone: P.setupDone, sortedAll: P.tx.length > 0 && !spending().unsorted.length, checkins: P.history.filter(function (h) { return h.payday; }).length,
      streakBest: P.streak.best || 0, savings: p.savings, debtsPaid: P.debts.filter(function (d) { return num(d.orig) > 0 && num(d.bal) <= 0; }).length,
      debtPaidTotal: P.totals.debtPaid, daysBack: P.totals.daysBack, debtFree: P.debts.length > 0 && !open && P.debts.some(function (d) { return num(d.orig) > 0; }),
      safetyNet: !open && p.savings >= pl.safetyNet, goalsFunded: P.goals.filter(function (g) { return num(g.saved) >= g.amount; }).length, challengesDone: P.challengesDone || 0,
      earned: num(P.totals.earned), plansDone: P.plansDone || 0, shares: P.shares || 0 };
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
    if (!P.unlocked.challenges && (rdone.indexOf(3) >= 0 || f.checkins >= 1 || P.challenges.length)) { P.unlocked.challenges = true; P.unseen.push({ type: 'unlock', id: 'challenges' }); changed = true; }
    // a new step on the path is the biggest win of all
    var stepNow = F.outlook(profile(), now).step;
    if (P.topStep == null) P.topStep = stepNow;
    else if (stepNow > P.topStep) { P.unseen.unshift({ type: 'level', id: String(stepNow), from: P.topStep }); P.topStep = stepNow; changed = true; }
    F.BADGES.forEach(function (b) { if (!P.badges[b.id] && b.test(f)) { P.badges[b.id] = iso; P.unseen.push({ type: 'badge', id: b.id }); changed = true; } });
    if (P.challenges.length > 40) P.challenges = P.challenges.filter(function (c) { return !c.ended; }).concat(P.challenges.filter(function (c) { return c.ended; }).slice(-30));
    if (changed) save();
  }
  function unseenItem(u) {
    if (u.type === 'badge') { var b = F.BADGES.filter(function (x) { return x.id === u.id; })[0]; return b ? { eyebrow: 'New milestone', title: b.title, desc: b.desc, share: 'sharebadge', v: b.id } : null; }
    if (u.type === 'level') { var sn = Math.min(+u.id, 7); return { eyebrow: 'Level up · Step ' + sn + ' of 7', title: 'Welcome to ' + F.STEPS[sn - 1][0], desc: STEP_WHY[sn - 1], share: 'sharestep', v: u.id, journey: journey(sn, { key: 'level' + u.id, from: u.from }) }; }
    if (u.type === 'unlock') return u.id === 'challenges'
      ? { eyebrow: 'New: Challenges', title: 'Small sprints, real wins', desc: 'Start with the Cushion Sprint or Cook at Home 7. Finish one and you get a card to share.', share: 'openunlock', v: 'challenges', label: 'Take a look' }
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
  function pitwHtml() {
    var amt = U.pitw.amt, target = P.debts.filter(function (d) { return num(d.bal) > 0; }).sort(function (a, b) { return num(a.bal) - num(b.bal); })[0];
    var goals = P.goals.filter(function (g) { return num(g.saved) < g.amount; }).slice(0, 2);
    return '<div class="toast win stack" style="gap:8px"><b>+' + money(amt) + '. Nice work.</b><span>Put it to work before it disappears:</span><div class="stack" style="gap:8px">' +
      '<button type="button" class="sharebtn" data-a="pitw" data-v="savings">Add to my emergency savings</button>' +
      (target ? '<button type="button" class="sharebtn" data-a="pitw" data-v="debt">Pay down ' + esc(target.name) + '</button>' : '') +
      goals.map(function (g) { return '<button type="button" class="sharebtn" data-a="pitw" data-v="goal:' + g.id + '">Add to ' + esc(g.name) + '</button>'; }).join('') +
      '<button type="button" class="sharebtn ghost" data-a="pitw" data-v="later">Decide later</button></div></div>';
  }
  function partnerHtml(d) {
    var pt = d.partner && CONFIG.partners[d.partner];
    return (d.tips ? '<p style="font-size:13px">' + d.tips + '</p>' : '') +
      (pt && pt.url ? '<a class="outline" style="text-decoration:none;color:var(--ink);min-height:44px;font-size:15px" href="' + esc(pt.url) + '" target="_blank" rel="noopener sponsored">' + esc(pt.label) + ' \u203a</a>' +
        '<p style="font-size:12px;color:var(--faint)">We may earn money if you sign up through this link. We only list places we\u2019d recommend anyway.</p>' : '');
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
    if ((P.streak.count || 0) >= 2) out.push(P.streak.count + ' paydays in a row');
    if (P.totals.daysBack > 0) out.push('+' + P.totals.daysBack + ' days stolen back');
    return out;
  }
  function cardForStep() {
    var o = F.outlook(profile(), today()), st = Math.min(o.step, 7), name = F.STEPS[st - 1][0];
    return { eyebrow: 'Step ' + st + ' of 7', title: st === 1 ? 'I started my path to debt-free' : 'I made it to ' + name, sub: STEP_WHY[st - 1], step: st,
      chips: streakChips().length ? streakChips() : ['On the 7-step path'], caption: st === 1 ? 'Day one of my 7-step path to debt-free.' : 'Step ' + st + ' of 7: ' + name + '.' };
  }
  function cardForBadge(id) {
    var b = F.BADGES.filter(function (x) { return x.id === id; })[0], money1 = /^(paid|saved)-|^cushion$/.test(id);
    return { eyebrow: 'Milestone unlocked', title: b.title, sub: b.desc, subNoAmt: money1 ? (/^paid/.test(id) ? 'Another debt milestone, paid down.' : 'My emergency savings keep growing.') : b.desc,
      chips: ['Milestone ' + Object.keys(P.badges).length + ' of ' + F.BADGES.length].concat(streakChips()).slice(0, 3), caption: 'Milestone unlocked: ' + b.title + '.' };
  }
  function cardForChallenge(uid) {
    var c = P.challenges.filter(function (x) { return x.uid === uid; })[0], d = F.challengeDef(c.id);
    var extra = d.kind === 'amount' && c.amount ? ['$' + Math.round(c.amount) + ' found'] : [];
    var len = [(d.kind === 'count' ? d.target + ' in ' + d.days + ' days' : d.days + '-day challenge')];
    return { eyebrow: 'Challenge complete', title: d.title, sub: d.share, chips: len.concat(extra, streakChips()).slice(0, 3), chipsNoAmt: len.concat(streakChips()).slice(0, 3), caption: 'Challenge complete: ' + d.title + '!' };
  }
  // the next Money Reset day, as the home screen's daily nudge
  function todayStep() {
    var run = (P.plans || []).filter(function (p) { return p.id === 'reset7' && !p.ended; })[0];
    if (!run) return '';
    var st = F.planStatus(run, today());
    if (st.next < 0 || !st.days[st.next].open) return '';
    return '<button type="button" class="card" data-a="planopen" data-v="' + run.uid + '" data-i="' + st.next + '" style="text-align:left;width:100%;padding:16px 18px;display:flex;gap:14px;align-items:center">' +
      '<span class="medal on" aria-hidden="true">' + ICON.book + '</span><span style="flex:1;min-width:0"><span class="eyebrow" style="display:block">Today \u00b7 Day ' + (st.next + 1) + ' of 7</span>' +
      '<span style="display:block;font-family:var(--display);font-weight:600;font-size:18px">' + st.def.days[st.next].title + '</span><span style="font-size:13px;color:var(--muted)">2 minutes \u00b7 one small step</span></span><span aria-hidden="true">\u203a</span></button>';
  }
  function nwCard() {
      var sp = P.tx.length ? spending() : null;
      return sp ? '<button type="button" class="card" data-a="' + (sp.unsorted.length ? 'sortstart' : 'go" data-v="spend') + '" style="text-align:left;width:100%;padding:16px 18px;display:flex;flex-direction:column;gap:10px">' +
          '<span style="display:flex;justify-content:space-between;align-items:center;width:100%"><span style="font-family:var(--display);font-weight:600;font-size:18px">' + (sp.unsorted.length ? 'Finish sorting your spending' : 'Needs vs wants') + '</span><span style="font-size:13px;color:var(--faint)">Open ›</span></span>' + splitHtml(sp.t) +
          '<span style="font-size:14px;color:var(--muted)">' + (sp.unsorted.length ? plural(sp.unsorted.length, 'store') + ' left to sort' : '<span class="key c-need"></span>Needs ' + money(sp.monthly.need) + '/mo &nbsp;<span class="key c-want"></span>Wants ' + money(sp.monthly.want) + '/mo') + '</span></button>'
        : '';
  }
  // a row of bubble tabs that scrolls sideways
  function tabChips(action, cur, opts) {
    return '<div class="tabchips" role="tablist">' + opts.map(function (o) { var on = cur === o[0]; return '<button type="button" role="tab" class="chip' + (on ? ' on' : '') + '" aria-selected="' + on + '" data-a="' + action + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  }
  function homeTop(toast) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px"><span class="brand"><span class="logo" style="width:30px;height:30px;border-radius:10px">' + ICON.logo + '</span>Find Me the Money</span>' +
      '<button type="button" class="back" data-a="go" data-v="settings" aria-label="Settings">' + ICON.gear + '</button></div>' + toast + celebration(1);
  }
  // Home stays simple: the countdown, then one thing to do next
  function nextThing() {
    if (mdDueNow()) return moneyDateCard();
    var t = todayStep(); if (t) return t;
    return checklist();
  }
  function pathCard(o, step) {
    return '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0"><div style="min-width:0"><b>Step ' + Math.min(step, 7) + ' of 7: ' + F.STEPS[Math.min(step, 7) - 1][0] + '</b><small>' + F.STEPS[Math.min(step, 7) - 1][1] + '</small></div>' +
      '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px;white-space:nowrap" data-a="ladder" aria-expanded="' + !!U.showLadder + '">' + (U.showLadder ? 'Hide' : 'All 7 steps') + '</button></div>' + (U.showLadder ? journey(step, { small: true, progress: stepProgress(o) }) + ladderHtml(step) : '') + '</div>';
  }
  function homeRest(o, step, snow, nw) {
    return nextThing() + '<p class="fine">Find Me the Money is an educational budgeting tool, not financial, tax or investment advice.</p>';
  }
  function snow0(o, step) {
    return o.state.debts.length ? '<div class="card"><div class="row" style="border:0;padding-bottom:2px"><h3>Debt snowball</h3><span style="font-size:13px;color:var(--faint)">smallest first</span></div>' +
        o.state.debts.slice().sort(function (a, b) { return a.bal - b.bal; }).sort(function (a, b) { return (a.bal <= 0) - (b.bal <= 0); }).map(function (d) {
          var d0 = P.debts.filter(function (x) { return x.id === d.id; })[0], orig = Math.max(num(d0.orig), d.bal) || 1, paid = d.bal <= 0, isT = o.target && o.target.id === d.id && step === 2;
          return '<div class="debt' + (paid ? ' paid' : '') + '"><div class="top"><span>' + esc(d.name) + (isT ? '<span class="target">Snowball target</span>' : '') + '</span><b>' + (paid ? 'Paid off' : money(d.bal)) + '</b></div>' +
            '<div class="bar" style="flex:none"><i style="width:' + Math.max(paid ? 100 : 1, (orig - d.bal) / orig * 100) + '%"></i></div></div>';
        }).join('') + '</div>' : '';
  }
  // what's still an estimate, one tap each
  function checklist() {
    var items = [
      ['savings', 'Add your emergency savings', 'Sharpens your $1,000 cushion date', savingsSet()],
      ['fun', 'Set your fun money', 'Optional: give eating out and shopping a limit', funSet()],
      ['import', 'See where your money goes', 'Import a bank file and sort it', P.tx.length > 0],
      ['bills', 'List your bills one by one', 'Optional: more exact than one number', itemized()]
    ];
    if (!standalone()) items.push(['install', 'Add to your Home Screen', isIOS() ? 'Keeps your plan safe on iPhone' : 'One tap away on payday', !!P.installSeen]);
    if (cloudOn()) items.push(['account', 'Save your plan with your email', 'So it\u2019s safe on any phone. No password', !!S]);
    if (CONFIG.communityUrl) items.push(['community', 'Join the FREE community', 'Share wins and get your questions answered', !!P.communityJoined]);
    var done = items.filter(function (x) { return x[3]; }).length;
    if (done === items.length) return '';
    var left = items.filter(function (x) { return !x[3]; }), total = items.length;
    if (!U.allSteps) items = left.slice(0, 1);
    return '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0 0 4px"><h3>Your next step</h3><span style="font-size:13px;color:var(--faint)">' + done + ' of ' + total + '</span></div>' +
      items.map(function (x) {
        return x[3] ? '<div class="planrow locked"><span class="dot on" aria-hidden="true">' + ICON.check('#fff', 12) + '</span><span style="flex:1"><s style="color:var(--faint)">' + x[1] + '</s></span></div>'
          : '<button type="button" class="planrow" data-a="edit" data-v="' + x[0] + '"><span class="dot today" aria-hidden="true"></span><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">' + x[1] + '</span><small style="color:var(--faint)">' + x[2] + '</small></span><span aria-hidden="true">\u203a</span></button>';
      }).join('') + (!U.allSteps && left.length > 1 ? '<button type="button" class="textbtn" data-a="allsteps" style="min-height:36px;padding:6px 0 0">See all ' + left.length + ' left</button>' : '') + '</div>';
  }
  function stat(v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; }
  function streakCard() {
    var v = F.streakView(P.streak, P.nextPay, P.freq, today()), t = P.totals;
    var line = v.state === 'new' ? 'Check in on payday to start your streak.'
      : v.state === 'paused' ? 'Paused. Check in on payday to start a new one. Your best: ' + v.best + '.'
      : v.state === 'due' ? 'It\u2019s payday. Check in to make it ' + (v.count + 1) + ' in a row.'
      : 'Next check-in ' + dayMonth(F.fromIso(P.nextPay)) + (v.grace ? ' \u00b7 1 grace pass saved' : '');
    return '<div class="card stack" style="padding:16px 18px;gap:14px"><div style="display:flex;align-items:center;gap:12px"><span class="flame' + (v.count ? ' lit' : '') + '">' + ICON.flame + '</span>' +
      '<div><div style="font-family:var(--display);font-weight:600;font-size:19px">' + (v.count ? plural(v.count, 'payday') + ' in a row' : 'Payday streak') + '</div><div style="font-size:13px;color:var(--muted)">' + line + '</div></div></div>' +
      '<div class="grid3 stats">' + stat((t.daysBack > 0 ? '+' : '') + Math.max(0, t.daysBack), 'days stolen back') + stat(money(t.debtPaid), 'debt paid') + stat(money(t.saved), 'saved') + '</div>' +
      (v.count >= 2 ? '<button type="button" class="textbtn" style="align-self:flex-start;min-height:32px;padding:0" data-a="sharestreak">' + ICON.share + ' Share my streak</button>' : '') + '</div>';
  }
  function selectCaption() { var el = document.getElementById('caption'); if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
  function download(name, type, text) {
    var blob = text instanceof Blob ? text : new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  function icsFile() {
    var d = F.fromIso(F.rollPayday(P.nextPay, P.freq, today())), day = F.isoDay(d).replace(/-/g, '');
    var rule = { weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY' }[P.freq];
    if (P.freq === 'semimonthly') { var a = d.getDate(), b = a <= 15 ? Math.min(a + 15, 28) : a - 15; rule = 'FREQ=MONTHLY;BYMONTHDAY=' + Math.min(a, b) + ',' + Math.max(a, b); }
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Find Me the Money//Payday//EN', 'BEGIN:VEVENT', 'UID:fmtm-payday-' + uid() + '@findmethemoney', 'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + day, 'RRULE:' + rule, 'SUMMARY:Payday check-in (Find Me the Money)', 'DESCRIPTION:Open Find Me the Money\\, update your balances and watch your countdown move.',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Payday check-in', 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  function readFile(input, cb) {
    var f = input.files && input.files[0]; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { U.err = 'That file is bigger than 5 MB. Try a shorter date range.'; render(); return; }
    var r = new FileReader(); r.onload = function () { cb(String(r.result)); }; r.onerror = function () { U.err = 'We couldn’t open that file.'; render(); }; r.readAsText(f);
  }

  var CONFIRM_FIRST = { rm: 1, spenddel: 1, goaldel: 1, dueclear: 1 };
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
      case 'go': if (v === 'savings' && U.screen === 'path') track('setup-start'); if (v === 'sort') U.sortHist = []; U.confirmDelete = false; if (v === 'found') U.limit = null; go(v); break;
      case 'freq': P.freq = v; save(); render(); break;
      case 'quickgo':
        if (!(num(P.paycheck) > 0)) { U.err = 'Enter your take-home pay per paycheck. A rough number is fine.'; render(); break; }
        U.err = ''; quickApply(); save(); track('quick-done'); go('claim'); break;
      case 'claimgo': track('claim'); go('path'); break;
      case 'claimshare': (function () { var q = quickMath(); openShare({ eyebrow: 'Found money', title: 'I found ' + money(q.total * 12) + ' a year', sub: 'Debt payments I\u2019ll keep once I\u2019m debt-free, plus money that never had a job.', subNoAmt: 'Debt payments I\u2019ll keep once I\u2019m debt-free, plus money that never had a job.', chips: [money(q.total) + ' a month'], chipsNoAmt: ['Reclaiming it'], caption: 'Three numbers, 30 seconds: I found ' + money(q.total * 12) + ' a year.' }); })(); break;
      case 'giving': P.givingPct = +v; save(); render(); break;
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
      case 'spendnew': U.spendBack = U.screen === 'spendadd' ? U.spendBack : U.screen; U.form = { amount: '', note: '', key: U.lastSpendKey || '', date: F.isoDay(today()) }; U.formErr = ''; U.spendSaved = ''; go('spendadd'); break;
      case 'spendcat': U.form.key = v; U.formErr = ''; render(); break;
      case 'spendsave':
        if (!(num(U.form.amount) > 0)) { U.formErr = 'Enter how much you spent.'; render(); break; }
        if (!U.form.key) { U.formErr = 'Pick what it was for.'; render(); break; }
        P.spends.push({ id: uid(), date: U.form.date || F.isoDay(today()), amount: String(round2(num(U.form.amount))), key: U.form.key, note: String(U.form.note || '').trim() });
        U.lastSpendKey = U.form.key; save(); track('spend-add');
        if (v === 'again') {
          var sl = spendLines().filter(function (l) { return l.key === U.form.key; })[0];
          U.spendSaved = money2(num(U.form.amount)) + ' added to ' + (sl ? sl.label : 'your budget') + '.';
          U.form = { amount: '', note: '', key: U.form.key, date: U.form.date }; U.formErr = ''; render();
          var ai = app.querySelector('[data-g=amount]'); if (ai) ai.focus();
        } else go(U.spendBack || 'plan');
        break;
      case 'spendmonth': (function () { var a = curSpendMonth().split('-'), d = new Date(+a[0], +a[1] - 1 + (+v), 1); U.spendMonth = F.isoDay(d).slice(0, 7); })(); render(); break;
      case 'assignstart': U.assignHist = []; U.assignBack = U.screen === 'assign' ? U.assignBack : U.screen; go('assign'); break;
      case 'assignpick': assignTo(v); break;
      case 'assignundo': (function () { var m = U.assignHist.pop(); if (m) delete P.storeLine[m]; })(); save(); render(); break;
      case 'spenddel': P.spends = P.spends.filter(function (x) { return x.id !== v; }); save(); render(); break;
      case 'plusmenu': U.plusOpen = !U.plusOpen; render(); break;
      case 'plusclose': U.plusOpen = false; render(); break;
      case 'winsview': U.winsView = v; render(); break;
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
      case 'mdset': (function () { var el = app.querySelector('[data-mddate]'), dt = el && el.value; if (!/^\d{4}-\d{2}-\d{2}$/.test(dt || '')) return; P.moneyDate = { due: dt }; U.mdEdit = false; save(); track('money-date-set'); })(); render(); break;
      case 'mdchange': U.mdEdit = true; render(); break;
      case 'mdcancel': U.mdEdit = false; render(); break;
      case 'mdics': download('find-me-the-money-money-date.ics', 'text/calendar', mdIcs()); track('money-date-ics'); break;
      case 'mdcheck': U.mdChecks = U.mdChecks || {}; U.mdChecks[i] = !U.mdChecks[i]; render(); break;
      case 'mdgo': U.mdChecks = U.mdChecks || {}; if (v === 'mdlast') { var nd = today(); U.spendMonth = F.isoDay(new Date(nd.getFullYear(), nd.getMonth() - 1, 1)).slice(0, 7); go('plan'); } else go(v); break;
      case 'mddone': P.moneyDates = P.moneyDates || []; P.moneyDates.push(F.isoDay(today())); U.mdChecks = {}; save(); track('money-date-done'); U.planToast = 'Money date done. See you next month.'; go('plans'); break;
      case 'calday': U.calDay = U.calDay === v ? null : v; render(); break;
      case 'calmove': (function () { var n = today(), c = U.calMonth || [n.getFullYear(), n.getMonth()], d = new Date(c[0], c[1] + (+v), 1); U.calMonth = [d.getFullYear(), d.getMonth()]; U.calDay = null; })(); render(); break;
      case 'plview': U.planMonth = v === 'month'; U.bEdit = null; render(); break;
      case 'bedit': U.bEdit = v; U.bAdd = null; render(); (function () { var inp = app.querySelector('[data-bedit]'); if (inp) { inp.focus(); inp.select(); } })(); break;
      case 'btoggle': U.bOpen = U.bOpen || {}; U.bOpen[v] = U.bOpen[v] === false; render(); break;
      case 'badd': U.bAdd = v; U.bEdit = null; render(); (function () { var inp = app.querySelector('[data-baddname]'); if (inp) inp.focus(); })(); break;
      case 'baddcancel': U.bAdd = null; render(); break;
      case 'baddsave': (function () { var n = app.querySelector('[data-baddname]'), a = app.querySelector('[data-baddamt]'); budgetAdd(v, n && n.value, a && a.value); })(); U.bAdd = null; render(); break;
      case 'wiz':
        var n = +v; U.err = validate(n);
        if (U.err) { render(); break; }
        if (WIZ[n - 1] === 'debts') P.debts.forEach(function (d) { if (num(d.bal) > num(d.orig)) d.orig = num(d.bal); });
        save();
        if (P.setupDone) { snapshot(); save(); go(U.wizReturn || 'settings'); }
        else go(n < WIZ.length ? WIZ[n] : 'reveal');
        break;
      case 'help': U.showHelp = !U.showHelp; render(); break;
      case 'sortstart': U.sortHist = []; go('sort'); break;
      case 'pick':
        var card = app.querySelector('[data-swipe]');
        if (card && v !== 'skip') flyAndDecide(card, v); else decide(v);
        break;
      case 'undo': (function (m) { delete P.sorted[m]; storeTx(m).forEach(function (x) { delete x.b; }); })(U.sortHist.pop()); save(); render(); break;
      case 'sortpeek': (function (m) { U.sortOpen = U.sortOpen === m ? null : m; })(b.getAttribute('data-m')); render(); break;
      case 'tog': (function (m) { P.sorted[m] = v; storeTx(m).forEach(function (x) { delete x.b; }); })(b.getAttribute('data-m')); save(); render(); break;
      case 'storeopen': (function (m) { U.openStore = U.openStore === m ? null : m; })(b.getAttribute('data-m')); render(); break;
      case 'ttog': (function (x) {
        x.b = v; var list = storeTx(x.merchant);
        // Every purchase agrees again: fold it back into a plain store setting.
        if (list.every(function (y) { return y.b === v; })) { P.sorted[x.merchant] = v; list.forEach(function (y) { delete y.b; }); }
        // Sorting purchase by purchase in the deck: once the store is fully sorted, move on.
        if (U.screen === 'sort' && list.every(function (y) { return bucketOf(y) !== 'unsorted'; })) {
          U.sortHist.push(x.merchant); save();
          if (!spending().unsorted.length) { U.limit = null; track('sorted'); go('found'); return; }
        }
      })(P.tx[i]); save(); render(); break;
      case 'filter': U.filter = v; render(); break;
      case 'setfun':
        (function () { var w = Math.round(spending().monthly.want / 10) * 10; P.found = w > U.limit ? { amount: w - U.limit, from: w } : null; })();
        P.fun = U.limit; P.funParts = []; save();
        if (P.setupDone && unassignedStores().length) { U.assignHist = []; U.assignBack = U.wizReturn === 'planday' ? 'planday' : 'home'; go('assign'); }
        else go(U.wizReturn === 'planday' ? 'planday' : 'home');
        break;
      case 'finish':
        P.setupDone = true; P.badges.plan = P.badges.plan || F.isoDay(today()); P.topStep = F.outlook(profile(), today()).step;
        if (!P.plans.some(function (p) { return p.id === 'reset7'; })) P.plans.push({ uid: uid(), id: 'reset7', start: F.isoDay(today()), done: [] });
        snapshot(); save(); track('setup-done');
        U.toast = ['Your plan is ready.', 'Next: Day 1 of your 7-Day Money Reset. It takes 2 minutes.', true];
        if (cloudOn() && !S) { U.cloudStep = null; U.err = ''; U.afterSave = true; go('savesetup'); } else if (S && !standalone()) { U.afterSave = true; go('saveinstall'); } else go('home');
        break;
      case 'saveskip': track('save-skip'); U.afterSave = false; go('home'); break;
      case 'installlater': U.afterSave = false; go('home'); break;
      case 'installok': P.installSeen = true; save(); U.afterSave = false; track('install-seen'); go('home'); break;
      case 'savenudgeoff': P.saveNudgeOff = true; save(); render(); break;
      case 'edit': U.wizReturn = U.screen === 'planday' ? 'planday' : U.screen; U.err = ''; go(v); break;
      case 'basicpick': P.basicsAuto = false; P.basics = v; save(); render(); break;
      case 'ladder': U.showLadder = !U.showLadder; render(); break;
      case 'installdone': U.copiedPlan = false; P.installSeen = true; save(); go(U.wizReturn || 'home'); break;
      case 'openunlock': markSeen('unlock:' + v); go(v); break;
      case 'levelgo': markSeen('level:' + v); go('plan'); break;
      case 'quick':
        var lst = b.getAttribute('data-l'), key = b.getAttribute('data-k');
        if (lst) P[lst][i][key] = v; else P[key] = v;
        save();
        var inp2 = app.querySelector(lst ? '[data-list="' + lst + '"][data-i="' + i + '"][data-k="' + key + '"]' : '[data-f="' + key + '"]');
        if (inp2) inp2.value = v;
        break;
      case 'goalnew': U.form = { name: '', amount: '', kind: 'dream', months: 6 }; U.formErr = ''; U.back = U.screen; U.next = U.screen; go('goal'); break;
      case 'preset':
        var pr = U.presets[i], other = pr[0] === 'Something else';
        U.form = { name: other ? '' : pr[0], amount: pr[1], kind: pr[2], months: pr[3] || 6 }; U.formErr = ''; render();
        if (other) { var el = document.getElementById('g-name'); if (el) el.focus(); }
        break;
      case 'gkind': U.form.kind = v; render(); break;
      case 'gmonths': if (v === 'date') { U.form.when = 'date'; if (!U.form.by) U.form.by = F.isoDay(F.addDays(today(), 182)); } else { U.form.when = ''; if (v !== 'asap') U.form.months = +v; } render(); break;
      case 'goalsave':
        var nm = String(U.form.name || '').trim(), amt = Math.round(num(U.form.amount));
        if (!nm || !(amt > 0)) { U.formErr = 'Give your goal a name and an amount above $0.'; render(); break; }
        if (P.goals.length >= 3) { U.formErr = 'You can have 3 goals at a time. Finish or remove one first.'; render(); break; }
        if (U.form.when === 'date' && !(U.form.by && U.form.by > F.isoDay(today()))) { U.formErr = 'Pick a date after today.'; render(); break; }
        P.goals.push({ id: uid(), name: nm, amount: amt, kind: U.form.kind, months: U.form.months, per: 0, saved: 0, by: U.form.when === 'date' ? U.form.by : '' });
        save(); track('goal'); go(U.next); break;
      case 'goaldel': P.goals.splice(i, 1); save(); render(); break;
      case 'checkin': P.prevBalances = P.prevBalances || {}; go('checkin'); break;
      case 'checkdone': checkDone(); break;
      case 'ics': download('find-me-the-money-paydays.ics', 'text/calendar', icsFile()); break;
      case 'backup': download('find-me-the-money-backup-' + F.isoDay(today()) + '.json', 'application/json', JSON.stringify(P, null, 2)); break;
      case 'del': U.confirmDelete = true; render(); break;
      case 'allsteps': U.allSteps = true; render(); break;
      case 'payvary': P.payVaries = !!v; if (P.payVaries && !(P.payHist || []).length) P.payHist = [{ id: uid(), amount: P.paycheck || '' }, { id: uid(), amount: '' }]; payFromHist(); save(); render(); break;
      case 'payhistadd': P.payHist = P.payHist || []; P.payHist.push({ id: uid(), amount: '' }); save(); render(); (function () { var el = app.querySelectorAll('[data-list=payHist]'); if (el.length) el[el.length - 1].focus(); })(); break;
      case 'paybasis': P.payBasis = v; payFromHist(); save(); render(); break;
      case 'chtab': U.chTab = v; U.chAllSug = false; render(); break;
      case 'challsug': U.chAllSug = true; render(); break;
      case 'mstab': U.msTab = v; U.msAll = false; render(); break;
      case 'msall': U.msAll = true; render(); break;
      case 'csend': (function () {
        var el = app.querySelector('[data-cemail]'), em = String(el ? el.value : (U.cloudStep && U.cloudStep.email) || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { U.err = 'That email doesn\u2019t look right.'; render(); return; }
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
          .then(signedIn, function (er) { U.err = er.status >= 500 || !er.status ? 'We couldn\u2019t check the code' + (er.status ? ': ' + er.message : '. Check your connection.') : 'That code didn\u2019t work. Check it, or send a new one.'; render(); });
      })(); break;
      case 'creset': U.cloudStep = null; U.err = ''; render(); break;
      case 'cout': if (S) sb('/auth/v1/logout', { method: 'POST', auth: true }).catch(function () {}); S = null; keepAuth(); C.ready = false; C.state = 'idle'; U.toast = ['Signed out.', 'Your plan stays on this phone.', true]; render(); break;
      case 'cdel': U.cdel = true; render(); break;
      case 'cjoinstart': U.joinMode = true; go('account'); break;
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
      case 'cdelno': U.cdel = false; render(); break;
      case 'cdelyes': (function () {
        U.cdel = false;
        fresh().then(function () { return sb('/rest/v1/plans?user_id=eq.' + S.uid, { method: 'DELETE', auth: true }); })
          .then(function () { sb('/auth/v1/logout', { method: 'POST', auth: true }).catch(function () {}); S = null; keepAuth(); C.ready = false; C.state = 'idle'; track('account-delete'); U.toast = ['Your account copy is deleted.', 'Your plan stays on this phone.', true]; render(); },
            function () { U.err = 'We couldn\u2019t reach your account. Try again when you\u2019re online.'; render(); });
      })(); break;
      case 'cpick': (function () {
        var pk = U.cloudPick; U.cloudPick = null; C.ready = true;
        if (v === 'cloud') adopt(pk.row);
        else { try { localStorage.setItem(TRASH, JSON.stringify({ at: F.isoDay(today()), plan: Object.assign(blank(), pk.row.data) })); } catch (err) {} S.synced = -1; keepAuth(); cloudPush(); }
        U.toast = ['You\u2019re signed in.', 'Your plan now saves to your account.', true]; go(P.setupDone ? 'home' : 'welcome');
      })(); break;
      case 'delno': U.confirmDelete = false; render(); break;
      case 'chstart':
        if (P.challenges.filter(function (c) { return !c.ended; }).length >= 3) break;
        P.challenges.push({ uid: uid(), id: v, start: F.isoDay(today()), marks: [], amount: 0 }); save(); track('challenge-start'); render(); break;
      case 'chdot':
        var cd = P.challenges.filter(function (c) { return c.uid === v; })[0], dd = b.getAttribute('data-d'), at = cd.marks.indexOf(dd);
        if (at >= 0) cd.marks.splice(at, 1); else cd.marks.push(dd);
        save(); render(); break;
      case 'chplus': var cp = P.challenges.filter(function (c) { return c.uid === v; })[0]; cp.marks.push(F.isoDay(today()) + '#' + cp.marks.length); save(); render(); break;
      case 'chcomplete': P.challenges.filter(function (c) { return c.uid === v; })[0].complete = F.isoDay(today()); save(); render(); break;
      case 'chonce': P.challenges.filter(function (c) { return c.uid === v; })[0].done = F.isoDay(today()); save(); render(); break;
      case 'chadd':
        var inp = app.querySelector('[data-chamt="' + v + '"]'), add = inp ? num(inp.value) : 0;
        if (add > 0) { var ca = P.challenges.filter(function (c) { return c.uid === v; })[0]; ca.amount = (ca.amount || 0) + add; save(); }
        render(); break;
      case 'chslipask': U.slip = v; render(); break;
      case 'chslipno': U.slip = null; render(); break;
      case 'chslip':
        var cs = P.challenges.filter(function (c) { return c.uid === v; })[0], stS = F.challengeStatus(cs, today(), facts());
        cs.slipped = F.isoDay(today()); cs.ended = 'slipped'; cs.endedOn = cs.slipped; cs.note = F.challengeStatus(cs, today(), facts()).label; U.slip = null;
        save(); render(); break;
      case 'chquit': var cq = P.challenges.filter(function (c) { return c.uid === v; })[0]; cq.ended = 'quit'; cq.endedOn = F.isoDay(today()); save(); render(); break;
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
      case 'planstart': P.plans.push({ uid: uid(), id: v, start: F.isoDay(today()), done: [] }); save(); track('plan-start'); render(); break;
      case 'planopen': U.planUid = v; U.planDay = i; go('planday'); break;
      case 'planmark':
        if (U.planCtx) { U.planUid = U.planCtx.uid; U.planDay = U.planCtx.day; }
        var rp = P.plans.filter(function (p) { return p.uid === U.planUid; })[0];
        if (rp.done.indexOf(U.planDay) < 0) rp.done.push(U.planDay);
        U.planCtx = null; U.wizReturn = null;
        U.planToast = 'Day ' + (U.planDay + 1) + ' complete. Nice work.';
        save(); track('plan-day'); go('plans'); break;
      case 'planback': if (U.planCtx) { U.planUid = U.planCtx.uid; U.planDay = U.planCtx.day; } U.planCtx = null; go('planday'); break;
      case 'planact':
        U.planCtx = { uid: U.planUid, day: U.planDay };
        if (v === 'ics') { download('find-me-the-money-paydays.ics', 'text/calendar', icsFile()); break; }
        if (v === 'goalnew') { U.form = { name: '', amount: '', kind: 'dream', months: 6 }; U.formErr = ''; U.back = 'planday'; U.next = 'planday'; go('goal'); break; }
        if (v === 'spend') { U.wizReturn = 'planday'; if (!P.tx.length) { go('import'); break; } if (spending().unsorted.length) { U.sortHist = []; go('sort'); break; } }
        if (v === 'savings' || v === 'fun' || v === 'debts' || v === 'install') U.wizReturn = 'planday';
        go(v); break;
      case 'shareplan':
        markSeen('plan:' + v);
        var sp = P.plans.filter(function (p) { return p.uid === v; })[0], spd = F.planDef(sp.id);
        openShare({ eyebrow: 'Plan complete', title: spd.title, sub: spd.share, chips: [spd.days.length + ' days, ' + spd.days.length + ' small steps'].concat(streakChips()).slice(0, 3), caption: 'Finished the ' + spd.title + '!' });
        break;
      case 'winsdone': P.unseen = P.unseen.filter(function (u) { return u.type !== 'badge'; }); save(); go('home'); break;
      case 'sharebadge': markSeen('badge:' + v); openShare(cardForBadge(v)); break;
      case 'sharech': markSeen('challenge:' + v); openShare(cardForChallenge(v)); break;
      case 'sharestreak':
        openShare({ eyebrow: 'Payday streak', title: plural(P.streak.count, 'payday') + ' in a row', sub: 'Showing up for my future, one paycheck at a time.', chips: P.totals.daysBack > 0 ? ['+' + P.totals.daysBack + ' days stolen back'] : [], caption: plural(P.streak.count, 'payday') + ' in a row of sticking to my plan.' });
        break;
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
      case 'delyes': if (S) { S = null; keepAuth(); C.ready = false; } keepCopy(); try { localStorage.removeItem(CONFIG.storageKey); } catch (err) {} P = blank(); U.confirmDelete = false; U.toast = null; go('welcome'); break;
    }
  });

  // typing updates the saved data in place, so the keyboard never loses its place
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (U.err) { U.err = ''; var al = app.querySelector('[role=alert]'); if (al) al.remove(); }
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
      else if (t.getAttribute('data-f') !== 'x') P[t.getAttribute('data-f')] = t.value;
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
    if (t.getAttribute('data-file') === 'csv') readFile(t, function (text) {
      var r = F.readTransactions(text);
      if (r.error) { U.err = r.error; render(); return; }
      if (!r.tx.length) { U.err = 'We found the file, but no spending in it. Try the account you spend from.'; render(); return; }
      P.tx = r.tx.map(function (x) { return { date: x.date, desc: x.desc, merchant: x.merchant, amount: x.amount }; }); P.txFrom = r.from; P.txTo = r.to;
      save(); track('import'); U.sortHist = []; U.limit = null; go('sort');
    });
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
  cloudStart();
  // a shared budget checks for the other person's changes every minute while it's open
  setInterval(function () { if (shared() && !document.hidden && !C.busy && C.ready && !C.timer) cloudPull(false); }, 60000);
  render();
})();
