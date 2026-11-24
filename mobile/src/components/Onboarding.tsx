import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Tappable } from '@/components/ui';
import { colors, fontSize, iconSize, lineHeight, radii, space, textStyles } from '@/theme';

const SLIDES = [
  {
    icon: 'sparkles' as const,
    color: colors.aurora.green,
    title: 'Space weather, decoded',
    body: 'The Sun is always active. SolarStorm turns live NASA & NOAA data into a simple read on what it’s doing — and whether it matters to you right now.',
  },
  {
    icon: 'flash' as const,
    color: colors.aurora.orange,
    title: 'When the Sun acts up',
    body: 'Flares, radiation storms, and CMEs can disrupt GPS, radio, satellites, and power grids — and, if you’re far enough north, light the sky with aurora.',
  },
  {
    icon: 'notifications' as const,
    color: colors.aurora.blue,
    title: 'Stay ahead of it',
    body: 'See if something big is happening now or building over the next couple of weeks — so you can check your systems, plan ahead, or just look up.',
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const ref = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (index >= SLIDES.length - 1) onDone();
    else ref.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Tappable style={styles.skip} onPress={onDone} hitSlop={10} feedback="none">
        <Text style={styles.skipText}>Skip</Text>
      </Tappable>

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={styles.flex}>
        {SLIDES.map((s) => (
          <View key={s.title} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { borderColor: s.color }]}>
              <Ionicons name={s.icon} size={iconSize.feature} color={s.color} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button size="large" onPress={next} label={index >= SLIDES.length - 1 ? 'Start watching' : 'Next'} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  skip: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  skipText: { ...textStyles.bodyStrong, color: colors.textMuted },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[9], gap: space[6] },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSubtle,
  },
  title: { ...textStyles.screenTitle, color: colors.text, textAlign: 'center' },
  body: { ...textStyles.bodyLarge, fontSize: fontSize.headline, color: colors.textMuted, textAlign: 'center', lineHeight: lineHeight.relaxed },
  footer: { paddingHorizontal: space[6], paddingBottom: space[10], gap: space[6] },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.inactive },
  dotActive: { backgroundColor: colors.accent, width: 22 },
});
