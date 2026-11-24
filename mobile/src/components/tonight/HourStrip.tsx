import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Clock } from '@/lib/sky/clock';
import type { HourColumn } from '@/lib/sky/hourStrip';
import type { MoonTonight } from '@/lib/sky/moon';
import type { NightBounds } from '@/lib/sky/darkness';
import { colors, componentSize, iconSize, radii, space, textStyles } from '@/theme';

/** Columns kept in view to the left of the best window when the strip opens. */
const LEAD_COLUMNS = 1;

const ROWS = [
  { key: 'cloud', icon: 'cloud-outline', label: 'Cloud %' },
  { key: 'darkness', icon: 'contrast-outline', label: 'Darkness %' },
] as const;

export interface HourStripProps {
  hours: readonly HourColumn[];
  bounds: NightBounds;
  moon: MoonTonight;
  clock: Clock;
}

function Edge({ label, time, clock, align }: { label: string; time: Date | null; clock: Clock; align: 'left' | 'right' }) {
  return (
    <View style={align === 'right' ? styles.edgeRight : undefined}>
      <Text style={styles.edgeLabel}>{label}</Text>
      <Text style={styles.edgeTime}>{time ? clock(time) : '–'}</Text>
    </View>
  );
}

/** The best window as one box behind its columns. */
function windowBox(hours: readonly HourColumn[]) {
  const first = hours.findIndex((h) => h.inBest);
  if (first < 0) return null;
  let last = first;
  while (last + 1 < hours.length && hours[last + 1].inBest) last++;
  return { left: first * componentSize.hourColumn, width: (last - first + 1) * componentSize.hourColumn, first };
}

function moonLine(moon: MoonTonight, clock: Clock): string {
  const lit = `${moon.phaseName} (${Math.round(moon.illumination * 100)}%)`;
  const events = [moon.rise ? `Rises ${clock(moon.rise)}` : null, moon.set ? `Sets ${clock(moon.set)}` : null].filter(Boolean);
  return events.length ? `${lit} · ${events.join(' · ')}` : lit;
}

/** Dusk to dawn, hour by hour: cloud and darkness, the best window boxed, and the Moon. */
export function HourStrip({ hours, bounds, moon, clock }: HourStripProps) {
  const box = useMemo(() => windowBox(hours), [hours]);
  const scroll = useRef<ScrollView>(null);
  const startX = box ? Math.max(0, (box.first - LEAD_COLUMNS) * componentSize.hourColumn) : 0;

  return (
    <View>
      <View style={styles.edges}>
        <Edge label="Dusk" time={bounds.dusk ?? bounds.sunset} clock={clock} align="left" />
        <Edge label="Dawn" time={bounds.dawn ?? bounds.sunrise} clock={clock} align="right" />
      </View>

      <View style={styles.grid}>
        <View style={styles.labels}>
          <View style={styles.headCell} />
          {ROWS.map((r) => (
            <View key={r.key} style={styles.labelCell}>
              <Ionicons name={r.icon} size={iconSize.md} color={colors.textMuted} />
              <Text style={styles.label} numberOfLines={1}>
                {r.label}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          ref={scroll}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startX, y: 0 }}
          style={styles.scroll}>
          <View>
            {box ? <View style={[styles.window, { left: box.left, width: box.width }]} /> : null}
            <View style={styles.row}>
              {hours.map((h) => (
                <Text key={h.time.getTime()} style={[styles.headCell, styles.hour]}>
                  {clock(h.time)}
                </Text>
              ))}
            </View>
            <View style={styles.row}>
              {hours.map((h) => (
                <Text key={h.time.getTime()} style={[styles.cell, h.inBest && styles.cellBest]}>
                  {h.cloud === null ? '–' : h.cloud}
                </Text>
              ))}
            </View>
            <View style={styles.row}>
              {hours.map((h) => (
                <Text key={h.time.getTime()} style={[styles.cell, h.inBest && styles.cellBest]}>
                  {h.darkness}
                </Text>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.moon}>
        <View style={styles.labelCell}>
          <Ionicons name="moon-outline" size={iconSize.md} color={colors.textMuted} />
          <Text style={styles.label}>Moon</Text>
        </View>
        <View style={styles.moonBody}>
          <Text style={styles.moonText} numberOfLines={2}>
            {moonLine(moon, clock)}
          </Text>
          <View style={styles.track} accessibilityLabel={`Moon ${Math.round(moon.illumination * 100)}% lit`}>
            <View style={[styles.trackFill, { width: `${Math.round(moon.illumination * 100)}%` }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const ROW_HEIGHT = space[10];

const styles = StyleSheet.create({
  edges: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[2] },
  edgeRight: { alignItems: 'flex-end' },
  edgeLabel: { ...textStyles.caption, color: colors.textMuted },
  edgeTime: { ...textStyles.footnoteStrong, color: colors.text },
  grid: { flexDirection: 'row' },
  labels: { width: componentSize.stripLabel },
  headCell: { height: space[6] },
  labelCell: { width: componentSize.stripLabel, flexDirection: 'row', alignItems: 'center', gap: space[2], height: ROW_HEIGHT },
  label: { ...textStyles.footnote, color: colors.text, flexShrink: 1 },
  scroll: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  hour: { ...textStyles.caption, color: colors.textMuted, width: componentSize.hourColumn, textAlign: 'center', lineHeight: space[6] },
  cell: { ...textStyles.footnote, color: colors.text, width: componentSize.hourColumn, height: ROW_HEIGHT, lineHeight: ROW_HEIGHT, textAlign: 'center' },
  cellBest: { ...textStyles.footnoteStrong },
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.night.window,
    backgroundColor: colors.night.windowFill,
  },
  moon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  moonBody: { flex: 1, gap: space[2] },
  moonText: { ...textStyles.footnote, color: colors.text },
  track: { height: componentSize.track, borderRadius: radii.pill, backgroundColor: colors.fill, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.night.moon },
});
