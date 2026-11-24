import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, iconSize, lineHeight, space, textStyles } from '@/theme';

import { Tappable } from './Tappable';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Tile or icon on the left. */
  leading?: ReactNode;
  /** With a handler the row is tappable and shows a chevron. */
  onPress?: () => void;
  /** Draws the hairline above the row; the first row in a list leaves it off. */
  divider?: boolean;
}

/** One row of a list inside a card: leading tile, title, up to two lines of detail, optional chevron. */
export function ListRow({ title, subtitle, leading, onPress, divider = true }: ListRowProps) {
  const body = (
    <>
      {leading}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {/* The chevron's room is kept on every row so text edges line up in mixed lists. */}
      {onPress ? (
        <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textFaint} />
      ) : (
        <View style={styles.chevronSpace} />
      )}
    </>
  );
  const style = [styles.row, divider && styles.divider];
  return onPress ? (
    <Tappable
      style={style}
      onPress={onPress}
      feedback="soft"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      {body}
    </Tappable>
  ) : (
    <View style={style} accessible accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderSubtle },
  text: { flex: 1, gap: space[0.5] },
  chevronSpace: { width: iconSize.sm },
  title: { ...textStyles.cardTitle, color: colors.text },
  subtitle: { ...textStyles.footnote, color: colors.textMuted, lineHeight: lineHeight.footnote },
});
