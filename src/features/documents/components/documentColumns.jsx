/**
 * Shared column definitions for the document Table, so the reusable panel and
 * the global page render rows identically. `showOwner` adds an owner column
 * for the global view (per-owner panels don't need it).
 */
import { currentVersion } from '../documents.schema.js';
import { formatDate } from '../../../lib/utils.js';
import Badge from '../../../components/ui/Badge.jsx';
import ExpiryBadge from '../../../components/shared/ExpiryBadge.jsx';
import DocumentActionsCell from './DocumentActionsCell.jsx';

export function buildDocumentColumns({ showOwner = false } = {}) {
  return [
    {
      key: 'title',
      header: 'Document',
      render: (d) => {
        const v = currentVersion(d);
        return (
          <span>
            <span className="font-medium">{d.title}</span>
            <span className="block text-xs text-muted">{v.originalName}</span>
          </span>
        );
      },
    },
    ...(showOwner
      ? [
          {
            key: 'owner',
            header: 'Owner',
            render: (d) => {
              const name =
                d.owner?.companyName ?? d.owner?.fullName ?? 'Unknown';
              return (
                <span>
                  {name}
                  <span className="block text-xs text-muted">{d.ownerType}</span>
                </span>
              );
            },
          },
        ]
      : []),
    { key: 'category', header: 'Category', render: (d) => <Badge variant="primary">{d.category}</Badge> },
    { key: 'expiry', header: 'Expiry', render: (d) => <ExpiryBadge date={d.expiryDate} /> },
    {
      key: 'versions',
      header: 'Versions',
      hideOnMobile: true,
      className: 'text-center',
      render: (d) => d.versions.length,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => <DocumentActionsCell doc={d} />,
    },
  ];
}
