/**
 * Timesheet Processor API layer. Both calls send multipart FormData (file +
 * fields). `preview` returns the computed JSON; `export` fetches the .xlsx as an
 * authenticated Blob (a plain link couldn't carry the in-memory token) and
 * triggers a download — the same pattern as the attendance/document exports.
 */
import { api } from '../../lib/axios.js';

/** POST /timesheet-processor/preview → { employee, rows, summary, warnings, … } */
export async function previewTimesheet(formData) {
  const { data } = await api.post('/timesheet-processor/preview', formData);
  return data.data;
}

/** POST /timesheet-processor/export → downloads the formatted .xlsx. */
export async function exportTimesheet(formData, filename) {
  const res = await api.post('/timesheet-processor/export', formData, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
