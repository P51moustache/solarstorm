import { z } from 'zod';

export const SwpcAlertSchema = z.object({
  issue_datetime: z.string(),
  message: z.string(),
});

export type SwpcAlert = z.infer<typeof SwpcAlertSchema>;

const GEOMAGNETIC_STORM_LEVELS = ['G1', 'G2', 'G3', 'G4', 'G5'];
const K_INDEX_ALERT_PATTERNS = [
  'GEOMAGNETIC K-INDEX', 
  'K-INDEX OF', 
  'ALERT: GEOMAGNETIC K-INDEX',
  'WARNING: GEOMAGNETIC K-INDEX'
];

export function parseAlertsData(data: unknown[]): SwpcAlert[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const results: SwpcAlert[] = [];

  for (const item of data) {
    try {
      const parsed = SwpcAlertSchema.parse(item);
      
      // Filter for geomagnetic storm alerts and K-index alerts
      const message = parsed.message.toUpperCase();
      const hasGeomagneticAlert = GEOMAGNETIC_STORM_LEVELS.some(level => 
        message.includes(level)
      );
      const hasKIndexAlert = K_INDEX_ALERT_PATTERNS.some(pattern => 
        message.includes(pattern)
      );

      if (hasGeomagneticAlert || hasKIndexAlert) {
        results.push(parsed);
      }
    } catch (error) {
      // Skip invalid entries
      continue;
    }
  }

  // Sort by issue time (newest first)
  results.sort((a, b) => 
    new Date(b.issue_datetime).getTime() - new Date(a.issue_datetime).getTime()
  );

  return results;
}

export function getAlertLevel(message: string): string | null {
  const upperMessage = message.toUpperCase();
  
  // Check for G-scale storm levels first (highest priority)
  for (const level of GEOMAGNETIC_STORM_LEVELS.reverse()) { // Check highest first
    if (upperMessage.includes(level)) {
      return level;
    }
  }
  
  // Check for K-index alerts
  if (upperMessage.includes('K-INDEX OF 6') || upperMessage.includes('GEOMAGNETIC K-INDEX OF 6')) {
    return 'G2'; // K6 corresponds to G2 moderate storm
  }
  if (upperMessage.includes('K-INDEX OF 5') || upperMessage.includes('GEOMAGNETIC K-INDEX OF 5')) {
    return 'G1'; // K5 corresponds to G1 minor storm
  }
  if (upperMessage.includes('K-INDEX OF 4') || upperMessage.includes('GEOMAGNETIC K-INDEX OF 4')) {
    return 'K4'; // Active conditions (not storm level but significant)
  }
  
  return null;
}

export function isRecentAlert(alert: SwpcAlert, hoursAgo: number = 24): boolean {
  const alertTime = new Date(alert.issue_datetime);
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return alertTime > cutoff;
}
