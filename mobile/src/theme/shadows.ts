import { colors } from './colors';

/** Elevation presets: iOS shadow props and Android elevation together. */
export const shadows = {
  /** Popovers that float over content (search suggestions). */
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  /** Soft violet halo around Tonight's glass cards. */
  cardGlow: {
    shadowColor: colors.night.glassGlow,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** Teal light from the score ring and the best window. */
  tealGlow: {
    shadowColor: colors.night.window,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** Violet glow around the brand star. */
  starGlow: {
    shadowColor: colors.night.star,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
} as const;
