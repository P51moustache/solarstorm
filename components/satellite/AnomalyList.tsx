'use client';

import {
  Shield,
  RefreshCw,
  Thermometer,
  Radio,
  Compass,
  Battery,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import type { SatelliteAnomaly } from '@/lib/supabase/types';

interface AnomalyListProps {
  anomalies: SatelliteAnomaly[];
  onDelete?: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#22c55e',
  moderate: '#fbbf24',
  severe: '#f59e0b',
  critical: '#dc2626',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  safe_mode: <Shield className="w-5 h-5" />,
  reboot: <RefreshCw className="w-5 h-5" />,
  sensor_error: <Thermometer className="w-5 h-5" />,
  comm_loss: <Radio className="w-5 h-5" />,
  attitude_error: <Compass className="w-5 h-5" />,
  power_anomaly: <Battery className="w-5 h-5" />,
  other: <AlertCircle className="w-5 h-5" />,
};

export function AnomalyList({ anomalies, onDelete }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <CheckCircle2 className="w-8 h-8 text-solar-emerald" />
        <p className="text-sm text-solar-muted">No anomalies logged</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {anomalies.map((anomaly) => (
        <div key={anomaly.id} className="bg-solar-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: SEVERITY_COLORS[anomaly.severity] }}>
              {TYPE_ICONS[anomaly.anomaly_type]}
            </span>
            <span className="text-sm font-semibold text-solar-text flex-1 capitalize">
              {anomaly.anomaly_type.replace('_', ' ')}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase"
              style={{
                backgroundColor: SEVERITY_COLORS[anomaly.severity] + '20',
                color: SEVERITY_COLORS[anomaly.severity],
              }}
            >
              {anomaly.severity}
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(anomaly.id)}
                className="p-1 text-solar-muted hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-solar-muted mb-2">
            {new Date(anomaly.occurred_at).toLocaleString()}
          </p>

          {anomaly.description && (
            <p className="text-sm text-solar-text mb-3 leading-5">
              {anomaly.description}
            </p>
          )}

          <div className="bg-solar-bg p-2.5 rounded-lg">
            <p className="text-[11px] text-solar-muted uppercase mb-1.5">
              Space Weather at Time:
            </p>
            <div className="flex flex-wrap gap-3">
              {anomaly.kp_at_time !== null && (
                <span className="text-xs text-solar-text font-mono">
                  Kp: {anomaly.kp_at_time.toFixed(1)}
                </span>
              )}
              {anomaly.proton_flux_at_time !== null && (
                <span className="text-xs text-solar-text font-mono">
                  Protons: {anomaly.proton_flux_at_time.toExponential(1)} pfu
                </span>
              )}
              {anomaly.electron_flux_at_time !== null && (
                <span className="text-xs text-solar-text font-mono">
                  Electrons: {anomaly.electron_flux_at_time.toExponential(1)}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
