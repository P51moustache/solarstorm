import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  getMultiConstellationImpact,
  type AllConstellationsStatus,
  type ConstellationHealth,
} from '@/lib/api/parsers/gnssConstellation';
import { COLORS } from '@/lib/util/colors';

interface ConstellationStatusProps {
  status: AllConstellationsStatus;
}

const CONSTELLATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  GPS: 'flag',
  GLONASS: 'snow',
  Galileo: 'star',
  BeiDou: 'planet',
};

function ConstellationCard({ health }: { health: ConstellationHealth }) {
  return (
    <View style={styles.constellationCard}>
      <View style={styles.constellationHeader}>
        <Ionicons
          name={CONSTELLATION_ICONS[health.constellation]}
          size={16}
          color={health.statusColor}
        />
        <Text style={styles.constellationName}>{health.constellation}</Text>
        <View style={[styles.statusDot, { backgroundColor: health.statusColor }]} />
      </View>

      <View style={styles.svCounts}>
        <Text style={styles.healthyCount}>{health.healthyCount}</Text>
        <Text style={styles.svLabel}>/{health.totalCount} SVs</Text>
      </View>

      <View style={styles.healthBar}>
        <View
          style={[
            styles.healthFill,
            {
              width: `${health.healthPercentage}%`,
              backgroundColor: health.statusColor,
            },
          ]}
        />
      </View>

      <Text style={[styles.statusText, { color: health.statusColor }]}>
        {health.status}
      </Text>
    </View>
  );
}

export function ConstellationStatus({ status }: ConstellationStatusProps) {
  const impact = getMultiConstellationImpact(status);

  const overallColor =
    status.overallStatus === 'operational' ? '#22c55e' :
    status.overallStatus === 'degraded' ? '#fbbf24' : '#f59e0b';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="globe-outline" size={20} color={overallColor} />
        <Text style={styles.title}>GNSS Constellations</Text>
        <View style={[styles.badge, { backgroundColor: overallColor + '20' }]}>
          <Text style={[styles.badgeText, { color: overallColor }]}>
            {status.overallStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <ConstellationCard health={status.gps} />
        <ConstellationCard health={status.glonass} />
        <ConstellationCard health={status.galileo} />
        <ConstellationCard health={status.beidou} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Available SVs:</Text>
          <Text style={styles.summaryValue}>{impact.availableSvs}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Geometry Impact:</Text>
          <Text style={[
            styles.summaryValue,
            { color: impact.geometryImpact === 'none' ? COLORS.emerald : '#f59e0b' }
          ]}>
            {impact.geometryImpact}
          </Text>
        </View>
      </View>

      <Text style={styles.recommendation}>{impact.recommendation}</Text>

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
    marginBottom: 16,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  constellationCard: {
    width: '48%',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
  },
  constellationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  constellationName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  svCounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  healthyCount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  svLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 2,
  },
  healthBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summary: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommendation: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 12,
  },
  updated: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'right',
  },
});
