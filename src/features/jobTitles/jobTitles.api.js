/**
 * Job titles API — the admin-managed picklist behind Mobilisation's Job
 * title field. Read is open to any staff role; create/update/delete are
 * gated server-side (Admin/Manager/any ApprovalRole member) — a 403 here
 * just means the viewer isn't eligible, not that something's broken.
 */
import { api } from '../../lib/axios.js';

export async function listJobTitles(params = {}) {
  const { data } = await api.get('/job-titles', { params });
  return data.data; // [{ _id, name, isActive }]
}

export async function createJobTitle(name) {
  const { data } = await api.post('/job-titles', { name });
  return data.data;
}
