/* Find Me the Money: purchases typed in one line ("coffee 5, gas $50 yesterday"), and the helpers that check for
   repeats. No AI and nothing leaves the phone. (Snaps of receipts and bank screenshots are read by ai.js.) */
(function (root) {
  'use strict';
  var F = root.FMTM || (typeof require !== 'undefined' ? require('./core.js') : null);

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  var AMOUNT = /([+\-−–]?)\s?\$\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)|([+\-−–]?)(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  // a date in the line, if any: "Oct 24", "October 24, 2026", "10/24", "10/24/26", "Today", "Yesterday"
  function findDate(text, today) {
    var t = today || new Date(), y = t.getFullYear(), s = String(text);
    if (/\btoday\b/i.test(s)) return { iso: iso(y, t.getMonth(), t.getDate()), raw: /\btoday\b/i.exec(s)[0] };
    if (/\byesterday\b/i.test(s)) { var d = new Date(t.getTime() - 864e5); return { iso: iso(d.getFullYear(), d.getMonth(), d.getDate()), raw: /\byesterday\b/i.exec(s)[0] }; }
    var m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i.exec(s);
    if (m) { var mo = MONTHS[m[1].toLowerCase()], dy = +m[2], yr = m[3] ? +m[3] : y; if (!m[3] && (mo > t.getMonth() + 1)) yr = y - 1; if (dy >= 1 && dy <= 31) return { iso: iso(yr, mo, dy), raw: m[0] }; }
    m = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(s);
    if (m) { var mo2 = +m[1] - 1, dy2 = +m[2], yr2 = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : y; if (!m[3] && mo2 > t.getMonth() + 1) yr2 = y - 1; if (mo2 >= 0 && mo2 < 12 && dy2 >= 1 && dy2 <= 31) return { iso: iso(yr2, mo2, dy2), raw: m[0] }; }
    return null;
  }
  function findAmounts(text) {
    var out = [], m; AMOUNT.lastIndex = 0;
    while ((m = AMOUNT.exec(text))) {
      var sign = m[1] || m[4] || '', whole = (m[2] || m[5]).replace(/,/g, ''), cents = m[3] || m[6];
      out.push({ value: +(whole + '.' + cents), plus: sign === '+', minus: /[-−–]/.test(sign), hasDollar: !!m[2], raw: m[0], index: m.index });
    }
    return out;
  }
  // "SQ *TACO SHACK 4421 PHX AZ" -> "Taco Shack"; bank apps that already show clean names pass through
  function cleanName(raw) {
    var s = String(raw).replace(/\b(pending|posted)\b/ig, ' ').replace(/[|•·]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var up = s.toUpperCase().replace(/\b(X{2,}|\*{2,})\s?\d{4}\b|\bCARD\s+(ENDING\s+(IN\s+)?)?\d{4}\b|\.{2,}\d{4}\b/g, ' ').replace(/#\s*\d+/g, ' ').replace(/\b\d{3,}\b/g, ' ').replace(/\s+/g, ' ').trim();
    // trailing "CITY ST": drop both when there's a name left in front
    var words = up.split(' ');
    if (words.length >= 4 && /^[A-Z]{2}$/.test(words[words.length - 1]) && /^[A-Z.]{2,}$/.test(words[words.length - 2])) up = words.slice(0, -2).join(' ');
    var looksClean = /[a-z]/.test(s) && !/[*#]/.test(s) && !/\b[A-Z]{2}$/.test(s);
    if (looksClean) return s.replace(/\s+\d{3,}\b.*$/, '').replace(/\b(pending|posted)\b/ig, '').replace(/\s+/g, ' ').trim().slice(0, 40);
    var num = /^(\d{1,2}) [A-Z]{2,}/.exec(up), name = F ? F.cleanMerchant(up) : up;
    if (num && name.indexOf(num[1]) !== 0) name = num[1] + ' ' + name; // "7 BREW COFFEE"
    return name.replace(/\b(?:[a-z]-)+[a-z]\b/gi, function (w) { return w.toUpperCase(); });
  }
  function rowKey(r) { return (r.date || '') + '|' + r.amount.toFixed(2) + '|' + String(r.merchant).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  // drop rows already saved, and repeats across screenshots
  function dedupe(rows, savedKeys) {
    var seen = {}; (savedKeys || []).forEach(function (k) { seen[k] = 1; });
    return rows.filter(function (r) { var k = rowKey(r); if (seen[k]) return false; seen[k] = 1; return true; });
  }


  // ---------- typed in one line: "coffee 5, gas $50 yesterday" ----------
  var DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  function parseTyped(text, today) {
    var t = today || new Date(), out = [];
    String(text || '').split(/[;\n]+|,(?!\d{3}\b)/).forEach(function (part) {
      var s = part.trim(); if (!s) return;
      var m = /\$?\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?(?!\s*\/)/.exec(s.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, function (x) { return x.replace(/\d/g, '#'); }));
      if (!m) return;
      var amount = +((m[1].replace(/,/g, '')) + '.' + ((m[2] || '0') + '0').slice(0, 2));
      if (!(amount > 0)) return;
      var rest = s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length), date = null;
      var dt = findDate(rest, t);
      if (dt) { date = dt.iso; rest = rest.replace(dt.raw, ' '); }
      else {
        var w = new RegExp('\\b(?:last\\s+)?(' + DAYS.join('|') + '|sun|mon|tues?|wed|thur?s?|fri|sat)\\b', 'i').exec(rest);
        if (w) {
          var k = DAYS.findIndex(function (d) { return d.indexOf(w[1].toLowerCase().slice(0, 3)) === 0; });
          var back = (t.getDay() - k + 7) % 7, d = new Date(t.getFullYear(), t.getMonth(), t.getDate() - back);
          date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); rest = rest.replace(w[0], ' ');
        }
      }
      rest = rest.replace(/^\s*add\s+(an?\s+)?(purchases?\s+)?(of\s+)?/i, ' ').replace(/\b(at|on|for|spent|paid|bought|purchases?)\b/gi, ' ').replace(/[$]/g, ' ').replace(/\s+/g, ' ').trim();
      var merchant = rest ? rest.split(' ').map(function (x) { return x.length > 2 || /[A-Z]/.test(x) ? x.charAt(0).toUpperCase() + x.slice(1) : x; }).join(' ').slice(0, 40) : 'Purchase';
      out.push({ merchant: merchant, raw: s, amount: amount, date: date || (t.getFullYear() + '-' + pad(t.getMonth() + 1) + '-' + pad(t.getDate())), confidence: 100, low: false, flag: '', skip: false, typed: true });
    });
    return out;
  }

  var api = { parseTyped: parseTyped, findAmounts: findAmounts, findDate: findDate, cleanName: cleanName, rowKey: rowKey, dedupe: dedupe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTMEntry = api;
})(this);
