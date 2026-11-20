/**
 * Headline Kp from NOAA's one-minute estimate (json/planetary_k_index_1m.json).
 *
 * Kp is defined per 3-hour UTC window. The one-minute estimate describes the window in
 * progress: it restarts near zero at 00, 03, … 21 UTC and builds as the window fills, and
 * its last value in a window matches the Kp NOAA then publishes for that window. Read on
 * its own it says "quiet" for the first part of every window, storm or not.
 *
 * So the headline is the higher of the last completed window's Kp and the estimate for the
 * window in progress. It never drops below the latest published value, and it still rises
 * the moment a new storm shows up in the running estimate.
 */

/** Length of one Kp window. Fixed by the definition of the index. */
const KP_WINDOW_MS = 3 * 60 * 60 * 1000;

export interface KpEstimate {
  kp: number;
  at: string; // time tag of the newest reading that went into `kp`
}

interface Sample {
  kp: number;
  at: string;
  windowStart: number;
}

/** Start (ms) of the 3-hour UTC window containing a NOAA time tag. Tags are naive UTC. */
function windowStartOf(timeTag: string): number {
  const iso = timeTag.replace(' ', 'T');
  const ms = Date.parse(/Z|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(ms) ? NaN : Math.floor(ms / KP_WINDOW_MS) * KP_WINDOW_MS;
}

function toSamples(data: unknown): Sample[] {
  if (!Array.isArray(data)) return [];
  const samples: Sample[] = [];
  for (const row of data as { time_tag?: unknown; kp_index?: unknown; estimated_kp?: unknown }[]) {
    const kp = row?.estimated_kp ?? row?.kp_index;
    if (typeof kp !== 'number' || typeof row.time_tag !== 'string') continue;
    const windowStart = windowStartOf(row.time_tag);
    if (!Number.isNaN(windowStart)) samples.push({ kp, at: row.time_tag, windowStart });
  }
  // ISO time tags order correctly as text; the feed is oldest-first but that is not promised.
  return samples.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

/** Current Kp for display and alert checks, or null when the feed has no usable row. */
export function headlineKp(data: unknown): KpEstimate | null {
  const samples = toSamples(data);
  const latest = samples[samples.length - 1];
  if (!latest) return null;

  const previousWindow = latest.windowStart - KP_WINDOW_MS;
  let previousFinal: Sample | null = null;
  for (let i = samples.length - 1; i >= 0; i--) {
    if (samples[i].windowStart === previousWindow) {
      previousFinal = samples[i];
      break;
    }
    if (samples[i].windowStart < previousWindow) break;
  }

  return { kp: Math.max(latest.kp, previousFinal?.kp ?? 0), at: latest.at };
}
