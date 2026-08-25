/**
 * Staff-user API layer (P2-M2). Never touches Worker logins — those stay on
 * employees.api.js's createEmployeeLogin, linked to an Employee record.
 */
import { api } from '../../lib/axios.js';

export async function listStaffUsers(params) {
  const { data } = await api.get('/users', { params });
  return data.data;
}

export async function createStaffUser(payload) {
  const { data } = await api.post('/users', payload);
  return data.data; // { user, tempPassword }
}

export async function updateStaffUser(id, payload) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data.data;
}
