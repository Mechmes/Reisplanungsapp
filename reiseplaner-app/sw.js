const CACHE_NAME = 'reiseplaner-v2';
const ASSETS = [
  './',
  './index.html',
  './trip.html',
  './app.js',
  './trip.js',
  './store.js',
  './style.css',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Fremde Anfragen (z. B. Supabase) niemals cachen/abfangen - immer live.
  if (new URL(req.url).origin !== self.location.origin) return;

  // App-Dateien: network-first, damit Updates sofort ankommen; Cache nur als Offline-Fallback.
  event.respondWith(
    fetch(req)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      })
      .catch(() => caches.match(req))
  );
});
