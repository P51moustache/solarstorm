import { NextResponse } from 'next/server';

const GLOTEC_INDEX_URL = 'https://services.swpc.noaa.gov/products/glotec/geojson_2d_urt/';

interface TecFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    tec: number;
    anomaly: number;
    quality_flag: number;
  };
}

interface TecGeoJSON {
  type: 'FeatureCollection';
  features: TecFeature[];
}

// Find the latest TEC file from the directory listing
async function getLatestTecFile(): Promise<string | null> {
  try {
    const response = await fetch(GLOTEC_INDEX_URL);
    if (!response.ok) return null;

    const html = await response.text();
    // Extract file names from HTML directory listing
    const filePattern = /href="(glotec_icao_\d{8}T\d{6}Z\.geojson)"/g;
    const matches = [...html.matchAll(filePattern)];

    if (matches.length === 0) return null;

    // Get the latest file (last in the list, sorted by name which includes timestamp)
    const latestFile = matches[matches.length - 1][1];
    return `${GLOTEC_INDEX_URL}${latestFile}`;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const latestUrl = await getLatestTecFile();
    if (!latestUrl) {
      return NextResponse.json(
        { error: 'Could not find latest TEC data file' },
        { status: 404 }
      );
    }

    const response = await fetch(latestUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 900 }, // Cache for 15 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch TEC data from NOAA' },
        { status: response.status }
      );
    }

    const data: TecGeoJSON = await response.json();

    // Process the GeoJSON to extract TEC readings
    const readings: Array<{ lat: number; lng: number; tec: number }> = [];
    let totalTec = 0;
    let maxTec = 0;
    let validCount = 0;

    for (const feature of data.features) {
      if (feature.properties.quality_flag === 0 && feature.properties.tec > 0) {
        const [lng, lat] = feature.geometry.coordinates;
        const tec = feature.properties.tec;

        readings.push({ lat, lng, tec });
        totalTec += tec;
        maxTec = Math.max(maxTec, tec);
        validCount++;
      }
    }

    const globalMean = validCount > 0 ? totalTec / validCount : 0;

    // Extract timestamp from filename
    const urlMatch = latestUrl.match(/(\d{8}T\d{6}Z)/);
    const timestamp = urlMatch
      ? new Date(
          urlMatch[1].replace(
            /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
            '$1-$2-$3T$4:$5:$6Z'
          )
        ).toISOString()
      : new Date().toISOString();

    return NextResponse.json({
      readings: readings.slice(0, 1000), // Limit to 1000 points for performance
      globalMean: Math.round(globalMean * 10) / 10,
      globalMax: Math.round(maxTec * 10) / 10,
      timestamp,
      totalPoints: validCount,
    });
  } catch (error) {
    console.error('TEC proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch TEC data' },
      { status: 500 }
    );
  }
}
