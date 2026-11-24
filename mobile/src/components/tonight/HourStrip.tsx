import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import type { Clock } from '@/lib/sky/clock';
import type { HourColumn } from '@/lib/sky/hourStrip';
import type { MoonTonight } from '@/lib/sky/moon';
import type { NightBounds } from '@/lib/sky/darkness';
import { colors, componentSize, iconSize, radii, shadows, space, textStyles } from '@/theme';

import { moonArt } from './skyArt';

/** Columns kept in view to the left of the best window when the strip opens. */
const LEAD_COLUMNS = 1;
/** Hour labels show the hour only ("22"), as on a clock face; the edges give full times. */
const HOUR_DIGITS = 2;

const ROWS = [
  { key: 'cloud', icon: 'cloud-outline', label: 'Cloud %' },
  { key: 'darkness', icon: 'contrast-outline', label: 'Darkness' },
] as const;

export interface HourStripProps {
  hours: readonly HourColumn[];
  bounds: NightBounds;
  moon: MoonTonight;
  clock: Clock;
  /** The strip opens on the best window if it is still ahead, else on this hour. */
  now: Date;
}

function Edge({
  label,
  time,
  clock,
  align,
}: {
  label: string;
  time: Date | null;
  clock: Clock;
  align: 'left' | 'right';
}) {
  return (
    <View style={align === 'right' ? styles.edgeRight : undefined}>
      <Text style={styles.edgeLabel}>{label}</Text>
      <Text style={styles.edgeTime}>{time ? clock(time) : '–'}</Text>
    </View>
  );
}

/** The best window as one box behind its columns. */
function windowBox(hours: readonly HourColumn[], column: number) {
  const first = hours.findIndex((h) => h.inBest);
  if (first < 0) return null;
  let last = first;
  while (last + 1 < hours.length && hours[last + 1].inBest) last++;
  return { left: first * column, width: (last - first + 1) * column, first };
}

/** The column the strip opens on: the best window while it is still ahead, else the current hour. */
function openingColumn(hours: readonly HourColumn[], box: { first: number } | null, now: Date): number {
  const current = Math.max(
    0,
    hours.findIndex((h) => h.time.getTime() + HOUR_MS > now.getTime()),
  );
  const boxEnd = box ? hours.findLastIndex((h) => h.inBest) : -1;
  return box && boxEnd >= current ? Math.max(box.first, current) : current;
}

const HOUR_MS = 3_600_000;

/** Stretches columns so a whole number of them fills the view: none is ever cut in half at the edge. */
export function fittedColumn(viewWidth: number, minColumn = componentSize.hourColumn): number {
  if (viewWidth <= 0) return minColumn;
  return viewWidth / Math.max(1, Math.floor(viewWidth / minColumn));
}

/** Darkness (0-100) as a line along the bottom of its row: one point per column centre. */
function DarknessLine({ hours, column }: { hours: readonly HourColumn[]; column: number }) {
  const width = hours.length * column;
  const height = ROW_HEIGHT;
  const points = hours
    .map((h, i) => `${(i + 0.5) * column},${height - LINE_WIDTH - (h.darkness / 100) * LINE_RANGE}`)
    .join(' ');
  return (
    <Svg width={width} height={height} style={styles.darknessLine} pointerEvents="none">
      <Polyline points={points} fill="none" stroke={colors.night.darknessLine} strokeWidth={LINE_WIDTH} />
    </Svg>
  );
}

function moonLine(moon: MoonTonight, clock: Clock): string {
  // The bar shows how much is lit, so the text names the phase only.
  const lit = moon.phaseName;
  const events = [moon.rise ? `Rises ${clock(moon.rise)}` : null, moon.set ? `Sets ${clock(moon.set)}` : null].filter(
    Boolean,
  );
  if (events.length) return `${lit} · ${events.join(' · ')}`;
  return `${lit} · ${moon.upAtStart ? 'Up all night' : 'Down all night'}`;
}

/** Dusk to dawn, hour by hour: cloud and darkness, the best window boxed, and the Moon. */
export function HourStrip({ hours, bounds, moon, clock, now }: HourStripProps) {
  const [column, setColumn] = useState<number>(componentSize.hourColumn);
  const box = useMemo(() => windowBox(hours, column), [hours, column]);
  const startX = Math.max(0, (openingColumn(hours, box, now) - LEAD_COLUMNS) * column);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ x: startX, animated: false });
  }, [startX]);
  const onLayout = (e: LayoutChangeEvent) => setColumn(fittedColumn(e.nativeEvent.layout.width));
  const width = { width: column };

  return (
    <View>
      <View style={styles.edges}>
        <Edge label="Sunset" time={bounds.sunset} clock={clock} align="left" />
        <Edge label="Sunrise" time={bounds.sunrise} clock={clock} align="right" />
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
          onContentSizeChange={() => scroll.current?.scrollTo({ x: startX, animated: false })}
          onLayout={onLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scroll}>
          <View>
            {box ? <View style={[styles.window, { left: box.left, width: box.width }]} /> : null}
            <View style={styles.row}>
              {hours.map((h) => (
                <View key={h.time.getTime()} style={[styles.headCell, styles.hourCell, width]}>
                  <Text style={styles.hour}>{clock(h.time).slice(0, HOUR_DIGITS)}</Text>
                  <View style={styles.tick} />
                </View>
              ))}
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              {hours.map((h) => (
                <Text key={h.time.getTime()} style={[styles.cell, width, h.inBest && styles.cellBest]}>
                  {h.cloud === null ? '–' : h.cloud}
                </Text>
              ))}
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <DarknessLine hours={hours} column={column} />
              {hours.map((h) => (
                <Text key={h.time.getTime()} style={[styles.cell, width, h.inBest && styles.cellBest]}>
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
        <Image source={moonArt(moon)} style={styles.moonThumb} accessibilityIgnoresInvertColors />
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

const ROW_HEIGHT = space[8];
/** Darkness line along the foot of its row, under the numbers: stroke width and how far 0-100 % rises. */
const LINE_WIDTH = 1.5;
const LINE_RANGE = space[1.5];

const styles = StyleSheet.create({
  edges: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[1] },
  edgeRight: { alignItems: 'flex-end' },
  edgeLabel: { ...textStyles.caption, color: colors.textMuted },
  edgeTime: { ...textStyles.footnoteStrong, color: colors.text },
  grid: { flexDirection: 'row' },
  labels: { width: componentSize.stripLabel },
  headCell: { height: space[8] },
  labelCell: {
    width: componentSize.stripLabel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: ROW_HEIGHT,
  },
  label: { ...textStyles.footnote, color: colors.text, flexShrink: 1 },
  scroll: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  hourCell: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: space[0.5] },
  hour: { ...textStyles.footnote, color: colors.textMuted, textAlign: 'center' },
  tick: { width: StyleSheet.hairlineWidth, height: componentSize.hourTick, backgroundColor: colors.borderStrong },
  darknessLine: { position: 'absolute', left: 0, top: 0 },
  cell: { ...textStyles.footnote, color: colors.text, height: ROW_HEIGHT, lineHeight: ROW_HEIGHT, textAlign: 'center' },
  cellBest: { ...textStyles.footnoteStrong },
  window: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.night.window,
    backgroundColor: colors.night.windowFill,
    ...shadows.tealGlow,
  },
  moon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space[2],
    paddingTop: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
  },
  moonThumb: {
    width: componentSize.moonThumb,
    height: componentSize.moonThumb,
    borderRadius: radii.pill,
    marginRight: space[3],
  },
  moonBody: { flex: 1, gap: space[2] },
  moonText: { ...textStyles.footnote, color: colors.text },
  track: { height: componentSize.track, borderRadius: radii.pill, backgroundColor: colors.fill, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.night.moon, ...shadows.tealGlow },
});
