/**
 * Client-side schema for the document upload form's text fields. The file and
 * owner are handled separately in the modal (a file input and, on the global
 * page, owner pickers), because Zod doesn't validate File objects here.
 */
import { z } from 'zod';
import { DOCUMENT_CATEGORIES } from '../../lib/constants.js';

export const documentFormSchema = z.object({
  title: z.string().trim().min(2, 'Title is required.').max(150),
  category: z.enum(DOCUMENT_CATEGORIES),
  expiryDate: z.string().optional().or(z.literal('')),
});

export const emptyDocumentForm = {
  title: '',
  category: 'Other',
  expiryDate: '',
};

/** Current (latest) version of a document — versions are append-only. */
export function currentVersion(doc) {
  return doc.versions[doc.versions.length - 1];
}
