/**
 * Payroll API layer — the staff side. A worker's own payslip
 * viewing/download lives in features/ess/ess.api.js (/api/me/payslips).
 */
import { api } from '../../lib/axios.js';

export async function listPayrollRuns(params) {
  const { data } = await api.get('/payroll', { params });
  return data.data; // { items, total, page, pages }
}

export async function getPayrollRun(id) {
  const { data } = await api.get(`/payroll/${id}`);
  return data.data;
}

export async function createPayrollRun(payload) {
  const { data } = await api.post('/payroll', payload);
  return data.data;
}

export async function updatePayrollLine(runId, lineId, payload) {
  const { data } = await api.patch(`/payroll/${runId}/lines/${lineId}`, payload);
  return data.data;
}

export async function finalizePayrollRun(id) {
  const { data } = await api.patch(`/payroll/${id}/finalize`);
  return data.data;
}

export async function deletePayrollRun(id) {
  const { data } = await api.delete(`/payroll/${id}`);
  return data.data;
}

/** Download one employee's payslip PDF for this run. */
export async function downloadPayslipPdf(runId, lineId, filename) {
  const res = await api.get(`/payroll/${runId}/lines/${lineId}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
