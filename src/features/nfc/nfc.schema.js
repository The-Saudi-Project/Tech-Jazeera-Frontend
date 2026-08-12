/**
 * Client-side form schemas for the NFC platform. Empty optionals are allowed;
 * the server trims and drops them. Brand colour must be a 6-digit hex.
 */
import { z } from 'zod';

const hex = z.union([z.literal(''), z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex like #4F46E5.')]);
const email = z.union([z.literal(''), z.string().email('Enter a valid email address.')]);

export const companyFormSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required.').max(120),
  companyNameAr: z.string().trim().max(120).optional(),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: email.optional(),
  website: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  mapLink: z.string().trim().max(500).optional(),
  city: z.string().trim().max(80).optional(),
  brandColour: hex.optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const emptyCompanyForm = {
  companyName: '', companyNameAr: '', contactPerson: '', phone: '', email: '', website: '',
  address: '', mapLink: '', city: '', brandColour: '#4F46E5', notes: '',
};

export const employeeFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  jobTitle: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: email.optional(),
  linkedin: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(600).optional(),
  idNumber: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const emptyEmployeeForm = {
  name: '', jobTitle: '', phone: '', whatsapp: '', email: '',
  linkedin: '', bio: '', idNumber: '', notes: '',
};

export const batchFormSchema = z.object({
  count: z.coerce.number().int().min(1, 'At least 1.').max(100, 'Up to 100 at a time.'),
  label: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});
