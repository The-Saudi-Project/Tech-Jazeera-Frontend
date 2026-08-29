/**
 * Reimbursement claims API layer — the staff review queue. A worker's own
 * submit/list/cancel calls live in features/ess/ess.api.js instead
 * (/api/me/reimbursements), not here.
 */
import { api } from '../../lib/axios.js';

export async function listReimbursements(params) {
  const { data } = await api.get('/financial-requests/reimbursements', { params });
  return data.data; // { items, total, page, pages }
}

export async function decideReimbursement(id, payload) {
  const { data } = await api.patch(`/financial-requests/reimbursements/${id}/decide`, payload);
  return data.data;
}

export async function markReimbursementPaid(id) {
  const { data } = await api.patch(`/financial-requests/reimbursements/${id}/pay`);
  return data.data;
}

/** Download a claim's receipt as an authenticated Blob, named by its original filename. */
export async function downloadReceipt(id, filename) {
  const res = await api.get(`/financial-requests/reimbursements/${id}/receipt`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
