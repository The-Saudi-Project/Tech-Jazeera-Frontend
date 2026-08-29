/**
 * Client-side schemas for the staff-side financial-request actions
 * (recording a repayment). Submission forms for the worker themselves live
 * in features/ess (they post amount/reason directly, no shared shape here).
 */
import { z } from 'zod';

export const repaymentFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required.'),
  date: z.string().min(1, 'Date is required.'),
  note: z.string().trim().max(200).optional().or(z.literal('')),
});

export const emptyRepaymentForm = { amount: '', date: new Date().toISOString().slice(0, 10), note: '' };

export const advanceFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required.'),
  repaymentMonths: z.string().min(1, 'Choose how many months to repay over.'),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptyAdvanceForm = { amount: '', repaymentMonths: '1', reason: '' };

/** Text fields only — the receipt file is handled separately (see
 *  MyRequestsPage) and combined into FormData at submit time. */
export const reimbursementFormSchema = z.object({
  category: z.string().min(1, 'Choose an expense category.'),
  amount: z.string().min(1, 'Amount is required.'),
  expenseDate: z.string().min(1, 'Expense date is required.'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptyReimbursementForm = { category: '', amount: '', expenseDate: '', description: '' };
