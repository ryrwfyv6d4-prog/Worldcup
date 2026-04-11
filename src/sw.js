import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

// Take control immediately so updated SW activates without waiting for tab close
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// iOS Safari fix: Workbox's NetworkOnly calls fetch(request) without cloning.
// On iOS Safari, forwarding event.request to fetch() inside a SW drops the body
// of POST requests, causing "TypeError: Load failed". Cloning fixes this.
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
