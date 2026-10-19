/* Find Me the Money: draws shareable win cards on the phone (canvas, nothing uploaded). */
(function () {
  'use strict';
  var W = 1080, H = 1350;
  var FONT = "'Manrope', -apple-system, 'SF Pro Display', system-ui, sans-serif";

  function lines(ctx, text, maxW) {
    var words = String(text).split(/[ \t\n]+/), out = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line);
    return out;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function logo(ctx, x, y, s) {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.95)'; roundRect(ctx, x, y, s, s, s * 0.28); ctx.fill();
    ctx.strokeStyle = '#E8875F'; ctx.lineWidth = s * 0.085; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x + s * 0.45, y + s * 0.45, s * 0.24, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.63, y + s * 0.63); ctx.lineTo(x + s * 0.8, y + s * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.45, y + s * 0.34); ctx.lineTo(x + s * 0.45, y + s * 0.56); ctx.stroke();
    ctx.restore();
  }

  // card: { eyebrow, title, sub, chips: [text], footer }
  function draw(card) {
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#FF9A76'); g.addColorStop(0.55, '#FFB07C'); g.addColorStop(1, '#FFD08A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // soft light, like the app's dawn sky
    [[880, 180, 420, 'rgba(255,255,255,.28)'], [120, 1180, 520, 'rgba(255,236,214,.35)'], [960, 1100, 300, 'rgba(255,255,255,.18)']].forEach(function (o) {
      var r = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], o[2]); r.addColorStop(0, o[3]); r.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    });
    var ink = '#3B1D0E', pad = 96;
    logo(ctx, pad, pad, 88);
    ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 40px ' + FONT; ctx.fillText('Find Me the Money', pad + 116, pad + 58);
    // eyebrow
    ctx.font = '700 34px ' + FONT;
    var eb = String(card.eyebrow || '').toUpperCase().split('').join(String.fromCharCode(8202));
    ctx.fillStyle = 'rgba(59,29,14,.72)'; ctx.fillText(eb, pad, 470);
    // title: as big as fits in 3 lines
    var size = 132, tl;
    for (; size > 64; size -= 6) { ctx.font = '600 ' + size + 'px ' + FONT; tl = lines(ctx, String(card.title).replace(/ (\S{1,3})$/, '\u00a0$1'), W - pad * 2); if (tl.length <= 3) break; }
    ctx.fillStyle = ink; var y = 470 + size * 1.15;
    tl.forEach(function (l) { ctx.fillText(l, pad, y); y += size * 1.04; });
    // sub
    ctx.font = '500 46px ' + FONT; ctx.fillStyle = 'rgba(59,29,14,.85)'; y += 26;
    lines(ctx, card.sub || '', W - pad * 2).slice(0, 3).forEach(function (l) { ctx.fillText(l, pad, y); y += 62; });
    // chips
    var cx = pad, cy = H - 300;
    ctx.font = '600 36px ' + FONT;
    (card.chips || []).slice(0, 3).forEach(function (t) {
      var w = ctx.measureText(t).width + 64;
      if (cx + w > W - pad) { cx = pad; cy += 92; }
      ctx.fillStyle = 'rgba(255,255,255,.55)'; roundRect(ctx, cx, cy, w, 74, 37); ctx.fill();
      ctx.fillStyle = ink; ctx.fillText(t, cx + 32, cy + 49); cx += w + 18;
    });
    // footer
    ctx.font = '500 32px ' + FONT; ctx.fillStyle = 'rgba(59,29,14,.7)';
    ctx.fillText(card.footer || 'Finding the money, one payday at a time.', pad, H - 96);
    return c;
  }
  function build(card, cb) {
    var go = function () {
      var canvas = draw(card), url = canvas.toDataURL('image/png');
      canvas.toBlob(function (blob) { cb({ url: url, blob: blob }); }, 'image/png');
    };
    try { if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('600 100px Manrope'), document.fonts.load('500 40px Manrope')]).then(go, go); return; } } catch (e) {}
    go();
  }
  window.FMTMShare = { build: build };
})();
