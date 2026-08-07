/**
 * Dashboard API layer — one call for the whole overview.
 */
import { api } from '../../lib/axios.js';

export async function getDashboard() {
  const { data } = await api.get('/dashboard');
  return data.data;
}
