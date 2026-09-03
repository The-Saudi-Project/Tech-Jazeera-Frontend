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

/** A STAFF member submitting their OWN reimbursement claim (Coordinator/HR/
 *  Manager/Accounts). Workers use ess.api.js's submitMyReimbursement
 *  instead. `formData` must include the receipt file (see
 *  MyRequestsPage.jsx's FormData-building pattern). */
export async function submitReimbursement(formData) {
  const { data } = await api.post('/financial-requests/reimbursements', formData);
  return data.data;
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
