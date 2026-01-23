import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getTecCondition } from '@/lib/api/parsers/tec';
import type { RegionalTec } from '@/lib/api/parsers/tec';
import { COLORS } from '@/lib/util/colors';

interface RegionalTecListProps {
  regions: RegionalTec[];
}

export function RegionalTecList({ regions }: RegionalTecListProps) {
  if (regions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="location-outline" size={24} color={COLORS.muted} />
        <Text style={styles.emptyText}>No regions configured</Text>
        <Text style={styles.emptyHint}>Add regions to see localized TEC data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Regional TEC</Text>
      {regions.map((region) => {
        const condition = getTecCondition(region.meanTec);
        return (
          <View key={region.regionLabel} style={styles.regionCard}>
            <View style={styles.regionHeader}>
              <Text style={styles.regionName}>{region.regionLabel}</Text>
              <View style={[styles.dot, { backgroundColor: condition.color }]} />
            </View>
            <View style={styles.regionStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.meanTec}</Text>
                <Text style={styles.statLabel}>Mean</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.maxTec}</Text>
                <Text style={styles.statLabel}>Max</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{region.minTec}</Text>
                <Text style={styles.statLabel}>Min</Text>
              </View>
            </View>
            <Text style={styles.regionCondition}>{condition.description}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  empty: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: 12,
    color: COLORS.muted,
  },
  regionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  regionStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  regionCondition: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
