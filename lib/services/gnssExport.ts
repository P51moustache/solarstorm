import { supabase } from '@/lib/supabase/client';

export interface GnssExportOptions {
  startDate: Date;
  endDate: Date;
  dataTypes: ('tec' | 'scintillation' | 'constellation')[];
  regionIds?: string[];
  format: 'json' | 'csv' | 'rinex-like';
}

export interface TecExportRecord {
  timestamp: string;
  regionName: string;
  latitude: number;
  longitude: number;
  tecValue: number;
  tecUnit: string;
  singleFreqErrorM: number;
  dualFreqErrorM: number;
}

export interface ScintillationExportRecord {
  timestamp: string;
  regionName: string;
  latitude: number;
  longitude: number;
  s4Index: number;
  sigmaPhiRad: number;
  riskLevel: string;
  lossOfLockProbability: number;
}

interface TecHistoryRow {
  recorded_at: string;
  tec_value: number;
  gnss_regions: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

interface ScintillationHistoryRow {
  recorded_at: string;
  s4_index: number;
  sigma_phi: number;
  risk_level: string;
  gnss_regions: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

export async function exportTecData(
  userId: string,
  options: GnssExportOptions
): Promise<TecExportRecord[]> {
  let query = supabase
    .from('tec_history')
    .select(`
      *,
      gnss_regions!inner (name, latitude, longitude)
    `)
    .gte('recorded_at', options.startDate.toISOString())
    .lte('recorded_at', options.endDate.toISOString());

  if (options.regionIds && options.regionIds.length > 0) {
    query = query.in('region_id', options.regionIds);
  }

  // Join with user's regions
  query = query.eq('gnss_regions.user_id', userId);

  const { data, error } = await query.order('recorded_at', { ascending: true });

  if (error) throw error;

  const rows = (data || []) as TecHistoryRow[];
  return rows.map(row => ({
    timestamp: row.recorded_at,
    regionName: row.gnss_regions.name,
    latitude: row.gnss_regions.latitude,
    longitude: row.gnss_regions.longitude,
    tecValue: row.tec_value,
    tecUnit: 'TECU',
    singleFreqErrorM: row.tec_value * 0.163, // L1 frequency
    dualFreqErrorM: row.tec_value * 0.01,    // Dual-frequency corrected
  }));
}

export async function exportScintillationData(
  userId: string,
  options: GnssExportOptions
): Promise<ScintillationExportRecord[]> {
  let query = supabase
    .from('scintillation_history')
    .select(`
      *,
      gnss_regions!inner (name, latitude, longitude)
    `)
    .gte('recorded_at', options.startDate.toISOString())
    .lte('recorded_at', options.endDate.toISOString());

  if (options.regionIds && options.regionIds.length > 0) {
    query = query.in('region_id', options.regionIds);
  }

  query = query.eq('gnss_regions.user_id', userId);

  const { data, error } = await query.order('recorded_at', { ascending: true });

  if (error) throw error;

  const rows = (data || []) as ScintillationHistoryRow[];
  return rows.map(row => {
    // Estimate loss of lock probability from S4 index
    let lossProb = 0;
    if (row.s4_index > 0.7) lossProb = 0.8;
    else if (row.s4_index > 0.5) lossProb = 0.4;
    else if (row.s4_index > 0.3) lossProb = 0.15;
    else if (row.s4_index > 0.2) lossProb = 0.05;

    return {
      timestamp: row.recorded_at,
      regionName: row.gnss_regions.name,
      latitude: row.gnss_regions.latitude,
      longitude: row.gnss_regions.longitude,
      s4Index: row.s4_index,
      sigmaPhiRad: row.sigma_phi,
      riskLevel: row.risk_level,
      lossOfLockProbability: lossProb,
    };
  });
}

export function formatAsCSV<T extends Record<string, unknown>>(data: T[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) {
        return `"${val}"`;
      }
      return String(val ?? '');
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// RINEX-like format for TEC data (simplified)
export function formatAsRinexLike(data: TecExportRecord[]): string {
  const lines: string[] = [
    'GNSS TEC EXPORT FILE',
    `GENERATED: ${new Date().toISOString()}`,
    'FORMAT: RINEX-LIKE IONOSPHERE',
    '',
    'EPOCH               LAT      LON      TEC(TECU)  ERR_L1(m)  ERR_DF(m)',
    '-'.repeat(72),
  ];

  for (const row of data) {
    const epoch = row.timestamp.replace('T', ' ').substring(0, 19);
    const lat = row.latitude.toFixed(4).padStart(8);
    const lon = row.longitude.toFixed(4).padStart(9);
    const tec = row.tecValue.toFixed(2).padStart(10);
    const errL1 = row.singleFreqErrorM.toFixed(3).padStart(10);
    const errDF = row.dualFreqErrorM.toFixed(3).padStart(10);
    lines.push(`${epoch} ${lat} ${lon} ${tec} ${errL1} ${errDF}`);
  }

  return lines.join('\n');
}
