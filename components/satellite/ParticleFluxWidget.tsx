'use client';

import { useEffect, useState } from 'react';
import { Zap, MinusCircle } from 'lucide-react';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { getParticleFluxStatus, type ParticleFluxStatus } from '@/lib/api/particleFlux';

export function ParticleFluxWidget() {
  const [status, setStatus] = useState<ParticleFluxStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getParticleFluxStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load particle flux:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-4 flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!status) return null;

  const { proton, electron } = status;

  return (
    <FeatureGate feature="satelliteRisk">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-solar-text mb-3">Particle Environment</h3>

        {/* Solar Radiation Storm (Protons) */}
        <div className="bg-solar-card rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5" style={{ color: proton.sScale.color }} />
            <span className="text-sm font-semibold text-solar-text flex-1">
              Solar Radiation Storm
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-bold"
              style={{
                backgroundColor: proton.sScale.color + '20',
                color: proton.sScale.color,
              }}
            >
              {proton.sScale.scale}
            </span>
          </div>
          <p className="text-sm font-medium text-solar-text mb-1">
            {proton.sScale.description}
          </p>
          <p className="text-sm text-solar-muted mb-3">{proton.sScale.impact}</p>
          {proton.latest && (
            <div className="flex gap-6 pt-3 border-t border-solar-border">
              <div>
                <p className="text-[11px] text-solar-muted uppercase">{'>'}10 MeV</p>
                <p className="text-sm font-semibold text-solar-text font-mono">
                  {proton.latest.flux_10mev?.toExponential(1) ?? 'N/A'} pfu
                </p>
              </div>
              <div>
                <p className="text-[11px] text-solar-muted uppercase">{'>'}100 MeV</p>
                <p className="text-sm font-semibold text-solar-text font-mono">
                  {proton.latest.flux_100mev?.toExponential(1) ?? 'N/A'} pfu
                </p>
              </div>
            </div>
          )}
        </div>

        {/* GEO Electron Environment */}
        <div className="bg-solar-card rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <MinusCircle className="w-5 h-5" style={{ color: electron.chargingRisk.color }} />
            <span className="text-sm font-semibold text-solar-text flex-1">
              GEO Surface Charging
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase"
              style={{
                backgroundColor: electron.chargingRisk.color + '20',
                color: electron.chargingRisk.color,
              }}
            >
              {electron.chargingRisk.level}
            </span>
          </div>
          <p className="text-sm text-solar-text">{electron.chargingRisk.description}</p>
          {electron.latest && (
            <div className="pt-3 border-t border-solar-border mt-3">
              <div>
                <p className="text-[11px] text-solar-muted uppercase">{'>'}2 MeV e-</p>
                <p className="text-sm font-semibold text-solar-text font-mono">
                  {electron.latest.flux_2mev?.toExponential(1) ?? 'N/A'} e/(cm²·s·sr)
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-solar-muted text-center">
          Updated: {new Date(status.updatedAt).toLocaleTimeString()}
        </p>
      </div>
    </FeatureGate>
  );
}
