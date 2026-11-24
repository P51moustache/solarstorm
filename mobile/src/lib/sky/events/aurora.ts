/** The aurora as one of tonight's events: always listed when there is a read, loud only when likely. */
import type { AuroraRead, SkyEventSource } from './types';

/** Chance (%) from which the aurora counts as likely: the horizon art shows its glow. */
export const AURORA_LIKELY_PERCENT = 50;
/** Chance (%) from which it is worth a look north. */
export const AURORA_POSSIBLE_PERCENT = 20;

export type AuroraChance = 'likely' | 'possible' | 'unlikely';

export function auroraChance(read: AuroraRead): AuroraChance {
  if (read.probability >= AURORA_LIKELY_PERCENT) return 'likely';
  if (read.probability >= AURORA_POSSIBLE_PERCENT) return 'possible';
  return 'unlikely';
}

/** True when the horizon art should show an aurora glow. */
export function isAuroraLikely(read: AuroraRead | null): boolean {
  return read !== null && auroraChance(read) === 'likely';
}

const DETAIL: Record<AuroraChance, string> = {
  likely: 'look toward the pole',
  possible: 'worth a look poleward',
  unlikely: 'quiet',
};

export const auroraSource: SkyEventSource = {
  kind: 'aurora',
  find({ aurora }) {
    if (!aurora) return [];
    const chance = auroraChance(aurora);
    return [
      {
        id: 'aurora',
        kind: 'aurora',
        title: `Aurora: ${chance}`,
        detail: `${aurora.probability}% chance · Kp\u00A0${aurora.kp.toFixed(1)} · ${DETAIL[chance]}`,
      },
    ];
  },
};
