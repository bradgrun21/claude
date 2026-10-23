// Keeps the app working offline. Bump VERSION after each deploy so phones pick up the new files.
var VERSION = 'fmtm-2026-10-23l';
var FILES = ['./', 'index.html', 'styles.css', 'core.js', 'share.js', 'app.js', 'privacy.html', 'manifest.webmanifest', 'icons/icon.svg', 'icons/apple-touch-icon.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
// network first, so a new deploy shows up right away; the cache is the offline fallback
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); return res;
  }).catch(function () { return caches.match(e.request); }));
});
