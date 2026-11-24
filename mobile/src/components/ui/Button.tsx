import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, controlPadding, radii, space, textStyles } from '@/theme';

import { Tappable } from './Tappable';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'link' | 'danger';
export type ButtonSize = 'compact' | 'regular' | 'large';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner in place of the label and blocks presses. */
  loading?: boolean;
  disabled?: boolean;
  /** Optional element before the label (an emoji or icon). */
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Full-width action button. Variants: `primary` (accent fill), `secondary`
 * (raised surface), `outline` (surface + hairline border), `link` and `danger`
 * (text only). Sizes set height and type: compact 15pt, regular 16pt, large 17pt.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  loading = false,
  disabled = false,
  icon,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const textColor = TEXT_COLOR[variant];
  return (
    <Tappable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[styles.base, SIZE[size], VARIANT[variant], disabled && styles.disabled, style]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[TEXT[size], { color: textColor }]}>
          {icon}
          {icon ? ' ' : null}
          {label}
        </Text>
      )}
    </Tappable>
  );
}

/** Dims a button that cannot be pressed yet. */
const DISABLED_OPACITY = 0.5;

const TEXT_COLOR: Record<ButtonVariant, string> = {
  primary: colors.onAccent,
  secondary: colors.text,
  outline: colors.accent,
  link: colors.accent,
  danger: colors.danger,
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: DISABLED_OPACITY },
});

const SIZE = StyleSheet.create({
  compact: { borderRadius: radii.md, paddingVertical: controlPadding.compact },
  regular: { borderRadius: radii.lg, paddingVertical: controlPadding.regular },
  large: { borderRadius: radii.xl, paddingVertical: controlPadding.large },
});

const TEXT = StyleSheet.create({
  compact: textStyles.buttonCompact,
  regular: textStyles.button,
  large: textStyles.buttonLarge,
});

const VARIANT = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  link: { paddingVertical: space[3.5] },
  danger: { paddingVertical: space[3.5] },
});
