import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Fonts, Palette } from '@/constants/solar';

export interface Bar {
  value: number;
  color: string;
  faded?: boolean; // e.g. forecast bars
}

/**
 * Touch-scrubbing that only claims HORIZONTAL drags, so vertical scrolling on
 * the parent ScrollView is never hijacked. `getIndex` maps an x offset (within
 * the chart) to a data index; kept in a ref so it always sees current layout.
 */
function useScrub(getIndex: (x: number) => number) {
  const [active, setActive] = useState<number | null>(null);
  const getRef = useRef(getIndex);
  getRef.current = getIndex;

  const isHorizontal = (_e: unknown, g: { dx: number; dy: number }) =>
    Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: isHorizontal,
      onMoveShouldSetPanResponderCapture: isHorizontal,
      onPanResponderGrant: (e) => setActive(getRef.current(e.nativeEvent.locationX)),
      onPanResponderMove: (e) => setActive(getRef.current(e.nativeEvent.locationX)),
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
      // Once we're scrubbing horizontally, don't let the ScrollView reclaim it.
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return { active, panHandlers: responder.panHandlers };
}

// Pinned to the top-center of the chart so a dragging finger never covers it.
function Tooltip({ label, value }: { label?: string; value: string }) {
  return (
    <View style={styles.tooltipWrap} pointerEvents="none">
      <View style={styles.tooltip}>
        <Text style={styles.tipValue}>{value}</Text>
        {label ? <Text style={styles.tipLabel}>{label}</Text> : null}
      </View>
    </View>
  );
}

interface BarChartProps {
  bars: Bar[];
  height?: number;
  domain: [number, number];
  threshold?: number;
  nowIndex?: number;
  labels?: string[];
  formatValue?: (v: number) => string;
}

/** Colored bar chart with horizontal-only touch-scrubbing. */
export function BarChart({
  bars,
  height = 150,
  domain,
  threshold,
  nowIndex,
  labels,
  formatValue = (v) => v.toFixed(2),
}: BarChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const [min, max] = domain;
  const span = max - min || 1;
  const pad = 4;
  const h = height - pad * 2;
  const gap = bars.length > 80 ? 0.5 : 2;
  const bw = width > 0 ? Math.max(1, (width - gap * (bars.length - 1)) / bars.length) : 0;
  const y = (v: number) => pad + h - ((Math.min(max, Math.max(min, v)) - min) / span) * h;

  const { active, panHandlers } = useScrub((x) =>
    Math.min(bars.length - 1, Math.max(0, Math.floor(x / (bw + gap))))
  );
  const activeX = active != null ? active * (bw + gap) + bw / 2 : 0;

  return (
    <View onLayout={onLayout} style={{ height }} {...panHandlers}>
      {width > 0 && bars.length > 0 ? (
        <Svg width={width} height={height}>
          {threshold != null ? (
            <Line x1={0} y1={y(threshold)} x2={width} y2={y(threshold)} stroke={Palette.danger} strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
          ) : null}
          {nowIndex != null && nowIndex > 0 && nowIndex < bars.length ? (
            <Line x1={nowIndex * (bw + gap) - gap / 2} y1={0} x2={nowIndex * (bw + gap) - gap / 2} y2={height} stroke={Palette.textDim} strokeWidth={1} strokeDasharray="2 3" />
          ) : null}
          {bars.map((b, i) => {
            const top = y(b.value);
            return (
              <Rect
                key={i}
                x={i * (bw + gap)}
                y={top}
                width={bw}
                height={Math.max(1, height - pad - top)}
                rx={bw > 4 ? 2 : 0}
                fill={b.color}
                opacity={active != null && active !== i ? (b.faded ? 0.25 : 0.5) : b.faded ? 0.4 : 1}
              />
            );
          })}
          {active != null ? (
            <Line x1={activeX} y1={0} x2={activeX} y2={height} stroke={Palette.text} strokeWidth={1} opacity={0.5} />
          ) : null}
        </Svg>
      ) : null}
      {active != null && bars[active] ? (
        <Tooltip label={labels?.[active]} value={formatValue(bars[active].value)} />
      ) : null}
    </View>
  );
}

interface LineChartProps {
  values: (number | null)[];
  color?: string;
  height?: number;
  domain?: [number, number];
  baseline?: number;
  fill?: boolean;
  labels?: string[];
  formatValue?: (v: number) => string;
}

/** Responsive line/area chart with horizontal-only touch-scrubbing. Nulls are skipped. */
export function LineChart({
  values,
  color = Palette.accent,
  height = 96,
  domain,
  baseline,
  fill = true,
  labels,
  formatValue = (v) => v.toFixed(1),
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const points = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null && !Number.isNaN(p.v));

  const n = values.length - 1 || 1;
  const pad = 6;
  const h = height - pad * 2;

  let geom: { min: number; max: number; span: number } | null = null;
  if (points.length >= 2) {
    const vals = points.map((p) => p.v);
    const min = domain ? domain[0] : Math.min(...vals, baseline ?? Infinity);
    const max = domain ? domain[1] : Math.max(...vals, baseline ?? -Infinity);
    geom = { min, max, span: max - min || 1 };
  }

  const x = (i: number) => (i / n) * width;
  const y = (v: number) => (geom ? pad + h - ((v - geom.min) / geom.span) * h : 0);

  // Nearest non-null point to the touched index, for the tooltip.
  const nearest = (i: number) => {
    if (values[i] != null) return i;
    for (let d = 1; d < values.length; d++) {
      if (i - d >= 0 && values[i - d] != null) return i - d;
      if (i + d < values.length && values[i + d] != null) return i + d;
    }
    return null;
  };

  const { active, panHandlers } = useScrub((lx) =>
    Math.min(values.length - 1, Math.max(0, Math.round((lx / (width || 1)) * n)))
  );
  const activeIdx = active != null ? nearest(active) : null;

  let body = null;
  if (width > 0 && geom && points.length >= 2) {
    const line = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${x(p.i)},${y(p.v)}`).join(' ');
    const area = `${line} L${x(points[points.length - 1].i)},${height} L${x(points[0].i)},${height} Z`;
    const baseY = baseline != null ? y(baseline) : null;
    body = (
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        {baseY != null ? (
          <Line x1={0} y1={baseY} x2={width} y2={baseY} stroke={Palette.border} strokeWidth={1} strokeDasharray="3 4" />
        ) : null}
        {fill ? <Path d={area} fill={`url(#g-${color.replace('#', '')})`} /> : null}
        <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {activeIdx != null && values[activeIdx] != null ? (
          <>
            <Line x1={x(activeIdx)} y1={0} x2={x(activeIdx)} y2={height} stroke={Palette.text} strokeWidth={1} opacity={0.5} />
            <Circle cx={x(activeIdx)} cy={y(values[activeIdx] as number)} r={4} fill={color} stroke={Palette.bg} strokeWidth={2} />
          </>
        ) : null}
      </Svg>
    );
  }

  return (
    <View onLayout={onLayout} style={{ height, justifyContent: 'center' }} {...panHandlers}>
      {body}
      {activeIdx != null && values[activeIdx] != null ? (
        <Tooltip label={labels?.[activeIdx]} value={formatValue(values[activeIdx] as number)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tooltipWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  tooltip: {
    backgroundColor: 'rgba(17,21,31,0.96)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
  },
  tipValue: { color: Palette.text, fontSize: 14, fontFamily: Fonts.bold },
  tipLabel: { color: Palette.textDim, fontSize: 11, fontFamily: Fonts.regular, marginTop: 1 },
});
