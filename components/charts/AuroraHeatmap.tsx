'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OvationPayload } from '@/lib/api/parsers/ovation';
import { getOvation } from '@/lib/api/swpc';
import { calculateHeatmapCircles } from '@/lib/viz/heatmap';

interface AuroraHeatmapProps {
  width?: number;
  height?: number;
  onPress?: () => void;
  testMode?: boolean;
  className?: string;
}

export function AuroraHeatmap({
  width = 300,
  height = 200,
  onPress,
  testMode = false,
  className = '',
}: AuroraHeatmapProps) {
  const [ovationData, setOvationData] = useState<OvationPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Pre-calculate circle data
  const circles = useMemo(() => {
    if (testMode || !ovationData) return null;

    return calculateHeatmapCircles(ovationData.cells, {
      width,
      height,
      cellRadius: 5,
      latMin: 45,
      latMax: 90,
    });
  }, [ovationData, width, height, testMode]);

  const Component = onPress ? 'button' : 'div';

  return (
    <Component
      className={`relative overflow-hidden rounded-2xl bg-solar-card shadow-card ${className}`}
      style={{ width, height }}
      onClick={onPress}
      aria-label={onPress ? 'Aurora probability map. Click to open full screen.' : 'Aurora probability map'}
    >
      <div className="flex-1">
        <svg width={width} height={height} className="pointer-events-none">
          <defs>
            <filter id="aurora-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
            </filter>
          </defs>

          {testMode || !circles ? (
            // Test gradient when no data
            <defs>
              <linearGradient id="test-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#004080" />
                <stop offset="50%" stopColor="#00D084" />
                <stop offset="100%" stopColor="#E7B416" />
              </linearGradient>
            </defs>
          ) : null}

          {testMode || !circles ? (
            <rect x={0} y={0} width={width} height={height} fill="url(#test-gradient)" />
          ) : (
            // Render aurora circles with blur
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
        </svg>
      </div>

      {/* Overlay grid lines for geographic reference */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Latitude lines */}
        {[0.25, 0.5, 0.75].map((ratio, index) => (
          <div
            key={`lat-${index}`}
            className="absolute w-full h-px bg-solar-border opacity-30"
            style={{ top: `${ratio * 100}%` }}
          />
        ))}

        {/* Longitude lines */}
        {[0.25, 0.5, 0.75].map((ratio, index) => (
          <div
            key={`lon-${index}`}
            className="absolute h-full w-px bg-solar-border opacity-30"
            style={{ left: `${ratio * 100}%` }}
          />
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-solar-bg/50">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </Component>
  );
}
