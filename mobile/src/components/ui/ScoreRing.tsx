import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { colors, componentSize, motion, shadows, textStyles } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MAX_SCORE = 100;
/** The unfilled track is the same gradient, faint. */
const TRACK_OPACITY = 0.2;
/** The arc starts at 12 o'clock. */
const START_ANGLE = -90;

export interface ScoreRingProps {
  /** 0-100; null shows an empty dial with a dash. */
  score: number | null;
  label: string;
}

/** A 0-100 dial: a glowing gradient arc that fills once when the score arrives, the number on a dark face. */
export function ScoreRing({ score, label }: ScoreRingProps) {
  const size = componentSize.scoreRing;
  const stroke = componentSize.scoreRingStroke;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fill = useSharedValue(0);

  useEffect(() => {
    const target = score === null ? 0 : Math.min(MAX_SCORE, Math.max(0, score)) / MAX_SCORE;
    fill.value = withTiming(target, { duration: motion.duration.reveal, easing: motion.easing.reveal });
  }, [score, fill]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - fill.value) }));

  return (
    <View
      style={[styles.wrap, { width: size, height: size }]}
      accessible
      accessibilityLabel={`${label}: ${score === null ? 'not known yet' : `${score} out of ${MAX_SCORE}`}`}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, styles.glow]}>
        <Defs>
          <LinearGradient id="score-ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.night.scoreFrom} />
            <Stop offset="1" stopColor={colors.night.scoreTo} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#score-ring)"
          strokeOpacity={TRACK_OPACITY}
          strokeWidth={stroke}
          fill={colors.night.ringFace}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#score-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={arc}
          transform={`rotate(${START_ANGLE} ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{score === null ? '–' : score}</Text>
      <Text style={styles.max}>/{MAX_SCORE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: shadows.tealGlow,
  label: { ...textStyles.caption, color: colors.textMuted },
  value: { ...textStyles.scoreValue, color: colors.text },
  max: { ...textStyles.footnote, color: colors.textMuted },
});
