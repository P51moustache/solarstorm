'use client';

import { useMemo } from 'react';
import { getKpColor } from '@/lib/util/colors';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpMiniTrendProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
  className?: string;
}

export function KpMiniTrend({
  data,
  width = 150,
  height = 80,
  className = '',
}: KpMiniTrendProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Take last 12 data points for a compact trend
    const recentData = data.slice(-12);
    const padding = 8;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 20; // Leave room for label

    const maxKp = Math.max(5, Math.max(...recentData.map(d => d.kp)));
    const currentKp = recentData[recentData.length - 1]?.kp || 0;

    // Generate SVG path
    const points = recentData.map((point, index) => {
      const x = padding + (index / (recentData.length - 1)) * chartWidth;
      const y = padding + 20 + (1 - point.kp / maxKp) * chartHeight;
      return { x, y, kp: point.kp };
    });

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, '');

    return { recentData, points, pathData, currentKp, chartWidth, chartHeight, padding };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div
        className={`bg-solar-card rounded-xl flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-solar-muted text-xs">No data</span>
      </div>
    );
  }

  const { points, pathData, currentKp, padding } = chartData;
  const gradientId = `mini-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className={`bg-solar-card rounded-xl p-2 ${className}`}
      style={{ width, height }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-solar-text">Trend</span>
        <span
          className="text-sm font-bold"
          style={{ color: getKpColor(currentKp) }}
        >
          {currentKp.toFixed(1)}
        </span>
      </div>
      <svg width={width - 16} height={height - 36}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={getKpColor(currentKp)} stopOpacity="0.3" />
            <stop offset="100%" stopColor={getKpColor(currentKp)} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${pathData} L ${points[points.length - 1]?.x || 0} ${height - 36 - padding} L ${points[0]?.x || 0} ${height - 36 - padding} Z`}
          fill={`url(#${gradientId})`}
        />

        {/* Line */}
        <path
          d={pathData}
          stroke={getKpColor(currentKp)}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current point */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="3"
            fill={getKpColor(currentKp)}
          />
        )}
      </svg>
    </div>
  );
}
