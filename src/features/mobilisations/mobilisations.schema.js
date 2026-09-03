/**
 * Client-side mobilisation form schema (M1: Section 1 fields, Draft only) —
 * instant feedback; the server's Zod layer is the real gatekeeper (same
 * split as everywhere else in this app). Numeric fields stay strings here,
 * same convention as expenses.schema.js's `amount` — the server coerces.
 */
import { z } from 'zod';

const optionalNumberString = z.string().optional().or(z.literal(''));
const optionalStr = (max) => z.string().trim().max(max).optional().or(z.literal(''));

const mobilisationFields = {
  worker: z.string().min(1, 'Select a worker.'),
  jobTitle: z.string().trim().min(1, 'Job title is required.').max(150),

  client: z.string().min(1, 'Select a client.'),
  clientRate: optionalNumberString,
  clientCommission: optionalNumberString,
  ftaAllowance: optionalNumberString,
  clientTimesheetRequired: z.boolean().optional(),

  hasSubcontractor: z.boolean().optional(),
  subcontractor: z.string().optional().or(z.literal('')),
  subcontractorCommission: optionalNumberString,
  subcontractorTimesheetRequired: z.boolean().optional(),

  profit: optionalNumberString,
  mobilisationDate: z.string().min(1, 'Mobilisation date is required.'),
  checkoutDate: z.string().optional().or(z.literal('')),

  overtimeRate: optionalNumberString,
  overtimeHours: optionalNumberString,
  otAmount: optionalNumberString,
  otCommissionIn: optionalNumberString,
  otCommissionOut: optionalNumberString,

  remark: optionalStr(1000),
};

export const mobilisationFormSchema = z.object(mobilisationFields).superRefine((data, ctx) => {
  if (data.hasSubcontractor && !data.subcontractor) {
    ctx.addIssue({ code: 'custom', path: ['subcontractor'], message: 'Select a subcontractor.' });
  }
});

export const emptyMobilisationForm = {
  worker: '',
  jobTitle: '',
  client: '',
  clientRate: '',
  clientCommission: '',
  ftaAllowance: '',
  clientTimesheetRequired: false,
  hasSubcontractor: false,
  subcontractor: '',
  subcontractorCommission: '',
  subcontractorTimesheetRequired: false,
  profit: '',
  mobilisationDate: new Date().toISOString().slice(0, 10),
  checkoutDate: '',
  overtimeRate: '',
  overtimeHours: '',
  otAmount: '',
  otCommissionIn: '',
  otCommissionOut: '',
  remark: '',
};

// --- M3: Marketing Manager review ---

export const commercialDetailsFormSchema = z.object({
  clientQuotation: optionalStr(100),
  clientQuotationDate: z.string().optional().or(z.literal('')),
  clientPO: optionalStr(100),
  clientPODate: z.string().optional().or(z.literal('')),
  subQuotation: optionalStr(100),
  subQuotationDate: z.string().optional().or(z.literal('')),
  subPO: optionalStr(100),
});

export const emptyCommercialDetailsForm = {
  clientQuotation: '',
  clientQuotationDate: '',
  clientPO: '',
  clientPODate: '',
  subQuotation: '',
  subQuotationDate: '',
  subPO: '',
};

export function commercialDetailsToForm(m) {
  return {
    clientQuotation: m.clientQuotation ?? '',
    clientQuotationDate: m.clientQuotationDate ? m.clientQuotationDate.slice(0, 10) : '',
    clientPO: m.clientPO ?? '',
    clientPODate: m.clientPODate ? m.clientPODate.slice(0, 10) : '',
    subQuotation: m.subQuotation ?? '',
    subQuotationDate: m.subQuotationDate ? m.subQuotationDate.slice(0, 10) : '',
    subPO: m.subPO ?? '',
  };
}

/** Rejecting requires a note so the coordinator knows what to fix. */
export const decideMobilisationFormSchema = z
  .object({
    status: z.enum(['Approved', 'Rejected']),
    decisionNote: optionalStr(500),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'Rejected' && !data.decisionNote) {
      ctx.addIssue({ code: 'custom', path: ['decisionNote'], message: 'Explain what needs fixing before rejecting.' });
    }
  });

export function mobilisationToForm(m) {
  return {
    worker: m.worker,
    jobTitle: m.jobTitle,
    client: m.client,
    clientRate: String(m.clientRate ?? ''),
    clientCommission: String(m.clientCommission ?? ''),
    ftaAllowance: String(m.ftaAllowance ?? ''),
    clientTimesheetRequired: Boolean(m.clientTimesheetRequired),
    hasSubcontractor: Boolean(m.hasSubcontractor),
    subcontractor: m.subcontractor ?? '',
    subcontractorCommission: String(m.subcontractorCommission ?? ''),
    subcontractorTimesheetRequired: Boolean(m.subcontractorTimesheetRequired),
    profit: String(m.profit ?? ''),
    mobilisationDate: m.mobilisationDate ? m.mobilisationDate.slice(0, 10) : '',
    checkoutDate: m.checkoutDate ? m.checkoutDate.slice(0, 10) : '',
    overtimeRate: String(m.overtimeRate ?? ''),
    overtimeHours: String(m.overtimeHours ?? ''),
    otAmount: String(m.otAmount ?? ''),
    otCommissionIn: String(m.otCommissionIn ?? ''),
    otCommissionOut: String(m.otCommissionOut ?? ''),
    remark: m.remark ?? '',
  };
}
