import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, getKpColor } from '../lib/util/colors';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpSimpleLineProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
}

export function KpSimpleLine({ data, width = 300, height = 100 }: KpSimpleLineProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No recent Kp data available</Text>
      </View>
    );
  }

  // Take last 20 data points for clean visualization
  const recentData = data.slice(-20);
  const currentKp = recentData[recentData.length - 1]?.kp || 0;
  
  // Calculate trend
  const trend = calculateTrend(recentData);
  const change = recentData.length > 1 ? 
    currentKp - recentData[recentData.length - 4]?.kp || 0 : 0;
  
  // Chart dimensions with proper spacing
  const padding = SPACING.lg;
  const chartWidth = width - padding * 2;
  const chartHeight = height - 50; // Space for header
  const maxKp = Math.max(4, Math.max(...recentData.map(d => d.kp)));
  
  // Generate path
  const points = recentData.map((point, index) => {
    const x = (index / (recentData.length - 1)) * chartWidth;
    const y = chartHeight - ((point.kp / maxKp) * chartHeight);
    return { x, y };
  });

  const pathData = points.reduce((path, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`;
  }, '');

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Kp Activity</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.currentValue, { color: getKpColor(currentKp) }]}>
            {currentKp.toFixed(1)}
          </Text>
          <Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
            {getTrendIcon(trend)} {change > 0 ? '+' : ''}{change.toFixed(1)}
          </Text>
        </View>
      </View>
      
      {/* Chart */}
      <View style={[styles.chartContainer, { width: chartWidth, height: chartHeight }]}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Grid lines */}
          {[1, 2, 3, 4].map(level => (
            <Path
              key={level}
              d={`M 0 ${chartHeight - (level / maxKp) * chartHeight} L ${chartWidth} ${chartHeight - (level / maxKp) * chartHeight}`}
              stroke={COLORS.muted}
              strokeWidth="0.5"
              opacity="0.3"
            />
          ))}
          
          {/* Trend line */}
          <Path
            d={pathData}
            stroke={getKpColor(currentKp)}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Current point */}
          <Circle
            cx={points[points.length - 1]?.x || 0}
            cy={points[points.length - 1]?.y || 0}
            r="3"
            fill={getKpColor(currentKp)}
          />
        </Svg>
      </View>
    </View>
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
    case 'rising': return '↗';
    case 'falling': return '↘';
    default: return '→';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'rising': return COLORS.aurora.high;
    case 'falling': return COLORS.emerald;
    default: return COLORS.muted;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 14,
    flex: 1,
    textAlignVertical: 'center',
  },
});
