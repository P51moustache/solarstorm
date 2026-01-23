import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { ParticleFluxWidget } from '@/components/satellite/ParticleFluxWidget';
import { SatelliteCard } from '@/components/satellite/SatelliteCard';
import { AnomalyLogger } from '@/components/satellite/AnomalyLogger';
import { AnomalyList } from '@/components/satellite/AnomalyList';
import { useSatelliteStore, useOrbitRaisingSatellites } from '@/lib/state/useSatelliteStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateFleetDragRisk, type DragRiskAssessment } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';

export default function SatelliteDashboardPage() {
  const router = useRouter();
  const { satellites, anomalies, selectedSatellite, fetchSatellites, selectSatellite, addAnomaly, deleteAnomaly } = useSatelliteStore();
  const orbitRaisingSats = useOrbitRaisingSatellites();
  const { kp } = useSolarStormStore();

  const [showAnomalyLogger, setShowAnomalyLogger] = useState(false);
  const [dragRisks, setDragRisks] = useState<DragRiskAssessment[]>([]);

  useEffect(() => {
    fetchSatellites();
  }, [fetchSatellites]);

  useEffect(() => {
    if (satellites.length > 0 && kp !== null) {
      setDragRisks(calculateFleetDragRisk(satellites, kp));
    }
  }, [satellites, kp]);

  const criticalRisks = dragRisks.filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'high');

  return (
    <FeatureGate feature="satelliteRisk">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Satellite Operations</Text>
          <Pressable
            style={styles.manageButton}
            onPress={() => router.push('/satellites')}
          >
            <Text style={styles.manageButtonText}>Manage Fleet</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.emerald} />
          </Pressable>
        </View>

        {/* Particle Environment */}
        <ParticleFluxWidget />

        {/* Critical Alerts */}
        {criticalRisks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color="#dc2626" />
              <Text style={styles.sectionTitle}>Attention Required</Text>
            </View>
            {criticalRisks.map((risk) => (
              <View key={risk.satellite.id} style={styles.alertCard}>
                <Text style={styles.alertSatName}>{risk.satellite.name}</Text>
                <Text style={[styles.alertRisk, { color: risk.color }]}>
                  {risk.riskLevel.toUpperCase()} DRAG RISK
                </Text>
                <Text style={styles.alertRecommendation}>{risk.recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Orbit Raising Satellites */}
        {orbitRaisingSats.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="rocket" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Orbit Raising ({orbitRaisingSats.length})</Text>
            </View>
            {orbitRaisingSats.map((sat) => (
              <SatelliteCard
                key={sat.id}
                satellite={sat}
                dragRisk={dragRisks.find((r) => r.satellite.id === sat.id)}
                onPress={() => selectSatellite(sat)}
              />
            ))}
          </View>
        )}

        {/* Selected Satellite Details */}
        {selectedSatellite && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="planet" size={20} color={COLORS.emerald} />
              <Text style={styles.sectionTitle}>{selectedSatellite.name}</Text>
              <Pressable onPress={() => selectSatellite(null)}>
                <Ionicons name="close" size={20} color={COLORS.muted} />
              </Pressable>
            </View>

            <Pressable
              style={styles.logAnomalyButton}
              onPress={() => setShowAnomalyLogger(true)}
            >
              <Ionicons name="add-circle" size={20} color={COLORS.text} />
              <Text style={styles.logAnomalyText}>Log Anomaly</Text>
            </Pressable>

            <Text style={styles.anomalyHeader}>
              Anomaly History ({anomalies.length})
            </Text>
            <AnomalyList anomalies={anomalies} onDelete={deleteAnomaly} />
          </View>
        )}

        {/* Fleet Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{satellites.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {satellites.filter((s) => s.orbit_type === 'LEO').length}
              </Text>
              <Text style={styles.summaryLabel}>LEO</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {satellites.filter((s) => s.orbit_type === 'GEO').length}
              </Text>
              <Text style={styles.summaryLabel}>GEO</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{orbitRaisingSats.length}</Text>
              <Text style={styles.summaryLabel}>Raising</Text>
            </View>
          </View>
        </View>

        <AnomalyLogger
          visible={showAnomalyLogger}
          satelliteId={selectedSatellite?.id || ''}
          satelliteName={selectedSatellite?.name || ''}
          onClose={() => setShowAnomalyLogger(false)}
          onLog={addAnomaly}
        />
      </ScrollView>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 14,
    color: COLORS.emerald,
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  alertCard: {
    backgroundColor: '#dc262610',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  alertSatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  alertRisk: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  alertRecommendation: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  logAnomalyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  logAnomalyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  anomalyHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
});
