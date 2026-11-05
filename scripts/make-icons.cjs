/* Renders the app icons from one SVG using the preinstalled Chromium. Run: npm run icons */
const { chromium } = require('playwright');
const { writeFileSync } = require('fs');
const path = require('path');

const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC3E6"/><stop offset="1" stop-color="#F4E6CF"/></linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FB0DC"/><stop offset="1" stop-color="#3A8FC0"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#sky)"/>
  <g transform="translate(256 270) scale(${pad ? 0.78 : 1}) translate(-256 -270)">
    <circle cx="380" cy="130" r="44" fill="#FFE29A"/>
    <rect x="40" y="318" width="432" height="120" rx="40" fill="url(#sea)"/>
    <path d="M86 300 h340 a18 18 0 0 1 18 18 v26 l-24 50 H92 l-24 -50 v-26 a18 18 0 0 1 18 -18z" fill="#9C7653"/>
    <rect x="68" y="282" width="376" height="40" rx="16" fill="#8DC86A"/>
    <rect x="120" y="214" width="70" height="72" fill="#F6EEDF"/><path d="M110 218 L155 172 L200 218z" fill="#B97F62"/><rect x="146" y="252" width="18" height="34" fill="#7A5A3C"/>
    <rect x="214" y="190" width="84" height="96" fill="#FFFDF7"/><path d="M206 194 L256 146 L306 194z" fill="#2F4058"/><rect x="246" y="118" width="20" height="40" fill="#FFFDF7"/><path d="M240 122 L256 94 L272 122z" fill="#2F4058"/>
    <rect x="322" y="224" width="66" height="62" fill="#F2E2CF"/><path d="M312 228 L355 188 L398 228z" fill="#4F8E6A"/>
    <circle cx="96" cy="262" r="22" fill="#5FA145"/><circle cx="414" cy="258" r="24" fill="#4E8A3A"/>
    <path d="M70 372 q30 -14 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#fff" stroke-opacity=".6" stroke-width="8" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const out = path.join(__dirname, '..', 'public', 'icons');
  for (const [name, size, pad] of [['icon-512.png', 512, false], ['icon-192.png', 192, false], ['apple-touch-icon.png', 180, true], ['icon-maskable-512.png', 512, true]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${art(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    writeFileSync(path.join(out, name), await page.screenshot({ omitBackground: !pad, clip: { x: 0, y: 0, width: size, height: size } }));
  }
  writeFileSync(path.join(out, 'icon.svg'), art(false));
  await browser.close();
  console.log('icons written');
})();
