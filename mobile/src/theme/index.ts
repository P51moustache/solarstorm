/**
 * SolarStorm design core. Import everything visual from here:
 *   import { colors, space, radii, textStyles, motion } from '@/theme';
 * Never write a raw color, size, font, duration or easing in a screen or component
 * (`npm test` runs the style guardrail).
 */
export { colors } from './colors';
export { componentSize, controlPadding, iconSize, layout, radii, space } from './spacing';
export { fontSize, fonts, lineHeight, textStyles, tracking } from './typography';
export { shadows } from './shadows';
export * as motion from './motion';
