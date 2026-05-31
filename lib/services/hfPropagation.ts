/**
 * HF Radio Propagation Service
 * Calculates propagation conditions for amateur radio bands based on space weather data
 */

export type BandStatus = 'open' | 'marginal' | 'closed';

export interface HfBand {
  name: string;
  frequency: string;
  wavelength: string;
  status: BandStatus;
  muf: number; // Maximum Usable Frequency in MHz
  description: string;
}

export interface HfPropagationData {
  bands: HfBand[];
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  sfi: number;
  kp: number;
  aIndex: number;
  noiseLevel: 'low' | 'moderate' | 'high';
  updatedAt: string;
  daylight: {
    sunrise: string;
    sunset: string;
    isDaytime: boolean;
  };
}

export interface PropagationZone {
  region: string;
  lat: number;
  lng: number;
  muf: number;
  fof2: number; // Critical frequency
  condition: BandStatus;
}

// Standard amateur radio HF bands
const HF_BANDS = [
  { name: '160m', frequency: '1.8-2.0', wavelength: '160', baseMhz: 1.9 },
  { name: '80m', frequency: '3.5-4.0', wavelength: '80', baseMhz: 3.75 },
  { name: '40m', frequency: '7.0-7.3', wavelength: '40', baseMhz: 7.15 },
  { name: '30m', frequency: '10.1-10.15', wavelength: '30', baseMhz: 10.125 },
  { name: '20m', frequency: '14.0-14.35', wavelength: '20', baseMhz: 14.175 },
  { name: '17m', frequency: '18.068-18.168', wavelength: '17', baseMhz: 18.118 },
  { name: '15m', frequency: '21.0-21.45', wavelength: '15', baseMhz: 21.225 },
  { name: '12m', frequency: '24.89-24.99', wavelength: '12', baseMhz: 24.94 },
  { name: '10m', frequency: '28.0-29.7', wavelength: '10', baseMhz: 28.85 },
];

/**
 * Calculate Maximum Usable Frequency based on SFI and time of day
 * Simplified model - real calculations would use ray tracing through ionosphere
 */
function calculateMuf(sfi: number, isDaytime: boolean, latitude: number = 45): number {
  // Base MUF from SFI (simplified relationship)
  // Higher SFI = more ionization = higher MUF
  const baseMuf = 5 + (sfi / 10);

  // Daytime has higher MUF due to solar ionization
  const timeMultiplier = isDaytime ? 1.4 : 0.6;

  // Latitude affects MUF - equatorial regions have higher MUF
  const latitudeMultiplier = 1 + (0.3 * (1 - Math.abs(latitude) / 90));

  return baseMuf * timeMultiplier * latitudeMultiplier;
}

/**
 * Calculate absorption based on Kp index
 * Higher Kp = more geomagnetic disturbance = more signal absorption
 */
function calculateAbsorption(kp: number): number {
  // Returns absorption factor 0-1 (1 = no absorption, 0 = complete absorption)
  if (kp >= 7) return 0.2; // Severe storm
  if (kp >= 5) return 0.5; // Minor storm
  if (kp >= 4) return 0.7; // Unsettled
  if (kp >= 2) return 0.9; // Quiet
  return 1.0; // Very quiet
}

/**
 * Determine band status based on MUF and absorption
 */
function getBandStatus(bandMhz: number, muf: number, absorption: number): BandStatus {
  const effectiveMuf = muf * absorption;

  if (bandMhz > effectiveMuf * 0.9) return 'closed';
  if (bandMhz > effectiveMuf * 0.6) return 'marginal';
  return 'open';
}

/**
 * Get description for band based on status and conditions
 */
function getBandDescription(band: typeof HF_BANDS[0], status: BandStatus, isDaytime: boolean): string {
  if (status === 'closed') {
    return isDaytime
      ? 'Band closed - SFI too low for ionospheric support'
      : 'Band closed - nighttime absorption too high';
  }

  if (status === 'marginal') {
    return 'Marginal conditions - short skip possible, long-range unreliable';
  }

  // Open
  if (band.baseMhz >= 21) {
    return 'Band open - excellent DX conditions, work all continents';
  }
  if (band.baseMhz >= 14) {
    return 'Band open - reliable worldwide propagation';
  }
  if (band.baseMhz >= 7) {
    return isDaytime
      ? 'Band open - regional to continental propagation'
      : 'Band open - excellent nighttime DX conditions';
  }
  return isDaytime
    ? 'Band open - short-range NVIS propagation'
    : 'Band open - regional night propagation';
}

/**
 * Calculate overall propagation condition
 */
function getOverallCondition(
  sfi: number,
  kp: number,
  openBands: number
): HfPropagationData['overallCondition'] {
  if (sfi >= 150 && kp <= 3 && openBands >= 7) return 'excellent';
  if (sfi >= 100 && kp <= 5 && openBands >= 5) return 'good';
  if (sfi >= 70 && kp <= 6 && openBands >= 3) return 'fair';
  return 'poor';
}

/**
 * Calculate noise level based on conditions
 */
function getNoiseLevel(kp: number, sfi: number): HfPropagationData['noiseLevel'] {
  if (kp >= 5 || sfi >= 180) return 'high';
  if (kp >= 3 || sfi >= 120) return 'moderate';
  return 'low';
}

/**
 * Calculate approximate sunrise/sunset for a location
 * Simplified calculation - doesn't account for atmospheric refraction
 */
function getDaylightInfo(latitude: number = 45): HfPropagationData['daylight'] {
  const now = new Date();
  const hours = now.getUTCHours() + now.getUTCMinutes() / 60;

  // Approximate day length based on latitude and time of year
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

  // Hour angle at sunrise/sunset
  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;

  // Clamp the acos argument to [-1, 1] to handle polar day/night
  const cosHourAngle = -Math.tan(latRad) * Math.tan(decRad);

  // Handle polar regions
  if (cosHourAngle <= -1) {
    // Polar day - sun never sets
    return {
      sunrise: '00:00 UTC',
      sunset: '24:00 UTC',
      isDaytime: true,
    };
  }
  if (cosHourAngle >= 1) {
    // Polar night - sun never rises
    return {
      sunrise: 'N/A',
      sunset: 'N/A',
      isDaytime: false,
    };
  }

  const hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI / 15;

  const solarNoon = 12;
  const sunrise = solarNoon - hourAngle;
  const sunset = solarNoon + hourAngle;

  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const minutes = Math.round((h - hrs) * 60);
    return `${hrs.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} UTC`;
  };

  return {
    sunrise: formatTime(sunrise),
    sunset: formatTime(sunset),
    isDaytime: hours >= sunrise && hours <= sunset,
  };
}

/**
 * Main function to calculate HF propagation conditions
 */
export function calculateHfPropagation(
  sfi: number,
  kp: number,
  latitude: number = 45
): HfPropagationData {
  const daylight = getDaylightInfo(latitude);
  const muf = calculateMuf(sfi, daylight.isDaytime, latitude);
  const absorption = calculateAbsorption(kp);

  const bands: HfBand[] = HF_BANDS.map(band => {
    const status = getBandStatus(band.baseMhz, muf, absorption);
    return {
      name: band.name,
      frequency: band.frequency,
      wavelength: band.wavelength,
      status,
      muf: Math.round(muf * 10) / 10,
      description: getBandDescription(band, status, daylight.isDaytime),
    };
  });

  const openBands = bands.filter(b => b.status === 'open').length;

  // Estimate A-index from Kp (simplified)
  const aIndex = Math.round(Math.pow(kp, 2.5) * 2);

  return {
    bands,
    overallCondition: getOverallCondition(sfi, kp, openBands),
    sfi,
    kp,
    aIndex,
    noiseLevel: getNoiseLevel(kp, sfi),
    updatedAt: new Date().toISOString(),
    daylight,
  };
}

/**
 * Generate propagation zones for map visualization
 */
export function calculatePropagationZones(sfi: number, kp: number): PropagationZone[] {
  const zones: PropagationZone[] = [];

  // Sample points around the world
  const regions = [
    { region: 'North America', lat: 40, lng: -100 },
    { region: 'South America', lat: -15, lng: -60 },
    { region: 'Europe', lat: 50, lng: 10 },
    { region: 'Africa', lat: 0, lng: 20 },
    { region: 'Asia', lat: 35, lng: 100 },
    { region: 'Oceania', lat: -25, lng: 135 },
    { region: 'Arctic', lat: 70, lng: 0 },
    { region: 'Antarctic', lat: -70, lng: 0 },
  ];

  for (const region of regions) {
    const daylight = getDaylightInfo(region.lat);
    const muf = calculateMuf(sfi, daylight.isDaytime, region.lat);
    const absorption = calculateAbsorption(kp);
    const effectiveMuf = muf * absorption;

    // foF2 is typically 0.8-0.9 of MUF
    const fof2 = effectiveMuf * 0.85;

    let condition: BandStatus = 'open';
    if (effectiveMuf < 10) condition = 'closed';
    else if (effectiveMuf < 15) condition = 'marginal';

    zones.push({
      region: region.region,
      lat: region.lat,
      lng: region.lng,
      muf: Math.round(effectiveMuf * 10) / 10,
      fof2: Math.round(fof2 * 10) / 10,
      condition,
    });
  }

  return zones;
}

/**
 * Get color for band status
 */
export function getBandStatusColor(status: BandStatus): string {
  switch (status) {
    case 'open': return '#22c55e';
    case 'marginal': return '#eab308';
    case 'closed': return '#ef4444';
  }
}

/**
 * Get color for overall condition
 */
export function getConditionColor(condition: HfPropagationData['overallCondition']): string {
  switch (condition) {
    case 'excellent': return '#22c55e';
    case 'good': return '#84cc16';
    case 'fair': return '#eab308';
    case 'poor': return '#ef4444';
  }
}
