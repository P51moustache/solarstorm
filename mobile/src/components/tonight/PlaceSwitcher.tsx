import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Glass, ListRow, Tappable } from '@/components/ui';
import { DEVICE_PLACE_ID, type PlaceChoice } from '@/lib/tonightPlace';
import { colors, iconSize, motion, space, textStyles } from '@/theme';

export interface PlaceSwitcherProps {
  place: PlaceChoice | null;
  choices: readonly PlaceChoice[];
  onChoose: (id: string) => void;
  /** Opens the Places screen to add one. */
  onAddPlace: () => void;
}

/** The place name under Tonight's title; tapping it lists the other places to plan for. */
export function PlaceSwitcher({ place, choices, onChoose, onAddPlace }: PlaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    motion.haptics.select();
    setOpen((o) => !o);
  };
  return (
    <View>
      <Tappable
        style={styles.current}
        onPress={toggle}
        accessibilityLabel={`Place: ${place?.label ?? 'none'}. Change place`}
        accessibilityState={{ expanded: open }}>
        <Ionicons name="location-outline" size={iconSize.md} color={colors.text} />
        <Text style={styles.label} numberOfLines={1}>
          {place?.label ?? 'Pick a place'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={iconSize.sm} color={colors.textMuted} />
      </Tappable>
      {open ? (
        <Glass style={styles.menu}>
          {choices.map((c, i) => (
            <ListRow
              key={c.id}
              title={c.id === DEVICE_PLACE_ID ? `My location · ${c.label}` : c.label}
              leading={
                <Ionicons
                  name={c.id === place?.id ? 'checkmark-circle' : c.id === DEVICE_PLACE_ID ? 'navigate-outline' : 'location-outline'}
                  size={iconSize.lg}
                  color={c.id === place?.id ? colors.night.window : colors.textMuted}
                />
              }
              onPress={() => {
                onChoose(c.id);
                setOpen(false);
              }}
              divider={i > 0}
            />
          ))}
          <ListRow
            title="Add a place"
            leading={<Ionicons name="add-circle-outline" size={iconSize.lg} color={colors.accent} />}
            onPress={() => {
              setOpen(false);
              onAddPlace();
            }}
            divider={choices.length > 0}
          />
        </Glass>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  current: { flexDirection: 'row', alignItems: 'center', gap: space[1.5], alignSelf: 'flex-start', maxWidth: '100%' },
  label: { ...textStyles.cardTitle, color: colors.text, flexShrink: 1 },
  menu: { marginTop: space[2], paddingVertical: space[1] },
});
