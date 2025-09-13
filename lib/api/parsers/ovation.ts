import { z } from 'zod';

export const OvationCellSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  prob: z.number(),
});

export type OvationCell = z.infer<typeof OvationCellSchema>;

export type OvationPayload = {
  updated: string;
  cells: OvationCell[];
};

export function parseOvationData(data: unknown): OvationPayload | null {
  try {
    // The OVATION data structure can vary, so we need to be flexible
    if (typeof data !== 'object' || data === null) {
      return null;
    }

    const dataObj = data as any;
    
    // Try to find the updated timestamp
    let updated = new Date().toISOString();
    if (dataObj.forecast_time || dataObj.observation_time || dataObj.updated) {
      updated = dataObj.forecast_time || dataObj.observation_time || dataObj.updated;
    }

    // Try to find the aurora probability data
    let cells: OvationCell[] = [];

    // Look for various possible data structures
    if (Array.isArray(dataObj.coordinates)) {
      // Format A: array of coordinate objects with {lat, lon, aurora|prob}
      const coords = dataObj.coordinates as any[];
      for (const coord of coords) {
        try {
          if (coord && typeof coord === 'object' && (coord.lat !== undefined && coord.lon !== undefined)) {
            const rawProb = coord.prob ?? coord.aurora ?? coord.probability ?? 0;
            const probVal = Number(rawProb);
            const prob = probVal <= 1 ? probVal * 100 : probVal; // normalize 0-1 to 0-100
            cells.push({ lat: Number(coord.lat), lon: Number(coord.lon), prob });
          } else if (Array.isArray(coord) && coord.length >= 3) {
            // Format B: coordinates as tuples, uncertain order: [lat, lon, prob] OR [lon, lat, prob]
            const a = Number(coord[0]);
            const b = Number(coord[1]);
            const p = Number(coord[2]);
            if ([a, b, p].every(n => Number.isFinite(n))) {
              const latFirst = Math.abs(a) <= 90 && Math.abs(b) <= 180;
              const lonFirst = Math.abs(a) <= 180 && Math.abs(b) <= 90;
              const useLatFirst = latFirst && !lonFirst ? true : lonFirst && !latFirst ? false : false; // prefer lon-first when ambiguous
              const lat = useLatFirst ? a : b;
              const lon = useLatFirst ? b : a;
              const prob = p <= 1 ? p * 100 : p;
              cells.push({ lat, lon, prob });
            }
          }
        } catch (error) {
          continue;
        }
      }
    } else if (Array.isArray(dataObj.data)) {
      // Format: array of data points
      for (const point of dataObj.data) {
        try {
          if (Array.isArray(point) && point.length >= 3) {
            // Format: [lat, lon, prob]
            const a = Number(point[0]);
            const b = Number(point[1]);
            const p = Number(point[2]);
            if ([a, b, p].every(n => Number.isFinite(n))) {
              const latFirst = Math.abs(a) <= 90 && Math.abs(b) <= 180;
              const lonFirst = Math.abs(a) <= 180 && Math.abs(b) <= 90;
              const useLatFirst = latFirst && !lonFirst ? true : lonFirst && !latFirst ? false : false; // prefer lon-first when ambiguous
              const lat = useLatFirst ? a : b;
              const lon = useLatFirst ? b : a;
              const prob = p <= 1 ? p * 100 : p;
              cells.push({ lat, lon, prob });
            }
          } else if (point.lat !== undefined && point.lon !== undefined) {
            cells.push({
              lat: Number(point.lat),
              lon: Number(point.lon),
              prob: Number(point.prob || point.aurora || point.probability || 0) <= 1
                ? Number(point.prob || point.aurora || point.probability || 0) * 100
                : Number(point.prob || point.aurora || point.probability || 0),
            });
          }
        } catch (error) {
          continue;
        }
      }
    } else if (dataObj.Forecast) {
      // Sometimes the data is nested under a "Forecast" key
      return parseOvationData(dataObj.Forecast);
    }

    // Filter out invalid cells and normalize probabilities
    cells = cells.filter(cell => 
      !isNaN(cell.lat) && 
      !isNaN(cell.lon) && 
      !isNaN(cell.prob) &&
      cell.lat >= -90 && cell.lat <= 90 &&
      cell.lon >= -180 && cell.lon <= 180
    ).map(cell => ({
      ...cell,
      prob: Math.max(0, Math.min(100, cell.prob)), // Clamp to 0-100
    }));

    return {
      updated,
      cells,
    };
  } catch (error) {
    console.error('Failed to parse OVATION data:', error);
    return null;
  }
}

// Generate a simplified test dataset if needed
export function generateTestOvationData(): OvationPayload {
  const cells: OvationCell[] = [];
  
  // Generate some aurora probability data for northern regions
  for (let lat = 50; lat <= 80; lat += 2) {
    for (let lon = -180; lon <= 180; lon += 5) {
      // Higher probability at higher latitudes
      const baseProb = Math.max(0, (lat - 45) / 35 * 60);
      const noise = (Math.random() - 0.5) * 30;
      const prob = Math.max(0, Math.min(100, baseProb + noise));
      
      if (prob > 5) { // Only include cells with meaningful probability
        cells.push({ lat, lon, prob });
      }
    }
  }

  return {
    updated: new Date().toISOString(),
    cells,
  };
}
