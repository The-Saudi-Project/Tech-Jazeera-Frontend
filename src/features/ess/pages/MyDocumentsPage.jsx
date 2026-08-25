/**
 * MyDocumentsPage — a Worker's own uploaded documents (P2-M2), read-only.
 * Uploading stays an HR/Admin/Manager job (documents module) — a worker
 * views and downloads what's already on file for them.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMyDocuments } from '../ess.api.js';
import MyDocumentPreviewModal from '../components/MyDocumentPreviewModal.jsx';
import { formatDate } from '../../../lib/utils.js';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import ExpiryBadge from '../../../components/shared/ExpiryBadge.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function MyDocumentsPage() {
  const [preview, setPreview] = useState(null);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'documents'],
    queryFn: () => listMyDocuments({ limit: 100 }),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My documents" description="Passport, visa, iqama and other files on file for you." />

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Could not load your documents"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
        />
      ) : data.items.length === 0 ? (
        <EmptyState title="No documents yet" description="Your office hasn't uploaded any documents for you yet." />
      ) : (
        <Card className="divide-y divide-border">
          {data.items.map((doc) => (
            <button
              key={doc._id}
              onClick={() => setPreview(doc)}
              className="-mx-2 flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left text-sm transition-colors hover:bg-bg/60"
            >
              <div>
                <p className="font-medium">{doc.title}</p>
                <p className="text-xs text-muted">
                  <Badge variant="default" className="mr-2">{doc.category}</Badge>
                  Uploaded {formatDate(doc.createdAt)}
                </p>
              </div>
              <ExpiryBadge date={doc.expiryDate} />
            </button>
          ))}
        </Card>
      )}

      <MyDocumentPreviewModal doc={preview} open={Boolean(preview)} onClose={() => setPreview(null)} />
    </div>
  );
}
