/**
 * Client-side employee form schema + form<->API mapping.
 *
 * Form values are ALL strings (that's what HTML inputs produce; date inputs
 * give "YYYY-MM-DD" or ""). We validate the string shapes here for instant
 * feedback and send them as-is — the server's Zod layer does the real
 * coercion and is the actual gatekeeper.
 */
import { z } from 'zod';
import { EMPLOYEE_STATUSES } from '../../lib/constants.js';
import { toDateInput } from '../../lib/utils.js';

const optional = z.string().trim().max(200).optional().or(z.literal(''));
const optionalPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 -]{5,18}$/, 'Enter a valid phone number.')
  .optional()
  .or(z.literal(''));

/** number + expiry pair for one identity document. */
const documentSchema = z.object({ number: optional, expiry: z.string() });

export const employeeFormSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(2, 'Employee ID is required.')
    .max(20)
    .regex(/^[A-Za-z0-9-]+$/, 'Only letters, numbers and dashes.'),
  fullName: z.string().trim().min(2, 'Full name is required.').max(100),
  nationality: z.string().trim().min(2, 'Nationality is required.').max(60),
  mobile: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 -]{5,18}$/, 'Enter a valid mobile number.'),
  email: z.union([z.literal(''), z.email('Enter a valid email address.')]),

  passport: documentSchema,
  visa: documentSchema,
  iqama: documentSchema,
  medical: documentSchema,
  drivingLicense: documentSchema,

  joiningDate: z.string().min(1, 'Joining date is required.'),
  designation: z.string().trim().min(2, 'Designation is required.').max(60),
  department: optional,
  salary: z
    .string()
    .min(1, 'Salary is required.')
    .refine((s) => !Number.isNaN(Number(s)) && Number(s) >= 0, 'Enter a valid amount.'),
  accommodation: optional,
  status: z.enum(EMPLOYEE_STATUSES),

  emergencyContact: z.object({ name: optional, phone: optionalPhone, relation: optional }),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  // P2-M2: '' means "no coordinator assigned" — sent to the API as null.
  coordinator: z.string().optional().or(z.literal('')),
});

const emptyDocument = { number: '', expiry: '' };

/** Blank slate for the "new employee" form. */
export const emptyEmployeeForm = {
  employeeId: '',
  fullName: '',
  nationality: '',
  mobile: '',
  email: '',
  passport: emptyDocument,
  visa: emptyDocument,
  iqama: emptyDocument,
  medical: emptyDocument,
  drivingLicense: emptyDocument,
  joiningDate: '',
  designation: '',
  department: '',
  salary: '',
  accommodation: '',
  status: 'Active',
  emergencyContact: { name: '', phone: '', relation: '' },
  notes: '',
  coordinator: '',
};

/** API employee → form values (ISO dates become date-input strings). */
export function employeeToForm(employee) {
  const doc = (d) => ({ number: d?.number ?? '', expiry: toDateInput(d?.expiry) });
  return {
    employeeId: employee.employeeId,
    fullName: employee.fullName,
    nationality: employee.nationality,
    mobile: employee.mobile,
    email: employee.email ?? '',
    passport: doc(employee.passport),
    visa: doc(employee.visa),
    iqama: doc(employee.iqama),
    medical: doc(employee.medical),
    drivingLicense: doc(employee.drivingLicense),
    joiningDate: toDateInput(employee.joiningDate),
    designation: employee.designation,
    department: employee.department ?? '',
    salary: String(employee.salary),
    accommodation: employee.accommodation ?? '',
    status: employee.status,
    emergencyContact: {
      name: employee.emergencyContact?.name ?? '',
      phone: employee.emergencyContact?.phone ?? '',
      relation: employee.emergencyContact?.relation ?? '',
    },
    notes: employee.notes ?? '',
    coordinator: employee.coordinator?._id ?? employee.coordinator ?? '',
  };
}

/** Form values → API payload: '' becomes null so an explicit unassign is sent. */
export function formToEmployeePayload(values) {
  return { ...values, coordinator: values.coordinator || null };
}
