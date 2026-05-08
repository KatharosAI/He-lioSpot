// heliospot-v5 — bump version to force cache clear on all devices
const CACHE_NAME = 'heliospot-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/boussole.html',
  '/css/style.css',
  '/js/app.js',
  '/js/solar.js',
  '/js/compass.js',
  '/js/pvgis.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprime TOUS les anciens caches (v1, v2, v3, v4...)
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
      console.log('Deleting old cache:', k);
      return caches.delete(k);
    }))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // boussole.html : toujours réseau d'abord (pas de cache)
  if (e.request.url.includes('boussole.html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
