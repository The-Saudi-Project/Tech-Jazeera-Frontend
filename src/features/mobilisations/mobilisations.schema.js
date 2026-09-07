/**
 * Client-side mobilisation form schema (M1: Section 1 fields, Draft only) —
 * instant feedback; the server's Zod layer is the real gatekeeper (same
 * split as everywhere else in this app). Numeric fields stay strings here,
 * same convention as expenses.schema.js's `amount` — the server coerces.
 */
import { z } from 'zod';

const optionalNumberString = z.string().optional().or(z.literal(''));
const optionalStr = (max) => z.string().trim().max(max).optional().or(z.literal(''));

export const WORKER_TYPES = ['Employee', 'SupplierEmployee', 'Freelancer'];

const mobilisationFields = {
  workerType: z.enum(WORKER_TYPES),
  // Employee: `worker` picks a real Employee record. SupplierEmployee/
  // Freelancer: no Employee record exists, so the identity fields below are
  // typed directly — required by the superRefine below, not here.
  worker: z.string().optional().or(z.literal('')),
  workerName: optionalStr(150),
  iqamaNumber: optionalStr(50),
  nationality: optionalStr(80),
  trade: optionalStr(100),
  phone: optionalStr(30),
  jobTitle: z.string().trim().min(1, 'Job title is required.').max(150),

  client: z.string().min(1, 'Select a client.'),
  clientRate: optionalNumberString,
  clientCommission: optionalNumberString,
  fta: optionalNumberString,
  allowance: optionalNumberString,
  requiredTimesheetHours: optionalNumberString,

  // Subcontractor block only applies to SupplierEmployee — see superRefine.
  subcontractor: z.string().optional().or(z.literal('')),
  subcontractorRate: optionalNumberString,
  subcontractorCommission: optionalNumberString,

  mobilisationDate: z.string().min(1, 'Mobilisation date is required.'),
  checkoutDate: z.string().optional().or(z.literal('')),

  remark: optionalStr(1000),
};

export const mobilisationFormSchema = z.object(mobilisationFields).superRefine((data, ctx) => {
  if (data.workerType === 'Employee' && !data.worker) {
    ctx.addIssue({ code: 'custom', path: ['worker'], message: 'Select a worker.' });
  }
  if (data.workerType !== 'Employee' && !data.workerName) {
    ctx.addIssue({ code: 'custom', path: ['workerName'], message: 'Worker name is required.' });
  }
  if (data.workerType === 'SupplierEmployee' && !data.subcontractor) {
    ctx.addIssue({ code: 'custom', path: ['subcontractor'], message: 'Select a subcontractor.' });
  }
});

export const emptyMobilisationForm = {
  workerType: 'Employee',
  worker: '',
  workerName: '',
  iqamaNumber: '',
  nationality: '',
  trade: '',
  phone: '',
  jobTitle: '',
  client: '',
  clientRate: '',
  clientCommission: '',
  fta: '',
  allowance: '',
  requiredTimesheetHours: '',
  subcontractor: '',
  subcontractorRate: '',
  subcontractorCommission: '',
  mobilisationDate: new Date().toISOString().slice(0, 10),
  checkoutDate: '',
  remark: '',
};

// --- M3: current-step reviewer's Section 2 (Office Secretary, then
// Marketing Manager, once configured) — quotation/PO, actual timesheet
// hours, overtime, remark. Every field optional: a reviewer fills in what
// they have as it arrives. ---

export const commercialDetailsFormSchema = z.object({
  clientQuotation: optionalStr(100),
  clientQuotationDate: z.string().optional().or(z.literal('')),
  clientPO: optionalStr(100),
  clientPODate: z.string().optional().or(z.literal('')),
  subQuotation: optionalStr(100),
  subQuotationDate: z.string().optional().or(z.literal('')),
  subPO: optionalStr(100),
  subPODate: z.string().optional().or(z.literal('')),
  clientTimesheetHours: optionalNumberString,
  otHours: optionalNumberString,
  otClientRate: optionalNumberString,
  otClientCommission: optionalNumberString,
  otSubcontractorRate: optionalNumberString,
  otSubcontractorCommission: optionalNumberString,
  remark: optionalStr(1000),
});

export const emptyCommercialDetailsForm = {
  clientQuotation: '',
  clientQuotationDate: '',
  clientPO: '',
  clientPODate: '',
  subQuotation: '',
  subQuotationDate: '',
  subPO: '',
  subPODate: '',
  clientTimesheetHours: '',
  otHours: '',
  otClientRate: '',
  otClientCommission: '',
  otSubcontractorRate: '',
  otSubcontractorCommission: '',
  remark: '',
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
    subPODate: m.subPODate ? m.subPODate.slice(0, 10) : '',
    clientTimesheetHours: String(m.clientTimesheetHours ?? ''),
    otHours: String(m.otHours ?? ''),
    otClientRate: String(m.otClientRate ?? ''),
    otClientCommission: String(m.otClientCommission ?? ''),
    otSubcontractorRate: String(m.otSubcontractorRate ?? ''),
    otSubcontractorCommission: String(m.otSubcontractorCommission ?? ''),
    remark: m.remark ?? '',
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
    workerType: m.workerType ?? 'Employee',
    worker: m.worker ?? '',
    workerName: m.workerName ?? '',
    iqamaNumber: m.iqamaNumber ?? '',
    nationality: m.nationality ?? '',
    trade: m.trade ?? '',
    phone: m.phone ?? '',
    jobTitle: m.jobTitle,
    client: m.client,
    clientRate: String(m.clientRate ?? ''),
    clientCommission: String(m.clientCommission ?? ''),
    fta: String(m.fta ?? ''),
    allowance: String(m.allowance ?? ''),
    requiredTimesheetHours: String(m.requiredTimesheetHours ?? ''),
    subcontractor: m.subcontractor ?? '',
    subcontractorRate: String(m.subcontractorRate ?? ''),
    subcontractorCommission: String(m.subcontractorCommission ?? ''),
    mobilisationDate: m.mobilisationDate ? m.mobilisationDate.slice(0, 10) : '',
    checkoutDate: m.checkoutDate ? m.checkoutDate.slice(0, 10) : '',
    remark: m.remark ?? '',
  };
}
