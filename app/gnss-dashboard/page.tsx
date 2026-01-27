'use client';

import { useEffect, useState } from 'react';
import { Plus, AlertCircle, Navigation, Signal, Globe, Radio } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { useGnssStore, useGnssOverallStatus } from '@/lib/state/useGnssStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { AddRegionModal } from '@/components/gnss/AddRegionModal';

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
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-solar-text">{name}</h4>
        <span className={`text-xs font-medium ${status === 'nominal' ? 'text-green-400' : 'text-yellow-400'}`}>
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

  const refreshKP = useSolarStormStore((state) => state.refreshKP);

  useEffect(() => {
    fetchRegions();
    // Initialize Kp data if not already loaded
    if (kp === null) {
      refreshKP();
    }
  }, [fetchRegions, kp, refreshKP]);

  useEffect(() => {
    if (kp !== null) {
      refreshAll(kp);
    }
  }, [kp, regions.length, refreshAll]);

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

              {/* Scintillation */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  Scintillation Index
                </h3>
                {scintillationStatus ? (
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
