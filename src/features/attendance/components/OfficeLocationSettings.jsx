/**
 * OfficeLocationSettings — Admin-only geofence config for self-marked
 * attendance (P2-M3). A Worker's own "Mark attendance" button is gated on
 * being within `radiusMeters` of this point, or on their request coming from
 * one of `allowedIps` — see docs/P2-M3-notes.md for why this replaces
 * "connect to the office WiFi" (browsers can't read a WiFi network's name).
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOfficeLocation, setOfficeLocation } from '../attendance.api.js';
import {
  officeLocationFormSchema,
  emptyOfficeLocationForm,
  officeLocationToForm,
  formToOfficeLocationPayload,
} from '../officeLocation.schema.js';
import { useDeviceLocation } from '../../../lib/useDeviceLocation.js';
import { apiMessage } from '../../../lib/utils.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Button from '../../../components/ui/Button.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function OfficeLocationSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { locating, getLocation } = useDeviceLocation();

  const { data: location, isPending } = useQuery({
    queryKey: ['office-location'],
    queryFn: getOfficeLocation,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(officeLocationFormSchema), defaultValues: emptyOfficeLocationForm });

  useEffect(() => {
    if (location !== undefined) reset(officeLocationToForm(location));
  }, [location, reset]);

  const saveMutation = useMutation({
    mutationFn: (values) => setOfficeLocation(formToOfficeLocationPayload(values)),
    onSuccess: () => {
      toast.success('Office location saved.');
      queryClient.invalidateQueries({ queryKey: ['office-location'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  async function useMyLocation() {
    const location = await getLocation();
    if (!location) {
      toast.error('Could not get your location. Check location permissions.');
      return;
    }
    setValue('lat', String(location.lat));
    setValue('lng', String(location.lng));
    toast.success('Location filled in — stand at the office before clicking this.');
  }

  if (isPending) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">Office location</h2>
      <p className="mb-4 text-sm text-muted">
        Workers can only mark their own attendance from within this radius, or from an allow-listed office IP.
        {!location && ' Not configured yet — self-marking is disabled until you set this up.'}
      </p>
      <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} noValidate className="space-y-4">
        <Input label="Location name" placeholder="Head Office" error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Latitude *" placeholder="24.7136" error={errors.lat?.message} {...register('lat')} />
          <Input label="Longitude *" placeholder="46.6753" error={errors.lng?.message} {...register('lng')} />
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={useMyLocation} isLoading={locating}>
          Use my current location
        </Button>
        <Input
          label="Allowed radius (meters) *"
          type="number"
          min="10"
          max="5000"
          error={errors.radiusMeters?.message}
          {...register('radiusMeters')}
        />
        <Textarea
          label="Office IP addresses (optional)"
          placeholder={'One per line, e.g.\n203.0.113.42'}
          rows={3}
          error={errors.allowedIpsText?.message}
          {...register('allowedIpsText')}
        />
        <p className="text-xs text-muted">
          Exact IPs only — not a subnet/CIDR range. Find your office's public IP by visiting whatismyip.com from an
          office computer.
        </p>
        <div className="flex justify-end">
          <Button type="submit" isLoading={saveMutation.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
