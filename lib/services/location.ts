import * as Location from 'expo-location';

export interface UserCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentLocation(): Promise<UserCoordinates | null> {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.warn('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
    };
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
}

export function calculateMagneticLatitude(lat: number, lng: number): number {
  // Simplified calculation using dipole approximation
  // Magnetic north pole approximately at 80.7°N, 72.7°W (2025 estimate)
  const magPoleLat = 80.7;
  const magPoleLng = -72.7;

  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);
  const poleLatRad = magPoleLat * (Math.PI / 180);
  const poleLngRad = magPoleLng * (Math.PI / 180);

  // Spherical law of cosines for magnetic latitude
  const magLat = Math.asin(
    Math.sin(latRad) * Math.sin(poleLatRad) +
    Math.cos(latRad) * Math.cos(poleLatRad) * Math.cos(lngRad - poleLngRad)
  );

  return magLat * (180 / Math.PI);
}

export function getAuroraViewingLatitude(kp: number): number {
  // Approximate equatorward boundary of aurora for given Kp
  // Based on empirical data
  const boundaries: Record<number, number> = {
    0: 67,
    1: 65,
    2: 63,
    3: 60,
    4: 57,
    5: 53,
    6: 50,
    7: 47,
    8: 44,
    9: 40,
  };

  const floorKp = Math.floor(Math.min(9, Math.max(0, kp)));
  const ceilKp = Math.ceil(Math.min(9, Math.max(0, kp)));

  if (floorKp === ceilKp) return boundaries[floorKp];

  // Interpolate
  const fraction = kp - floorKp;
  return boundaries[floorKp] + (boundaries[ceilKp] - boundaries[floorKp]) * fraction;
}
