import { useEffect } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, componentSize, motion } from '@/theme';

/**
 * The horizon art behind Tonight's hero: a painted night sky over snowy ridges and a still lake
 * (concept C, "Living sky"). Two painted plates of the same place: the calm sky, and the sky with an
 * aurora, which fades in over it only when `aurora` is true (the aurora read says it is likely).
 */
const CALM = require('../../../assets/images/tonight/horizon.jpg');
const AURORA = require('../../../assets/images/tonight/horizon-aurora.jpg');

/** The plates are 2:3 portraits. */
const PLATE_ASPECT = 1.5;
function AuroraPlate({ height }: { height: number }) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(1, { duration: motion.duration.reveal, easing: motion.easing.reveal });
  }, [shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));
  return <Animated.Image source={AURORA} style={[styles.plate, { height }, style]} resizeMode="cover" />;
}

/**
 * Fills its parent and runs `componentSize.horizonOverlap` past its bottom. The plate is pinned to the
 * bottom edge, so the ridges always sit just above whatever follows the parent; the lake fades into the page.
 */
export function HorizonScene({ aurora }: { aurora: boolean }) {
  const { width } = useWindowDimensions();
  const height = width * PLATE_ASPECT;
  return (
    <View
      style={styles.wrap}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image source={CALM} style={[styles.plate, { height }]} resizeMode="cover" />
      {aurora ? <AuroraPlate height={height} /> : null}
      <LinearGradient colors={[colors.night.fadeFrom, colors.night.skyTop]} style={styles.fade} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -componentSize.horizonOverlap,
    overflow: 'hidden',
    backgroundColor: colors.night.skyTop,
  },
  plate: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: componentSize.horizonOverlap },
});
