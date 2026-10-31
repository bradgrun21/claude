/* Find Me the Money: the daily checklist. One store for everyone, P.daily = { 'YYYY-MM-DD': { ... } },
   and the 30-Day Challenge reads the same days. Pure functions here (the browser and the tests share them);
   app.js draws the screens. The reminders function copies tasks() and runCheck() ("kept in step"). */
(function (root) {
  'use strict';
  // the 5 tasks, in order: [key, emoji, label]
  var ITEMS = [['log', '🧾', 'Log purchases & update balances'], ['debt', '💳', 'No new debt'], ['eat', '🍽️', 'No eating out'], ['lesson', '🎧', 'Today’s 5-minute lesson'], ['grat', '🙏', 'One thing you’re grateful for']];
  var FIELDS = ['logged', 'noSpend', 'balUpdated', 'balancesConfirmed', 'noNewDebt', 'noEatingOut', 'lessonDone', 'lessonRef', 'gratitude', 'done'];

  function iso(d) { return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
  function fromIso(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDay(s, n) { var d = fromIso(s); d.setDate(d.getDate() + n); return iso(d); }
  function rec(P, day) { return (P && P.daily && P.daily[day]) || {}; }

  // task 1 is two halves: a purchase logged that day (or "No spend today"), and balances updated (or "Balances still
  // right"). "logged" is set when purchases dated that day are saved on that day, so adding last week's purchases
  // later never fills in a past day.
  function tasks(P, day) {
    var r = rec(P, day), spent = !!r.logged;
    var t = { spent: spent, logA: spent || !!r.noSpend, logB: !!(r.balUpdated || r.balancesConfirmed), debt: !!r.noNewDebt, eat: !!r.noEatingOut,
      lesson: !!r.lessonDone, grat: !!String(r.gratitude || '').trim() };
    t.log = t.logA && t.logB;
    t.n = [t.log, t.debt, t.eat, t.lesson, t.grat].filter(Boolean).length;
    return t;
  }
  function full(P, day) { return tasks(P, day).n === 5; }
  // a calendar circle: none, some (1-4), full (all 5); days to come are blank
  function state(P, day, today) { if (day > today) return 'future'; var n = tasks(P, day).n; return n === 5 ? 'full' : n ? 'some' : 'none'; }
  // only today can be checked off, and a full day stays full
  function canEdit(P, day, today) { return day === today && !rec(P, day).done; }

  // the challenge: every day from the start up to yesterday must be full, or the run stops at the first one that isn't
  // returns { missed: 'YYYY-MM-DD' | null, reached: days in a row before it }
  function runCheck(P, startDate, today) {
    if (!startDate || startDate >= today) return { missed: null, reached: 0 };
    var n = 0;
    for (var d = startDate; d < today; d = addDay(d, 1)) { if (!full(P, d)) return { missed: d, reached: n }; n++; }
    return { missed: null, reached: n };
  }
  function dayNumber(startDate, day) { return Math.round((fromIso(day) - fromIso(startDate)) / 86400000) + 1; }

  // older plans kept the challenge's days on P.challenge.days: move them into P.daily (nothing is lost)
  function migrate(P) {
    var c = P && P.challenge; if (!c || !c.days) return false;
    P.daily = P.daily || {};
    Object.keys(c.days).forEach(function (k) {
      var from = c.days[k], to = P.daily[k] || (P.daily[k] = {});
      FIELDS.forEach(function (f) { if (from[f] != null && to[f] == null) to[f] = from[f]; });
    });
    delete c.days; return true;
  }
  // counts for the stats row and the journal
  function counts(P) {
    var d = P.daily || {}, keys = Object.keys(d);
    return { full: keys.filter(function (k) { return full(P, k); }).length, lessons: keys.filter(function (k) { return d[k].lessonDone; }).length,
      grateful: keys.filter(function (k) { return String(d[k].gratitude || '').trim(); }).length };
  }

  var api = { ITEMS: ITEMS, tasks: tasks, full: full, state: state, canEdit: canEdit, runCheck: runCheck, dayNumber: dayNumber, migrate: migrate, counts: counts, addDay: addDay };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTMDaily = api;
})(this);
