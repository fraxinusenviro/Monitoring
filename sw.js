const CACHE_VERSION = 'v1';
const CACHE_STATIC = `envirologstatic-${CACHE_VERSION}`;
const CACHE_TILES = 'envirolog-tiles';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/config.js',
  '/js/db.js',
  '/js/utils.js',
  '/js/app.js',
  '/js/entry-form.js',
  '/js/library.js',
  '/js/reports.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_STATIC && k !== CACHE_TILES).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Cache map tiles with a separate cache (network-first, then cache)
  if (url.hostname.includes('tile.openstreetmap.org') || url.hostname.includes('tiles.')) {
    event.respondWith(
      caches.open(CACHE_TILES).then(cache =>
        fetch(event.request).then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }).catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && event.request.method === 'GET') {
          caches.open(CACHE_STATIC).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Return the app shell for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
