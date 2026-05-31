'use client';

import { useEffect, useState } from 'react';
import { Rocket, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import {
  assessLaunchWindow,
  getStatusColor,
  getOverallLabel,
  type LaunchWindowAssessment,
} from '@/lib/services/launchAssessment';
import { getParticleFluxStatus } from '@/lib/api/particleFlux';
import { useSolarStormStore } from '@/lib/state/useStore';

interface LaunchAssessmentWidgetProps {
  targetAltitude?: number;
}

export function LaunchAssessmentWidget({ targetAltitude = 550 }: LaunchAssessmentWidgetProps) {
  const { kp, speed } = useSolarStormStore();
  const [assessment, setAssessment] = useState<LaunchWindowAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAssessment() {
      if (kp === null) {
        // Don't attempt to load without Kp data, but stop showing loading state
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const particleStatus = await getParticleFluxStatus();
        const protonFlux = particleStatus.proton.latest?.flux_10mev ?? 0;
        const electronFlux = particleStatus.electron.latest?.flux_2mev ?? 0;
        const solarWindSpeed = speed ?? 400;

        const result = assessLaunchWindow(
          targetAltitude,
          kp,
          protonFlux,
          electronFlux,
          solarWindSpeed
        );
        setAssessment(result);
      } catch (error) {
        console.error('Failed to load launch assessment:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAssessment();
  }, [kp, speed, targetAltitude]);

  if (isLoading) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Launch Window Assessment
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
          <Rocket className="w-4 h-4" />
          Launch Window Assessment
        </h3>
        <p className="text-sm text-solar-muted text-center py-4">
          Waiting for space weather data...
        </p>
      </div>
    );
  }

  const OverallIcon = assessment.overall === 'go' ? CheckCircle2 :
                      assessment.overall === 'caution' ? AlertTriangle : XCircle;

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
        <Rocket className="w-4 h-4" />
        Launch Window Assessment
      </h3>

      {/* Overall Status */}
      <div className="flex items-center justify-between mb-4 p-3 bg-[#0a0f1a] rounded-lg">
        <div className="flex items-center gap-3">
          <OverallIcon className="w-8 h-8" style={{ color: assessment.color }} />
          <div>
            <p className="text-2xl font-bold" style={{ color: assessment.color }}>
              {getOverallLabel(assessment.overall)}
            </p>
            <p className="text-xs text-solar-muted">
              Target: {targetAltitude} km LEO
            </p>
          </div>
        </div>
      </div>

      {/* Factor Assessment */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-semibold text-solar-muted uppercase tracking-wide">
          Environmental Factors
        </p>
        {assessment.factors.map((factor) => (
          <div
            key={factor.name}
            className="flex items-center justify-between py-2 px-3 bg-[#0a0f1a] rounded"
          >
            <span className="text-sm text-solar-text">{factor.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-solar-muted">{factor.value}</span>
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: getStatusColor(factor.status) }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Orbit Raising Risk */}
      <div className="p-3 bg-[#0a0f1a] rounded-lg mb-4">
        <p className="text-xs text-solar-muted mb-1">Orbit Raising Risk</p>
        <p className="text-sm font-medium text-solar-text">{assessment.orbitRaisingRisk}</p>
      </div>

      {/* Recommendations */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-solar-muted uppercase tracking-wide">
          Recommendations
        </p>
        {assessment.recommendations.map((rec, i) => (
          <p key={i} className="text-sm text-solar-text">
            {rec}
          </p>
        ))}
      </div>
    </div>
  );
}
