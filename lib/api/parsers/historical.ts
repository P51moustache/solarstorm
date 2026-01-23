export interface HistoricalDataPoint {
  timestamp: string;
  kp: number | null;
  bz: number | null;
  speed: number | null;
  density: number | null;
}

export interface HistoricalSummary {
  data: HistoricalDataPoint[];
  stats: {
    avgKp: number;
    maxKp: number;
    avgBz: number;
    minBz: number;
    avgSpeed: number;
    maxSpeed: number;
    stormDays: number;
  };
}

interface RawKpDataPoint {
  time_tag: string;
  kp_index: number;
}

interface RawPlasmaDataPoint {
  time_tag: string;
  proton_speed: number;
  proton_density: number;
}

interface RawMagDataPoint {
  time_tag: string;
  bz_gsm: number;
}

export function parseHistoricalKp(data: unknown): Map<string, number> {
  const result = new Map<string, number>();

  if (!Array.isArray(data)) return result;

  for (const item of data) {
    if (
      item &&
      typeof item === 'object' &&
      'time_tag' in item &&
      'kp_index' in item
    ) {
      const point = item as RawKpDataPoint;
      const dateKey = point.time_tag.split('T')[0];
      const existing = result.get(dateKey);
      // Keep the max Kp for each day
      if (!existing || point.kp_index > existing) {
        result.set(dateKey, point.kp_index);
      }
    }
  }

  return result;
}

export function parseHistoricalPlasma(
  data: unknown
): Map<string, { speed: number; density: number }> {
  const result = new Map<string, { speed: number; density: number }>();

  if (!Array.isArray(data)) return result;

  const dayData = new Map<string, { speeds: number[]; densities: number[] }>();

  for (const item of data) {
    if (
      item &&
      typeof item === 'object' &&
      'time_tag' in item &&
      'proton_speed' in item
    ) {
      const point = item as RawPlasmaDataPoint;
      const dateKey = point.time_tag.split('T')[0];

      if (!dayData.has(dateKey)) {
        dayData.set(dateKey, { speeds: [], densities: [] });
      }

      const day = dayData.get(dateKey)!;
      if (point.proton_speed > 0) {
        day.speeds.push(point.proton_speed);
      }
      if (point.proton_density > 0) {
        day.densities.push(point.proton_density);
      }
    }
  }

  // Calculate daily averages
  for (const [date, values] of dayData) {
    const avgSpeed =
      values.speeds.length > 0
        ? values.speeds.reduce((a, b) => a + b, 0) / values.speeds.length
        : 0;
    const avgDensity =
      values.densities.length > 0
        ? values.densities.reduce((a, b) => a + b, 0) / values.densities.length
        : 0;
    result.set(date, { speed: avgSpeed, density: avgDensity });
  }

  return result;
}

export function parseHistoricalMag(data: unknown): Map<string, number> {
  const result = new Map<string, number>();

  if (!Array.isArray(data)) return result;

  const dayData = new Map<string, number[]>();

  for (const item of data) {
    if (item && typeof item === 'object' && 'time_tag' in item && 'bz_gsm' in item) {
      const point = item as RawMagDataPoint;
      const dateKey = point.time_tag.split('T')[0];

      if (!dayData.has(dateKey)) {
        dayData.set(dateKey, []);
      }

      dayData.get(dateKey)!.push(point.bz_gsm);
    }
  }

  // Calculate daily min Bz (most negative)
  for (const [date, values] of dayData) {
    result.set(date, Math.min(...values));
  }

  return result;
}

export function combineHistoricalData(
  kpData: Map<string, number>,
  plasmaData: Map<string, { speed: number; density: number }>,
  magData: Map<string, number>,
  days: number = 90
): HistoricalSummary {
  const now = new Date();
  const data: HistoricalDataPoint[] = [];

  let totalKp = 0,
    maxKp = 0,
    kpCount = 0;
  let totalBz = 0,
    minBz = 0,
    bzCount = 0;
  let totalSpeed = 0,
    maxSpeed = 0,
    speedCount = 0;
  let stormDays = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];

    const kp = kpData.get(dateKey) ?? null;
    const plasma = plasmaData.get(dateKey);
    const bz = magData.get(dateKey) ?? null;

    data.push({
      timestamp: dateKey,
      kp,
      bz,
      speed: plasma?.speed ?? null,
      density: plasma?.density ?? null,
    });

    // Stats
    if (kp !== null) {
      totalKp += kp;
      maxKp = Math.max(maxKp, kp);
      kpCount++;
      if (kp >= 5) stormDays++;
    }
    if (bz !== null) {
      totalBz += bz;
      minBz = Math.min(minBz, bz);
      bzCount++;
    }
    if (plasma?.speed) {
      totalSpeed += plasma.speed;
      maxSpeed = Math.max(maxSpeed, plasma.speed);
      speedCount++;
    }
  }

  return {
    data,
    stats: {
      avgKp: kpCount > 0 ? Math.round((totalKp / kpCount) * 10) / 10 : 0,
      maxKp,
      avgBz: bzCount > 0 ? Math.round((totalBz / bzCount) * 10) / 10 : 0,
      minBz: Math.round(minBz * 10) / 10,
      avgSpeed: speedCount > 0 ? Math.round(totalSpeed / speedCount) : 0,
      maxSpeed: Math.round(maxSpeed),
      stormDays,
    },
  };
}
