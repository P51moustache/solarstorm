import type { TextStyle } from 'react-native';

/** Space Grotesk, loaded in app/_layout.tsx. Every text in the app uses one of these. */
export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
  /** Serif display face for a screen's one plain-words answer (Tonight's headline). */
  display: 'DMSerifDisplay_400Regular',
} as const;

/** Type size ladder, small to large. Prefer a named `textStyles` entry over a raw size. */
export const fontSize = {
  micro: 11,
  caption: 12,
  footnote: 13,
  subhead: 14,
  body: 15,
  callout: 16,
  headline: 17,
  title4: 18,
  title3: 20,
  title2: 22,
  title1: 24,
  metric: 26,
  stat: 28,
  screenTitle: 30,
  statLarge: 32,
  display: 34,
  hero1: 40,
  hero2: 44,
  hero3: 52,
  hero4: 72,
} as const;

/** Absolute line heights for multi-line text (React Native needs numbers). */
export const lineHeight = {
  caption: 16,
  footnote: 18,
  snug: 20,
  body: 22,
  relaxed: 24,
  title: 30,
  display: 34,
} as const;

/** Letter spacing: negative tightens big numbers and titles, positive opens up small caps. */
export const tracking = {
  hero: -3,
  display: -2,
  displaySmall: -1.5,
  tight: -1,
  title: -0.5,
  label: 0.5,
  overline: 1,
  wide: 3,
} as const;

const style = <T extends Record<string, TextStyle>>(s: T) => s;

/**
 * Named text styles, ready to spread into a StyleSheet: `{ ...textStyles.body, color: colors.textMuted }`.
 * Colors stay at the call site (they are roles from `colors`).
 */
export const textStyles = style({
  screenTitle: { fontSize: fontSize.screenTitle, fontFamily: fonts.bold, letterSpacing: tracking.title },
  sheetTitle: { fontSize: fontSize.title2, fontFamily: fonts.bold },
  /** A panel's own heading ("What's up tonight"). */
  panelTitle: { fontSize: fontSize.title3, fontFamily: fonts.bold },
  /** The plain answer at the top of a screen ("Clear and dark from 22:10 to 03:40"). */
  heroHeadline: { fontSize: fontSize.statLarge, fontFamily: fonts.display, lineHeight: lineHeight.display },
  /** A big score inside a dial. */
  scoreValue: { fontSize: fontSize.hero2, fontFamily: fonts.bold, letterSpacing: tracking.displaySmall },
  sectionTitle: { fontSize: fontSize.title4, fontFamily: fonts.bold },
  cardTitle: { fontSize: fontSize.headline, fontFamily: fonts.bold },
  /** Small-caps section label above a card's content ("SOLAR WIND"). */
  overline: {
    fontSize: fontSize.caption,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: tracking.overline,
  },
  metricLabel: {
    fontSize: fontSize.caption,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: tracking.label,
  },
  metric: { fontSize: fontSize.metric, fontFamily: fonts.bold },
  bodyLarge: { fontSize: fontSize.callout, fontFamily: fonts.regular, lineHeight: lineHeight.relaxed },
  body: { fontSize: fontSize.body, fontFamily: fonts.regular },
  bodyStrong: { fontSize: fontSize.body, fontFamily: fonts.medium },
  subtitle: { fontSize: fontSize.subhead, fontFamily: fonts.regular },
  footnote: { fontSize: fontSize.footnote, fontFamily: fonts.regular },
  footnoteStrong: { fontSize: fontSize.footnote, fontFamily: fonts.medium },
  /** Short status text in a pill or chip. */
  badge: { fontSize: fontSize.footnote, fontFamily: fonts.bold },
  caption: { fontSize: fontSize.caption, fontFamily: fonts.regular },
  micro: { fontSize: fontSize.micro, fontFamily: fonts.regular },
  buttonCompact: { fontSize: fontSize.body, fontFamily: fonts.bold },
  button: { fontSize: fontSize.callout, fontFamily: fonts.bold },
  buttonLarge: { fontSize: fontSize.headline, fontFamily: fonts.bold },
});
