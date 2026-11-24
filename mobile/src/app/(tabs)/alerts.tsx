import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ScreenTitle, Tappable, Toggle } from '@/components/ui';
import { kpScale } from '@/constants/solar';
import { AlertPrefs, alertWouldFire, DEFAULT_PREFS, getAlertPrefs, saveAlertPrefs } from '@/lib/alertPrefs';
import { registerAlertTask, unregisterAlertTask } from '@/lib/backgroundAlerts';
import { present, requestNotificationPermission } from '@/lib/notifications';
import { useSky } from '@/lib/sky';
import { colors, fontSize, fonts, iconSize, layout, lineHeight, radii, space, textStyles } from '@/theme';

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
            <Toggle value={on} onValueChange={toggleNotifications} accessibilityLabel="Notifications" />
          </View>
        </Card>

        {on ? (
          <>
            {/* Live storm status */}
            <Card style={{ borderColor: firing ? colors.warn : colors.glassBorder }}>
              <View style={styles.statusRow}>
                <Ionicons name={firing ? 'alert-circle' : 'shield-checkmark'} size={iconSize.xxl} color={firing ? colors.warn : colors.good} />
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
                <Toggle value={prefs.storm} onValueChange={(v) => update({ storm: v })} accessibilityLabel="Geomagnetic storm" />
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
                  <View style={[styles.row, { marginTop: space[4] }]}>
                    <Text style={styles.subLabel}>Require southward Bz</Text>
                    <Toggle value={prefs.requireBz} onValueChange={(v) => update({ requireBz: v })} accessibilityLabel="Require southward Bz" />
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
                <Toggle value={prefs.flares} onValueChange={(v) => update({ flares: v })} accessibilityLabel="Flares & radiation" />
              </View>
            </Card>

            {/* Daily digest */}
            <Card>
              <View style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.label}>Daily digest</Text>
                  <Text style={styles.dim}>A once-a-day summary of conditions</Text>
                </View>
                <Toggle value={prefs.dailyDigest} onValueChange={(v) => update({ dailyDigest: v })} accessibilityLabel="Daily digest" />
              </View>
              {prefs.dailyDigest ? (
                <View style={[styles.row, { marginTop: space[4] }]}>
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
                <Toggle value={prefs.weekly} onValueChange={(v) => update({ weekly: v })} accessibilityLabel="Weekly heads-up" />
              </View>
            </Card>

            <Button
              variant="outline"
              size="compact"
              label="Send a test notification"
              style={styles.testBtn}
              onPress={() => present('SolarStorm', 'Notifications are working ✓')}
            />

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
    <Tappable onPress={onPress} feedback="soft" style={small ? styles.stepBtnSm : styles.stepBtn}>
      <Text style={small ? styles.stepSymbolSm : styles.stepSymbol}>{symbol}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: layout.screenPadding, gap: layout.stackGap, paddingBottom: layout.tabBarClearance },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[3.5] },
  statusTitle: { ...textStyles.cardTitle, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[3] },
  left: { gap: space[1], flexShrink: 1 },
  label: { fontSize: fontSize.callout, fontFamily: fonts.bold, color: colors.text },
  subLabel: { ...textStyles.bodyStrong, color: colors.text },
  dim: { ...textStyles.footnote, color: colors.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[4] },
  stepperValue: { alignItems: 'center', gap: space[0.5] },
  thresholdNum: { fontSize: fontSize.stat, fontFamily: fonts.bold },
  thresholdScale: { fontSize: fontSize.footnote, fontFamily: fonts.semibold },
  timeStepper: { flexDirection: 'row', alignItems: 'center', gap: space[3.5] },
  timeText: { fontSize: fontSize.callout, fontFamily: fonts.bold, color: colors.text, minWidth: 78, textAlign: 'center' },
  stepBtn: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  stepBtnSm: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  stepSymbol: { fontSize: fontSize.stat, fontFamily: fonts.bold, color: colors.text },
  stepSymbolSm: { fontSize: fontSize.title2, fontFamily: fonts.bold, color: colors.text },
  testBtn: { marginTop: space[1] },
  note: { ...textStyles.caption, color: colors.textFaint, textAlign: 'center', marginTop: space[2], lineHeight: lineHeight.footnote },
});
