/**
 * PayrollRunPage — one month's payroll: every employee's computed line,
 * editable (Draft only) allowances/deductions, finalize, and per-employee
 * payslip PDFs.
 */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPayrollRun, updatePayrollLine, finalizePayrollRun, deletePayrollRun, downloadPayslipPdf } from '../payroll.api.js';
import { payrollLineFormSchema, lineToForm, formToLinePayload } from '../payroll.schema.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiMessage, formatMoney } from '../../../lib/utils.js';
import { PAYROLL_STATUS_VARIANT, PAYROLL_WRITE_ROLES, PAYROLL_FINALIZE_ROLES, MONTH_NAMES } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import ConfirmDialog from '../../../components/shared/ConfirmDialog.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';

export default function PayrollRunPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canWrite = PAYROLL_WRITE_ROLES.includes(user.role);
  const canFinalize = PAYROLL_FINALIZE_ROLES.includes(user.role);

  const [editingLine, setEditingLine] = useState(null);
  const [confirmingFinalize, setConfirmingFinalize] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const { data: run, isPending, isError } = useQuery({
    queryKey: ['payroll', id],
    queryFn: () => getPayrollRun(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['payroll', id] });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(payrollLineFormSchema), defaultValues: { otherAllowances: '', gosiDeduction: '', otherDeductions: [] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'otherDeductions' });

  const saveLineMutation = useMutation({
    mutationFn: (values) => updatePayrollLine(id, editingLine._id, formToLinePayload(values)),
    onSuccess: () => {
      toast.success('Payroll line updated.');
      setEditingLine(null);
      invalidate();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizePayrollRun(id),
    onSuccess: () => {
      toast.success('Payroll run finalized.');
      setConfirmingFinalize(false);
      invalidate();
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingFinalize(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePayrollRun(id),
    onSuccess: () => {
      toast.success('Payroll run deleted.');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      navigate('/payroll', { replace: true });
    },
    onError: (error) => {
      toast.error(apiMessage(error));
      setConfirmingDelete(false);
    },
  });

  function openEdit(line) {
    reset(lineToForm(line));
    setEditingLine(line);
  }

  async function handleDownload(line) {
    setDownloadingId(line._id);
    try {
      await downloadPayslipPdf(id, line._id, `Payslip-${line.employeeCode}-${run.periodYear}-${String(run.periodMonth).padStart(2, '0')}.pdf`);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not generate the payslip.'));
    } finally {
      setDownloadingId(null);
    }
  }

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (isError) {
    return (
      <EmptyState
        title="Payroll run not found"
        description="It may have been deleted."
        action={<Link to="/payroll"><Button variant="secondary">Back to payroll</Button></Link>}
      />
    );
  }

  const isDraft = run.status === 'Draft';

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`${MONTH_NAMES[run.periodMonth - 1]} ${run.periodYear}`}
        description={`${run.lines.length} employee${run.lines.length === 1 ? '' : 's'} · total net ${formatMoney(run.totalNet)}`}
        actions={
          <>
            <Badge variant={PAYROLL_STATUS_VARIANT[run.status]} className="mr-1">
              {run.status}
            </Badge>
            {isDraft && canFinalize && (
              <Button onClick={() => setConfirmingFinalize(true)}>Finalize</Button>
            )}
            {isDraft && canFinalize && (
              <Button variant="ghost" className="hover:text-danger" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border bg-bg/40 text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Employee</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted text-right">Gross</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted text-right">Hours</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted text-right">Deductions</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted text-right">Net pay</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {run.lines.map((line) => (
              <tr key={line._id}>
                <td className="px-4 py-3">
                  <span className="font-medium">{line.employeeName}</span>
                  <span className="block text-xs text-muted">{line.employeeCode}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(line.grossPay)}
                  {line.overtimePay > 0 && (
                    <span className="block text-xs font-normal text-warning">+{formatMoney(line.overtimePay)} OT</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-muted">
                  {line.approvedHours || '—'}
                  {line.overtimeHours > 0 && <span className="block text-xs text-warning">{line.overtimeHours}h OT</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(line.totalDeductions)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(line.netPay)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" isLoading={downloadingId === line._id} onClick={() => handleDownload(line)}>
                      PDF
                    </Button>
                    {isDraft && canWrite && (
                      <Button size="sm" variant="ghost" onClick={() => openEdit(line)}>
                        Edit
                      </Button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editingLine} onClose={() => setEditingLine(null)} title={`Edit — ${editingLine?.employeeName ?? ''}`}>
        <form onSubmit={handleSubmit((values) => saveLineMutation.mutate(values))} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Other allowances" type="number" min="0" step="10" error={errors.otherAllowances?.message} {...register('otherAllowances')} />
            <Input
              label="GOSI deduction"
              type="number"
              min="0"
              step="10"
              error={errors.gosiDeduction?.message}
              {...register('gosiDeduction')}
            />
          </div>
          <p className="text-xs text-muted">
            GOSI is not calculated automatically — rates vary by nationality/coverage. Enter the correct figure per
            your current rates.
          </p>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Other deductions</label>
              <Button type="button" size="sm" variant="secondary" onClick={() => append({ label: '', amount: '' })}>
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex items-start gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Label (e.g. Advance repayment)"
                    aria-label="Deduction label"
                    error={errors.otherDeductions?.[i]?.label?.message}
                    {...register(`otherDeductions.${i}.label`)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    className="w-32"
                    placeholder="Amount"
                    aria-label="Deduction amount"
                    error={errors.otherDeductions?.[i]?.amount?.message}
                    {...register(`otherDeductions.${i}.amount`)}
                  />
                  <Button type="button" size="sm" variant="ghost" className="hover:text-danger" onClick={() => remove(i)} aria-label="Remove deduction">
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditingLine(null)} disabled={saveLineMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" isLoading={saveLineMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmingFinalize}
        title="Finalize this payroll run?"
        message="Lines can no longer be edited after finalizing. Workers will be able to view and download their payslips."
        confirmLabel="Finalize"
        loading={finalizeMutation.isPending}
        onConfirm={() => finalizeMutation.mutate()}
        onCancel={() => setConfirmingFinalize(false)}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this payroll run?"
        message="This draft and all its computed lines will be permanently removed."
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
