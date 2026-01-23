import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getBandUsability, getRadioBlackoutScale, type RScaleLevel } from '@/lib/api/parsers/xray';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

const BANDS = ['160m', '80m', '40m', '20m', '15m', '10m', '6m'];

export function HfPropagationMap() {
  const { kp } = useSolarStormStore();

  // Mock X-ray flux for now (would come from API)
  const rScale: RScaleLevel = useMemo(() => {
    return getRadioBlackoutScale(1e-6); // Default to R1/R2 range
  }, []);

  const bandUsability = useMemo(() => {
    return getBandUsability(kp ?? 3, rScale.scale);
  }, [kp, rScale.scale]);

  const getUsabilityColor = (status: 'good' | 'fair' | 'poor') => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
    }
  };

  return (
    <FeatureGate feature="hfPropagation">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>HF Propagation</Text>
          <View style={[styles.rScaleBadge, { backgroundColor: rScale.color + '20' }]}>
            <Text style={[styles.rScaleText, { color: rScale.color }]}>
              {rScale.scale}
            </Text>
          </View>
        </View>

        <Text style={styles.rScaleDescription}>
          {rScale.description}: {rScale.hfImpact}
        </Text>

        <View style={styles.bandsGrid}>
          {BANDS.map((band) => (
            <View key={band} style={styles.bandItem}>
              <Text style={styles.bandLabel}>{band}</Text>
              <View
                style={[
                  styles.bandIndicator,
                  { backgroundColor: getUsabilityColor(bandUsability[band]) },
                ]}
              />
              <Text
                style={[
                  styles.bandStatus,
                  { color: getUsabilityColor(bandUsability[band]) },
                ]}
              >
                {bandUsability[band]}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Good</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
            <Text style={styles.legendText}>Fair</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Poor</Text>
          </View>
        </View>
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
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  rScaleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rScaleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rScaleDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 16,
  },
  bandsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  bandItem: {
    alignItems: 'center',
    flex: 1,
  },
  bandLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  bandIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 4,
  },
  bandStatus: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
