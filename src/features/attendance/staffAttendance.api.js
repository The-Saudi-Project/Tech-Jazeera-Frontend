/**
 * Staff self-attendance API layer (Coordinator/HR/Accounts sign in/out) — separate
 * endpoint from the Employee-based attendance.api.js, see
 * server/src/modules/staffAttendance/staffAttendance.model.js for why.
 */
import { api } from '../../lib/axios.js';

/** POST /staff-attendance/punch { lat?, lng?, accuracy? } → { action, record } */
export async function punchStaffAttendance(payload) {
  const { data } = await api.post('/staff-attendance/punch', payload);
  return data.data;
}

/** GET /staff-attendance?from&to → record[] (last 30 days by default) */
export async function listMyStaffAttendance(params) {
  const { data } = await api.get('/staff-attendance', { params });
  return data.data;
}

/** GET /staff-attendance/all?from&to → record[] — everyone's, Admin/Manager/HR only. */
export async function listAllStaffAttendance(params) {
  const { data } = await api.get('/staff-attendance/all', { params });
  return data.data;
}
