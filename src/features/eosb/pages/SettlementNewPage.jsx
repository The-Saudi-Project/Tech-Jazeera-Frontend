/**
 * New EOSB settlement — pick the exiting employee, exit date, and reason;
 * the server computes and saves the full breakdown in one step (no
 * client-side preview of the money figure — the leave-balance half of the
 * total needs a real server query, so a "close but not authoritative"
 * estimate would risk being read as the real number; see docs/P3-A-notes.md).
 * Accepts `?employee=<id>` to preset from an Employee profile.
 */
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createSettlement } from '../eosb.api.js';
import { settlementFormSchema, emptySettlementForm } from '../eosb.schema.js';
import { listEmployees } from '../../employees/employees.api.js';
import { apiMessage } from '../../../lib/utils.js';
import { EXIT_REASONS, EXIT_REASON_LABELS } from '../../../lib/constants.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Select from '../../../components/ui/Select.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';

const REASON_HINTS = {
  Resignation: 'The worker is leaving on their own terms — Article 85 tiering by length of service applies.',
  TerminationByEmployer: 'The company is ending the contract — full award, no reduction.',
  EndOfContract: "The contract term ended and wasn't renewed — full award, no reduction.",
};

export default function SettlementNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const presetEmployee = searchParams.get('employee') ?? '';

  const { data: employeeData } = useQuery({
    queryKey: ['employees', { forEosb: true }],
    queryFn: () => listEmployees({ limit: 100, sortBy: 'fullName', sortOrder: 'asc' }),
  });
  const employees = employeeData?.items ?? [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: useMemo(() => ({ ...emptySettlementForm, employee: presetEmployee }), [presetEmployee]),
  });
  const exitReason = watch('exitReason');

  const mutation = useMutation({
    mutationFn: createSettlement,
    onSuccess: (settlement) => {
      toast.success(`Settlement computed for ${settlement.employeeName}.`);
      navigate(`/eosb/${settlement._id}`, { replace: true });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New settlement" description="Compute the end-of-service award and vacation-pay settlement for an exiting employee." />
      <Card>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
          <Select label="Employee *" error={errors.employee?.message} {...register('employee')}>
            <option value="">Select an employee…</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.fullName} ({e.employeeId})
              </option>
            ))}
          </Select>

          <Input label="Exit date *" type="date" error={errors.exitDate?.message} {...register('exitDate')} />

          <Select label="Reason for exit *" error={errors.exitReason?.message} {...register('exitReason')}>
            <option value="">Choose a reason…</option>
            {EXIT_REASONS.map((r) => (
              <option key={r} value={r}>
                {EXIT_REASON_LABELS[r]}
              </option>
            ))}
          </Select>
          {exitReason && <p className="-mt-2 text-xs text-muted">{REASON_HINTS[exitReason]}</p>}

          <Textarea label="Notes" placeholder="Optional" error={errors.notes?.message} {...register('notes')} />

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={mutation.isPending}>
              Compute settlement
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
