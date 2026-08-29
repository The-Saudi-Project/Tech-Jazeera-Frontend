/**
 * Salary advances API layer — the staff review queue. A worker's own
 * submit/list/cancel calls live in features/ess/ess.api.js instead
 * (/api/me/advances), not here.
 */
import { api } from '../../lib/axios.js';

export async function listAdvances(params) {
  const { data } = await api.get('/financial-requests/advances', { params });
  return data.data; // { items, total, page, pages }
}

export async function decideAdvance(id, payload) {
  const { data } = await api.patch(`/financial-requests/advances/${id}/decide`, payload);
  return data.data;
}

export async function addAdvanceRepayment(id, payload) {
  const { data } = await api.post(`/financial-requests/advances/${id}/repayments`, payload);
  return data.data;
}
