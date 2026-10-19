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
  function addDays(d, n) { return new Date(d.getTime() + Math.round(n) * DAY); }
  function daysBetween(a, b) { return Math.round((fromIso(isoDay(b)) - fromIso(isoDay(a))) / DAY); }
  // moves a payday that has already passed forward to the next one on schedule
  function rollPayday(iso, freq, today) {
    var d = fromIso(iso), step = FREQS[freq].days;
    while (daysBetween(today, d) < 0) d = addDays(d, step);
    return isoDay(d);
  }

  // ---------- CSV ----------
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, i, ch;
    text = String(text).replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); cell = '';
        if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
        row = [];
      } else cell += ch;
    }
    row.push(cell);
    if (row.some(function (c) { return c.trim() !== ''; })) rows.push(row);
    return rows;
  }
  function toNumber(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return NaN;
    var neg = /^\(.*\)$/.test(s) || /-$/.test(s) || /^-/.test(s.replace(/[$\s]/g, ''));
    var n = parseFloat(s.replace(/[()$,\s+-]/g, ''));
    return isNaN(n) ? NaN : (neg ? -n : n);
  }
  function parseDate(s) {
    s = String(s || '').trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]);
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + pad(+m[1]) + '-' + pad(+m[2]); }
    return null;
  }
  function findCol(head, patterns) {
    for (var p = 0; p < patterns.length; p++) {
      for (var i = 0; i < head.length; i++) if (patterns[p].test(head[i])) return i;
    }
    return -1;
  }
  var NOT_SPENDING = /payment thank you|autopay|auto pay|online payment|mobile payment|transfer (to|from)|online transfer|internal transfer|credit card payment|payment - thank|epay/i;

  // Reads a bank or card export. Returns spending only (money out), as positive amounts.
  function readTransactions(text) {
    var rows = parseCSV(text), h = -1, head, i;
    for (i = 0; i < Math.min(rows.length, 12); i++) {
      head = rows[i].map(function (c) { return c.trim().toLowerCase(); });
      if (head.some(function (c) { return /date/.test(c); }) && head.some(function (c) { return /amount|debit|withdrawal|credit|deposit/.test(c); })) { h = i; break; }
    }
    if (h < 0) return { error: 'We couldn’t find the date and amount columns in that file. Try your bank’s “CSV” or “spreadsheet” export.' };
    var dateCol = findCol(head, [/^transaction date$/, /^date$/, /^posted date$/, /^post(ing)? date$/, /date/]);
    var descCol = findCol(head, [/^description$/, /^payee$/, /^merchant/, /^name$/, /description/, /payee|merchant|details|memo/]);
    var merchCol = findCol(head, [/^merchant$/, /^merchant name$/]);
    var amountCol = findCol(head, [/^amount$/, /amount/]);
    var debitCol = findCol(head, [/^debit/, /withdrawal|outflow|money out/]);
    var creditCol = findCol(head, [/^credit$/, /^credit amount/, /deposit|inflow|money in/]);
    if (descCol < 0) return { error: 'We found dates and amounts but no description column, so we can’t tell the stores apart.' };
    var raw = [];
    for (i = h + 1; i < rows.length; i++) {
      var r = rows[i], date = parseDate(r[dateCol]), desc = String(r[descCol] || '').trim(), v;
      if (!date || !desc) continue;
      if (debitCol >= 0 || (amountCol < 0 && creditCol >= 0)) {
        var d = toNumber(r[debitCol]), c = toNumber(r[creditCol]);
        v = !isNaN(d) && d !== 0 ? -Math.abs(d) : !isNaN(c) && c !== 0 ? Math.abs(c) : NaN;
      } else v = toNumber(r[amountCol]);
      if (isNaN(v) || v === 0) continue;
      raw.push({ date: date, desc: desc, name: merchCol >= 0 && merchCol !== descCol ? String(r[merchCol] || '').trim() : '', v: v });
    }
    if (!raw.length) return { error: 'That file didn’t have any transactions we could read.' };
    // most rows are purchases, so the most common sign is "money out"
    var negs = raw.filter(function (x) { return x.v < 0; }).length;
    var outSign = amountCol >= 0 && debitCol < 0 && negs < raw.length - negs ? 1 : -1;
    var tx = [], skipped = 0;
    raw.forEach(function (x) {
      if (Math.sign(x.v) !== outSign) return;
      if (NOT_SPENDING.test(x.desc)) { skipped++; return; }
      tx.push({ date: x.date, desc: x.desc, merchant: cleanMerchant(x.name || x.desc), amount: Math.round(Math.abs(x.v) * 100) / 100 });
    });
    tx.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var first = tx.length ? tx[0].date : null, last = tx.length ? tx[tx.length - 1].date : null;
    return { tx: tx, skipped: skipped, from: first, to: last, flipped: outSign === 1 };
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

  // ---------- the plan ----------
  function sum(list, f) { return list.reduce(function (t, x) { return t + (+f(x) || 0); }, 0); }
  function perCheck(g, ppm) { return g.saved >= g.amount ? 0 : g.kind === 'fund' ? g.amount / (g.months * ppm) : (g.per || 0); }

  // The Payday Plan for one paycheck. Every dollar gets a job; what's left is "extra".
  function plan(p) {
    var ppm = FREQS[p.freq].perMonth;
    var rows = [];
    var giving = p.givingPct ? Math.round(p.paycheck * p.givingPct / 100) : 0;
    if (giving) rows.push({ label: 'Giving (' + p.givingPct + '%)', amount: giving, kind: 'give' });
    p.bills.forEach(function (b) { if (+b.amount > 0) rows.push({ label: b.name || 'Bill', amount: b.amount / ppm, kind: 'bill' }); });
    if (+p.fun > 0) rows.push({ label: 'Fun money (wants)', amount: p.fun / ppm, kind: 'fun' });
    // the snowball keeps the total debt budget fixed: a paid-off debt's minimum rolls into the next one
    var mins = sum(p.debts, function (d) { return d.min; });
    if (mins) rows.push({ label: 'Debt minimums', amount: mins / ppm, kind: 'min' });
    (p.goals || []).forEach(function (g) {
      var a = perCheck(g, ppm);
      if (a > 0) rows.push({ label: g.name + (g.kind === 'fund' ? ' fund' : ' (dream)'), amount: a, kind: 'goal' });
    });
    var used = sum(rows, function (r) { return r.amount; });
    var extra = p.paycheck - used;
    var monthlyLiving = sum(p.bills, function (b) { return b.amount; }) + (+p.fun || 0);
    return { rows: rows, extra: extra, tight: extra < -0.5, ppm: ppm, safetyNet: Math.max(1000, Math.round(monthlyLiving * 3 / 100) * 100) };
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
      goals: (p.goals || []).map(function (g) { return { id: g.id, name: g.name, amount: g.amount, kind: g.kind, months: g.months, per: g.per || 0, saved: g.saved || 0 }; })
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
    var pl = plan(p), s = stateFrom(p), ppm = pl.ppm, ext = pl.extra + sum(pl.rows.filter(function (r) { return r.kind === 'goal'; }), function (r) { return r.amount; });
    // extra excludes goal money; the simulation takes goals out itself, so hand it the pre-goal amount
    var at = function (cond, opts) { var n = paychecksUntil(s, ext, ppm, cond, opts); return n === 0 ? fromIso(isoDay(today)) : dateAfter(p.nextPay, p.freq, n); };
    var o = { plan: pl, state: s, step: s.step, target: smallest(s) };
    o.debtFree = s.debts.length ? at(debtFree) : null;
    o.debtFreeMins = s.debts.length ? at(debtFree, { minsOnly: true }) : null;
    if (o.target) { var id = o.target.id; o.targetDone = at(function (x) { return x.debts.filter(function (d) { return d.id === id; })[0].bal <= 0; }); }
    o.cushion = at(function (x) { return x.savings >= CUSHION; });
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

  var api = { CUSHION: CUSHION, FREQS: FREQS, STEPS: STEPS, isoDay: isoDay, fromIso: fromIso, addDays: addDays, daysBetween: daysBetween, rollPayday: rollPayday,
    nextAfter: nextAfter, paydayFor: paydayFor, applyCheckin: applyCheckin, streakView: streakView, winsBetween: winsBetween, freedomDate: freedomDate,
    parseCSV: parseCSV, toNumber: toNumber, parseDate: parseDate, readTransactions: readTransactions, cleanMerchant: cleanMerchant, storeTotals: storeTotals, spanDays: spanDays,
    plan: plan, perCheck: perCheck, stateFrom: stateFrom, smallest: smallest, paycheck: paycheck, paychecksUntil: paychecksUntil, outlook: outlook };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTM = api;
})(this);
