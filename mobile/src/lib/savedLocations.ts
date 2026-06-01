import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'solarstorm.savedLocations.v1';

export interface SavedLocation {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export async function getSavedLocations(): Promise<SavedLocation[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedLocation[]) : [];
  } catch {
    return [];
  }
}

async function persist(list: SavedLocation[]): Promise<SavedLocation[]> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Best-effort; in-memory list is still returned to the caller.
  }
  return list;
}

export async function addSavedLocation(
  loc: Omit<SavedLocation, 'id'>
): Promise<SavedLocation[]> {
  const list = await getSavedLocations();
  // De-dupe by rounded coordinates so the same place isn't added twice.
  const key = (l: { lat: number; lng: number }) => `${l.lat.toFixed(2)},${l.lng.toFixed(2)}`;
  if (list.some((l) => key(l) === key(loc))) return list;
  const entry: SavedLocation = { ...loc, id: `${Date.now()}-${key(loc)}` };
  return persist([...list, entry]);
}

export async function removeSavedLocation(id: string): Promise<SavedLocation[]> {
  const list = await getSavedLocations();
  return persist(list.filter((l) => l.id !== id));
}
