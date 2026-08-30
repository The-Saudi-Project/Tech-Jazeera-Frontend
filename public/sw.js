/**
 * Service worker — started as the minimum needed for Chrome's PWA
 * installability (a registered SW with a fetch handler), now also the
 * receiving end of Web Push (P3-F): a 'push' event fires here even when no
 * tab is open, which is the whole point of push over an in-app poll.
 *
 * Still deliberately does NO caching. This app changes often (new
 * milestones ship regularly) and there's no offline-use requirement yet —
 * a caching service worker would risk serving stale JS/API responses,
 * which is a worse bug than "no offline support". If offline support is
 * wanted later, add a cache strategy here deliberately, not as a side
 * effect of installability or of adding push.
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

/**
 * A push message from the server (notification.service.js's pushToUser) —
 * payload is the exact JSON that was passed to webpush.sendNotification():
 * { title, body, url }. `waitUntil` keeps the service worker alive until
 * showNotification()'s promise resolves; without it the browser can kill
 * the worker before the notification actually renders.
 */
self.addEventListener('push', (event) => {
  let payload = { title: 'Al Jazeera ERP', body: '' };
  try {
    payload = event.data.json();
  } catch {
    // Non-JSON or empty payload — fall back to the generic title above
    // rather than throwing and dropping the notification entirely.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

/**
 * Clicking the OS notification: focus an already-open tab on this origin if
 * one exists (navigating it to the target URL), otherwise open a new one.
 * Without this, clicking a push notification does nothing.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
