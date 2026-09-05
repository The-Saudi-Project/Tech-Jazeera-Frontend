/**
 * Client-side Company Settings form schema — mirrors
 * server/companySettings.validation.js. Every field is optional; a company
 * can fill this in gradually. Form values are all strings; "" is sent as
 * null server-side to explicitly clear a field.
 */
import { z } from 'zod';

const optional = z.string().trim().max(300).optional().or(z.literal(''));

export const companySettingsFormSchema = z.object({
  companyName: optional,
  companyNameAr: optional,
  crNumber: optional,
  vatNumber: optional,
  address: optional,
  phone: optional,
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]),
  website: optional,
  bankName: optional,
  bankIban: optional,
  signatoryName: optional,
  signatoryTitle: optional,
});

export const emptyCompanySettingsForm = {
  companyName: '',
  companyNameAr: '',
  crNumber: '',
  vatNumber: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  bankName: '',
  bankIban: '',
  signatoryName: '',
  signatoryTitle: '',
};

/** API settings → form values (null becomes ""). */
export function companySettingsToForm(settings) {
  const form = { ...emptyCompanySettingsForm };
  for (const key of Object.keys(form)) {
    form[key] = settings?.[key] ?? '';
  }
  return form;
}
