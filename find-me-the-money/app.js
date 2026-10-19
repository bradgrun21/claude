/* Find Me the Money: screens and interactions. All data stays in this browser (localStorage). */
(function () {
  'use strict';
  var F = window.FMTM;

  // ---------- settings for the beta ----------
  var CONFIG = {
    feedbackUrl: '',            // e.g. a Google Form link; the Feedback button hides while this is empty
    storageKey: 'fmtm.v1'
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
      streak: { count: 0, best: 0, grace: 0, lastPayday: null }, totals: { debtPaid: 0, saved: 0, daysBack: 0 }, lastFree: null, prevSavings: null, prevGoals: {} };
  }
  var storageOk = true;
  function load() {
    try { var raw = localStorage.getItem(CONFIG.storageKey); return raw ? Object.assign(blank(), JSON.parse(raw)) : blank(); }
    catch (e) { storageOk = false; return blank(); }
  }
  function save() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(P)); storageOk = true; } catch (e) { storageOk = false; } }
  var P = load();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // a numeric copy of the saved data for the math, with a missed payday rolled forward
  function profile() {
    return {
      paycheck: num(P.paycheck), freq: P.freq, nextPay: F.rollPayday(P.nextPay, P.freq, today()), givingPct: P.givingPct, savings: num(P.savings), fun: num(P.fun),
      bills: P.bills.map(function (b) { return { name: b.name, amount: num(b.amount) }; }),
      debts: P.debts.filter(function (d) { return num(d.bal) > 0 || num(d.orig) > 0; }).map(function (d) { return { id: d.id, name: d.name || 'Debt', bal: num(d.bal), min: num(d.min), apr: num(d.apr) }; }),
      goals: P.goals.map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.kind, months: g.months, per: g.per || 0, saved: num(g.saved) }; })
    };
  }
  function standalone() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  // ---------- screen state (not saved) ----------
  var U = { screen: P.setupDone ? 'home' : 'welcome', toast: null, form: null, formErr: '', err: '', sortHist: [], back: 'home', next: 'home', confirmDelete: false, filter: 'all', showHelp: false };
  var app = document.getElementById('app');
  function render() { app.innerHTML = (V[U.screen] || V.home)(); }
  function go(s) { U.screen = s; U.err = ''; render(); window.scrollTo(0, 0); }

  var ICON = {
    check: function (c, s) { s = s || 14; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="' + c + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><path d="M5 12l5 5L20 7"/></svg>'; },
    back: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    logo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M11 8v6M9 9.5h3a1.2 1.2 0 010 2.4h-2a1.2 1.2 0 000 2.4h3"/></svg>',
    gear: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
    file: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="flex:none;margin-top:1px"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    flame: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
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
    return '<div style="display:flex;align-items:center;gap:12px">' + back(P.setupDone ? 'settings' : n === 1 ? 'welcome' : WIZ[n - 2]) +
      '<div class="bar"><i style="width:' + (n / WIZ.length * 100) + '%"></i></div><span style="font-size:13px;font-weight:600;color:var(--faint)">' + n + ' of ' + WIZ.length + '</span></div>' +
      '<div class="stack" style="gap:8px;margin-top:4px"><h2>' + title + '</h2><p>' + sub + '</p></div>';
  }
  var WIZ = ['pay', 'bills', 'debts', 'savings', 'fun'];
  function wizNext(n) { return '<div class="push">' + (U.err ? '<p role="alert" style="color:var(--warn);font-size:14px">' + U.err + '</p>' : '') + '<button type="button" class="primary" data-a="wiz" data-v="' + n + '">' + (P.setupDone ? 'Save' : 'Next') + '</button></div>'; }

  // needs vs wants from the imported transactions, scaled to one month
  function spending() {
    var days = F.spanDays(P.txFrom, P.txTo), scale = 30.44 / days, t = { need: 0, want: 0, skip: 0, unsorted: 0 };
    var stores = F.storeTotals(P.tx);
    stores.forEach(function (s) { t[P.sorted[s.m] || 'unsorted'] += s.total; });
    return { stores: stores, t: t, days: days, scale: scale, monthly: { need: t.need * scale, want: t.want * scale }, unsorted: stores.filter(function (s) { return !P.sorted[s.m]; }) };
  }
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
    bills: function () {
      var total = P.bills.reduce(function (t, b) { return t + num(b.amount); }, 0);
      return wizardHead(2, 'Monthly bills and basics', 'Monthly amounts. Include groceries and gas here. Leave anything blank that you don’t pay. Skip debt payments; those come next.') +
        '<div class="card stack" style="padding:16px 18px;gap:12px">' + P.bills.map(function (b, i) {
          return '<div class="rowedit"><input type="text" aria-label="Bill name" data-f="x" data-list="bills" data-i="' + i + '" data-k="name" value="' + esc(b.name) + '" placeholder="Bill">' +
            '<input type="number" inputmode="decimal" aria-label="' + esc(b.name || 'Bill') + ' per month" data-f="x" data-list="bills" data-i="' + i + '" data-k="amount" value="' + esc(b.amount) + '" placeholder="$0">' +
            '<button type="button" class="x" data-a="rm" data-v="bills" data-i="' + i + '" aria-label="Remove ' + esc(b.name || 'bill') + '">×</button></div>';
        }).join('') + '<button type="button" class="outline" style="min-height:44px;font-size:15px" data-a="add" data-v="bills">+ Add a bill</button>' +
        '<div class="row" style="border:0;padding:4px 0 0"><span style="color:var(--muted)">Total per month</span><b data-total="bills">' + money(total) + '</b></div></div>' + wizNext(2);
    },
    debts: function () {
      return wizardHead(3, 'Your debts', 'Credit cards, car loan, student loans, buy-now-pay-later, medical bills. Not your home; that’s Step 6. Your card and loan apps show each balance and minimum.') +
        (P.debts.length ? P.debts.map(function (d, i) {
          var at = function (k, label, ph, type) { return '<label class="field" style="font-size:13px">' + label + '<input type="' + (type || 'number') + '"' + (type ? '' : ' inputmode="decimal"') + ' data-f="x" data-list="debts" data-i="' + i + '" data-k="' + k + '" value="' + esc(d[k]) + '" placeholder="' + ph + '"></label>'; };
          return '<div class="card stack" style="padding:14px 18px;gap:10px">' + at('name', 'Name', 'Credit card', 'text') +
            '<div class="grid3">' + at('bal', 'Balance', '$0') + at('min', 'Minimum / mo', '$0') + at('apr', 'Interest %', '0') + '</div>' +
            '<button type="button" class="textbtn" style="min-height:32px;font-size:13px;align-self:flex-start;padding:0" data-a="rm" data-v="debts" data-i="' + i + '">Remove</button></div>';
        }).join('') : '<div class="note">' + ICON.info + '<span>No debts? That’s great. Tap Next.</span></div>') +
        '<button type="button" class="outline" style="min-height:48px" data-a="add" data-v="debts">+ Add a debt</button>' + wizNext(3);
    },
    savings: function () {
      return wizardHead(4, 'Savings and giving', 'Money set aside for emergencies, not retirement. Under $1,000? You’ll start on Step 1.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Emergency savings right now', 'savings', { ph: '0', min: 0 }) +
        '<div class="field">Include giving in your plan?<div class="seg" role="group" aria-label="Giving">' + [[0, 'Not now'], [2, '2%'], [5, '5%'], [10, '10%']].map(function (g) {
          return '<button type="button" class="' + (P.givingPct === g[0] ? 'on' : '') + '" aria-pressed="' + (P.givingPct === g[0]) + '" data-a="giving" data-v="' + g[0] + '">' + g[1] + '</button>'; }).join('') + '</div></div>' +
        '<p style="font-size:13px">Giving comes off the top of each paycheck. You can change it anytime.</p></div>' + wizNext(4);
    },
    fun: function () {
      return wizardHead(5, 'Fun money', 'Eating out, coffee, subscriptions, shopping, entertainment: your wants for a month. Not sure? Import your bank file next and we’ll help you see it.') +
        '<div class="card stack" style="padding:16px 18px;gap:14px">' + field('Fun money per month', 'fun', { ph: '300', min: 0 }) + '</div>' + wizNext(5);
    },

    import: function () {
      return back(P.setupDone ? 'home' : 'fun') + '<div class="stack" style="gap:6px"><div class="eyebrow">Optional · about a minute</div><h2>See where your money went</h2>' +
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
        '<div class="push"><button type="button" class="textbtn" data-a="go" data-v="' + (P.setupDone ? 'home' : 'plan') + '">Skip for now</button></div>';
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
      var shown = s.stores.filter(function (x) { var b = P.sorted[x.m] || 'unsorted'; return b !== 'skip' && (f === 'all' || b === f); }).sort(function (a, b) { return b.total - a.total; });
      var row = function (k, label) { return '<div class="row" style="padding:8px 0"><div><span class="key c-' + (k === 'unsorted' ? 'uns' : k) + '"></span>' + label + '</div><b>' + money(t[k] * s.scale) + '/mo <span style="font-weight:400;color:var(--faint)">' + Math.round(t[k] / all * 100) + '%</span></b></div>'; };
      return back(P.setupDone ? 'home' : 'found') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + s.days + ' days · ' + P.tx.length + ' transactions</div><h2>Needs vs wants</h2><p>Sorted by you. Change any store with its toggle.</p></div>' +
        (s.unsorted.length ? '<button type="button" class="primary" data-a="sortstart">Sort ' + plural(s.unsorted.length, 'store') + ' left</button>' : '') +
        '<div class="card stack" style="padding:18px;gap:8px">' + splitHtml(t) + row('need', 'Needs') + row('want', 'Wants') + (t.unsorted ? row('unsorted', 'Not sorted yet') : '') + '</div>' +
        '<div class="seg" role="group" aria-label="Show" style="align-self:flex-start">' + [['all', 'All'], ['need', 'Needs'], ['want', 'Wants']].map(function (o) {
          return '<button type="button" class="' + (f === o[0] ? 'on' : '') + '" aria-pressed="' + (f === o[0]) + '" data-a="filter" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        '<div class="card">' + (shown.length ? shown.map(function (x) {
          var b = P.sorted[x.m];
          return '<div class="row" style="padding:10px 0"><div style="min-width:0">' + esc(x.m) + '<small>' + plural(x.count, 'purchase') + ' · ' + money2(x.total) + '</small></div>' +
            '<div class="seg mini" role="group" aria-label="' + esc(x.m) + ': need or want">' + ['need', 'want'].map(function (v) {
              return '<button type="button" class="' + (b === v ? 'on ' + v : '') + '" aria-pressed="' + (b === v) + '" data-a="tog" data-m="' + esc(x.m) + '" data-v="' + v + '">' + (v === 'need' ? 'Need' : 'Want') + '</button>'; }).join('') + '</div></div>';
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
      var install = !standalone() && isIOS() ? '<div class="note" style="border-color:rgba(255,159,122,.6)">' + ICON.info + '<span><b>Keep your plan safe:</b> tap ' + ICON.share + ' Share, then <b>Add to Home Screen</b>. Safari can clear saved data from websites you haven’t opened in a week, but not from Home Screen apps.</span></div>' : '';
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
        '<button type="button" class="back" data-a="go" data-v="settings" aria-label="Settings">' + ICON.gear + '</button></div>' + install + toast + hero + streakCard() + payday + goals + snow + nw +
        '<button type="button" class="card" data-a="go" data-v="plan" style="text-align:left;width:100%;padding:16px 18px;display:flex;justify-content:space-between;align-items:center"><span style="font-family:var(--display);font-weight:600;font-size:18px">Payday Plan</span><span style="font-size:13px;color:var(--faint)">' + (pl.tight ? 'Needs attention ›' : 'Every dollar has a job ›') + '</span></button>' +
        '<div class="card" style="padding:14px 18px"><h3 style="margin-bottom:6px">Your 7 steps</h3>' + ladderHtml(step) + '</div>' +
        '<p class="fine">Find Me the Money is an educational budgeting tool, not financial, tax or investment advice.</p>';
    },

    checkin: function () {
      var o = F.outlook(profile(), today());
      return back('home') + '<div class="stack" style="gap:6px"><div class="eyebrow">' + (F.paydayFor(P.nextPay, P.freq, today()) ? 'Payday check-in' : 'Balance update') + ' \u00b7 2 minutes</div><h2>What do your balances say today?</h2>' +
        '<p>Open your bank and card apps and type what they show. We\u2019ll count your wins: debt paid, money saved and days stolen back.</p></div>' +
        (P.debts.length ? '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Debts</b>' + P.debts.map(function (d, i) {
          return '<label class="field">' + esc(d.name) + ' balance<input type="number" inputmode="decimal" data-f="x" data-list="debts" data-i="' + i + '" data-k="bal" value="' + esc(d.bal) + '"></label>'; }).join('') + '</div>' : '') +
        '<div class="card stack" style="padding:16px 18px;gap:12px"><b>Savings</b>' + field('Emergency savings', 'savings') +
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
        (r.paid.length > 1 ? '<p style="text-align:center">Also paid off: ' + r.paid.slice(1).map(esc).join(', ') + '. The snowball grows.</p>' : r.paid.length ? '<p style="text-align:center">That payment now rolls into your next debt. The snowball grows.</p>' : '') +
        (r.daysBack < 0 ? '<div class="note">' + ICON.info + '<span>Your date slipped ' + plural(-r.daysBack, 'day') + '. It happens. Your Payday Plan shows what to adjust before next time.</span></div>' : '') +
        (w.saved < 0 ? '<div class="note">' + ICON.info + '<span>You used some savings. That\u2019s exactly what it\u2019s there for. You\u2019ll rebuild it.</span></div>' : '') +
        '<div class="card" style="padding:16px 18px;display:flex;gap:12px;align-items:center"><span class="flame' + (v.count ? ' lit' : '') + '">' + ICON.flame + '</span><div>' +
        '<div style="font-family:var(--display);font-weight:600;font-size:19px">' + (v.count ? plural(v.count, 'payday') + ' in a row' : 'Payday streak') + (P.streak.grace ? ' <span class="tag">1 grace pass</span>' : '') + '</div><div style="font-size:14px;color:var(--muted)">' + msg + '</div></div></div>' +
        '<div class="card"><div class="row"><span style="font-weight:600">Since you started</span><span></span></div>' +
        '<div class="row"><span style="color:var(--muted)">Debt paid</span><b>' + money(t.debtPaid) + '</b></div><div class="row"><span style="color:var(--muted)">Money saved</span><b>' + money(t.saved) + '</b></div>' +
        '<div class="row"><span style="color:var(--muted)">Days stolen back</span><b style="color:var(--sun-ink)">' + (t.daysBack > 0 ? '+' + t.daysBack : t.daysBack) + '</b></div></div>' +
        '<div class="push"><button type="button" class="primary" data-a="go" data-v="home">Back to my plan</button></div>';
    },
    settings: function () {
      var cal = { weekly: 1, biweekly: 1, semimonthly: 1, monthly: 1 }[P.freq];
      return back('home') + '<h2>Settings</h2>' +
        '<div class="card">' + [['pay', 'Paycheck and payday'], ['bills', 'Bills and basics'], ['debts', 'Debts'], ['savings', 'Savings and giving'], ['fun', 'Fun money'], ['import', 'Import a bank file']].map(function (x) {
          return '<button type="button" class="row linkrow" data-a="go" data-v="' + x[0] + '"><span>' + x[1] + '</span><span aria-hidden="true">›</span></button>'; }).join('') + '</div>' +
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
  function stat(v, label) { return '<div><b>' + v + '</b><span>' + label + '</span></div>'; }
  function streakCard() {
    var v = F.streakView(P.streak, P.nextPay, P.freq, today()), t = P.totals;
    var line = v.state === 'new' ? 'Check in on payday to start your streak.'
      : v.state === 'paused' ? 'Paused. Check in on payday to start a new one. Your best: ' + v.best + '.'
      : v.state === 'due' ? 'It\u2019s payday. Check in to make it ' + (v.count + 1) + ' in a row.'
      : 'Next check-in ' + dayMonth(F.fromIso(P.nextPay)) + (v.grace ? ' \u00b7 1 grace pass saved' : '');
    return '<div class="card stack" style="padding:16px 18px;gap:14px"><div style="display:flex;align-items:center;gap:12px"><span class="flame' + (v.count ? ' lit' : '') + '">' + ICON.flame + '</span>' +
      '<div><div style="font-family:var(--display);font-weight:600;font-size:19px">' + (v.count ? plural(v.count, 'payday') + ' in a row' : 'Payday streak') + '</div><div style="font-size:13px;color:var(--muted)">' + line + '</div></div></div>' +
      '<div class="grid3 stats">' + stat((t.daysBack > 0 ? '+' : '') + Math.max(0, t.daysBack), 'days stolen back') + stat(money(t.debtPaid), 'debt paid') + stat(money(t.saved), 'saved') + '</div></div>';
  }
  function download(name, type, text) {
    var blob = new Blob([text], { type: type }), url = URL.createObjectURL(blob), a = document.createElement('a');
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
        if (P.setupDone) { snapshot(); save(); go('settings'); }
        else go(n < WIZ.length ? WIZ[n] : 'import');
        break;
      case 'help': U.showHelp = !U.showHelp; render(); break;
      case 'sortstart': U.sortHist = []; go('sort'); break;
      case 'pick':
        var card = app.querySelector('[data-swipe]');
        if (card && v !== 'skip') flyAndDecide(card, v); else decide(v);
        break;
      case 'undo': delete P.sorted[U.sortHist.pop()]; save(); render(); break;
      case 'tog': P.sorted[b.getAttribute('data-m')] = v; save(); render(); break;
      case 'filter': U.filter = v; render(); break;
      case 'setfun': P.fun = U.limit; save(); go(P.setupDone ? 'home' : 'plan'); break;
      case 'finish': P.setupDone = true; snapshot(); save(); track('setup-done'); U.toast = ['Your plan is ready.', 'Check in each payday and watch the countdown move.', true]; go('home'); break;
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
