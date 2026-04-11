import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// Guard: do not intercept any requests to the Cloudflare Worker API.
// iOS Safari throws "FetchEvent.respondWith received an error: Load failed"
// whenever the SW intercepts cross-origin requests to this domain.
// import.meta.env is NOT inlined into the SW sub-build, so hardcode the
// hostname directly. Returning without calling event.respondWith lets the
// browser handle the request natively, bypassing the SW entirely.
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('workers.dev')) {
    return; // Do not intercept — browser handles natively
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
