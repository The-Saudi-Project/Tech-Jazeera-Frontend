/**
 * Attendance API layer. The export helpers fetch the file as a Blob through
 * the authenticated axios instance (a plain <a href> link couldn't send the
 * in-memory access token), then trigger a browser download.
 */
import { api } from '../../lib/axios.js';

/** POST /attendance/bulk { date, records } */
export async function markBulk(payload) {
  const { data } = await api.post('/attendance/bulk', payload);
  return data.data;
}

/** GET /attendance?from&to[&employee] → records[] (for the grid) */
export async function listAttendance(params) {
  const { data } = await api.get('/attendance', { params });
  return data.data;
}

/** GET /attendance/summary?from&to → { from, to, statuses, rows } */
export async function getSummary(params) {
  const { data } = await api.get('/attendance/summary', { params });
  return data.data;
}

/** Download the export as a file. format: 'xlsx' | 'pdf'. */
export async function downloadExport({ format, from, to }) {
  const res = await api.get('/attendance/export', {
    params: { format, from, to },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${from}_to_${to}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
