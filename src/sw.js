import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

// iOS Safari fix for Cloudflare Worker API requests.
//
// Simply returning without calling event.respondWith() is not sufficient on
// iOS Safari — even unhandled fetch events fail for cross-origin requests with
// bodies ("FetchEvent.respondWith received an error: Load failed").
//
// We must call event.respondWith() explicitly. The key fix is to materialise
// the body as an ArrayBuffer BEFORE passing it to fetch(). iOS Safari drops
// ReadableStream bodies when they flow through a SW fetch handler, but
// ArrayBuffer bodies (concrete bytes) are forwarded correctly.
//
// Note: import.meta.env is NOT inlined in the VitePWA SW sub-build, so the
// hostname is hardcoded rather than read from VITE_WALL_API_URL.
self.addEventListener('fetch', (event) => {
  if (!event.request.url.includes('workers.dev')) return;
  event.respondWith((async () => {
    const { url, method, headers } = event.request;
    if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
      return fetch(url, { method, headers });
    }
    // Materialise body as ArrayBuffer — avoids iOS Safari ReadableStream bug
    const body = await event.request.arrayBuffer();
    return fetch(url, {
      method,
      headers,
      body: body.byteLength > 0 ? body : undefined,
    });
  })());
});

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
