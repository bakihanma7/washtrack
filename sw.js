/* ==========================================================
   WashTrack Pro — service worker
   Caches the app shell (HTML/CSS/JS + favicon/manifest) so the
   app opens and works offline. Data itself already lives in
   localStorage (no network calls for app data), so caching the
   shell is enough to make the whole thing usable offline.
   Bump CACHE_NAME whenever shipping a shell change so old
   caches get cleaned up on activate.
   ========================================================== */
const CACHE_NAME = 'washtrackpro-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg',
  './css/styles.css',
  './js/data.js',
  './js/auth.js',
  './js/platform.js',
  './js/dropdown.js',
  './js/modals.js',
  './js/script.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/* Cache-first for same-origin app-shell files (works offline once
   cached); everything cross-origin (Google Fonts, jsQR CDN, the QR
   image API, etc.) just passes straight through to the network. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
