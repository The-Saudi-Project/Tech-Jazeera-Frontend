/**
 * ExpiryBadge — one glance tells you a document's compliance state:
 *   no date → "Not set" · past → "Expired" · within the warning window →
 *   "Xd left" (amber) · otherwise → "Valid".
 * Used by employee profiles now; documents (M8) and the dashboard (M10) later.
 */
import Badge from '../ui/Badge.jsx';
import { daysUntil } from '../../lib/utils.js';
import { EXPIRY_WARNING_DAYS } from '../../lib/constants.js';

export default function ExpiryBadge({ date }) {
  if (!date) return <Badge>Not set</Badge>;
  const days = daysUntil(date);
  if (days < 0) return <Badge variant="danger">Expired</Badge>;
  if (days <= EXPIRY_WARNING_DAYS) return <Badge variant="warning">{days}d left</Badge>;
  return <Badge variant="success">Valid</Badge>;
}
