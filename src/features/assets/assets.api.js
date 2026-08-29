/**
 * Assets API layer — staff CRUD + the assign/return workflow. A Worker's
 * own read-only view lives in features/ess/ess.api.js (/api/me/assets).
 */
import { api } from '../../lib/axios.js';

export async function listAssets(params) {
  const { data } = await api.get('/assets', { params });
  return data.data; // { items, total, page, pages }
}

export async function getAsset(id) {
  const { data } = await api.get(`/assets/${id}`);
  return data.data; // includes .history
}

export async function createAsset(payload) {
  const { data } = await api.post('/assets', payload);
  return data.data;
}

export async function updateAsset(id, payload) {
  const { data } = await api.patch(`/assets/${id}`, payload);
  return data.data;
}

export async function setAssetStatus(id, status) {
  const { data } = await api.patch(`/assets/${id}/status`, { status });
  return data.data;
}

export async function deleteAsset(id) {
  const { data } = await api.delete(`/assets/${id}`);
  return data.data;
}

export async function assignAsset(id, payload) {
  const { data } = await api.post(`/assets/${id}/assign`, payload);
  return data.data;
}

export async function returnAsset(id, payload) {
  const { data } = await api.post(`/assets/${id}/return`, payload);
  return data.data;
}

/** Current + past assignments for one employee — used by the Employee profile panel. */
export async function listAssetsByEmployee(employeeId) {
  const { data } = await api.get(`/assets/by-employee/${employeeId}`);
  return data.data;
}
