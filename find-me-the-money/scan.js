/* Find Me the Money: read purchases from bank-app screenshots. Everything happens on the phone:
   the image is cleaned up on a canvas, read by Tesseract.js in a Web Worker, and turned into rows here.
   Nothing is uploaded or stored; the image and raw text are thrown away after saving. */
(function (root) {
  'use strict';
  var F = root.FMTM || (typeof require !== 'undefined' ? require('./core.js') : null);

  var MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
  var AMOUNT = /([+\-−–]?)\s?\$\s?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)|([+\-−–]?)(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d)/g;
  var NOT_PURCHASE = /\b(deposit|refund|returned?|payroll|direct dep|interest paid|cash back|cashback|reversal|credit adj|zelle from|transfer from|received)\b/i;
  var TRANSFER = /\b(transfer to|online transfer|payment to|autopay|card payment|thank you|zelle to|venmo cashout)\b/i;
  var SKIP = /\b(available balance|current balance|present balance|ending balance|statement balance|total|balance|pending transactions|posted transactions|see all|search|filter|account details)\b/i;
  var STATUS = /^(pending|posted|processing)$/i;
  // a row whose name stops at words like these continues on the next line (long bank descriptions wrap)
  var WRAPS = /\b(on|authorized|authorized on|purchase|payment|debit|recurring|card|pos|at)\s*$/i;

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
    return F ? F.cleanMerchant(up) : up;
  }
  function letters(s) { return (String(s).match(/[A-Za-z]/g) || []).length; }

  // lines: [{ text, confidence }] in reading order, from one screenshot
  function parseLines(lines, opts) {
    opts = opts || {};
    var today = opts.today || new Date(), rows = [], curDate = null, pending = null, pendingConf = 0;
    lines.forEach(function (ln) {
      var text = String(ln.text || '').replace(/\s+/g, ' ').trim(), conf = ln.confidence == null ? 100 : ln.confidence;
      if (!text) return;
      var amts = findAmounts(text), dt = findDate(text, today);
      // a line that is only a date is a section header for the rows under it
      if (!amts.length && dt && letters(text.replace(dt.raw, '').replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|,/gi, '')) < 3) { curDate = dt.iso; pending = null; return; }
      if (!amts.length) {
        if (STATUS.test(text) || SKIP.test(text) || letters(text) < 3) return;
        var last = rows[rows.length - 1];
        if (last && last.wraps) { last.raw = last.raw + ' ' + text; last.merchant = cleanName(last.raw.replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, ' ')); last.wraps = false; return; }
        pending = text; pendingConf = conf; return;
      }
      if (SKIP.test(text) && !pending) return;
      var a = amts[amts.length - 1], rest = text;
      amts.forEach(function (x) { rest = rest.replace(x.raw, ' '); });
      if (dt) rest = rest.replace(dt.raw, ' ');
      rest = rest.replace(/\s+/g, ' ').trim();
      var nameSrc = rest, c = conf;
      // merchant on one line, amount on the next
      if (letters(rest) < 3 && pending) { nameSrc = pending + (rest ? ' ' + rest : ''); c = Math.min(conf, pendingConf); }
      else if (letters(rest) < 3) return;
      if (SKIP.test(nameSrc)) { pending = null; return; }
      var notPurchase = a.plus || NOT_PURCHASE.test(nameSrc), transfer = TRANSFER.test(nameSrc);
      var isPending = /\bpending\b/i.test(nameSrc + ' ' + text);
      rows.push({
        merchant: cleanName(nameSrc), raw: nameSrc, wraps: WRAPS.test(nameSrc.replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/, '')), amount: a.value, date: (dt && dt.iso) || curDate || null,
        confidence: Math.round(c), low: c < (opts.lowConf || 70),
        flag: notPurchase ? 'Not a purchase?' : transfer ? 'Transfer?' : isPending ? 'Pending' : '',
        skip: notPurchase || transfer
      });
      pending = null;
    });
    return rows;
  }
  function rowKey(r) { return (r.date || '') + '|' + r.amount.toFixed(2) + '|' + String(r.merchant).toLowerCase().replace(/[^a-z0-9]/g, ''); }
  // drop rows already saved, and repeats across screenshots
  function dedupe(rows, savedKeys) {
    var seen = {}; (savedKeys || []).forEach(function (k) { seen[k] = 1; });
    return rows.filter(function (r) { var k = rowKey(r); if (seen[k]) return false; seen[k] = 1; return true; });
  }

  // ---------- image cleanup (browser only) ----------
  // grayscale, invert dark mode, scale small screenshots up 2x, stretch contrast
  function prepare(img) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, scale = w < 1000 ? 2 : 1;
    // phones cap canvas size; keep well under it
    while (w * scale * h * scale > 12e6 && scale > 0.3) scale = scale * 0.8;
    var cv = document.createElement('canvas'); cv.width = w * scale; cv.height = h * scale;
    var cx = cv.getContext('2d', { willReadFrequently: true }); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
    var im = cx.getImageData(0, 0, cv.width, cv.height), d = im.data, n = d.length / 4, sum = 0, g = new Uint8ClampedArray(n);
    for (var i = 0; i < n; i++) { var v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
    var dark = sum / n < 110;
    var hist = new Array(256).fill(0); for (i = 0; i < n; i++) { if (dark) g[i] = 255 - g[i]; hist[g[i]]++; }
    var lo = 0, hi = 255, acc = 0; for (lo = 0; lo < 255 && (acc += hist[lo]) < n * 0.01; lo++); acc = 0; for (hi = 255; hi > 0 && (acc += hist[hi]) < n * 0.01; hi--);
    var span = Math.max(1, hi - lo);
    for (i = 0; i < n; i++) { var o = Math.max(0, Math.min(255, (g[i] - lo) * 255 / span)); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = o; d[i * 4 + 3] = 255; }
    cx.putImageData(im, 0, 0);
    return { canvas: cv, dark: dark, scale: scale };
  }

  // ---------- Tesseract (loaded lazily, runs in its own Web Worker) ----------
  var BASE = (function () { try { var s = document.currentScript && document.currentScript.src; return s ? s.replace(/[^/]*$/, '') : ''; } catch (e) { return ''; } })();
  var workerP = null;
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('load ' + src)); }; document.head.appendChild(s); }); }
  function worker() {
    if (workerP) return workerP;
    var v = BASE + 'vendor/tesseract/';
    workerP = (root.Tesseract ? Promise.resolve() : loadScript(v + 'tesseract.min.js')).then(function () {
      if (!root.Tesseract) throw new Error('tesseract.min.js loaded but did not start');
      return root.Tesseract.createWorker('eng', 1, { workerPath: v + 'worker.min.js', corePath: v + 'core', langPath: v + 'lang', gzip: false, cacheMethod: 'none' });
    }).then(function (w) { return w.setParameters({ tessedit_pageseg_mode: '4', preserve_interword_spaces: '1' }).then(function () { return w; }); });
    workerP.catch(function () { workerP = null; });
    return workerP;
  }
  // any error, as words a person can pass along
  function describe(er) {
    if (!er) return 'unknown error';
    if (typeof er === 'string') return er;
    if (er.message) return er.message;
    if (er.type) return er.type + ' event' + (er.target && er.target.src ? ' (' + String(er.target.src).slice(0, 40) + ')' : '');
    try { return JSON.stringify(er).slice(0, 200); } catch (e) { return String(er); }
  }
  function step(name, p) { return p.catch(function (er) { var e = new Error(name + ': ' + describe(er)); e.step = name; throw e; }); }
  // open an image file: createImageBitmap first, then an <img> as a fallback
  function openImage(file) {
    var viaImg = function () { var url = URL.createObjectURL(file); return new Promise(function (res, rej) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('the image could not be opened (' + (file.type || 'unknown type') + ', ' + Math.round(file.size / 1024) + ' KB)')); }; im.src = url; }); };
    return root.createImageBitmap ? root.createImageBitmap(file).catch(viaImg) : viaImg();
  }
  // read one image (File or Blob); returns { rows, lines, text, ms, dark }
  function readImage(file, opts) {
    var t0 = Date.now(), prep;
    return step('opening the image', openImage(file)).then(function (im) {
      return step('preparing the image', Promise.resolve().then(function () { prep = prepare(im); }));
    }).then(function () {
      return step('loading the reader', worker());
    }).then(function (w) {
      return step('reading the text', Promise.resolve(w.recognize(prep.canvas, {}, { text: true, blocks: true })));
    }).then(function (out) {
        var lines = [];
        (out.data.blocks || []).forEach(function (b) { (b.paragraphs || []).forEach(function (p) { (p.lines || []).forEach(function (l) { lines.push({ text: l.text.trim(), confidence: l.confidence, top: l.bbox && l.bbox.y0 }); }); }); });
        lines.sort(function (a, b) { return (a.top || 0) - (b.top || 0); });
        return { rows: parseLines(lines, opts), lines: lines, text: out.data.text, ms: Date.now() - t0, dark: prep.dark, canvas: prep.canvas };
    });
  }
  // a quick self-check: draw a line of text and read it back
  function selfTest() {
    var cv = document.createElement('canvas'); cv.width = 600; cv.height = 120; var cx = cv.getContext('2d');
    cx.fillStyle = '#fff'; cx.fillRect(0, 0, 600, 120); cx.fillStyle = '#000'; cx.font = '40px Arial'; cx.fillText('Corner Market -$58.12', 20, 75);
    var t0 = Date.now();
    return step('loading the reader', worker()).then(function (w) { return step('reading the text', Promise.resolve(w.recognize(cv))); }).then(function (out) { return { text: out.data.text.trim(), ms: Date.now() - t0 }; });
  }

  var api = { describe: describe, selfTest: selfTest, parseLines: parseLines, findAmounts: findAmounts, findDate: findDate, cleanName: cleanName, rowKey: rowKey, dedupe: dedupe, prepare: prepare, readImage: readImage, worker: worker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTMScan = api;
})(this);
