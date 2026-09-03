/**
 * Timesheets API layer — the staff review queue. A worker's own submit/list
 * calls live in features/ess/ess.api.js (/api/me/timesheets), not here.
 */
import { api } from '../../lib/axios.js';

export async function listTimesheets(params) {
  const { data } = await api.get('/timesheets', { params });
  return data.data; // { items, total, page, pages }
}

/** A STAFF member submitting their OWN timesheet (Coordinator/HR/Manager/
 *  Accounts) — mirrors ess.api.js's submitMyTimesheet exactly (same single
 *  "summarize this week" action, no free-form fields). */
export async function submitTimesheet(payload) {
  const { data } = await api.post('/timesheets', payload);
  return data.data;
}

export async function decideTimesheet(id, payload) {
  const { data } = await api.patch(`/timesheets/${id}/decide`, payload);
  return data.data;
}

export async function bulkApproveTimesheets(ids) {
  const { data } = await api.post('/timesheets/bulk-approve', { ids });
  return data.data; // { requested, approved, skipped }
}

/**
 * A full day-by-day monthly report built from real Attendance records, in
 * the same formatted style as the Timesheet Processor's export. Only
 * Admin or a real Approval Role member can generate it — the server is the
 * real gate; a non-member gets a clear 403 here, same as the Approval Log.
 * Downloads an authenticated Blob, same pattern as every other export.
 */
export async function generateMonthlyReport({ employeeId, month, year }, filename) {
  const res = await api.post(
    '/timesheets/monthly-report',
    { employeeId, month, year },
    { responseType: 'blob' }
  );
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
