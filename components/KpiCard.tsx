import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../lib/util/colors';

interface KpiCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  delta?: string;
  color?: string;
  subtitle?: string;
}

export function KpiCard({ label, value, unit, delta, color, subtitle }: KpiCardProps) {
  const displayValue = value !== null ? value : '--';
  const valueColor = color || COLORS.text;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: valueColor }]}>
            {displayValue}
          </Text>
          {unit && (
            <Text style={styles.unit}>{unit}</Text>
          )}
        </View>
        {delta && (
          <Text style={styles.delta}>{delta}</Text>
        )}
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flex: 1,
    ...SHADOWS.card,
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
    marginLeft: 2,
  },
  delta: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 2,
  },
});
