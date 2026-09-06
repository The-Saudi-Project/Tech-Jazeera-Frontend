/**
 * Exit re-entry visa requests API layer — the staff review queue, plus a
 * staff member's own self-submission. A worker's own submit/list/cancel
 * calls live in features/ess/ess.api.js (/api/me/exit-reentry), not here.
 */
import { api } from '../../lib/axios.js';

/** A staff member (Coordinator/HR/Manager/Accounts/Executive) submitting
 *  their OWN request — the self-submission counterpart to /api/me. */
export async function submitExitReentry(payload) {
  const { data } = await api.post('/exit-documents/exit-reentry', payload);
  return data.data;
}

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
