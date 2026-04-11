import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// Guard: do not intercept any requests to the Worker API.
// iOS Safari throws "FetchEvent.respondWith received an error: TypeError: Load
// failed" whenever the SW intercepts cross-origin requests to this domain —
// even GET requests. By returning early (not calling event.respondWith), the
// browser handles those requests natively and the SW is bypassed entirely.
const WORKER_API_URL = import.meta.env.VITE_WALL_API_URL || '';
self.addEventListener('fetch', (event) => {
  if (WORKER_API_URL && event.request.url.startsWith(WORKER_API_URL)) {
    return; // Let the browser fetch natively — do not intercept
  }
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Worker API requests are intentionally excluded above.
// Only cache third-party APIs that don't have the iOS Safari cross-origin bug.
registerRoute(
  /^https:\/\/api\.football-data\.org\//,
  new NetworkFirst({
    cacheName: 'football-api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 1800 })],
  })
);

registerRoute(
  /^https:\/\/crests\.football-data\.org\//,
  new CacheFirst({
    cacheName: 'team-crests-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 604800 })],
  })
);
