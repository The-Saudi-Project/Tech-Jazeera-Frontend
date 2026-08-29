/**
 * Staff-user API layer — manages EXISTING logins. Creation, staff or Worker
 * alike, always goes through employees.api.js's createEmployeeLogin, since a
 * login is meaningless without the Employee it's linked to.
 */
import { api } from '../../lib/axios.js';

export async function listStaffUsers(params) {
  const { data } = await api.get('/users', { params });
  return data.data;
}

export async function updateStaffUser(id, payload) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data.data;
}

/** POST /users/:id/reset-password — returns { tempPassword }, shown once. */
export async function resetStaffPassword(id) {
  const { data } = await api.post(`/users/${id}/reset-password`);
  return data.data;
}

/** DELETE /users/:id — permanent, not the same as Deactivate. */
export async function deleteStaffUser(id) {
  await api.delete(`/users/${id}`);
}
