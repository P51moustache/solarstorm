import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { Globe } from '@/components/globe/Globe';
import { useOvationStore } from '@/lib/state/useOvationStore';
import { COLORS } from '@/lib/util/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function GlobePage() {
  const { cells, refresh, isLoading } = useOvationStore();

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Transform OVATION data to aurora cells format
  const auroraData = React.useMemo(() => {
    if (!cells || cells.length === 0) return [];

    return cells.map((cell) => ({
      lat: cell.lat,
      lng: cell.lon,
      probability: cell.prob,
    }));
  }, [cells]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Aurora Globe</Text>
        <Text style={styles.subtitle}>
          {isLoading ? 'Loading aurora data...' : 'Interactive 3D visualization'}
        </Text>
      </View>

      <FeatureGate feature="globe3d">
        <View style={styles.globeContainer}>
          <Globe
            width={screenWidth - 48}
            height={screenHeight * 0.6}
            auroraData={auroraData}
          />
        </View>
      </FeatureGate>

      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Aurora Probability</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Low (10-30%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>Medium (30-60%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>High (60%+)</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
  globeContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  legend: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
