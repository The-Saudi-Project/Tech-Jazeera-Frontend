/**
 * Clients API layer — the only file that knows client endpoint URLs.
 */
import { api } from '../../lib/axios.js';

/** GET /clients — params: page, limit, search, status, industry, sortBy, sortOrder */
export async function listClients(params) {
  const { data } = await api.get('/clients', { params });
  return data.data; // { items, total, page, pages }
}

export async function getClient(id) {
  const { data } = await api.get(`/clients/${id}`);
  return data.data;
}

export async function createClient(payload) {
  const { data } = await api.post('/clients', payload);
  return data.data;
}

export async function updateClient(id, payload) {
  const { data } = await api.patch(`/clients/${id}`, payload);
  return data.data;
}

export async function deleteClient(id) {
  await api.delete(`/clients/${id}`);
}
