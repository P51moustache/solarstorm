import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Palette } from '@/constants/solar';

const SLIDES = [
  {
    icon: 'sparkles' as const,
    color: '#19D98A',
    title: 'Space weather, decoded',
    body: 'The Sun is always active. SolarStorm turns live NASA & NOAA data into a simple read on what it’s doing — and whether it matters to you right now.',
  },
  {
    icon: 'flash' as const,
    color: '#FF9F43',
    title: 'When the Sun acts up',
    body: 'Flares, radiation storms, and CMEs can disrupt GPS, radio, satellites, and power grids — and, if you’re far enough north, light the sky with aurora.',
  },
  {
    icon: 'notifications' as const,
    color: '#5C8CFF',
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
      <Pressable style={styles.skip} onPress={onDone} hitSlop={10}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>

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
              <Ionicons name={s.icon} size={56} color={s.color} />
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
        <Pressable style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]} onPress={next}>
          <Text style={styles.btnText}>{index >= SLIDES.length - 1 ? 'Start watching' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  skip: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  skipText: { color: Palette.textDim, fontSize: 15, fontFamily: Fonts.medium },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 22 },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  title: { color: Palette.text, fontSize: 30, fontFamily: Fonts.bold, textAlign: 'center', letterSpacing: -0.5 },
  body: { color: Palette.textDim, fontSize: 17, fontFamily: Fonts.regular, textAlign: 'center', lineHeight: 25 },
  footer: { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E3135' },
  dotActive: { backgroundColor: Palette.accent, width: 22 },
  btn: { backgroundColor: Palette.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontFamily: Fonts.bold },
});
