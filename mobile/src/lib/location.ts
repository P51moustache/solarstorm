import * as Location from 'expo-location';

export interface DeviceLocation {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Requests foreground location permission and returns the device's coordinates
 * with a human-readable label. Returns null if permission is denied or unavailable.
 */
export async function getDeviceLocation(): Promise<DeviceLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = pos.coords;

    let label = `${latitude.toFixed(1)}°, ${longitude.toFixed(1)}°`;
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = places[0];
      if (p) {
        const parts = [p.city ?? p.subregion, p.region ?? p.country].filter(Boolean);
        if (parts.length) label = parts.join(', ');
      }
    } catch {
      // Reverse geocoding can fail offline — keep the coordinate label.
    }

    return { lat: latitude, lng: longitude, label };
  } catch {
    return null;
  }
}

/**
 * Search place names → ranked coordinate matches with tidy labels.
 * Uses Open-Meteo's free geocoding API (no key, works everywhere) rather than
 * the native geocoder, which is rate-limited and unreliable in Expo Go.
 */
export async function searchPlaces(query: string, count = 5): Promise<DeviceLocation[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      q
    )}&count=${count}&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: { latitude: number; longitude: number; name: string; admin1?: string; country?: string }[];
    };
    return (json.results ?? []).map((r) => ({
      lat: r.latitude,
      lng: r.longitude,
      label: [r.name, r.admin1 || r.country].filter(Boolean).join(', '),
    }));
  } catch {
    return [];
  }
}

/** First geocoding match for a place name (used when submitting directly). */
export async function geocodePlace(query: string): Promise<DeviceLocation | null> {
  const [first] = await searchPlaces(query, 1);
  return first ?? null;
}

/** Whether location permission has already been granted (no prompt). */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
