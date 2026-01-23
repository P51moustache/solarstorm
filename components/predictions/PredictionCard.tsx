import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/lib/util/colors';

interface PredictionCardProps {
  label: string;
  probability: number;
  description: string;
  bestTime?: string | null;
}

export function PredictionCard({ label, probability, description, bestTime }: PredictionCardProps) {
  const probabilityColor =
    probability >= 70 ? '#22c55e' :
    probability >= 50 ? '#84cc16' :
    probability >= 30 ? '#eab308' :
    probability >= 15 ? '#f97316' :
    '#ef4444';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.probabilityBadge, { backgroundColor: probabilityColor + '20' }]}>
          <Text style={[styles.probabilityText, { color: probabilityColor }]}>
            {probability}%
          </Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${probability}%`, backgroundColor: probabilityColor },
            ]}
          />
        </View>
      </View>

      <Text style={styles.description}>{description}</Text>

      {bestTime && (
        <View style={styles.bestTime}>
          <Text style={styles.bestTimeLabel}>Best viewing:</Text>
          <Text style={styles.bestTimeValue}>{bestTime}</Text>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  probabilityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  probabilityText: {
    fontSize: 18,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBg: {
    height: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  bestTime: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bestTimeLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginRight: 4,
  },
  bestTimeValue: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '500',
  },
});
