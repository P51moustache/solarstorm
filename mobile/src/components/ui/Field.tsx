import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, iconSize, radii, space, textStyles } from '@/theme';

import { Tappable } from './Tappable';

export interface FieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Ionicons name shown before the text (e.g. "search"). */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Shows a spinner at the end, e.g. while searching. */
  busy?: boolean;
  /** When set and the field has text, shows a clear button that calls it. */
  onClear?: () => void;
}

/** Single-line text field on a raised surface, with optional leading icon, spinner and clear button. */
export function Field({ icon, busy, onClear, value, ...input }: FieldProps) {
  return (
    <View style={styles.wrap}>
      {icon ? <Ionicons name={icon} size={iconSize.md} color={colors.textFaint} /> : null}
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textFaint}
        value={value}
        {...input}
      />
      {busy ? (
        <ActivityIndicator color={colors.textFaint} />
      ) : onClear && value ? (
        <Tappable onPress={onClear} hitSlop={space[2]} feedback="none" accessibilityLabel="Clear">
          <Ionicons name="close-circle" size={iconSize.md} color={colors.textFaint} />
        </Tappable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    paddingHorizontal: space[3.5],
    paddingVertical: space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: { flex: 1, ...textStyles.body, color: colors.text, padding: 0 },
});
