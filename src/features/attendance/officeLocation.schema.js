import { z } from 'zod';

export const officeLocationFormSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal('')),
  lat: z
    .string()
    .min(1, 'Latitude is required.')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= -90 && Number(v) <= 90, 'Enter a valid latitude.'),
  lng: z
    .string()
    .min(1, 'Longitude is required.')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= -180 && Number(v) <= 180, 'Enter a valid longitude.'),
  radiusMeters: z
    .string()
    .min(1, 'Radius is required.')
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 10 && Number(v) <= 5000, 'Enter 10-5000 meters.'),
  // Comma or newline separated in the UI; split into an array on submit.
  allowedIpsText: z.string().optional().or(z.literal('')),
});

export const emptyOfficeLocationForm = { name: '', lat: '', lng: '', radiusMeters: '150', allowedIpsText: '' };

export function officeLocationToForm(loc) {
  if (!loc) return emptyOfficeLocationForm;
  return {
    name: loc.name ?? '',
    lat: String(loc.lat),
    lng: String(loc.lng),
    radiusMeters: String(loc.radiusMeters),
    allowedIpsText: (loc.allowedIps ?? []).join('\n'),
  };
}

export function formToOfficeLocationPayload(values) {
  return {
    name: values.name || undefined,
    lat: values.lat,
    lng: values.lng,
    radiusMeters: values.radiusMeters,
    allowedIps: values.allowedIpsText
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean),
  };
}
