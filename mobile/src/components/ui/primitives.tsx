import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, space, textStyles } from '@/theme';

/** Default blur strength of a glass card. */
const GLASS_BLUR = 24;

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.titleWrap}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/** Frosted-glass panel — lets the aurora backdrop glow through. */
export function Glass({
  children,
  style,
  intensity = GLASS_BLUR,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}) {
  return (
    <BlurView intensity={intensity} tint="dark" style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

/** Screens use <Card>; it is the glass panel. */
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
  titleWrap: { gap: space[1], marginBottom: space[1] },
  title: { ...textStyles.screenTitle, color: colors.text },
  subtitle: { ...textStyles.subtitle, color: colors.textMuted },
  glass: {
    borderRadius: radii.card,
    padding: space[4.5],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    overflow: 'hidden',
  },
  metric: { flex: 1, gap: space[1.5] },
  metricLabel: { ...textStyles.metricLabel, color: colors.textMuted },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[1] },
  metricValue: { ...textStyles.metric, color: colors.text },
  metricUnit: { ...textStyles.footnoteStrong, color: colors.textFaint },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1.5],
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: space[3],
    paddingVertical: space[1.5],
    alignSelf: 'flex-start',
    backgroundColor: colors.fillShade,
  },
  pillDot: { width: space[2], height: space[2], borderRadius: radii.pill },
  pillText: textStyles.badge,
});
