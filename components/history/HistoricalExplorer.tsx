import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getHistoricalData } from '@/lib/api/historical';
import type { HistoricalSummary } from '@/lib/api/parsers/historical';
import { COLORS } from '@/lib/util/colors';

type MetricType = 'kp' | 'bz' | 'speed';

export function HistoricalExplorer() {
  const [data, setData] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('kp');

  useEffect(() => {
    getHistoricalData()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const getKpColor = (kp: number) => {
    if (kp >= 7) return '#ef4444';
    if (kp >= 5) return '#f97316';
    if (kp >= 4) return '#eab308';
    return '#22c55e';
  };

  const getBzColor = (bz: number) => {
    if (bz < -10) return '#ef4444';
    if (bz < -5) return '#f97316';
    if (bz < 0) return '#eab308';
    return '#22c55e';
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 600) return '#ef4444';
    if (speed >= 500) return '#f97316';
    if (speed >= 400) return '#eab308';
    return '#22c55e';
  };

  const renderChart = () => {
    if (!data) return null;

    const chartData = data.data.filter((d) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp !== null;
        case 'bz':
          return d.bz !== null;
        case 'speed':
          return d.speed !== null;
      }
    });

    const getValue = (d: typeof chartData[0]) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp ?? 0;
        case 'bz':
          return d.bz ?? 0;
        case 'speed':
          return d.speed ?? 0;
      }
    };

    const maxValue = Math.max(...chartData.map(getValue), 1);
    const minValue = Math.min(...chartData.map(getValue), 0);
    const range = maxValue - minValue || 1;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {chartData.map((d, i) => {
            const value = getValue(d);
            const normalizedHeight =
              selectedMetric === 'bz'
                ? (Math.abs(value) / Math.max(Math.abs(minValue), maxValue)) * 100
                : (value / maxValue) * 100;

            let color: string;
            switch (selectedMetric) {
              case 'kp':
                color = getKpColor(value);
                break;
              case 'bz':
                color = getBzColor(value);
                break;
              case 'speed':
                color = getSpeedColor(value);
                break;
            }

            return (
              <View
                key={i}
                style={[
                  styles.chartBar,
                  {
                    height: Math.max(4, normalizedHeight),
                    backgroundColor: color,
                  },
                ]}
              />
            );
          })}
        </View>
        <View style={styles.chartLabels}>
          <Text style={styles.chartLabel}>30 days ago</Text>
          <Text style={styles.chartLabel}>Today</Text>
        </View>
      </View>
    );
  };

  return (
    <FeatureGate feature="historicalData">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="analytics" size={24} color={COLORS.emerald} />
          <Text style={styles.title}>Historical Data</Text>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {data && (
          <>
            {/* Metric Selector */}
            <View style={styles.metricSelector}>
              <MetricButton
                label="Kp Index"
                selected={selectedMetric === 'kp'}
                onPress={() => setSelectedMetric('kp')}
              />
              <MetricButton
                label="Bz"
                selected={selectedMetric === 'bz'}
                onPress={() => setSelectedMetric('bz')}
              />
              <MetricButton
                label="Solar Wind"
                selected={selectedMetric === 'speed'}
                onPress={() => setSelectedMetric('speed')}
              />
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>
                {selectedMetric === 'kp' && '30-Day Kp Index'}
                {selectedMetric === 'bz' && '30-Day Bz (IMF)'}
                {selectedMetric === 'speed' && '30-Day Solar Wind Speed'}
              </Text>
              {renderChart()}
            </View>

            {/* Stats */}
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>30-Day Summary</Text>
              <View style={styles.statsGrid}>
                <StatItem
                  label="Avg Kp"
                  value={String(data.stats.avgKp)}
                  color={getKpColor(data.stats.avgKp)}
                />
                <StatItem
                  label="Max Kp"
                  value={String(data.stats.maxKp)}
                  color={getKpColor(data.stats.maxKp)}
                />
                <StatItem
                  label="Storm Days"
                  value={String(data.stats.stormDays)}
                  color={data.stats.stormDays > 0 ? '#f97316' : '#22c55e'}
                  subtitle="Kp ≥ 5"
                />
                <StatItem
                  label="Min Bz"
                  value={`${data.stats.minBz} nT`}
                  color={getBzColor(data.stats.minBz)}
                />
                <StatItem
                  label="Avg Speed"
                  value={`${data.stats.avgSpeed} km/s`}
                  color={getSpeedColor(data.stats.avgSpeed)}
                />
                <StatItem
                  label="Max Speed"
                  value={`${data.stats.maxSpeed} km/s`}
                  color={getSpeedColor(data.stats.maxSpeed)}
                />
              </View>
            </View>

            {/* Recent Notable Events */}
            <View style={styles.eventsCard}>
              <Text style={styles.eventsTitle}>Recent Notable Events</Text>
              {data.data
                .filter((d) => d.kp !== null && d.kp >= 5)
                .slice(-5)
                .reverse()
                .map((event, i) => (
                  <View key={i} style={styles.eventItem}>
                    <View
                      style={[
                        styles.eventBadge,
                        { backgroundColor: getKpColor(event.kp!) + '30' },
                      ]}
                    >
                      <Text
                        style={[styles.eventKp, { color: getKpColor(event.kp!) }]}
                      >
                        Kp {event.kp}
                      </Text>
                    </View>
                    <Text style={styles.eventDate}>
                      {new Date(event.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                ))}
              {data.data.filter((d) => d.kp !== null && d.kp >= 5).length === 0 && (
                <Text style={styles.noEvents}>
                  No geomagnetic storms (Kp ≥ 5) in the past 30 days
                </Text>
              )}
            </View>
          </>
        )}

        {!isLoading && !data && (
          <View style={styles.error}>
            <Ionicons name="cloud-offline" size={48} color={COLORS.muted} />
            <Text style={styles.errorText}>Unable to load historical data</Text>
          </View>
        )}
      </ScrollView>
    </FeatureGate>
  );
}

function MetricButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <View
      style={[styles.metricButton, selected && styles.metricButtonSelected]}
      onTouchEnd={onPress}
    >
      <Text
        style={[styles.metricButtonText, selected && styles.metricButtonTextSelected]}
      >
        {label}
      </Text>
    </View>
  );
}

function StatItem({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  metricSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
  },
  metricButtonSelected: {
    backgroundColor: COLORS.emerald + '30',
  },
  metricButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
  },
  metricButtonTextSelected: {
    color: COLORS.emerald,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  chartContainer: {
    marginBottom: 8,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
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
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 11,
    color: COLORS.muted,
  },
  statsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  eventsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  eventsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventKp: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.text,
  },
  noEvents: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.muted,
  },
});
