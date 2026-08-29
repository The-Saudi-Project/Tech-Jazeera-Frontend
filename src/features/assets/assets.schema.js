/**
 * Client-side asset schemas — instant feedback; the server's Zod layer is
 * the real gatekeeper.
 */
import { z } from 'zod';

export const assetFormSchema = z.object({
  assetTag: z.string().trim().min(1, 'Asset tag is required.').max(30),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  category: z.string().min(1, 'Choose a category.'),
  purchaseDate: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptyAssetForm = { assetTag: '', name: '', category: '', purchaseDate: '', notes: '' };

export function assetToForm(asset) {
  return {
    assetTag: asset.assetTag,
    name: asset.name,
    category: asset.category,
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : '',
    notes: asset.notes ?? '',
  };
}

export const assignFormSchema = z.object({
  employee: z.string().min(1, 'Choose an employee.'),
  assignedAt: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptyAssignForm = { employee: '', assignedAt: '', notes: '' };

export const returnFormSchema = z.object({
  conditionNote: z.string().trim().max(300).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

export const emptyReturnForm = { conditionNote: '', notes: '' };
