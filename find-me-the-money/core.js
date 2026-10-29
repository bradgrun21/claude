/* Find Me the Money: the pure logic (no screen code), shared by the app and the tests.
   Everything here runs on the person's own device; nothing is sent anywhere. */
(function (root) {
  'use strict';

  var CUSHION = 1000;
  var DAY = 86400000;
  var FREQS = {
    weekly: { label: 'Every week', perMonth: 52 / 12, days: 7 },
    biweekly: { label: 'Every 2 weeks', perMonth: 26 / 12, days: 14 },
    semimonthly: { label: 'Twice a month', perMonth: 2, days: 365 / 24 },
    monthly: { label: 'Once a month', perMonth: 1, days: 365 / 12 }
  };
  var STEPS = [
    ['Starter Cushion', 'Save $1,000 for emergencies'],
    ['Debt Snowball', 'Pay off everything but the house, smallest first'],
    ['Full Safety Net', '3 to 6 months of expenses saved'],
    ['Future You', 'Invest 15% of income for retirement'],
    ['Kids’ Future', 'Save for your kids’ college'],
    ['Home Free', 'Pay off your home early'],
    ['Build & Give', 'Grow wealth and give generously']
  ];

  // ---------- dates ----------
  function isoDay(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  // calendar days, not 24-hour blocks, so a clock change never slips a date back a day
  function addDays(d, n) { var r = new Date(d.getTime()); r.setDate(r.getDate() + Math.round(n)); return r; }
  function daysBetween(a, b) { return Math.round((fromIso(isoDay(b)) - fromIso(isoDay(a))) / DAY); }
  // moves a payday that has already passed forward to the next one on schedule
  function rollPayday(iso, freq, today) {
    var d = fromIso(iso), step = FREQS[freq].days;
    while (daysBetween(today, d) < 0) d = addDays(d, step);
    return isoDay(d);
  }

  // "SQ *BLUE BOTTLE COFFEE 1234 OAKLAND CA" -> "Blue Bottle Coffee"
  var PROCESSORS = /^(SQ|TST|SP|PP|PAYPAL|IC|PY|BT|WPY|GOOGLE|APPLE PAY|CKO|FS|SPI|LS|PAR)$/;
  var KNOWN = [[/AMZN|AMAZON/, 'Amazon'], [/APPLE\.COM|ITUNES/, 'Apple'], [/NETFLIX/, 'Netflix'], [/SPOTIFY/, 'Spotify'], [/HULU/, 'Hulu'], [/DOORDASH/, 'DoorDash'],
    [/UBER[\s*]*EATS/, 'Uber Eats'], [/UBER/, 'Uber'], [/LYFT/, 'Lyft'], [/STARBUCKS/, 'Starbucks'], [/WAL-?MART|WM SUPERCENTER/, 'Walmart'], [/TARGET/, 'Target'], [/COSTCO/, 'Costco'],
    [/MCDONALD/, 'McDonald’s'], [/CHICK-?FIL-?A/, 'Chick-fil-A'], [/VENMO/, 'Venmo'], [/ZELLE/, 'Zelle'], [/CASH APP|SQUARE CASH/, 'Cash App']];
  function cleanMerchant(desc) {
    var s = String(desc).toUpperCase();
    for (var k = 0; k < KNOWN.length; k++) if (KNOWN[k][0].test(s)) return KNOWN[k][1];
    s = s.replace(/^(POS|DEBIT CARD PURCHASE|DEBIT PURCHASE|PURCHASE AUTHORIZED ON \d\d\/\d\d|RECURRING PAYMENT AUTHORIZED ON \d\d\/\d\d|CHECKCARD \d{4}|VISA PURCHASE|ACH DEBIT|PURCHASE)\s+/, '');
    var star = s.indexOf('*');
    if (star > 0) {
      var left = s.slice(0, star).trim(), right = s.slice(star + 1).trim();
      s = PROCESSORS.test(left) && right ? right : left;
    }
    s = s.replace(/https?:\/\/\S+|WWW\.\S+/g, '').replace(/\.COM\b/g, '').replace(/#\s*\d+/g, '').replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, '')
      .replace(/\b[A-Z0-9]*\d[A-Z0-9]*\b/g, '').replace(/[^A-Z&' .-]/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/\s+[A-Z]{2}$/, '').trim();
    var words = s.split(' ').filter(Boolean).slice(0, 3);
    if (!words.length) return String(desc).trim().slice(0, 24) || 'Unknown';
    return words.map(function (w) { return w.length <= 2 && w !== 'OF' ? w : w.charAt(0) + w.slice(1).toLowerCase(); }).join(' ');
  }

  // groups transactions by store, scaled to a monthly figure
  function storeTotals(tx) {
    var map = {}, list = [];
    tx.forEach(function (x) {
      if (!map[x.merchant]) { map[x.merchant] = { m: x.merchant, count: 0, total: 0 }; list.push(map[x.merchant]); }
      map[x.merchant].count++; map[x.merchant].total += x.amount;
    });
    return list;
  }
  function spanDays(from, to) { return from && to ? Math.max(14, daysBetween(fromIso(from), fromIso(to)) + 1) : 30; }

  // ---------- budget categories ----------
  // Groups and common items, drawn from what popular budget apps start people with.
  // Each item: [name, example amount, 'yr' if it's usually paid once a year]. Debt payments,
  // savings, giving and fun money have their own places in the plan, so they aren't here.
  var BUDGET = [
    { id: 'home', label: 'Home', hint: 'Rent or mortgage and what keeps the place running', items: [['Rent', 1400], ['Mortgage', 1600], ['Renters insurance', 15], ['Homeowners insurance', 1800, 'yr'], ['HOA fees', 150], ['Property taxes', 3000, 'yr'], ['Home repairs', 1200, 'yr'], ['Furniture & home goods', 40]] },
    { id: 'utilities', label: 'Utilities', hint: 'Lights, water, internet, phone', items: [['Electricity', 130], ['Water & sewer', 50], ['Natural gas', 60], ['Trash', 25], ['Internet', 70], ['Phone', 60]] },
    { id: 'food', label: 'Food & household', hint: 'Eating out comes out of fun money', items: [['Groceries', 450], ['Household supplies', 40], ['Toiletries', 30], ['Work or school lunches', 80]] },
    { id: 'transport', label: 'Getting around', hint: 'Car payments go in Debts', items: [['Gas', 160], ['Car insurance', 150], ['Car maintenance', 600, 'yr'], ['Registration & inspection', 150, 'yr'], ['Parking & tolls', 30], ['Public transit', 60], ['Rideshare', 40]] },
    { id: 'health', label: 'Health & insurance', hint: 'Skip anything that already comes out of your paycheck', items: [['Health insurance', 300], ['Doctor & dental copays', 40], ['Prescriptions', 25], ['Glasses & contacts', 250, 'yr'], ['Life insurance', 25], ['Gym', 35]] },
    { id: 'personal', label: 'Personal', hint: 'Regular costs of being you', items: [['Haircuts', 40], ['Clothing', 60], ['Laundry & dry cleaning', 25], ['Gifts & holidays', 800, 'yr'], ['Birthdays', 200, 'yr']] },
    { id: 'kids', label: 'Kids & family', hint: 'Childcare, school and activities', items: [['Childcare', 900], ['Diapers & baby supplies', 80], ['School costs', 400, 'yr'], ['Kids’ activities', 60], ['Child support', 400], ['Helping family', 100]] },
    { id: 'pets', label: 'Pets', hint: 'Food, vet and the rest', items: [['Pet food', 50], ['Vet visits', 400, 'yr'], ['Pet insurance', 35], ['Grooming', 40]] },
    { id: 'subs', label: 'Subscriptions', hint: 'The ones you’ve decided to keep', items: [['Streaming', 25], ['Music', 11], ['Amazon Prime', 139, 'yr'], ['Cloud storage', 3], ['Apps & software', 10]] },
    { id: 'other', label: 'Other bills', hint: 'Anything else that comes due', items: [['Tuition', 2000, 'yr'], ['Storage unit', 90], ['Taxes set aside (self-employed)', 300], ['Bank fees', 10], ['Professional dues', 200, 'yr']] }
  ];
  // Older plans saved bills without a group; place them by name.
  var GROUP_HINTS = [[/rent|mortgage|housing|hoa|home|property/i, 'home'], [/utilit|electric|water|gas bill|natural gas|trash|internet|wifi|cable|phone|cell/i, 'utilities'],
    [/grocer|food|household|toiletr|lunch/i, 'food'], [/gas|fuel|car|auto|transport|parking|toll|transit|uber|lyft|rideshare/i, 'transport'],
    [/health|insur|doctor|dental|medic|prescri|gym|vision|glasses/i, 'health'], [/hair|cloth|laundry|gift|birthday|christmas/i, 'personal'],
    [/child|daycare|kid|school|diaper|baby|family/i, 'kids'], [/pet|vet|dog|cat/i, 'pets'], [/netflix|hulu|spotify|stream|subscri|prime|music|app|cloud|icloud/i, 'subs']];
  function groupFor(name) {
    for (var g = 0; g < BUDGET.length; g++) for (var i = 0; i < BUDGET[g].items.length; i++) if (BUDGET[g].items[i][0].toLowerCase() === String(name || '').toLowerCase()) return BUDGET[g].id;
    for (var h = 0; h < GROUP_HINTS.length; h++) if (GROUP_HINTS[h][0].test(name || '')) return GROUP_HINTS[h][1];
    return 'other';
  }
  // A bill's monthly cost: yearly bills are set aside a twelfth at a time.
  // Recurring expenses store the amount each time it's due (freq); older bills store a monthly or yearly amount (per).
  function billMonthly(b) {
    var a = +b.amount || 0;
    if (b.freq) return b.freq === 'weekly' ? a * 52 / 12 : b.freq === 'biweekly' ? a * 26 / 12 : b.freq === 'yearly' ? a / 12 : a;
    return b.per === 'yr' ? a / 12 : a;
  }
  // Bills rolled up by group, in catalog order, for the plan.
  function billGroups(bills) {
    return BUDGET.map(function (g) {
      var mine = bills.filter(function (b) { return (b.group || groupFor(b.name)) === g.id && billMonthly(b) > 0; });
      return { id: g.id, name: g.label, amount: sum(mine, billMonthly), items: mine.map(function (b) { return b.name || 'Bill'; }) };
    }).filter(function (g) { return g.amount > 0; });
  }

  // ---------- the plan ----------
  function sum(list, f) { return list.reduce(function (t, x) { return t + (+f(x) || 0); }, 0); }
  // a goal with a date sets aside a fixed amount per paycheck (byPer), in every step, until it's funded
  function perCheck(g, ppm) { return g.saved >= g.amount ? 0 : g.byPer ? g.byPer : g.kind === 'fund' ? g.amount / (g.months * ppm) : (g.per || 0); }

  // The Payday Plan for one paycheck. Every dollar gets a job; what's left is "extra".
  function plan(p) {
    var ppm = FREQS[p.freq].perMonth;
    var rows = [];
    var giving = p.giveAmt > 0 ? p.giveAmt : p.givingPct ? Math.round(p.paycheck * p.givingPct / 100) : 0;
    if (giving) rows.push({ label: p.giveAmt > 0 ? 'Giving' : 'Giving (' + p.givingPct + '%)', amount: giving, kind: 'give' });
    p.bills.forEach(function (b) { if (+b.amount > 0) rows.push({ label: b.name || 'Bill', amount: b.amount / ppm, kind: 'bill', group: b.id }); });
    (p.saveRows || []).forEach(function (r) { if (+r.amount > 0) rows.push({ label: r.label, amount: r.amount / ppm, kind: 'save', key: r.key }); });
    if (+p.fun > 0) rows.push({ label: 'Fun money (wants)' + (p.funEst ? ' \u00b7 estimate' : ''), amount: p.fun / ppm, kind: 'fun' });
    // the snowball keeps the total debt budget fixed: a paid-off debt's minimum rolls into the next one
    var mins = sum(p.debts, function (d) { return d.min; });
    if (mins) rows.push({ label: 'Debt minimums', amount: mins / ppm, kind: 'min' });
    (p.goals || []).forEach(function (g) {
      var a = perCheck(g, ppm);
      if (a > 0) rows.push({ label: g.name + (g.kind === 'fund' ? ' fund' : ' (dream)'), amount: a, kind: 'goal' });
    });
    var used = sum(rows, function (r) { return r.amount; });
    var extra = p.paycheck - used;
    // money for the current step is only what the person assigned (stepAmt, per paycheck); the rest waits for a job
    var toStep = p.stepAmt == null ? Math.max(0, extra) : Math.max(0, Math.min(Math.max(0, extra), +p.stepAmt || 0));
    var monthlyLiving = sum(p.bills, function (b) { return b.amount; }) + (+p.fun || 0);
    var months = Math.max(3, Math.min(6, +p.efMonths || 3));
    return { rows: rows, extra: extra, toStep: toStep, unassigned: Math.max(0, extra) - toStep, tight: extra < -0.5, ppm: ppm, monthlyLiving: monthlyLiving, safetyNet: Math.max(1000, Math.round(monthlyLiving * months / 100) * 100) };
  }
  function stepOf(s) {
    var open = s.debts.some(function (d) { return d.bal > 0; });
    if (s.savings < CUSHION) return 1;
    if (open) return 2;
    return s.savings < s.target ? 3 : 4;
  }
  function stateFrom(p) {
    var pl = plan(p);
    var s = {
      debts: p.debts.map(function (d) { return { id: d.id, name: d.name, bal: +d.bal || 0, min: +d.min || 0, apr: (+d.apr || 0) / 100 }; }),
      savings: +p.savings || 0, target: pl.safetyNet,
      goals: (p.goals || []).map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.kind, months: g.months, per: g.per || 0, byPer: g.byPer || 0, saved: g.saved || 0 }; })
    };
    s.step = stepOf(s);
    return s;
  }
  function clone(s) { return JSON.parse(JSON.stringify(s)); }
  function smallest(s) { var o = s.debts.filter(function (d) { return d.bal > 0; }); o.sort(function (a, b) { return a.bal - b.bal; }); return o[0] || null; }
  function debtFree(s) { return !smallest(s); }

  // one paycheck: interest, minimums, goals, then every spare dollar to the current step
  function paycheck(s, extra, ppm, opts) {
    opts = opts || {};
    var events = [], pool = opts.minsOnly ? 0 : Math.max(0, extra);
    s.debts.forEach(function (d) {
      if (d.bal <= 0) { if (!opts.minsOnly) pool += d.min / ppm; return; }
      d.bal += d.bal * d.apr / 12 / ppm;
      var pay = Math.min(d.min / ppm, d.bal);
      d.bal -= pay;
      if (!opts.minsOnly) pool += d.min / ppm - pay;
      if (d.bal < 0.01) { d.bal = 0; events.push({ kind: 'paid', name: d.name }); }
    });
    if (opts.minsOnly) return events;
    s.goals.forEach(function (g) {
      if (g.saved >= g.amount || pool <= 0) return;
      var put = Math.min(pool, perCheck(g, ppm), g.amount - g.saved);
      g.saved += put; pool -= put;
      if (g.saved >= g.amount - 0.01) { g.saved = g.amount; events.push({ kind: 'goal', name: g.name }); }
    });
    if (s.step === 1) {
      var put1 = Math.min(pool, CUSHION - s.savings);
      s.savings += put1; pool -= put1;
    }
    if (s.savings >= CUSHION && smallest(s)) {
      var t;
      while (pool > 0.01 && (t = smallest(s))) {
        var p2 = Math.min(pool, t.bal);
        t.bal -= p2; pool -= p2;
        if (t.bal < 0.01) { t.bal = 0; events.push({ kind: 'paid', name: t.name }); }
      }
    }
    // once debt-free, the snowball money funds dream goals first, then the safety net
    if (!smallest(s)) s.goals.forEach(function (g) {
      if (g.kind !== 'dream' || g.saved >= g.amount || pool <= 0) return;
      var put3 = Math.min(pool, g.amount - g.saved);
      g.saved += put3; pool -= put3;
      if (g.saved >= g.amount - 0.01) { g.saved = g.amount; events.push({ kind: 'goal', name: g.name }); }
    });
    if (s.savings >= CUSHION && !smallest(s) && s.savings < s.target) s.savings += pool;
    var before = s.step;
    s.step = stepOf(s);
    if (s.step > before) events.push({ kind: 'step', step: before });
    return events;
  }
  // how many paychecks until a condition holds (Infinity if not within 50 years)
  function paychecksUntil(s, extra, ppm, cond, opts) {
    var x = clone(s);
    for (var n = 0; n <= 52 * 50; n++) {
      if (cond(x)) return n;
      paycheck(x, extra, ppm, opts);
    }
    return Infinity;
  }
  // the date of the paycheck that gets you there (the next payday counts as paycheck 1)
  function dateAfter(nextPay, freq, n) {
    if (n === Infinity) return null;
    if (n === 0) return null;
    return addDays(fromIso(nextPay), (n - 1) * FREQS[freq].days);
  }

  // everything the home screen needs, computed fresh from the person's current numbers
  function outlook(p, today) {
    var pl = plan(p), s = stateFrom(p), ppm = pl.ppm, ext = pl.toStep + sum(pl.rows.filter(function (r) { return r.kind === 'goal'; }), function (r) { return r.amount; });
    // extra excludes goal money; the simulation takes goals out itself, so hand it the pre-goal amount
    var at = function (cond, opts) { var n = paychecksUntil(s, ext, ppm, cond, opts); return n === 0 ? fromIso(isoDay(today)) : dateAfter(p.nextPay, p.freq, n); };
    var o = { plan: pl, state: s, step: s.step, target: smallest(s) };
    o.debtFree = s.debts.length ? at(debtFree) : null;
    o.debtFreeMins = s.debts.length ? at(debtFree, { minsOnly: true }) : null;
    if (o.target) { var id = o.target.id; o.targetDone = at(function (x) { return x.debts.filter(function (d) { return d.id === id; })[0].bal <= 0; }); }
    // a cent of float rounding never pushes a date back a payday
    o.cushion = at(function (x) { return x.savings >= CUSHION - 0.005; });
    // the snowball order, smallest balance first, with the paycheck number that pays each one off
    o.payoffs = s.debts.filter(function (d) { return d.bal > 0; }).sort(function (a, b) { return a.bal - b.bal; }).map(function (d) {
      var n = paychecksUntil(s, ext, ppm, function (x) { return x.debts.filter(function (z) { return z.id === d.id; })[0].bal <= 0.005; });
      return { id: d.id, name: d.name, bal: d.bal, n: n, date: n === Infinity ? null : dateAfter(p.nextPay, p.freq, n) };
    });
    o.safetyNet = at(function (x) { return x.savings >= x.target && debtFree(x); });
    o.goals = s.goals.map(function (g) {
      var ready = at(function (x) { var y = x.goals.filter(function (z) { return z.id === g.id; })[0]; return y.saved >= y.amount; });
      var base = clone(s); base.goals.forEach(function (z) { if (z.id === g.id) z.per = 0; });
      var n0 = paychecksUntil(base, ext, ppm, function (x) { var y = x.goals.filter(function (z) { return z.id === g.id; })[0]; return y.saved >= y.amount; });
      var nd0 = s.debts.length ? paychecksUntil(base, ext, ppm, debtFree) : 0;
      return { id: g.id, ready: ready, ready0: n0 === 0 ? null : dateAfter(p.nextPay, p.freq, n0), debtFree0: nd0 === 0 ? null : dateAfter(p.nextPay, p.freq, nd0) };
    });
    return o;
  }

  // ---------- streaks and wins ----------
  var MILESTONES = [3, 6, 13, 26, 52, 104];
  function nextAfter(iso, freq) { return isoDay(addDays(fromIso(iso), FREQS[freq].days)); }
  // the scheduled payday a check-in today counts for: the latest one on or before tomorrow (null if none is due)
  function paydayFor(nextPay, freq, today) {
    var lim = addDays(today, 1), d = nextPay;
    if (daysBetween(lim, fromIso(d)) > 0) return null;
    while (daysBetween(lim, fromIso(nextAfter(d, freq))) <= 0) d = nextAfter(d, freq);
    return d;
  }
  // A payday check-in counts from the day before payday to 2 days after. Missed or late paydays
  // use up a grace pass if one is saved; otherwise the streak starts over. Every 4 in a row earns a pass (hold 1).
  function applyCheckin(st, payday, checkinIso, freq) {
    st = Object.assign({ count: 0, best: 0, grace: 0, lastPayday: null }, st);
    var out = { usedGrace: 0, broke: false, earnedGrace: false, milestone: null };
    if (st.lastPayday === payday) return { st: st, out: out, repeat: true };
    var late = daysBetween(fromIso(payday), fromIso(checkinIso)) > 2;
    var missed = st.lastPayday ? Math.max(0, Math.round(daysBetween(fromIso(st.lastPayday), fromIso(payday)) / FREQS[freq].days) - 1) : 0;
    var need = missed + (late ? 1 : 0);
    if (need && need <= st.grace) { st.grace -= need; out.usedGrace = need; }
    else if (need) { out.broke = st.count > 0; st.count = 0; st.grace = 0; }
    st.count += 1; st.best = Math.max(st.best, st.count); st.lastPayday = payday;
    if (st.count % 4 === 0 && st.grace < 1) { st.grace = 1; out.earnedGrace = true; }
    if (MILESTONES.indexOf(st.count) >= 0) out.milestone = st.count;
    return { st: st, out: out };
  }
  // how the streak looks between check-ins
  function streakView(st, nextPay, freq, today) {
    st = st || {};
    var count = st.count || 0, grace = st.grace || 0, closed = 0, d = nextPay;
    if (!count) return { count: 0, best: st.best || 0, grace: 0, state: 'new', due: !!paydayFor(nextPay, freq, today) };
    while (daysBetween(fromIso(d), today) > 2 && closed < 60) { closed++; d = nextAfter(d, freq); }
    var due = !!paydayFor(nextPay, freq, today);
    var state = closed > grace ? 'paused' : due ? 'due' : 'active';
    return { count: state === 'paused' ? 0 : count, was: count, best: Math.max(st.best || 0, count), grace: grace, state: state, due: due };
  }
  // what changed since the last check-in: debt paid down and money saved (savings + goals)
  function winsBetween(prev, now) {
    var paid = 0, saved = now.savings - (prev.savings || 0);
    Object.keys(now.debts).forEach(function (id) { if (prev.debts && id in prev.debts) paid += Math.max(0, prev.debts[id] - now.debts[id]); });
    Object.keys(now.goals).forEach(function (id) { saved += now.goals[id] - (prev.goals && id in prev.goals ? prev.goals[id] : 0); });
    return { debtPaid: Math.round(paid * 100) / 100, saved: Math.round(saved * 100) / 100 };
  }
  // the date everything counts down to: debt-free while there's debt, then the full safety net
  function freedomDate(o) { return o.target ? o.debtFree : o.safetyNet; }

  // ---------- challenges ----------
  // kinds: daily = tap each day; count = reach a number within the window; clean = we count the days, you
  // report a slip; once = one action; amount = add dollars toward a target; cushion = reach $1,000 saved
  var CHALLENGES = [
    { id: 'cook7', title: 'Cook at Home 7', kind: 'daily', days: 7, tag: 'Food', blurb: 'Seven days in a row with no restaurants or delivery. Groceries only.', share: 'Seven days of cooking at home.' },
    { id: 'nodelivery7', title: 'No-Delivery Week', kind: 'daily', days: 7, tag: 'Food', blurb: 'No DoorDash, Uber Eats or takeout for seven days.', share: 'A whole week with zero delivery.' },
    { id: 'coffee14', title: 'Coffee at Home 14', kind: 'daily', days: 14, tag: 'Food', blurb: 'Make your coffee at home for two weeks.', share: 'Two weeks of home-brewed coffee.' },
    { id: 'nospend3', title: 'No-Spend Weekend', kind: 'daily', days: 3, tag: 'Spending', blurb: 'Friday to Sunday: spend only on bills and true essentials.', share: 'A whole weekend without spending.' },
    { id: 'lunch10', title: 'Pack Lunch 10', kind: 'count', target: 10, days: 14, tag: 'Food', blurb: 'Pack your lunch 10 times in the next two weeks.', share: 'Ten packed lunches in two weeks.' },
    { id: 'nofees30', title: '30 Days, No Late Fees', kind: 'clean', days: 30, tag: 'Bills', blurb: 'Every bill on time for 30 days. We count the days; tell us if a fee happens.', share: 'Thirty days without a single late fee.' },
    { id: 'nooverdraft30', title: '30 Days, No Overdraft', kind: 'clean', days: 30, tag: 'Bills', blurb: 'Keep your checking account above $0 for 30 days.', share: 'Thirty days with zero overdrafts.' },
    { id: 'nocard30', title: '30 Days, No New Card Debt', kind: 'clean', days: 30, tag: 'Debt', blurb: 'Use cash or debit. No new charges on a card you’re paying off.', share: 'Thirty days without adding to my card debt.' },
    { id: 'sprint30', title: 'Cushion Sprint', kind: 'cushion', days: 30, tag: 'Savings', blurb: 'Reach $1,000 saved in 30 days. Sell something, pick up a shift, pause a want.', share: 'I sprinted to my $1,000 emergency cushion.' },
    { id: 'sell3', title: 'Sell 3 Things', kind: 'count', target: 3, days: 30, tag: 'Income', blurb: 'Clothes, gear, that thing in the closet. Sell three things this month.', share: 'Sold three things and put the money to work.' },
    { id: 'found100', title: 'Find $100', kind: 'amount', target: 100, days: 30, tag: 'Income', blurb: 'Find $100 this month: sell, skip, cancel or side gig. Add it as you go.', share: 'I found an extra $100 this month.' },
    { id: 'cancel1', title: 'Cancel One Subscription', kind: 'once', days: 7, tag: 'Spending', blurb: 'Pick one subscription you don’t love and cancel it this week.', share: 'Cancelled a subscription I didn’t need.' },
    { id: 'vintage1000', title: 'Sell $1,000 in Vintage', kind: 'earn', target: 1000, days: 60, tag: 'Earn', partner: 'resale', blurb: 'Thrift it, clean it, list it. Sell $1,000 of vintage clothes and finds in 60 days.', share: 'I made $1,000 selling vintage.', tips: 'Popular places to sell: Poshmark, Depop, eBay, Facebook Marketplace.' },
    { id: 'drive500', title: 'Drive and Earn $500', kind: 'earn', target: 500, days: 30, tag: 'Earn', partner: 'rideshare', blurb: 'Drive rideshare on your own schedule and earn $500 this month.', share: 'I drove my way to an extra $500.', tips: 'Rideshare apps need a qualifying car, license and background check. Track your miles for taxes.' },
    { id: 'deliver300', title: 'Deliver for $300', kind: 'earn', target: 300, days: 30, tag: 'Earn', partner: 'delivery', blurb: 'Deliver food or groceries in your spare hours and earn $300.', share: 'I delivered my way to an extra $300.', tips: 'Delivery apps often work with a car, bike or scooter, depending on your city.' },
    { id: 'sit300', title: 'Pet-Sit or Babysit $300', kind: 'earn', target: 300, days: 30, tag: 'Earn', partner: 'care', blurb: 'Watch pets or kids for friends, neighbors or through an app. Earn $300.', share: 'I earned $300 pet-sitting and babysitting.', tips: 'Start with people you know. Friends of friends are the easiest first clients.' },
    { id: 'shifts2', title: 'Pick Up 2 Extra Shifts', kind: 'earn', target: 200, days: 30, tag: 'Earn', blurb: 'Ask for two extra shifts at work this month and log what they pay.', share: 'I picked up extra shifts and put the money to work.', tips: 'Ask your manager early in the week, when the schedule is still being set.' },
    { id: 'market5', title: 'Sell 5 Things on Marketplace', kind: 'count', target: 5, days: 30, tag: 'Earn', blurb: 'Furniture, electronics, gear you don\u2019t use. Sell five things this month.', share: 'Sold five things and put the money to work.' },
    { id: 'boost50', title: 'Snowball Boost', kind: 'once', days: 14, tag: 'Debt', blurb: 'Put an extra $50 on your smallest debt before your next payday.', share: 'Threw an extra $50 at my snowball.' }
  ];
  function challengeDef(id) { return CHALLENGES.filter(function (c) { return c.id === id; })[0]; }
  // c = { id, start, marks: [iso], amount, slipped, done }; facts gives savings for the Cushion Sprint
  function challengeStatus(c, today, facts) {
    var def = challengeDef(c.id), dayN = daysBetween(fromIso(c.start), today) + 1, marks = c.marks || [], todayIso = isoDay(today);
    var st = { def: def, dayN: dayN, daysLeft: Math.max(0, def.days - dayN + 1), state: 'active', progress: 0, label: '', canMark: false, marked: marks.indexOf(todayIso) >= 0 };
    if (def.kind === 'daily') {
      st.progress = marks.length / def.days; st.label = marks.length + ' of ' + def.days + ' days';
      st.canMark = !st.marked && marks.length < def.days;
      if (marks.length >= def.days) st.state = 'done';
      st.dots = [];
      for (var i = 0; i < def.days; i++) { var di = isoDay(addDays(fromIso(c.start), i)); st.dots.push({ iso: di, done: marks.indexOf(di) >= 0, today: di === todayIso, future: daysBetween(today, fromIso(di)) > 0 }); }
    } else if (def.kind === 'count') {
      st.progress = marks.length / def.target; st.label = marks.length + ' of ' + def.target;
      st.canMark = dayN <= def.days;
      if (marks.length >= def.target) st.state = 'done'; else if (dayN > def.days) st.state = 'missed';
    } else if (def.kind === 'clean') {
      var clean = c.slipped ? daysBetween(fromIso(c.start), fromIso(c.slipped)) : Math.min(def.days, dayN - 1);
      st.progress = clean / def.days; st.label = 'Day ' + Math.min(dayN, def.days) + ' of ' + def.days;
      if (c.slipped) { st.state = 'slipped'; st.label = clean + ' clean ' + (clean === 1 ? 'day' : 'days'); }
      else if (dayN > def.days || c.complete) { st.state = 'done'; st.progress = 1; }
    } else if (def.kind === 'cushion') {
      var sv = facts ? facts.savings : 0;
      st.progress = Math.min(1, sv / CUSHION); st.label = '$' + Math.round(sv).toLocaleString('en-US') + ' of $1,000';
      if (sv >= CUSHION) st.state = 'done'; else if (dayN > def.days) st.state = 'missed';
    } else if (def.kind === 'earn') {
      var earned = (c.log || []).reduce(function (t, x) { return t + (+x.amt || 0); }, 0);
      st.earned = earned; st.progress = Math.min(1, earned / def.target); st.canMark = dayN <= def.days;
      st.label = '$' + Math.round(earned).toLocaleString('en-US') + ' of $' + def.target.toLocaleString('en-US');
      if (earned >= def.target) st.state = 'done'; else if (dayN > def.days) st.state = 'missed';
    } else if (def.kind === 'amount') {
      var amt = c.amount || 0;
      st.progress = Math.min(1, amt / def.target); st.label = '$' + Math.round(amt) + ' of $' + def.target; st.canMark = dayN <= def.days;
      if (amt >= def.target) st.state = 'done'; else if (dayN > def.days) st.state = 'missed';
    } else {
      st.progress = c.done ? 1 : 0; st.label = c.done ? 'Done' : st.daysLeft + (st.daysLeft === 1 ? ' day' : ' days') + ' left'; st.canMark = dayN <= def.days;
      if (c.done) st.state = 'done'; else if (dayN > def.days) st.state = 'missed';
    }
    st.progress = Math.max(0, Math.min(1, st.progress));
    return st;
  }

  // ---------- milestones ----------
  function money0(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function ladder(id, title, desc, key, n, fmt) {
    return { id: id, title: title, desc: desc, test: function (f) { return f[key] >= n; }, prog: function (f) { return [Math.min(f[key], n), n, fmt]; } };
  }
  var BADGES = [
    { id: 'plan', title: 'Plan Built', desc: 'Every dollar of my paycheck has a job.', test: function (f) { return f.setupDone; } },
    { id: 'sorted', title: 'Eyes Wide Open', desc: 'Sorted every store into needs and wants.', test: function (f) { return f.sortedAll; } },
    ladder('checkin-1', 'First Check-In', 'Checked in on payday for the first time.', 'checkins', 1),
    ladder('streak-3', 'Habit Forming', '3 paydays in a row.', 'streakBest', 3),
    ladder('streak-6', 'Paying Myself First', '6 paydays in a row.', 'streakBest', 6),
    ladder('streak-13', 'Half-Year Hero', '13 paydays in a row.', 'streakBest', 13),
    ladder('streak-26', 'Year of Showing Up', '26 paydays in a row.', 'streakBest', 26),
    ladder('saved-250', 'First $250', '$250 in emergency savings.', 'savings', 250, 'money'),
    ladder('saved-500', 'Halfway Cushion', '$500 in emergency savings.', 'savings', 500, 'money'),
    ladder('cushion', 'Starter Cushion', '$1,000 saved. Emergencies don’t go on a card anymore.', 'savings', 1000, 'money'),
    ladder('payoff-1', 'First Debt Down', 'Paid off my first debt.', 'debtsPaid', 1),
    ladder('payoff-3', 'Snowball Rolling', 'Paid off 3 debts.', 'debtsPaid', 3),
    ladder('paid-500', '$500 Paid Down', '$500 of debt gone since I started.', 'debtPaidTotal', 500, 'money'),
    ladder('paid-1000', '$1,000 Paid Down', '$1,000 of debt gone since I started.', 'debtPaidTotal', 1000, 'money'),
    ladder('paid-5000', '$5,000 Paid Down', '$5,000 of debt gone since I started.', 'debtPaidTotal', 5000, 'money'),
    ladder('paid-10000', '$10,000 Paid Down', '$10,000 of debt gone since I started.', 'debtPaidTotal', 10000, 'money'),
    ladder('days-7', 'A Week Back', 'Pulled my freedom date 7 days closer.', 'daysBack', 7),
    ladder('days-30', 'A Month Back', 'Pulled my freedom date 30 days closer.', 'daysBack', 30),
    ladder('days-100', '100 Days Back', 'Pulled my freedom date 100 days closer.', 'daysBack', 100),
    ladder('days-365', 'A Year Back', 'Pulled my freedom date a whole year closer.', 'daysBack', 365),
    { id: 'debt-free', title: 'Debt-Free', desc: 'Every debt paid off. Every one.', test: function (f) { return f.debtFree; } },
    { id: 'safety-net', title: 'Full Safety Net', desc: '3 to 6 months of expenses saved.', test: function (f) { return f.safetyNet; } },
    ladder('goal-1', 'Dream Funded', 'Fully funded a goal without a credit card.', 'goalsFunded', 1),
    ladder('earned-500', 'Side Income $500', 'Earned $500 extra and put it to work.', 'earned', 500, 'money'),
    ladder('earned-1000', 'Side Income $1,000', 'Earned $1,000 extra and put it to work.', 'earned', 1000, 'money'),
    ladder('plan-1', 'Plan Finisher', 'Finished a reading plan, day by day.', 'plansDone', 1),
    ladder('storyteller', 'Storyteller', 'Shared a win to encourage someone else.', 'shares', 1),
    ladder('challenge-1', 'Challenger', 'Finished my first challenge.', 'challengesDone', 1),
    ladder('challenge-5', 'Five Challenges', 'Finished 5 challenges.', 'challengesDone', 5),
    ladder('challenge-10', 'Ten Challenges', 'Finished 10 challenges.', 'challengesDone', 10)
  ];
  function badgeProgress(b, f) {
    if (!b.prog) return null;
    var p = b.prog(f), fmt = p[2] === 'money' ? money0 : function (n) { return String(Math.round(n)); };
    return { ratio: p[1] ? p[0] / p[1] : 0, label: fmt(p[0]) + ' of ' + fmt(p[1]) };
  }

  // ---------- reading plans ----------
  // one short read and one action a day; a new day opens each calendar day, and you can always catch up
  var PLANS = [{
    id: 'reset7', title: '7-Day Money Reset', blurb: 'One short read and one small action a day. By day 7 you have a plan, a cushion in motion and a payday habit.', share: 'I finished the 7-Day Money Reset.',
    days: [
      { title: 'Find your number', read: ['Most of us don\u2019t have a spending problem as much as a seeing problem. Money leaves in small, quiet amounts, and we never add it up.', 'Today you only have to look. What comes in each paycheck, and what already has a job? No judgment. You can\u2019t change what you can\u2019t see.', 'Open your Payday Plan and read every line. Notice what surprises you.'], action: ['See my Payday Plan', 'plan'] },
      { title: 'Sort your spending', read: ['A need keeps you housed, fed, healthy and getting to work. A want makes life more fun. Both are fine. Problems start when wants hide inside needs.', 'Today you\u2019ll sort your own spending, store by store. You decide what\u2019s a need. Be honest, not harsh.'], action: ['Sort my spending', 'spend'] },
      { title: 'Wants, on purpose', read: ['Cutting every want rarely lasts. What lasts is choosing your wants ahead of time, so the money you spend on fun is money you meant to spend.', 'Pick a monthly fun-money number you can live with. The difference between that and last month is money found.'], action: ['Set my fun money', 'fun'] },
      { title: 'Your $1,000 cushion', read: ['The first thing to build is a small wall between you and life. A flat tire or a vet bill shouldn\u2019t go on a credit card.', 'That wall is $1,000. Not forever, just first. Add what you have saved today. If you\u2019re not there yet, finishing today unlocks Challenges, and the Cushion Sprint gets you there faster than you think.'], action: ['Add my savings', 'savings'] },
      { title: 'Smallest debt first', read: ['List every debt, smallest balance to largest. Pay minimums on everything, then throw every extra dollar at the smallest one.', 'It isn\u2019t always the cheapest math, but it\u2019s the math people finish. Quick wins build momentum, and each paid-off payment rolls into the next.'], action: ['Check my debts', 'debts'] },
      { title: 'Name your dream', read: ['Saying no is easier when you know what you\u2019re saying yes to. A trip, a car that runs, a Christmas without a credit card.', 'Name one goal and give it a dollar amount. We\u2019ll give it a date.'], action: ['Add a goal', 'goalnew'] },
      { title: 'Make it a payday habit', read: ['Plans don\u2019t fail on day one. They fail on the third payday, when life gets busy.', 'Put your payday check-ins on your calendar. Two minutes, every payday: update your balances, watch your date move and celebrate the win.'], action: ['Set up my payday habit', 'habit'] }
    ]
  }];
  function planDef(id) { return PLANS.filter(function (p) { return p.id === id; })[0]; }
  // p = { id, start, done: [day index] }
  function planStatus(p, today) {
    // every day is open from the start: go at your own pace
    var def = planDef(p.id), open = def.days.length, done = p.done || [];
    var next = -1;
    for (var i = 0; i < def.days.length; i++) if (done.indexOf(i) < 0) { next = i; break; }
    return { def: def, open: open, doneCount: done.length, next: next, state: done.length >= def.days.length ? 'done' : 'active', progress: done.length / def.days.length,
      days: def.days.map(function (d, i) { return { title: d.title, done: done.indexOf(i) >= 0, open: i < open }; }) };
  }

  var api = { CUSHION: CUSHION, PLANS: PLANS, planDef: planDef, planStatus: planStatus, FREQS: FREQS, STEPS: STEPS, isoDay: isoDay, fromIso: fromIso, addDays: addDays, daysBetween: daysBetween, rollPayday: rollPayday,
    CHALLENGES: CHALLENGES, challengeDef: challengeDef, challengeStatus: challengeStatus, BADGES: BADGES, badgeProgress: badgeProgress,
    nextAfter: nextAfter, paydayFor: paydayFor, applyCheckin: applyCheckin, streakView: streakView, winsBetween: winsBetween, freedomDate: freedomDate,
    cleanMerchant: cleanMerchant, storeTotals: storeTotals, spanDays: spanDays,
    BUDGET: BUDGET, groupFor: groupFor, billMonthly: billMonthly, billGroups: billGroups,
    plan: plan, perCheck: perCheck, stateFrom: stateFrom, smallest: smallest, paycheck: paycheck, paychecksUntil: paychecksUntil, outlook: outlook };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTM = api;
})(this);
