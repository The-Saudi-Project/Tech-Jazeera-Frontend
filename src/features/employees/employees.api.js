/**
 * Employees API layer — the only file that knows employee endpoint URLs.
 */
import { api } from '../../lib/axios.js';

/** GET /employees — params: page, limit, search, status, alerts, sortBy, sortOrder */
export async function listEmployees(params) {
  const { data } = await api.get('/employees', { params });
  return data.data; // { items, total, page, pages }
}

export async function getEmployee(id) {
  const { data } = await api.get(`/employees/${id}`);
  return data.data;
}

export async function createEmployee(payload) {
  const { data } = await api.post('/employees', payload);
  return data.data;
}

export async function updateEmployee(id, payload) {
  const { data } = await api.patch(`/employees/${id}`, payload);
  return data.data;
}

export async function deleteEmployee(id) {
  await api.delete(`/employees/${id}`);
}

/**
 * POST /employees/:id/user — provision a Worker login (Admin/HR).
 * Returns { user, tempPassword }; the temp password is shown ONCE.
 * `payload.email` is optional — only needed when the employee has no email.
 */
export async function createEmployeeLogin(id, payload = {}) {
  const { data } = await api.post(`/employees/${id}/user`, payload);
  return data.data;
}

/** POST /employees/:id/user/reset-password — returns { tempPassword }, shown once. */
export async function resetEmployeeLoginPassword(id) {
  const { data } = await api.post(`/employees/${id}/user/reset-password`);
  return data.data;
}
