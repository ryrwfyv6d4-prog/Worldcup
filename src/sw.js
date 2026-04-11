import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// For GET/DELETE requests to the Worker API, forward with clone() to be safe.
// POST uploads are handled via postMessage below (see UPLOAD_PHOTO handler).
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

// Photo upload via SW messaging — bypasses iOS Safari "Load failed" bug.
//
// iOS Safari drops POST/PUT request bodies when a SW forwards event.request
// through fetch(), even with clone(). The fix: have the page postMessage the
// image data to the SW, and let the SW make its own fresh fetch() call.
// When fetch() is called from a 'message' event handler (not a 'fetch' event
// handler), iOS Safari does NOT drop the body.
const WORKER_API = 'https://worldcup.phil-remington.workers.dev';

self.addEventListener('message', async (event) => {
  if (event.data?.type !== 'UPLOAD_PHOTO') return;
  const { id, caption, person, buffer, contentType } = event.data;
  try {
    const blob = new Blob([buffer], { type: contentType || 'image/jpeg' });
    const formData = new FormData();
    formData.append('image', blob, 'photo.jpg');
    formData.append('caption', caption || '');
    formData.append('person', person || '');
    const res = await fetch(`${WORKER_API}/photos`, { method: 'POST', body: formData });
    const text = await res.text();
    if (!res.ok) {
      event.source?.postMessage({ type: 'UPLOAD_RESULT', id, ok: false, error: res.status.toString() });
      return;
    }
    event.source?.postMessage({ type: 'UPLOAD_RESULT', id, ok: true, data: JSON.parse(text) });
  } catch (e) {
    event.source?.postMessage({ type: 'UPLOAD_RESULT', id, ok: false, error: e.message });
  }
});
