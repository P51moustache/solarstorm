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
} as const;
