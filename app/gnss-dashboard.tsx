import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { TecStatusCard } from '@/components/gnss/TecStatusCard';
import { RegionalTecList } from '@/components/gnss/RegionalTecList';
import { ConstellationStatus } from '@/components/gnss/ConstellationStatus';
import { ScintillationCard } from '@/components/gnss/ScintillationCard';
import { AddRegionModal } from '@/components/gnss/AddRegionModal';
import { useGnssStore, useGnssOverallStatus } from '@/lib/state/useGnssStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

export default function GnssDashboardPage() {
  const { kp } = useSolarStormStore();
  const {
    regions,
    primaryRegion,
    tecStatus,
    scintillationStatus,
    constellationStatus,
    isLoading,
    fetchRegions,
    addRegion,
    refreshAll,
  } = useGnssStore();
  const overallStatus = useGnssOverallStatus();

  const [showAddRegion, setShowAddRegion] = useState(false);

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    if (kp !== null) {
      refreshAll(kp);
    }
  }, [kp, regions.length]);

  const statusColor =
    overallStatus === 'nominal' ? '#22c55e' :
    overallStatus === 'caution' ? '#fbbf24' :
    overallStatus === 'degraded' ? '#f59e0b' : COLORS.muted;

  return (
    <FeatureGate feature="apiAccess">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>GNSS Operations</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {overallStatus === 'loading' ? 'Loading...' : overallStatus.toUpperCase()}
              </Text>
            </View>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowAddRegion(true)}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Region</Text>
          </Pressable>
        </View>

        {isLoading && !tecStatus ? (
          <ActivityIndicator size="large" color={COLORS.emerald} style={styles.loader} />
        ) : (
          <>
            {/* Constellation Status */}
            {constellationStatus && (
              <ConstellationStatus status={constellationStatus} />
            )}

            {/* TEC Status */}
            {tecStatus && (
              <>
                <TecStatusCard status={tecStatus} />
                <RegionalTecList regions={tecStatus.regions} />
              </>
            )}

            {/* Scintillation */}
            {scintillationStatus && primaryRegion && (
              <ScintillationCard
                status={scintillationStatus}
                regionName={primaryRegion.label}
              />
            )}

            {/* RTK/PPP Alert */}
            {tecStatus && tecStatus.global.condition.level !== 'normal' && (
              <View style={styles.alertCard}>
                <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>RTK/PPP Advisory</Text>
                  <Text style={styles.alertText}>
                    Elevated ionospheric activity may affect precision positioning.
                    {tecStatus.global.condition.level === 'extreme' &&
                      ' Consider pausing precision operations.'}
                    {tecStatus.global.condition.level === 'high' &&
                      ' Monitor convergence times and fix availability.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Regions list */}
            {regions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Monitored Regions ({regions.length})</Text>
                {regions.map((region) => (
                  <View key={region.id} style={styles.regionItem}>
                    <View style={styles.regionInfo}>
                      <Text style={styles.regionName}>
                        {region.is_primary && '\u2b50 '}{region.label}
                      </Text>
                      <Text style={styles.regionCoords}>
                        {region.center_lat.toFixed(2)}\u00b0, {region.center_lng.toFixed(2)}\u00b0 ({region.radius_km}km)
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {regions.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="navigate-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyText}>No regions configured</Text>
                <Text style={styles.emptyHint}>
                  Add your operating regions to get localized TEC and scintillation data
                </Text>
              </View>
            )}
          </>
        )}

        <AddRegionModal
          visible={showAddRegion}
          onClose={() => setShowAddRegion(false)}
          onAdd={addRegion}
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
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  loader: {
    marginTop: 48,
  },
  alertCard: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  regionItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  regionInfo: {
    gap: 2,
  },
  regionName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  regionCoords: {
    fontSize: 12,
    color: COLORS.muted,
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
});
