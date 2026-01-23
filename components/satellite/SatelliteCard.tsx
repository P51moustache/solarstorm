import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Satellite } from '@/lib/supabase/types';
import type { DragRiskAssessment } from '@/lib/services/dragRisk';
import { COLORS } from '@/lib/util/colors';

interface SatelliteCardProps {
  satellite: Satellite;
  dragRisk?: DragRiskAssessment;
  onPress: () => void;
  onDelete?: () => void;
}

export function SatelliteCard({ satellite, dragRisk, onPress, onDelete }: SatelliteCardProps) {
  const orbitColor = {
    LEO: '#3b82f6',
    MEO: '#8b5cf6',
    GEO: '#f59e0b',
    HEO: '#ec4899',
  }[satellite.orbit_type];

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{satellite.name}</Text>
          {satellite.is_orbit_raising && (
            <View style={styles.orbitRaisingBadge}>
              <Ionicons name="rocket" size={12} color="#f59e0b" />
              <Text style={styles.orbitRaisingText}>Orbit Raising</Text>
            </View>
          )}
        </View>
        {onDelete && (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={[styles.orbitBadge, { backgroundColor: orbitColor + '20' }]}>
            <Text style={[styles.orbitText, { color: orbitColor }]}>
              {satellite.orbit_type}
            </Text>
          </View>
          <Text style={styles.detailText}>
            {satellite.altitude_km.toFixed(0)} km • {satellite.inclination_deg.toFixed(1)}°
          </Text>
        </View>

        {satellite.norad_id && (
          <Text style={styles.noradId}>NORAD: {satellite.norad_id}</Text>
        )}
      </View>

      {dragRisk && satellite.orbit_type === 'LEO' && (
        <View style={[styles.riskBanner, { backgroundColor: dragRisk.color + '15' }]}>
          <View style={[styles.riskDot, { backgroundColor: dragRisk.color }]} />
          <Text style={[styles.riskText, { color: dragRisk.color }]}>
            {dragRisk.riskLevel.toUpperCase()} drag risk
          </Text>
          <Text style={styles.riskFactor}>
            {dragRisk.densityIncreaseFactor}x density
          </Text>
        </View>
      )}
    </Pressable>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  orbitRaisingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  orbitRaisingText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orbitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orbitText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  noradId: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: 'monospace',
  },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  riskFactor: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
