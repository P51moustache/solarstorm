'use client';

import { useMemo } from 'react';
import {
  createSparklinePath,
  downsampleSparklineData,
  getSparklineColor,
  type SparklineData,
} from '@/lib/viz/sparkline';

interface SparklineProps {
  data: SparklineData[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  maxPoints?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 200,
  height = 60,
  strokeWidth = 2,
  maxPoints = 60,
  className = '',
}: SparklineProps) {
  const processedData = useMemo(() => {
    if (data.length === 0) return [];
    return downsampleSparklineData(data, maxPoints);
  }, [data, maxPoints]);

  const paths = useMemo(() => {
    if (processedData.length < 2) return null;

    return createSparklinePath(processedData, {
      width,
      height,
      showFill: true,
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
    });
  }, [processedData, width, height]);

  const strokeColor = useMemo(() => {
    return getSparklineColor(processedData);
  }, [processedData]);

  if (!paths || processedData.length < 2) {
    return <div className={`bg-transparent ${className}`} style={{ width, height }} />;
  }

  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`bg-transparent ${className}`} style={{ width, height }}>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        {paths.fillPath && (
          <path d={paths.fillPath} fill={`url(#${gradientId})`} />
        )}

        {/* Stroke line */}
        <path
          d={paths.strokePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
