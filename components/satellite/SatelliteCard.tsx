'use client';

import { Rocket, Trash2 } from 'lucide-react';
import type { Satellite } from '@/lib/supabase/types';
import type { DragRiskAssessment } from '@/lib/services/dragRisk';

interface SatelliteCardProps {
  satellite: Satellite;
  dragRisk?: DragRiskAssessment;
  onPress: () => void;
  onDelete?: () => void;
}

const orbitColors: Record<string, string> = {
  LEO: '#3b82f6',
  MEO: '#8b5cf6',
  GEO: '#f59e0b',
  HEO: '#ec4899',
};

export function SatelliteCard({ satellite, dragRisk, onPress, onDelete }: SatelliteCardProps) {
  const orbitColor = orbitColors[satellite.orbit_type] || '#888';

  return (
    <button
      className="w-full bg-solar-card rounded-xl p-4 mb-3 text-left hover:bg-opacity-80 transition-colors"
      onClick={onPress}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-base font-semibold text-solar-text">{satellite.name}</span>
          {satellite.is_orbit_raising && (
            <span className="flex items-center gap-1 bg-amber-500/20 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-500">
              <Rocket className="w-3 h-3" />
              Orbit Raising
            </span>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-solar-muted hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span
            className="px-2 py-1 rounded text-xs font-bold"
            style={{ backgroundColor: orbitColor + '20', color: orbitColor }}
          >
            {satellite.orbit_type}
          </span>
          <span className="text-sm text-solar-muted">
            {satellite.altitude_km.toFixed(0)} km • {satellite.inclination_deg.toFixed(1)}°
          </span>
        </div>

        {satellite.norad_id && (
          <span className="text-xs text-solar-muted font-mono">
            NORAD: {satellite.norad_id}
          </span>
        )}
      </div>

      {dragRisk && satellite.orbit_type === 'LEO' && (
        <div
          className="flex items-center mt-3 p-2.5 rounded-lg gap-2"
          style={{ backgroundColor: dragRisk.color + '15' }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: dragRisk.color }}
          />
          <span
            className="text-xs font-semibold flex-1"
            style={{ color: dragRisk.color }}
          >
            {dragRisk.riskLevel.toUpperCase()} drag risk
          </span>
          <span className="text-xs text-solar-muted">
            {dragRisk.densityIncreaseFactor}x density
          </span>
        </div>
      )}
    </button>
  );
}
