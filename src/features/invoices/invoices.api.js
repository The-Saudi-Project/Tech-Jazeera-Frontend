/**
 * Invoices API layer. The PDF is fetched as an authenticated Blob and saved,
 * like the quotation PDF.
 */
import { api } from '../../lib/axios.js';

export async function listInvoices(params) {
  const { data } = await api.get('/invoices', { params });
  return data.data; // { items, total, page, pages }
}

export async function getInvoice(id) {
  const { data } = await api.get(`/invoices/${id}`);
  return data.data;
}

export async function createInvoice(payload) {
  const { data } = await api.post('/invoices', payload);
  return data.data;
}

export async function recordPayment(id, payload) {
  const { data } = await api.post(`/invoices/${id}/payments`, payload);
  return data.data;
}

export async function deleteInvoice(id) {
  const { data } = await api.delete(`/invoices/${id}`);
  return data.data;
}

/** Download the invoice PDF, named by its invoice number. */
export async function downloadInvoicePdf(id, invoiceNumber) {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${invoiceNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
