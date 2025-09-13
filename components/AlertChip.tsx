import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { getAlertLevel, isRecentAlert, type SwpcAlert } from '../lib/api/parsers/alerts';
import { COLORS, RADIUS, SPACING } from '../lib/util/colors';

interface AlertChipProps {
  alerts: SwpcAlert[];
  onPress?: (alert: SwpcAlert) => void;
}

export function AlertChip({ alerts, onPress }: AlertChipProps) {
  const recentAlert = React.useMemo(() => {
    return alerts.find(alert => isRecentAlert(alert, 24));
  }, [alerts]);

  if (!recentAlert) {
    return null;
  }

  const alertLevel = getAlertLevel(recentAlert.message);
  const alertColor = getAlertColor(alertLevel);

  const handlePress = () => {
    onPress?.(recentAlert);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: alertColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>
        {alertLevel ? `${alertLevel} ` : ''}Geomagnetic storm watch
      </Text>
    </TouchableOpacity>
  );
}

function getAlertColor(level: string | null): string {
  switch (level) {
    case 'G5':
      return '#CC3232'; // Red
    case 'G4':
      return '#DB7B2B'; // Orange-red
    case 'G3':
      return '#E7B416'; // Orange
    case 'G2':
      return '#99C140'; // Yellow-orange
    case 'G1':
      return '#2DC937'; // Yellow-green
    default:
      return COLORS.emerald;
  }
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
});
