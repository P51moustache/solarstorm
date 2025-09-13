export const COLORS = {
  bg: '#0B1020',
  text: '#E6ECFF',
  muted: '#9AA4C2',
  emerald: '#00D084',
  card: '#111833',
  border: '#1E2347',
  kpBands: [
    '#2DC937', // 0-1 (green)
    '#99C140', // 2-3 (yellow-green)
    '#E7B416', // 4-5 (yellow)
    '#DB7B2B', // 6-7 (orange)
    '#CC3232', // 8-9 (red)
  ],
  bz: {
    positive: '#00D084',
    negative: '#CC3232',
  },
  aurora: {
    low: '#004080',
    medium: '#00D084',
    high: '#E7B416',
    extreme: '#CC3232',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  tile: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

export function getKpColor(kp: number): string {
  if (kp <= 1) return COLORS.kpBands[0];
  if (kp <= 3) return COLORS.kpBands[1];
  if (kp <= 5) return COLORS.kpBands[2];
  if (kp <= 7) return COLORS.kpBands[3];
  return COLORS.kpBands[4];
}

export function getAuroraChanceColor(chance: string): string {
  if (chance.includes('High')) return COLORS.aurora.high;
  if (chance.includes('Possible')) return COLORS.aurora.medium;
  return COLORS.aurora.low;
}
