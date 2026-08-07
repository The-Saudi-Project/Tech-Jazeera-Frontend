/**
 * Auth API layer — the only file that knows auth endpoint URLs. Components
 * call these functions; they never touch axios directly. Each returns the
 * `data` payload from our standard { success, message, data } envelope.
 */
import { api } from '../../lib/axios.js';

/** POST /auth/login → { user, accessToken } (+ refresh cookie, set by server) */
export async function loginRequest(credentials) {
  const { data } = await api.post('/auth/login', credentials);
  return data.data;
}

/**
 * POST /auth/refresh → { user, accessToken } — restores a session on reload.
 * Single-flight: React StrictMode mounts effects twice in development, and a
 * refresh token is single-use — two parallel refreshes with one cookie would
 * waste a rotation. All concurrent callers share one HTTP request.
 */
let inflightRefresh = null;
export function refreshRequest() {
  inflightRefresh ??= api
    .post('/auth/refresh')
    .then(({ data }) => data.data)
    .finally(() => (inflightRefresh = null));
  return inflightRefresh;
}

/** POST /auth/logout — kills this device's session server-side */
export async function logoutRequest() {
  await api.post('/auth/logout');
}
