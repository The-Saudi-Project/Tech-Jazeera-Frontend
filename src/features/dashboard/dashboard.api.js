/**
 * Dashboard API layer — one call for the whole overview.
 */
import { api } from '../../lib/axios.js';

/** thresholdDays (P2-M2): override the 30-day expiry-alert window. */
export async function getDashboard(thresholdDays) {
  const { data } = await api.get('/dashboard', { params: thresholdDays ? { thresholdDays } : undefined });
  return data.data;
}
