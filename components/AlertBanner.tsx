import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAlertLevel, isRecentAlert, type SwpcAlert } from '../lib/api/parsers/alerts';
import { COLORS, RADIUS, SPACING } from '../lib/util/colors';

interface AlertBannerProps {
  alerts: SwpcAlert[];
  onPress?: (alert: SwpcAlert) => void;
}

export function AlertBanner({ alerts, onPress }: AlertBannerProps) {
  const recentAlert = React.useMemo(() => {
    return alerts.find(alert => isRecentAlert(alert, 24));
  }, [alerts]);

  if (!recentAlert) {
    return null;
  }

  const alertLevel = getAlertLevel(recentAlert.message);
  const alertColor = getAlertColor(alertLevel);
  const alertIcon = getAlertIcon(alertLevel);

  const handlePress = () => {
    onPress?.(recentAlert);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: alertColor }]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Geomagnetic storm alert${alertLevel ? ` ${alertLevel}` : ''}. Tap for details.`}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={alertIcon as any} 
            size={24} 
            color={alertColor}
          />
        </View>
        
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.alertLabel}>GEOMAGNETIC STORM ALERT</Text>
            {alertLevel && (
              <View style={[styles.levelBadge, { backgroundColor: alertColor }]}>
                <Text style={styles.levelText}>{alertLevel}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.alertMessage} numberOfLines={2}>
            {getAlertDisplayText(recentAlert.message, alertLevel)}
          </Text>
          
          <Text style={styles.tapHint}>Tap for details</Text>
        </View>
        
        <View style={styles.chevronContainer}>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={COLORS.muted}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function getAlertDisplayText(message: string, level: string | null): string {
  // Clean up the message for better display
  if (level?.startsWith('K') && message.includes('GEOMAGNETIC K-INDEX')) {
    return `High geomagnetic activity detected. Aurora activity may increase.`;
  }
  
  if (level?.startsWith('G') && message.includes('GEOMAGNETIC STORM')) {
    return `Geomagnetic storm conditions detected. Aurora may be visible at lower latitudes.`;
  }
  
  // Clean up the raw message
  return message
    .replace(/ALERT:\s*/gi, '')
    .replace(/WARNING:\s*/gi, '')
    .replace(/GEOMAGNETIC\s+/gi, 'Geomagnetic ')
    .trim();
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
    case 'K5':
    case 'K4':
      return '#DB7B2B'; // Orange-red for K-index alerts
    default:
      return COLORS.emerald;
  }
}

function getAlertIcon(level: string | null): string {
  switch (level) {
    case 'G5':
    case 'G4':
      return 'thunderstorm';
    case 'G3':
    case 'G2':
      return 'flash';
    case 'K5':
    case 'K4':
      return 'warning';
    default:
      return 'warning';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  iconContainer: {
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  alertLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  levelBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertMessage: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  tapHint: {
    fontSize: 11,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  chevronContainer: {
    marginLeft: SPACING.sm,
  },
});
