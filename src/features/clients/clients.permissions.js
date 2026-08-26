/**
 * Per-row client permission checks shared by every screen that lists or
 * opens a client (ClientListPage, ClientProfilePage, CoordinatorActivityPage).
 * Mirrors the exact rules client.service.js enforces server-side — these
 * only decide what to render; the server is the real gate.
 */
import { CLIENT_WRITE_ROLES } from '../../lib/constants.js';

/** Can this viewer decide THIS specific pending client? Admin always; a
 *  Manager only for a Coordinator who actually reports to them. */
export function canDecideClient(user, client) {
  if (client.approvalStatus !== 'Pending') return false;
  if (user.role === 'Admin') return true;
  return user.role === 'Manager' && client.createdBy?.managedBy === user.id;
}

/** Can this viewer edit THIS specific client? Admin/Manager always; a
 *  Coordinator only their own, not-yet-approved submission. */
export function canEditClient(user, client) {
  if (CLIENT_WRITE_ROLES.includes(user.role)) return true;
  return user.role === 'Coordinator' && client.createdBy?._id === user.id && client.approvalStatus !== 'Approved';
}
