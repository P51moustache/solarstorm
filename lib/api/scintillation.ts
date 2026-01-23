import {
  getScintillationSeverity,
  predictScintillationRisk,
  type ScintillationCondition,
  type ScintillationSeverity,
} from './parsers/scintillation';

export interface ScintillationStatus {
  current: ScintillationCondition;
  forecast: {
    equatorialRisk: ScintillationSeverity;
    auroralRisk: ScintillationSeverity;
    description: string;
  };
  updatedAt: string;
}

export async function getScintillationStatus(
  lat: number,
  lng: number,
  kp: number
): Promise<ScintillationStatus> {
  // Get local hour for the location
  const now = new Date();
  const utcHour = now.getUTCHours();
  const lngOffset = Math.round(lng / 15); // Approximate timezone from longitude
  const localHour = (utcHour + lngOffset + 24) % 24;
  const month = now.getMonth() + 1;

  // For now, we don't have real-time scintillation data
  // So we use the forecast based on Kp and location
  const forecast = predictScintillationRisk(kp, lat, localHour, month);

  // Estimate current S4 from the forecast risk
  const riskToS4: Record<ScintillationSeverity, number> = {
    none: 0.05,
    weak: 0.15,
    moderate: 0.4,
    strong: 0.7,
    severe: 1.2,
  };

  const dominantRisk = forecast.auroralRisk !== 'none' ? forecast.auroralRisk : forecast.equatorialRisk;
  const estimatedS4 = riskToS4[dominantRisk];

  return {
    current: getScintillationSeverity(estimatedS4),
    forecast,
    updatedAt: now.toISOString(),
  };
}

// Get scintillation alerts for multiple regions
export async function getScintillationAlerts(
  regions: Array<{ lat: number; lng: number; label: string }>,
  kp: number
): Promise<Array<{ region: string; status: ScintillationStatus }>> {
  const alerts = await Promise.all(
    regions.map(async (region) => ({
      region: region.label,
      status: await getScintillationStatus(region.lat, region.lng, kp),
    }))
  );

  return alerts;
}
