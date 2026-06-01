import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenTitle } from '@/components/ui-kit';
import { kpScale, Palette } from '@/constants/solar';

export default function AlertsScreen() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(5);
  const [requireBz, setRequireBz] = useState(true);

  const scale = kpScale(threshold);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Alerts" subtitle="Get notified when a storm hits" />

        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>Storm alerts</Text>
              <Text style={styles.dim}>Notify me when conditions cross my threshold</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.label}>Kp threshold</Text>
          <Text style={styles.dim}>Alert me when Kp reaches this level</Text>
          <View style={styles.stepper}>
            <Stepper symbol="−" onPress={() => setThreshold((t) => Math.max(1, t - 1))} />
            <View style={styles.stepperValue}>
              <Text style={[styles.thresholdNum, { color: scale.color }]}>Kp {threshold}</Text>
              <Text style={[styles.thresholdScale, { color: scale.color }]}>{scale.label}</Text>
            </View>
            <Stepper symbol="+" onPress={() => setThreshold((t) => Math.min(9, t + 1))} />
          </View>
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.label}>Require southward Bz</Text>
              <Text style={styles.dim}>Reduce false alarms by confirming Bz &lt; 0</Text>
            </View>
            <Switch
              value={requireBz}
              onValueChange={setRequireBz}
              trackColor={{ true: Palette.accent, false: Palette.surfaceAlt }}
            />
          </View>
        </Card>

        <Text style={styles.note}>
          Push delivery requires a custom dev build (expo-notifications + APNs) and a backend
          job that polls NOAA — that's the next milestone after this scaffold runs.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stepper({ symbol, onPress }: { symbol: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.stepBtn, pressed && { opacity: 0.6 }]}>
      <Text style={styles.stepSymbol}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 12, paddingBottom: 120 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  left: { gap: 3, flexShrink: 1 },
  label: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  dim: { color: Palette.textDim, fontSize: 13 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  stepperValue: { alignItems: 'center', gap: 2 },
  thresholdNum: { fontSize: 28, fontWeight: '800' },
  thresholdScale: { fontSize: 13, fontWeight: '600' },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepSymbol: { color: Palette.text, fontSize: 28, fontWeight: '700' },
  note: { color: Palette.textFaint, fontSize: 12, textAlign: 'center', marginTop: 8 },
});
