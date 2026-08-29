/**
 * MyExitDocumentsPage — a Worker's exit re-entry visa requests, certificate
 * requests, and a read-only view of their assigned company assets (P3-D).
 * Three sections, one page — same grouping as the staff-side
 * ExitDocumentsPage, plus the read-only assets list the PRD frames as
 * something the employee sees on their own.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMyExitReentry,
  submitMyExitReentry,
  cancelMyExitReentry,
  listMyCertificates,
  submitMyCertificate,
  cancelMyCertificate,
  downloadMyCertificatePdf,
  listMyAssets,
} from '../ess.api.js';
import {
  exitReentryFormSchema,
  emptyExitReentryForm,
  certificateFormSchema,
  emptyCertificateForm,
} from '../../exitDocuments/exitDocuments.schema.js';
import { apiMessage, formatDate } from '../../../lib/utils.js';
import {
  VISA_TYPES,
  EXIT_REENTRY_STATUS_VARIANT,
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPES_WITH_PDF,
  CERTIFICATE_STATUS_VARIANT,
} from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

function MyExitReentrySection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'exit-reentry'],
    queryFn: () => listMyExitReentry({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(exitReentryFormSchema), defaultValues: emptyExitReentryForm });

  const submitMutation = useMutation({
    mutationFn: submitMyExitReentry,
    onSuccess: () => {
      toast.success('Exit re-entry request submitted.');
      reset(emptyExitReentryForm);
      queryClient.invalidateQueries({ queryKey: ['me', 'exit-reentry'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyExitReentry(id),
    onSuccess: () => {
      toast.success('Request cancelled.');
      setToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'exit-reentry'] });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setToCancel(null);
    },
  });

  return (
    <>
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Request an exit re-entry visa</h2>
        <form onSubmit={handleSubmit((values) => submitMutation.mutate(values))} noValidate className="space-y-4">
          <Select label="Visa type *" error={errors.visaType?.message} {...register('visaType')}>
            <option value="">Choose…</option>
            {VISA_TYPES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Departure date *" type="date" error={errors.departureDate?.message} {...register('departureDate')} />
            <Input label="Expected return by *" type="date" error={errors.expectedReturnDate?.message} {...register('expectedReturnDate')} />
          </div>
          <Textarea label="Reason" placeholder="Optional" error={errors.reason?.message} {...register('reason')} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitMutation.isPending}>
              Submit request
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your visa requests</h2>
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load your requests" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
        ) : data.items.length === 0 ? (
          <EmptyState title="No requests yet" description="Submit your first request above." />
        ) : (
          <Card className="divide-y divide-border">
            {data.items.map((r) => (
              <div key={r._id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{r.visaType} exit</p>
                  <p className="text-xs text-muted">
                    Depart {formatDate(r.departureDate)} · return by {formatDate(r.expectedReturnDate)}
                  </p>
                  {r.decisionNote && <p className="mt-1 text-xs italic text-muted">Note: {r.decisionNote}</p>}
                  {r.visaReferenceNumber && <p className="mt-1 text-xs text-muted">Ref: {r.visaReferenceNumber}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={EXIT_REENTRY_STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  {r.status === 'Pending' && (
                    <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToCancel(r)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel visa request?"
        message="This exit re-entry visa request will be cancelled."
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel._id)}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

function MyCertificatesSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'certificates'],
    queryFn: () => listMyCertificates({ limit: 50 }),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(certificateFormSchema), defaultValues: emptyCertificateForm });

  const submitMutation = useMutation({
    mutationFn: submitMyCertificate,
    onSuccess: () => {
      toast.success('Certificate request submitted.');
      reset(emptyCertificateForm);
      queryClient.invalidateQueries({ queryKey: ['me', 'certificates'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyCertificate(id),
    onSuccess: () => {
      toast.success('Certificate request cancelled.');
      setToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['me', 'certificates'] });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setToCancel(null);
    },
  });

  async function handleDownload(request) {
    setDownloadingId(request._id);
    try {
      await downloadMyCertificatePdf(request._id, `${request.type}.pdf`);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not generate the PDF.'));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <>
      <Card>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Request a certificate</h2>
        <form onSubmit={handleSubmit((values) => submitMutation.mutate(values))} noValidate className="space-y-4">
          <Select label="Certificate type *" error={errors.type?.message} {...register('type')}>
            <option value="">Choose…</option>
            {CERTIFICATE_TYPES.map((t) => (
              <option key={t} value={t}>
                {CERTIFICATE_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Textarea label="Purpose" placeholder="e.g. Bank account opening, visa application" error={errors.purpose?.message} {...register('purpose')} />
          <div className="flex justify-end">
            <Button type="submit" isLoading={submitMutation.isPending}>
              Submit request
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your certificate requests</h2>
        {isPending ? (
          <Skeleton className="h-20 w-full" />
        ) : isError ? (
          <EmptyState title="Could not load your requests" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
        ) : data.items.length === 0 ? (
          <EmptyState title="No requests yet" description="Submit your first request above." />
        ) : (
          <Card className="divide-y divide-border">
            {data.items.map((c) => {
              const hasPdf = CERTIFICATE_TYPES_WITH_PDF.includes(c.type) && ['Approved', 'Issued'].includes(c.status);
              return (
                <div key={c._id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{CERTIFICATE_TYPE_LABELS[c.type]}</p>
                    {c.purpose && <p className="text-xs text-muted">For: {c.purpose}</p>}
                    {c.decisionNote && <p className="mt-1 text-xs italic text-muted">Note: {c.decisionNote}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant={CERTIFICATE_STATUS_VARIANT[c.status]}>{c.status}</Badge>
                    {hasPdf && (
                      <Button size="sm" variant="ghost" isLoading={downloadingId === c._id} onClick={() => handleDownload(c)}>
                        Download
                      </Button>
                    )}
                    {c.status === 'Pending' && (
                      <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => setToCancel(c)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toCancel)}
        title="Cancel certificate request?"
        message={`Your ${toCancel ? CERTIFICATE_TYPE_LABELS[toCancel.type] : ''} request will be cancelled.`}
        loading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate(toCancel._id)}
        onCancel={() => setToCancel(null)}
      />
    </>
  );
}

function MyAssetsSection() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['me', 'assets'],
    queryFn: () => listMyAssets(),
  });

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Your assigned assets</h2>
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : isError ? (
        <EmptyState title="Could not load your assets" description="Check your connection and try again." action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>} />
      ) : data.length === 0 ? (
        <EmptyState title="No assets assigned" description="Company assets assigned to you will appear here." />
      ) : (
        <Card className="divide-y divide-border">
          {data.map((a, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className="font-medium">{a.assetName}</p>
                <p className="text-xs text-muted">{a.assetTag}</p>
              </div>
              <Badge variant={a.status === 'Active' ? 'primary' : 'default'}>
                {a.status === 'Active' ? 'Currently with you' : `Returned ${formatDate(a.returnedAt)}`}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default function MyExitDocumentsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Visas & documents" description="Exit re-entry visas, official certificates, and your assigned assets." />
      <MyExitReentrySection />
      <MyCertificatesSection />
      <MyAssetsSection />
    </div>
  );
}
