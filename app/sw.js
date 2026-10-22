// Service worker for the installable web app (PWA): lets the Codex open offline.
// The page itself is fetched fresh whenever you're online, so a new upload shows up straight away;
// the saved copy is only used when there's no connection. Built by tools/build.py (version below).
const VERSION = '632da0aceaec';
const CACHE = 'codex35-' + VERSION, FONTS = 'codex35-fonts';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/favicon-64.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('codex35-') && k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google Fonts: use the saved copy, refresh it in the background
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.open(FONTS).then(async c => { const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net; }));
    return;
  }
  if (url.origin !== location.origin) return;
  // the app page: network first (fresh version), saved copy when offline
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')){
    e.respondWith((async () => {
      try { const r = await fetch(req, {cache: 'no-cache'}); if (r.ok){ const c = await caches.open(CACHE); c.put('./index.html', r.clone()); } return r; }
      catch { return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error(); }
    })());
    return;
  }
  // icons and manifest: saved copy first
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok){ const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })));
});
