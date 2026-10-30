/* Find Me the Money: draws shareable win cards on the phone (canvas, nothing uploaded). */
(function () {
  'use strict';
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
  // the app icon: a magnifying glass over a dollar sign, on deep teal
  function logo(ctx, x, y, s) {
    ctx.save();
    var bg = ctx.createLinearGradient(0, y, 0, y + s); bg.addColorStop(0, '#1B2E2D'); bg.addColorStop(1, '#2A6B66');
    ctx.fillStyle = bg; roundRect(ctx, x, y, s, s, s * 0.24); ctx.fill();
    var cx = x + s * 0.444, cy = y + s * 0.444, r = s * 0.218;
    var rg = ctx.createLinearGradient(0, cy - r, 0, cy + r); rg.addColorStop(0, '#FFD08A'); rg.addColorStop(1, '#FF9A76');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#3A554D'; ctx.fill();
    ctx.lineWidth = s * 0.059; ctx.strokeStyle = rg; ctx.stroke();
    ctx.lineCap = 'round'; ctx.lineWidth = s * 0.089; ctx.strokeStyle = '#FF9A76';
    ctx.beginPath(); ctx.moveTo(x + s * 0.611, y + s * 0.611); ctx.lineTo(x + s * 0.769, y + s * 0.769); ctx.stroke();
    ctx.fillStyle = '#FFD08A'; ctx.font = '700 ' + Math.round(s * 0.3) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy + s * 0.01);
    ctx.restore();
  }

  // One layout per place people post. Story keeps clear of Instagram's top and bottom bars;
  // wide fits a Skool or Facebook post without cropping.
  var FORMATS = {
    story: { w: 1080, h: 1920, top: 220, eyebrow: 700, size: 136, lines: 4, chips: 1500, footer: 1700 },
    post: { w: 1080, h: 1350, top: 96, eyebrow: 470, size: 132, lines: 3, chips: 1050, footer: 1254 },
    square: { w: 1080, h: 1080, top: 84, eyebrow: 350, size: 112, lines: 3, chips: 830, footer: 1000 },
    wide: { w: 1600, h: 900, top: 80, eyebrow: 300, size: 104, lines: 2, chips: 690, footer: 830 }
  };
  // seven circles on a line, filled up to the step
  function path(ctx, x, y, w, step) {
    var r = 26, gap = (w - r * 2) / 6, ink = '#3B1D0E';
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(59,29,14,.18)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.stroke();
    if (step > 1) { ctx.strokeStyle = '#2A6B66'; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + r + gap * (step - 1), y); ctx.stroke(); }
    for (var i = 0; i < 7; i++) {
      var cx = x + r + gap * i, n = i + 1;
      ctx.beginPath(); ctx.arc(cx, y, n === step ? r + 6 : r, 0, Math.PI * 2);
      ctx.fillStyle = n < step ? '#2A6B66' : n === step ? '#FFFFFF' : 'rgba(255,255,255,.6)'; ctx.fill();
      if (n === step) { ctx.lineWidth = 6; ctx.strokeStyle = '#2A6B66'; ctx.stroke(); }
      ctx.fillStyle = n < step ? '#FFFFFF' : ink; ctx.font = '700 ' + (n === step ? 30 : 26) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n < step ? '✓' : String(n), cx, y + 1);
    }
    ctx.restore();
  }

  // card: { eyebrow, title, sub, chips: [text], footer, step (1-7, draws the path) }
  function draw(card, format) {
    var f = FORMATS[format] || FORMATS.post, W = f.w, H = f.h;
    var c = document.createElement('canvas'); c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#FF9A76'); g.addColorStop(0.55, '#FFB07C'); g.addColorStop(1, '#FFD08A');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // soft light, like the app's dawn sky
    [[W * 0.81, H * 0.13, 420, 'rgba(255,255,255,.28)'], [W * 0.11, H * 0.87, 520, 'rgba(255,236,214,.35)'], [W * 0.89, H * 0.81, 300, 'rgba(255,255,255,.18)']].forEach(function (o) {
      var r = ctx.createRadialGradient(o[0], o[1], 0, o[0], o[1], o[2]); r.addColorStop(0, o[3]); r.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    });
    var ink = '#3B1D0E', pad = format === 'wide' ? 90 : 96, maxW = W - pad * 2;
    logo(ctx, pad, f.top, 88);
    ctx.fillStyle = ink; ctx.textBaseline = 'alphabetic';
    ctx.font = '600 40px ' + FONT; ctx.fillText('Find Me the Money', pad + 116, f.top + 58);
    // eyebrow
    ctx.font = '700 34px ' + FONT;
    var eb = String(card.eyebrow || '').toUpperCase().split('').join(String.fromCharCode(8202));
    ctx.fillStyle = 'rgba(59,29,14,.72)'; ctx.fillText(eb, pad, f.eyebrow);
    // bottom up: footer, then chips, then the path; the title and sub get whatever room is left
    var chipsY = f.footer - 150, pathY = chipsY - 78, limit = (card.step ? pathY - 60 : chipsY - 40);
    var subMax = format === 'wide' ? 2 : 3, size = f.size, tl, sl;
    for (; size > 56; size -= 4) {
      ctx.font = '600 ' + size + 'px ' + FONT; tl = lines(ctx, String(card.title).replace(/ (\S{1,3})$/, ' $1'), maxW);
      var subSize = Math.max(34, Math.min(46, Math.round(size * 0.38)));
      ctx.font = '500 ' + subSize + 'px ' + FONT; sl = lines(ctx, card.sub || '', maxW).slice(0, subMax);
      var bottom = f.eyebrow + size * 1.15 + (tl.length - 1) * size * 1.04 + 26 + sl.length * subSize * 1.35;
      if (tl.length <= f.lines && bottom <= limit) break;
    }
    ctx.font = '600 ' + size + 'px ' + FONT; ctx.fillStyle = ink; var y = f.eyebrow + size * 1.15;
    tl.forEach(function (l) { ctx.fillText(l, pad, y); y += size * 1.04; });
    ctx.font = '500 ' + subSize + 'px ' + FONT; ctx.fillStyle = 'rgba(59,29,14,.85)'; y += 26 - size * 1.04 + subSize * 1.35;
    sl.forEach(function (l) { ctx.fillText(l, pad, y); y += subSize * 1.35; });
    if (card.step) path(ctx, pad, pathY, Math.min(maxW, 900), card.step);
    // chips
    var cx = pad, cy = chipsY;
    ctx.font = '600 36px ' + FONT;
    (card.chips || []).slice(0, 3).forEach(function (t) {
      var w = ctx.measureText(t).width + 64;
      if (cx + w > W - pad) { cx = pad; cy += 92; }
      if (cy + 74 > f.footer - 50) return;
      ctx.fillStyle = 'rgba(255,255,255,.55)'; roundRect(ctx, cx, cy, w, 74, 37); ctx.fill();
      ctx.fillStyle = ink; ctx.fillText(t, cx + 32, cy + 49); cx += w + 18;
    });
    // footer
    ctx.font = '500 32px ' + FONT; ctx.fillStyle = 'rgba(59,29,14,.7)';
    ctx.fillText(card.footer || 'Finding the money, one payday at a time.', pad, f.footer);
    return c;
  }
  function build(card, cb, format) {
    var go = function () {
      var canvas = draw(card, format), url = canvas.toDataURL('image/png');
      canvas.toBlob(function (blob) { cb({ url: url, blob: blob }); }, 'image/png');
    };
    try { if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('600 100px Manrope'), document.fonts.load('500 40px Manrope')]).then(go, go); return; } } catch (e) {}
    go();
  }
  // ----- a meal's recipe card: photo or emoji, name, cost per plate, ingredients, and where the recipe lives -----
  // r = { name, emoji, color, photo, plate, total, plates, saves, rows: [{ emoji, name, amt, cost }], link, video, footer }
  function ell(ctx, t, maxW) { t = String(t); if (ctx.measureText(t).width <= maxW) return t; while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
  function recipeDraw(r, img) {
    var W = 1080, pad = 72, heroH = 560, rowH = 96, MAX = 14, rows = r.rows.slice(0, MAX), more = r.rows.length - rows.length;
    var c = document.createElement('canvas'), ctx = c.getContext('2d');
    ctx.font = '700 84px ' + FONT; var nl = lines(ctx, r.name, W - pad * 2).slice(0, 2);
    var y0 = heroH + 40, H = y0 + nl.length * 92 + 40 + 84 + 70 + 50 + rows.length * rowH + (more > 0 ? 60 : 0) + 110 + (r.link ? 110 : 0) + 200;
    c.width = W; c.height = Math.max(1350, H);
    ctx.fillStyle = '#141414'; ctx.fillRect(0, 0, W, c.height);
    // hero: the meal photo, or its emoji on its color
    if (img) {
      var s = Math.max(W / img.width, heroH / img.height), iw = img.width * s, ih = img.height * s;
      ctx.drawImage(img, (W - iw) / 2, (heroH - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = r.color || '#7ED9C0'; ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, W, heroH); ctx.globalAlpha = 1;
      ctx.font = '280px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.emoji || '🍲', W / 2, heroH / 2 + 10);
    }
    var fade = ctx.createLinearGradient(0, heroH - 220, 0, heroH); fade.addColorStop(0, 'rgba(20,20,20,0)'); fade.addColorStop(1, '#141414');
    ctx.fillStyle = fade; ctx.fillRect(0, heroH - 220, W, 220);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // name
    var y = y0 + 70; ctx.fillStyle = '#F4F3EF'; ctx.font = '700 84px ' + FONT;
    nl.forEach(function (l) { ctx.fillText(l, pad, y); y += 92; });
    // chips: per plate, plates, saves
    y += 4; var cx = pad; ctx.font = '700 36px ' + FONT;
    [[r.plate, '#FFD08A', ' a plate'], [r.plates ? 'Feeds ' + r.plates : null, '#F4F3EF', ''], [r.saves, '#7ED9C0', '', 'Saves ']].forEach(function (k) {
      if (!k[0]) return; var t = (k[3] || '') + k[0] + k[2], w = ctx.measureText(t).width + 56;
      if (cx + w > W - pad) return;
      ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, cx, y - 6, w, 74, 37); ctx.fill();
      ctx.fillStyle = k[1]; ctx.fillText(t, cx + 28, y + 44); cx += w + 16;
    });
    y += 74 + 70;
    // ingredients
    if (rows.length) { ctx.font = '800 28px ' + FONT; ctx.fillStyle = '#A6A59F'; ctx.fillText('INGREDIENTS', pad, y); y += 30; }
    rows.forEach(function (row) {
      ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(pad, y, W - pad * 2, 2);
      ctx.font = '48px ' + FONT; ctx.fillStyle = '#F4F3EF'; ctx.fillText(row.emoji || '•', pad, y + 66);
      ctx.font = '700 36px ' + FONT; var costW = row.cost ? ctx.measureText(row.cost).width : 0;
      ctx.textAlign = 'right'; ctx.fillStyle = row.cost === '—' ? '#8B8A84' : '#F4F3EF'; if (row.cost) ctx.fillText(row.cost, W - pad, y + 60); ctx.textAlign = 'left';
      var mw = W - pad * 2 - 80 - costW - 30;
      ctx.font = '700 36px ' + FONT; ctx.fillStyle = '#F4F3EF'; ctx.fillText(ell(ctx, row.name, mw), pad + 80, y + 46);
      ctx.font = '500 28px ' + FONT; ctx.fillStyle = '#A6A59F'; ctx.fillText(ell(ctx, row.amt || '', mw), pad + 80, y + 82);
      y += rowH;
    });
    if (more > 0) { ctx.font = '600 30px ' + FONT; ctx.fillStyle = '#A6A59F'; ctx.fillText('+' + more + ' more', pad + 80, y + 44); y += 60; }
    if (rows.length) { ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(pad, y, W - pad * 2, 2); }
    if (r.total) { y += 70; ctx.font = '600 34px ' + FONT; ctx.fillStyle = '#A6A59F'; ctx.fillText('Meal total', pad, y); ctx.textAlign = 'right'; ctx.font = '800 40px ' + FONT; ctx.fillStyle = '#FFD08A'; ctx.fillText(r.total, W - pad, y); ctx.textAlign = 'left'; y += 40; }
    // where the recipe lives
    if (r.link) {
      y += 40; ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, pad, y, W - pad * 2, 84, 24); ctx.fill();
      ctx.font = '700 34px ' + FONT; ctx.fillStyle = '#F4F3EF'; ctx.fillText(ell(ctx, (r.video ? '▶️  Video on ' : '🔗  Recipe at ') + r.link, W - pad * 2 - 56), pad + 28, y + 54); y += 84;
    }
    // footer
    var fy = c.height - 140; logo(ctx, pad, fy, 72);
    ctx.font = '700 34px ' + FONT; ctx.fillStyle = '#F4F3EF'; ctx.fillText('Find Me the Money', pad + 96, fy + 32);
    ctx.font = '500 28px ' + FONT; ctx.fillStyle = '#A6A59F'; ctx.fillText(r.footer || 'Meal Math', pad + 96, fy + 70);
    return c;
  }
  function recipe(r, cb) {
    var go = function (img) {
      var canvas = recipeDraw(r, img), url = canvas.toDataURL('image/png');
      canvas.toBlob(function (blob) { cb({ url: url, blob: blob }); }, 'image/png');
    };
    var withImg = function () { if (!r.photo) { go(null); return; } var i = new Image(); i.onload = function () { go(i); }; i.onerror = function () { go(null); }; i.src = r.photo; };
    try { if (document.fonts && document.fonts.load) { Promise.all([document.fonts.load('700 84px Manrope'), document.fonts.load('500 28px Manrope')]).then(withImg, withImg); return; } } catch (e) {}
    withImg();
  }
  window.FMTMShare = { build: build, recipe: recipe, formats: Object.keys(FORMATS) };
})();
