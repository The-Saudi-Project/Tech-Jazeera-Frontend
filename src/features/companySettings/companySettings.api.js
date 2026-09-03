/**
 * Company settings API layer — today just the logo embedded in the
 * Timesheet Processor's export. Admin-only, mirrors the server's own gate.
 */
import { api } from '../../lib/axios.js';

export async function getCompanySettings() {
  const { data } = await api.get('/company-settings');
  return data.data; // { logoUrl }
}

export async function uploadCompanyLogo(file) {
  const fd = new FormData();
  fd.append('logo', file);
  const { data } = await api.post('/company-settings/logo', fd);
  return data.data;
}

export async function removeCompanyLogo() {
  const { data } = await api.delete('/company-settings/logo');
  return data.data;
}
