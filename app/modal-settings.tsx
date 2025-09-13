import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { Section } from '@/components/Section';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS, RADIUS, SPACING } from '@/lib/util/colors';
import { ensureNotificationPermission } from '@/lib/util/notifications';
import { setBackgroundFetchSettings } from '@/lib/util/background';

const THRESHOLD_OPTIONS = [
  { value: 4, label: 'Kp 4 (Active)' },
  { value: 5, label: 'Kp 5 (Minor storm)' },
  { value: 6, label: 'Kp 6 (Moderate storm)' },
  { value: 0, label: 'Off' },
];

export default function ModalSettingsScreen() {
  const {
    kpThreshold,
    requireBzGate,
    setKpThreshold,
    toggleBzGate,
    resetCache,
  } = useSolarStormStore();

  const [notificationPermission, setNotificationPermission] = React.useState<boolean | null>(null);

  // Check notification permissions on mount
  React.useEffect(() => {
    checkNotificationPermission();
  }, []);

  //

  const checkNotificationPermission = async () => {
    try {
      const hasPermission = await ensureNotificationPermission();
      setNotificationPermission(hasPermission);
    } catch (error) {
      console.error('Failed to check notification permission:', error);
      setNotificationPermission(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  const handleThresholdChange = (value: 4 | 5 | 6 | 0) => {
    setKpThreshold(value);
    // Keep background task settings in sync
    setBackgroundFetchSettings({ kpThreshold: value });
  };

  const handleRequestNotifications = async () => {
    try {
      const granted = await ensureNotificationPermission();
      setNotificationPermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive aurora alerts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive alerts when aurora activity meets your threshold settings.'
        );
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      Alert.alert('Error', 'Failed to configure notifications');
    }
  };

  const handleResetCache = () => {
    Alert.alert(
      'Reset Cache',
      'This will clear all cached data and force fresh downloads. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetCache();
              Alert.alert('Success', 'Cache has been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset cache');
            }
          },
        },
      ]
    );
  };

  

  const getPermissionText = () => {
    if (notificationPermission === null) return 'Checking...';
    return notificationPermission ? 'Granted' : 'Not granted';
  };

  const getPermissionColor = () => {
    if (notificationPermission === null) return COLORS.muted;
    return notificationPermission ? COLORS.emerald : COLORS.bz.negative;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Alert Settings */}
        <Section title="Alert Settings">
          <View style={styles.settingGroup}>
            <Text style={styles.settingLabel}>Kp Alert Threshold</Text>
            <Text style={styles.settingDescription}>
              Get notified when geomagnetic activity reaches this level
            </Text>
            
            <View style={styles.thresholdButtons}>
              {THRESHOLD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.thresholdButton,
                    kpThreshold === option.value && styles.thresholdButtonActive,
                  ]}
                  onPress={() => handleThresholdChange(option.value as 4 | 5 | 6 | 0)}
                >
                  <Text
                    style={[
                      styles.thresholdButtonText,
                      kpThreshold === option.value && styles.thresholdButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Bz Confirmation Gate</Text>
                <Text style={styles.settingDescription}>
                  Only alert when Bz ≤ -5 nT for ≥10 minutes
                </Text>
              </View>
              <Switch
                value={requireBzGate}
                onValueChange={() => {
                  // Toggle store state
                  toggleBzGate();
                  // Sync background settings with the new value
                  setBackgroundFetchSettings({ bzGateEnabled: !requireBzGate });
                }}
                trackColor={{ false: COLORS.border, true: COLORS.emerald }}
                thumbColor={COLORS.text}
              />
            </View>
          </View>
        </Section>

        {/* */}

        {/* Notification Permissions */}
        <Section title="Notifications">
          <View style={styles.settingGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Permission Status</Text>
                <Text style={[styles.permissionStatus, { color: getPermissionColor() }]}>
                  {getPermissionText()}
                </Text>
              </View>
              {!notificationPermission && (
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={handleRequestNotifications}
                >
                  <Text style={styles.permissionButtonText}>Enable</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {!notificationPermission && (
              <Text style={styles.settingDescription}>
                Notifications are required to receive aurora activity alerts
              </Text>
            )}
          </View>
        </Section>

        {/* Data Sources */}
        <Section title="Data Sources">
          <View style={styles.sourceGroup}>
            <Text style={styles.sourceTitle}>NOAA Space Weather Prediction Center</Text>
            <Text style={styles.sourceUrl}>services.swpc.noaa.gov</Text>
            <View style={styles.sourceList}>
              <Text style={styles.sourceItem}>• Planetary K-index (1-minute)</Text>
              <Text style={styles.sourceItem}>• Solar wind magnetic field</Text>
              <Text style={styles.sourceItem}>• Solar wind plasma data</Text>
              <Text style={styles.sourceItem}>• OVATION Aurora model</Text>
              <Text style={styles.sourceItem}>• Geomagnetic alerts</Text>
            </View>
          </View>
        </Section>

        {/* Cache Management */}
        <Section title="Data Management">
          <View style={styles.settingGroup}>
            <TouchableOpacity style={styles.actionButton} onPress={handleResetCache}>
              <Text style={styles.actionButtonText}>Reset Cache</Text>
              <Text style={styles.actionButtonDescription}>
                Clear all cached data and force fresh downloads
              </Text>
            </TouchableOpacity>
          </View>
        </Section>

        {/* App Info */}
        <Section title="About">
          <View style={styles.infoGroup}>
            <Text style={styles.infoText}>
              SolarStorm provides real-time space weather monitoring using free, public data from
              NOAA's Space Weather Prediction Center. No accounts or tracking required.
            </Text>
            <Text style={styles.infoText}>
              Data is cached locally and updated automatically. Background notifications require
              appropriate permissions and may be limited by system power management.
            </Text>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  settingGroup: {
    marginBottom: SPACING.lg,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  thresholdButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  thresholdButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  thresholdButtonActive: {
    backgroundColor: COLORS.emerald,
    borderColor: COLORS.emerald,
  },
  thresholdButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  thresholdButtonTextActive: {
    color: COLORS.bg,
  },
  permissionStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  permissionButton: {
    backgroundColor: COLORS.emerald,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bg,
  },
  sourceGroup: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  sourceUrl: {
    fontSize: 14,
    color: COLORS.emerald,
    marginBottom: SPACING.md,
  },
  sourceList: {
    gap: 4,
  },
  sourceItem: {
    fontSize: 14,
    color: COLORS.muted,
  },
  actionButton: {
    backgroundColor: COLORS.card,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bz.negative,
    marginBottom: 4,
  },
  actionButtonDescription: {
    fontSize: 14,
    color: COLORS.muted,
  },
  infoGroup: {
    gap: SPACING.md,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
});
