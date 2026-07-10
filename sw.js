// Auctio Mobile — service worker (hors-ligne robuste)
// Un cache STABLE : les mises à jour rafraîchissent les fichiers sans jamais
// supprimer une version qui marche. L'app reste ouvrable sans réseau,
// même si un déploiement est incomplet.
const CACHE = 'auctio-mobile';
const FICHIERS = ['./', './index.html', './xlsx.min.js', './exceljs.min.js', './manifest.webmanifest', './icon-180.png', './icon-512.png', './logo-etude.png', './sceau-etude.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // chaque fichier individuellement : un manquant ne bloque pas les autres,
      // et un échec ne retire JAMAIS la version déjà en cache
      Promise.all(FICHIERS.map((f) =>
        fetch(f, { cache: 'no-cache' }).then((r) => { if (r && r.ok) return c.put(f, r); }).catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    // ne purge que les ANCIENS caches versionnés (auctio-mobile-v1…v6)
    caches.keys().then((cles) => Promise.all(
      cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // ne gérer QUE les fichiers de l'app — les appels externes (ex. Base
  // Adresse Nationale) passent directement au réseau
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const enCache = await caches.match(e.request, { ignoreSearch: true });
    // mise à jour silencieuse en arrière-plan quand le réseau répond
    const reseau = fetch(e.request).then((r) => {
      if (r && r.ok) { const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
      return r;
    }).catch(() => null);
    if (enCache) { e.waitUntil(reseau.catch(() => null)); return enCache; }
    const r = await reseau;
    if (r) return r;
    // dernier recours : toute navigation retombe sur l'app en cache
    if (e.request.mode === 'navigate') {
      const secours = await caches.match('./index.html', { ignoreSearch: true });
      if (secours) return secours;
    }
    return new Response('Hors-ligne', { status: 503, statusText: 'Hors-ligne' });
  })());
});
