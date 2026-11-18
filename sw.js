/* Offline support: network first, falls back to the cached copy when there is no connection. */
const V = 'natan-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'js/script.js', 'js/audio.js', 'js/content.js', 'js/extras.js', 'js/scene.js', 'js/cake.js', 'js/d3.js', 'css/d3.css', 'js/gl3d.js', 'js/cake3d.js', 'css/cake.css', 'css/scene.css', 'css/extras.css', 'css/lock.css', 'js/lock.js', 'assets/icon.svg', 'assets/natan.jpg', 'manifest.webmanifest'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); } return res; }).catch(() => caches.match(r)));
});
