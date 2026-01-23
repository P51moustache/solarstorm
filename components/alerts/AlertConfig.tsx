import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { TIER_FEATURES } from '@/lib/features/tiers';
import { sendTestNotification } from '@/lib/services/alertNotifications';
import { useAlertStore } from '@/lib/state/useAlertStore';
import { useAuthStore } from '@/lib/state/useAuthStore';
import { COLORS } from '@/lib/util/colors';
import { ensureNotificationPermission } from '@/lib/util/notifications';

// Helper to convert "HH:mm" string to Date
function timeStringToDate(timeStr: string | null): Date {
  const now = new Date();
  if (!timeStr) return now;
  const [hours, minutes] = timeStr.split(':').map(Number);
  now.setHours(hours, minutes, 0, 0);
  return now;
}

// Helper to format Date to "HH:mm" string
function dateToTimeString(date: Date): string {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function AlertConfig() {
  const tier = useAuthStore((s) => s.tier);
  const { config, fetchConfig, updateConfig, testAlert } = useAlertStore();

  const [kpThreshold, setKpThreshold] = useState(5);
  const [bzThreshold, setBzThreshold] = useState(-5);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(new Date());
  const [quietEnd, setQuietEnd] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const alertLimit = TIER_FEATURES[tier].alertsPerDay;
  const isUnlimited = alertLimit === Infinity;

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config) {
      setKpThreshold(config.kp_threshold);
      setBzThreshold(config.bz_threshold ?? -5);
      setEmailEnabled(config.email_enabled);
      setPushEnabled(config.push_enabled);
      setQuietHoursEnabled(!!config.quiet_start);
      setQuietStart(timeStringToDate(config.quiet_start));
      setQuietEnd(timeStringToDate(config.quiet_end));
    }
  }, [config]);

  const handleSave = async () => {
    await updateConfig({
      kp_threshold: kpThreshold,
      bz_threshold: bzThreshold,
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alert Settings</Text>
        {!isUnlimited && (
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>{alertLimit}/day limit</Text>
          </View>
        )}
      </View>

      {/* Kp Threshold */}
      <View style={styles.setting}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingLabel}>Kp Threshold</Text>
          <Text style={styles.settingValue}>Kp &ge; {kpThreshold}</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={9}
          step={1}
          value={kpThreshold}
          onValueChange={setKpThreshold}
          onSlidingComplete={handleSave}
          minimumTrackTintColor={COLORS.emerald}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.emerald}
        />
        <Text style={styles.settingHint}>
          Alert when Kp index reaches this level
        </Text>
      </View>

      {/* Bz Threshold - Plus feature */}
      <FeatureGate feature="locationPredictions" showUpgrade={false}>
        <View style={styles.setting}>
          <View style={styles.settingHeader}>
            <Text style={styles.settingLabel}>Bz Threshold</Text>
            <Text style={styles.settingValue}>{bzThreshold} nT</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={-20}
            maximumValue={0}
            step={1}
            value={bzThreshold}
            onValueChange={setBzThreshold}
            onSlidingComplete={handleSave}
            minimumTrackTintColor={COLORS.bz.negative}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.bz.negative}
          />
          <Text style={styles.settingHint}>
            Also require Bz to drop below this value (southward)
          </Text>
        </View>
      </FeatureGate>

      {/* Notification channels */}
      <View style={styles.setting}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Text style={styles.settingHint}>Receive alerts via email</Text>
          </View>
          <Switch
            value={emailEnabled}
            onValueChange={(value) => {
              setEmailEnabled(value);
              updateConfig({ email_enabled: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
            thumbColor={emailEnabled ? COLORS.emerald : COLORS.muted}
          />
        </View>
      </View>

      <View style={styles.setting}>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingHint}>Receive alerts on this device</Text>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={async (value) => {
              if (value) {
                const hasPermission = await ensureNotificationPermission();
                if (!hasPermission) {
                  return; // Permission denied, don't enable
                }
              }
              setPushEnabled(value);
              updateConfig({ push_enabled: value });
            }}
            trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
            thumbColor={pushEnabled ? COLORS.emerald : COLORS.muted}
          />
        </View>
      </View>

      {/* Quiet Hours - Plus feature */}
      <FeatureGate feature="locationPredictions" showUpgrade={false}>
        <View style={styles.setting}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Quiet Hours</Text>
              <Text style={styles.settingHint}>Silence alerts during these times</Text>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={(value) => {
                setQuietHoursEnabled(value);
                if (!value) {
                  updateConfig({ quiet_start: null, quiet_end: null });
                } else {
                  updateConfig({
                    quiet_start: dateToTimeString(quietStart),
                    quiet_end: dateToTimeString(quietEnd),
                  });
                }
              }}
              trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
              thumbColor={quietHoursEnabled ? COLORS.emerald : COLORS.muted}
            />
          </View>

          {quietHoursEnabled && (
            <View style={styles.quietTimeRow}>
              <Pressable
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}
              >
                <Ionicons name="moon-outline" size={16} color={COLORS.muted} />
                <Text style={styles.timeButtonText}>
                  Start: {dateToTimeString(quietStart)}
                </Text>
              </Pressable>

              <Text style={styles.timeSeparator}>to</Text>

              <Pressable
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}
              >
                <Ionicons name="sunny-outline" size={16} color={COLORS.muted} />
                <Text style={styles.timeButtonText}>
                  End: {dateToTimeString(quietEnd)}
                </Text>
              </Pressable>
            </View>
          )}

          {showStartPicker && (
            <DateTimePicker
              value={quietStart}
              mode="time"
              is24Hour={true}
              onChange={(event, date) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (date) {
                  setQuietStart(date);
                  updateConfig({ quiet_start: dateToTimeString(date) });
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={quietEnd}
              mode="time"
              is24Hour={true}
              onChange={(event, date) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (date) {
                  setQuietEnd(date);
                  updateConfig({ quiet_end: dateToTimeString(date) });
                }
              }}
            />
          )}
        </View>
      </FeatureGate>

      {/* Test alert button */}
      <Pressable style={styles.testButton} onPress={sendTestNotification}>
        <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
        <Text style={styles.testButtonText}>Send Test Alert</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  limitBadge: {
    backgroundColor: COLORS.aurora.medium + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  limitText: {
    fontSize: 12,
    color: COLORS.aurora.medium,
    fontWeight: '500',
  },
  setting: {
    marginBottom: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.emerald,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  settingHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.bg,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  quietTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  timeSeparator: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
