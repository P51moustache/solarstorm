/**
 * Tonight's summary: headline wording, the hour strip, the Moon, what's up and the aurora glow rule.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compassPoint, utcClock } from '@/lib/sky/clock';
import { auroraChance, isAuroraLikely } from '@/lib/sky/events/aurora';
import { EXCELLENT_SCORE, mainLimit, nightHeadline } from '@/lib/sky/headline';
import { totalCloud } from '@/lib/sky/hourStrip';
import { moonPhaseName } from '@/lib/sky/moon';
import type { NightPlan, NightSample } from '@/lib/sky/night';
import { parseHourly, type OpenMeteoHourly } from '@/lib/sky/weather';
import { planTonight } from '@/lib/sky/tonight';

const HOUR = 3_600_000;
/** New Moon 9 Dec 2026; Saturn and Jupiter are evening planets then. */
const NOON = Date.parse('2026-12-09T12:00:00Z');
const LONDON = { lat: 51.5, lng: -0.13 };
/** Mid-July, southern hemisphere: the galactic core rides high after dark. */
const SANTIAGO = { lat: -33.45, lng: -70.67 };
const JULY_NOON_SANTIAGO = Date.parse('2026-07-14T16:00:00Z');

function forecast(from: number, hours: number, low: (i: number) => number): OpenMeteoHourly {
  const n = Array.from({ length: hours }, (_, i) => i);
  const constant = (v: number) => n.map(() => v);
  return {
    hourly: {
      time: n.map((i) => (from + i * HOUR) / 1000),
      cloud_cover_low: n.map(low),
      cloud_cover_mid: constant(0),
      cloud_cover_high: constant(0),
      relative_humidity_2m: constant(60),
      temperature_2m: constant(5),
      dew_point_2m: constant(-2),
      wind_speed_10m: constant(8),
      visibility: constant(25_000),
    },
  };
}

const tonight = (place = LONDON, now = NOON, low = (_i: number) => 0, aurora: { probability: number; kp: number } | null = null) =>
  planTonight({ place, weather: parseHourly(forecast(now, 48, low)), now: new Date(now), aurora, clock: utcClock });

test('a clear moonless night reads "Clear and dark" with its window in clock time', () => {
  const t = tonight();
  assert.ok(t.plan.best);
  assert.ok(t.plan.best.score >= EXCELLENT_SCORE);
  assert.match(t.headline.title, /^Clear and dark from \d\d:\d\d to \d\d:\d\d$/);
  assert.equal(t.headline.detail, 'Excellent conditions for stargazing and night photography.');
});

test('an overcast night is "Clouded out" and says when it is least bad', () => {
  const t = tonight(LONDON, NOON, () => 100);
  assert.equal(t.plan.best, null);
  assert.equal(t.headline.title, 'Clouded out tonight');
});

test('without a forecast the headline says the cloud forecast is missing', () => {
  const plan = planTonight({ place: LONDON, weather: [], now: new Date(NOON), aurora: null, clock: utcClock }).plan;
  assert.match(nightHeadline(plan, utcClock).detail, /Cloud forecast not out yet\./);
});

test('the hour strip has one column per whole hour and marks the best window', () => {
  const t = tonight(LONDON, NOON, (i) => (i < 12 ? 100 : 0));
  assert.ok(t.hours.length >= 14);
  for (const c of t.hours) assert.equal(new Date(c.time).getUTCMinutes(), 0);
  const marked = t.hours.filter((c) => c.inBest);
  assert.ok(marked.length > 0);
  assert.ok(marked.every((c) => c.time.getTime() >= t.plan.best!.start.getTime()));
  assert.equal(t.hours[0].cloud, 100);
  assert.equal(t.hours.at(-1)!.cloud, 0);
});

test('total cloud combines layers as independent', () => {
  assert.equal(totalCloud({ cloudLow: 0, cloudMid: 0, cloudHigh: 0 }), 0);
  assert.equal(totalCloud({ cloudLow: 50, cloudMid: 50, cloudHigh: 0 }), 75);
  assert.equal(totalCloud({ cloudLow: 100, cloudMid: 0, cloudHigh: 0 }), 100);
});

test('the main limit is the factor that limits most samples', () => {
  const s = (limitedBy: NightSample['limitedBy']) => ({ limitedBy }) as NightSample;
  assert.equal(mainLimit({ samples: [s('moon'), s('clouds'), s('clouds'), s(null)] } as Pick<NightPlan, 'samples'>), 'clouds');
  assert.equal(mainLimit({ samples: [s(null)] } as Pick<NightPlan, 'samples'>), null);
});

test('Moon phase names', () => {
  assert.equal(moonPhaseName(2), 'New moon');
  assert.equal(moonPhaseName(45), 'Waxing crescent');
  assert.equal(moonPhaseName(135), 'Waxing gibbous');
  assert.equal(moonPhaseName(180), 'Full moon');
  assert.equal(moonPhaseName(300), 'Waning crescent');
  assert.equal(moonPhaseName(358), 'New moon');
});

test('near new Moon the Moon is barely lit', () => {
  const t = tonight();
  assert.ok(t.moon.illumination < 0.05);
  assert.equal(t.moon.phaseName, 'New moon');
});

test('a December evening over London lists Jupiter and Saturn, brightest first', () => {
  const planets = tonight().events.filter((e) => e.kind === 'planet').map((e) => e.title);
  assert.ok(planets.includes('Jupiter'));
  assert.ok(planets.includes('Saturn'));
  assert.ok(planets.indexOf('Jupiter') < planets.indexOf('Saturn'));
});

test('the Milky Way core shows on a dark southern winter night and not over a December London', () => {
  assert.ok(!tonight().events.some((e) => e.kind === 'milkyWay'));
  const south = tonight(SANTIAGO, JULY_NOON_SANTIAGO).events.find((e) => e.kind === 'milkyWay');
  assert.ok(south);
  assert.match(south.detail, /^Visible \d\d:\d\d – \d\d:\d\d · (Low|Up|High) in the [NESW]{1,2}, best ~\d\d:\d\d$/);
});

test('the aurora glow shows only when the aurora is likely', () => {
  assert.equal(tonight().auroraGlow, false);
  assert.equal(tonight(LONDON, NOON, () => 0, { probability: 10, kp: 2 }).auroraGlow, false);
  assert.equal(tonight(LONDON, NOON, () => 0, { probability: 30, kp: 5 }).auroraGlow, false);
  assert.equal(tonight(LONDON, NOON, () => 0, { probability: 65, kp: 7 }).auroraGlow, true);
  assert.equal(isAuroraLikely(null), false);
  assert.equal(auroraChance({ probability: 20, kp: 4 }), 'possible');
});

test('the aurora is listed whenever there is a read', () => {
  const quiet = tonight(LONDON, NOON, () => 0, { probability: 5, kp: 1.7 }).events.at(-1)!;
  assert.equal(quiet.title, 'Aurora: unlikely');
  assert.equal(quiet.detail, '5% chance (Kp 1.7) · No significant activity expected');
  assert.ok(!tonight().events.some((e) => e.kind === 'aurora'));
});

test('compass points', () => {
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(135), 'SE');
  assert.equal(compassPoint(350), 'N');
  assert.equal(compassPoint(-90), 'W');
});
