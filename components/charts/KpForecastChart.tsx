'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { getKpColor } from '@/lib/util/colors';
import type { KpForecastData } from '@/lib/api/swpc';

interface KpForecastChartProps {
  data: KpForecastData;
  height?: number;
  className?: string;
}

export function KpForecastChart({
  data,
  height = 280,
  className = '',
}: KpForecastChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(350);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  const chartData = useMemo(() => {
    if (!data || data.hourlyForecast.length === 0 || data.days.length === 0) return null;

    const headerHeight = 55;
    const legendHeight = 35;
    const timeLabelsHeight = 40;
    const yAxisWidth = 28;
    const padding = 12;

    const chartWidth = Math.max(100, width - (padding * 2) - yAxisWidth - 10);
    const chartHeight = height - headerHeight - legendHeight - timeLabelsHeight - (padding * 2);

    const maxKp = 9;
    const minKp = 0;

    const forecast = data.hourlyForecast;

    const barWidth = (chartWidth / forecast.length) * 0.7;
    const barGap = (chartWidth / forecast.length) * 0.3;

    const bars = forecast.map((point, index) => {
      const x = (index * (chartWidth / forecast.length)) + (barGap / 2);
      const barHeight = ((point.kp - minKp) / (maxKp - minKp)) * chartHeight;
      const y = chartHeight - barHeight;
      return {
        x,
        y,
        width: barWidth,
        height: barHeight,
        kp: point.kp,
        time: point.time,
      };
    });

    const numDays = data.days.length;
    const barsPerDay = Math.ceil(forecast.length / numDays);
    const daySeparators: number[] = [];
    for (let i = 1; i < numDays; i++) {
      daySeparators.push((i * barsPerDay) * (chartWidth / forecast.length));
    }

    const peakKp = Math.max(...forecast.map(f => f.kp));

    return {
      chartWidth,
      chartHeight,
      headerHeight,
      legendHeight,
      timeLabelsHeight,
      yAxisWidth,
      padding,
      bars,
      daySeparators,
      peakKp,
      days: data.days,
      probabilities: data.probabilities,
    };
  }, [data, width, height]);

  if (!chartData) {
    return (
      <div
        ref={containerRef}
        className={`bg-[#0d1424] border border-solar-border rounded-lg p-4 flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <span className="text-solar-muted text-sm">No forecast data available</span>
      </div>
    );
  }

  const {
    chartWidth,
    chartHeight,
    headerHeight,
    legendHeight,
    timeLabelsHeight,
    yAxisWidth,
    bars,
    daySeparators,
    peakKp,
    days,
    probabilities,
  } = chartData;

  const maxStormProb = Math.max(...probabilities.minorStorm);

  return (
    <div
      ref={containerRef}
      className={`bg-[#0d1424] border border-solar-border rounded-lg p-4 ${className}`}
      style={{ height }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3" style={{ height: headerHeight }}>
        <div>
          <h3 className="text-sm font-semibold text-solar-text">3-Day Kp Forecast</h3>
          <p className="text-xs text-solar-muted mt-1">
            NOAA Space Weather Prediction Center
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-solar-muted">Peak</span>
            <span className="text-xl font-bold font-mono" style={{ color: getKpColor(peakKp) }}>
              {peakKp.toFixed(1)}
            </span>
          </div>
          <div className="mt-1">
            {maxStormProb >= 30 ? (
              <span className="text-xs text-yellow-400 font-medium">
                Storm likely ({maxStormProb}%)
              </span>
            ) : maxStormProb >= 10 ? (
              <span className="text-xs text-solar-muted">
                Storm possible ({maxStormProb}%)
              </span>
            ) : (
              <span className="text-xs text-solar-emerald">
                Quiet conditions
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex items-end" style={{ height: chartHeight }}>
        {/* Y-axis labels */}
        <div className="relative flex-shrink-0" style={{ width: yAxisWidth, height: chartHeight }}>
          {[0, 3, 6, 9].map(level => {
            const yPosition = chartHeight - (level / 9) * chartHeight;
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
        <div className="flex-1 ml-2">
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            {/* Reference grid lines */}
            {[3, 5, 7, 9].map(level => (
              <path
                key={`grid-${level}`}
                d={`M 0 ${chartHeight - (level / 9) * chartHeight} L ${chartWidth} ${chartHeight - (level / 9) * chartHeight}`}
                stroke="#9AA4C2"
                strokeWidth="0.5"
                opacity="0.15"
              />
            ))}

            {/* Day separators */}
            {daySeparators.map((x, i) => (
              <path
                key={`sep-${i}`}
                d={`M ${x} 0 L ${x} ${chartHeight}`}
                stroke="#9AA4C2"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
            ))}

            {/* Storm threshold lines */}
            <path
              d={`M 0 ${chartHeight - (5 / 9) * chartHeight} L ${chartWidth} ${chartHeight - (5 / 9) * chartHeight}`}
              stroke="#E7B416"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.4"
            />

            {/* Bars */}
            {bars.map((bar, index) => (
              <rect
                key={index}
                x={bar.x}
                y={bar.y}
                width={Math.max(2, bar.width)}
                height={Math.max(1, bar.height)}
                fill={getKpColor(bar.kp)}
                rx="1"
                opacity="0.9"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Day labels */}
      <div
        className="flex justify-around items-center mt-2"
        style={{ height: timeLabelsHeight, paddingLeft: yAxisWidth }}
      >
        {days.map((day, i) => (
          <div key={i} className="text-center flex-1">
            <span className="text-xs font-medium text-solar-text">{day}</span>
            <div className="text-[10px] text-solar-muted mt-1">
              {probabilities.minorStorm[i] ?? 0}% storm
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center gap-4 border-t border-solar-border pt-3 mt-2"
        style={{ height: legendHeight }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-solar-emerald" />
          <span className="text-[10px] text-solar-muted">Quiet (&lt;4)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E7B416' }} />
          <span className="text-[10px] text-solar-muted">Active (4-5)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E45858' }} />
          <span className="text-[10px] text-solar-muted">Storm (&gt;5)</span>
        </div>
      </div>
    </div>
  );
}
