import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { colors, textStyles } from '@/theme';

/** Small-caps label that names a card's section ("SOLAR WIND · 24H"). */
export function SectionLabel({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[styles.label, style]} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { ...textStyles.overline, color: colors.textMuted },
});
