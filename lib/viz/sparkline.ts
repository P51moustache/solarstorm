import { COLORS } from '../util/colors';

export interface SparklineData {
  value: number;
  timestamp: string;
}

export interface SparklineOptions {
  width: number;
  height: number;
  strokeWidth?: number;
  color?: string;
  fillColor?: string;
  showFill?: boolean;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface SparklinePathData {
  strokePath: string;  // SVG path d attribute
  fillPath?: string;   // SVG path d attribute for area fill
  points: Array<{ x: number; y: number; value: number }>;
}

/**
 * Create SVG path strings for a sparkline chart.
 * Returns SVG-compatible path data that can be used with D3 or plain SVG.
 */
export function createSparklinePath(
  data: SparklineData[],
  options: SparklineOptions
): SparklinePathData | null {
  const {
    width,
    height,
    padding = { top: 4, right: 4, bottom: 4, left: 4 },
    showFill = true,
  } = options;

  if (data.length < 2) return null;

  try {
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min/max values for normalization
    const values = data.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    // Handle case where all values are the same
    const valueRange = maxValue - minValue || 1;

    const points: Array<{ x: number; y: number; value: number }> = [];
    let strokePath = '';
    let fillPath = '';

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const normalizedValue = (data[i].value - minValue) / valueRange;
      const y = padding.top + (1 - normalizedValue) * chartHeight;

      points.push({ x, y, value: data[i].value });

      if (i === 0) {
        strokePath = `M ${x} ${y}`;
        if (showFill) {
          fillPath = `M ${padding.left} ${padding.top + chartHeight} L ${x} ${y}`;
        }
      } else {
        strokePath += ` L ${x} ${y}`;
        if (showFill) {
          fillPath += ` L ${x} ${y}`;
        }
      }
    }

    // Complete fill path by connecting to bottom-right and back to start
    if (showFill && fillPath) {
      const lastX = padding.left + chartWidth;
      const bottomY = padding.top + chartHeight;
      fillPath += ` L ${lastX} ${bottomY} Z`;
    }

    return {
      strokePath,
      fillPath: showFill ? fillPath : undefined,
      points,
    };
  } catch (error) {
    console.error('Failed to create sparkline path:', error);
    return null;
  }
}

export function getSparklineColor(data: SparklineData[]): string {
  if (data.length === 0) return COLORS.muted;

  const latestValue = data[data.length - 1].value;

  // Color based on Kp value ranges
  if (latestValue >= 6) return COLORS.kpBands[4]; // Red
  if (latestValue >= 4) return COLORS.kpBands[3]; // Orange
  if (latestValue >= 2) return COLORS.kpBands[2]; // Yellow
  return COLORS.kpBands[1]; // Green-yellow
}

export function downsampleSparklineData(
  data: SparklineData[],
  maxPoints: number
): SparklineData[] {
  if (data.length <= maxPoints) return data;

  const step = data.length / maxPoints;
  const result: SparklineData[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.floor(i * step);
    result.push(data[index]);
  }

  // Always include the last point
  if (result[result.length - 1] !== data[data.length - 1]) {
    result[result.length - 1] = data[data.length - 1];
  }

  return result;
}
