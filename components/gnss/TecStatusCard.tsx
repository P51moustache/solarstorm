'use client';

import { Signal } from 'lucide-react';
import { estimatePositionError } from '@/lib/api/parsers/tec';
import type { TecStatus } from '@/lib/api/tec';

interface TecStatusCardProps {
  status: TecStatus;
}

export function TecStatusCard({ status }: TecStatusCardProps) {
  const { global } = status;
  const condition = global.condition;
  const singleFreqError = estimatePositionError(global.mean, false);
  const dualFreqError = estimatePositionError(global.mean, true);

  return (
    <div className="bg-solar-card rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <Signal className="w-5 h-5" style={{ color: condition.color }} />
        <span className="text-base font-semibold text-solar-text flex-1">
          Ionospheric TEC
        </span>
        <span
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
          style={{
            backgroundColor: condition.color + '20',
            color: condition.color,
          }}
        >
          {condition.level}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-4xl font-bold text-solar-text">{global.mean}</span>
        <span className="text-sm text-solar-muted">TECU</span>
        <span className="text-xs text-solar-muted ml-2">(max: {global.max})</span>
      </div>

      <p className="text-sm text-solar-text leading-5 mb-4">{condition.gnssImpact}</p>

      <div className="bg-solar-bg rounded-lg p-3 mb-3">
        <p className="text-xs text-solar-muted mb-2">Estimated Position Error:</p>
        <div className="flex gap-6">
          <div className="flex-1">
            <p className="text-xs text-solar-muted mb-1">Single-freq</p>
            <p className="text-sm font-semibold text-solar-text">
              ±{singleFreqError.horizontalM}m H
            </p>
            <p className="text-sm font-semibold text-solar-text">
              ±{singleFreqError.verticalM}m V
            </p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-solar-muted mb-1">Dual-freq</p>
            <p className="text-sm font-semibold text-solar-emerald">
              ±{dualFreqError.horizontalM}m H
            </p>
            <p className="text-sm font-semibold text-solar-emerald">
              ±{dualFreqError.verticalM}m V
            </p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-solar-muted text-right">
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
