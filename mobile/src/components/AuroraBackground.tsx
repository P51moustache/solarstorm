import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { Palette } from '@/constants/solar';

// Deterministic pseudo-random so the starfield is stable across renders.
function seeded(n: number): number {
  const x = Math.sin(n * 99.13) * 43758.5453;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: seeded(i + 1),
  y: seeded(i + 100),
  r: 0.5 + seeded(i + 200) * 1.4,
  o: 0.2 + seeded(i + 300) * 0.6,
}));

/** A wavy aurora "curtain" path spanning `width`, fading downward from `yBase`. */
function ribbonPath(width: number, yBase: number, amp: number, waves: number, phase: number): string {
  const samples = 48;
  const pts: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * width;
    const y = yBase + Math.sin((i / samples) * Math.PI * 2 * waves + phase) * amp;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const bottom = yBase + amp + 180;
  return `${pts.join(' ')} L${width},${bottom} L0,${bottom} Z`;
}

function Ribbon({
  color,
  yBase,
  amp,
  waves,
  duration,
  opacity,
  screenW,
}: {
  color: string;
  yBase: number;
  amp: number;
  waves: number;
  duration: number;
  opacity: number;
  screenW: number;
}) {
  const w = screenW * 2;
  const drift = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false);
    breathe.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [drift, breathe, duration]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -screenW * drift.value }],
    opacity: opacity * (0.7 + breathe.value * 0.3),
  }));

  const id = `rib-${color.replace('#', '')}-${yBase}`;
  const path = useMemo(() => ribbonPath(w, yBase, amp, waves, yBase), [w, yBase, amp, waves]);

  return (
    <Animated.View style={[styles.ribbon, { width: w }, style]}>
      <Svg width={w} height={yBase + amp + 200}>
        <Defs>
          <SvgGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.0} />
            <Stop offset="0.35" stopColor={color} stopOpacity={0.85} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Path d={path} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/**
 * Living aurora backdrop. `intensity` (0-1) and `colors` come from real-time
 * space weather (see skyMood) and control brightness, motion, and palette.
 */
export function AuroraBackground({ intensity, colors }: { intensity: number; colors: string[] }) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Deep sky gradient */}
      <LinearGradient
        colors={['#0A1430', '#070A1A', Palette.bg]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Starfield */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        {STARS.map((s, i) => (
          <Circle
            key={i}
            cx={s.x * width}
            cy={s.y * height * 0.95}
            r={s.r}
            fill="#FFFFFF"
            opacity={s.o * (1 - intensity * 0.3)}
          />
        ))}
      </Svg>

      {/* Aurora ribbons — more layers/brightness as intensity rises */}
      {colors.map((c, i) => (
        <Ribbon
          key={`${c}-${i}`}
          color={c}
          yBase={height * (0.18 + i * 0.09)}
          amp={26 + i * 10}
          waves={2 + i}
          duration={22000 + i * 9000}
          opacity={Math.min(1, intensity * (1 - i * 0.18) + 0.05)}
          screenW={width}
        />
      ))}

      {/* Subtle vignette to keep text legible at the bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(5,6,10,0.55)']}
        locations={[0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: { position: 'absolute', left: 0, top: 0 },
});
