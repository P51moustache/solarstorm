import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { estimatePositionError } from '@/lib/api/parsers/tec';
import type { TecStatus } from '@/lib/api/tec';
import { COLORS } from '@/lib/util/colors';

interface TecStatusCardProps {
  status: TecStatus;
}

export function TecStatusCard({ status }: TecStatusCardProps) {
  const { global } = status;
  const condition = global.condition;
  const singleFreqError = estimatePositionError(global.mean, false);
  const dualFreqError = estimatePositionError(global.mean, true);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cellular" size={20} color={condition.color} />
        <Text style={styles.title}>Ionospheric TEC</Text>
        <View style={[styles.badge, { backgroundColor: condition.color + '20' }]}>
          <Text style={[styles.badgeText, { color: condition.color }]}>
            {condition.level.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.tecValue}>
        <Text style={styles.tecNumber}>{global.mean}</Text>
        <Text style={styles.tecUnit}>TECU</Text>
        <Text style={styles.tecMax}>(max: {global.max})</Text>
      </View>

      <Text style={styles.description}>{condition.gnssImpact}</Text>

      <View style={styles.errorEstimates}>
        <Text style={styles.errorTitle}>Estimated Position Error:</Text>
        <View style={styles.errorRow}>
          <View style={styles.errorItem}>
            <Text style={styles.errorLabel}>Single-freq</Text>
            <Text style={styles.errorValue}>±{singleFreqError.horizontalM}m H</Text>
            <Text style={styles.errorValue}>±{singleFreqError.verticalM}m V</Text>
          </View>
          <View style={styles.errorItem}>
            <Text style={styles.errorLabel}>Dual-freq</Text>
            <Text style={[styles.errorValue, { color: COLORS.emerald }]}>
              ±{dualFreqError.horizontalM}m H
            </Text>
            <Text style={[styles.errorValue, { color: COLORS.emerald }]}>
              ±{dualFreqError.verticalM}m V
            </Text>
          </View>
        </View>
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
    marginBottom: 12,
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
  tecValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  tecNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  tecUnit: {
    fontSize: 14,
    color: COLORS.muted,
  },
  tecMax: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 16,
  },
  errorEstimates: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  errorRow: {
    flexDirection: 'row',
    gap: 24,
  },
  errorItem: {
    flex: 1,
  },
  errorLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  errorValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
