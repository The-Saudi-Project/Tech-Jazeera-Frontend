/**
 * Client-side leave schemas — instant feedback; the server's Zod layer is the
 * real gatekeeper (same split as everywhere else in this app).
 */
import { z } from 'zod';
import { LEAVE_RECURRENCES } from '../../lib/constants.js';

const optionalNum = z
  .string()
  .optional()
  .or(z.literal(''))
  .transform((v) => (v === '' || v === undefined ? undefined : v));

export const leaveTypeFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name is required.').max(60),
    recurrence: z.enum(LEAVE_RECURRENCES),
    daysPerYear: optionalNum,
    tierYears: optionalNum,
    tierDaysPerYear: optionalNum,
    cycleYears: optionalNum,
    daysPerCycle: optionalNum,
    minServiceMonths: z.string().min(1, 'Enter 0 if there is no minimum.'),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.recurrence === 'Annual' && !data.daysPerYear) {
      ctx.addIssue({ code: 'custom', path: ['daysPerYear'], message: 'Required for Annual leave.' });
    }
    if (data.recurrence === 'ContractCycle' && (!data.cycleYears || !data.daysPerCycle)) {
      ctx.addIssue({ code: 'custom', path: ['cycleYears'], message: 'Cycle length and days/cycle are required.' });
    }
    // Mirrors the server's cross-field check: a tier with no day count (or a
    // day count with no tier) is meaningless. Missing this on the client was
    // the actual bug — the form let an incomplete tier through to a 400 with
    // no visible reason why.
    if (Boolean(data.tierYears) !== Boolean(data.tierDaysPerYear)) {
      ctx.addIssue({
        code: 'custom',
        path: ['tierYears'],
        message: 'Tier years and tier days must be set together.',
      });
      ctx.addIssue({
        code: 'custom',
        path: ['tierDaysPerYear'],
        message: 'Tier years and tier days must be set together.',
      });
    }
  });

export const emptyLeaveTypeForm = {
  name: '',
  recurrence: 'Annual',
  daysPerYear: '',
  tierYears: '',
  tierDaysPerYear: '',
  cycleYears: '',
  daysPerCycle: '',
  minServiceMonths: '0',
  isActive: true,
};

export function leaveTypeToForm(type) {
  return {
    name: type.name,
    recurrence: type.recurrence,
    daysPerYear: type.daysPerYear != null ? String(type.daysPerYear) : '',
    tierYears: type.tierYears != null ? String(type.tierYears) : '',
    tierDaysPerYear: type.tierDaysPerYear != null ? String(type.tierDaysPerYear) : '',
    cycleYears: type.cycleYears != null ? String(type.cycleYears) : '',
    daysPerCycle: type.daysPerCycle != null ? String(type.daysPerCycle) : '',
    minServiceMonths: String(type.minServiceMonths ?? 0),
    isActive: type.isActive,
  };
}

export const submitLeaveFormSchema = z.object({
  leaveType: z.string().min(1, 'Choose a leave type.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  reason: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptySubmitLeaveForm = { leaveType: '', startDate: '', endDate: '', reason: '' };
