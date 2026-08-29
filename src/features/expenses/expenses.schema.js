/**
 * Client-side expense schema — instant feedback; the server's Zod layer is
 * the real gatekeeper (same split as everywhere else in this app).
 */
import { z } from 'zod';

export const expenseFormSchema = z.object({
  date: z.string().min(1, 'Date is required.'),
  category: z.string().min(1, 'Choose a category.'),
  vendor: z.string().trim().min(1, 'Vendor is required.').max(150),
  amount: z.string().min(1, 'Amount is required.'),
  client: z.string().optional().or(z.literal('')),
  deployment: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const emptyExpenseForm = {
  date: new Date().toISOString().slice(0, 10),
  category: '',
  vendor: '',
  amount: '',
  client: '',
  deployment: '',
  notes: '',
};

export function expenseToForm(expense) {
  return {
    date: expense.date.slice(0, 10),
    category: expense.category,
    vendor: expense.vendor,
    amount: String(expense.amount),
    client: expense.client ?? '',
    deployment: expense.deployment ?? '',
    notes: expense.notes ?? '',
  };
}
