import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Fonts, Palette } from '@/constants/solar';

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Frosted-glass panel — lets the aurora backdrop glow through. */
export function Glass({
  children,
  style,
  intensity = 24,
}: {
  children: ReactNode;
  style?: ViewStyle;
  intensity?: number;
}) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

/** Back-compat alias — existing screens use <Card>. */
export const Card = Glass;

export function Metric({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValueRow}>
        <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleWrap: { gap: 4, marginBottom: 4 },
  title: { color: Palette.text, fontSize: 30, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  subtitle: { color: Palette.textDim, fontSize: 14, fontFamily: Fonts.regular },
  glass: {
    borderRadius: 22,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(14,17,25,0.35)',
    overflow: 'hidden',
  },
  metric: { flex: 1, gap: 6 },
  metricLabel: {
    color: Palette.textDim,
    fontSize: 12,
    fontFamily: Fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  metricValue: { color: Palette.text, fontSize: 26, fontFamily: Fonts.bold },
  metricUnit: { color: Palette.textFaint, fontSize: 13, fontFamily: Fonts.medium },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 13, fontFamily: Fonts.bold },
});
