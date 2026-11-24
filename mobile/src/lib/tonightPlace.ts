/**
 * Which place Tonight is planned for: "My location" or a saved place, remembered between launches.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { getDeviceLocation, hasLocationPermission } from '@/lib/location';
import { getSavedLocations } from '@/lib/savedLocations';

const KEY = 'solarstorm.tonightPlace.v1';
export const DEVICE_PLACE_ID = 'device';

export interface PlaceChoice {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

/** The remembered choice if it still exists, else the device, else the first saved place. */
export function pickPlace(choices: readonly PlaceChoice[], rememberedId: string | null): PlaceChoice | null {
  return (
    choices.find((c) => c.id === rememberedId) ??
    choices.find((c) => c.id === DEVICE_PLACE_ID) ??
    choices[0] ??
    null
  );
}

export interface TonightPlaces {
  choices: PlaceChoice[];
  place: PlaceChoice | null;
  loading: boolean;
  locating: boolean;
  choose: (id: string) => void;
  /** Asks for location permission and adds "My location". Returns false when refused. */
  locateMe: () => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useTonightPlaces(): TonightPlaces {
  const [choices, setChoices] = useState<PlaceChoice[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);

  const withDevice = useCallback(async (): Promise<PlaceChoice | null> => {
    const loc = await getDeviceLocation();
    return loc ? { id: DEVICE_PLACE_ID, ...loc } : null;
  }, []);

  const reload = useCallback(async () => {
    const [saved, remembered, granted] = await Promise.all([
      getSavedLocations(),
      AsyncStorage.getItem(KEY).catch(() => null),
      hasLocationPermission(),
    ]);
    const device = granted ? await withDevice() : null;
    setChoices([...(device ? [device] : []), ...saved]);
    setChosenId(remembered);
    setLoading(false);
  }, [withDevice]);

  useEffect(() => {
    reload();
  }, [reload]);

  const choose = useCallback((id: string) => {
    setChosenId(id);
    AsyncStorage.setItem(KEY, id).catch(() => {});
  }, []);

  const locateMe = useCallback(async () => {
    setLocating(true);
    const device = await withDevice();
    setLocating(false);
    if (!device) return false;
    setChoices((list) => [device, ...list.filter((c) => c.id !== DEVICE_PLACE_ID)]);
    choose(DEVICE_PLACE_ID);
    return true;
  }, [withDevice, choose]);

  return { choices, place: pickPlace(choices, chosenId), loading, locating, choose, locateMe, reload };
}
