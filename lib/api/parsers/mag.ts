import { z } from 'zod';

export const MagRowSchema = z.array(z.string());

export type MagPoint = {
  time_tag: string;
  bz: number | null;
  bt?: number | null;
};

export function parseMagData(data: unknown[]): MagPoint[] {
  if (!Array.isArray(data) || data.length < 2) {
    return [];
  }

  try {
    // First row should be headers
    const headers = MagRowSchema.parse(data[0]);
    
    // Find column indices
    const timeIndex = headers.findIndex(h => h.toLowerCase().includes('time_tag'));
    const bzIndex = headers.findIndex(h => h.toLowerCase().includes('bz_gsm') || h.toLowerCase() === 'bz');
    const btIndex = headers.findIndex(h => h.toLowerCase().includes('bt'));

    if (timeIndex === -1 || bzIndex === -1) {
      console.error('Required columns not found in mag data');
      return [];
    }

    const results: MagPoint[] = [];

    // Process data rows (skip header)
    for (let i = 1; i < data.length; i++) {
      try {
        const row = MagRowSchema.parse(data[i]);
        
        if (row.length > Math.max(timeIndex, bzIndex)) {
          const timeTag = row[timeIndex];
          const bzStr = row[bzIndex];
          const btStr = btIndex >= 0 ? row[btIndex] : undefined;

          // Parse numbers, handle null/undefined values
          const bz = bzStr && bzStr !== '' && bzStr !== 'null' ? parseFloat(bzStr) : null;
          const bt = btStr && btStr !== '' && btStr !== 'null' ? parseFloat(btStr) : null;

          // Only include rows with a valid Bz value
          if (timeTag && bz !== null && !Number.isNaN(bz)) {
            results.push({
              time_tag: timeTag,
              bz,
              bt: bt === null || Number.isNaN(bt) ? null : bt,
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
    console.error('Failed to parse mag data:', error);
    return [];
  }
}
