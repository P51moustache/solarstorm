import * as Haptics from 'expo-haptics';
import { Easing } from 'react-native-reanimated';

/**
 * Motion hub: every duration, curve and feedback the app uses lives here.
 * Screens name a preset; they never write a duration or easing of their own.
 *
 * Interaction registry (what happens when a person acts):
 * | Interaction                         | Motion                       | Haptic          |
 * |-------------------------------------|------------------------------|-----------------|
 * | Tap a button, row or chip           | press.opacity while held     | none            |
 * | Tap a list suggestion               | press.opacitySoft while held | none            |
 * | Open an explainer                   | native modal fade            | haptics.select  |
 * | Your location is found              | instant state change         | haptics.select  |
 * | Tap Share                           | native share sheet           | haptics.select  |
 * | Aurora backdrop (ambient, no input) | ambient.drift + breathe      | none            |
 */

/** Durations in ms. */
export const duration = {
  /** One slow inhale-exhale of the aurora's glow. */
  breathe: 4200,
  /** One aurora ribbon's sideways drift; each further ribbon adds `driftStagger`. */
  drift: 22000,
  driftStagger: 9000,
} as const;

export const easing = {
  /** Constant speed for endless ambient loops. */
  ambient: Easing.linear,
  /** Gentle in-out for breathing glows. */
  breathe: Easing.inOut(Easing.ease),
} as const;

/** Pressed-state feedback for tappable things. */
export const press = {
  opacity: 0.7,
  /** Lighter feedback for dense list rows. */
  opacitySoft: 0.6,
} as const;

/** Haptic feedback presets. Fire-and-forget; failures (web, no engine) are ignored. */
export const haptics = {
  /** A selection changed: segment, chart scrub, explainer opened. */
  select: () => {
    Haptics.selectionAsync().catch(() => {});
  },
} as const;
