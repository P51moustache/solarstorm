import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { SkyState } from '@/lib/sky/darkness';
import { cloudFactor, scoreSky } from '@/lib/sky/skyScore';
import type { SkyWeather } from '@/lib/sky/weather';

const DARK: SkyState = {
  sunAltitude: -30,
  moonAltitude: -10,
  moonIllumination: 0,
  phase: 'night',
  sunDarkness: 1,
  moonGlow: 0,
};

const CLEAR: SkyWeather = {
  time: new Date(0),
  cloudLow: 0,
  cloudMid: 0,
  cloudHigh: 0,
  humidity: 50,
  temperatureC: 10,
  dewPointC: 0,
  windKmh: 5,
  visibilityM: 30_000,
};

test('a clear, dark, moonless, calm night scores 100 with nothing limiting it', () => {
  const s = scoreSky(DARK, CLEAR);
  assert.equal(s.score, 100);
  assert.equal(s.limitedBy, null);
});

test('daylight scores 0 however clear it is', () => {
  const s = scoreSky({ ...DARK, sunAltitude: 10, phase: 'day', sunDarkness: 0 }, CLEAR);
  assert.equal(s.score, 0);
  assert.equal(s.limitedBy, 'darkness');
});

test('low overcast ruins the sky; high thin cloud only dims it', () => {
  assert.equal(scoreSky(DARK, { ...CLEAR, cloudLow: 100 }).score, 0);
  const cirrus = scoreSky(DARK, { ...CLEAR, cloudHigh: 100 });
  assert.equal(cirrus.score, 50);
  assert.equal(cirrus.limitedBy, 'clouds');
});

test('cloud layers combine as the share of sky they leave open', () => {
  assert.equal(cloudFactor({ cloudLow: 50, cloudMid: 50, cloudHigh: 0 }), 0.25);
});

test('a full Moon high up costs 60% and is named as the limit', () => {
  const s = scoreSky({ ...DARK, moonAltitude: 50, moonIllumination: 1, moonGlow: 1 }, CLEAR);
  assert.equal(s.score, 40);
  assert.equal(s.limitedBy, 'moon');
});

test('fog, damp air and wind each take their share', () => {
  assert.equal(scoreSky(DARK, { ...CLEAR, visibilityM: 800 }).score, 0);
  assert.equal(scoreSky(DARK, { ...CLEAR, humidity: 98, dewPointC: 9 }).score, 70);
  assert.equal(scoreSky(DARK, { ...CLEAR, windKmh: 60 }).score, 70);
});

test('with no weather, only darkness and moon count', () => {
  assert.equal(scoreSky(DARK, null).score, 100);
});
