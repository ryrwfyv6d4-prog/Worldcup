import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Forward Worker API requests directly — use clone() to be safe on all browsers.
registerRoute(
  ({ url }) => url.hostname === 'worldcup.phil-remington.workers.dev',
  ({ request }) => fetch(request.clone())
);

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
