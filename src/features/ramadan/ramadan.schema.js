/**
 * Client-side Ramadan period schema — instant feedback; the server's Zod
 * layer is the real gatekeeper (same split as everywhere else in this app).
 */
import { z } from 'zod';

export const ramadanPeriodFormSchema = z
  .object({
    label: z.string().trim().min(2, 'Label is required.').max(120),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
    dailyHours: z.string().min(1, 'Daily hour cap is required.'),
    weeklyHours: z.string().min(1, 'Weekly hour cap is required.'),
    notes: z.string().trim().max(500).optional().or(z.literal('')),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date cannot be before the start date.',
    path: ['endDate'],
  });

export const emptyRamadanPeriodForm = {
  label: '',
  startDate: '',
  endDate: '',
  dailyHours: '6',
  weeklyHours: '36',
  notes: '',
};

export function ramadanPeriodToForm(period) {
  return {
    label: period.label,
    startDate: period.startDate.slice(0, 10),
    endDate: period.endDate.slice(0, 10),
    dailyHours: String(period.dailyHours),
    weeklyHours: String(period.weeklyHours),
    notes: period.notes ?? '',
  };
}
