import { Image, StyleSheet, Text } from 'react-native';

import { Glass, ListRow } from '@/components/ui';
import type { SkyEvent, SkyEventKind } from '@/lib/sky/events/types';
import { colors, componentSize, radii, space, textStyles } from '@/theme';

import { eventArt } from './skyArt';

function EventThumb({ event }: { event: SkyEvent }) {
  return <Image source={eventArt(event)} style={styles.thumb} accessibilityIgnoresInvertColors />;
}

export interface WhatsUpProps {
  events: readonly SkyEvent[];
  /** Where a row goes when tapped; rows without a target are not tappable. */
  onOpen?: Partial<Record<SkyEventKind, () => void>>;
}

/** "What's up tonight": one row per sky event, each with its painted thumbnail. */
export function WhatsUp({ events, onOpen = {} }: WhatsUpProps) {
  return (
    <Glass tone="night">
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
            leading={<EventThumb event={e} />}
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
  thumb: {
    width: componentSize.eventThumbWidth,
    height: componentSize.eventThumbHeight,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.night.glassBorder,
  },
});
