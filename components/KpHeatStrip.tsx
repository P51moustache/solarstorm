import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, getKpColor } from '../lib/util/colors';
import { formatTimeLocal } from '../lib/util/time';

interface KpHistoryData {
  kp: number;
  at: string;
}

interface KpHeatStripProps {
  data: KpHistoryData[];
  width?: number;
  height?: number;
}

export function KpHeatStrip({ data, width = 300, height = 80 }: KpHeatStripProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No recent Kp data available</Text>
      </View>
    );
  }

  // Take last 48 data points (4 hours of 5-min data)
  const recentData = data.slice(-48);
  const stripWidth = width - SPACING.lg * 2;
  const segmentWidth = stripWidth / recentData.length;
  
  // Calculate trend
  const trend = calculateTrend(recentData);
  const currentKp = recentData[recentData.length - 1]?.kp || 0;
  const avgKp = recentData.reduce((sum, d) => sum + d.kp, 0) / recentData.length;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Kp Activity Strip</Text>
          <Text style={styles.subtitle}>Last 4 hours</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Now</Text>
            <Text style={[styles.statValue, { color: getKpColor(currentKp) }]}>
              {currentKp.toFixed(1)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Avg</Text>
            <Text style={[styles.statValue, { color: getKpColor(avgKp) }]}>
              {avgKp.toFixed(1)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.trendIcon, { color: getTrendColor(trend) }]}>
              {getTrendIcon(trend)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.stripContainer}>
        <View style={[styles.strip, { width: stripWidth }]}>
          {recentData.map((point, index) => (
            <View
              key={`${point.at}-${index}`}
              style={[
                styles.segment,
                {
                  width: segmentWidth,
                  backgroundColor: getKpColor(point.kp),
                  opacity: getKpOpacity(point.kp),
                }
              ]}
            />
          ))}
        </View>
        
        {/* Intensity legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getKpColor(0) }]} />
            <Text style={styles.legendText}>Quiet</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getKpColor(2) }]} />
            <Text style={styles.legendText}>Unsettled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getKpColor(4) }]} />
            <Text style={styles.legendText}>Storm</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getKpColor(7) }]} />
            <Text style={styles.legendText}>Severe</Text>
          </View>
        </View>
      </View>
      
      {/* Time indicators */}
      <View style={styles.timeIndicators}>
        <Text style={styles.timeLabel}>
          {formatTimeLocal(recentData[0]?.at)}
        </Text>
        <Text style={styles.timeLabel}>Now</Text>
      </View>
    </View>
  );
}

function calculateTrend(data: KpHistoryData[]): 'rising' | 'falling' | 'stable' {
  if (data.length < 6) return 'stable';
  
  // Compare last quarter vs first quarter of the data
  const quarterLength = Math.floor(data.length / 4);
  const firstQuarter = data.slice(0, quarterLength);
  const lastQuarter = data.slice(-quarterLength);
  
  const firstAvg = firstQuarter.reduce((sum, d) => sum + d.kp, 0) / firstQuarter.length;
  const lastAvg = lastQuarter.reduce((sum, d) => sum + d.kp, 0) / lastQuarter.length;
  
  const diff = lastAvg - firstAvg;
  
  if (diff > 0.4) return 'rising';
  if (diff < -0.4) return 'falling';
  return 'stable';
}

function getTrendIcon(trend: string): string {
  switch (trend) {
    case 'rising': return '📈';
    case 'falling': return '📉';
    default: return '➡️';
  }
}

function getTrendColor(trend: string): string {
  switch (trend) {
    case 'rising': return COLORS.aurora.high;
    case 'falling': return COLORS.emerald;
    default: return COLORS.muted;
  }
}

function getKpOpacity(kp: number): number {
  // Higher Kp values get more opacity for visual emphasis
  return Math.max(0.3, Math.min(1.0, kp / 5));
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
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
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
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendIcon: {
    fontSize: 16,
    marginTop: 8,
  },
  stripContainer: {
    marginVertical: SPACING.sm,
  },
  strip: {
    height: 20,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  segment: {
    height: '100%',
    borderRightWidth: 0.5,
    borderRightColor: COLORS.bg,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.muted,
  },
  timeIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
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
