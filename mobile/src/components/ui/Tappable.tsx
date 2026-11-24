import { forwardRef } from 'react';
import { Pressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';

import { motion } from '@/theme';

export interface TappableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** `soft` dims less, for dense list rows. */
  feedback?: 'default' | 'soft' | 'none';
}

/**
 * The app's one pressable surface: dims while held (motion.press) and keeps
 * a static style, so call sites never write `({ pressed }) => …`.
 */
export const Tappable = forwardRef<View, TappableProps>(function Tappable(
  { style, feedback = 'default', accessibilityRole = 'button', ...rest },
  ref
) {
  const opacity = feedback === 'soft' ? motion.press.opacitySoft : motion.press.opacity;
  return (
    <Pressable
      ref={ref}
      accessibilityRole={accessibilityRole}
      style={({ pressed }) => [style, pressed && feedback !== 'none' && { opacity }]}
      {...rest}
    />
  );
});
