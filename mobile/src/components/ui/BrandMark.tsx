import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, componentSize, shadows, space, textStyles } from '@/theme';

/** Four-point star in a 24-unit box: long vertical arms, slightly shorter horizontal ones. */
const STAR_PATH =
  'M12 0 C12.9 7.6 14.4 9.6 22 12 C14.4 14.4 12.9 16.4 12 24 C11.1 16.4 9.6 14.4 2 12 C9.6 9.6 11.1 7.6 12 0 Z';
const STAR_BOX = 24;

/** The SolarStorm wordmark: a glowing four-point star and the name. */
export function BrandMark() {
  const size = componentSize.brandMark;
  return (
    <View style={styles.row} accessible accessibilityRole="header" accessibilityLabel="SolarStorm">
      <Svg width={size} height={size} viewBox={`0 0 ${STAR_BOX} ${STAR_BOX}`} style={styles.glow}>
        <Path d={STAR_PATH} fill={colors.night.star} />
      </Svg>
      <Text style={styles.name}>SolarStorm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  glow: shadows.starGlow,
  name: { ...textStyles.panelTitle, color: colors.text },
});
