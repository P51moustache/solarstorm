'use client';

import { useMemo } from 'react';
import { getKpColor } from '@/lib/util/colors';
import { formatTimeLocal } from '@/lib/util/time';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpTrendLineProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
  showPoints?: boolean;
  className?: string;
}

export function KpTrendLine({
  data,
  width = 300,
  height = 160,
  showPoints = false,
  className = '',
}: KpTrendLineProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Take last 24 data points (2 hours of 5-min data) for smooth trending
    const recentData = data.slice(-24);

    const headerHeight = 50;
    const timeLabelsHeight = 25;
    const yAxisWidth = 30;
    const padding = 12;

    const chartWidth = width - (padding * 2) - yAxisWidth - 10;
    const chartHeight = height - headerHeight - timeLabelsHeight - (padding * 2);

    const maxKp = Math.max(5, Math.max(...recentData.map(d => d.kp)));
    const minKp = 0;

    // Calculate trend
    const trend = calculateTrend(recentData);
    const currentKp = recentData[recentData.length - 1]?.kp || 0;
    const previousKp = recentData[recentData.length - 2]?.kp || currentKp;
    const trendChange = currentKp - previousKp;

    // Generate SVG path
    const points = recentData.map((point, index) => {
      const x = (index / (recentData.length - 1)) * chartWidth;
      const y = chartHeight - ((point.kp - minKp) / (maxKp - minKp)) * chartHeight;
      return { x, y, kp: point.kp };
    });

    const pathData = points.reduce((path, point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }
      // Use smooth curves for better trend visibility
      const prevPoint = points[index - 1];
      const cpx1 = prevPoint.x + (point.x - prevPoint.x) / 3;
      const cpy1 = prevPoint.y;
      const cpx2 = point.x - (point.x - prevPoint.x) / 3;
      const cpy2 = point.y;
      return `${path} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${point.x} ${point.y}`;
    }, '');

    // Create area fill path
    const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

    return {
      recentData,
      chartWidth,
      chartHeight,
      maxKp,
      headerHeight,
      timeLabelsHeight,
      yAxisWidth,
      padding,
      trend,
      currentKp,
      trendChange,
      points,
      pathData,
      areaPath,
    };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div
        className={`bg-solar-card rounded-2xl p-3 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-solar-muted text-sm">No recent Kp data available</span>
      </div>
    );
  }

  const {
    recentData,
    chartWidth,
    chartHeight,
    maxKp,
    headerHeight,
    timeLabelsHeight,
    yAxisWidth,
    padding,
    trend,
    currentKp,
    trendChange,
    points,
    pathData,
    areaPath,
  } = chartData;

  const gradientId = `kp-gradient-${Math.random().toString(36).substr(2, 9)}`;
  const lineGradientId = `kp-line-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className={`bg-solar-card rounded-2xl p-3 overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2" style={{ height: headerHeight }}>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-solar-text">Kp Trend</h3>
          <p className="text-xs text-solar-muted mt-0.5">Last 2 hours (local time)</p>
        </div>
        <div className="text-right">
          <span
            className="text-lg font-bold"
            style={{ color: getKpColor(currentKp) }}
          >
            {currentKp.toFixed(1)}
          </span>
          <div className="flex items-center justify-end mt-0.5">
            <span
              className="text-xs mr-1"
              style={{ color: getTrendColor(trend) }}
            >
              {getTrendIcon(trend)}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: getTrendColor(trend) }}
            >
              {trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex items-center mb-2" style={{ height: chartHeight + padding }}>
        {/* Y-axis labels */}
        <div className="relative" style={{ width: yAxisWidth, height: chartHeight }}>
          {[0, 1, 2, 3, 4, 5].map(level => {
            const yPosition = chartHeight - (level / maxKp) * chartHeight;
            return (
              <div
                key={level}
                className="absolute right-1 flex items-center justify-center"
                style={{ top: yPosition - 8, height: 16 }}
              >
                <span className="text-[10px] text-solar-muted font-medium">{level}</span>
              </div>
            );
          })}
        </div>

        {/* SVG Chart */}
        <div className="ml-2" style={{ width: chartWidth, height: chartHeight }}>
          <svg width={chartWidth} height={chartHeight}>
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={getKpColor(currentKp)} stopOpacity="0.3" />
                <stop offset="100%" stopColor={getKpColor(currentKp)} stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getKpColor(recentData[0]?.kp || 0)} />
                <stop offset="100%" stopColor={getKpColor(currentKp)} />
              </linearGradient>
            </defs>

            {/* Reference grid lines */}
            {[1, 2, 3, 4, 5].map(level => (
              <path
                key={`grid-${level}`}
                d={`M 0 ${chartHeight - (level / maxKp) * chartHeight} L ${chartWidth} ${chartHeight - (level / maxKp) * chartHeight}`}
                stroke="#9AA4C2"
                strokeWidth="0.5"
                opacity="0.2"
              />
            ))}

            {/* Area fill */}
            <path d={areaPath} fill={`url(#${gradientId})`} />

            {/* Main trend line */}
            <path
              d={pathData}
              stroke={`url(#${lineGradientId})`}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points (optional) */}
            {showPoints && points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="3"
                fill={getKpColor(point.kp)}
                stroke="#111833"
                strokeWidth="1"
              />
            ))}

            {/* Current value indicator */}
            <circle
              cx={points[points.length - 1]?.x || 0}
              cy={points[points.length - 1]?.y || 0}
              r="4"
              fill={getKpColor(currentKp)}
              stroke="#111833"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      {/* Time range indicator */}
      <div
        className="flex justify-between items-center"
        style={{ height: timeLabelsHeight, paddingLeft: yAxisWidth }}
      >
        <span className="text-[10px] text-solar-muted">
          {formatTimeLocal(recentData[0]?.at)}
        </span>
        <span className="text-[10px] text-solar-muted">Now</span>
      </div>
    </div>
  );
}

function calculateTrend(data: KpHistoryData[]): 'rising' | 'falling' | 'stable' {
  if (data.length < 4) return 'stable';

  const recent = data.slice(-4);
  const first = recent[0].kp;
  const last = recent[recent.length - 1].kp;
  const diff = last - first;

  if (diff > 0.3) return 'rising';
  if (diff < -0.3) return 'falling';
  return 'stable';
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'rising': return '▲';
    case 'falling': return '▼';
    default: return '●';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'rising': return '#E7B416';
    case 'falling': return '#00D084';
    default: return '#9AA4C2';
  }
}
