export interface SolarFluxData {
  timestamp: string;
  f107: number; // 10.7 cm radio flux (solar flux units, sfu)
  sunspotNumber?: number;
}

export interface SfiTrend {
  current: number;
  trend: 'rising' | 'falling' | 'stable';
  average30day: number;
  history: SolarFluxData[];
}

export function parseSolarFluxData(data: unknown): SolarFluxData[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .map((item) => ({
      timestamp: String(item.time_tag || ''),
      f107: parseFloat(String(item.flux || '0')),
    }))
    .filter((item) => item.f107 > 0);
}

export function calculateSfiTrend(data: SolarFluxData[]): SfiTrend | null {
  if (data.length < 2) return null;

  const sorted = [...data].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const current = sorted[0].f107;
  const previous = sorted[1].f107;
  const last30 = sorted.slice(0, 30);
  const average30day = last30.reduce((sum, d) => sum + d.f107, 0) / last30.length;

  let trend: 'rising' | 'falling' | 'stable';
  const diff = current - previous;
  if (diff > 5) trend = 'rising';
  else if (diff < -5) trend = 'falling';
  else trend = 'stable';

  return {
    current,
    trend,
    average30day: Math.round(average30day),
    history: sorted.slice(0, 90), // Last 90 days
  };
}

export function getSfiCondition(f107: number): {
  label: string;
  color: string;
  hfImpact: string;
} {
  if (f107 >= 150) {
    return {
      label: 'High',
      color: '#22c55e',
      hfImpact: 'Excellent HF propagation, 10m/6m openings likely',
    };
  } else if (f107 >= 100) {
    return {
      label: 'Moderate',
      color: '#eab308',
      hfImpact: 'Good HF propagation, higher bands improving',
    };
  } else if (f107 >= 70) {
    return {
      label: 'Low',
      color: '#f97316',
      hfImpact: 'Fair HF propagation, focus on lower bands',
    };
  }
  return {
    label: 'Very Low',
    color: '#ef4444',
    hfImpact: 'Poor HF propagation, solar minimum conditions',
  };
}
