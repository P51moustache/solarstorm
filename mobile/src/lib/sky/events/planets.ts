/** Bright planets up after dusk, brightest first. */
import { Body, Equator, Horizon, Illumination, Observer } from 'astronomy-engine';

import { SunAltitude } from '../darkness';
import { compassPoint } from '../clock';
import { upSpan } from './span';
import type { SkyEvent, SkyEventSource } from './types';

/** Planets bright enough to find by eye. Mercury is left out: it hugs the twilight horizon. */
const PLANETS: readonly { body: Body; name: string }[] = [
  { body: Body.Venus, name: 'Venus' },
  { body: Body.Mars, name: 'Mars' },
  { body: Body.Jupiter, name: 'Jupiter' },
  { body: Body.Saturn, name: 'Saturn' },
];

/** One decimal place, with a true minus sign for negative magnitudes. */
const magnitude = (m: number) => m.toFixed(1).replace('-', '−');

export const planetSource: SkyEventSource = {
  kind: 'planet',
  find({ place, plan, clock }) {
    const obs = new Observer(place.lat, place.lng, 0);
    const found: (SkyEvent & { mag: number })[] = [];
    for (const { body, name } of PLANETS) {
      const span = upSpan(
        plan.samples,
        (t) => {
          const eq = Equator(body, t, obs, true, true);
          return Horizon(t, obs, eq.ra, eq.dec, 'normal');
        },
        (s) => s.sky.sunAltitude <= SunAltitude.civil
      );
      if (!span) continue;
      const mag = Illumination(body, span.peak.time).mag;
      found.push({
        id: `planet-${name.toLowerCase()}`,
        kind: 'planet',
        title: name,
        detail: `Up ${clock(span.start)} – ${clock(span.end)} · Highest in the ${compassPoint(span.peak.azimuth)} at ${clock(span.peak.time)} (mag ${magnitude(mag)})`,
        mag,
      });
    }
    return found.sort((a, b) => a.mag - b.mag).map(({ mag: _mag, ...event }) => event);
  },
};
