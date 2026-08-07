/**
 * Client-side deployment form schemas.
 *
 * Two schemas because assign needs a worker and transfer does not (the worker
 * is fixed by the deployment being transferred). They otherwise share the
 * same placement fields.
 */
import { z } from 'zod';
import { DEPLOYMENT_SHIFTS } from '../../lib/constants.js';

const optional = z.string().trim().max(1000).optional().or(z.literal(''));

const placement = {
  client: z.string().min(1, 'Select a client.'),
  site: z.string().min(1, 'Select a site.'),
  vehicle: z.string().trim().max(60).optional().or(z.literal('')),
  driver: z.string().trim().max(100).optional().or(z.literal('')),
  shift: z.enum(DEPLOYMENT_SHIFTS),
  startDate: z.string().min(1, 'Start date is required.'),
  notes: optional,
};

export const assignFormSchema = z.object({
  worker: z.string().min(1, 'Select a worker.'),
  ...placement,
});

export const transferFormSchema = z.object({ ...placement });

/** Defaults shared by both forms. `worker` is added by the assign page. */
export const emptyPlacement = {
  client: '',
  site: '',
  vehicle: '',
  driver: '',
  shift: 'Day',
  startDate: new Date().toISOString().slice(0, 10), // today, editable
  notes: '',
};
