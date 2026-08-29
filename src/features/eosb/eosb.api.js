/**
 * EOSB settlements API layer. Figures are always computed server-side —
 * this module only ever sends employee/exitDate/exitReason/notes, never a
 * money amount.
 */
import { api } from '../../lib/axios.js';

export async function listSettlements(params) {
  const { data } = await api.get('/eosb', { params });
  return data.data; // { items, total, page, pages }
}

export async function getSettlement(id) {
  const { data } = await api.get(`/eosb/${id}`);
  return data.data;
}

export async function createSettlement(payload) {
  const { data } = await api.post('/eosb', payload);
  return data.data;
}

export async function deleteSettlement(id) {
  const { data } = await api.delete(`/eosb/${id}`);
  return data.data;
}

/** Download the settlement PDF as an authenticated Blob (can't use a plain <a>/<img>). */
export async function downloadSettlementPdf(id, employeeCode) {
  const res = await api.get(`/eosb/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EOSB-${employeeCode}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
