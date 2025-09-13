import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, getKpColor } from '../lib/util/colors';
import { formatTime } from '../lib/util/time';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpHistoryBarChartProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
}

export function KpHistoryBarChart({ data, width = 300, height = 100 }: KpHistoryBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No recent Kp data available</Text>
      </View>
    );
  }

  // Take last 12 data points for better visualization
  const recentData = data.slice(-12);
  const maxKp = Math.max(...recentData.map(d => d.kp));
  const barWidth = (width - SPACING.xl * 2) / recentData.length - 2;

  // Calculate trend
  const trend = calculateTrend(recentData);

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Kp Activity</Text>
        <View style={styles.trendContainer}>
          <Text style={[styles.trendText, { color: getTrendColor(trend) }]}>
            {getTrendIcon(trend)} {getTrendLabel(trend)}
          </Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        <View style={styles.barsContainer}>
          {recentData.map((point, index) => {
            const barHeight = (point.kp / Math.max(maxKp, 5)) * (height - 60); // Leave space for labels
            const color = getKpColor(point.kp);
            
            return (
              <View key={`${point.at}-${index}`} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: Math.max(barHeight, 2), // Minimum height for visibility
                      backgroundColor: color,
                    },
                  ]}
                />
                <Text style={styles.barValue}>{point.kp.toFixed(1)}</Text>
                {index % 3 === 0 && ( // Show time every 3rd bar to avoid crowding
                  <Text style={styles.timeLabel}>
                    {formatTime(point.at).replace(' UTC', '')}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
        
        {/* Y-axis reference lines */}
        <View style={styles.referenceLines}>
          {[1, 2, 3, 4, 5].map(level => (
            <View
              key={level}
              style={[
                styles.referenceLine,
                {
                  bottom: (level / 5) * (height - 60),
                  opacity: level === 5 ? 0.6 : 0.3,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function calculateTrend(data: KpHistoryData[]): 'rising' | 'falling' | 'stable' {
  if (data.length < 3) return 'stable';
  
  const recent = data.slice(-3);
  const first = recent[0].kp;
  const last = recent[recent.length - 1].kp;
  const diff = last - first;
  
  if (diff > 0.5) return 'rising';
  if (diff < -0.5) return 'falling';
  return 'stable';
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'rising': return '↗️';
    case 'falling': return '↘️';
    default: return '→';
  }
}

function getTrendLabel(trend: string): string {
  switch (trend) {
    case 'rising': return 'Rising';
    case 'falling': return 'Declining';
    default: return 'Stable';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'rising': return COLORS.aurora.high;
    case 'falling': return COLORS.emerald;
    default: return COLORS.text;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    flex: 1,
    position: 'relative',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
    paddingBottom: 20,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: 2,
    marginBottom: 2,
  },
  barValue: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 8,
    color: COLORS.muted,
    transform: [{ rotate: '-45deg' }],
  },
  referenceLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 20,
  },
  referenceLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.muted,
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 14,
    flex: 1,
    textAlignVertical: 'center',
  },
});
