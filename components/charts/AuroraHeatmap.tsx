'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import type { OvationPayload } from '@/lib/api/parsers/ovation';
import { getOvation } from '@/lib/api/swpc';
import { calculateHeatmapCircles } from '@/lib/viz/heatmap';

interface AuroraHeatmapProps {
  onPress?: () => void;
  testMode?: boolean;
  className?: string;
}

// Color scale for aurora probability (matches the heatmap calculation)
const LEGEND_COLORS = [
  { color: '#004080', label: '0%' },
  { color: '#00D084', label: '25%' },
  { color: '#E7B416', label: '50%' },
  { color: '#E45858', label: '75%+' },
];

export function AuroraHeatmap({
  onPress,
  testMode = false,
  className = '',
}: AuroraHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 280 });
  const [ovationData, setOvationData] = useState<OvationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Track container size
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch OVATION data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const data = await getOvation();
        setOvationData(data);
      } catch (error) {
        console.error('[AuroraHeatmap] Failed to fetch OVATION data:', error);
        setOvationData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const { width, height } = dimensions;

  // Calculate chart dimensions (leave space for header and legend)
  const headerHeight = 32;
  const legendHeight = 28;
  const chartHeight = Math.max(100, height - headerHeight - legendHeight - 16);
  const chartWidth = width - 16;

  // Pre-calculate circle data
  const circles = useMemo(() => {
    if (testMode || !ovationData) return null;

    return calculateHeatmapCircles(ovationData.cells, {
      width: chartWidth,
      height: chartHeight,
      cellRadius: Math.max(3, Math.min(6, chartWidth / 80)),
      latMin: 45,
      latMax: 90,
    });
  }, [ovationData, chartWidth, chartHeight, testMode]);

  // Calculate max probability for display
  const maxProbability = useMemo(() => {
    if (!ovationData?.cells || ovationData.cells.length === 0) return 0;
    return Math.max(...ovationData.cells.map(c => c.prob));
  }, [ovationData]);

  const Component = onPress ? 'button' : 'div';

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[250px] bg-[#0d1424] border border-solar-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2" style={{ height: headerHeight }}>
        <h3 className="text-sm font-semibold text-solar-text">Northern Hemisphere Aurora</h3>
        {!isLoading && maxProbability > 0 && (
          <span className="text-xs text-solar-muted">
            Peak: <span className="font-mono font-medium text-solar-text">{Math.round(maxProbability)}%</span>
          </span>
        )}
      </div>

      {/* Map */}
      <Component
        className="relative mx-2 overflow-hidden rounded-lg bg-[#0a0f1a]"
        style={{ height: chartHeight }}
        onClick={onPress}
        aria-label={onPress ? 'Aurora probability map. Click to open full screen.' : 'Aurora probability map'}
      >
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="aurora-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
            <linearGradient id="legend-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#004080" />
              <stop offset="33%" stopColor="#00D084" />
              <stop offset="66%" stopColor="#E7B416" />
              <stop offset="100%" stopColor="#E45858" />
            </linearGradient>
          </defs>

          {testMode || !circles ? (
            <>
              <defs>
                <linearGradient id="test-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#004080" />
                  <stop offset="50%" stopColor="#00D084" />
                  <stop offset="100%" stopColor="#E7B416" />
                </linearGradient>
              </defs>
              <rect x={0} y={0} width={chartWidth} height={chartHeight} fill="url(#test-gradient)" opacity="0.5" />
            </>
          ) : (
            <g filter="url(#aurora-blur)">
              {circles.map((circle, i) => (
                <circle
                  key={i}
                  cx={circle.x}
                  cy={circle.y}
                  r={circle.r}
                  fill={circle.color}
                />
              ))}
            </g>
          )}

          {/* Latitude bands (visual reference) */}
          {[0.33, 0.66].map((ratio, i) => (
            <line
              key={`lat-${i}`}
              x1={0}
              y1={ratio * chartHeight}
              x2={chartWidth}
              y2={ratio * chartHeight}
              stroke="#6B7280"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity="0.3"
            />
          ))}
        </svg>

        {/* Region labels */}
        <div className="absolute inset-0 pointer-events-none">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">
            N. America
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 top-2 text-[10px] text-gray-500 font-medium">
            Europe
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-medium">
            Asia
          </span>
          {/* Latitude indicators */}
          <span className="absolute right-2 bottom-2 text-[9px] text-gray-600">45°N</span>
          <span className="absolute right-2 top-2 text-[9px] text-gray-600">90°N</span>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-solar-bg/50">
            <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </Component>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 px-4 py-2" style={{ height: legendHeight }}>
        <span className="text-[10px] text-solar-muted">Probability:</span>
        <div className="flex items-center gap-2">
          {LEGEND_COLORS.map((item, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-solar-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
