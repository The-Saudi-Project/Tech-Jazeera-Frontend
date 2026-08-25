/**
 * Audit API layer — the Security Log's only data source. Admin-only on the
 * server; this file just calls it, the route guard is the real enforcement.
 */
import { api } from '../../lib/axios.js';

/** GET /audit — params: page, limit, action, from, to */
export async function listAuditLog(params) {
  const { data } = await api.get('/audit', { params });
  return data.data; // { items, total, page, pages }
}
