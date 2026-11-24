import type { ImageSourcePropType } from 'react-native';

import type { SkyEvent } from '@/lib/sky/events/types';
import type { MoonTonight } from '@/lib/sky/moon';

/**
 * Painted thumbnails for Tonight. A new kind of event (or a new planet) adds one entry here; an event with
 * no entry falls back to its kind's picture.
 */
const BY_ID: Record<string, ImageSourcePropType> = {
  'milky-way-core': require('../../../assets/images/tonight/milky-way.png'),
  'planet-venus': require('../../../assets/images/tonight/venus.png'),
  'planet-mars': require('../../../assets/images/tonight/mars.png'),
  'planet-jupiter': require('../../../assets/images/tonight/jupiter.png'),
  'planet-saturn': require('../../../assets/images/tonight/saturn.png'),
  aurora: require('../../../assets/images/tonight/aurora.png'),
};

const BY_KIND: Record<SkyEvent['kind'], ImageSourcePropType> = {
  milkyWay: BY_ID['milky-way-core'],
  planet: BY_ID['planet-jupiter'],
  aurora: BY_ID.aurora,
};

export function eventArt(event: Pick<SkyEvent, 'id' | 'kind'>): ImageSourcePropType {
  return BY_ID[event.id] ?? BY_KIND[event.kind];
}

/** Lit share above which the Moon is drawn full rather than gibbous. */
const FULL_LOOKING = 0.9;

const MOON_FULL = require('../../../assets/images/tonight/moon-full.png');
const MOON_GIBBOUS = require('../../../assets/images/tonight/moon-gibbous.png');

/** The Moon's picture: full when it looks full, else the gibbous plate. */
export function moonArt(moon: Pick<MoonTonight, 'illumination'>): ImageSourcePropType {
  return moon.illumination >= FULL_LOOKING ? MOON_FULL : MOON_GIBBOUS;
}
