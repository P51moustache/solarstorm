import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Tappable } from '@/components/ui';
import { colors, fontSize, fonts, lineHeight, radii, space, textStyles } from '@/theme';

interface Channel {
  id: string;
  label: string;
  url: string;
  caption: string;
}

const CHANNELS: Channel[] = [
  {
    id: '0193',
    label: 'Corona',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0193.jpg',
    caption: 'The corona at 1–2 million °C. Bright active regions are where flares erupt.',
  },
  {
    id: '0171',
    label: 'Loops',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0171.jpg',
    caption: 'Magnetic loops of plasma arching off the surface (~600,000 °C).',
  },
  {
    id: '0304',
    label: 'Prominences',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_0304.jpg',
    caption: 'Cooler plasma (~50,000 °C) — prominences and filaments leaping off the edge.',
  },
  {
    id: 'HMIIF',
    label: 'Sunspots',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIIF.jpg',
    caption: 'Visible light — dark sunspots mark the most intense magnetic activity.',
  },
  {
    id: 'HMIB',
    label: 'Magnetic',
    url: 'https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_HMIB.jpg',
    caption: 'Magnetogram — black and white show opposite magnetic polarity.',
  },
  {
    id: 'C3',
    label: 'CMEs',
    url: 'https://soho.nascom.nasa.gov/data/realtime/c3/512/latest.jpg',
    caption: 'Coronagraph: the Sun is masked so you can watch CMEs blast outward.',
  },
];

/** Live NASA SDO / SOHO imagery of the Sun. `bust` forces a fresh fetch on refresh. */
export function SunCam({ bust }: { bust: number }) {
  const [sel, setSel] = useState(0);
  const ch = CHANNELS[sel];

  return (
    <View>
      <Image
        source={{ uri: `${ch.url}?t=${bust}` }}
        style={styles.image}
        resizeMode="cover"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}>
        {CHANNELS.map((c, i) => (
          <Tappable
            key={c.id}
            onPress={() => setSel(i)}
            feedback="none"
            style={[styles.chip, i === sel && styles.chipActive]}>
            <Text style={[styles.chipText, i === sel && styles.chipTextActive]}>{c.label}</Text>
          </Tappable>
        ))}
      </ScrollView>
      <Text style={styles.caption}>{ch.caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.media,
  },
  chips: { marginTop: space[3] },
  chipsContent: { gap: space[2], paddingRight: space[2] },
  chip: {
    paddingHorizontal: space[3.5],
    paddingVertical: space[2],
    borderRadius: radii.pill,
    backgroundColor: colors.fill,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: fontSize.footnote, fontFamily: fonts.semibold },
  chipTextActive: { color: colors.onAccent },
  caption: { ...textStyles.footnote, color: colors.textMuted, marginTop: space[3], lineHeight: lineHeight.footnote },
});
