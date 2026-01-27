'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CloudOff } from 'lucide-react';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { getHistoricalData } from '@/lib/api/historical';
import type { HistoricalSummary } from '@/lib/api/parsers/historical';

type MetricType = 'kp' | 'bz' | 'speed';

export function HistoricalExplorer() {
  const [data, setData] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('kp');

  useEffect(() => {
    getHistoricalData()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const getKpColor = (kp: number) => {
    if (kp >= 7) return '#ef4444';
    if (kp >= 5) return '#f97316';
    if (kp >= 4) return '#eab308';
    return '#22c55e';
  };

  const getBzColor = (bz: number) => {
    if (bz < -10) return '#ef4444';
    if (bz < -5) return '#f97316';
    if (bz < 0) return '#eab308';
    return '#22c55e';
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 600) return '#ef4444';
    if (speed >= 500) return '#f97316';
    if (speed >= 400) return '#eab308';
    return '#22c55e';
  };

  const renderChart = () => {
    if (!data) return null;

    const chartData = data.data.filter((d) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp !== null;
        case 'bz':
          return d.bz !== null;
        case 'speed':
          return d.speed !== null;
      }
    });

    const getValue = (d: (typeof chartData)[0]) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp ?? 0;
        case 'bz':
          return d.bz ?? 0;
        case 'speed':
          return d.speed ?? 0;
      }
    };

    const maxValue = Math.max(...chartData.map(getValue), 1);
    const minValue = Math.min(...chartData.map(getValue), 0);

    return (
      <div className="mb-2">
        <div className="flex items-end h-24 gap-0.5">
          {chartData.map((d, i) => {
            const value = getValue(d);
            const normalizedHeight =
              selectedMetric === 'bz'
                ? (Math.abs(value) / Math.max(Math.abs(minValue), maxValue)) * 100
                : (value / maxValue) * 100;

            let color: string;
            switch (selectedMetric) {
              case 'kp':
                color = getKpColor(value);
                break;
              case 'bz':
                color = getBzColor(value);
                break;
              case 'speed':
                color = getSpeedColor(value);
                break;
            }

            return (
              <div
                key={i}
                className="flex-1 rounded-sm min-h-[4px]"
                style={{
                  height: `${Math.max(4, normalizedHeight)}%`,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-solar-muted">30 days ago</span>
          <span className="text-xs text-solar-muted">Today</span>
        </div>
      </div>
    );
  };

  return (
    <FeatureGate feature="historicalData">
      <div className="min-h-screen gradient-bg p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-6 h-6 text-solar-emerald" />
          <h1 className="text-2xl font-bold text-solar-text flex-1">Historical Data</h1>
          {isLoading && (
            <div className="w-5 h-5 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {data && (
          <>
            {/* Metric Selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'kp', label: 'Kp Index' },
                { key: 'bz', label: 'Bz' },
                { key: 'speed', label: 'Solar Wind' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedMetric(key as MetricType)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === key
                      ? 'bg-solar-emerald/30 text-solar-emerald'
                      : 'bg-solar-card text-solar-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div className="bg-solar-card rounded-xl p-4 mb-4">
              <h2 className="text-base font-semibold text-solar-text mb-4">
                {selectedMetric === 'kp' && '30-Day Kp Index'}
                {selectedMetric === 'bz' && '30-Day Bz (IMF)'}
                {selectedMetric === 'speed' && '30-Day Solar Wind Speed'}
              </h2>
              {renderChart()}
            </div>

            {/* Stats */}
            <div className="bg-solar-card rounded-xl p-4 mb-4">
              <h2 className="text-base font-semibold text-solar-text mb-4">30-Day Summary</h2>
              <div className="grid grid-cols-3 gap-3">
                <StatItem label="Avg Kp" value={String(data.stats.avgKp)} color={getKpColor(data.stats.avgKp)} />
                <StatItem label="Max Kp" value={String(data.stats.maxKp)} color={getKpColor(data.stats.maxKp)} />
                <StatItem
                  label="Storm Days"
                  value={String(data.stats.stormDays)}
                  color={data.stats.stormDays > 0 ? '#f97316' : '#22c55e'}
                  subtitle="Kp ≥ 5"
                />
                <StatItem label="Min Bz" value={`${data.stats.minBz} nT`} color={getBzColor(data.stats.minBz)} />
                <StatItem label="Avg Speed" value={`${data.stats.avgSpeed} km/s`} color={getSpeedColor(data.stats.avgSpeed)} />
                <StatItem label="Max Speed" value={`${data.stats.maxSpeed} km/s`} color={getSpeedColor(data.stats.maxSpeed)} />
              </div>
            </div>

            {/* Recent Notable Events */}
            <div className="bg-solar-card rounded-xl p-4">
              <h2 className="text-base font-semibold text-solar-text mb-3">Recent Notable Events</h2>
              {data.data
                .filter((d) => d.kp !== null && d.kp >= 5)
                .slice(-5)
                .reverse()
                .map((event, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-solar-border last:border-0">
                    <span
                      className="px-2.5 py-1 rounded text-sm font-semibold"
                      style={{
                        backgroundColor: getKpColor(event.kp!) + '30',
                        color: getKpColor(event.kp!),
                      }}
                    >
                      Kp {event.kp}
                    </span>
                    <span className="text-sm text-solar-text">
                      {new Date(event.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              {data.data.filter((d) => d.kp !== null && d.kp >= 5).length === 0 && (
                <p className="text-sm text-solar-muted text-center py-4">
                  No geomagnetic storms (Kp ≥ 5) in the past 30 days
                </p>
              )}
            </div>
          </>
        )}

        {!isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CloudOff className="w-12 h-12 text-solar-muted" />
            <p className="text-base text-solar-muted">Unable to load historical data</p>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

function StatItem({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-solar-muted mb-1">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>
        {value}
      </p>
      {subtitle && <p className="text-[10px] text-solar-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}
