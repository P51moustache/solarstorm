'use client';

import { useState } from 'react';
import {
  X,
  Shield,
  RefreshCw,
  Thermometer,
  Radio,
  Compass,
  Battery,
  AlertCircle,
  Info,
} from 'lucide-react';
import type { AnomalyType, AnomalySeverity } from '@/lib/supabase/types';

interface AnomalyLoggerProps {
  visible: boolean;
  satelliteId: string;
  satelliteName: string;
  onClose: () => void;
  onLog: (anomaly: {
    satellite_id: string;
    anomaly_type: AnomalyType;
    severity: AnomalySeverity;
    description: string | null;
    occurred_at: string;
  }) => void;
}

const ANOMALY_TYPES: { value: AnomalyType; label: string; icon: React.ReactNode }[] = [
  { value: 'safe_mode', label: 'Safe Mode', icon: <Shield className="w-5 h-5" /> },
  { value: 'reboot', label: 'Reboot', icon: <RefreshCw className="w-5 h-5" /> },
  { value: 'sensor_error', label: 'Sensor Error', icon: <Thermometer className="w-5 h-5" /> },
  { value: 'comm_loss', label: 'Comm Loss', icon: <Radio className="w-5 h-5" /> },
  { value: 'attitude_error', label: 'Attitude Error', icon: <Compass className="w-5 h-5" /> },
  { value: 'power_anomaly', label: 'Power Anomaly', icon: <Battery className="w-5 h-5" /> },
  { value: 'other', label: 'Other', icon: <AlertCircle className="w-5 h-5" /> },
];

const SEVERITIES: { value: AnomalySeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', color: '#fbbf24' },
  { value: 'severe', label: 'Severe', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

export function AnomalyLogger({
  visible,
  satelliteId,
  satelliteName,
  onClose,
  onLog,
}: AnomalyLoggerProps) {
  const [type, setType] = useState<AnomalyType>('safe_mode');
  const [severity, setSeverity] = useState<AnomalySeverity>('moderate');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  const handleLog = () => {
    onLog({
      satellite_id: satelliteId,
      anomaly_type: type,
      severity,
      description: description || null,
      occurred_at: new Date(occurredAt).toISOString(),
    });

    // Reset
    setType('safe_mode');
    setSeverity('moderate');
    setDescription('');
    setOccurredAt(new Date().toISOString().slice(0, 16));
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-solar-bg rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-solar-border">
          <h2 className="text-lg font-semibold text-solar-text">Log Anomaly</h2>
          <button onClick={onClose} className="text-solar-text hover:text-solar-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-sm text-solar-muted px-5 pt-3">{satelliteName}</p>

        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-5">
          <div>
            <label className="block text-sm font-medium text-solar-text mb-2.5">
              Anomaly Type
            </label>
            <div className="flex flex-wrap gap-2">
              {ANOMALY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    type === t.value
                      ? 'bg-solar-emerald/20 border-solar-emerald text-solar-emerald'
                      : 'bg-solar-card border-solar-border text-solar-muted'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2.5">
              Severity
            </label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    severity === s.value
                      ? 'border-current'
                      : 'bg-solar-card border-solar-border text-solar-muted'
                  }`}
                  style={
                    severity === s.value
                      ? { backgroundColor: s.color + '20', color: s.color, borderColor: s.color }
                      : {}
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">
              When did this occur?
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text focus:outline-none focus:border-solar-emerald"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? Any telemetry notes?"
              rows={4}
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald resize-none"
            />
          </div>

          <div className="flex items-start gap-2.5 bg-solar-emerald/10 p-3 rounded-lg">
            <Info className="w-5 h-5 text-solar-emerald flex-shrink-0" />
            <p className="text-sm text-solar-emerald leading-5">
              Space weather conditions at the time of the anomaly will be automatically
              recorded for correlation analysis.
            </p>
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={handleLog}
            className="w-full bg-solar-emerald text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-colors"
          >
            Log Anomaly
          </button>
        </div>
      </div>
    </div>
  );
}
