/**
 * Client-side login schema — mirrors server/src/modules/auth/auth.validation.js.
 * This copy gives instant feedback in the form; the server copy is the one
 * that actually protects the API (never trust the client).
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required.').max(128),
});
