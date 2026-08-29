/**
 * Exit re-entry visa requests API layer — the staff review queue. A
 * worker's own submit/list/cancel calls live in features/ess/ess.api.js
 * (/api/me/exit-reentry), not here.
 */
import { api } from '../../lib/axios.js';

export async function listExitReentry(params) {
  const { data } = await api.get('/exit-documents/exit-reentry', { params });
  return data.data; // { items, total, page, pages }
}

export async function decideExitReentry(id, payload) {
  const { data } = await api.patch(`/exit-documents/exit-reentry/${id}/decide`, payload);
  return data.data;
}

export async function markExitReentryIssued(id, payload) {
  const { data } = await api.patch(`/exit-documents/exit-reentry/${id}/issue`, payload);
  return data.data;
}
