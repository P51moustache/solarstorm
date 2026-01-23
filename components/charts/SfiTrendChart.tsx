import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getSfiTrend } from '@/lib/api/solarFlux';
import { getSfiCondition, type SfiTrend } from '@/lib/api/parsers/solarFlux';
import { COLORS } from '@/lib/util/colors';

export function SfiTrendChart() {
  const [trend, setTrend] = useState<SfiTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getSfiTrend()
      .then(setTrend)
      .finally(() => setIsLoading(false));
  }, []);

  const condition = trend ? getSfiCondition(trend.current) : null;

  const getTrendIcon = (): 'trending-up' | 'trending-down' | 'remove-outline' => {
    if (!trend) return 'remove-outline';
    switch (trend.trend) {
      case 'rising': return 'trending-up';
      case 'falling': return 'trending-down';
      default: return 'remove-outline';
    }
  };

  return (
    <FeatureGate feature="hfPropagation">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Solar Flux Index (F10.7)</Text>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {trend && condition && (
          <>
            <View style={styles.currentValue}>
              <Text style={styles.valueNumber}>{Math.round(trend.current)}</Text>
              <Text style={styles.valueUnit}>sfu</Text>
              <Ionicons
                name={getTrendIcon()}
                size={24}
                color={trend.trend === 'rising' ? '#22c55e' : trend.trend === 'falling' ? '#ef4444' : COLORS.muted}
              />
            </View>

            <View style={[styles.conditionBadge, { backgroundColor: condition.color + '20' }]}>
              <Text style={[styles.conditionText, { color: condition.color }]}>
                {condition.label}
              </Text>
            </View>

            <Text style={styles.impact}>{condition.hfImpact}</Text>

            {/* Simple sparkline visualization */}
            <View style={styles.chartContainer}>
              <View style={styles.chartBars}>
                {trend.history.slice(0, 30).reverse().map((d, i) => (
                  <View
                    key={i}
                    style={[
                      styles.chartBar,
                      {
                        height: Math.max(4, (d.f107 / 200) * 60),
                        backgroundColor: d.f107 >= 100 ? '#22c55e' : d.f107 >= 70 ? '#eab308' : '#f97316',
                      },
                    ]}
                  />
                ))}
              </View>
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>30 days ago</Text>
                <Text style={styles.chartLabel}>Today</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>30-day avg</Text>
                <Text style={styles.statValue}>{trend.average30day} sfu</Text>
              </View>
            </View>
          </>
        )}

        {!isLoading && !trend && (
          <Text style={styles.error}>Unable to load solar flux data</Text>
        )}
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  currentValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 8,
  },
  valueNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  valueUnit: {
    fontSize: 16,
    color: COLORS.muted,
    marginRight: 8,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  conditionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  impact: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 12,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 2,
  },
  chartBar: {
    flex: 1,
    borderRadius: 2,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: COLORS.muted,
  },
  stats: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  stat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  error: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    padding: 16,
  },
});
