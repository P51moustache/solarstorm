import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, getKpColor } from '../lib/util/colors';
import { formatTimeAgo } from '../lib/util/time';

interface KpTileProps {
  kp: number | null;
  updatedAt: string | null;
  bz: number | null;
  speed: number | null;
}

export function KpTile({ kp, updatedAt, bz, speed }: KpTileProps) {
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  // Trigger shimmer animation when conditions are met
  React.useEffect(() => {
    if (bz !== null && speed !== null && bz < 0 && speed > 500) {
      const shimmer = () => {
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => shimmer());
      };
      shimmer();
    } else {
      animatedValue.setValue(1);
    }
  }, [bz, speed, animatedValue]);

  const kpValue = kp ?? 0;
  const backgroundColor = getKpColor(kpValue);
  const timeAgo = updatedAt ? formatTimeAgo(updatedAt) : 'No data';

  const a11yLabelParts: string[] = [];
  if (kp !== null) a11yLabelParts.push(`K p ${kp.toFixed(1)}`);
  if (updatedAt) a11yLabelParts.push(`updated ${timeAgo}`);
  if (bz !== null) a11yLabelParts.push(`B z ${bz.toFixed(1)} n T`);
  if (speed !== null) a11yLabelParts.push(`speed ${Math.round(speed)} kilometers per second`);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: animatedValue }] }
      ]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabelParts.join(', ')}
    >
      <LinearGradient
        colors={[backgroundColor, backgroundColor + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.label}>Kp Now</Text>
          <Text style={styles.value}>
            {kp !== null ? kp.toFixed(1) : '--'}
          </Text>
          <Text style={styles.subtitle}>
            Updated {timeAgo}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: RADIUS.xl,
    ...SHADOWS.tile,
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    minHeight: 120,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    opacity: 0.9,
  },
  value: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.text,
    opacity: 0.7,
    textAlign: 'center',
  },
});
