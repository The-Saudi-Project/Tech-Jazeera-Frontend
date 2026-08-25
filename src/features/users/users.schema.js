import { z } from 'zod';
import { STAFF_ASSIGNABLE_ROLES } from '../../lib/constants.js';

const emptyToUndef = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const createStaffUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(100),
  email: z.email('Enter a valid email address.'),
  role: z.enum(STAFF_ASSIGNABLE_ROLES, { error: 'Choose a role.' }),
  managedBy: z.preprocess(emptyToUndef, z.string().optional()),
});

export const emptyCreateStaffUserForm = { name: '', email: '', role: '', managedBy: '' };
