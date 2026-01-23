import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import {
  getParticleFluxStatus,
  type ParticleFluxStatus,
} from '@/lib/api/particleFlux';
import { COLORS } from '@/lib/util/colors';

export function ParticleFluxWidget() {
  const [status, setStatus] = useState<ParticleFluxStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getParticleFluxStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load particle flux:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={COLORS.emerald} />
      </View>
    );
  }

  if (!status) return null;

  const { proton, electron } = status;

  return (
    <FeatureGate feature="satelliteRisk">
      <View style={styles.container}>
        <Text style={styles.title}>Particle Environment</Text>

        {/* Solar Radiation Storm (Protons) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={20} color={proton.sScale.color} />
            <Text style={styles.cardTitle}>Solar Radiation Storm</Text>
            <View style={[styles.badge, { backgroundColor: proton.sScale.color + '20' }]}>
              <Text style={[styles.badgeText, { color: proton.sScale.color }]}>
                {proton.sScale.scale}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{proton.sScale.description}</Text>
          <Text style={styles.cardImpact}>{proton.sScale.impact}</Text>
          {proton.latest && (
            <View style={styles.readings}>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}10 MeV</Text>
                <Text style={styles.readingValue}>
                  {proton.latest.flux_10mev?.toExponential(1) ?? 'N/A'} pfu
                </Text>
              </View>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}100 MeV</Text>
                <Text style={styles.readingValue}>
                  {proton.latest.flux_100mev?.toExponential(1) ?? 'N/A'} pfu
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* GEO Electron Environment */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="remove-circle" size={20} color={electron.chargingRisk.color} />
            <Text style={styles.cardTitle}>GEO Surface Charging</Text>
            <View style={[styles.badge, { backgroundColor: electron.chargingRisk.color + '20' }]}>
              <Text style={[styles.badgeText, { color: electron.chargingRisk.color }]}>
                {electron.chargingRisk.level.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.cardDescription}>{electron.chargingRisk.description}</Text>
          {electron.latest && (
            <View style={styles.readings}>
              <View style={styles.reading}>
                <Text style={styles.readingLabel}>{'>'}2 MeV e-</Text>
                <Text style={styles.readingValue}>
                  {electron.latest.flux_2mev?.toExponential(1) ?? 'N/A'} e/(cm²·s·sr)
                </Text>
              </View>
            </View>
          )}
        </View>

        <Text style={styles.updated}>
          Updated: {new Date(status.updatedAt).toLocaleTimeString()}
        </Text>
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
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
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  cardImpact: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
  },
  readings: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reading: {
    gap: 2,
  },
  readingLabel: {
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
  },
  readingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'monospace',
  },
  updated: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
