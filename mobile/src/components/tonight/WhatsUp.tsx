import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Glass, ListRow } from '@/components/ui';
import type { SkyEvent, SkyEventKind } from '@/lib/sky/events/types';
import { colors, componentSize, iconSize, radii, space, textStyles } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** How each kind of event looks in its tile. A new kind adds one entry here. */
const TILE: Record<SkyEventKind, { icon: IconName; color: string }> = {
  milkyWay: { icon: 'sparkles', color: colors.aurora.violet },
  planet: { icon: 'planet', color: colors.warn },
  aurora: { icon: 'pulse', color: colors.aurora.greenBright },
};

function EventTile({ kind }: { kind: SkyEventKind }) {
  const { icon, color } = TILE[kind];
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={iconSize.xxl} color={color} />
    </View>
  );
}

export interface WhatsUpProps {
  events: readonly SkyEvent[];
  /** Where a row goes when tapped; rows without a target are not tappable. */
  onOpen?: Partial<Record<SkyEventKind, () => void>>;
}

/** "What's up tonight": one row per sky event. */
export function WhatsUp({ events, onOpen = {} }: WhatsUpProps) {
  return (
    <Glass>
      <Text style={styles.title} accessibilityRole="header">
        What’s up tonight
      </Text>
      {events.length === 0 ? (
        <Text style={styles.empty}>Nothing bright is up during the dark hours tonight.</Text>
      ) : (
        events.map((e, i) => (
          <ListRow
            key={e.id}
            title={e.title}
            subtitle={e.detail}
            leading={<EventTile kind={e.kind} />}
            onPress={onOpen[e.kind]}
            divider={i > 0}
          />
        ))
      )}
    </Glass>
  );
}

const styles = StyleSheet.create({
  title: { ...textStyles.panelTitle, color: colors.text, marginBottom: space[1] },
  empty: { ...textStyles.footnote, color: colors.textMuted, marginTop: space[2] },
  tile: {
    width: componentSize.eventTile,
    height: componentSize.eventTile,
    borderRadius: radii.md,
    backgroundColor: colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
