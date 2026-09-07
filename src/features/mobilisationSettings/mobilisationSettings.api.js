/**
 * MobilisationSettings API layer — Admin-only configuration of the stale
 * mobilisation warning threshold (officeSecretaryStaleDays). The viewer/
 * self-mobilise role grants that used to live here moved to Section
 * Access's 'mobilisationsViewer'/'mobilisationsSelfMobilise' keys.
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
