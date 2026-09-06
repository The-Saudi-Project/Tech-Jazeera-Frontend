/**
 * MobilisationDetailPage — the workhorse: Section 1 display (fields the API
 * actually returned — commercial fields are simply absent for a stripped
 * Coordinator view, no client-side hiding logic needed), the coordinator
 * confirm/invite/submit flow (M2), the Marketing Manager's Section 2 form +
 * Approve/Reject (M3), and document upload/list/download (M5). Section 1
 * itself is edited on the separate MobilisationEditPage — this page is
 * about the workflow around the record, not the record's own fields.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getMobilisation,
  listCoordinatorCandidates,
  addCoordinator,
  removeCoordinator,
  confirmCoordinator,
  submitMobilisation,
  saveCommercialDetails,
  decideMobilisation,
  uploadMobilisationDocuments,
  deleteMobilisationDocument,
  downloadMobilisationDocument,
} from '../mobilisations.api.js';
import {
  commercialDetailsFormSchema,
  commercialDetailsToForm,
  decideMobilisationFormSchema,
} from '../mobilisations.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatDate, formatMoney } from '../../../lib/utils.js';
import { MOBILISATION_STATUS_VARIANT, MOBILISATION_DOCUMENT_CATEGORIES, MOBILISATION_DOCUMENT_CATEGORY_LABELS } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import ApprovalTrailView from '../../../components/shared/ApprovalTrailView.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import BackButton from '../../../components/shared/BackButton.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

function Field({ label, value }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function userId(entry) {
  return entry.user._id ?? entry.user;
}

/**
 * Extracted so useForm only ever mounts once `m` is real data — this
 * component is placed in the parent's JSX AFTER the loading guard, so its
 * first-ever render already has the right defaultValues. (Calling useForm
 * directly in the parent, before that guard, would freeze defaultValues at
 * `undefined` from the loading-state render and never repopulate — RHF only
 * reads defaultValues at mount.)
 */
function CommercialDetailsCard({ m, canDecide, onSave, saving, onApprove, onReject }) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(commercialDetailsFormSchema), defaultValues: commercialDetailsToForm(m) });

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.detail.marketingManagerReview')}</h2>
      <form onSubmit={handleSubmit(onSave)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label={t('staffMobilisations.detail.clientQuotation')} disabled={!canDecide} error={errors.clientQuotation?.message} {...register('clientQuotation')} />
          <Input label={t('staffMobilisations.detail.clientQuotationDate')} type="date" disabled={!canDecide} error={errors.clientQuotationDate?.message} {...register('clientQuotationDate')} />
          <Input label={t('staffMobilisations.detail.clientPO')} disabled={!canDecide} error={errors.clientPO?.message} {...register('clientPO')} />
          <Input label={t('staffMobilisations.detail.clientPODate')} type="date" disabled={!canDecide} error={errors.clientPODate?.message} {...register('clientPODate')} />
          <Input label={t('staffMobilisations.detail.subQuotation')} disabled={!canDecide} error={errors.subQuotation?.message} {...register('subQuotation')} />
          <Input label={t('staffMobilisations.detail.subQuotationDate')} type="date" disabled={!canDecide} error={errors.subQuotationDate?.message} {...register('subQuotationDate')} />
          <Input label={t('staffMobilisations.detail.subPO')} disabled={!canDecide} error={errors.subPO?.message} {...register('subPO')} />
        </div>
        {canDecide && (
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="submit" variant="secondary" isLoading={saving}>
              {t('staffMobilisations.detail.saveDetails')}
            </Button>
            <Button type="button" variant="danger-ghost" onClick={onReject}>
              {t('common.reject')}
            </Button>
            <Button type="button" onClick={onApprove}>
              {t('common.approve')}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

export default function MobilisationDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [inviteId, setInviteId] = useState('');
  const [toRemove, setToRemove] = useState(null);
  const [decideNote, setDecideNote] = useState('');
  const [pendingDecision, setPendingDecision] = useState(null); // 'Approved' | 'Rejected' | null
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('Contract');

  const { data: m, isPending, isError } = useQuery({
    queryKey: ['mobilisation', id],
    queryFn: () => getMobilisation(id),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mobilisation', id] });
    queryClient.invalidateQueries({ queryKey: ['mobilisations'] });
  };

  const { data: candidates } = useQuery({
    queryKey: ['mobilisations', 'coordinator-candidates'],
    queryFn: listCoordinatorCandidates,
    enabled: Boolean(m) && ['Draft', 'Rejected'].includes(m?.status),
  });

  const commercialMutation = useMutation({
    mutationFn: (values) => saveCommercialDetails(id, values),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.commercialSavedToast'));
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const addMutation = useMutation({
    mutationFn: (uid) => addCoordinator(id, uid),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.invitedToast'));
      setInviteId('');
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const removeMutation = useMutation({
    mutationFn: (uid) => removeCoordinator(id, uid),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.removedToast'));
      setToRemove(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const confirmMutation = useMutation({
    mutationFn: () => confirmCoordinator(id, user.id),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.confirmedToast'));
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const submitMutation = useMutation({
    mutationFn: () => submitMobilisation(id),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.submittedToast'));
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const decideMutation = useMutation({
    mutationFn: (values) => decideMobilisation(id, values),
    onSuccess: (updated) => {
      toast.success(updated.status === 'Approved' ? t('staffMobilisations.detail.approvedToast') : t('staffMobilisations.detail.rejectedToast'));
      setPendingDecision(null);
      setDecideNote('');
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const uploadMutation = useMutation({
    mutationFn: () => uploadMobilisationDocuments(id, files, category),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.documentUploadedToast'));
      setFiles([]);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const deleteDocMutation = useMutation({
    mutationFn: (fileId) => deleteMobilisationDocument(id, fileId),
    onSuccess: () => {
      toast.success(t('staffMobilisations.detail.documentRemovedToast'));
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError || !m) {
    return (
      <EmptyState
        title={t('staffMobilisations.detail.notFoundTitle')}
        description={t('staffMobilisations.detail.notFoundDescription')}
        action={<BackButton onClick={() => navigate('/mobilisations')} />}
      />
    );
  }

  const myEntry = m.coordinators.find((c) => userId(c) === user.id);
  const isPrimary = m.coordinators.some((c) => c.isPrimary && userId(c) === user.id);
  const canManage = (user.role === 'Admin' || isPrimary) && ['Draft', 'Rejected'].includes(m.status);
  const needsMyConfirmation = myEntry && !myEntry.confirmed && ['Draft', 'Rejected'].includes(m.status);
  const unconfirmed = m.coordinators.filter((c) => !c.confirmed);
  const canSubmit = canManage && unconfirmed.length === 0;
  const canDecide = m.canDecideCurrentStep && m.status === 'PendingReview';
  const hasCommercialFields = 'clientRate' in m;
  const canTouchDocuments = (user.role === 'Admin' || myEntry) && m.status !== 'Approved';
  const availableCandidates = (candidates ?? []).filter((c) => !m.coordinators.some((mc) => userId(mc) === c._id));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={`${m.workerName} — ${m.clientName}`}
        description={m.jobTitle}
        onBack={() => navigate(-1)}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={MOBILISATION_STATUS_VARIANT[m.status]}>{t(`common.status.${m.status}`, m.status)}</Badge>
            {canManage && (
              <Button size="sm" variant="secondary" onClick={() => navigate(`/mobilisations/${id}/edit`)}>
                {t('common.edit')}
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.detail.detailsTitle')}</h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t('staffMobilisations.detail.fields.iqamaNumber')} value={m.iqamaNumber} />
          <Field label={t('staffMobilisations.detail.fields.nationality')} value={m.nationality} />
          <Field label={t('staffMobilisations.detail.fields.trade')} value={m.trade} />
          <Field label={t('staffMobilisations.detail.fields.phone')} value={m.phone} />
          <Field label={t('staffMobilisations.detail.fields.mobilisationDate')} value={formatDate(m.mobilisationDate)} />
          <Field label={t('staffMobilisations.detail.fields.checkoutDate')} value={m.checkoutDate && formatDate(m.checkoutDate)} />
          {hasCommercialFields && (
            <>
              <Field label={t('staffMobilisations.detail.fields.clientRate')} value={formatMoney(m.clientRate)} />
              <Field label={t('staffMobilisations.detail.fields.clientCommission')} value={formatMoney(m.clientCommission)} />
              <Field label={t('staffMobilisations.detail.fields.ftaAllowance')} value={formatMoney(m.ftaAllowance)} />
              {m.hasSubcontractor && (
                <>
                  <Field label={t('staffMobilisations.detail.fields.subcontractor')} value={m.subcontractorName} />
                  <Field label={t('staffMobilisations.detail.fields.subcontractorCommission')} value={formatMoney(m.subcontractorCommission)} />
                </>
              )}
              <Field label={t('staffMobilisations.detail.fields.profit')} value={formatMoney(m.profit)} />
            </>
          )}
          <Field label={t('staffMobilisations.detail.fields.overtimeRate')} value={m.overtimeRate ? formatMoney(m.overtimeRate) : null} />
          <Field label={t('staffMobilisations.detail.fields.overtimeHours')} value={m.overtimeHours || null} />
          {hasCommercialFields && (
            <>
              <Field label={t('staffMobilisations.detail.fields.otAmount')} value={m.otAmount ? formatMoney(m.otAmount) : null} />
              <Field label={t('staffMobilisations.detail.fields.otCommissionIn')} value={m.otCommissionIn ? formatMoney(m.otCommissionIn) : null} />
              <Field label={t('staffMobilisations.detail.fields.otCommissionOut')} value={m.otCommissionOut ? formatMoney(m.otCommissionOut) : null} />
            </>
          )}
        </dl>
        {m.remark && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted">{t('staffMobilisations.detail.remark')}</p>
            <p className="text-sm">{m.remark}</p>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.detail.coordinatorsTitle')}</h2>
        <ul className="space-y-2">
          {m.coordinators.map((c) => (
            <li key={userId(c)} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {c.user.name ?? userId(c)} {c.isPrimary && <span className="text-xs text-muted">{t('staffMobilisations.detail.primary')}</span>}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant={c.confirmed ? 'success' : 'warning'}>{c.confirmed ? t('staffMobilisations.detail.confirmed') : t('staffMobilisations.detail.pending')}</Badge>
                {canManage && !c.isPrimary && !c.confirmed && (
                  <Button size="sm" variant="danger-ghost" onClick={() => setToRemove(c)}>
                    {t('staffMobilisations.detail.remove')}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>

        {needsMyConfirmation && (
          <div className="mt-4 rounded-lg bg-warning/10 p-3 text-sm">
            <p className="mb-2">{t('staffMobilisations.detail.needsConfirmationHint')}</p>
            <Button size="sm" isLoading={confirmMutation.isPending} onClick={() => confirmMutation.mutate()}>
              {t('staffMobilisations.detail.confirmButton')}
            </Button>
          </div>
        )}

        {canManage && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Select
              label={t('staffMobilisations.detail.addJointCoordinator')}
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              className="min-w-[200px]"
            >
              <option value="">{t('staffMobilisations.detail.selectCoordinator')}</option>
              {availableCandidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="secondary"
              disabled={!inviteId}
              isLoading={addMutation.isPending}
              onClick={() => addMutation.mutate(inviteId)}
            >
              {t('staffMobilisations.detail.invite')}
            </Button>
          </div>
        )}

        {canManage && (
          <div className="mt-4 border-t border-border pt-4">
            {!canSubmit && unconfirmed.length > 0 && (
              <p className="mb-2 text-xs text-muted">
                {t('staffMobilisations.detail.waitingOnConfirmation', { names: unconfirmed.map((c) => c.user.name ?? userId(c)).join(', ') })}
              </p>
            )}
            <Button isLoading={submitMutation.isPending} disabled={!canSubmit} onClick={() => submitMutation.mutate()}>
              {t('staffMobilisations.detail.submitForReview')}
            </Button>
          </div>
        )}
      </Card>

      <ApprovalTrailView request={m} />

      {(canDecide || (hasCommercialFields && m.status !== 'Draft')) && (
        <CommercialDetailsCard
          m={m}
          canDecide={canDecide}
          saving={commercialMutation.isPending}
          onSave={(values) => commercialMutation.mutate(values)}
          onApprove={() => setPendingDecision('Approved')}
          onReject={() => setPendingDecision('Rejected')}
        />
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t('staffMobilisations.detail.documentsTitle')}</h2>
        {(m.documents ?? []).length === 0 ? (
          <p className="text-sm text-muted">{t('staffMobilisations.detail.noDocuments')}</p>
        ) : (
          <ul className="mb-4 divide-y divide-border">
            {m.documents.map((d) => (
              <li key={d._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">
                  {d.originalName} <span className="text-xs text-muted">({t(`staffMobilisations.documentCategoryLabels.${d.category}`, MOBILISATION_DOCUMENT_CATEGORY_LABELS[d.category])})</span>
                </span>
                <span className="flex shrink-0 gap-2">
                  <Button size="sm" variant="ghost" onClick={() => downloadMobilisationDocument(id, d._id, d.originalName)}>
                    {t('common.download')}
                  </Button>
                  {canTouchDocuments && (
                    <Button size="sm" variant="danger-ghost" isLoading={deleteDocMutation.isPending} onClick={() => deleteDocMutation.mutate(d._id)}>
                      {t('common.delete')}
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {canTouchDocuments && (
          <div className="flex flex-wrap items-end gap-2">
            <Select label={t('staffMobilisations.detail.category')} value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-[140px]">
              {MOBILISATION_DOCUMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`staffMobilisations.documentCategoryLabels.${c}`, MOBILISATION_DOCUMENT_CATEGORY_LABELS[c])}
                </option>
              ))}
            </Select>
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t('staffMobilisations.detail.filesLabel')}</label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setFiles([...e.target.files])}
                className="text-sm"
              />
            </div>
            <Button size="sm" disabled={files.length === 0} isLoading={uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
              {t('staffMobilisations.detail.upload')}
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toRemove)}
        title={t('staffMobilisations.detail.removeCoordinatorConfirmTitle')}
        message={t('staffMobilisations.detail.removeCoordinatorConfirmMessage', { name: toRemove?.user?.name ?? t('staffMobilisations.detail.defaultCoordinatorName') })}
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(userId(toRemove))}
        onCancel={() => setToRemove(null)}
      />

      <Modal
        open={Boolean(pendingDecision)}
        onClose={() => {
          if (decideMutation.isPending) return;
          setPendingDecision(null);
          setDecideNote('');
        }}
        title={pendingDecision === 'Approved' ? t('staffMobilisations.detail.approveModalTitle') : t('staffMobilisations.detail.rejectModalTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {pendingDecision === 'Approved'
              ? t('staffMobilisations.detail.approveModalMessage')
              : t('staffMobilisations.detail.rejectModalMessage')}
          </p>
          {pendingDecision === 'Rejected' && (
            <Textarea
              label={t('staffMobilisations.detail.noteRequired')}
              value={decideNote}
              onChange={(e) => setDecideNote(e.target.value)}
              placeholder={t('staffMobilisations.detail.notePlaceholder')}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={decideMutation.isPending} onClick={() => setPendingDecision(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={pendingDecision === 'Rejected' ? 'danger' : 'primary'}
              isLoading={decideMutation.isPending}
              onClick={() => {
                const values = { status: pendingDecision, decisionNote: decideNote };
                const result = decideMobilisationFormSchema.safeParse(values);
                if (!result.success) {
                  toast.error(result.error.issues[0]?.message ?? t('staffMobilisations.detail.defaultRejectError'));
                  return;
                }
                decideMutation.mutate(values);
              }}
            >
              {pendingDecision === 'Approved' ? t('common.approve') : t('common.reject')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
