'use client';

import { useEffect, useState } from 'react';
import { getSfiTrend } from '@/lib/api/solarFlux';
import type { SfiTrend } from '@/lib/api/parsers/solarFlux';

interface SfiTrendChartProps {
  className?: string;
}

export function SfiTrendChart({ className = '' }: SfiTrendChartProps) {
  const [trend, setTrend] = useState<SfiTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getSfiTrend();
        setTrend(data);
      } catch (error) {
        console.error('Failed to fetch SFI trend:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-solar-card rounded-2xl p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!trend) {
    return (
      <div className={`bg-solar-card rounded-2xl p-4 ${className}`}>
        <h3 className="text-base font-semibold text-solar-text mb-2">Solar Flux Index</h3>
        <p className="text-solar-muted text-sm">Unable to load SFI data</p>
      </div>
    );
  }

  const { current, average30day, trend: trendDirection, history } = trend;
  const maxValue = Math.max(...history.map((d) => d.f107), 200);

  return (
    <div className={`bg-solar-card rounded-2xl p-4 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-base font-semibold text-solar-text">Solar Flux Index</h3>
          <p className="text-xs text-solar-muted mt-1">F10.7 cm Radio Flux</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-solar-text">{current}</span>
          <span className="text-sm text-solar-muted ml-1">SFU</span>
          <div className="flex items-center justify-end mt-1">
            <span
              className={`text-xs ${
                trendDirection === 'rising'
                  ? 'text-aurora-high'
                  : trendDirection === 'falling'
                  ? 'text-solar-emerald'
                  : 'text-solar-muted'
              }`}
            >
              {trendDirection === 'rising' ? '▲' : trendDirection === 'falling' ? '▼' : '●'}
            </span>
            <span className="text-xs text-solar-muted ml-1">30d avg: {average30day}</span>
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-24 flex items-end gap-0.5">
        {history.slice(0, 14).map((point, index) => {
          const heightPercent = (point.f107 / maxValue) * 100;
          const isLast = index === 0;

          return (
            <div
              key={index}
              className="flex-1 rounded-t transition-all duration-300"
              style={{
                height: `${heightPercent}%`,
                backgroundColor: isLast ? '#00D084' : '#1E2347',
                minHeight: '4px',
              }}
              title={`${point.timestamp}: ${point.f107} SFU`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-solar-muted">14 days ago</span>
        <span className="text-[10px] text-solar-muted">Today</span>
      </div>

      {/* Conditions interpretation */}
      <div className="mt-4 pt-3 border-t border-solar-border">
        <p className="text-xs text-solar-muted">
          {current >= 150
            ? 'High solar activity - Good HF propagation'
            : current >= 100
            ? 'Moderate solar activity'
            : 'Low solar activity - Reduced HF propagation'}
        </p>
      </div>
    </div>
  );
}
