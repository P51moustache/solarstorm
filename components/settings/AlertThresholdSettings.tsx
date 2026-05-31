'use client';

import { useEffect, useState } from 'react';
import { Bell, RotateCcw, Check, AlertTriangle, Clock } from 'lucide-react';
import { useAlertConfigStore } from '@/lib/state/useAlertConfigStore';
import { sendTestNotification, requestNotificationPermission } from '@/lib/services/alertNotifications';

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  colorScale?: 'kp' | 'bz' | 'speed';
}

function Slider({
  label,
  description,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  formatValue,
  colorScale,
}: SliderProps) {
  const displayValue = formatValue ? formatValue(value) : value.toString();
  const percentage = ((value - min) / (max - min)) * 100;

  const getTrackColor = () => {
    if (!colorScale) return '#00D084';

    if (colorScale === 'kp') {
      if (value >= 7) return '#dc2626';
      if (value >= 5) return '#f59e0b';
      if (value >= 4) return '#eab308';
      return '#22c55e';
    }

    if (colorScale === 'bz') {
      // More negative = better for aurora = green
      if (value <= -10) return '#22c55e';
      if (value <= -5) return '#84cc16';
      if (value <= -2) return '#eab308';
      return '#f59e0b';
    }

    if (colorScale === 'speed') {
      if (value >= 700) return '#dc2626';
      if (value >= 500) return '#f59e0b';
      if (value >= 400) return '#eab308';
      return '#22c55e';
    }

    return '#00D084';
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-solar-text">{label}</p>
          <p className="text-xs text-solar-muted">{description}</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-solar-text">{displayValue}</span>
          <span className="text-sm text-solar-muted ml-1">{unit}</span>
        </div>
      </div>
      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${getTrackColor()} 0%, ${getTrackColor()} ${percentage}%, #1E2347 ${percentage}%, #1E2347 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-solar-muted mt-1">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
}

function TimePickerInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex-1">
      <label className="block text-xs text-solar-muted mb-1">{label}</label>
      <input
        type="time"
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-[#0a0f1a] border border-solar-border rounded-lg px-3 py-2 text-sm text-solar-text focus:outline-none focus:border-solar-emerald"
      />
    </div>
  );
}

export function AlertThresholdSettings() {
  const { config, isLoading, error, fetchConfig, updateConfig, resetToDefaults } = useAlertConfigStore();
  const [localConfig, setLocalConfig] = useState<{
    kp_threshold: number;
    bz_threshold: number;
    speed_threshold: number;
    quiet_start: string | null;
    quiet_end: string | null;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setLocalConfig({
        kp_threshold: config.kp_threshold,
        bz_threshold: config.bz_threshold ?? -5,
        speed_threshold: 500, // Default, can add to schema later
        quiet_start: config.quiet_start,
        quiet_end: config.quiet_end,
      });
    }
  }, [config]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleSave = async () => {
    if (!localConfig) return;

    setIsSaving(true);
    setSaveSuccess(false);

    await updateConfig({
      kp_threshold: localConfig.kp_threshold,
      bz_threshold: localConfig.bz_threshold,
      quiet_start: localConfig.quiet_start,
      quiet_end: localConfig.quiet_end,
    });

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleReset = async () => {
    await resetToDefaults();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission !== 'granted') return;
    }
    await sendTestNotification();
  };

  const hasChanges = config && localConfig && (
    config.kp_threshold !== localConfig.kp_threshold ||
    (config.bz_threshold ?? -5) !== localConfig.bz_threshold ||
    config.quiet_start !== localConfig.quiet_start ||
    config.quiet_end !== localConfig.quiet_end
  );

  if (isLoading && !config) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-6">
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!localConfig) return null;

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-solar-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-solar-emerald/20 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-solar-emerald" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-solar-text">Alert Thresholds</h3>
            <p className="text-xs text-solar-muted">Customize when you receive alerts</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-solar-muted hover:text-solar-text transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Kp Threshold */}
        <Slider
          label="Kp Index Threshold"
          description="Alert when Kp reaches this level"
          value={localConfig.kp_threshold}
          min={1}
          max={9}
          step={1}
          unit=""
          colorScale="kp"
          onChange={(value) => setLocalConfig({ ...localConfig, kp_threshold: value })}
        />

        {/* Bz Threshold */}
        <Slider
          label="Bz Threshold"
          description="Alert when Bz drops below this (more negative = better aurora)"
          value={localConfig.bz_threshold}
          min={-20}
          max={0}
          step={1}
          unit="nT"
          colorScale="bz"
          onChange={(value) => setLocalConfig({ ...localConfig, bz_threshold: value })}
        />

        {/* Solar Wind Speed Threshold */}
        <Slider
          label="Solar Wind Speed"
          description="Alert when solar wind exceeds this speed"
          value={localConfig.speed_threshold}
          min={300}
          max={800}
          step={50}
          unit="km/s"
          colorScale="speed"
          onChange={(value) => setLocalConfig({ ...localConfig, speed_threshold: value })}
        />

        {/* Quiet Hours */}
        <div className="pt-4 border-t border-solar-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-solar-muted" />
            <p className="text-sm font-medium text-solar-text">Quiet Hours</p>
          </div>
          <p className="text-xs text-solar-muted mb-3">
            No alerts will be sent during these hours (local time)
          </p>
          <div className="flex gap-4">
            <TimePickerInput
              label="Start"
              value={localConfig.quiet_start}
              onChange={(value) => setLocalConfig({ ...localConfig, quiet_start: value })}
            />
            <TimePickerInput
              label="End"
              value={localConfig.quiet_end}
              onChange={(value) => setLocalConfig({ ...localConfig, quiet_end: value })}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t border-solar-border flex items-center justify-between">
          <button
            onClick={handleTestNotification}
            className="text-sm text-solar-muted hover:text-solar-text transition-colors"
          >
            Send Test Alert
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              hasChanges
                ? 'bg-solar-emerald text-white hover:bg-solar-emerald/80'
                : 'bg-solar-border text-solar-muted cursor-not-allowed'
            }`}
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
