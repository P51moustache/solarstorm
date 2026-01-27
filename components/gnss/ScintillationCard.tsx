'use client';

import { Radio } from 'lucide-react';
import type { ScintillationStatus } from '@/lib/api/scintillation';

interface ScintillationCardProps {
  status: ScintillationStatus;
  regionName: string;
}

export function ScintillationCard({ status, regionName }: ScintillationCardProps) {
  const { current, forecast } = status;

  const riskLevels = ['low', 'moderate', 'high', 'very_high'];
  const currentRiskIndex = riskLevels.indexOf(current.lossOfLockRisk);

  return (
    <div className="bg-solar-card rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Radio className="w-5 h-5" style={{ color: current.color }} />
        <span className="text-base font-semibold text-solar-text flex-1">Scintillation</span>
        <span
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
          style={{
            backgroundColor: current.color + '20',
            color: current.color,
          }}
        >
          {current.severity}
        </span>
      </div>

      <p className="text-xs text-solar-muted mb-3">{regionName}</p>

      <p className="text-sm text-solar-text leading-5 mb-4">{current.gnssImpact}</p>

      <div className="mb-4">
        <p className="text-xs text-solar-muted mb-2">Loss of Lock Risk:</p>
        <div className="flex gap-1 mb-1">
          {riskLevels.map((level, i) => (
            <div
              key={level}
              className="flex-1 h-1.5 rounded-full"
              style={{
                backgroundColor: i <= currentRiskIndex ? current.color : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
        </div>
        <p className="text-xs font-semibold capitalize" style={{ color: current.color }}>
          {current.lossOfLockRisk.replace('_', ' ')}
        </p>
      </div>

      <div className="bg-solar-bg rounded-lg p-3 mb-3">
        <p className="text-[11px] text-solar-muted uppercase mb-1">Forecast</p>
        <p className="text-sm text-solar-text leading-5">{forecast.description}</p>
      </div>

      <p className="text-[11px] text-solar-muted text-right">
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
