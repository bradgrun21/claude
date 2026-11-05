import { defineConfig } from 'vite';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/*
 * Writes dist/sw.js after each build with the exact list of files to cache, so the city
 * works offline after the first visit. Bump nothing by hand: the cache name is a hash of the file list.
 */
function offlineCache() {
  return {
    name: 'life-city-offline-cache',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle);
      const pub = join(process.cwd(), 'public');
      const walk = (dir) => existsSync(dir) ? readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [relative(pub, p).split('\\').join('/')]; }) : [];
      const publicFiles = walk(pub).filter((f) => !/(^|\/)(README\.md|roles\.json|\.DS_Store)$/.test(f) && f !== 'sw.js');
      const all = ['./', ...[...files, ...publicFiles].filter((f) => !/\.woff$/.test(f)).map((f) => './' + f)];
      const version = createHash('sha1').update(all.join('|') + Object.values(bundle).map((c) => c.code || '').join('').length).digest('hex').slice(0, 10);
      const source = `/* Life City offline cache — generated at build time. */
const CACHE = 'life-city-${version}';
const FILES = ${JSON.stringify(all)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('life-city-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; }).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  })));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineCache()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } }
  },
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
});
