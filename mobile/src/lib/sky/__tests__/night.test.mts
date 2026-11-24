/**
 * The whole night, from an Open-Meteo-shaped forecast through to the best window.
 */
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { planNight, planNights } from '@/lib/sky/night';
import { getSkyWeather, parseHourly, weatherAt, type OpenMeteoHourly } from '@/lib/sky/weather';

const LONDON = { lat: 51.5, lng: -0.13 };
const HOUR = 3_600_000;
/** New Moon is 9 Dec 2026, so the Moon stays out of the way of these nights. */
const NOON = Date.parse('2026-12-09T12:00:00Z');

/** A forecast of `hours` hours from noon whose low cloud is `low(hourIndex)`. */
function forecast(hours: number, low: (i: number) => number): OpenMeteoHourly {
  const n = Array.from({ length: hours }, (_, i) => i);
  const constant = (v: number) => n.map(() => v);
  return {
    hourly: {
      time: n.map((i) => (NOON + i * HOUR) / 1000),
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

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test('clearing after midnight: the best window opens when the cloud goes', () => {
  // Overcast until 00:00 UTC (hour 12 from noon), clear after.
  const weather = parseHourly(forecast(48, (i) => (i < 12 ? 100 : 0)));
  const plan = planNight(LONDON, weather, new Date(NOON));
  assert.ok(plan.best);
  const opens = plan.best.start.getTime();
  assert.ok(opens >= NOON + 11 * HOUR && opens <= NOON + 12 * HOUR, plan.best.start.toISOString());
  assert.ok(plan.best.end <= plan.bounds.sunrise!);
  assert.ok(plan.score >= 90);
  assert.equal(plan.hasWeather, true);
});

test('an overcast night has no window and a score of 0', () => {
  const plan = planNight(LONDON, parseHourly(forecast(48, () => 100)), new Date(NOON));
  assert.equal(plan.best, null);
  assert.equal(plan.score, 0);
});

test('a clear night is good from astronomical dusk to dawn, give or take a sample', () => {
  const plan = planNight(LONDON, parseHourly(forecast(48, () => 0)), new Date(NOON));
  assert.ok(plan.best && plan.bounds.dusk && plan.bounds.dawn);
  assert.ok(plan.best.start < plan.bounds.dusk);
  assert.ok(plan.best.end > plan.bounds.dawn);
});

test('without a forecast the night is scored on darkness alone and says so', () => {
  const plan = planNight(LONDON, [], new Date(NOON));
  assert.equal(plan.hasWeather, false);
  assert.ok(plan.best);
});

test('next nights follow one another', () => {
  const nights = planNights(LONDON, parseHourly(forecast(24 * 8, () => 0)), new Date(NOON), 3);
  assert.equal(nights.length, 3);
  for (let i = 1; i < nights.length; i++) {
    const gap = nights[i].bounds.sunset!.getTime() - nights[i - 1].bounds.sunset!.getTime();
    assert.ok(Math.abs(gap - 24 * HOUR) < HOUR);
  }
});

test('weather between hours is read between them; outside the forecast it is unknown', () => {
  const hours = parseHourly(forecast(3, (i) => i * 50));
  assert.equal(weatherAt(hours, new Date(NOON + HOUR / 2))!.cloudLow, 25);
  assert.equal(weatherAt(hours, new Date(NOON + 5 * HOUR)), null);
});

test('hours with missing cloud layers are dropped; a failed request is null', async () => {
  const json = forecast(2, () => 0);
  json.hourly.cloud_cover_low[0] = null;
  assert.equal(parseHourly(json).length, 1);

  globalThis.fetch = (async () => new Response('', { status: 500 })) as typeof fetch;
  assert.equal(await getSkyWeather(51.5, -0.13), null);
});
