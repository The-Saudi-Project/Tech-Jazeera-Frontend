/**
 * MobilisationSettings API layer — Admin-only configuration of which
 * ApprovalRoles get read-only visibility (viewerRoles) or may self-mobilise
 * (selfMobiliseRoles). Deciding a mobilisation happens on its own review
 * screen instead — this is configuration only.
 */
import { api } from '../../lib/axios.js';

export async function getMobilisationSettings() {
  const { data } = await api.get('/mobilisation-settings');
  return data.data;
}

export async function updateMobilisationSettings(payload) {
  const { data } = await api.patch('/mobilisation-settings', payload);
  return data.data;
}
