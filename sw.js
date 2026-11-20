// Offline cache for the app shell. User data is NOT here — it lives in the browser's localStorage.
// Bump VERSION when publishing a new build so phones drop the old cache.
const VERSION = 'fulis-gegma-v13';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Pages: network first (so a new version shows up), cache when offline. Other files: cache first.
// The PDF reader (pdf.js from cdnjs) is cached after first use so PDF import also works offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === 'https://cdnjs.cloudflare.com' && url.pathname.includes('/pdf.js/')) {
    e.respondWith(caches.open(VERSION).then(async c => (await c.match(req)) || fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
