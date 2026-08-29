/**
 * Client-side schema for recording a payment against an invoice.
 */
import { z } from 'zod';

export const paymentFormSchema = z.object({
  amount: z.string().min(1, 'Amount is required.'),
  date: z.string().min(1, 'Date is required.'),
  method: z.string().trim().max(50).optional().or(z.literal('')),
  reference: z.string().trim().max(100).optional().or(z.literal('')),
});

export const emptyPaymentForm = { amount: '', date: new Date().toISOString().slice(0, 10), method: '', reference: '' };
