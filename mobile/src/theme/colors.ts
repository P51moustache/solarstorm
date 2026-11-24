import { palette, withAlpha } from './palette';

/**
 * Color roles: what each color is FOR. SolarStorm is dark-only (app.json
 * userInterfaceStyle "dark"), so there is one scheme and roles are static.
 * Adding a light scheme: make this a `darkColors`/`lightColors` pair with the
 * same keys and return one from a `useTheme()` hook.
 */
export const colors = {
  // Surfaces, back to front
  background: palette.ink[950],
  surface: palette.ink[900],
  surfaceRaised: palette.ink[800],
  /** Sheets, popovers and chart tooltips that float over content. */
  surfaceFloating: palette.ink[850],
  surfaceFloatingTranslucent: withAlpha(palette.ink[850], 0.96),
  /** Frosted glass card fill over the aurora backdrop. */
  glass: withAlpha(palette.ink[900], 0.35),
  /** Behind live imagery (the Sun camera). */
  media: palette.black,
  /** Inactive dot / track on the dark sky. */
  inactive: palette.ink[600],

  // Lines
  border: palette.ink[700],
  borderSubtle: withAlpha(palette.white, 0.08),
  glassBorder: withAlpha(palette.white, 0.12),
  borderStrong: withAlpha(palette.white, 0.15),

  // Translucent fills over glass
  fillSubtle: withAlpha(palette.white, 0.04),
  fill: withAlpha(palette.white, 0.07),
  /** Dark chip behind a status pill. */
  fillShade: withAlpha(palette.black, 0.25),
  scrim: withAlpha(palette.black, 0.6),
  /** Bottom veil that settles the aurora behind content. */
  backdropVeil: withAlpha(palette.ink[950], 0.55),
  shadow: palette.black,

  /** The selected tab's icon and label. */
  tabActive: palette.teal[300],

  // Text
  text: palette.mist[50],
  textMuted: palette.mist[300],
  textFaint: palette.mist[500],
  /** Text and icons on an accent fill. */
  onAccent: palette.white,

  // Accent and status
  accent: palette.blue[400],
  good: palette.green[500],
  warn: palette.yellow[400],
  danger: palette.red[300],

  /** NOAA storm severity ramp, quiet to extreme (Kp, R/S/G scales, flares, aurora odds). */
  severity: {
    quiet: palette.green[600],
    calm: palette.green[500],
    active: palette.green[300],
    minor: palette.yellow[400],
    moderate: palette.orange[400],
    strong: palette.red[300],
    severe: palette.red[500],
    extreme: palette.red[700],
  },

  /** Aurora hues: the living backdrop, sky moods and topic icons. */
  aurora: {
    stars: palette.white,
    nightTop: palette.navy[900],
    nightMid: palette.navy[950],
    mint: palette.green[200],
    green: palette.green[450],
    greenBright: palette.green[400],
    greenSoft: palette.green[550],
    greenDim: palette.green[700],
    greenDeep: palette.green[800],
    blue: palette.blue[300],
    blueSoft: palette.blue[600],
    blueDim: palette.blue[800],
    blueDeep: palette.blue[900],
    teal: palette.blue[950],
    violet: palette.violet[400],
    violetDeep: palette.violet[500],
    pink: palette.pink[400],
    orange: palette.orange[400],
    red: palette.red[500],
    coral: palette.red[300],
  },

  /** Tonight: the horizon art, the sky score and the best window. */
  night: {
    /** Page colour the painted horizon art fades into. */
    skyTop: palette.navy[950],
    /** The same, fully clear: the top of that fade. */
    fadeFrom: withAlpha(palette.navy[950], 0),
    /** Violet-tinted glass of Tonight's cards, its rim and the glow behind it. */
    glass: withAlpha(palette.dusk[900], 0.55),
    glassBorder: withAlpha(palette.white, 0.16),
    glassGlow: palette.violet[400],
    /** Dark face inside the sky score dial. */
    ringFace: withAlpha(palette.navy[950], 0.55),
    scoreFrom: palette.teal[300],
    scoreTo: palette.violet[400],
    /** Outline, fill and glow of the best window in the hour strip. */
    window: palette.teal[300],
    windowFill: withAlpha(palette.teal[300], 0.1),
    /** Lit part of the Moon bar and the darkness line. */
    moon: palette.teal[300],
    darknessLine: withAlpha(palette.teal[300], 0.6),
    /** The brand star. */
    star: palette.violet[400],
  },
} as const;
