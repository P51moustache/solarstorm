import { supabase } from '../supabase/client';
import {
  calculateConstellationHealth,
  assessOverallGnssStatus,
  getMultiConstellationImpact,
  type AllConstellationsStatus,
  type ConstellationHealth,
} from './parsers/gnssConstellation';
import type { GnssConstellation } from '../supabase/types';

// Fetch latest constellation status from database
// (Populated by background job that monitors IGS/MGEX/NANUs)
export async function getConstellationStatus(): Promise<AllConstellationsStatus> {
  const { data, error } = await supabase
    .from('gnss_constellation_status')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(4);

  if (error) {
    console.error('Failed to fetch constellation status:', error);
    // Return default operational status
    return getDefaultStatus();
  }

  // Group by constellation, take latest for each
  const byConstellation: Partial<Record<GnssConstellation, ConstellationHealth>> = {};

  for (const row of data || []) {
    if (!byConstellation[row.constellation as GnssConstellation]) {
      byConstellation[row.constellation as GnssConstellation] = calculateConstellationHealth(
        row.constellation as GnssConstellation,
        row.healthy_count,
        row.unhealthy_count,
        row.degraded_count,
        row.notes
      );
    }
  }

  // Ensure all constellations have data
  const gps = byConstellation.GPS || getDefaultConstellationHealth('GPS');
  const glonass = byConstellation.GLONASS || getDefaultConstellationHealth('GLONASS');
  const galileo = byConstellation.Galileo || getDefaultConstellationHealth('Galileo');
  const beidou = byConstellation.BeiDou || getDefaultConstellationHealth('BeiDou');

  const statuses = [gps, glonass, galileo, beidou];

  return {
    gps,
    glonass,
    galileo,
    beidou,
    overallStatus: assessOverallGnssStatus(statuses),
    updatedAt: new Date().toISOString(),
  };
}

function getDefaultConstellationHealth(constellation: GnssConstellation): ConstellationHealth {
  // Assume nominal operation if no data
  const nominalHealthy: Record<GnssConstellation, number> = {
    GPS: 31,
    GLONASS: 23,
    Galileo: 28,
    BeiDou: 44,
  };

  return calculateConstellationHealth(constellation, nominalHealthy[constellation], 0, 1);
}

function getDefaultStatus(): AllConstellationsStatus {
  const gps = getDefaultConstellationHealth('GPS');
  const glonass = getDefaultConstellationHealth('GLONASS');
  const galileo = getDefaultConstellationHealth('Galileo');
  const beidou = getDefaultConstellationHealth('BeiDou');

  return {
    gps,
    glonass,
    galileo,
    beidou,
    overallStatus: 'operational',
    updatedAt: new Date().toISOString(),
  };
}

export { getMultiConstellationImpact };
