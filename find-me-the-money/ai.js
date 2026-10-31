/* Find Me the Money: the phone's side of AI snaps and chat. Photos are shrunk here before they're sent, card and
   account numbers are masked here, and the care check runs here first (before any AI, so it works even when AI is off).
   The AI never writes a sentence anyone sees: every reply the chat shows is Brad's text below. */
(function (root) {
  'use strict';
  // kept in step with supabase/functions/ai/guard.mjs (CARE, maskDigits)
  var CARE = /\b(kill(ing)? myself|end (it|my life)( all)?|want(ed)? to die|wanna die|don'?t want to (be here|live|exist|wake up)|suicid\w*|self[- ]?harm\w*|hurt(ing)? myself|not (feel(ing)? )?safe|no reason to (live|go on)|better off (dead|without me)|can'?t go on)\b/i;
  function needsCare(text) { return CARE.test(String(text || '')); }
  function maskDigits(s) { return String(s == null ? '' : s).replace(/\d(?:[ -]?\d){5,}/g, '••••'); }

  // Brad's words: the only sentences the chat ever shows
  var REPLIES = {
    advice: 'That’s a great question for a real person. Ask it in the free community, or bring it to group coaching.',
    unclear: 'I didn’t catch that. Try: “HEB 84.20 groceries” or “no spend today.”',
    off_topic: 'I only help log money stuff here, like purchases, balances and your daily checklist.',
    care: 'It sounds really heavy right now. You don’t have to carry it alone. In the US you can call or text 988 any time.',
    old_date: 'I can only add purchases from the last 60 days.'
  };
  var CHAT_MAX = 300, SNAP_LONG_SIDE = 1568, SNAP_QUALITY = 0.8;

  function loadImage(file) {
    return new Promise(function (ok, no) {
      var rd = new FileReader();
      rd.onload = function () { var img = new Image(); img.onload = function () { ok(img); }; img.onerror = function () { no(new Error('image')); }; img.src = rd.result; };
      rd.onerror = function () { no(new Error('read')); };
      rd.readAsDataURL(file);
    });
  }
  function jpeg(img, sx, sy, sw, sh) {
    var s = Math.min(1, SNAP_LONG_SIDE / Math.max(sw, sh)), c = document.createElement('canvas');
    c.width = Math.round(sw * s); c.height = Math.round(sh * s);
    var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', SNAP_QUALITY).split(',')[1];
  }
  // a photo, shrunk to 1568px on its long side; a very tall bank screenshot (more than 2.5 times as tall as wide)
  // becomes 2 tiles, top and bottom with a little overlap. Still 1 snap.
  function prepare(file) {
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (h > 2.5 * w) { var half = Math.ceil(h / 2), lap = Math.round(h * 0.03); return [jpeg(img, 0, 0, w, half + lap), jpeg(img, 0, half - lap, w, h - half + lap)]; }
      return [jpeg(img, 0, 0, w, h)];
    });
  }

  var api = { needsCare: needsCare, maskDigits: maskDigits, REPLIES: REPLIES, CHAT_MAX: CHAT_MAX, prepare: prepare };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FMTMAI = api;
})(this);
