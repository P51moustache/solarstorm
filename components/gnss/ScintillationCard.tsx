import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ScintillationStatus } from '@/lib/api/scintillation';
import { COLORS } from '@/lib/util/colors';

interface ScintillationCardProps {
  status: ScintillationStatus;
  regionName: string;
}

export function ScintillationCard({ status, regionName }: ScintillationCardProps) {
  const { current, forecast } = status;

  const riskLevels = ['low', 'moderate', 'high', 'very_high'];
  const currentRiskIndex = riskLevels.indexOf(current.lossOfLockRisk);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="radio" size={20} color={current.color} />
        <Text style={styles.title}>Scintillation</Text>
        <View style={[styles.badge, { backgroundColor: current.color + '20' }]}>
          <Text style={[styles.badgeText, { color: current.color }]}>
            {current.severity.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.regionName}>{regionName}</Text>

      <Text style={styles.description}>{current.gnssImpact}</Text>

      <View style={styles.riskIndicator}>
        <Text style={styles.riskLabel}>Loss of Lock Risk:</Text>
        <View style={styles.riskBars}>
          {riskLevels.map((level, i) => (
            <View
              key={level}
              style={[
                styles.riskBar,
                {
                  backgroundColor: i <= currentRiskIndex ? current.color : COLORS.border,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.riskText, { color: current.color }]}>
          {current.lossOfLockRisk.replace('_', ' ')}
        </Text>
      </View>

      <View style={styles.forecast}>
        <Text style={styles.forecastTitle}>Forecast</Text>
        <Text style={styles.forecastText}>{forecast.description}</Text>
      </View>

      <Text style={styles.updated}>
        Updated: {new Date(status.updatedAt).toLocaleTimeString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  regionName: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  riskIndicator: {
    marginBottom: 16,
  },
  riskLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  riskBars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  riskBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  forecast: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forecastText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
