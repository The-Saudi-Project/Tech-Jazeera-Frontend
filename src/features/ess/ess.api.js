/**
 * ESS ("me") API layer — the self-service surface a Worker sees. Every call
 * hits /api/me/*, which resolves against the server's req.user.employee —
 * there is never an id in these URLs the client could tamper with.
 */
import { api } from '../../lib/axios.js';

export async function getMyProfile() {
  const { data } = await api.get('/me');
  return data.data;
}

export async function listMyDocuments(params) {
  const { data } = await api.get('/me/documents', { params });
  return data.data; // { items, total, page, pages }
}

/** Fetch a document's file as a Blob (auth header can't ride a plain <a> link). */
export async function getMyDocumentFileBlob(id, version) {
  const { data } = await api.get(`/me/documents/${id}/file`, {
    params: version ? { version } : undefined,
    responseType: 'blob',
  });
  return data;
}

/** Fetch and save a file with its original name — same pattern as documents.api.js. */
export async function downloadMyDocumentFile(id, version, filename) {
  const blob = await getMyDocumentFileBlob(id, version);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function listMyLeave(params) {
  const { data } = await api.get('/me/leave', { params });
  return data.data;
}

export async function submitMyLeave(payload) {
  const { data } = await api.post('/me/leave', payload);
  return data.data;
}

export async function cancelMyLeave(id) {
  const { data } = await api.patch(`/me/leave/${id}/cancel`);
  return data.data;
}

/** POST /me/attendance/punch { lat?, lng?, accuracy? } — geofence/office-IP verified server-side. First
 *  punch of the day checks in; every punch after that pushes checkOutTime forward and recomputes hours. */
export async function punchMyAttendance(payload) {
  const { data } = await api.post('/me/attendance/punch', payload);
  return data.data; // { action: 'checked-in'|'checked-out', record }
}

export async function listMyAttendance(params) {
  const { data } = await api.get('/me/attendance', { params });
  return data.data;
}
