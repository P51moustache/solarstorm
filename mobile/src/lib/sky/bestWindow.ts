/**
 * The best window: the stretch of the night worth going out for.
 * Pure: works on any time series of scores, so the rules can be tested without a sky.
 */

/** One scored moment. Samples are evenly spaced and sorted by time. */
export interface ScoredMoment {
  time: Date;
  score: number;
}

export interface SkyWindow {
  start: Date;
  /** The last good moment plus one step: the window covers [start, end). */
  end: Date;
  /** Mean score across the window, 0-100. */
  score: number;
  /** Best single moment in it. */
  peak: ScoredMoment;
}

/** Scores from here up count as good enough to go out: clear enough, dark enough, moon tolerable. */
export const GOOD_SCORE = 60;

/** A window shorter than this is not worth the trip. */
export const MIN_WINDOW_MINUTES = 30;

/**
 * The best stretch of consecutive samples at or above `minScore`, ranked by total score
 * (so a long good stretch beats a short slightly better one). Null when no stretch lasts `minMinutes`.
 */
export function findBestWindow(
  samples: readonly ScoredMoment[],
  minScore = GOOD_SCORE,
  minMinutes = MIN_WINDOW_MINUTES
): SkyWindow | null {
  if (samples.length < 2) return null;
  const stepMs = samples[1].time.getTime() - samples[0].time.getTime();
  let best: { from: number; to: number; total: number } | null = null;

  let from = -1;
  let total = 0;
  for (let i = 0; i <= samples.length; i++) {
    const good = i < samples.length && samples[i].score >= minScore;
    if (good) {
      if (from < 0) from = i;
      total += samples[i].score;
      continue;
    }
    if (from >= 0) {
      const minutes = ((i - from) * stepMs) / 60_000;
      if (minutes >= minMinutes && (!best || total > best.total)) best = { from, to: i, total };
      from = -1;
      total = 0;
    }
  }
  if (!best) return null;

  const run = samples.slice(best.from, best.to);
  const peak = run.reduce((a, b) => (b.score > a.score ? b : a));
  return {
    start: run[0].time,
    end: new Date(run[run.length - 1].time.getTime() + stepMs),
    score: Math.round(best.total / run.length),
    peak,
  };
}
