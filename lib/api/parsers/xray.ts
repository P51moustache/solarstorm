export interface XrayFlux {
  timestamp: string;
  shortWave: number; // 0.05-0.4 nm
  longWave: number;  // 0.1-0.8 nm
}

export interface RScaleLevel {
  scale: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  description: string;
  hfImpact: string;
  color: string;
}

export function parseXrayData(data: unknown): XrayFlux | null {
  if (!Array.isArray(data) || data.length < 2) return null;

  // SWPC X-ray data format: [time_tag, satellite, current_class, ...]
  const latest = data[data.length - 1];

  if (!latest || typeof latest !== 'object') return null;

  const latestObj = latest as Record<string, unknown>;

  return {
    timestamp: (latestObj.time_tag as string) || new Date().toISOString(),
    shortWave: parseFloat(String(latestObj.flux)) || 0,
    longWave: parseFloat(String(latestObj.flux)) || 0,
  };
}

export function getRadioBlackoutScale(flux: number): RScaleLevel {
  // Based on NOAA R-scale
  if (flux >= 1e-3) {
    return {
      scale: 'R5',
      description: 'Extreme',
      hfImpact: 'Complete HF blackout on daylit side for hours',
      color: '#dc2626',
    };
  } else if (flux >= 1e-4) {
    return {
      scale: 'R4',
      description: 'Severe',
      hfImpact: 'HF blackout on daylit side for 1-2 hours',
      color: '#ea580c',
    };
  } else if (flux >= 1e-5) {
    return {
      scale: 'R3',
      description: 'Strong',
      hfImpact: 'Wide area HF blackout for about an hour',
      color: '#f59e0b',
    };
  } else if (flux >= 1e-6) {
    return {
      scale: 'R2',
      description: 'Moderate',
      hfImpact: 'Limited HF blackout on sunlit side',
      color: '#fbbf24',
    };
  } else if (flux >= 1e-7) {
    return {
      scale: 'R1',
      description: 'Minor',
      hfImpact: 'Minor degradation of HF signals',
      color: '#84cc16',
    };
  }

  return {
    scale: 'R0',
    description: 'None',
    hfImpact: 'No impact on HF propagation',
    color: '#22c55e',
  };
}

export function getBandUsability(kp: number, rScale: RScaleLevel['scale']): Record<string, 'good' | 'fair' | 'poor'> {
  // Simplified HF band usability based on Kp and R-scale
  const rScaleImpact = ['R0', 'R1'].includes(rScale) ? 0 :
                       ['R2', 'R3'].includes(rScale) ? 1 : 2;

  const kpImpact = kp < 4 ? 0 : kp < 6 ? 1 : 2;

  const totalImpact = Math.max(rScaleImpact, kpImpact);

  if (totalImpact === 0) {
    return {
      '160m': 'good',
      '80m': 'good',
      '40m': 'good',
      '20m': 'good',
      '15m': 'fair',
      '10m': 'fair',
      '6m': 'poor',
    };
  } else if (totalImpact === 1) {
    return {
      '160m': 'fair',
      '80m': 'fair',
      '40m': 'good',
      '20m': 'fair',
      '15m': 'poor',
      '10m': 'poor',
      '6m': 'poor',
    };
  }

  return {
    '160m': 'poor',
    '80m': 'poor',
    '40m': 'fair',
    '20m': 'poor',
    '15m': 'poor',
    '10m': 'poor',
    '6m': 'poor',
  };
}
