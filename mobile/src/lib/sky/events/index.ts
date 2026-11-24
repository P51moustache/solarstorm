/**
 * What's up tonight: every event source in the order its rows show.
 * Add a kind (meteor showers, the ISS...) by writing a source and listing it here.
 */
import { auroraSource } from './aurora';
import { milkyWaySource } from './milkyWay';
import { planetSource } from './planets';
import type { SkyEvent, SkyEventContext, SkyEventSource } from './types';

export const SKY_EVENT_SOURCES: readonly SkyEventSource[] = [milkyWaySource, planetSource, auroraSource];

export function skyEventsTonight(ctx: SkyEventContext, sources = SKY_EVENT_SOURCES): SkyEvent[] {
  return sources.flatMap((s) => s.find(ctx));
}

export { auroraChance, isAuroraLikely, AURORA_LIKELY_PERCENT } from './aurora';
export type { AuroraChance } from './aurora';
export type { AuroraRead, SkyEvent, SkyEventContext, SkyEventKind, SkyEventSource } from './types';
