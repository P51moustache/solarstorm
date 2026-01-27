'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus, AlertTriangle, Satellite } from 'lucide-react';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { useSatelliteStore, getSatellitesByOrbit } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk, type DragRiskAssessment } from '@/lib/services/dragRisk';
import { SatelliteCard } from './SatelliteCard';
import { AddSatelliteModal } from './AddSatelliteModal';

export function SatelliteFleetManager() {
  const { satellites, isLoading, fetchSatellites, addSatellite, deleteSatellite, selectSatellite } =
    useSatelliteStore();
  const satellitesByOrbit = useMemo(() => getSatellitesByOrbit(satellites), [satellites]);
  const { kp } = useSolarStormStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [dragRisks, setDragRisks] = useState<DragRiskAssessment[]>([]);

  useEffect(() => {
    fetchSatellites();
  }, [fetchSatellites]);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      const risks = calculateFleetDragRisk(satellites, kp);
      setDragRisks(risks);
    }
  }, [satellites, kp]);

  const getRiskForSatellite = (id: string) => dragRisks.find((r) => r.satellite.id === id);

  const criticalCount = dragRisks.filter((r) => r.riskLevel === 'critical').length;
  const highCount = dragRisks.filter((r) => r.riskLevel === 'high').length;

  return (
    <FeatureGate feature="satelliteRisk">
      <div className="min-h-screen gradient-bg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-solar-text">Satellite Fleet</h1>
            <p className="text-sm text-solar-muted mt-0.5">
              {satellites.length} satellite{satellites.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 bg-solar-emerald text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-opacity-90"
          >
            <Plus className="w-5 h-5" />
            Add
          </button>
        </div>

        {/* Risk summary */}
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex items-center gap-2 bg-amber-500/15 p-3 rounded-lg mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-amber-500 font-medium">
              {criticalCount > 0 && `${criticalCount} critical`}
              {criticalCount > 0 && highCount > 0 && ', '}
              {highCount > 0 && `${highCount} high`} risk satellite
              {criticalCount + highCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : satellites.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <Satellite className="w-12 h-12 text-solar-muted" />
            <p className="text-lg font-semibold text-solar-text">No satellites tracked</p>
            <p className="text-sm text-solar-muted text-center px-8">
              Add satellites to monitor drag risk and space weather impacts
            </p>
          </div>
        ) : (
          <div>
            {/* LEO satellites first (most affected by drag) */}
            {satellitesByOrbit.LEO.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-solar-muted uppercase tracking-wider mb-3">
                  LEO ({satellitesByOrbit.LEO.length})
                </p>
                {satellitesByOrbit.LEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    dragRisk={getRiskForSatellite(sat.id)}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </div>
            )}

            {/* MEO satellites */}
            {satellitesByOrbit.MEO.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-solar-muted uppercase tracking-wider mb-3">
                  MEO ({satellitesByOrbit.MEO.length})
                </p>
                {satellitesByOrbit.MEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </div>
            )}

            {/* GEO satellites */}
            {satellitesByOrbit.GEO.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-solar-muted uppercase tracking-wider mb-3">
                  GEO ({satellitesByOrbit.GEO.length})
                </p>
                {satellitesByOrbit.GEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </div>
            )}

            {/* HEO satellites */}
            {satellitesByOrbit.HEO.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-solar-muted uppercase tracking-wider mb-3">
                  HEO ({satellitesByOrbit.HEO.length})
                </p>
                {satellitesByOrbit.HEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <AddSatelliteModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addSatellite}
        />
      </div>
    </FeatureGate>
  );
}
