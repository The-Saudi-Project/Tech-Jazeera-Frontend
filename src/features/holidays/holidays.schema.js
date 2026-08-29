/**
 * Client-side holiday schema — instant feedback; the server's Zod layer is
 * the real gatekeeper (same split as everywhere else in this app).
 */
import { z } from 'zod';

export const holidayFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required.').max(120),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
    isPaid: z.boolean(),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be before the start date.',
    path: ['endDate'],
  });

export const emptyHolidayForm = { name: '', startDate: '', endDate: '', isPaid: true, notes: '' };

export function holidayToForm(holiday) {
  return {
    name: holiday.name,
    startDate: holiday.startDate.slice(0, 10),
    endDate: holiday.endDate.slice(0, 10),
    isPaid: holiday.isPaid,
    notes: holiday.notes ?? '',
  };
}
