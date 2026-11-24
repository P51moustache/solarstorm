/**
 * Everything the Tonight screen shows, in one pure call: the plan, its headline, the hour strip,
 * the Moon and what's up. The screen fetches weather and space weather, then renders this.
 */
import type { Clock } from './clock';
import type { Place } from './darkness';
import { skyEventsTonight } from './events/index';
import { isAuroraLikely } from './events/aurora';
import type { AuroraRead, SkyEvent } from './events/types';
import { nightHeadline, type NightHeadline } from './headline';
import { hourStrip, type HourColumn } from './hourStrip';
import { moonTonight, type MoonTonight } from './moon';
import { planNight, type NightPlan } from './night';
import type { SkyWeather } from './weather';

export interface TonightInput {
  place: Place;
  /** Empty when the forecast could not be fetched; the plan then scores the sky alone. */
  weather: readonly SkyWeather[];
  now: Date;
  aurora: AuroraRead | null;
  clock: Clock;
}

export interface Tonight {
  plan: NightPlan;
  headline: NightHeadline;
  hours: HourColumn[];
  moon: MoonTonight;
  events: SkyEvent[];
  /** Show the aurora glow in the horizon art. */
  auroraGlow: boolean;
}

export function planTonight({ place, weather, now, aurora, clock }: TonightInput): Tonight {
  const plan = planNight(place, weather, now);
  return {
    plan,
    headline: nightHeadline(plan, clock),
    hours: hourStrip(plan),
    moon: moonTonight(place, plan.bounds, now),
    events: skyEventsTonight({ place, plan, clock, aurora }),
    auroraGlow: isAuroraLikely(aurora),
  };
}
