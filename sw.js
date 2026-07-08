// Auctio Mobile — service worker (fonctionnement hors-ligne)
const CACHE = 'auctio-mobile-v1';
const FICHIERS = ['./', './index.html', './xlsx.min.js', './manifest.webmanifest', './icon-180.png', './icon-512.png', './logo-etude.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache d'abord (hors-ligne), réseau en secours + mise à jour du cache
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((rep) => {
      const reseau = fetch(e.request).then((r) => {
        if (r && r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
        return r;
      }).catch(() => rep);
      return rep || reseau;
    })
  );
});
