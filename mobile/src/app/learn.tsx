import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Glass, Tappable } from '@/components/ui';
import { colors, fontSize, fonts, layout, lineHeight, radii, space, textStyles, tracking, iconSize } from '@/theme';

const LESSONS = [
  {
    icon: 'planet' as const,
    color: colors.aurora.blue,
    title: 'What is space weather?',
    body: 'The Sun constantly streams particles and radiation past Earth. When it flares up, it can disrupt satellites, GPS, radio, and power grids — and light up the sky with aurora. That whole story is "space weather."',
  },
  {
    icon: 'sunny' as const,
    color: colors.aurora.orange,
    title: 'The Sun & the 11-year cycle',
    body: 'The Sun runs an ~11-year rhythm between calm and stormy. Near solar maximum — where we are now — sunspots, flares, and aurora all become far more frequent.',
  },
  {
    icon: 'flash' as const,
    color: colors.aurora.red,
    title: 'Solar flares (the R scale)',
    body: 'A flare is a sudden flash of X-rays, graded A · B · C · M · X (each 10× the last). M- and X-class flares can black out HF radio and degrade GPS on Earth’s daylit side within minutes of erupting.',
  },
  {
    icon: 'rocket' as const,
    color: colors.aurora.violet,
    title: 'CMEs & geomagnetic storms (G)',
    body: 'A coronal mass ejection is a billion-ton cloud of solar plasma. If one is aimed at Earth, it arrives 1–3 days later and triggers a geomagnetic storm (G1–G5) — the main driver of aurora and of satellite drag.',
  },
  {
    icon: 'radio' as const,
    color: colors.aurora.coral,
    title: 'Radiation storms (the S scale)',
    body: 'Big flares and CMEs flood near-Earth space with high-energy protons. These can harm satellite electronics, raise radiation on polar flights, and push spacecraft into safe mode.',
  },
  {
    icon: 'magnet' as const,
    color: colors.aurora.green,
    title: 'Kp, Bz & the aurora',
    body: 'Kp (0–9) measures how disturbed Earth’s magnetic field is — higher Kp pushes the aurora toward the equator. Bz is the Sun’s magnetic field direction; when it points south, it pours energy in and supercharges the show.',
  },
  {
    icon: 'sparkles' as const,
    color: colors.aurora.mint,
    title: 'Using SolarStorm',
    body: 'Now → tonight’s aurora chance where you are. Activity → is anything big happening or coming. Trends → where activity has been and where it’s headed. Set an Alert and we’ll flag the next storm.',
  },
];

export default function LearnScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Space Weather 101</Text>
        <Tappable onPress={() => router.back()} hitSlop={10} feedback="none">
          <Ionicons name="close" size={iconSize.xxxl} color={colors.textMuted} />
        </Tappable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Everything you need to read the sky like a pro — in plain language.</Text>
        {LESSONS.map((l, i) => (
          <Glass key={l.title}>
            <View style={styles.cardHead}>
              <View style={[styles.iconWrap, { borderColor: l.color }]}>
                <Ionicons name={l.icon} size={iconSize.xl} color={l.color} />
              </View>
              <Text style={styles.num}>{i + 1}</Text>
            </View>
            <Text style={styles.lessonTitle}>{l.title}</Text>
            <Text style={styles.body}>{l.body}</Text>
          </Glass>
        ))}
        <Text style={styles.foot}>Data from NOAA SWPC and NASA. Stay curious. ✦</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[2],
    paddingBottom: space[1],
  },
  title: { color: colors.text, fontSize: fontSize.title1, fontFamily: fonts.bold, letterSpacing: tracking.title },
  content: { padding: layout.screenPadding, gap: layout.stackGap, paddingBottom: layout.modalClearance },
  intro: { ...textStyles.body, color: colors.textMuted, lineHeight: lineHeight.snug, marginBottom: space[1] },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[2.5] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fillSubtle,
  },
  num: { color: colors.textFaint, fontSize: fontSize.title2, fontFamily: fonts.bold },
  lessonTitle: { ...textStyles.sectionTitle, color: colors.text, marginBottom: space[1.5] },
  body: { ...textStyles.body, color: colors.textMuted, lineHeight: lineHeight.body },
  foot: { ...textStyles.footnote, color: colors.textFaint, textAlign: 'center', marginTop: space[2] },
});
