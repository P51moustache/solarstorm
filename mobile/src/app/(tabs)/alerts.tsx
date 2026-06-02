import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenTitle } from '@/components/ui-kit';
import { Fonts, kpScale, Palette } from '@/constants/solar';
import { AlertPrefs, alertWouldFire, DEFAULT_PREFS, getAlertPrefs, saveAlertPrefs } from '@/lib/alertPrefs';
import { useSky } from '@/lib/sky';

export default function AlertsScreen() {
  const { conditions } = useSky();
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    getAlertPrefs().then(setPrefs);
  }, []);

  // Persist on every change.
  function update(patch: Partial<AlertPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      saveAlertPrefs(next);
      return next;
    });
  }

  const kp = conditions?.kp ?? null;
  const bz = conditions?.solarWind.bz ?? null;
  const firing = alertWouldFire(prefs, kp, bz);
  const scale = kpScale(prefs.kpThreshold);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Alerts" subtitle="Get notified when a storm hits" />

        {/* Live status */}
        <Card style={{ borderColor: firing ? Palette.warn : 'rgba(255,255,255,0.12)' }}>
          <View style={styles.statusRow}>
            <Ionicons
              name={!prefs.enabled ? 'notifications-off' : firing ? 'alert-circle' : 'shield-checkmark'}
              size={26}
              color={!prefs.enabled ? Palette.textFaint : firing ? Palette.warn : Palette.good}
            />
            <View style={styles.left}>
              <Text style={styles.statusTitle}>
                {!prefs.enabled
                  ? 'Alerts are off'
                  : firing
                    ? 'Conditions meet your alert'
                    : 'All quiet'}
              </Text>
              <Text style={styles.dim}>
                {!prefs.enabled
                  ? 'Turn on alerts to be notified.'
                  : firing
                    ? `Kp ${kp?.toFixed(1)} with southward Bz — aurora watch is on.`
                    : `Watching for Kp ≥ ${prefs.kpThreshold}${prefs.requireBz ? ' with Bz < 0' : ''}.`}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>Storm alerts</Text>
              <Text style={styles.dim}>Notify me when conditions cross my threshold</Text>
            </View>
            <Switch
              value={prefs.enabled}
              onValueChange={(v) => update({ enabled: v })}
              trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Kp threshold</Text>
          <Text style={styles.dim}>Alert me when Kp reaches this level</Text>
          <View style={styles.stepper}>
            <Stepper symbol="−" onPress={() => update({ kpThreshold: Math.max(1, prefs.kpThreshold - 1) })} />
            <View style={styles.stepperValue}>
              <Text style={[styles.thresholdNum, { color: scale.color }]}>Kp {prefs.kpThreshold}</Text>
              <Text style={[styles.thresholdScale, { color: scale.color }]}>{scale.label}</Text>
            </View>
            <Stepper symbol="+" onPress={() => update({ kpThreshold: Math.min(9, prefs.kpThreshold + 1) })} />
          </View>
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>Require southward Bz</Text>
              <Text style={styles.dim}>Reduce false alarms by confirming Bz &lt; 0</Text>
            </View>
            <Switch
              value={prefs.requireBz}
              onValueChange={(v) => update({ requireBz: v })}
              trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }}
            />
          </View>
        </Card>

        <Text style={styles.note}>
          Your preferences are saved and checked whenever you open the app. Push notifications
          that reach you even when the app is closed are coming in a future update.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ symbol, onPress }: { symbol: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}>
      <Text style={styles.stepSymbol}>{symbol}</Text>
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
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  stepperValue: { alignItems: 'center', gap: 2 },
  thresholdNum: { fontSize: 28, fontFamily: Fonts.bold },
  thresholdScale: { fontSize: 13, fontFamily: Fonts.semibold },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSymbol: { color: Palette.text, fontSize: 28, fontFamily: Fonts.bold },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8 },
});
