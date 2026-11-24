import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors, componentSize, motion } from '@/theme';

/**
 * The horizon art behind Tonight's hero: a night sky over snowy ridges and a still lake.
 * Drawn in a fixed 400×520 box and scaled to the screen width; every fill is a `colors.night` role.
 * The aurora glow is drawn only when `aurora` is true (the aurora read says it is likely).
 */

const VIEW_W = 400;
const VIEW_H = 520;
const VIEW_BOX = `0 0 ${VIEW_W} ${VIEW_H}`;
/** Where the lake meets the land, in view units. */
const SHORE_Y = 382;
const STAR_COUNT = 70;
/** Stars stay above the ridges. */
const STAR_FIELD_H = 330;
/** Faint stars to bright: opacity range. */
const STAR_OPACITY = { min: 0.25, span: 0.65 };
const STAR_RADIUS = { min: 0.35, span: 1.1 };
/** The aurora's breathing opacity, quiet to bright. */
const AURORA_OPACITY = { low: 0.6, high: 1 };

/** Deterministic noise so the sky is the same on every render. */
function seeded(n: number): number {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: seeded(i + 1) * VIEW_W,
  y: seeded(i + 101) * STAR_FIELD_H,
  r: STAR_RADIUS.min + seeded(i + 201) * STAR_RADIUS.span,
  o: STAR_OPACITY.min + seeded(i + 301) * STAR_OPACITY.span,
}));

const pts = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => `${x},${y}`).join(' ');

const FAR_RIDGE = pts([
  [0, 352],
  [28, 340],
  [52, 346],
  [86, 322],
  [104, 330],
  [132, 312],
  [150, 324],
  [176, 306],
  [198, 318],
  [226, 296],
  [248, 312],
  [270, 300],
  [296, 322],
  [320, 308],
  [346, 326],
  [372, 316],
  [400, 334],
  [400, SHORE_Y],
  [0, SHORE_Y],
]);
const NEAR_RIDGE = pts([
  [0, 370],
  [40, 360],
  [70, 368],
  [110, 356],
  [150, 366],
  [210, 360],
  [250, 368],
  [292, 352],
  [330, 362],
  [366, 350],
  [400, 358],
  [400, SHORE_Y],
  [0, SHORE_Y],
]);
/** The far ridge upside down in the water, squashed. */
const REFLECTION = pts([
  [0, SHORE_Y],
  [86, SHORE_Y + 30],
  [132, SHORE_Y + 40],
  [176, SHORE_Y + 46],
  [226, SHORE_Y + 52],
  [270, SHORE_Y + 48],
  [320, SHORE_Y + 42],
  [400, SHORE_Y + 28],
  [400, SHORE_Y],
]);
const LEFT_SHORE = 'M0,300 C30,312 54,350 96,392 C110,404 80,420 0,426 Z';
const RIGHT_SHORE = 'M400,338 C380,350 360,372 336,386 C350,396 380,400 400,402 Z';

/** Fir silhouettes: [x of trunk, base y, height]. */
const TREES: readonly (readonly [number, number, number])[] = [
  [6, 330, 70],
  [20, 345, 58],
  [34, 352, 46],
  [48, 368, 38],
  [62, 380, 28],
  [352, 372, 34],
  [366, 362, 46],
  [380, 352, 58],
  [394, 346, 66],
];
const firPath = ([x, base, h]: readonly [number, number, number]) => {
  const w = h * 0.22;
  return `M${x},${base - h} L${x + w},${base - h * 0.45} L${x + w * 0.55},${base - h * 0.45} L${x + w * 1.3},${base} L${x - w * 1.3},${base} L${x - w * 0.55},${base - h * 0.45} L${x - w},${base - h * 0.45} Z`;
};

/** Soft aurora glow banks rising from behind the ridges, right of centre as in the concept: [cx, cy, rx, ry, tilt°]. */
const AURORA_BANKS: readonly (readonly [number, number, number, number, number])[] = [
  [250, 300, 170, 34, -10],
  [300, 270, 120, 26, -18],
  [170, 292, 110, 22, -6],
];
/** A faint violet crown above the green. */
const AURORA_CROWN = [310, 235, 130, 40, -14] as const;

function Sky() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMax slice"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="hz-sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.night.skyTop} />
          <Stop offset="0.42" stopColor={colors.night.skyMid} />
          <Stop offset="0.6" stopColor={colors.night.skyLow} />
          <Stop offset="0.72" stopColor={colors.night.horizonGlow} />
        </LinearGradient>
        <RadialGradient id="hz-milky" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={colors.night.milkyWay} stopOpacity={0.16} />
          <Stop offset="1" stopColor={colors.night.milkyWay} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill="url(#hz-sky)" />
      <Ellipse cx={290} cy={110} rx={46} ry={170} fill="url(#hz-milky)" transform="rotate(34 290 110)" />
      {STARS.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={colors.aurora.stars} opacity={s.o} />
      ))}
    </Svg>
  );
}

function AuroraGlow() {
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1, { duration: motion.duration.breathe, easing: motion.easing.breathe }),
      -1,
      true,
    );
  }, [breathe]);
  const style = useAnimatedStyle(() => ({
    opacity: AURORA_OPACITY.low + breathe.value * (AURORA_OPACITY.high - AURORA_OPACITY.low),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox={VIEW_BOX} preserveAspectRatio="xMidYMax slice">
        <Defs>
          <RadialGradient id="hz-aurora" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.night.auroraGlow} stopOpacity={0.55} />
            <Stop offset="0.6" stopColor={colors.night.auroraGlow} stopOpacity={0.18} />
            <Stop offset="1" stopColor={colors.night.auroraGlow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="hz-crown" cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={colors.aurora.violet} stopOpacity={0.3} />
            <Stop offset="1" stopColor={colors.aurora.violet} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {[AURORA_CROWN, ...AURORA_BANKS].map(([cx, cy, rx, ry, tilt], i) => (
          <Ellipse
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={i === 0 ? 'url(#hz-crown)' : 'url(#hz-aurora)'}
            transform={`rotate(${tilt} ${cx} ${cy})`}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

function Land() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMax slice"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id="hz-far" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.night.snow} />
          <Stop offset="0.18" stopColor={colors.night.snow} stopOpacity={0.85} />
          <Stop offset="0.45" stopColor={colors.night.ridgeFar} />
          <Stop offset="1" stopColor={colors.night.ridgeNear} />
        </LinearGradient>
        <LinearGradient id="hz-lake" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.night.haze} />
          <Stop offset="0.3" stopColor={colors.night.skyLow} />
          <Stop offset="1" stopColor={colors.night.lake} />
        </LinearGradient>
        <LinearGradient id="hz-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.night.skyTop} stopOpacity={0} />
          <Stop offset="1" stopColor={colors.night.skyTop} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={SHORE_Y} width={VIEW_W} height={VIEW_H - SHORE_Y} fill="url(#hz-lake)" />
      <Polygon points={REFLECTION} fill={colors.night.ridgeNear} opacity={0.45} />
      <Polygon points={FAR_RIDGE} fill="url(#hz-far)" />
      <Polygon points={NEAR_RIDGE} fill={colors.night.ridgeNear} />
      <Path d={LEFT_SHORE} fill={colors.night.shore} />
      <Path d={RIGHT_SHORE} fill={colors.night.shore} />
      {TREES.map((t) => (
        <Path key={`${t[0]}-${t[1]}`} d={firPath(t)} fill={colors.night.trees} />
      ))}
      <Rect x={0} y={SHORE_Y + 40} width={VIEW_W} height={VIEW_H - SHORE_Y - 40} fill="url(#hz-fade)" />
    </Svg>
  );
}

/**
 * Fills its parent and runs `componentSize.horizonOverlap` past its bottom; the land is pinned to the
 * bottom edge (xMidYMax slice), so the ridges always sit just above whatever follows the parent.
 */
export function HorizonScene({ aurora }: { aurora: boolean }) {
  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Sky />
      {aurora ? <AuroraGlow /> : null}
      <Land />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -componentSize.horizonOverlap, overflow: 'hidden' },
});
