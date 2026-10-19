/* Find Me the Money: screens and interactions. All data stays in this browser (localStorage). */
(function () {
  'use strict';
  var F = window.FMTM;

  // ---------- settings for the beta ----------
  var CONFIG = {
    feedbackUrl: '',            // e.g. a Google Form link; the Feedback button hides while this is empty
    storageKey: 'fmtm.v1',
    shareUrl: '',               // e.g. 'findmethemoney.app'; printed on share cards when set
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
      bills: [{ name: 'Rent or housing', amount: '' }, { name: 'Utilities', amount: '' }, { name: 'Phone', amount: '' }, { name: 'Insurance', amount: '' }, { name: 'Groceries', amount: '' }, { name: 'Gas & transportation', amount: '' }],
      debts: [], savings: '', givingPct: 0, fun: '', goals: [], tx: [], txFrom: null, txTo: null, sorted: {}, lastHeadline: null, history: [],
      streak: { count: 0, best: 0, grace: 0, lastPayday: null }, totals: { debtPaid: 0, saved: 0, daysBack: 0 }, lastFree: null, prevSavings: null, prevGoals: {},
      challenges: [], challengesDone: 0, badges: {}, unseen: [], plans: [], plansDone: 0, shares: 0, basics: '', unlocked: {}, installSeen: false };
  }
  var storageOk = true;
  function load() {
    try {
      var raw = localStorage.getItem(CONFIG.storageKey); if (!raw) return blank();
      var d = JSON.parse(raw);
      // plans saved before features unlocked gradually keep everything they already had
      if (d.setupDone && !d.unlocked) d.unlocked = { challenges: true, milestones: true };
      return Object.assign(blank(), d);
    }
    catch (e) { storageOk = false; return blank(); }
  }
  function save() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(P)); storageOk = true; } catch (e) { storageOk = false; } }
  var P = load();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // a numeric copy of the saved data for the math, with a missed payday rolled forward
  function profile() {
    return {
      paycheck: num(P.paycheck), freq: P.freq, nextPay: F.rollPayday(P.nextPay, P.freq, today()), givingPct: P.givingPct, savings: num(P.savings),
      // until fun money is set, assume 10% of take-home pay so the countdown isn't too rosy
      fun: funSet() ? num(P.fun) : Math.round(num(P.paycheck) * F.FREQS[P.freq].perMonth * 0.1 / 10) * 10, funEst: !funSet(),
      // one "bills and basics" number until the person lists bills one by one
      bills: itemized() ? P.bills.map(function (b) { return { name: b.name, amount: num(b.amount) }; }) : [{ name: 'Bills and basics', amount: num(P.basics) }],
      // interest is optional; a blank rate is estimated at 20%
      debts: P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).map(function (d) { return { id: d.id, name: d.name || 'Debt', bal: num(d.bal), min: num(d.min), apr: String(d.apr).trim() === '' ? 20 : num(d.apr) }; }),
      goals: P.goals.map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.kind, months: g.months, per: g.per || 0, saved: num(g.saved) }; })
    };
  }
  function funSet() { return P.fun !== '' && P.fun != null; }
  function itemized() { return P.bills.some(function (b) { return num(b.amount) > 0; }); }
  function savingsSet() { return P.savings !== '' && P.savings != null; }
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  // ---------- screen state (not saved) ----------
  var U = { screen: P.setupDone ? 'home' : 'welcome', toast: null, form: null, formErr: '', err: '', sortHist: [], back: 'home', next: 'home', confirmDelete: false, filter: 'all', showHelp: false };
  var app = document.getElementById('app');
  var TABS = [['home', 'Home', 'home'], ['plans', 'Plans', 'book'], ['challenges', 'Challenges', 'flag'], ['milestones', 'Milestones', 'medal']];
  function render() {
    if (P.setupDone && (U.screen === 'wins' || TABS.some(function (t) { return t[0] === U.screen; }))) refresh();
    var tabs = TABS.filter(function (t) { return t[0] === 'home' || t[0] === 'plans' || (P.unlocked && P.unlocked[t[0]]); });
    var tabbed = P.setupDone && tabs.some(function (t) { return t[0] === U.screen; });
    var html = (V[U.screen] || V.home)();
    if (tabbed) {
      var news = P.unseen.length;
      html += '<nav class="tabbar" aria-label="Sections" style="grid-template-columns:repeat(' + tabs.length + ',minmax(0,1fr))">' + tabs.map(function (t) {
        var on = U.screen === t[0];
        return '<button type="button" data-a="go" data-v="' + t[0] + '"' + (on ? ' aria-current="page" class="on"' : '') + '>' + ICON[t[2]] + '<span>' + t[1] + '</span>' + (t[0] === 'milestones' && news && !on ? '<i class="badge-dot" aria-label="' + news + ' new"></i>' : '') + '</button>';
      }).join('') + '</nav>';
    }
    app.innerHTML = html;
    document.body.classList.toggle('has-tabs', tabbed);
  }
  function go(s) { U.screen = s; U.err = ''; render(); window.scrollTo(0, 0); }

  var ICON = {
    check: function (c, s) { s = s || 14; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M5 12l5 5L20 7"/></svg>'; },
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    logo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M9 9.5h3a1.2 1.2 0 010 2.4h-2a1.2 1.2 0 000 2.4h3"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    file: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    flame: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
    home: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1z"/></svg>',
    flag: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
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
  function wizardHead(n, title, sub) {
    var top = P.setupDone ? '<div>' + back(U.wizReturn || 'settings') + '</div>'
      : '<div style="display:flex;align-items:center;gap:12px">' + back(n === 1 ? 'welcome' : WIZ[n - 2]) +
        '<div class="bar"><i style="width:' + (n / WIZ.length * 100) + '%"></i></div><span style="font-size:13px;font-weight:600;color:var(--faint)">' + n + ' of ' + WIZ.length + '</span></div>';
    return top +
      '<div class="stack" style="gap:8px;margin-top:4px"><h2>' + title + '</h2><p>' + sub + '</p></div>';
  }
  var WIZ = ['pay', 'basics', 'debts'];
  function wizNext(n) { return '<div class="push">' + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.err + '</p>' : '') + '<button type="button" class="primary" data-a="wiz" data-v="' + n + '">' + (P.setupDone ? 'Save' : n === WIZ.length ? 'See my countdown' : 'Next') + '</button></div>'; }

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
  // the one date the home screen counts down to, by step
  function headline(o) {
    if (o.step === 1) return { kind: 'cushion', date: o.cushion, label: 'Step 1 · Starter Cushion full in' };
    if (o.step === 2) return { kind: 'debt-' + o.target.id, date: o.targetDone, label: 'Step 2 · ' + esc(o.target.name) + ' paid off in' };
    if (o.step === 3) return { kind: 'safety', date: o.safetyNet, label: 'Step 3 · Full Safety Net in' };
    return { kind: 'done', date: null, label: 'Step 4 · Future You' };
  }

  var V = {
    welcome: function () {
      var promises = ['Your budget, built for you. You just say yes.', 'A 7-step plan, from $1,000 saved to debt-free to generous', 'Your numbers never leave your phone'];
      return '<div class="brand"><div class="logo">' + ICON.logo + '</div>Find Me the Money</div>' +
        '<div class="stack" style="gap:14px;margin-top:28px"><h1>Find the <span class="sunword">money</span> you didn’t know you had.</h1>' +
        '<p style="font-size:17px">Tell us what comes in and what goes out. We build your budget, count down to debt-free, and give your goals a real date.</p></div>' +
        '<div class="stack" style="gap:12px">' + promises.map(function (t) { return '<div class="check"><div class="dot">' + ICON.check('#FFFFFF') + '</div>' + t + '</div>'; }).join('') + '</div>' +
        (storageOk ? '' : '<div class="note">' + ICON.info + '<span>This browser is blocking saved data (private browsing?), so your plan won’t be kept. Open it in a regular tab.</span></div>') +
        '<div class="push"><button type="button" class="primary" data-a="go" data-v="pay">Build my plan — about 5 minutes</button>' +
        '<button type="button" class="textbtn" data-a="go" data-v="restore">I have a backup file</button>' +
        '<div class="fine">Beta · an educational budgeting tool, not financial advice</div></div>';
    },

    pay: function () {
      return wizardHead(1, 'Your paycheck', 'What actually lands in your account, after taxes. If it changes, use a typical one.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Take-home pay per paycheck', 'paycheck', { ph: '1600', min: 0 }) +
        '<div class="field">How often are you paid?<div class="seg wrap" role="group" aria-label="How often">' + Object.keys(F.FREQS).map(function (k) {
          return '<button type="button" class="' + (P.freq === k ? 'on' : '') + '" aria-pressed="' + (P.freq === k) + '" data-a="freq" data-v="' + k + '">' + F.FREQS[k].label + '</button>'; }).join('') + '</div></div>' +
        field('Next payday', 'nextPay', { type: 'date' }) + '</div>' + wizNext(1);
    },
    basics: function () {
      var picks = [1500, 2000, 2500, 3000, 3500];
      return wizardHead(2, 'Bills and basics', 'About how much goes to rent, utilities, phone, insurance, groceries and gas each month? A rough number is fine. You can list bills one by one later.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Each month, about', 'basics', { ph: '2000', min: 0 }) +
        '<div class="chips">' + picks.map(function (v) { var on = num(P.basics) === v; return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-a="basicpick" data-v="' + v + '">' + money(v) + '</button>'; }).join('') + '</div>' +
        '<p style="font-size:13px">Leave out debt payments; those come next.</p></div>' + wizNext(2);
    },
    bills: function () {
      var total = P.bills.reduce(function (t, b) { return t + num(b.amount); }, 0);
      return wizardHead(0, 'Your bills, one by one', 'Monthly amounts. Include groceries and gas here. Leave anything blank that you don’t pay. Skip debt payments; those come next.') +
        '<div class="card stack" style="padding:16px 18px;gap:12px">' + P.bills.map(function (b, i) {
          return '<div class="rowedit"><input type="text" aria-label="Bill name" data-f="x" data-list="bills" data-i="' + i + '" data-k="name" value="' + esc(b.name) + '" placeholder="Bill">' +
            '<input type="number" inputmode="decimal" aria-label="' + esc(b.name || 'Bill') + ' per month" data-f="x" data-list="bills" data-i="' + i + '" data-k="amount" value="' + esc(b.amount) + '" placeholder="$0">' +
            '<button type="button" class="x" data-a="rm" data-v="bills" data-i="' + i + '" aria-label="Remove ' + esc(b.name || 'bill') + '">×</button></div>';
        }).join('') + '<button type="button" class="outline" style="min-height:44px;font-size:15px" data-a="add" data-v="bills">+ Add a bill</button>' +
        '<div class="row" style="border:0;padding:4px 0 0"><span style="color:var(--muted)">Total per month</span><b data-total="bills">' + money(total) + '</b></div></div>' + wizNext(0);
    },
    debts: function () {
      return wizardHead(3, 'Your debts', 'Credit cards, car loan, student loans, buy-now-pay-later, medical bills. Not your home; that’s Step 6. Your card and loan apps show each balance and minimum. Interest is optional.') +
        (P.debts.length ? P.debts.map(function (d, i) {
          var at = function (k, label, ph, type) { return '<label class="field" style="font-size:13px">' + label + '<input type="' + (type || 'number') + '"' + (type ? '' : ' inputmode="decimal"') + ' data-f="x" data-list="debts" data-i="' + i + '" data-k="' + k + '" value="' + esc(d[k]) + '" placeholder="' + ph + '"></label>'; };
          return '<div class="card stack" style="padding:14px 18px;gap:10px">' + at('name', 'Name', 'Credit card', 'text') +
            '<div class="grid3">' + at('bal', 'Balance', '$0') + at('min', 'Minimum / mo', '$0') + at('apr', 'Interest %', 'Not sure') + '</div>' +
            '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="rm" data-v="debts" data-i="' + i + '">Remove</button></div>';
        }).join('') : '<div class="note">' + ICON.info + '<span>No debts? That’s great. Tap Next.</span></div>') +
        '<button type="button" class="outline" style="min-height:48px" data-a="add" data-v="debts">+ Add a debt</button>' + wizNext(3);
    },
    savings: function () {
      return wizardHead(0, 'Savings and giving', 'Money set aside for emergencies, not retirement. Under $1,000? You’ll start on Step 1.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Emergency savings right now', 'savings', { ph: '0', min: 0 }) +
        '<div class="field">Include giving in your plan?<div class="seg" role="group" aria-label="Giving">' + [[0, 'Not now'], [2, '2%'], [5, '5%'], [10, '10%']].map(function (g) {
          return '<button type="button" class="' + (P.givingPct === g[0] ? 'on' : '') + '" aria-pressed="' + (P.givingPct === g[0]) + '" data-a="giving" data-v="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
        '<p style="font-size:13px">Giving comes off the top of each paycheck. You can change it anytime.</p></div>' + wizNext(0);
    },
    fun: function () {
      return wizardHead(0, 'Fun money', 'Eating out, coffee, subscriptions, shopping, entertainment: your wants for a month. Not sure? Import a bank file and we’ll help you see it.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Fun money per month', 'fun', { ph: '300', min: 0 }) + '</div>' + wizNext(0);
    },

    reveal: function () {
      var p = profile(), o = F.outlook(p, today()), pl = o.plan, rows = [];
      var head, sub;
      if (o.target) {
        var gap = o.debtFree && o.debtFreeMins ? F.daysBetween(o.debtFree, o.debtFreeMins) : 0;
        head = o.debtFree ? 'Debt-free by ' + shortDate(o.debtFree) : 'Let\u2019s find more room';
        sub = o.debtFree ? (o.debtFreeMins ? (gap > 0 ? span(gap) + ' sooner than paying minimums.' : 'Right on schedule.') : 'Minimum payments alone would never get you there.') : 'Right now your paycheck doesn\u2019t cover everything. We\u2019ll find the money together.';
        if (o.step === 1 && o.cushion) rows.push(['First: your $1,000 cushion', shortDate(o.cushion)]);
        if (o.targetDone) rows.push(['Then ' + esc(o.target.name) + ' is gone', longDate(o.targetDone)]);
      } else {
        head = 'No debt to pay off'; sub = 'Nice. Your plan starts with savings.';
        if (o.cushion && o.step === 1) rows.push(['Your $1,000 cushion', shortDate(o.cushion)]);
        if (o.safetyNet) rows.push(['Full safety net (3 months)', shortDate(o.safetyNet)]);
      }
      return '<div class="eyebrow" style="margin-top:20px">Your countdown</div>' +
        '<div class="lime pop"><div style="font-weight:600">Find Me the Money</div><div style="font-family:var(--display);font-size:38px;font-weight:500;line-height:1.1;margin-top:8px">' + head + '</div><div style="font-weight:600;margin-top:8px">' + sub + '</div></div>' +
        (rows.length ? '<div class="card">' + rows.map(function (r) { return '<div class="row"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' : '') +
        '<div class="note">' + ICON.info + '<span>This is an estimate from three answers. It sharpens as you add your savings and fun money; the 7-Day Money Reset walks you through it, a couple of minutes a day.</span></div>' +
        (pl.tight ? '<p style="font-size:14px;color:var(--warn)">Your paycheck doesn\u2019t cover everything yet. That\u2019s exactly what we\u2019re here to fix.</p>' : '') +
        '<div class="push"><button type="button" class="primary" data-a="finish">Start my plan</button><button type="button" class="textbtn" data-a="go" data-v="debts">Change my answers</button></div>';
    },
    install: function () {
      var ios = isIOS();
      return back(U.wizReturn || 'home') + '<div class="stack" style="gap:6px"><h2>Add it to your Home Screen</h2><p>' + (ios ? 'On iPhone, Safari can clear saved data from websites you haven\u2019t opened in about a week. Apps on your Home Screen are safe, and they open like a real app.' : 'It opens like a real app and is one tap away on payday.') + '</p></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + (ios ? [
          ['1', 'Tap ' + ICON.share + ' <b>Share</b> at the bottom of Safari.'], ['2', 'Scroll down and tap <b>Add to Home Screen</b>.'], ['3', 'Tap <b>Add</b>, then open Find Me the Money from your Home Screen.']]
          : [['1', 'Open your browser\u2019s menu (the \u22ee or \u2026 button).'], ['2', 'Tap <b>Install app</b> or <b>Add to Home screen</b>.'], ['3', 'Open Find Me the Money from your Home Screen.']]).map(function (x) {
          return '<div class="check" style="align-items:center"><span class="dot today" aria-hidden="true">' + x[0] + '</span><span>' + x[1] + '</span></div>'; }).join('') + '</div>' +
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
        '<button type="button" class="textbtn" data-a="help" style="align-self:flex-start">' + (U.showHelp ? 'Hide tips' : 'How do I download a CSV?') + '</button>' +
        (U.showHelp ? '<div class="card stack" style="padding:14px 18px;font-size:14px;color:var(--muted);gap:8px">' +
          '<span>Most banks only offer this on their <b>website</b>, not the app. Log in on a computer or in your phone’s browser.</span>' +
          '<span>Look for <b>Download</b>, <b>Export</b> or a download icon on your account activity. Pick <b>CSV</b> and the last 30 days.</span>' +
          '<span>Apple Card: Wallet → Apple Card → Card Balance → a monthly statement → Export Transactions → CSV.</span>' +
          '<span>Use the account you spend from most. You can add another file later.</span></div>' : '') +
        '<div class="push"><button type="button" class="textbtn" data-a="go" data-v="' + (U.wizReturn || 'home') + '">Skip for now</button></div>';
    },
    sort: function () {
      var q = spending().unsorted, done = U.sortHist.length, total = q.length + done, cur = q[0];
      if (!cur) return V.found();
      return back(P.setupDone ? 'home' : 'import') + '<div class="stack" style="gap:6px"><div class="eyebrow">Sort your spending · ' + (done + 1) + ' of ' + total + '</div><h2>Need or want?</h2>' +
        '<p>You decide. Swipe right for a need, left for a want. Every purchase at this store gets sorted the same way.</p></div>' +
        '<div class="bar" style="flex:none"><i style="width:' + (done / total * 100) + '%"></i></div>' +
        '<div class="swipe-wrap">' + (q[1] ? '<div class="swipe-next" aria-hidden="true"></div>' : '') +
        '<div class="swipe-card" data-swipe="1"><span class="swipe-hint want" aria-hidden="true">Want</span><span class="swipe-hint need" aria-hidden="true">Need</span>' +
        '<span style="font-family:var(--display);font-size:30px;font-weight:500;letter-spacing:-.02em;line-height:1.15">' + esc(cur.m) + '</span>' +
        '<span class="big" style="font-size:52px">' + money2(cur.total) + '</span>' +
        '<span style="color:var(--muted);font-size:15px">' + plural(cur.count, 'purchase') + '</span></div></div>' +
        '<div class="sortbtns"><button type="button" class="sortbtn want" data-a="pick" data-v="want">← Want</button><button type="button" class="sortbtn need" data-a="pick" data-v="need">Need →</button></div>' +
        '<div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap">' +
        '<button type="button" class="textbtn" data-a="pick" data-v="skip">Not spending (a transfer or payment)</button>' +
        (done ? '<button type="button" class="textbtn" data-a="undo">Undo ' + esc(U.sortHist[done - 1]) + '</button>' : '') + '</div>';
    },
    found: function () {
      var s = spending(), wants = Math.round(s.monthly.want / 10) * 10;
      if (U.limit == null) U.limit = Math.round(wants * 2 / 3 / 10) * 10;
      var found = Math.max(0, wants - U.limit);
      return '<div class="eyebrow" style="margin-top:12px">Based on ' + s.days + ' days of spending</div>' +
        '<div class="lime pop"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600">Find Me the Money</span><span style="font-size:12px;font-weight:600">found me</span></div>' +
        '<div class="big" style="font-size:64px;margin-top:10px" data-live="found">' + money(found) + '</div><div style="font-weight:600;font-size:17px" data-live="foundyr">every month · ' + money(found * 12) + ' a year</div></div>' +
        '<div class="card stack" style="padding:16px 18px;gap:10px"><div class="row" style="border:0;padding:0"><span>You marked as wants</span><b>' + money(wants) + ' / mo</b></div>' +
        '<label class="field" style="font-weight:500">Your new fun-money limit: <b data-live="limit" style="color:var(--ink)">' + money(U.limit) + ' / mo</b>' +
        '<input type="range" min="0" max="' + Math.max(10, wants) + '" step="10" value="' + U.limit + '" data-range="limit"></label>' +
        '<p style="font-size:13px">Slide to choose. You still get wants, just on purpose. The difference goes to your plan.</p></div>' +
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
      var rows = pl.rows.map(function (r) { return { label: esc(r.label), amount: r.amount, strong: r.kind === 'give' || r.kind === 'goal' }; }).concat([{ label: last, amount: Math.max(0, pl.extra), hero: true }]);
      return back(P.setupDone ? 'home' : 'import') + '<div class="eyebrow" style="margin-top:8px">Your Payday Plan · Step ' + step + ' of 7</div><h2>Every paycheck: ' + money(p.paycheck) + '. Every dollar has a job.</h2>' +
        '<p style="font-size:14px">' + (step === 1 ? 'First, $1,000 for emergencies, so a flat tire doesn’t go on a credit card. Then every spare dollar attacks debt.' : step === 2 ? 'Your cushion is in place. Every spare dollar goes to your smallest debt first.' : step === 3 ? 'No debt to attack. Every spare dollar builds 3 months of expenses.' : 'Debt-free with a full safety net. Time to invest 15% and give generously.') + '</p>' +
        '<div class="card">' + rows.map(function (r) { return '<div class="row' + (r.hero ? ' hero-row' : '') + '" style="padding-block:10px"><span style="' + (r.strong || r.hero ? 'font-weight:600' : 'color:var(--muted)') + '">' + r.label + '</span><b>' + money(r.amount) + '</b></div>'; }).join('') + '</div>' +
        '<div class="left' + (pl.tight ? ' tight' : '') + '"><span>Left to assign</span><span>' + (pl.tight ? '–' + money(-pl.extra) : '$0 ✓') + '</span></div>' +
        (pl.tight ? '<p style="font-size:14px;color:var(--warn)">This paycheck doesn’t cover everything yet. Lower your fun money or a flexible bill, or look for money in your bank file.</p>' : '') +
        '<button type="button" class="textbtn" data-a="goalnew" style="align-self:center">' + (P.goals.length ? 'Your goals: ' + P.goals.length + ' of 3 · add another' : '+ Add a goal: a trip, a car, a gift') + '</button>' +
        '<div class="push"><button type="button" class="primary" data-a="' + (P.setupDone ? 'go" data-v="home' : 'finish') + '">' + (P.setupDone ? 'Done' : 'Start my plan') + '</button></div>';
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
        (f.kind === 'fund' ? '<div class="field">Needed in<div class="seg" role="group" aria-label="Needed in" style="align-self:flex-start">' + [3, 6, 12].map(function (m) {
          return '<button type="button" class="' + (f.months === m ? 'on' : '') + '" aria-pressed="' + (f.months === m) + '" data-a="gmonths" data-v="' + m + '">' + m + ' months</button>'; }).join('') + '</div></div>' : '') +
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
      else if (step === 3) prog = [Math.min(1, p.savings / pl.safetyNet), money(p.savings) + ' saved', money(pl.safetyNet) + ' goal (3 months)'];
      var vs = '';
      if (o.debtFree && o.debtFreeMins && step <= 2) {
        var nxt = step === 2 ? o.state.debts.filter(function (d) { return d.bal > 0 && d.id !== o.target.id; }).sort(function (a, b) { return a.bal - b.bal; })[0] : null;
        var lead = step === 1 ? 'Then debt-free ' + shortDate(o.debtFree) + ', ' : (nxt ? 'Next up: ' + esc(nxt.name) + '. ' : 'Last one! ') + 'Debt-free ' + shortDate(o.debtFree) + ', ';
        var gap = F.daysBetween(o.debtFree, o.debtFreeMins);
        vs = lead + (gap > 0 ? '<b style="color:var(--sun-soft)">' + span(gap) + ' sooner</b> than paying minimums' : 'right on schedule');
      } else if (o.debtFree && !o.debtFreeMins && step <= 2) vs = 'Debt-free ' + shortDate(o.debtFree) + '. Minimum payments alone would never get you there.';
      var hero = '<div class="dark stack" style="gap:14px;border-radius:24px;padding:22px"><div class="sub" style="font-weight:500">' + h.label + '</div>' +
        (cd ? '<div class="cd" style="grid-template-columns:repeat(' + cd.length + ',minmax(0,1fr))">' + cd.map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div><div style="font-size:15px">on ' + longDate(h.date) + '</div>'
          : step >= 4 ? '<div style="font-family:var(--display);font-size:36px;line-height:1.1;color:var(--sun-soft)">Debt-free with a full safety net.</div>'
          : '<div style="font-family:var(--display);font-size:26px;color:var(--sun-soft)">Your plan needs a little more room. Check your Payday Plan.</div>') +
        (prog ? '<div class="pbar"><i style="width:' + Math.max(1, prog[0] * 100) + '%"></i></div><div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.72)"><span>' + prog[1] + '</span><span>' + prog[2] + '</span></div>' : '') +
        (vs ? '<div style="font-size:14px;color:rgba(255,255,255,.88);border-top:1px solid rgba(255,255,255,.18);padding-top:12px">' + vs + '</div>' : '') + '</div>';
      var toast = U.toast ? (U.toast[2] ? '<div class="sunburst" aria-hidden="true"></div>' : '') + '<div class="toast pop' + (U.toast[2] ? ' win' : '') + '" role="status"><b>' + U.toast[0] + '</b>' + U.toast[1] + '</div>' : '';
      var where = step === 1 ? 'Starter Cushion' : step === 2 ? esc(o.target.name) : step === 3 ? 'Full Safety Net' : 'investing';
      var payday = '<div class="card stack" style="padding:14px 18px"><div style="display:flex;justify-content:space-between;align-items:center"><b>' + (due ? (F.daysBetween(F.fromIso(F.paydayFor(P.nextPay, P.freq, now)), now) > 0 ? 'Check-in time' : 'It’s payday!') : 'Next payday') + '</b><span style="font-size:14px;color:var(--muted)">' + dayMonth(due ? F.fromIso(F.paydayFor(P.nextPay, P.freq, now)) : next) + '</span></div>' +
        '<div style="font-size:14px;color:var(--muted)">' + money(p.paycheck) + ' in · ' + money(Math.max(0, pl.extra)) + ' to ' + where + '</div>' +
        '<button type="button" class="' + (due ? 'primary' : 'outline') + '" style="min-height:50px" data-a="checkin">' + (due ? (sv.count ? 'Check in \u00b7 make it ' + (sv.count + 1) + ' in a row' : 'Check in and start my streak') : 'Update my balances') + '</button></div>';
      var maxPer = Math.max(0, Math.min(500, Math.floor(Math.max(0, pl.extra + o.plan.rows.filter(function (r) { return r.kind === 'goal'; }).reduce(function (t2, r) { return t2 + r.amount; }, 0)) / 10) * 10));
      var goals = '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0 0 4px"><h3>Your goals</h3><span style="font-size:13px;color:var(--faint)">' + P.goals.length + ' of 3</span></div>' +
        (P.goals.length ? P.goals.map(function (g, i) {
          var go2 = o.goals[i], done = num(g.saved) >= g.amount;
          var slider = g.kind === 'dream' && !done && step <= 2 ? (maxPer ? '<label class="field" style="font-weight:500;font-size:13px">Put toward it now: <b data-gv="' + g.id + '" style="color:var(--ink)">' + money(g.per || 0) + ' per paycheck</b>' +
            '<input type="range" min="0" max="' + maxPer + '" step="10" value="' + Math.min(g.per || 0, maxPer) + '" data-slide="' + g.id + '"></label>' : '') : '';
          return '<div class="debt"><div class="top"><span>' + esc(g.name) + '<span class="tag">' + (g.kind === 'fund' ? 'Plan-for-it' : 'Dream') + '</span></span><b>' + money(num(g.saved)) + ' of ' + money(g.amount) + '</b></div>' +
            '<div class="bar goalbar" style="flex:none"><i style="width:' + Math.max(1, num(g.saved) / g.amount * 100) + '%"></i></div>' +
            '<div style="font-size:13px;color:var(--muted)" data-gp="' + g.id + '">' + (done ? 'Fully funded. Go enjoy it.' : goalText(g, go2, o)) + '</div>' + slider +
            '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="goaldel" data-i="' + i + '">Remove</button></div>';
        }).join('') : '<p style="font-size:14px;padding:4px 0 2px">A trip, a car, a concert, a gift. Name it and we’ll give it a date.</p>') +
        (P.goals.length < 3 ? '<button type="button" class="outline" style="min-height:44px;margin:8px 0 12px;font-size:15px" data-a="goalnew">+ Add a goal</button>' : '') + '</div>';
      var snow = o.state.debts.length ? '<div class="card"><div class="row" style="border:0;padding-bottom:2px"><h3>Debt snowball</h3><span style="font-size:13px;color:var(--faint)">smallest first</span></div>' +
        o.state.debts.slice().sort(function (a, b) { return a.bal - b.bal; }).sort(function (a, b) { return (a.bal <= 0) - (b.bal <= 0); }).map(function (d) {
          var d0 = P.debts.filter(function (x) { return x.id === d.id; })[0], orig = Math.max(num(d0.orig), d.bal) || 1, paid = d.bal <= 0, isT = o.target && o.target.id === d.id && step === 2;
          return '<div class="debt' + (paid ? ' paid' : '') + '"><div class="top"><span>' + esc(d.name) + (isT ? '<span class="target">Snowball target</span>' : '') + '</span><b>' + (paid ? 'Paid off' : money(d.bal)) + '</b></div>' +
            '<div class="bar" style="flex:none"><i style="width:' + Math.max(paid ? 100 : 1, (orig - d.bal) / orig * 100) + '%"></i></div></div>';
        }).join('') + '</div>' : '';
      var sp = P.tx.length ? spending() : null;
      var nw = sp ? '<button type="button" class="card" data-a="' + (sp.unsorted.length ? 'sortstart' : 'go" data-v="spend') + '" style="text-align:left;width:100%;padding:16px 18px;display:flex;flex-direction:column;gap:10px">' +
          '<span style="display:flex;justify-content:space-between;align-items:center;width:100%"><span style="font-family:var(--display);font-weight:600;font-size:18px">' + (sp.unsorted.length ? 'Finish sorting your spending' : 'Needs vs wants') + '</span><span style="font-size:13px;color:var(--faint)">Open ›</span></span>' + splitHtml(sp.t) +
          '<span style="font-size:14px;color:var(--muted)">' + (sp.unsorted.length ? plural(sp.unsorted.length, 'store') + ' left to sort' : '<span class="key c-need"></span>Needs ' + money(sp.monthly.need) + '/mo &nbsp;<span class="key c-want"></span>Wants ' + money(sp.monthly.want) + '/mo') + '</span></button>'
        : '<button type="button" class="card" data-a="go" data-v="import" style="text-align:left;width:100%;padding:16px 18px;display:flex;flex-direction:column;gap:6px"><span style="font-family:var(--display);font-weight:600;font-size:18px">See where your money goes</span><span style="font-size:14px;color:var(--muted)">Import a bank CSV and sort it into needs and wants. Read on this phone, never uploaded.</span></button>';
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px"><span class="brand"><span class="logo" style="width:30px;height:30px;border-radius:10px">' + ICON.logo + '</span>Find Me the Money</span>' +
        '<button type="button" class="back" data-a="go" data-v="settings" aria-label="Settings">' + ICON.gear + '</button></div>' + toast + celebration(1) + hero + todayStep() + payday + streakCard() + checklist() + goals + snow + nw +
        '<button type="button" class="card" data-a="go" data-v="plan" style="text-align:left;width:100%;padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><span style="font-family:var(--display);font-weight:600;font-size:18px">Payday Plan</span><span style="font-size:13px;color:var(--faint)">' + (pl.tight ? 'Needs attention ›' : 'Every dollar has a job ›') + '</span></button>' +
        '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0"><div style="min-width:0"><b>Step ' + Math.min(step, 7) + ' of 7: ' + F.STEPS[Math.min(step, 7) - 1][0] + '</b><small>' + F.STEPS[Math.min(step, 7) - 1][1] + '</small></div>' +
        '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px;white-space:nowrap" data-a="ladder" aria-expanded="' + !!U.showLadder + '">' + (U.showLadder ? 'Hide' : 'All 7 steps') + '</button></div>' + (U.showLadder ? ladderHtml(step) : '') + '</div>' +
        '<p class="fine">Find Me the Money is an educational budgeting tool, not financial, tax or investment advice.</p>';
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
          var tap = !x.future && F.daysBetween(F.fromIso(x.iso), now) <= 1;
          return tap ? '<button type="button" class="dot' + (x.done ? ' on' : '') + (x.today ? ' today' : '') + '" aria-pressed="' + x.done + '" aria-label="Day ' + (i + 1) + (x.done ? ', done' : '') + '" data-a="chdot" data-v="' + c.uid + '" data-d="' + x.iso + '">' + (x.done ? ICON.check('#fff', 12) : i + 1) + '</button>'
            : '<span class="dot' + (x.done ? ' on' : '') + (x.future ? ' future' : '') + '" aria-label="Day ' + (i + 1) + (x.done ? ', done' : '') + '">' + (x.done ? ICON.check('#fff', 12) : i + 1) + '</span>';
        }).join('') + '</div>' + (st.canMark ? '<button type="button" class="primary" style="min-height:48px" data-a="chdot" data-v="' + c.uid + '" data-d="' + F.isoDay(now) + '">I did it today</button>' : st.marked ? '<p style="font-size:13px">Today\u2019s done. See you tomorrow.</p>' : '');
        else if (d.kind === 'count') body = st.canMark ? '<button type="button" class="primary" style="min-height:48px" data-a="chplus" data-v="' + c.uid + '">+1 \u00b7 ' + act + '</button>' : '';
        else if (d.kind === 'clean') body = U.slip === c.uid ? '<div class="grid2"><button type="button" class="outline" data-a="chslipno">Never mind</button><button type="button" class="primary danger" data-a="chslip" data-v="' + c.uid + '">Yes, it happened</button></div>'
          : '<button type="button" class="textbtn" style="align-self:flex-start;min-height:36px;padding:0" data-a="chslipask" data-v="' + c.uid + '">' + act + '</button>';
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
      var earnPick = pick.filter(function (d) { return d.tag === 'Earn'; }), restPick = pick.filter(function (d) { return d.tag !== 'Earn'; });
      return '<div style="margin-top:8px"><div class="eyebrow">Small, winnable sprints</div><h2>Challenges</h2><p style="margin-top:6px">Pick up to 3 at a time. Finish one and you get a card to share.</p></div>' + (U.pitw ? pitwHtml() : '') + celebration(1, 'challenge') +
        (active.length ? active.map(card).join('') : '<div class="note">' + ICON.info + '<span>No challenge running. Start one below; the 7-day ones are a great first win.</span></div>') +
        (active.length >= 3 ? '<p style="margin-top:10px">You\u2019re running 3. Finish or stop one to start another.</p>' : '') +
        (earnPick.length ? '<h3 style="margin-top:10px">Earn more</h3><p style="font-size:14px;margin-top:-4px">Cutting has a limit. Earning doesn\u2019t. Track every dollar and put it to work.</p>' + earnPick.map(startCard).join('') : '') +
        (restPick.length ? '<h3 style="margin-top:10px">Spend less, save more</h3>' + restPick.map(startCard).join('') : '') +
        (done.length ? '<h3 style="margin-top:10px">Finished</h3><div class="card">' + done.map(function (c) {
          var d = F.challengeDef(c.id), ok = c.ended === 'done';
          return '<div class="row"><div style="min-width:0">' + d.title + '<small>' + (ok ? 'Completed ' : c.ended === 'quit' ? 'Stopped ' : 'Ended ') + dayMonth(F.fromIso(c.endedOn)) + (c.note ? ' \u00b7 ' + esc(c.note) : '') + '</small></div>' +
            (ok ? '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px" data-a="sharech" data-v="' + c.uid + '">' + ICON.share + ' Share</button>' : '<button type="button" class="textbtn" style="min-height:36px;padding:0 4px" data-a="chstart" data-v="' + c.id + '"' + (active.length >= 3 || activeIds.indexOf(c.id) >= 0 ? ' disabled' : '') + '>Try again</button>') + '</div>';
        }).join('') + '</div>' : '');
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
            var when = d.done ? 'Done' : d.open ? (i === st.next ? 'Up next' : 'Catch up') : 'Opens ' + dayMonth(F.addDays(F.fromIso(run.start), i));
            var inner = '<span class="dot' + (d.done ? ' on' : '') + (d.open && !d.done ? ' today' : '') + (!d.open ? ' future' : '') + '" aria-hidden="true">' + (d.done ? ICON.check('#fff', 12) : i + 1) + '</span><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">Day ' + (i + 1) + ': ' + d.title + '</span><small style="color:var(--faint)">' + when + '</small></span>';
            return d.open ? '<button type="button" class="planrow" data-a="planopen" data-v="' + run.uid + '" data-i="' + i + '">' + inner + '<span aria-hidden="true">\u203a</span></button>' : '<div class="planrow locked">' + inner + '</div>';
          }).join('') + '</div></div>';
      }).join('');
      return '<div style="margin-top:8px"><div class="eyebrow">One small step a day</div><h2>Plans</h2><p style="margin-top:6px">A short read and one action each day. A new day opens every morning, and you can always catch up.</p></div>' +
        celebration(2, ['plan', 'unlock']) + list + '<p class="fine">More plans are coming.</p>';
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

    milestones: function () {
      var f = facts(), earned = F.BADGES.filter(function (b) { return P.badges[b.id]; }), locked = F.BADGES.filter(function (b) { return !P.badges[b.id]; });
      return '<div style="margin-top:8px"><div class="eyebrow">' + earned.length + ' of ' + F.BADGES.length + ' earned</div><h2>Milestones</h2><p style="margin-top:6px">Little wins along the way. Tap one to share it.</p></div>' + celebration(9, 'badge') +
        (earned.length ? '<div class="grid2">' + earned.map(function (b) {
          return '<button type="button" class="tile medal-tile" data-a="sharebadge" data-v="' + b.id + '"><span class="medal on">' + ICON.medal + '</span><b>' + b.title + '</b><span class="k">' + b.desc + '</span><span class="k" style="color:var(--sun-ink)">' + ICON.share + ' Share</span></button>';
        }).join('') + '</div>' : '') +
        '<h3 style="margin-top:6px">Up next</h3><div class="grid2">' + locked.map(function (b) {
          var pr = F.badgeProgress(b, f);
          return '<div class="tile medal-tile locked"><span class="medal">' + ICON.medal + '</span><b>' + b.title + '</b><span class="k">' + b.desc + '</span>' +
            (pr ? '<span class="bar goalbar" style="flex:none;height:5px"><i style="width:' + Math.max(2, pr.ratio * 100) + '%"></i></span><span class="k">' + pr.label + '</span>' : '') + '</div>';
        }).join('') + '</div>';
    },

    share: function () {
      var c = U.card, hasAmt = c.subNoAmt != null && c.subNoAmt !== c.sub;
      return back(U.shareBack) + '<div class="stack" style="gap:6px"><h2>Share your win</h2><p>Made on this phone. Share it wherever you like, or save it.</p></div>' +
        '<div class="sharewrap">' + (U.cardImg ? '<img src="' + U.cardImg.url + '" alt="' + esc(c.title + '. ' + (U.showAmt ? c.sub : c.subNoAmt || c.sub)) + '">' : '<div class="spinner" aria-label="Making your card"></div>') + '</div>' +
        (hasAmt ? '<div class="field">Dollar amounts<div class="seg" role="group" aria-label="Dollar amounts" style="align-self:flex-start">' + [['1', 'Show'], ['0', 'Hide']].map(function (o) {
          var on = (U.showAmt ? '1' : '0') === o[0]; return '<button type="button" class="' + (on ? 'on' : '') + '" aria-pressed="' + on + '" data-a="shareamt" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>' : '') +
        '<button type="button" class="primary" data-a="doshare"' + (U.cardImg ? '' : ' disabled') + '>' + ICON.share + ' Share</button>' +
        '<button type="button" class="outline" data-a="saveimg"' + (U.cardImg ? '' : ' disabled') + '>Save image</button>' +
        '<div class="card stack" style="padding:14px 18px;gap:8px"><span style="font-size:13px;color:var(--faint)">Caption</span><span id="caption">' + esc(caption()) + '</span>' +
        '<button type="button" class="textbtn" style="align-self:flex-start;min-height:32px;padding:0" data-a="copycap">' + (U.copied ? 'Copied' : 'Copy caption') + '</button></div>' +
        (U.shareErr ? '<p role="status" style="font-size:14px;color:var(--muted)">' + U.shareErr + '</p>' : '');
    },
    settings: function () {
      var cal = { weekly: 1, biweekly: 1, semimonthly: 1, monthly: 1 }[P.freq];
      return back('home') + '<h2>Settings</h2>' +
        '<div class="card">' + [['pay', 'Paycheck and payday'], [itemized() ? 'bills' : 'basics', 'Bills and basics'], ['bills', 'List bills one by one'], ['debts', 'Debts'], ['savings', 'Savings and giving'], ['fun', 'Fun money'], ['import', 'Import a bank file'], ['install', 'Add to Home Screen']].map(function (x) {
          return '<button type="button" class="row linkrow" data-a="edit" data-v="' + x[0] + '"><span>' + x[1] + '</span><span aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
        (cal ? '<button type="button" class="outline" data-a="ics">Add payday check-ins to my calendar</button>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:10px"><b>Your data</b><p style="font-size:14px">Everything is saved only on this phone. Save a backup file now and then, in case you switch phones or clear your browser.</p>' +
        '<button type="button" class="outline" data-a="backup">Save a backup file</button><button type="button" class="outline" data-a="go" data-v="restore">Restore from a backup</button>' +
        (U.confirmDelete ? '<div class="note" role="alert" style="border-color:rgba(138,58,30,.4)"><span>This erases your plan from this phone. It can’t be undone unless you have a backup.</span></div><div class="grid2"><button type="button" class="outline" data-a="delno">Keep it</button><button type="button" class="primary danger" data-a="delyes">Erase everything</button></div>'
          : '<button type="button" class="textbtn" style="color:var(--warn)" data-a="del">Delete everything</button>') + '</div>' +
        (CONFIG.feedbackUrl ? '<a class="outline" style="text-decoration:none;color:var(--ink)" href="' + esc(CONFIG.feedbackUrl) + '" target="_blank" rel="noopener">Send feedback</a>' : '') +
        '<a class="textbtn" style="text-align:center;text-decoration:none;display:block;padding-top:12px" href="privacy.html">Privacy</a>' +
        '<p class="fine">An educational budgeting tool, not financial, tax or investment advice. Beta.</p>';
    },
    restore: function () {
      return back(P.setupDone ? 'settings' : 'welcome') + '<h2>Restore from a backup</h2><p>Pick the backup file you saved from Find Me the Money. It replaces what’s on this phone.</p>' +
        '<label class="choice best" style="cursor:pointer"><div class="ic">' + ICON.file + '</div><div><b>Choose backup file</b><span class="d">A .json file named find-me-the-money-backup</span></div><input type="file" accept=".json,application/json" data-file="backup" class="sr"></label>' +
        (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + esc(U.err) + '</p>' : '');
    }
  };

  function goalText(g, go2, o) {
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
    if (n === 1) {
      if (!(num(P.paycheck) > 0)) return 'Enter your take-home pay per paycheck.';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(P.nextPay)) return 'Pick your next payday.';
    }
    if (n === 3) {
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
    snapshot(); save(); track(sr && !sr.repeat ? 'checkin-payday' : 'checkin-update'); U.toast = null; go('wins');
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
    F.BADGES.forEach(function (b) { if (!P.badges[b.id] && b.test(f)) { P.badges[b.id] = iso; P.unseen.push({ type: 'badge', id: b.id }); changed = true; } });
    if (P.challenges.length > 40) P.challenges = P.challenges.filter(function (c) { return !c.ended; }).concat(P.challenges.filter(function (c) { return c.ended; }).slice(-30));
    if (changed) save();
  }
  function unseenItem(u) {
    if (u.type === 'badge') { var b = F.BADGES.filter(function (x) { return x.id === u.id; })[0]; return b ? { eyebrow: 'New milestone', title: b.title, desc: b.desc, share: 'sharebadge', v: b.id } : null; }
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
      return '<div class="toast win stack" role="status" style="gap:8px"><span style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.8">' + it.eyebrow + '</span><b>' + it.title + '</b><span>' + it.desc + '</span>' +
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
  function openShare(card) {
    U.card = card; U.showAmt = true; U.cardImg = null; U.shareErr = ''; U.copied = false;
    if (U.screen !== 'share') U.shareBack = U.screen;
    go('share'); drawCard();
  }
  function drawCard() {
    var c = U.card;
    window.FMTMShare.build({ eyebrow: c.eyebrow, title: c.title, sub: U.showAmt ? c.sub : (c.subNoAmt || c.sub), chips: U.showAmt ? c.chips : (c.chipsNoAmt || c.chips), footer: CONFIG.shareUrl ? CONFIG.shareUrl : null }, function (img) {
      U.cardImg = img; if (U.screen === 'share') render();
    });
  }
  function streakChips() {
    var out = [];
    if ((P.streak.count || 0) >= 2) out.push(P.streak.count + ' paydays in a row');
    if (P.totals.daysBack > 0) out.push('+' + P.totals.daysBack + ' days stolen back');
    return out;
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
  // what's still an estimate, one tap each
  function checklist() {
    var items = [
      ['savings', 'Add your emergency savings', 'Sharpens your $1,000 cushion date', savingsSet()],
      ['fun', 'Set your fun money', 'Right now we\u2019re guessing 10% of your pay', funSet()],
      ['import', 'See where your money goes', 'Import a bank file and sort it', P.tx.length > 0],
      ['bills', 'List your bills one by one', 'Optional: more exact than one number', itemized()]
    ];
    if (!standalone()) items.push(['install', 'Add to your Home Screen', isIOS() ? 'Keeps your plan safe on iPhone' : 'One tap away on payday', !!P.installSeen]);
    var done = items.filter(function (x) { return x[3]; }).length;
    if (done === items.length) return '';
    return '<div class="card" style="padding:14px 18px"><div class="row" style="border:0;padding:0 0 4px"><h3>Make it more accurate</h3><span style="font-size:13px;color:var(--faint)">' + done + ' of ' + items.length + '</span></div>' +
      items.map(function (x) {
        return x[3] ? '<div class="planrow locked"><span class="dot on" aria-hidden="true">' + ICON.check('#fff', 12) + '</span><span style="flex:1"><s style="color:var(--faint)">' + x[1] + '</s></span></div>'
          : '<button type="button" class="planrow" data-a="edit" data-v="' + x[0] + '"><span class="dot today" aria-hidden="true"></span><span style="flex:1;min-width:0"><span style="display:block;font-weight:600">' + x[1] + '</span><small style="color:var(--faint)">' + x[2] + '</small></span><span aria-hidden="true">\u203a</span></button>';
      }).join('') + '</div>';
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

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), i = +b.getAttribute('data-i');
    switch (a) {
      case 'go': if (v === 'sort') U.sortHist = []; U.confirmDelete = false; if (v === 'found') U.limit = null; go(v); break;
      case 'freq': P.freq = v; save(); render(); break;
      case 'giving': P.givingPct = +v; save(); render(); break;
      case 'add':
        if (v === 'bills') P.bills.push({ name: '', amount: '' });
        else P.debts.push({ id: uid(), name: '', bal: '', orig: '', min: '', apr: '' });
        save(); render(); break;
      case 'rm': P[v].splice(i, 1); save(); render(); break;
      case 'wiz':
        var n = +v; U.err = validate(n);
        if (U.err) { render(); break; }
        if (n === 3) P.debts.forEach(function (d) { if (num(d.bal) > num(d.orig)) d.orig = num(d.bal); });
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
      case 'undo': delete P.sorted[U.sortHist.pop()]; save(); render(); break;
      case 'tog': (function (m) { P.sorted[m] = v; storeTx(m).forEach(function (x) { delete x.b; }); })(b.getAttribute('data-m')); save(); render(); break;
      case 'storeopen': (function (m) { U.openStore = U.openStore === m ? null : m; })(b.getAttribute('data-m')); render(); break;
      case 'ttog': (function (x) {
        x.b = v; var list = storeTx(x.merchant);
        // Every purchase agrees again: fold it back into a plain store setting.
        if (list.every(function (y) { return y.b === v; })) { P.sorted[x.merchant] = v; list.forEach(function (y) { delete y.b; }); }
      })(P.tx[i]); save(); render(); break;
      case 'filter': U.filter = v; render(); break;
      case 'setfun': P.fun = U.limit; save(); go(U.wizReturn === 'planday' ? 'planday' : 'home'); break;
      case 'finish':
        P.setupDone = true; P.badges.plan = P.badges.plan || F.isoDay(today());
        if (!P.plans.some(function (p) { return p.id === 'reset7'; })) P.plans.push({ uid: uid(), id: 'reset7', start: F.isoDay(today()), done: [] });
        snapshot(); save(); track('setup-done');
        U.toast = ['Your plan is ready.', 'Next: Day 1 of your 7-Day Money Reset. It takes 2 minutes.', true]; go('home'); break;
      case 'edit': U.wizReturn = U.screen === 'planday' ? 'planday' : U.screen; U.err = ''; go(v); break;
      case 'basicpick': P.basics = v; save(); render(); break;
      case 'ladder': U.showLadder = !U.showLadder; render(); break;
      case 'installdone': P.installSeen = true; save(); go(U.wizReturn || 'home'); break;
      case 'openunlock': markSeen('unlock:' + v); go(v); break;
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
      case 'gmonths': U.form.months = +v; render(); break;
      case 'goalsave':
        var nm = String(U.form.name || '').trim(), amt = Math.round(num(U.form.amount));
        if (!nm || !(amt > 0)) { U.formErr = 'Give your goal a name and an amount above $0.'; render(); break; }
        if (P.goals.length >= 3) { U.formErr = 'You can have 3 goals at a time. Finish or remove one first.'; render(); break; }
        P.goals.push({ id: uid(), name: nm, amount: amt, kind: U.form.kind, months: U.form.months, per: 0, saved: 0 });
        save(); track('goal'); go(U.next); break;
      case 'goaldel': P.goals.splice(i, 1); save(); render(); break;
      case 'checkin': P.prevBalances = P.prevBalances || {}; go('checkin'); break;
      case 'checkdone': checkDone(); break;
      case 'ics': download('find-me-the-money-paydays.ics', 'text/calendar', icsFile()); break;
      case 'backup': download('find-me-the-money-backup-' + F.isoDay(today()) + '.json', 'application/json', JSON.stringify(P, null, 2)); break;
      case 'del': U.confirmDelete = true; render(); break;
      case 'delno': U.confirmDelete = false; render(); break;
      case 'chstart':
        if (P.challenges.filter(function (c) { return !c.ended; }).length >= 3) break;
        P.challenges.push({ uid: uid(), id: v, start: F.isoDay(today()), marks: [], amount: 0 }); save(); track('challenge-start'); render(); break;
      case 'chdot':
        var cd = P.challenges.filter(function (c) { return c.uid === v; })[0], dd = b.getAttribute('data-d'), at = cd.marks.indexOf(dd);
        if (at >= 0) cd.marks.splice(at, 1); else cd.marks.push(dd);
        save(); render(); break;
      case 'chplus': var cp = P.challenges.filter(function (c) { return c.uid === v; })[0]; cp.marks.push(F.isoDay(today()) + '#' + cp.marks.length); save(); render(); break;
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
        var rp = P.plans.filter(function (p) { return p.uid === U.planUid; })[0];
        if (rp.done.indexOf(U.planDay) < 0) rp.done.push(U.planDay);
        save(); track('plan-day'); go('plans'); break;
      case 'planact':
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
      case 'doshare':
        var file = new File([U.cardImg.blob], 'find-me-the-money-win.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: caption() }).then(function () { P.shares = (P.shares || 0) + 1; save(); }).catch(function (err) { if (err && err.name !== 'AbortError') { U.shareErr = 'Sharing didn\u2019t open here. Use Save image, then share it from your photos.'; render(); } });
        } else { U.shareErr = 'This browser can\u2019t share images directly. Use Save image, then share it from your photos.'; render(); }
        track('share'); break;
      case 'saveimg': P.shares = (P.shares || 0) + 1; save(); download('find-me-the-money-win.png', 'image/png', U.cardImg.blob); track('share-save'); break;
      case 'copycap':
        var txt = caption();
        var ok = function () { U.copied = true; render(); };
        try { navigator.clipboard.writeText(txt).then(ok, function () { selectCaption(); }); } catch (err) { selectCaption(); }
        break;
      case 'delyes': try { localStorage.removeItem(CONFIG.storageKey); } catch (err) {} P = blank(); U.confirmDelete = false; U.toast = null; go('welcome'); break;
    }
  });

  // typing updates the saved data in place, so the keyboard never loses its place
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (U.err) { U.err = ''; var al = app.querySelector('[role=alert]'); if (al) al.remove(); }
    if (t.hasAttribute('data-f')) {
      if (t.hasAttribute('data-list')) P[t.getAttribute('data-list')][+t.getAttribute('data-i')][t.getAttribute('data-k')] = t.value;
      else P[t.getAttribute('data-f')] = t.value;
      save();
      var tot = app.querySelector('[data-total="bills"]');
      if (tot) tot.textContent = money(P.bills.reduce(function (s, b) { return s + num(b.amount); }, 0));
      return;
    }
    if (t.hasAttribute('data-g')) { U.form[t.getAttribute('data-g')] = t.value; return; }
    if (t.hasAttribute('data-range')) {
      U.limit = +t.value;
      var wants = Math.round(spending().monthly.want / 10) * 10, found = Math.max(0, wants - U.limit);
      app.querySelector('[data-live="limit"]').textContent = money(U.limit) + ' / mo';
      app.querySelector('[data-live="found"]').textContent = money(found);
      app.querySelector('[data-live="foundyr"]').textContent = 'every month · ' + money(found * 12) + ' a year';
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
      P.tx = r.tx.map(function (x) { return { date: x.date, merchant: x.merchant, amount: x.amount }; }); P.txFrom = r.from; P.txTo = r.to;
      save(); track('import'); U.sortHist = []; U.limit = null; go('sort');
    });
    if (t.getAttribute('data-file') === 'backup') readFile(t, function (text) {
      try { var d = JSON.parse(text); if (!d || d.v !== 1 || !Array.isArray(d.debts)) throw new Error('bad'); P = Object.assign(blank(), d); save(); U.toast = ['Backup restored.', 'Welcome back.', false]; go(P.setupDone ? 'home' : 'welcome'); }
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
  app.addEventListener('pointerdown', function (e) {
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
  document.addEventListener('visibilitychange', function () { if (!document.hidden && U.screen === 'home') render(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  render();
})();
