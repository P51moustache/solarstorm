'use client';

import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Rocket, X, Plus, Activity, Satellite, Zap, Radio } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { ParticleFluxWidget } from '@/components/satellite/ParticleFluxWidget';
import { SatelliteCard } from '@/components/satellite/SatelliteCard';
import { AnomalyLogger } from '@/components/satellite/AnomalyLogger';
import { AnomalyList } from '@/components/satellite/AnomalyList';
import { useSatelliteStore } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk, type DragRiskAssessment } from '@/lib/services/dragRisk';

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-solar-muted uppercase tracking-wide">{label}</span>
      </div>
      <span className={`text-2xl font-bold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function RiskLevelBadge({ level }: { level: 'low' | 'moderate' | 'high' | 'critical' }) {
  const styles = {
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
    moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

export default function SatelliteDashboardPage() {
  const {
    satellites,
    anomalies,
    selectedSatellite,
    fetchSatellites,
    selectSatellite,
    addAnomaly,
    deleteAnomaly,
  } = useSatelliteStore();
  const { kp } = useSolarStormStore();

  // Compute derived data with useMemo to avoid SSR hydration issues
  const orbitRaisingSats = useMemo(
    () => satellites.filter((s) => s.is_orbit_raising),
    [satellites]
  );

  const [showAnomalyLogger, setShowAnomalyLogger] = useState(false);
  const [dragRisks, setDragRisks] = useState<DragRiskAssessment[]>([]);

  useEffect(() => {
    fetchSatellites();
  }, [fetchSatellites]);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      setDragRisks(calculateFleetDragRisk(satellites, kp));
    }
  }, [satellites, kp]);

  const criticalRisks = dragRisks.filter(
    (r) => r.riskLevel === 'critical' || r.riskLevel === 'high'
  );

  const handleRefresh = async () => {
    await fetchSatellites();
  };

  return (
    <FeatureGate feature="satelliteRisk">
      <AppLayout>
        <TopBar
          title="Satellite Operations Center"
          subtitle="Real-time fleet monitoring and anomaly tracking"
          onRefresh={handleRefresh}
        />

        <div className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <StatCard icon={Satellite} label="Total Fleet" value={satellites.length} color="text-solar-text" />
            <StatCard icon={Activity} label="LEO Assets" value={satellites.filter((s) => s.orbit_type === 'LEO').length} color="text-blue-400" />
            <StatCard icon={Radio} label="GEO Assets" value={satellites.filter((s) => s.orbit_type === 'GEO').length} color="text-purple-400" />
            <StatCard icon={Rocket} label="Orbit Raising" value={orbitRaisingSats.length} color="text-amber-400" />
            <StatCard icon={AlertTriangle} label="Risk Alerts" value={criticalRisks.length} color={criticalRisks.length > 0 ? 'text-red-400' : 'text-green-400'} />
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Particle Environment */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Particle Environment
                </h3>
                <ParticleFluxWidget />
              </div>

              {/* Critical Alerts */}
              {criticalRisks.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h3 className="text-sm font-semibold text-red-400">Critical Risk Alerts</h3>
                  </div>
                  <div className="space-y-3">
                    {criticalRisks.map((risk) => (
                      <div
                        key={risk.satellite.id}
                        className="bg-[#0a0f1a] rounded-lg p-4 border-l-4 border-red-500"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-solar-text">
                            {risk.satellite.name}
                          </span>
                          <RiskLevelBadge level={risk.riskLevel} />
                        </div>
                        <p className="text-sm text-solar-muted">{risk.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orbit Raising Satellites */}
              {orbitRaisingSats.length > 0 && (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Rocket className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-solar-text">
                      Orbit Raising Operations ({orbitRaisingSats.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {orbitRaisingSats.map((sat) => (
                      <SatelliteCard
                        key={sat.id}
                        satellite={sat}
                        dragRisk={dragRisks.find((r) => r.satellite.id === sat.id)}
                        onPress={() => selectSatellite(sat)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Fleet Table */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-solar-border">
                  <h3 className="text-sm font-semibold text-solar-text">Fleet Status</h3>
                </div>
                {satellites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <Satellite className="w-12 h-12 text-solar-muted mb-4" />
                    <p className="text-sm font-medium text-solar-text mb-2">No satellites registered</p>
                    <p className="text-xs text-solar-muted text-center max-w-sm">
                      Add satellites to your fleet to monitor drag risk and track anomalies during space weather events.
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-solar-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Asset</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Orbit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Altitude</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Drag Risk</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solar-border">
                      {satellites.map((sat) => {
                        const risk = dragRisks.find((r) => r.satellite.id === sat.id);
                        return (
                          <tr
                            key={sat.id}
                            className="hover:bg-[#0a0f1a] transition-colors cursor-pointer"
                            onClick={() => selectSatellite(sat)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-solar-card rounded-lg flex items-center justify-center">
                                  <Satellite className="w-4 h-4 text-solar-emerald" />
                                </div>
                                <span className="text-sm font-medium text-solar-text">{sat.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-solar-muted">{sat.orbit_type}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-solar-text font-mono">{sat.altitude_km} km</span>
                            </td>
                            <td className="px-4 py-3">
                              {risk && <RiskLevelBadge level={risk.riskLevel} />}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-medium ${sat.is_orbit_raising ? 'text-amber-400' : 'text-green-400'}`}>
                                {sat.is_orbit_raising ? 'Raising' : 'Nominal'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right Column - Selected Satellite & Anomalies */}
            <div className="space-y-6">
              {/* Selected Satellite Details */}
              {selectedSatellite ? (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-solar-text flex items-center gap-2">
                      <span className="w-2 h-2 bg-solar-emerald rounded-full" />
                      {selectedSatellite.name}
                    </h3>
                    <button
                      onClick={() => selectSatellite(null)}
                      className="p-1 text-solar-muted hover:text-solar-text transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">NORAD ID</span>
                      <span className="text-solar-text font-mono">{selectedSatellite.norad_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Orbit Type</span>
                      <span className="text-solar-text">{selectedSatellite.orbit_type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Altitude</span>
                      <span className="text-solar-text font-mono">{selectedSatellite.altitude_km} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Inclination</span>
                      <span className="text-solar-text font-mono">{selectedSatellite.inclination_deg}°</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAnomalyLogger(true)}
                    className="w-full flex items-center justify-center gap-2 bg-solar-emerald/20 text-solar-emerald py-2 rounded-lg text-sm font-medium hover:bg-solar-emerald/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Log Anomaly
                  </button>
                </div>
              ) : (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">Satellite Details</h3>
                  <div className="text-center py-6">
                    <Satellite className="w-10 h-10 text-solar-muted mx-auto mb-3" />
                    <p className="text-sm text-solar-text mb-1">No satellite selected</p>
                    <p className="text-xs text-solar-muted">
                      {satellites.length > 0
                        ? 'Click a satellite from the fleet table to view details and log anomalies'
                        : 'Add satellites to your fleet to get started'}
                    </p>
                  </div>
                </div>
              )}

              {/* Anomaly History */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Anomaly Log ({anomalies.length})
                </h3>
                {anomalies.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto">
                    <AnomalyList anomalies={anomalies} onDelete={deleteAnomaly} />
                  </div>
                ) : (
                  <p className="text-sm text-solar-muted text-center py-4">No anomalies logged</p>
                )}
              </div>

              {/* Drag Risk Reference */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4">Drag Risk Reference</h3>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-solar-border">
                    <tr>
                      <td className="py-2 text-solar-muted">Low</td>
                      <td className="py-2 text-right text-green-400">Normal ops</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">Moderate</td>
                      <td className="py-2 text-right text-yellow-400">Monitor closely</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">High</td>
                      <td className="py-2 text-right text-orange-400">Prepare maneuver</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">Critical</td>
                      <td className="py-2 text-right text-red-400">Immediate action</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <AnomalyLogger
            visible={showAnomalyLogger}
            satelliteId={selectedSatellite?.id || ''}
            satelliteName={selectedSatellite?.name || ''}
            onClose={() => setShowAnomalyLogger(false)}
            onLog={addAnomaly}
          />
        </div>
      </AppLayout>
    </FeatureGate>
  );
}
