/**
 * Spacing scale. Keys follow the 4pt convention: `space[n]` is n × 4 points
 * (`space[3]` = 12, `space[1.5]` = 6). The half steps are kept because the app's
 * layout already relies on them.
 */
export const space = {
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  4.5: 18,
  6: 24,
  9: 36,
  10: 40,
} as const;

/** Page-level layout measurements. */
export const layout = {
  /** Side padding of every screen's content. */
  screenPadding: space[4],
  /** Gap between stacked cards on a screen. */
  stackGap: space[3],
  /** Bottom padding that keeps the last card clear of the floating tab bar. */
  tabBarClearance: 130,
  /** Bottom padding of a modal screen's scroll content. */
  modalClearance: 60,
  /** Vertical room around a centred loading or empty state. */
  emptyStatePadding: 60,
} as const;

/**
 * Vertical padding inside full-width buttons, per size. With the matching
 * text style these give roughly 45 / 50 / 56 pt tall controls (all above the
 * 44 pt touch minimum).
 */
export const controlPadding = {
  compact: 13,
  regular: 15,
  large: 17,
} as const;

/** Corner radii. `pill` makes any square a circle and any row a capsule. */
export const radii = {
  xs: 4,
  sm: 10,
  md: 12,
  lg: 14,
  xl: 16,
  card: 22,
  sheet: 26,
  pill: 999,
} as const;

/** Icon sizes (Ionicons `size`), small to large. */
export const iconSize = {
  xs: 15,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
  xxl: 24,
  xxxl: 28,
  feature: 56,
} as const;
