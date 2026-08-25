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

export async function decideLeaveRequest(id, payload) {
  const { data } = await api.patch(`/leave/${id}/decide`, payload);
  return data.data;
}

export async function acknowledgeLeaveRequest(id) {
  const { data } = await api.patch(`/leave/${id}/acknowledge`);
  return data.data;
}
