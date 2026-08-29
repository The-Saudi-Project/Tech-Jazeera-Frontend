/**
 * Timesheets API layer — the staff review queue. A worker's own submit/list
 * calls live in features/ess/ess.api.js (/api/me/timesheets), not here.
 */
import { api } from '../../lib/axios.js';

export async function listTimesheets(params) {
  const { data } = await api.get('/timesheets', { params });
  return data.data; // { items, total, page, pages }
}

export async function decideTimesheet(id, payload) {
  const { data } = await api.patch(`/timesheets/${id}/decide`, payload);
  return data.data;
}

export async function bulkApproveTimesheets(ids) {
  const { data } = await api.post('/timesheets/bulk-approve', { ids });
  return data.data; // { requested, approved }
}
