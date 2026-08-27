/**
 * QuickActions — shortcuts to the common create flows, shown only for the
 * actions the current user's role is allowed to perform (mirrors the server
 * guards; the API still enforces them).
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import Card from '../../../components/ui/Card.jsx';
import {
  EMPLOYEE_WRITE_ROLES,
  CLIENT_WRITE_ROLES,
  DEPLOYMENT_WRITE_ROLES,
  ATTENDANCE_WRITE_ROLES,
  QUOTATION_WRITE_ROLES,
} from '../../../lib/constants.js';

const ACTIONS = [
  { label: 'Add employee', to: '/employees/new', roles: EMPLOYEE_WRITE_ROLES },
  { label: 'Add client', to: '/clients/new', roles: CLIENT_WRITE_ROLES },
  { label: 'Assign worker', to: '/deployments/new', roles: DEPLOYMENT_WRITE_ROLES },
  { label: 'Attendance', to: '/attendance', roles: ATTENDANCE_WRITE_ROLES },
  { label: 'New quotation', to: '/quotations/new', roles: QUOTATION_WRITE_ROLES },
];

export default function QuickActions() {
  const { user } = useAuth();
  const available = ACTIONS.filter((a) => a.roles.includes(user.role));
  if (available.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Quick actions</h2>
      <div className="flex flex-wrap gap-2">
        {available.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
