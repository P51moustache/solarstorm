import { NextRequest, NextResponse } from 'next/server';
import { getKpNow, getSolarWindRecent } from '@/lib/api/swpc';
import { getParticleFluxStatus } from '@/lib/api/particleFlux';
import { getSfiTrend } from '@/lib/api/solarFlux';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '@/lib/util/rateLimit';

// CORS headers for public API access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

/**
 * Public API: Current Space Weather Conditions
 * GET /api/v1/current
 *
 * Returns current Kp index, solar wind conditions, particle flux, and solar activity
 *
 * Authentication: API key required via X-API-Key header
 * Rate limit: 60 requests/minute for Pro tier
 */
export async function GET(request: NextRequest) {
  // Check for API key
  const apiKey = request.headers.get('x-api-key');

  // For now, allow unauthenticated access with stricter rate limits
  // In production, require API key for authenticated access
  const identifier = apiKey || getClientIdentifier(request.headers);
  const limits = apiKey ? RATE_LIMITS.standard : { windowMs: 60000, maxRequests: 10 };

  const rateLimitResult = checkRateLimit(`v1:current:${identifier}`, limits);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    // Fetch all data in parallel
    const [kpData, swData, particleData, sfiData] = await Promise.all([
      getKpNow().catch(() => null),
      getSolarWindRecent().catch(() => null),
      getParticleFluxStatus().catch(() => null),
      getSfiTrend().catch(() => null),
    ]);

    // Get latest solar wind values
    const latestSw = swData?.points?.length
      ? swData.points[swData.points.length - 1]
      : null;

    const response = {
      timestamp: new Date().toISOString(),
      geomagnetic: {
        kp: kpData?.kp ?? null,
        kp_timestamp: kpData?.at ?? null,
        scale: getKpScale(kpData?.kp ?? 0),
      },
      solar_wind: latestSw
        ? {
            speed_km_s: latestSw.speed,
            density_p_cm3: latestSw.density,
            bz_nT: latestSw.bz,
            bt_nT: latestSw.bt,
            timestamp: latestSw.at,
          }
        : null,
      particle_flux: particleData
        ? {
            proton: {
              flux_10mev_pfu: particleData.proton.latest?.flux_10mev ?? null,
              s_scale: particleData.proton.sScale.scale,
              description: particleData.proton.sScale.description,
            },
            electron: {
              flux_2mev: particleData.electron.latest?.flux_2mev ?? null,
              charging_risk: particleData.electron.chargingRisk.level,
            },
          }
        : null,
      solar_activity: sfiData
        ? {
            sfi: sfiData.current,
            sfi_trend: sfiData.trend,
            sfi_30day_avg: sfiData.average30day,
          }
        : null,
      _links: {
        self: '/api/v1/current',
        forecast: '/api/v1/forecast',
        history: '/api/v1/history',
        docs: '/api/docs',
      },
    };

    return NextResponse.json(response, {
      headers: {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=60',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
      },
    });
  } catch (error) {
    console.error('API v1/current error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch space weather data' },
      { status: 500, headers: corsHeaders }
    );
  }
}

function getKpScale(kp: number): string {
  if (kp >= 9) return 'G5 - Extreme';
  if (kp >= 8) return 'G4 - Severe';
  if (kp >= 7) return 'G3 - Strong';
  if (kp >= 6) return 'G2 - Moderate';
  if (kp >= 5) return 'G1 - Minor';
  if (kp >= 4) return 'Active';
  if (kp >= 2) return 'Unsettled';
  return 'Quiet';
}
