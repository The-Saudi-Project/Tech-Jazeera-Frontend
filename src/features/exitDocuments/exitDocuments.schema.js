/**
 * Client-side schemas for the worker-submitted exit-document requests.
 * Staff-side actions (decide, mark issued) don't need a form schema — they
 * post a fixed shape directly from their review-panel buttons.
 */
import { z } from 'zod';

export const exitReentryFormSchema = z
  .object({
    visaType: z.string().min(1, 'Choose a visa type.'),
    departureDate: z.string().min(1, 'Departure date is required.'),
    expectedReturnDate: z.string().min(1, 'Expected return date is required.'),
    reason: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.expectedReturnDate >= data.departureDate, {
    message: 'Return date cannot be before the departure date.',
    path: ['expectedReturnDate'],
  });

export const emptyExitReentryForm = { visaType: '', departureDate: '', expectedReturnDate: '', reason: '' };

export const certificateFormSchema = z.object({
  type: z.string().min(1, 'Choose a certificate type.'),
  purpose: z.string().trim().max(300).optional().or(z.literal('')),
});

export const emptyCertificateForm = { type: '', purpose: '' };
