import { z } from 'zod';

export const PlasmaRowSchema = z.array(z.string());

export type PlasmaPoint = {
  time_tag: string;
  speed: number | null;
  density: number | null;
};

export function parsePlasmaData(data: unknown[]): PlasmaPoint[] {
  if (!Array.isArray(data) || data.length < 2) {
    return [];
  }

  try {
    // First row should be headers
    const headers = PlasmaRowSchema.parse(data[0]);
    
    // Find column indices
    const timeIndex = headers.findIndex(h => h.toLowerCase().includes('time_tag'));
    const speedIndex = headers.findIndex(h => h.toLowerCase().includes('speed'));
    const densityIndex = headers.findIndex(h => h.toLowerCase().includes('density'));

    if (timeIndex === -1 || speedIndex === -1 || densityIndex === -1) {
      console.error('Required columns not found in plasma data');
      return [];
    }

    const results: PlasmaPoint[] = [];

    // Process data rows (skip header)
    for (let i = 1; i < data.length; i++) {
      try {
        const row = PlasmaRowSchema.parse(data[i]);
        
        if (row.length > Math.max(timeIndex, speedIndex, densityIndex)) {
          const timeTag = row[timeIndex];
          const speedStr = row[speedIndex];
          const densityStr = row[densityIndex];

          // Parse numbers, handle null/undefined values
          const speed = speedStr && speedStr !== '' && speedStr !== 'null' ? parseFloat(speedStr) : null;
          const density = densityStr && densityStr !== '' && densityStr !== 'null' ? parseFloat(densityStr) : null;

          if (timeTag) {
            results.push({
              time_tag: timeTag,
              speed: isNaN(speed as number) ? null : speed,
              density: isNaN(density as number) ? null : density,
            });
          }
        }
      } catch (error) {
        // Skip invalid rows
        continue;
      }
    }

    // Sort by time
    results.sort((a, b) => new Date(a.time_tag).getTime() - new Date(b.time_tag).getTime());

    return results;
  } catch (error) {
    console.error('Failed to parse plasma data:', error);
    return [];
  }
}
