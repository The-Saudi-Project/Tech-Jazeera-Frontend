/**
 * Company settings API layer. Every route here is gated server-side by the
 * dynamic "Admin/Manager/manageRoles member" check (updateManageRoles is
 * the one Admin-only exception) — a 403 here means the viewer just isn't
 * eligible, not that something's broken.
 */
import { api } from '../../lib/axios.js';

export async function getCompanySettings() {
  const { data } = await api.get('/company-settings');
  return data.data;
}

export async function updateCompanySettings(payload) {
  const { data } = await api.patch('/company-settings', payload);
  return data.data;
}

export async function updateManageRoles(manageRoles) {
  const { data } = await api.patch('/company-settings/manage-roles', { manageRoles });
  return data.data;
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
