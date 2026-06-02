import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenTitle } from '@/components/ui-kit';
import { Fonts, kpScale, Palette } from '@/constants/solar';
import { AlertPrefs, alertWouldFire, DEFAULT_PREFS, getAlertPrefs, saveAlertPrefs } from '@/lib/alertPrefs';
import { registerAlertTask, unregisterAlertTask } from '@/lib/backgroundAlerts';
import { present, requestNotificationPermission } from '@/lib/notifications';
import { useSky } from '@/lib/sky';

function fmtHour(h: number): string {
  const am = h < 12;
  const display = ((h + 11) % 12) + 1;
  return `${display}:00 ${am ? 'AM' : 'PM'}`;
}

export default function AlertsScreen() {
  const { conditions } = useSky();
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    getAlertPrefs().then(setPrefs);
  }, []);

  function update(patch: Partial<AlertPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveAlertPrefs(next);
      return next;
    });
  }

  async function toggleNotifications(v: boolean) {
    if (v) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications are off', 'Enable notifications for SolarStorm in iOS Settings to receive alerts.');
        return;
      }
      update({ notificationsEnabled: true });
      await registerAlertTask();
    } else {
      update({ notificationsEnabled: false });
      await unregisterAlertTask();
    }
  }

  const kp = conditions?.kp ?? null;
  const bz = conditions?.solarWind.bz ?? null;
  const firing = alertWouldFire(prefs, kp, bz);
  const scale = kpScale(prefs.kpThreshold);
  const on = prefs.notificationsEnabled;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Alerts" subtitle="Get a heads-up when the Sun acts up" />

        {/* Master switch */}
        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>Notifications</Text>
              <Text style={styles.dim}>Background checks fire a local alert when something happens.</Text>
            </View>
            <Switch value={on} onValueChange={toggleNotifications} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
          </View>
        </Card>

        {on ? (
          <>
            {/* Live storm status */}
            <Card style={{ borderColor: firing ? Palette.warn : 'rgba(255,255,255,0.12)' }}>
              <View style={styles.statusRow}>
                <Ionicons name={firing ? 'alert-circle' : 'shield-checkmark'} size={24} color={firing ? Palette.warn : Palette.good} />
                <View style={styles.left}>
                  <Text style={styles.statusTitle}>{firing ? 'Storm conditions met' : 'All quiet'}</Text>
                  <Text style={styles.dim}>
                    {firing
                      ? `Kp ${kp?.toFixed(1)} — you'd be alerted now.`
                      : `Watching for Kp ≥ ${prefs.kpThreshold}${prefs.requireBz ? ' with Bz < 0' : ''}.`}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Storm */}
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.label}>Geomagnetic storm</Text>
                  <Text style={styles.dim}>When Kp crosses your threshold</Text>
                </View>
                <Switch value={prefs.storm} onValueChange={(v) => update({ storm: v })} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
              </View>
              {prefs.storm ? (
                <>
                  <View style={styles.stepper}>
                    <Stepper symbol="−" onPress={() => update({ kpThreshold: Math.max(1, prefs.kpThreshold - 1) })} />
                    <View style={styles.stepperValue}>
                      <Text style={[styles.thresholdNum, { color: scale.color }]}>Kp {prefs.kpThreshold}</Text>
                      <Text style={[styles.thresholdScale, { color: scale.color }]}>{scale.label}</Text>
                    </View>
                    <Stepper symbol="+" onPress={() => update({ kpThreshold: Math.min(9, prefs.kpThreshold + 1) })} />
                  </View>
                  <View style={[styles.row, { marginTop: 16 }]}>
                    <Text style={styles.subLabel}>Require southward Bz</Text>
                    <Switch value={prefs.requireBz} onValueChange={(v) => update({ requireBz: v })} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
                  </View>
                </>
              ) : null}
            </Card>

            {/* Flares + radiation */}
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.label}>Flares & radiation</Text>
                  <Text style={styles.dim}>M/X-class flares and S2+ radiation storms</Text>
                </View>
                <Switch value={prefs.flares} onValueChange={(v) => update({ flares: v })} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
              </View>
            </Card>

            {/* Daily digest */}
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.label}>Daily digest</Text>
                  <Text style={styles.dim}>A once-a-day summary of conditions</Text>
                </View>
                <Switch value={prefs.dailyDigest} onValueChange={(v) => update({ dailyDigest: v })} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
              </View>
              {prefs.dailyDigest ? (
                <View style={[styles.row, { marginTop: 16 }]}>
                  <Text style={styles.subLabel}>Around</Text>
                  <View style={styles.timeStepper}>
                    <Stepper small symbol="−" onPress={() => update({ digestHour: (prefs.digestHour + 23) % 24 })} />
                    <Text style={styles.timeText}>{fmtHour(prefs.digestHour)}</Text>
                    <Stepper small symbol="+" onPress={() => update({ digestHour: (prefs.digestHour + 1) % 24 })} />
                  </View>
                </View>
              ) : null}
            </Card>

            {/* Weekly heads-up */}
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.label}>Weekly heads-up</Text>
                  <Text style={styles.dim}>When the 2-week outlook turns active</Text>
                </View>
                <Switch value={prefs.weekly} onValueChange={(v) => update({ weekly: v })} trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }} />
              </View>
            </Card>

            <Pressable
              style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}
              onPress={() => present('SolarStorm', 'Notifications are working ✓')}>
              <Text style={styles.testText}>Send a test notification</Text>
            </Pressable>

            <Text style={styles.note}>
              Background alerts run on a custom build (not Expo Go), and iOS delivers them
              opportunistically — usually within an hour, not instantly. Time-critical instant
              push is a future server-backed update.
            </Text>
          </>
        ) : (
          <Text style={styles.note}>
            Turn on notifications to be alerted about storms, flares, and the weekly outlook —
            even when the app is closed.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ symbol, onPress, small }: { symbol: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [small ? styles.stepBtnSm : styles.stepBtn, pressed && { opacity: 0.6 }]}>
      <Text style={small ? styles.stepSymbolSm : styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 12, paddingBottom: 130 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusTitle: { color: Palette.text, fontSize: 17, fontFamily: Fonts.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  left: { gap: 3, flexShrink: 1 },
  label: { color: Palette.text, fontSize: 16, fontFamily: Fonts.bold },
  subLabel: { color: Palette.text, fontSize: 15, fontFamily: Fonts.medium },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  stepperValue: { alignItems: 'center', gap: 2 },
  thresholdNum: { fontSize: 28, fontFamily: Fonts.bold },
  thresholdScale: { fontSize: 13, fontFamily: Fonts.semibold },
  timeStepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  timeText: { color: Palette.text, fontSize: 16, fontFamily: Fonts.bold, minWidth: 78, textAlign: 'center' },
  stepBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: Palette.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepBtnSm: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { color: Palette.text, fontSize: 28, fontFamily: Fonts.bold },
  stepSymbolSm: { color: Palette.text, fontSize: 22, fontFamily: Fonts.bold },
  testBtn: { backgroundColor: Palette.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: Palette.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  testText: { color: Palette.accent, fontSize: 15, fontFamily: Fonts.semibold },
  pressed: { opacity: 0.7 },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
