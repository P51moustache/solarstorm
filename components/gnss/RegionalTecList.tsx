'use client';

import { MapPin } from 'lucide-react';
import { getTecCondition } from '@/lib/api/parsers/tec';
import type { RegionalTec } from '@/lib/api/parsers/tec';

interface RegionalTecListProps {
  regions: RegionalTec[];
}

export function RegionalTecList({ regions }: RegionalTecListProps) {
  if (regions.length === 0) {
    return (
      <div className="bg-solar-card rounded-xl p-6 flex flex-col items-center gap-2">
        <MapPin className="w-6 h-6 text-solar-muted" />
        <p className="text-sm font-medium text-solar-text">No regions configured</p>
        <p className="text-xs text-solar-muted">Add regions to see localized TEC data</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-solar-text mb-3">Regional TEC</h3>
      {regions.map((region) => {
        const condition = getTecCondition(region.meanTec);
        return (
          <div key={region.regionLabel} className="bg-solar-card rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-solar-text">
                {region.regionLabel}
              </span>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: condition.color }}
              />
            </div>
            <div className="flex mb-2">
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-solar-text">{region.meanTec}</p>
                <p className="text-[11px] text-solar-muted">Mean</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-solar-text">{region.maxTec}</p>
                <p className="text-[11px] text-solar-muted">Max</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-solar-text">{region.minTec}</p>
                <p className="text-[11px] text-solar-muted">Min</p>
              </div>
            </div>
            <p className="text-xs text-solar-muted text-center">{condition.description}</p>
          </div>
        );
      })}
    </div>
  );
}
