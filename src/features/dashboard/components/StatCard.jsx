/**
 * StatCard — a single headline metric. Optional `to` makes the whole card a
 * link to the relevant screen; `accent` tints the value.
 */
import { Link } from 'react-router-dom';
import Card from '../../../components/ui/Card.jsx';
import { cn } from '../../../lib/utils.js';

const ACCENTS = {
  default: 'text-text',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export default function StatCard({ label, value, hint, accent = 'default', to }) {
  const body = (
    <Card className={cn('h-full', to && 'transition-colors hover:border-primary/40')}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn('mt-2 text-3xl font-semibold tabular-nums', ACCENTS[accent])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}
