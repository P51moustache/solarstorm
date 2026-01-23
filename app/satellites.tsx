import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SatelliteFleetManager } from '@/components/satellite/SatelliteFleetManager';
import { COLORS } from '@/lib/util/colors';

export default function SatellitesPage() {
  return (
    <View style={styles.container}>
      <SatelliteFleetManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 24,
  },
});
