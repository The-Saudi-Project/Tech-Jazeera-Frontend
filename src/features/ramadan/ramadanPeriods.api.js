/**
 * Ramadan periods API layer (P3-E) — the configurable Ramadan calendar +
 * hour caps. Read-open to any authenticated user; create/update/delete
 * gated server-side to Admin/Manager/HR (see holidays' identical pattern).
 */
import { api } from '../../lib/axios.js';

export async function listRamadanPeriods(params) {
  const { data } = await api.get('/ramadan-periods', { params });
  return data.data;
}

export async function createRamadanPeriod(payload) {
  const { data } = await api.post('/ramadan-periods', payload);
  return data.data;
}

export async function updateRamadanPeriod(id, payload) {
  const { data } = await api.patch(`/ramadan-periods/${id}`, payload);
  return data.data;
}

export async function deleteRamadanPeriod(id) {
  const { data } = await api.delete(`/ramadan-periods/${id}`);
  return data.data;
}
