import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS, RADIUS, SPACING, getKpColor } from '../lib/util/colors';
import { formatTimeLocal } from '../lib/util/time';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpTrendLineProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
  showPoints?: boolean;
}

export function KpTrendLine({ 
  data, 
  width = 300, 
  height = 160, 
  showPoints = false 
}: KpTrendLineProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No recent Kp data available</Text>
      </View>
    );
  }

  // Take last 24 data points (2 hours of 5-min data) for smooth trending
  const recentData = data.slice(-24);
  
  // Calculate proper dimensions with better centering
  const headerHeight = 50;
  const timeLabelsHeight = 25;
  const yAxisWidth = 30;
  const padding = SPACING.md;
  
  const chartWidth = width - (padding * 2) - yAxisWidth - 10; // Extra margin for centering
  const chartHeight = height - headerHeight - timeLabelsHeight - (padding * 2);
  
  const maxKp = Math.max(5, Math.max(...recentData.map(d => d.kp))); // At least 5 for scale
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

  // Create area fill path (for gradient under the line)
  const areaPath = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Header - Centered */}
      <View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Kp Trend</Text>
          <Text style={styles.subtitle}>Last 2 hours (local time)</Text>
        </View>
        <View style={styles.trendContainer}>
          <Text style={[styles.currentValue, { color: getKpColor(currentKp) }]}>
            {currentKp.toFixed(1)}
          </Text>
          <View style={styles.trendIndicator}>
            <Text style={[styles.trendIcon, { color: getTrendColor(trend) }]}>
              {getTrendIcon(trend)}
            </Text>
            <Text style={[styles.trendChange, { color: getTrendColor(trend) }]}>
              {trendChange > 0 ? '+' : ''}{trendChange.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Chart Area - Centered and properly spaced */}
      <View style={[styles.chartArea, { height: chartHeight + padding }]}>
        {/* Y-axis labels - Evenly spaced */}
        <View style={[styles.yAxisContainer, { width: yAxisWidth, height: chartHeight }]}>
          {[0, 1, 2, 3, 4, 5].map(level => {
            const yPosition = chartHeight - (level / maxKp) * chartHeight;
            return (
              <View 
                key={level}
                style={[
                  styles.yAxisLabelContainer,
                  {
                    position: 'absolute',
                    top: yPosition - 8, // Center the label on the line
                    right: 4,
                    height: 16,
                  }
                ]}
              >
                <Text style={styles.yAxisLabel}>{level}</Text>
              </View>
            );
          })}
        </View>
        
        {/* SVG Chart - Centered */}
        <View style={[styles.chartContainer, { 
          width: chartWidth, 
          height: chartHeight,
          alignItems: 'center',
          justifyContent: 'center'
        }]}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={getKpColor(currentKp)} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={getKpColor(currentKp)} stopOpacity="0.05" />
              </LinearGradient>
              <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={getKpColor(recentData[0]?.kp || 0)} />
                <Stop offset="100%" stopColor={getKpColor(currentKp)} />
              </LinearGradient>
            </Defs>
            
            {/* Reference grid lines for better readability */}
            {[1, 2, 3, 4, 5].map(level => (
              <Path
                key={`grid-${level}`}
                d={`M 0 ${chartHeight - (level / maxKp) * chartHeight} L ${chartWidth} ${chartHeight - (level / maxKp) * chartHeight}`}
                stroke={COLORS.muted}
                strokeWidth="0.5"
                opacity="0.2"
              />
            ))}
            
            {/* Area fill */}
            <Path
              d={areaPath}
              fill="url(#areaGradient)"
            />
            
            {/* Main trend line */}
            <Path
              d={pathData}
              stroke="url(#lineGradient)"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points (optional) */}
            {showPoints && points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="3"
                fill={getKpColor(point.kp)}
                stroke={COLORS.card}
                strokeWidth="1"
              />
            ))}
            
            {/* Current value indicator */}
            <Circle
              cx={points[points.length - 1]?.x || 0}
              cy={points[points.length - 1]?.y || 0}
              r="4"
              fill={getKpColor(currentKp)}
              stroke={COLORS.card}
              strokeWidth="2"
            />
          </Svg>
        </View>
      </View>
      
      {/* Time range indicator - Local times */}
      <View style={[styles.timeRange, { height: timeLabelsHeight, paddingHorizontal: yAxisWidth }]}>
        <Text style={styles.timeLabel}>
          {formatTimeLocal(recentData[0]?.at)}
        </Text>
        <Text style={styles.timeLabel}>Now</Text>
      </View>
    </View>
  );
}

function calculateTrend(data: KpHistoryData[]): 'rising' | 'falling' | 'stable' {
  if (data.length < 4) return 'stable';
  
  // Look at last 4 points for trend calculation
  const recent = data.slice(-4);
  const first = recent[0].kp;
  const last = recent[recent.length - 1].kp;
  const diff = last - first;
  
  // More sensitive trend detection
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
    case 'rising': return COLORS.aurora.high;
    case 'falling': return COLORS.emerald;
    default: return COLORS.muted;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    overflow: 'hidden', // Ensure content stays within bounds
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  trendContainer: {
    alignItems: 'flex-end',
  },
  currentValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  trendChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'center', // Center vertically
    justifyContent: 'center', // Center horizontally
    marginBottom: SPACING.sm,
  },
  yAxisContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yAxisLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
  },
  yAxisLabel: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: 'center',
    fontWeight: '500',
  },
  chartContainer: {
    marginLeft: SPACING.sm,
    overflow: 'hidden', // Prevent SVG overflow
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 14,
    flex: 1,
    textAlignVertical: 'center',
  },
});
