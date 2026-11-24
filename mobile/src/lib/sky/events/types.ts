/**
 * Sky events: what is worth looking at tonight (the Milky Way core, planets, the aurora...).
 * Each kind is one `SkyEventSource` in the registry (`index.ts`); add a kind by adding a file there.
 */
import type { Place } from '../darkness';
import type { NightPlan } from '../night';
import type { Clock } from '../clock';

export type SkyEventKind = 'milkyWay' | 'planet' | 'aurora';

export interface SkyEvent {
  /** Stable key, e.g. "planet-saturn". */
  id: string;
  kind: SkyEventKind;
  title: string;
  detail: string;
}

/** Tonight's aurora read for the place, from the space-weather feed. */
export interface AuroraRead {
  /** 0-100. */
  probability: number;
  kp: number;
}

export interface SkyEventContext {
  place: Place;
  plan: NightPlan;
  clock: Clock;
  /** Null when space weather has not loaded. */
  aurora: AuroraRead | null;
}

export interface SkyEventSource {
  kind: SkyEventKind;
  /** Tonight's events of this kind, in the order they should show. */
  find(ctx: SkyEventContext): SkyEvent[];
}
