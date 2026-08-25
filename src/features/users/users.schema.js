import { z } from 'zod';
import { STAFF_ASSIGNABLE_ROLES } from '../../lib/constants.js';

const emptyToUndef = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/**
 * 'Employee' is a UI-only pseudo-role — it doesn't exist server-side (that's
 * 'Worker', provisioned via employees.api.js's createEmployeeLogin, linked to
 * one specific Employee record, never a bare name+email). Offering it here
 * just lets an Admin start either kind of login from one screen instead of
 * needing to find the individual employee's profile page first.
 */
export const CREATE_LOGIN_ROLES = [...STAFF_ASSIGNABLE_ROLES, 'Employee'];

export const createLoginFormSchema = z
  .object({
    role: z.string().optional(),
    name: z.preprocess(emptyToUndef, z.string().trim().min(2).max(100).optional()),
    email: z.preprocess(emptyToUndef, z.email('Enter a valid email address.').optional()),
    managedBy: z.preprocess(emptyToUndef, z.string().optional()),
    employeeId: z.preprocess(emptyToUndef, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    if (!data.role || !CREATE_LOGIN_ROLES.includes(data.role)) {
      ctx.addIssue({ code: 'custom', path: ['role'], message: 'Choose a role.' });
      return;
    }
    if (data.role === 'Employee') {
      if (!data.employeeId) {
        ctx.addIssue({ code: 'custom', path: ['employeeId'], message: 'Choose an employee.' });
      }
    } else {
      if (!data.name) ctx.addIssue({ code: 'custom', path: ['name'], message: 'Name is required.' });
      if (!data.email) ctx.addIssue({ code: 'custom', path: ['email'], message: 'Enter a valid email address.' });
    }
  });

export const emptyCreateLoginForm = { role: '', name: '', email: '', managedBy: '', employeeId: '' };
