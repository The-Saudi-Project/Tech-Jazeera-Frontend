/**
 * SectionHubPage — the landing page a sidebar group link goes to: a grid of
 * cards, one per real page in that group. Role-filters `items` the same way
 * the old flat sidebar did, so a card never links somewhere the user can't
 * actually use.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import PageHeader from './PageHeader.jsx';

function ItemIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function SectionHubPage({ title, description, items }) {
  const { user } = useAuth();
  const visible = items.filter((item) => !item.roles || item.roles.includes(user.role));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={title} description={description} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visible.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-200 ease-out-expo hover:border-primary/40 hover:shadow-md"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ItemIcon d={item.icon} />
            </div>
            <div>
              <p className="font-semibold text-text group-hover:text-primary">{item.label}</p>
              {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
