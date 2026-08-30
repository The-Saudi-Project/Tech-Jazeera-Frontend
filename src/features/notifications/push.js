/**
 * Web Push subscription management (P3-F) — the browser-side half of
 * "push channel for expiry alerts + request status changes". Talks to the
 * service worker already registered for PWA installability (main.jsx);
 * this is the first thing that gives that service worker an actual job
 * beyond satisfying the install criteria.
 */
import { getVapidPublicKey, subscribeToPush, unsubscribeFromPush } from './notifications.api.js';

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** PushManager wants the VAPID key as a Uint8Array, not the base64url string
 *  the server hands out — this is the standard conversion every Web Push
 *  guide includes, not something specific to this app. */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getExistingPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Requests Notification permission (a real browser prompt — must be called
 * from a user gesture, e.g. a button click, not on page load) and, if
 * granted, subscribes this browser to push and registers it with the
 * server. Throws with a message the caller should show the user, rather
 * than swallowing failures silently.
 */
export async function enablePushNotifications() {
  if (!pushSupported()) throw new Error('Push notifications are not supported in this browser.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted.');

  const publicKey = await getVapidPublicKey();
  if (!publicKey) throw new Error('Push notifications are not configured on the server yet.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await subscribeToPush(subscription.toJSON());
  return subscription;
}

export async function disablePushNotifications() {
  const subscription = await getExistingPushSubscription();
  if (!subscription) return;
  await unsubscribeFromPush(subscription.endpoint);
  await subscription.unsubscribe();
}
