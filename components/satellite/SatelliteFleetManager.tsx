import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { useSatelliteStore, useSatellitesByOrbit } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk, type DragRiskAssessment } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';
import { SatelliteCard } from './SatelliteCard';
import { AddSatelliteModal } from './AddSatelliteModal';

export function SatelliteFleetManager() {
  const { satellites, isLoading, fetchSatellites, addSatellite, deleteSatellite, selectSatellite } = useSatelliteStore();
  const satellitesByOrbit = useSatellitesByOrbit();
  const { kp } = useSolarStormStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [dragRisks, setDragRisks] = useState<DragRiskAssessment[]>([]);

  useEffect(() => {
    fetchSatellites();
  }, [fetchSatellites]);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      const risks = calculateFleetDragRisk(satellites, kp);
      setDragRisks(risks);
    }
  }, [satellites, kp]);

  const getRiskForSatellite = (id: string) => dragRisks.find((r) => r.satellite.id === id);

  const criticalCount = dragRisks.filter((r) => r.riskLevel === 'critical').length;
  const highCount = dragRisks.filter((r) => r.riskLevel === 'high').length;

  return (
    <FeatureGate feature="satelliteRisk">
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Satellite Fleet</Text>
            <Text style={styles.subtitle}>
              {satellites.length} satellite{satellites.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        {/* Risk summary */}
        {(criticalCount > 0 || highCount > 0) && (
          <View style={styles.riskSummary}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.riskSummaryText}>
              {criticalCount > 0 && `${criticalCount} critical`}
              {criticalCount > 0 && highCount > 0 && ', '}
              {highCount > 0 && `${highCount} high`} risk satellite{criticalCount + highCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.emerald} style={styles.loader} />
        ) : satellites.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="planet-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No satellites tracked</Text>
            <Text style={styles.emptyHint}>
              Add satellites to monitor drag risk and space weather impacts
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {/* LEO satellites first (most affected by drag) */}
            {satellitesByOrbit.LEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  LEO ({satellitesByOrbit.LEO.length})
                </Text>
                {satellitesByOrbit.LEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    dragRisk={getRiskForSatellite(sat.id)}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* MEO satellites */}
            {satellitesByOrbit.MEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  MEO ({satellitesByOrbit.MEO.length})
                </Text>
                {satellitesByOrbit.MEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* GEO satellites */}
            {satellitesByOrbit.GEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  GEO ({satellitesByOrbit.GEO.length})
                </Text>
                {satellitesByOrbit.GEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}

            {/* HEO satellites */}
            {satellitesByOrbit.HEO.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  HEO ({satellitesByOrbit.HEO.length})
                </Text>
                {satellitesByOrbit.HEO.map((sat) => (
                  <SatelliteCard
                    key={sat.id}
                    satellite={sat}
                    onPress={() => selectSatellite(sat)}
                    onDelete={() => deleteSatellite(sat.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}

        <AddSatelliteModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={addSatellite}
        />
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.emerald,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  riskSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f59e0b15',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  riskSummaryText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '500',
  },
  loader: {
    marginTop: 48,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  list: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
