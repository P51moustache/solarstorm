/**
 * Raw color ramps. PRIVATE: only `colors.ts` imports this file (enforced by ESLint).
 * Screens and components name a role from `colors`, never a ramp value.
 */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',
  /** Night-sky neutrals, darkest first. */
  ink: {
    950: '#05060A',
    900: '#0E1119',
    850: '#11151F',
    800: '#161A24',
    700: '#222838',
    600: '#2E3135',
  },
  /** Cool greys for text on the night sky. */
  mist: {
    50: '#F3F5FA',
    300: '#9AA3B4',
    500: '#5C6678',
  },
  blue: { 300: '#5C8CFF', 400: '#4C8DFF', 600: '#3E6FD0', 800: '#274B86', 900: '#1B2A4A', 950: '#16324F' },
  navy: { 900: '#0A1430', 950: '#070A1A' },
  green: { 200: '#7CEFC0', 300: '#7FD17F', 400: '#00E08A', 450: '#19D98A', 500: '#2ECC71', 550: '#27C77A', 600: '#27AE60', 700: '#2E9E66', 800: '#1F8A5B' },
  yellow: { 400: '#F1C40F' },
  orange: { 400: '#FF9F43' },
  red: { 300: '#FF6B5B', 500: '#E74C3C', 700: '#C03A2B' },
  violet: { 400: '#A86BFF', 500: '#7A5CFF' },
  pink: { 400: '#FF4D8D' },
  /** Horizon glow after sunset, brightest first. */
  dusk: { 300: '#E58BB8', 500: '#9A63B0', 700: '#4A3470', 900: '#221B45' },
  /** Mountain and shoreline greys under a night sky, lightest first. */
  slate: { 100: '#D9DFEE', 400: '#6E7494', 700: '#2C2F4C', 800: '#1E2038', 900: '#12142A', 950: '#0A0B1C' },
  teal: { 300: '#5FE6CF' },
} as const;

/** Applies an alpha (0-1) to a #RRGGBB ramp value. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
