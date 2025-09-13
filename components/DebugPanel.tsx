import { useAuroraChance, useLatestUpdateTime, useSolarStormStore } from '@/lib/state/useStore';
import { COLORS, SPACING } from '@/lib/util/colors';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function DebugPanel() {
  const {
    kp,
    bz,
    speed,
    density,
    alerts,
    kpUpdatedAt,
    swUpdatedAt,
    isLoading,
    error,
  } = useSolarStormStore();

  const auroraChance = useAuroraChance();
  const latestUpdateTime = useLatestUpdateTime();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 Debug Panel</Text>
      
      <ScrollView style={styles.content}>
        <Text style={styles.section}>📊 Store State:</Text>
        <Text style={styles.text}>Kp: {kp !== null ? kp.toFixed(2) : 'null'}</Text>
        <Text style={styles.text}>Bz: {bz !== null ? bz.toFixed(1) : 'null'} nT</Text>
        <Text style={styles.text}>Speed: {speed !== null ? speed.toFixed(0) : 'null'} km/s</Text>
        <Text style={styles.text}>Density: {density !== null ? density.toFixed(1) : 'null'} p/cm³</Text>
        <Text style={styles.text}>Loading: {isLoading ? 'true' : 'false'}</Text>
        <Text style={styles.text}>Error: {error || 'none'}</Text>
        
        <Text style={styles.section}>⏰ Timestamps:</Text>
        <Text style={styles.text}>Kp Updated: {kpUpdatedAt || 'never'}</Text>
        <Text style={styles.text}>SW Updated: {swUpdatedAt || 'never'}</Text>
        <Text style={styles.text}>Latest Update: {latestUpdateTime || 'never'}</Text>
        
        <Text style={styles.section}>🌌 Aurora Chance:</Text>
        <Text style={styles.text}>{auroraChance}</Text>
        
        <Text style={styles.section}>🚨 Alerts ({alerts.length}):</Text>
        {alerts.length === 0 ? (
          <Text style={styles.text}>No alerts</Text>
        ) : (
          alerts.slice(0, 2).map((alert, index) => (
            <View key={index} style={styles.alertItem}>
              <Text style={styles.alertTime}>{alert.issue_datetime}</Text>
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.message.substring(0, 100)}...
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.emerald,
    marginBottom: SPACING.sm,
  },
  content: {
    maxHeight: 300,
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.emerald,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  text: {
    fontSize: 12,
    color: COLORS.muted,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  alertItem: {
    backgroundColor: COLORS.bg,
    padding: SPACING.xs,
    borderRadius: 4,
    marginBottom: SPACING.xs,
  },
  alertTime: {
    fontSize: 10,
    color: COLORS.aurora.medium,
    fontFamily: 'monospace',
  },
  alertText: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
});
