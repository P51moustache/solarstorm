'use client';

import { AlertTriangle } from 'lucide-react';
import { getAlertLevel, isRecentAlert, type SwpcAlert } from '@/lib/api/parsers/alerts';

interface AlertBannerProps {
  alerts: SwpcAlert[];
  onPress?: (alert: SwpcAlert) => void;
}

function getAlertSeverity(level: string | null): 'warning' | 'watch' | 'info' {
  if (!level) return 'info';
  if (['G3', 'G4', 'G5'].includes(level)) return 'warning';
  if (['G1', 'G2', 'K4'].includes(level)) return 'watch';
  return 'info';
}

export function AlertBanner({ alerts, onPress }: AlertBannerProps) {
  // Filter for recent and significant alerts
  const significantAlerts = alerts
    .filter((a) => isRecentAlert(a) && getAlertSeverity(getAlertLevel(a.message)) !== 'info')
    .slice(0, 3);

  if (significantAlerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {significantAlerts.map((alert, index) => {
        const level = getAlertSeverity(getAlertLevel(alert.message));
        const bgColor =
          level === 'warning'
            ? 'bg-aurora-high/20'
            : level === 'watch'
            ? 'bg-kp-moderate/20'
            : 'bg-solar-emerald/20';
        const borderColor =
          level === 'warning'
            ? 'border-aurora-high'
            : level === 'watch'
            ? 'border-kp-moderate'
            : 'border-solar-emerald';
        const textColor =
          level === 'warning'
            ? 'text-aurora-high'
            : level === 'watch'
            ? 'text-kp-moderate'
            : 'text-solar-emerald';

        return (
          <button
            key={index}
            onClick={() => onPress?.(alert)}
            className={`w-full ${bgColor} border ${borderColor} rounded-xl p-3 flex items-start gap-3 text-left transition-opacity hover:opacity-80`}
          >
            <AlertTriangle className={`w-5 h-5 ${textColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${textColor}`}>
                {getAlertLevel(alert.message) || 'Alert'}
              </p>
              <p className="text-xs text-solar-muted line-clamp-2 mt-0.5">
                {alert.message.slice(0, 100)}...
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
