/**
 * Tonight's plain answer: a one-line headline ("Clear and dark from 22:10 to 03:40") and a short
 * sentence under it, from the night plan.
 */
import type { Clock } from './clock';
import type { NightPlan } from './night';
import type { ScoreFactor } from './skyScore';

export interface NightHeadline {
  title: string;
  detail: string;
}

/** Window scores from here up read as "clear and dark"; below, the window is good but not ideal. */
export const EXCELLENT_SCORE = 80;

/** What spoils a night when no window is good enough, by the factor that costs most. */
const SPOILED_BY: Record<ScoreFactor, string> = {
  clouds: 'Clouded out tonight',
  moon: 'Bright moon all night',
  darkness: 'Never fully dark tonight',
  humidity: 'Hazy and damp tonight',
  visibility: 'Fog hides the sky tonight',
  wind: 'Too windy tonight',
};

/** What costs a little in a good-but-not-ideal window. */
const COSTS_A_LITTLE: Record<ScoreFactor, string> = {
  clouds: 'some cloud drifts through',
  moon: 'moonlight washes out the faintest stars',
  darkness: 'the sky never gets fully dark',
  humidity: 'damp air may haze the view and dew the lens',
  visibility: 'there may be some mist',
  wind: 'wind may shake a tripod',
};

/** The factor that limits the most samples tonight, or null when nothing does. */
export function mainLimit(plan: Pick<NightPlan, 'samples'>): ScoreFactor | null {
  const counts = new Map<ScoreFactor, number>();
  for (const s of plan.samples) if (s.limitedBy) counts.set(s.limitedBy, (counts.get(s.limitedBy) ?? 0) + 1);
  let worst: ScoreFactor | null = null;
  for (const [factor, n] of counts) if (worst === null || n > (counts.get(worst) ?? 0)) worst = factor;
  return worst;
}

/** Said when clouds are unknown: for the whole night, or for part of it (the forecast ends or starts inside it). */
const NO_CLOUD_FORECAST = ' No cloud forecast yet: this is the Sun and Moon alone.';
const PART_CLOUD_FORECAST = ' Clouds are unknown for part of the night.';

function cloudNote(plan: NightPlan): string {
  if (plan.hasWeather) return '';
  return plan.samples.some((s) => s.weather) ? PART_CLOUD_FORECAST : NO_CLOUD_FORECAST;
}

export function nightHeadline(plan: NightPlan, clock: Clock): NightHeadline {
  const note = cloudNote(plan);
  const { best } = plan;
  if (best) {
    const span = `from ${clock(best.start)} to ${clock(best.end)}`;
    if (best.score >= EXCELLENT_SCORE) {
      return {
        title: `Clear and dark ${span}`,
        detail: `Excellent conditions for stargazing and night photography.${note}`,
      };
    }
    const limit = mainLimit(plan);
    const cost = limit ? ` Worth going out, though ${COSTS_A_LITTLE[limit]}.` : '';
    return { title: `Good sky ${span}`, detail: `${cost.trim()}${note}`.trim() };
  }
  const limit = mainLimit(plan);
  const peak = plan.samples.reduce<NightPlan['samples'][number] | null>(
    (b, s) => (b === null || s.score > b.score ? s : b),
    null
  );
  const bestMoment = peak && peak.score > 0 ? `Best around ${clock(peak.time)}, scoring ${peak.score}.` : '';
  return {
    title: limit ? SPOILED_BY[limit] : 'No good window tonight',
    detail: `${bestMoment}${note}`.trim() || 'No stretch of the night is good enough to go out.',
  };
}
