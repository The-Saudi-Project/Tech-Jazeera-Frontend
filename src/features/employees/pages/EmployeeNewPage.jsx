/**
 * New employee — thin page: header + EmployeeForm + create mutation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createEmployee } from '../employees.api.js';
import { emptyEmployeeForm } from '../employees.schema.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import PageHeader from '../../../components/shared/PageHeader.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';

export default function EmployeeNewPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: (employee) => {
      toast.success(`${employee.fullName} added.`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate(`/employees/${employee._id}`, { replace: true });
    },
    // Server-side rejections (e.g. duplicate employee ID → 409) surface here.
    onError: (error) => toast.error(apiMessage(error)),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add employee" description="Create a new workforce record." />
      <EmployeeForm
        defaultValues={emptyEmployeeForm}
        onSubmit={(values) => mutation.mutate(values)}
        submitLabel="Create employee"
        submitting={mutation.isPending}
      />
    </div>
  );
}
