import { Switch } from 'react-native';

import { colors } from '@/theme';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Read by VoiceOver; pass the row's label. */
  accessibilityLabel?: string;
}

/** On/off switch in the app's colors. */
export function Toggle({ value, onValueChange, disabled, accessibilityLabel }: ToggleProps) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ true: colors.accent, false: colors.surfaceRaised }}
    />
  );
}
