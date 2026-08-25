/**
 * Minimal service worker — exists only to satisfy Chrome's PWA
 * installability requirement (a registered SW with a fetch handler).
 *
 * Deliberately does NO caching. This app changes often (new milestones ship
 * regularly) and there's no offline-use requirement yet — a caching service
 * worker would risk serving stale JS/API responses, which is a worse bug
 * than "no offline support". If offline support is wanted later, add a
 * cache strategy here deliberately, not as a side effect of installability.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Empty handler = browser's normal network behavior. Its mere presence is
// what satisfies the install criteria.
self.addEventListener('fetch', () => {});
