/**
 * Behaviour of the data layer against NOAA-shaped responses, with `fetch` replaced.
 * Run with `npm test` (Node's own test runner; no extra packages).
 */
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { alertWouldFire, DEFAULT_PREFS } from '@/lib/alertPrefs';
import { getCurrentConditions, getOutlook, getSolarWindHistory } from '@/lib/spaceWeather';

// ---- fake NOAA ----

const KP = 'planetary_k_index_1m.json';
const RTSW_MAG = 'rtsw/rtsw_mag_1m.json';
const RTSW_WIND = 'rtsw/rtsw_wind_1m.json';
const SUMMARY_MAG = 'summary/solar-wind-mag-field.json';
const SUMMARY_SPEED = 'summary/solar-wind-speed.json';
const OUTLOOK = '27-day-outlook.txt';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Serve `feeds` by URL ending; anything else is a 404, as a removed NOAA file would be. */
function serve(feeds: Record<string, unknown>): void {
  globalThis.fetch = (async (input: unknown) => {
    const key = Object.keys(feeds).find((k) => String(input).endsWith(k));
    if (!key) return new Response('not found', { status: 404 });
    const body = feeds[key];
    return typeof body === 'string' ? new Response(body) : Response.json(body);
  }) as typeof fetch;
}

const day = (hhmm: string) => `2026-11-20T${hhmm}:00`;
const kpRow = (at: string, estimate: number) => ({
  time_tag: at,
  kp_index: Math.round(estimate),
  estimated_kp: estimate,
});
const magRow = (at: string, source: string, active: boolean, bz: number | null, bt: number | null = 5) => ({
  time_tag: at,
  source,
  active,
  bz_gsm: bz,
  bt,
});
const windRow = (at: string, source: string, active: boolean, speed: number | null, density: number | null) => ({
  time_tag: at,
  source,
  active,
  proton_speed: speed,
  proton_density: density,
});

const QUIET_KP = [kpRow(day('06:10'), 1)];

// ---- solar wind ----

test('solar wind is the newest reading from the active spacecraft', async () => {
  serve({
    [KP]: QUIET_KP,
    // Newest first, several spacecraft per minute, as NOAA publishes it.
    [RTSW_MAG]: [
      magRow(day('06:21'), 'IMAP', false, 9.9, 9.9),
      magRow(day('06:21'), 'SOLAR1', true, -0.74, 4.76),
      magRow(day('06:20'), 'SOLAR1', true, -1.2, 4.9),
    ],
    [RTSW_WIND]: [
      windRow(day('06:21'), 'ACE', false, 999, 99),
      windRow(day('06:21'), 'SOLAR1', true, null, null),
      windRow(day('06:20'), 'SOLAR1', true, 391.2, 1.35),
    ],
  });

  const { solarWind } = await getCurrentConditions();

  assert.deepEqual(solarWind, { speed: 391.2, density: 1.35, bz: -0.74, bt: 4.76, at: day('06:20') });
});

test('solar wind falls back to the summary files when the one-minute files are gone', async () => {
  serve({
    [KP]: QUIET_KP,
    [SUMMARY_MAG]: [{ bt: 5, bz_gsm: -1, time_tag: '2026-11-20T06:21:00Z' }],
    [SUMMARY_SPEED]: [{ proton_speed: 391, time_tag: '2026-11-20T06:21:00Z' }],
  });

  const { solarWind } = await getCurrentConditions();

  assert.deepEqual(solarWind, { speed: 391, density: null, bz: -1, bt: 5, at: '2026-11-20T06:21:00Z' });
});

test('conditions still carry Kp when every solar-wind file is gone', async () => {
  serve({ [KP]: QUIET_KP });

  const conditions = await getCurrentConditions();

  assert.equal(conditions.kp, 1);
  assert.deepEqual(conditions.solarWind, { speed: null, density: null, bz: null, bt: null, at: null });
});

test('solar-wind history merges Bz and speed by minute, oldest first, active spacecraft only', async () => {
  serve({
    [RTSW_MAG]: [
      magRow(day('06:21'), 'ACE', false, 8),
      magRow(day('06:20'), 'SOLAR1', true, -2),
      magRow(day('06:19'), 'SOLAR1', true, -3),
    ],
    [RTSW_WIND]: [
      windRow(day('06:21'), 'SOLAR1', true, 400, 2),
      windRow('2026-11-20T06:20:07', 'SOLAR1', true, 395, 2), // same minute, other seconds
    ],
  });

  assert.deepEqual(await getSolarWindHistory(), [
    { at: day('06:19'), bz: -3, speed: null },
    { at: day('06:20'), bz: -2, speed: 395 },
    { at: day('06:21'), bz: null, speed: 400 },
  ]);
});

test('solar-wind history thins a full day of minutes to what a chart can show', async () => {
  const minutes = Array.from({ length: 1440 }, (_, i) => {
    const at = new Date(Date.UTC(2026, 10, 20, 0, i)).toISOString().slice(0, 19);
    return magRow(at, 'SOLAR1', true, -1);
  }).reverse();
  serve({ [RTSW_MAG]: minutes });

  const series = await getSolarWindHistory();

  assert.ok(series.length > 100 && series.length <= 150, `kept ${series.length} points`);
  assert.equal(series[series.length - 1].at, '2026-11-20T23:59:00', 'the newest minute is kept');
  assert.ok(series[0].at < series[1].at);
});

// ---- headline Kp ----

test('Kp holds the last completed window while the new window restarts near zero', async () => {
  serve({
    [KP]: [kpRow(day('00:30'), 4), kpRow(day('02:59'), 5.33), kpRow(day('03:00'), 0), kpRow(day('03:05'), 0.33)],
  });

  const conditions = await getCurrentConditions();

  assert.equal(conditions.kp, 5.33);
  assert.equal(conditions.kpAt, day('03:05'));
});

test('Kp follows the running estimate once it passes the last completed window', async () => {
  serve({ [KP]: [kpRow(day('05:59'), 2), kpRow(day('06:00'), 0), kpRow(day('06:40'), 6)] });

  assert.equal((await getCurrentConditions()).kp, 6);
});

test('Kp ignores windows older than the last completed one', async () => {
  serve({ [KP]: [kpRow(day('00:10'), 7), kpRow(day('06:10'), 1)] });

  assert.equal((await getCurrentConditions()).kp, 1);
});

// ---- outlook ----

function outlookTable(firstDay: Date, days: number): string {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const rows = Array.from({ length: days }, (_, i) => {
    const d = new Date(firstDay.getTime() + i * 86_400_000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${d.getUTCFullYear()} ${MONTHS[d.getUTCMonth()]} ${dd}     119          15          ${(i % 4) + 2}`;
  });
  return [':Product: 27-day Space Weather Outlook Table 27DO.txt', '#  Date', ...rows].join('\n');
}

test('outlook starts today (UTC) even when the table was issued days ago', async () => {
  serve({ [OUTLOOK]: outlookTable(new Date(Date.UTC(2026, 10, 16)), 27) });

  const outlook = await getOutlook(14, new Date('2026-11-20T06:00:00Z'));

  assert.equal(outlook.length, 14);
  assert.equal(outlook[0].label, 'Nov 20');
  assert.equal(outlook[13].label, 'Dec 03');
});

test('outlook keeps January rows that follow a December issue date', async () => {
  serve({ [OUTLOOK]: outlookTable(new Date(Date.UTC(2026, 11, 30)), 4) });

  const outlook = await getOutlook(14, new Date('2026-12-31T12:00:00Z'));

  assert.deepEqual(
    outlook.map((d) => d.label),
    ['Dec 31', 'Jan 01', 'Jan 02']
  );
});

// ---- storm alert rule ----

test('storm alert fires at the threshold when Bz points south', () => {
  assert.equal(alertWouldFire(DEFAULT_PREFS, 5, -3), true);
});

test('storm alert is held while Bz is known to point north', () => {
  assert.equal(alertWouldFire(DEFAULT_PREFS, 6, 2), false);
});

test('storm alert fires on Kp alone when there is no Bz reading', () => {
  assert.equal(alertWouldFire(DEFAULT_PREFS, 5, null), true);
});

test('storm alert stays quiet below the threshold', () => {
  assert.equal(alertWouldFire(DEFAULT_PREFS, 4.67, -8), false);
});
