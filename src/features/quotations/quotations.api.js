/**
 * Quotations API layer. The PDF is fetched as an authenticated Blob and saved,
 * like the attendance export and document downloads.
 */
import { api } from '../../lib/axios.js';

export async function listQuotations(params) {
  const { data } = await api.get('/quotations', { params });
  return data.data; // { items, total, page, pages }
}

export async function getQuotation(id) {
  const { data } = await api.get(`/quotations/${id}`);
  return data.data;
}

export async function createQuotation(payload) {
  const { data } = await api.post('/quotations', payload);
  return data.data;
}

export async function updateQuotation(id, payload) {
  const { data } = await api.patch(`/quotations/${id}`, payload);
  return data.data;
}

export async function duplicateQuotation(id) {
  const { data } = await api.post(`/quotations/${id}/duplicate`);
  return data.data;
}

export async function deleteQuotation(id) {
  await api.delete(`/quotations/${id}`);
}

/** Download the quotation PDF, named by its quotation number. */
export async function downloadQuotationPdf(id, quotationNumber) {
  const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${quotationNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
