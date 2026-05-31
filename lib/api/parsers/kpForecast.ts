import { dayjs } from '../../util/time';

export interface KpForecastPoint {
  time: string; // ISO 8601 timestamp
  kp: number;
}

export interface KpForecastData {
  issuedAt: string;
  days: string[]; // e.g., ['Jan 27', 'Jan 28', 'Jan 29']
  hourlyForecast: KpForecastPoint[];
  probabilities: {
    active: number[];
    minorStorm: number[];
    moderateStorm: number[];
    strongStorm: number[];
  };
  apForecast: {
    observed: { date: string; value: number } | null;
    estimated: { date: string; value: number } | null;
    predicted: { date: string; values: number[] };
  };
}

/**
 * Parse the SWPC 3-day geomagnetic forecast text file
 * Format: https://services.swpc.noaa.gov/text/3-day-geomag-forecast.txt
 */
export function parseKpForecast(text: string): KpForecastData | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const lines = text.split('\n');

  // Extract issued date
  const issuedLine = lines.find(l => l.startsWith(':Issued:'));
  let issuedAt = new Date().toISOString();
  if (issuedLine) {
    // Format: ":Issued: 2026 Jan 26 2205 UTC"
    const match = issuedLine.match(/:Issued:\s*(\d{4})\s+(\w+)\s+(\d+)\s+(\d{2})(\d{2})\s+UTC/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      const parsed = dayjs(`${year} ${month} ${day} ${hour}:${minute}`, 'YYYY MMM D HH:mm');
      if (parsed.isValid()) {
        issuedAt = parsed.utc().toISOString();
      }
    }
  }

  // Parse Ap Index section
  let observedAp: { date: string; value: number } | null = null;
  let estimatedAp: { date: string; value: number } | null = null;
  let predictedAp: { date: string; values: number[] } = { date: '', values: [] };

  for (const line of lines) {
    // Observed Ap 25 Jan 015
    const obsMatch = line.match(/Observed\s+Ap\s+(\d+)\s+(\w+)\s+(\d+)/);
    if (obsMatch) {
      observedAp = { date: `${obsMatch[2]} ${obsMatch[1]}`, value: parseInt(obsMatch[3], 10) };
    }

    // Estimated Ap 26 Jan 008
    const estMatch = line.match(/Estimated\s+Ap\s+(\d+)\s+(\w+)\s+(\d+)/);
    if (estMatch) {
      estimatedAp = { date: `${estMatch[2]} ${estMatch[1]}`, value: parseInt(estMatch[3], 10) };
    }

    // Predicted Ap 27 Jan-29 Jan 008-024-018
    const predMatch = line.match(/Predicted\s+Ap\s+(\d+)\s+(\w+)-(\d+)\s+(\w+)\s+([\d-]+)/);
    if (predMatch) {
      predictedAp = {
        date: `${predMatch[2]} ${predMatch[1]}-${predMatch[4]} ${predMatch[3]}`,
        values: predMatch[5].split('-').map(v => parseInt(v, 10)),
      };
    }
  }

  // Parse probability section
  // Format: Active                25/30/35
  const probabilities = {
    active: [0, 0, 0],
    minorStorm: [0, 0, 0],
    moderateStorm: [0, 0, 0],
    strongStorm: [0, 0, 0],
  };

  for (const line of lines) {
    const activeMatch = line.match(/^Active\s+([\d\/]+)/);
    if (activeMatch) {
      probabilities.active = activeMatch[1].split('/').map(v => parseInt(v, 10));
    }

    const minorMatch = line.match(/^Minor storm\s+([\d\/]+)/);
    if (minorMatch) {
      probabilities.minorStorm = minorMatch[1].split('/').map(v => parseInt(v, 10));
    }

    const modMatch = line.match(/^Moderate storm\s+([\d\/]+)/);
    if (modMatch) {
      probabilities.moderateStorm = modMatch[1].split('/').map(v => parseInt(v, 10));
    }

    const strongMatch = line.match(/^Strong-Extreme storm\s+([\d\/]+)/);
    if (strongMatch) {
      probabilities.strongStorm = strongMatch[1].split('/').map(v => parseInt(v, 10));
    }
  }

  // Parse Kp forecast table
  // Find the header line: "             Jan 27    Jan 28    Jan 29" (works for any month)
  const monthPattern = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
  const kpTableHeaderRegex = new RegExp(`${monthPattern}\\s+\\d+.*${monthPattern}\\s+\\d+.*${monthPattern}\\s+\\d+`);
  const kpTableHeaderIdx = lines.findIndex(l => kpTableHeaderRegex.test(l));

  if (kpTableHeaderIdx === -1) {
    return null;
  }

  const headerLine = lines[kpTableHeaderIdx];
  // Extract dates from header
  const dateMatches = headerLine.match(/(\w+\s+\d+)/g);
  const days = dateMatches || [];

  // Parse the Kp values
  const hourlyForecast: KpForecastPoint[] = [];

  // Get current year for building proper dates
  // Handle year rollover (e.g., forecast spans Dec 31 to Jan 2)
  const now = dayjs();
  const currentYear = now.year();
  const currentMonth = now.month(); // 0-indexed (0 = Jan, 11 = Dec)

  for (let i = kpTableHeaderIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Match format: "00-03UT        2.00      4.00      3.33"
    const match = line.match(/^(\d{2}-\d{2})UT\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (match) {
      const [, timeRange, kp1, kp2, kp3] = match;
      const startHour = parseInt(timeRange.split('-')[0], 10);

      // Create timestamps for each day (max 3 since we only parse 3 Kp values per line)
      const kpValues = [parseFloat(kp1), parseFloat(kp2), parseFloat(kp3)];
      days.slice(0, 3).forEach((day, dayIdx) => {
        // Parse the day (e.g., "Jan 27")
        const [month, dayNum] = day.split(' ');

        // Determine year: if we're in late December and the forecast month is January,
        // the forecast date is in the next year
        let year = currentYear;
        const forecastMonth = dayjs(`${month} 1`, 'MMM D').month(); // Get month index
        if (currentMonth >= 10 && forecastMonth <= 1) {
          // We're in Nov/Dec and forecast is Jan/Feb - it's next year
          year = currentYear + 1;
        }

        const dateStr = `${year} ${month} ${dayNum}`;
        const date = dayjs(dateStr, 'YYYY MMM D').utc();

        if (date.isValid()) {
          const timestamp = date.hour(startHour).toISOString();
          hourlyForecast.push({
            time: timestamp,
            kp: kpValues[dayIdx],
          });
        }
      });
    }
  }

  // Sort by time
  hourlyForecast.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return {
    issuedAt,
    days,
    hourlyForecast,
    probabilities,
    apForecast: {
      observed: observedAp,
      estimated: estimatedAp,
      predicted: predictedAp,
    },
  };
}
