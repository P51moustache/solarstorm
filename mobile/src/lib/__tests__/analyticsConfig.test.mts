/** The privacy contract in analyticsConfig.ts, checked so a settings change cannot slip it. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { analyticsEnabled, DEFAULT_POSTHOG_HOST, posthogOptions } from '@/lib/analyticsConfig';

test('sends nothing without a key or in development', () => {
  assert.equal(analyticsEnabled({ key: undefined, isDev: false }), false);
  assert.equal(analyticsEnabled({ key: '  ', isDev: false }), false);
  assert.equal(analyticsEnabled({ key: 'phc_x', isDev: true }), false);
  assert.equal(analyticsEnabled({ key: 'phc_x', isDev: false }), true);
});

test('stays anonymous: no profiles, no geolocation, no replay, no console capture', () => {
  const o = posthogOptions({ key: 'phc_x', isDev: false });
  assert.equal(o.personProfiles, 'never');
  assert.equal(o.disableGeoip, true);
  assert.equal(o.enableSessionReplay, false);
  assert.equal(o.errorTracking.autocapture.console, false);
});

test('reports crashes, JS and native', () => {
  const a = posthogOptions({ isDev: false }).errorTracking.autocapture;
  assert.equal(a.uncaughtExceptions && a.unhandledRejections && a.nativeCrashes, true);
});

test('uses the US cloud unless a host is given', () => {
  assert.equal(posthogOptions({ isDev: false }).host, DEFAULT_POSTHOG_HOST);
  assert.equal(posthogOptions({ isDev: false, host: 'https://eu.i.posthog.com' }).host, 'https://eu.i.posthog.com');
});
