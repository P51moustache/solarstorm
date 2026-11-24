/**
 * Darkness against published almanac times (timeanddate.com, London and Tromsø) to within minutes.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moonGlowFor, nightBounds, phaseFor, skyAt, sunDarknessFor } from '@/lib/sky/darkness';

const LONDON = { lat: 51.5, lng: -0.13 };
const TROMSO = { lat: 69.65, lng: 18.96 };
const MIN = 60_000;

function near(actual: Date | null, expectedIso: string, toleranceMin = 3) {
  assert.ok(actual, `expected a time near ${expectedIso}`);
  const off = Math.abs(actual.getTime() - Date.parse(expectedIso)) / MIN;
  assert.ok(off <= toleranceMin, `${actual.toISOString()} is ${off.toFixed(1)} min from ${expectedIso}`);
}

test('London midwinter: sunset, astronomical dusk and dawn, sunrise', () => {
  const b = nightBounds(LONDON, new Date('2026-12-21T12:00:00Z'));
  near(b.sunset, '2026-12-21T15:53:00Z');
  near(b.dusk, '2026-12-21T17:58:00Z');
  near(b.dawn, '2026-12-22T06:00:00Z');
  near(b.sunrise, '2026-12-22T08:04:00Z');
  assert.equal(b.darkest, 'night');
});

test('during the night, the bounds are the night under way, not the next one', () => {
  const evening = nightBounds(LONDON, new Date('2026-12-21T12:00:00Z'));
  const lateNight = nightBounds(LONDON, new Date('2026-12-22T03:00:00Z'));
  for (const key of ['sunset', 'dusk', 'dawn', 'sunrise'] as const) {
    near(lateNight[key], evening[key]!.toISOString(), 0.1);
  }
});

test('London midsummer never gets past astronomical twilight', () => {
  const b = nightBounds(LONDON, new Date('2026-06-21T12:00:00Z'));
  assert.equal(b.darkest, 'astronomical');
  assert.ok(b.dusk && b.dawn && b.dusk < b.dawn);
});

test('Tromsø: midnight sun in June, polar night in December', () => {
  const june = nightBounds(TROMSO, new Date('2026-06-21T12:00:00Z'));
  assert.equal(june.sunset, null);
  assert.equal(june.darkest, 'day');
  const december = nightBounds(TROMSO, new Date('2026-12-21T12:00:00Z'));
  assert.equal(december.sunrise, null);
  assert.equal(december.darkest, 'night');
});

test('the Moon near full on 24 Dec 2026 is lit and high over London at midnight', () => {
  const sky = skyAt(LONDON, new Date('2026-12-24T00:00:00Z'));
  assert.ok(sky.moonIllumination > 0.97);
  assert.ok(sky.moonAltitude > 30);
  assert.ok(sky.moonGlow > 0.95);
  assert.equal(sky.phase, 'night');
});

test('twilight phases and sun darkness follow the standard altitudes', () => {
  assert.equal(phaseFor(5), 'day');
  assert.equal(phaseFor(-3), 'civil');
  assert.equal(phaseFor(-9), 'nautical');
  assert.equal(phaseFor(-15), 'astronomical');
  assert.equal(phaseFor(-20), 'night');
  assert.equal(sunDarknessFor(-6), 0);
  assert.equal(sunDarknessFor(-12), 0.5);
  assert.equal(sunDarknessFor(-30), 1);
});

test('moonglow is zero when the Moon is down and fades near the horizon', () => {
  assert.equal(moonGlowFor(-5, 1), 0);
  assert.equal(moonGlowFor(15, 1), 0.5);
  assert.equal(moonGlowFor(60, 0.5), 0.5);
});
