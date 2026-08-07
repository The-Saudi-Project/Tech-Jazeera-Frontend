/**
 * Client-side quotation form schema, plus a mirror of the server's totals math
 * for LIVE preview only. The server always recomputes and stores the
 * authoritative totals — this is purely for instant on-screen feedback.
 */
import { z } from 'zod';
import { QUOTATION_STATUSES, QUOTATION_LINE_TYPES, DEFAULT_TAX_RATE } from '../../lib/constants.js';

/** A numeric string field ("" allowed; validated as a non-negative number). */
const numeric = (max) =>
  z
    .string()
    .refine((s) => s !== '' && !Number.isNaN(Number(s)) && Number(s) >= 0 && Number(s) <= max, 'Enter a valid amount.');
const percent = z
  .string()
  .refine((s) => s === '' || (!Number.isNaN(Number(s)) && Number(s) >= 0 && Number(s) <= 100), '0–100 only.');

const lineItemSchema = z.object({
  type: z.enum(QUOTATION_LINE_TYPES),
  description: z.string().trim().min(1, 'Required.').max(200),
  quantity: numeric(1_000_000),
  unitPrice: numeric(10_000_000),
  discount: percent,
  taxRate: percent,
});

export const quotationFormSchema = z.object({
  client: z.string().min(1, 'Select a client.'),
  date: z.string().optional().or(z.literal('')),
  validUntil: z.string().optional().or(z.literal('')),
  status: z.enum(QUOTATION_STATUSES),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one line item.'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

/** A blank line item for the "add row" action. */
export const emptyLineItem = {
  type: 'Labour',
  description: '',
  quantity: '1',
  unitPrice: '',
  discount: '0',
  taxRate: String(DEFAULT_TAX_RATE),
};

export const emptyQuotationForm = {
  client: '',
  date: new Date().toISOString().slice(0, 10),
  validUntil: '',
  status: 'Draft',
  lineItems: [{ ...emptyLineItem }],
  notes: '',
};

/** Mirror of server computeTotals — used only for the live preview. */
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function computeTotals(lineItems) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const li of lineItems) {
    const gross = (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0);
    const discount = gross * ((Number(li.discount) || 0) / 100);
    const net = gross - discount;
    const tax = net * ((Number(li.taxRate) || 0) / 100);
    subtotal += gross;
    discountTotal += discount;
    taxTotal += tax;
  }
  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    taxTotal: round(taxTotal),
    grandTotal: round(subtotal - discountTotal + taxTotal),
  };
}

/** API quotation → form values (numbers become strings for inputs). */
export function quotationToForm(q) {
  return {
    client: q.client?._id ?? q.client,
    date: q.date ? q.date.slice(0, 10) : '',
    validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
    status: q.status,
    lineItems: q.lineItems.map((li) => ({
      type: li.type,
      description: li.description,
      quantity: String(li.quantity),
      unitPrice: String(li.unitPrice),
      discount: String(li.discount ?? 0),
      taxRate: String(li.taxRate ?? 0),
    })),
    notes: q.notes ?? '',
  };
}
