'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, ChevronRight, Clock, Satellite, Radio } from 'lucide-react';
import { getKpNow, getSolarWindRecent } from '@/lib/api/swpc';
import { getParticleFluxStatus } from '@/lib/api/particleFlux';
import {
  generateFleetRecommendations,
  getFleetStatus,
  getUrgencyColor,
  getUrgencyLabel,
  type SafeModeRecommendation,
  type SpaceWeatherConditions,
  type UrgencyLevel,
} from '@/lib/services/safeModeRecommendations';

interface SafeModeWidgetProps {
  className?: string;
  compact?: boolean;
}

export function SafeModeWidget({ className = '', compact = false }: SafeModeWidgetProps) {
  const [recommendations, setRecommendations] = useState<SafeModeRecommendation[]>([]);
  const [fleetStatus, setFleetStatus] = useState<{ status: UrgencyLevel; summary: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all space weather data in parallel
        const [kpData, swData, particleData] = await Promise.all([
          getKpNow().catch(() => ({ kp: 2, at: new Date().toISOString() })),
          getSolarWindRecent().catch(() => ({ points: [] })),
          getParticleFluxStatus().catch(() => ({
            proton: { latest: null, sScale: { scale: 'S0' as const, description: 'None', impact: '', color: '#22c55e' } },
            electron: { latest: null, chargingRisk: { level: 'low' as const, description: '', color: '#22c55e' } },
            updatedAt: new Date().toISOString(),
          })),
        ]);

        // Get latest solar wind values
        const latestSw = swData.points.length > 0
          ? swData.points[swData.points.length - 1]
          : { bz: 0, speed: 400 };

        // Build conditions object
        const conditions: SpaceWeatherConditions = {
          kp: kpData.kp,
          protonFlux10mev: particleData.proton.latest?.flux_10mev ?? 1,
          electronFlux2mev: particleData.electron.latest?.flux_2mev ?? 100,
          solarWindSpeed: latestSw.speed ?? 400,
          bz: latestSw.bz ?? 0,
          sScale: particleData.proton.sScale,
          cmeArrivalExpected: false, // Would come from CME prediction service
        };

        const recs = generateFleetRecommendations([], conditions);
        const status = getFleetStatus(conditions);

        setRecommendations(recs);
        setFleetStatus(status);
      } catch (err) {
        console.error('Failed to fetch safe mode data:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-solar-card rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-solar-card rounded-2xl p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-32 text-solar-muted">
          <AlertTriangle className="w-6 h-6 mb-2" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact view for dashboard
    const topRec = recommendations[0];
    if (!topRec || !fleetStatus) return null;

    return (
      <div
        className={`bg-solar-card rounded-2xl p-4 border-l-4 ${className}`}
        style={{ borderLeftColor: getUrgencyColor(fleetStatus.status) }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${getUrgencyColor(fleetStatus.status)}20` }}
            >
              <Shield className="w-5 h-5" style={{ color: getUrgencyColor(fleetStatus.status) }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    color: getUrgencyColor(fleetStatus.status),
                    backgroundColor: `${getUrgencyColor(fleetStatus.status)}20`,
                  }}
                >
                  {getUrgencyLabel(fleetStatus.status)}
                </span>
                <span className="text-sm font-medium text-solar-text">Safe Mode Status</span>
              </div>
              <p className="text-xs text-solar-muted mt-1">{fleetStatus.summary}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-solar-muted" />
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with overall status */}
      {fleetStatus && (
        <div
          className="bg-solar-card rounded-2xl p-6 border-l-4"
          style={{ borderLeftColor: getUrgencyColor(fleetStatus.status) }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${getUrgencyColor(fleetStatus.status)}20` }}
            >
              <Shield className="w-7 h-7" style={{ color: getUrgencyColor(fleetStatus.status) }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-solar-text">Safe Mode Recommendations</h2>
                <span
                  className="text-xs font-bold px-2 py-1 rounded"
                  style={{
                    color: getUrgencyColor(fleetStatus.status),
                    backgroundColor: `${getUrgencyColor(fleetStatus.status)}20`,
                  }}
                >
                  {getUrgencyLabel(fleetStatus.status)}
                </span>
              </div>
              <p className="text-sm text-solar-muted">{fleetStatus.summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations list */}
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-solar-card rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <button
              onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-[#0d1424] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getUrgencyColor(rec.urgency) }}
                />
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-solar-text">{rec.title}</h3>
                  <p className="text-xs text-solar-muted">{rec.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {rec.affectedOrbits.length > 0 && (
                  <div className="flex gap-1">
                    {rec.affectedOrbits.map((orbit) => (
                      <span
                        key={orbit}
                        className="text-xs bg-[#1E2347] text-solar-muted px-2 py-0.5 rounded"
                      >
                        {orbit}
                      </span>
                    ))}
                  </div>
                )}
                <ChevronRight
                  className={`w-5 h-5 text-solar-muted transition-transform ${
                    expandedId === rec.id ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </button>

            {/* Expanded content */}
            {expandedId === rec.id && (
              <div className="px-4 pb-4 border-t border-solar-border">
                {/* Triggers */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-solar-muted mb-2 flex items-center gap-1">
                    <Radio className="w-3 h-3" /> Triggers
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rec.triggers.map((trigger, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#0a0f1a] text-solar-text px-2 py-1 rounded"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-solar-muted mb-2 flex items-center gap-1">
                    <Satellite className="w-3 h-3" /> Recommended Actions
                  </p>
                  <ul className="space-y-2">
                    {rec.actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-solar-text">
                        <span className="text-solar-emerald mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Validity */}
                <div className="mt-4 pt-3 border-t border-solar-border flex items-center gap-2 text-xs text-solar-muted">
                  <Clock className="w-3 h-3" />
                  <span>
                    Valid until {new Date(rec.validUntil).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
