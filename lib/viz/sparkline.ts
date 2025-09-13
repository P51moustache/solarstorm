import { Skia, SkPath } from '@shopify/react-native-skia';
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

export function createSparklinePath(
  data: SparklineData[],
  options: SparklineOptions
): { strokePath: SkPath; fillPath?: SkPath } | null {
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

    // Create stroke path
    const strokePath = Skia.Path.Make();
    
    // Create fill path if needed
    const fillPath = showFill ? Skia.Path.Make() : undefined;

    for (let i = 0; i < data.length; i++) {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const normalizedValue = (data[i].value - minValue) / valueRange;
      const y = padding.top + (1 - normalizedValue) * chartHeight;

      if (i === 0) {
        strokePath.moveTo(x, y);
        if (fillPath) {
          fillPath.moveTo(padding.left, padding.top + chartHeight); // Start at bottom-left
          fillPath.lineTo(x, y);
        }
      } else {
        strokePath.lineTo(x, y);
        if (fillPath) {
          fillPath.lineTo(x, y);
        }
      }
    }

    // Complete fill path by connecting to bottom-right and back to start
    if (fillPath) {
      const lastX = padding.left + chartWidth;
      const bottomY = padding.top + chartHeight;
      fillPath.lineTo(lastX, bottomY);
      fillPath.close();
    }

    return {
      strokePath,
      fillPath,
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
