/** The Milky Way core: worth showing only while it is up in a properly dark sky. */
import { Horizon, Observer } from 'astronomy-engine';

import { compassPoint } from '../clock';
import { heightWord, upSpan } from './span';
import type { SkyEventSource } from './types';

/** The galactic centre (Sagittarius A*), J2000: RA in hours, Dec in degrees. */
const GALACTIC_CENTRE = { ra: 17.761, dec: -29.008 };

/** The core needs a nearly full-dark sky: Sun darkness at least this, moonlight at most `MAX_MOON_GLOW`. */
const MIN_SUN_DARKNESS = 0.9;
const MAX_MOON_GLOW = 0.5;

export const milkyWaySource: SkyEventSource = {
  kind: 'milkyWay',
  find({ place, plan, clock }) {
    const obs = new Observer(place.lat, place.lng, 0);
    const span = upSpan(
      plan.samples,
      (t) => Horizon(t, obs, GALACTIC_CENTRE.ra, GALACTIC_CENTRE.dec, 'normal'),
      (s) => s.sky.sunDarkness >= MIN_SUN_DARKNESS && s.sky.moonGlow <= MAX_MOON_GLOW
    );
    if (!span) return [];
    const where = `${heightWord(span.peak.altitude)} in the ${compassPoint(span.peak.azimuth)}`;
    return [
      {
        id: 'milky-way-core',
        kind: 'milkyWay',
        title: 'Milky Way core',
        detail: `Visible ${clock(span.start)}–${clock(span.end)} · ${where}, best ~${clock(span.peak.time)}`,
      },
    ];
  },
};
