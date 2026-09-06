/**
 * MyProfilePage's self-edit form schema (Milestone 4) — contact-info fields
 * only, mirroring employees.schema.js's own field-level rules for these same
 * fields exactly (same phone shape, same string length caps).
 */
import { z } from 'zod';

const optional = z.string().trim().max(200).optional().or(z.literal(''));
const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{5,18}$/, 'Enter a valid phone number.')
  .optional()
  .or(z.literal(''));

export const updateMyProfileFormSchema = z.object({
  mobile: optionalPhone,
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]),
  accommodation: optional,
  emergencyContact: z.object({
    name: optional,
    phone: optionalPhone,
    relation: optional,
  }),
});

/** Employee (API shape) → form values — every field defaults to '' rather
 *  than null/undefined, since HTML inputs need a string to control. */
export function profileToForm(employee) {
  return {
    mobile: employee.mobile ?? '',
    email: employee.email ?? '',
    accommodation: employee.accommodation ?? '',
    emergencyContact: {
      name: employee.emergencyContact?.name ?? '',
      phone: employee.emergencyContact?.phone ?? '',
      relation: employee.emergencyContact?.relation ?? '',
    },
  };
}
