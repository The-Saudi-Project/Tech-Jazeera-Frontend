/**
 * Certificate requests API layer — the staff review queue. A worker's own
 * submit/list/cancel/pdf calls live in features/ess/ess.api.js
 * (/api/me/certificates), not here.
 */
import { api } from '../../lib/axios.js';

export async function listCertificates(params) {
  const { data } = await api.get('/exit-documents/certificates', { params });
  return data.data; // { items, total, page, pages }
}

export async function decideCertificate(id, payload) {
  const { data } = await api.patch(`/exit-documents/certificates/${id}/decide`, payload);
  return data.data;
}

export async function markCertificateIssued(id) {
  const { data } = await api.patch(`/exit-documents/certificates/${id}/issue`);
  return data.data;
}

/** Download the certificate PDF, named by its type and the employee's code. */
export async function downloadCertificatePdf(id, filename) {
  const res = await api.get(`/exit-documents/certificates/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
