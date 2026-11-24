import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBestWindow } from '@/lib/sky/bestWindow';

const T0 = Date.parse('2026-12-21T18:00:00Z');
const STEP = 10 * 60_000;
const series = (scores: number[]) => scores.map((score, i) => ({ time: new Date(T0 + i * STEP), score }));

test('finds the good stretch with its start, end, mean and peak', () => {
  const w = findBestWindow(series([10, 70, 80, 90, 20]));
  assert.ok(w);
  assert.equal(w.start.getTime(), T0 + STEP);
  assert.equal(w.end.getTime(), T0 + 4 * STEP);
  assert.equal(w.score, 80);
  assert.equal(w.peak.score, 90);
});

test('a long good stretch beats a short slightly better one', () => {
  const w = findBestWindow(series([95, 95, 95, 0, 70, 70, 70, 70, 70, 70]));
  assert.ok(w);
  assert.equal(w.start.getTime(), T0 + 4 * STEP);
  assert.equal(w.score, 70);
});

test('a stretch that ends the night still counts', () => {
  const w = findBestWindow(series([0, 0, 80, 80, 80]));
  assert.ok(w);
  assert.equal(w.end.getTime(), T0 + 5 * STEP);
});

test('no window when nothing is good or the good part is too short', () => {
  assert.equal(findBestWindow(series([10, 20, 30, 40])), null);
  assert.equal(findBestWindow(series([0, 90, 90, 0])), null);
  assert.equal(findBestWindow([]), null);
});
