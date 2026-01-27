'use client';

import { Globe2, Flag, Snowflake, Star, CircleDot } from 'lucide-react';
import {
  getMultiConstellationImpact,
  type AllConstellationsStatus,
  type ConstellationHealth,
} from '@/lib/api/parsers/gnssConstellation';

interface ConstellationStatusProps {
  status: AllConstellationsStatus;
}

const CONSTELLATION_ICONS: Record<string, React.ReactNode> = {
  GPS: <Flag className="w-4 h-4" />,
  GLONASS: <Snowflake className="w-4 h-4" />,
  Galileo: <Star className="w-4 h-4" />,
  BeiDou: <CircleDot className="w-4 h-4" />,
};

function ConstellationCard({ health }: { health: ConstellationHealth }) {
  return (
    <div className="w-[48%] bg-solar-bg rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: health.statusColor }}>
          {CONSTELLATION_ICONS[health.constellation]}
        </span>
        <span className="text-xs font-semibold text-solar-text flex-1">
          {health.constellation}
        </span>
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: health.statusColor }}
        />
      </div>

      <div className="flex items-baseline mb-2">
        <span className="text-2xl font-bold text-solar-text">{health.healthyCount}</span>
        <span className="text-xs text-solar-muted ml-0.5">/{health.totalCount} SVs</span>
      </div>

      <div className="h-1 bg-solar-border rounded-full mb-1.5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${health.healthPercentage}%`,
            backgroundColor: health.statusColor,
          }}
        />
      </div>

      <p
        className="text-[10px] font-semibold uppercase"
        style={{ color: health.statusColor }}
      >
        {health.status}
      </p>
    </div>
  );
}

export function ConstellationStatus({ status }: ConstellationStatusProps) {
  const impact = getMultiConstellationImpact(status);

  const overallColor =
    status.overallStatus === 'operational'
      ? '#22c55e'
      : status.overallStatus === 'degraded'
      ? '#fbbf24'
      : '#f59e0b';

  return (
    <div className="bg-solar-card rounded-xl p-4 mb-3">
      <div className="flex items-center gap-2 mb-4">
        <Globe2 className="w-5 h-5" style={{ color: overallColor }} />
        <span className="text-base font-semibold text-solar-text flex-1">
          GNSS Constellations
        </span>
        <span
          className="px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase"
          style={{
            backgroundColor: overallColor + '20',
            color: overallColor,
          }}
        >
          {status.overallStatus}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <ConstellationCard health={status.gps} />
        <ConstellationCard health={status.glonass} />
        <ConstellationCard health={status.galileo} />
        <ConstellationCard health={status.beidou} />
      </div>

      <div className="bg-solar-bg rounded-lg p-3 mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-solar-muted">Available SVs:</span>
          <span className="text-sm font-semibold text-solar-text">{impact.availableSvs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-solar-muted">Geometry Impact:</span>
          <span
            className="text-sm font-semibold"
            style={{ color: impact.geometryImpact === 'none' ? '#22c55e' : '#f59e0b' }}
          >
            {impact.geometryImpact}
          </span>
        </div>
      </div>

      <p className="text-sm text-solar-text leading-5 mb-3">{impact.recommendation}</p>

      <p className="text-[11px] text-solar-muted text-right">
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
