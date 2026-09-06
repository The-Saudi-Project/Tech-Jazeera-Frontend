/**
 * Leave API layer — LeaveType configuration + the staff review queue.
 * A Worker's own submit/list/cancel calls live in features/ess/ess.api.js
 * instead (/api/me/leave), not here.
 */
import { api } from '../../lib/axios.js';

export async function listLeaveTypes(params) {
  const { data } = await api.get('/leave-types', { params });
  return data.data;
}

export async function createLeaveType(payload) {
  const { data } = await api.post('/leave-types', payload);
  return data.data;
}

export async function updateLeaveType(id, payload) {
  const { data } = await api.patch(`/leave-types/${id}`, payload);
  return data.data;
}

export async function listLeaveRequests(params) {
  const { data } = await api.get('/leave', { params });
  return data.data; // { items, total, page, pages }
}

/** A STAFF member submitting their OWN leave request (Coordinator/HR/
 *  Manager/Accounts). Workers use ess.api.js's submitMyLeave (/api/me/leave)
 *  instead. `payload` is a FormData (see SubmitLeavePanel's FormData-building
 *  pattern) — the attachment field is optional, unlike a reimbursement receipt. */
export async function submitLeaveRequest(payload) {
  const { data } = await api.post('/leave', payload);
  return data.data;
}

export async function decideLeaveRequest(id, payload) {
  const { data } = await api.patch(`/leave/${id}/decide`, payload);
  return data.data;
}

export async function acknowledgeLeaveRequest(id) {
  const { data } = await api.patch(`/leave/${id}/acknowledge`);
  return data.data;
}

/** Download a leave request's attachment as an authenticated Blob, named by its original filename. */
export async function downloadLeaveAttachment(id, filename) {
  const res = await api.get(`/leave/${id}/attachment`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
