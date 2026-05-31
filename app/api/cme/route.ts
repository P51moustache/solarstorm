import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/util/rateLimit';

// Use non-public env var (server-side only)
const NASA_API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';

interface CmeAnalysis {
  time21_5: string;
  latitude: number;
  longitude: number;
  halfAngle: number;
  speed: number;
  type: string;
  isMostAccurate: boolean;
}

interface CmeItem {
  activityID: string;
  startTime: string;
  cmeAnalyses?: CmeAnalysis[];
}

export async function GET(request: Request) {
  // Rate limiting
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = checkRateLimit(`cme:${clientId}`, RATE_LIMITS.standard);

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.resetTime),
          'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
        },
      }
    );
  }

  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const start = startDate.toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    const url = `https://api.nasa.gov/DONKI/CME?startDate=${start}&endDate=${end}&api_key=${NASA_API_KEY}`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 1800 }, // Cache for 30 minutes
    });

    if (!response.ok) {
      console.error('NASA API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch CME data from NASA' },
        { status: response.status }
      );
    }

    const data: CmeItem[] = await response.json();

    // Process and return only necessary data
    const cmes = data.map((cme) => ({
      id: cme.activityID,
      startTime: cme.startTime,
      analyses: cme.cmeAnalyses?.map((analysis) => ({
        time: analysis.time21_5,
        latitude: analysis.latitude,
        longitude: analysis.longitude,
        halfAngle: analysis.halfAngle,
        speed: analysis.speed,
        type: analysis.type,
        isMostAccurate: analysis.isMostAccurate,
      })) || [],
    }));

    return NextResponse.json({ cmes });
  } catch (error) {
    console.error('CME proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CME data' },
      { status: 500 }
    );
  }
}
