import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SatelliteAnomaly } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AnomalyListProps {
  anomalies: SatelliteAnomaly[];
  onDelete?: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  minor: '#22c55e',
  moderate: '#fbbf24',
  severe: '#f59e0b',
  critical: '#dc2626',
};

const TYPE_ICONS: Record<string, string> = {
  safe_mode: 'shield-checkmark',
  reboot: 'refresh',
  sensor_error: 'thermometer',
  comm_loss: 'radio',
  attitude_error: 'compass',
  power_anomaly: 'battery-half',
  other: 'alert-circle',
};

export function AnomalyList({ anomalies, onDelete }: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="checkmark-circle" size={32} color={COLORS.emerald} />
        <Text style={styles.emptyText}>No anomalies logged</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {anomalies.map((anomaly) => (
        <View key={anomaly.id} style={styles.card}>
          <View style={styles.header}>
            <Ionicons
              name={TYPE_ICONS[anomaly.anomaly_type] as keyof typeof Ionicons.glyphMap}
              size={20}
              color={SEVERITY_COLORS[anomaly.severity]}
            />
            <Text style={styles.type}>
              {anomaly.anomaly_type.replace('_', ' ')}
            </Text>
            <View
              style={[
                styles.severityBadge,
                { backgroundColor: SEVERITY_COLORS[anomaly.severity] + '20' },
              ]}
            >
              <Text
                style={[
                  styles.severityText,
                  { color: SEVERITY_COLORS[anomaly.severity] },
                ]}
              >
                {anomaly.severity}
              </Text>
            </View>
            {onDelete && (
              <Pressable onPress={() => onDelete(anomaly.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={COLORS.muted} />
              </Pressable>
            )}
          </View>

          <Text style={styles.date}>
            {new Date(anomaly.occurred_at).toLocaleString()}
          </Text>

          {anomaly.description && (
            <Text style={styles.description}>{anomaly.description}</Text>
          )}

          {/* Space weather correlation */}
          <View style={styles.correlation}>
            <Text style={styles.correlationTitle}>Space Weather at Time:</Text>
            <View style={styles.correlationData}>
              {anomaly.kp_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Kp: {anomaly.kp_at_time.toFixed(1)}
                </Text>
              )}
              {anomaly.proton_flux_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Protons: {anomaly.proton_flux_at_time.toExponential(1)} pfu
                </Text>
              )}
              {anomaly.electron_flux_at_time !== null && (
                <Text style={styles.correlationItem}>
                  Electrons: {anomaly.electron_flux_at_time.toExponential(1)}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  type: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textTransform: 'capitalize',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  date: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  correlation: {
    backgroundColor: COLORS.bg,
    padding: 10,
    borderRadius: 8,
  },
  correlationTitle: {
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  correlationData: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  correlationItem: {
    fontSize: 12,
    color: COLORS.text,
    fontFamily: 'monospace',
  },
});
