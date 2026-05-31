'use client';

import { useEffect, useState } from 'react';
import { Plus, AlertCircle, Navigation, Signal, Globe, Radio, Crosshair, Clock, Timer } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { useGnssStore, useGnssOverallStatus } from '@/lib/state/useGnssStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { AddRegionModal, DataExportWidget } from '@/components/gnss';
import { estimatePositionError } from '@/lib/api/parsers/tec';
import { predictScintillationRisk } from '@/lib/api/parsers/scintillation';
import {
  estimateGnssRecovery,
  getSeverityColor,
  getSeverityLabel,
  type GnssRecoveryEstimate,
} from '@/lib/services/gnssRecovery';

function StatusIndicator({ status }: { status: 'nominal' | 'caution' | 'degraded' | 'loading' }) {
  const colors = {
    nominal: 'bg-green-500',
    caution: 'bg-yellow-500',
    degraded: 'bg-orange-500',
    loading: 'bg-gray-500',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />;
}

function ConstellationCard({ name, status, satellites, healthy }: {
  name: string;
  status: 'nominal' | 'degraded';
  satellites: number;
  healthy: number;
}) {
  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-semibold text-solar-text">{name}</h4>
        <span className={`text-xs font-medium shrink-0 ${status === 'nominal' ? 'text-green-400' : 'text-yellow-400'}`}>
          {status === 'nominal' ? 'Nominal' : 'Degraded'}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-solar-text font-mono">{healthy}</span>
        <span className="text-sm text-solar-muted">/ {satellites}</span>
      </div>
      <p className="text-xs text-solar-muted mt-1">Healthy SVs</p>
    </div>
  );
}

export default function GnssDashboardPage() {
  const { kp } = useSolarStormStore();
  const {
    regions,
    tecStatus,
    scintillationStatus,
    constellationStatus,
    isLoading,
    fetchRegions,
    addRegion,
    refreshAll,
  } = useGnssStore();
  const overallStatus = useGnssOverallStatus();

  const [showAddRegion, setShowAddRegion] = useState(false);
  const [recoveryEstimate, setRecoveryEstimate] = useState<GnssRecoveryEstimate | null>(null);

  const refreshKP = useSolarStormStore((state) => state.refreshKP);

  // Single initialization effect - fetch all data in parallel
  useEffect(() => {
    const initializeData = async () => {
      // Start both fetches in parallel
      const regionsPromise = fetchRegions();
      const kpPromise = kp === null ? refreshKP() : Promise.resolve();

      await Promise.all([regionsPromise, kpPromise]);
    };

    initializeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Refresh GNSS data when kp becomes available or regions change
  useEffect(() => {
    if (kp !== null && regions.length >= 0) {
      refreshAll(kp);
    }
  }, [kp, regions.length, refreshAll]);

  // Calculate GNSS recovery estimate when conditions change
  useEffect(() => {
    if (kp !== null && tecStatus) {
      const primaryRegion = regions.find(r => r.is_primary) || regions[0];
      const latitude = primaryRegion?.center_lat || 45; // Default to mid-latitude
      const localHour = new Date().getHours();

      // Determine Kp trend - simplified heuristic since we don't track history here
      // Assumes elevated Kp (>=5) is near peak (stable), lower Kp is in decay phase (falling)
      const kpTrend: 'rising' | 'stable' | 'falling' = kp >= 5 ? 'stable' : 'falling';

      const estimate = estimateGnssRecovery(
        kp,
        kpTrend,
        tecStatus.global.mean,
        localHour,
        latitude
      );
      setRecoveryEstimate(estimate);
    }
  }, [kp, tecStatus, regions]);

  const handleRefresh = async () => {
    if (kp !== null) {
      await refreshAll(kp);
    }
  };

  return (
    <AppLayout>
      <TopBar
        title="GNSS Operations Center"
        subtitle="Ionospheric monitoring and positioning system status"
        onRefresh={handleRefresh}
      />

      <div className="p-6">
        {/* Status overview */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StatusIndicator status={overallStatus === 'loading' ? 'loading' : overallStatus as 'nominal' | 'caution' | 'degraded'} />
              <span className="text-sm font-medium text-solar-text">
                System Status: <span className={
                  overallStatus === 'nominal' ? 'text-green-400' :
                  overallStatus === 'caution' ? 'text-yellow-400' :
                  overallStatus === 'degraded' ? 'text-orange-400' : 'text-solar-muted'
                }>{overallStatus.toUpperCase()}</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAddRegion(true)}
            className="flex items-center gap-2 px-4 py-2 bg-solar-emerald text-solar-bg rounded-lg text-sm font-medium hover:bg-solar-emerald/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Region
          </button>
        </div>

        {isLoading && !tecStatus ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Left column - Main metrics */}
            <div className="col-span-2 space-y-6">
              {/* Constellation status */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Signal className="w-4 h-4" />
                  GNSS Constellation Status
                </h3>
                <div className="grid grid-cols-4 gap-4">
                  <ConstellationCard name="GPS" status="nominal" satellites={32} healthy={31} />
                  <ConstellationCard name="GLONASS" status="nominal" satellites={24} healthy={23} />
                  <ConstellationCard name="Galileo" status="nominal" satellites={28} healthy={27} />
                  <ConstellationCard name="BeiDou" status="nominal" satellites={35} healthy={34} />
                </div>
              </div>

              {/* TEC Status */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Total Electron Content (TEC)
                </h3>
                {tecStatus ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-[#0a0f1a] rounded-lg">
                      <p className="text-xs text-solar-muted mb-1">Global Mean TEC</p>
                      <p className="text-2xl font-bold text-solar-text font-mono">
                        {tecStatus.global.mean.toFixed(1)}
                      </p>
                      <p className="text-xs text-solar-muted">TECU</p>
                    </div>
                    <div className="p-4 bg-[#0a0f1a] rounded-lg">
                      <p className="text-xs text-solar-muted mb-1">Condition</p>
                      <p className={`text-lg font-semibold capitalize ${
                        tecStatus.global.condition.level === 'normal' ? 'text-green-400' :
                        tecStatus.global.condition.level === 'elevated' ? 'text-yellow-400' :
                        'text-orange-400'
                      }`}>
                        {tecStatus.global.condition.level}
                      </p>
                    </div>
                    <div className="p-4 bg-[#0a0f1a] rounded-lg">
                      <p className="text-xs text-solar-muted mb-1">Global Max TEC</p>
                      <p className="text-2xl font-bold text-solar-text font-mono">
                        {tecStatus.global.max.toFixed(1)}
                      </p>
                      <p className="text-xs text-solar-muted">TECU</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-solar-muted">No TEC data available</p>
                )}
              </div>

              {/* Position Error Estimate */}
              {tecStatus && (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    Estimated Position Error
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Dual-frequency receivers */}
                    {(() => {
                      const dualFreq = estimatePositionError(tecStatus.global.mean, true);
                      return (
                        <div className="p-4 bg-[#0a0f1a] rounded-lg">
                          <p className="text-xs text-solar-muted mb-2">Dual-Frequency (Survey Grade)</p>
                          <div className="flex gap-4 mb-2">
                            <div>
                              <p className="text-xl font-bold text-solar-text font-mono">
                                {dualFreq.horizontalM < 0.1 ? `${(dualFreq.horizontalM * 100).toFixed(0)}cm` : `${dualFreq.horizontalM.toFixed(2)}m`}
                              </p>
                              <p className="text-xs text-solar-muted">Horizontal</p>
                            </div>
                            <div>
                              <p className="text-xl font-bold text-solar-text font-mono">
                                {dualFreq.verticalM < 0.1 ? `${(dualFreq.verticalM * 100).toFixed(0)}cm` : `${dualFreq.verticalM.toFixed(2)}m`}
                              </p>
                              <p className="text-xs text-solar-muted">Vertical</p>
                            </div>
                          </div>
                          <p className="text-xs text-green-400">{dualFreq.description}</p>
                        </div>
                      );
                    })()}
                    {/* Single-frequency receivers */}
                    {(() => {
                      const singleFreq = estimatePositionError(tecStatus.global.mean, false);
                      return (
                        <div className="p-4 bg-[#0a0f1a] rounded-lg">
                          <p className="text-xs text-solar-muted mb-2">Single-Frequency (Consumer)</p>
                          <div className="flex gap-4 mb-2">
                            <div>
                              <p className="text-xl font-bold text-solar-text font-mono">
                                {singleFreq.horizontalM.toFixed(1)}m
                              </p>
                              <p className="text-xs text-solar-muted">Horizontal</p>
                            </div>
                            <div>
                              <p className="text-xl font-bold text-solar-text font-mono">
                                {singleFreq.verticalM.toFixed(1)}m
                              </p>
                              <p className="text-xs text-solar-muted">Vertical</p>
                            </div>
                          </div>
                          <p className={`text-xs ${singleFreq.horizontalM > 2 ? 'text-orange-400' : singleFreq.horizontalM > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {singleFreq.description}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Scintillation */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Scintillation Index
                </h3>
                {scintillationStatus ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-[#0a0f1a] rounded-lg">
                        <p className="text-xs text-solar-muted mb-1">Current Severity</p>
                        <p className={`text-lg font-semibold capitalize ${
                          scintillationStatus.current.severity === 'none' ? 'text-green-400' :
                          scintillationStatus.current.severity === 'weak' ? 'text-green-400' :
                          scintillationStatus.current.severity === 'moderate' ? 'text-yellow-400' :
                          scintillationStatus.current.severity === 'strong' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {scintillationStatus.current.severity}
                        </p>
                        <p className="text-xs text-solar-muted mt-1">{scintillationStatus.current.description}</p>
                      </div>
                      <div className="p-4 bg-[#0a0f1a] rounded-lg">
                        <p className="text-xs text-solar-muted mb-1">Loss of Lock Risk</p>
                        <p className={`text-lg font-semibold capitalize ${
                          scintillationStatus.current.lossOfLockRisk === 'low' ? 'text-green-400' :
                          scintillationStatus.current.lossOfLockRisk === 'moderate' ? 'text-yellow-400' :
                          scintillationStatus.current.lossOfLockRisk === 'high' ? 'text-orange-400' :
                          'text-red-400'
                        }`}>
                          {scintillationStatus.current.lossOfLockRisk.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-solar-muted mt-1">{scintillationStatus.current.gnssImpact}</p>
                      </div>
                    </div>

                    {/* Scintillation Forecast */}
                    {regions.length > 0 && kp !== null && (
                      <div className="p-4 bg-[#0a0f1a] rounded-lg border border-solar-border">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-solar-muted" />
                          <p className="text-xs font-semibold text-solar-text">Scintillation Forecast by Region</p>
                        </div>
                        <div className="space-y-2">
                          {regions.map((region) => {
                            const prediction = predictScintillationRisk(
                              kp,
                              region.center_lat,
                              new Date().getHours(),
                              new Date().getMonth() + 1
                            );
                            const maxRisk = prediction.equatorialRisk !== 'none' ? prediction.equatorialRisk :
                                           prediction.auroralRisk !== 'none' ? prediction.auroralRisk : 'none';
                            const riskColor = maxRisk === 'none' || maxRisk === 'weak' ? 'text-green-400' :
                                             maxRisk === 'moderate' ? 'text-yellow-400' :
                                             maxRisk === 'strong' ? 'text-orange-400' : 'text-red-400';
                            return (
                              <div key={region.id} className="flex items-center justify-between py-1">
                                <span className="text-sm text-solar-text">
                                  {region.is_primary && <span className="text-solar-emerald mr-1">★</span>}
                                  {region.label}
                                </span>
                                <div className="text-right">
                                  <span className={`text-sm font-medium capitalize ${riskColor}`}>
                                    {maxRisk === 'none' ? 'Low Risk' : `${maxRisk} Risk`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {regions[0] && kp !== null && (
                          <p className="text-xs text-solar-muted mt-3 pt-3 border-t border-solar-border">
                            {predictScintillationRisk(
                              kp,
                              regions[0].center_lat,
                              new Date().getHours(),
                              new Date().getMonth() + 1
                            ).description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-solar-muted">No scintillation data available</p>
                )}
              </div>

              {/* RTK/PPP Advisory */}
              {tecStatus && tecStatus.global.condition.level !== 'normal' && (
                <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-400 mb-1">RTK/PPP Advisory</h4>
                      <p className="text-sm text-solar-text">
                        Elevated ionospheric activity may affect precision positioning.
                        {tecStatus.global.condition.level === 'extreme' && ' Consider pausing precision operations.'}
                        {tecStatus.global.condition.level === 'high' && ' Monitor convergence times and fix availability.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Regions */}
            <div className="space-y-6">
              {/* Monitored regions */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Navigation className="w-4 h-4" />
                  Monitored Regions ({regions.length})
                </h3>
                {regions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {regions.map((region) => (
                      <div key={region.id} className="p-3 bg-[#0a0f1a] rounded-lg border border-solar-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-solar-text">
                            {region.is_primary && <span className="text-solar-emerald mr-1">★</span>}
                            {region.label}
                          </span>
                          <span className="text-xs text-green-400">Active</span>
                        </div>
                        <p className="text-xs text-solar-muted font-mono">
                          {region.center_lat.toFixed(2)}°, {region.center_lng.toFixed(2)}° ({region.radius_km}km)
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Navigation className="w-10 h-10 text-solar-muted mx-auto mb-3" />
                    <p className="text-sm text-solar-muted">No regions configured</p>
                    <p className="text-xs text-solar-muted mt-1">Add regions for localized monitoring</p>
                  </div>
                )}
              </div>

              {/* Recovery Time Estimate */}
              {recoveryEstimate && (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    Recovery Estimate
                  </h3>

                  {/* Current status */}
                  <div className="p-3 bg-[#0a0f1a] rounded-lg mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-solar-muted">Current Status</span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: getSeverityColor(recoveryEstimate.currentSeverity) }}
                      >
                        {getSeverityLabel(recoveryEstimate.currentSeverity)}
                      </span>
                    </div>

                    {recoveryEstimate.hoursToRecovery > 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-solar-text font-mono">
                          {recoveryEstimate.hoursToRecovery < 1
                            ? '<1'
                            : recoveryEstimate.hoursToRecovery.toFixed(0)}
                        </span>
                        <span className="text-sm text-solar-muted">hours to normal</span>
                      </div>
                    ) : (
                      <p className="text-sm text-green-400">Conditions are normal</p>
                    )}

                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-solar-muted">Confidence:</span>
                      <span className={`text-xs font-medium capitalize ${
                        recoveryEstimate.confidence === 'high' ? 'text-green-400' :
                        recoveryEstimate.confidence === 'moderate' ? 'text-yellow-400' : 'text-orange-400'
                      }`}>
                        {recoveryEstimate.confidence}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-solar-muted mb-3">{recoveryEstimate.description}</p>

                  {/* Recovery factors */}
                  {recoveryEstimate.factors.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-solar-muted uppercase tracking-wide">
                        Factors
                      </p>
                      {recoveryEstimate.factors.map((factor, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                          <span className="text-xs text-solar-text">{factor.name}</span>
                          <span className={`text-xs font-medium capitalize ${
                            factor.status === 'improving' ? 'text-green-400' :
                            factor.status === 'worsening' ? 'text-orange-400' : 'text-solar-muted'
                          }`}>
                            {factor.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recovery phases */}
                  {recoveryEstimate.phases.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-solar-border">
                      <p className="text-xs font-semibold text-solar-muted uppercase tracking-wide mb-2">
                        Timeline
                      </p>
                      {recoveryEstimate.phases.map((phase, i) => (
                        <div key={i} className="flex items-start gap-2 py-1">
                          <span className="text-xs text-solar-muted font-mono whitespace-nowrap">
                            +{phase.hoursFromNow}h
                          </span>
                          <div>
                            <span className="text-xs font-medium text-solar-text">{phase.label}</span>
                            <p className="text-xs text-solar-muted">{phase.expectedCondition}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Data Export - Pro feature */}
              <DataExportWidget />

              {/* Quick reference */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4">S4 Index Reference</h3>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-solar-border">
                    <tr>
                      <td className="py-2 text-solar-muted">Weak</td>
                      <td className="py-2 text-right text-green-400 font-mono">&lt; 0.3</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">Moderate</td>
                      <td className="py-2 text-right text-yellow-400 font-mono">0.3 - 0.6</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">Strong</td>
                      <td className="py-2 text-right text-orange-400 font-mono">0.6 - 1.0</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-solar-muted">Severe</td>
                      <td className="py-2 text-right text-red-400 font-mono">&gt; 1.0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <AddRegionModal
          visible={showAddRegion}
          onClose={() => setShowAddRegion(false)}
          onAdd={addRegion}
        />
      </div>
    </AppLayout>
  );
}
