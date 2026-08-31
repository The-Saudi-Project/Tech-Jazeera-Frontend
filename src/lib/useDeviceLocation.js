/**
 * One GPS read via @capacitor/geolocation. The same call works unchanged on
 * native (Android's location APIs) and in a plain browser tab — the plugin
 * falls back to navigator.geolocation internally when there's no native
 * platform. Replaces 3 near-identical navigator.geolocation.getCurrentPosition
 * call sites this app had before the Capacitor wrap.
 *
 * Resolves { lat, lng, accuracy } or null on any denial/failure/timeout —
 * callers decide what a null result means for them: the two self-punch
 * screens fall back silently to the office-IP check (an existing,
 * independent verification path), the office-settings screen shows an error
 * toast instead, since there's no fallback for admin geofence setup.
 */
import { useCallback, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export function useDeviceLocation() {
  const [locating, setLocating] = useState(false);

  const getLocation = useCallback(async () => {
    setLocating(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10_000 });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  }, []);

  return { locating, getLocation };
}
