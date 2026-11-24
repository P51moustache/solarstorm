import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnMore } from '@/components/explainer';
import { SunCam } from '@/components/SunCam';
import { Glass, ScreenTitle, SectionLabel, Tappable } from '@/components/ui';
import { flareColor, kpScale, noaaScaleColor, relativeTime } from '@/constants/solar';
import {
  Flare,
  getLatestFlare,
  getOutlook,
  getScales,
  getSpaceAlerts,
  OutlookDay,
  Scales,
  SpaceAlert,
} from '@/lib/spaceWeather';
import { colors, fontSize, fonts, iconSize, layout, lineHeight, radii, space, textStyles, tracking } from '@/theme';

const SCALE_DEFS = [
  { key: 'R', name: 'Radio Blackout', pick: (s: Scales) => s.R },
  { key: 'S', name: 'Radiation', pick: (s: Scales) => s.S },
  { key: 'G', name: 'Geomagnetic', pick: (s: Scales) => s.G },
] as const;

interface Status {
  tone: 'good' | 'mixed' | 'poor';
  icon: any;
  title: string;
  detail: string;
}

function computeStatus(scales: Scales | null, outlook: OutlookDay[]): Status {
  const active = scales
    ? SCALE_DEFS.map((d) => ({ name: d.name, s: d.pick(scales) })).filter((x) => x.s.scale >= 1)
    : [];
  if (active.length) {
    const top = active.reduce((a, b) => (b.s.scale > a.s.scale ? b : a));
    const tone = top.s.scale >= 3 ? 'poor' : 'mixed';
    return {
      tone,
      icon: 'alert-circle',
      title: 'Space weather is active now',
      detail: active
        .map((x) => `${x.name === 'Radio Blackout' ? 'R' : x.name === 'Radiation' ? 'S' : 'G'}${x.s.scale} ${x.s.text}`)
        .join(' · '),
    };
  }
  const peak = outlook.reduce<OutlookDay | null>((a, b) => (!a || b.kp > a.kp ? b : a), null);
  if (peak && peak.kp >= 5) {
    return {
      tone: 'mixed',
      icon: 'calendar',
      title: 'Heads-up this fortnight',
      detail: `Elevated activity likely — up to Kp ${peak.kp} around ${peak.label}. Worth watching your systems.`,
    };
  }
  return {
    tone: 'good',
    icon: 'shield-checkmark',
    title: 'All quiet',
    detail: 'Nothing significant now or expected in the next two weeks.',
  };
}

function toneColor(tone: 'good' | 'mixed' | 'poor'): string {
  return tone === 'good' ? colors.good : tone === 'mixed' ? colors.warn : colors.danger;
}

export default function ActivityScreen() {
  const [scales, setScales] = useState<Scales | null>(null);
  const [flare, setFlare] = useState<Flare | null>(null);
  const [alerts, setAlerts] = useState<SpaceAlert[]>([]);
  const [outlook, setOutlook] = useState<OutlookDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bust, setBust] = useState(1);
  const router = useRouter();

  const load = useCallback(async () => {
    const [s, f, a, o] = await Promise.all([
      getScales(),
      getLatestFlare(),
      getSpaceAlerts(),
      getOutlook(14),
    ]);
    setScales(s);
    setFlare(f);
    setAlerts(a);
    setOutlook(o);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setBust((b) => b + 1);
    load();
  }, [load]);

  const status = computeStatus(scales, outlook);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
        }>
        <ScreenTitle title="Activity" subtitle="Big events — now and the next two weeks" />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            {/* Headline status */}
            <Glass style={{ borderColor: toneColor(status.tone) }}>
              <View style={styles.statusRow}>
                <Ionicons name={status.icon} size={iconSize.xxxl} color={toneColor(status.tone)} />
                <View style={styles.flex}>
                  <Text style={[styles.statusTitle, { color: toneColor(status.tone) }]}>{status.title}</Text>
                  <Text style={styles.statusDetail}>{status.detail}</Text>
                </View>
              </View>
            </Glass>

            {/* Live Sun imagery */}
            <Glass>
              <SectionLabel>The Sun right now</SectionLabel>
              <View style={{ marginTop: space[3] }}>
                <SunCam bust={bust} />
              </View>
            </Glass>

            {/* 2-week outlook */}
            {outlook.length > 0 ? (
              <Glass>
                <SectionLabel>Next 2 weeks · predicted Kp</SectionLabel>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.outlookScroll}>
                  {outlook.map((d) => {
                    const c = kpScale(d.kp);
                    const hot = d.kp >= 5;
                    return (
                      <View key={d.label} style={[styles.day, hot && { borderColor: c.color, borderWidth: 1 }]}>
                        <Text style={styles.dayLabel}>{d.label}</Text>
                        <Text style={[styles.dayKp, { color: c.color }]}>{d.kp}</Text>
                        <View style={[styles.dayBarTrack]}>
                          <View style={[styles.dayBar, { height: `${(d.kp / 9) * 100}%`, backgroundColor: c.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <Text style={styles.dim}>Tap-free glance: taller/brighter = more active. Kp 5+ = storm.</Text>
              </Glass>
            ) : null}

            {/* NOAA R/S/G scales */}
            <Glass>
              <View style={styles.cardHead}>
                <SectionLabel>NOAA scales · now</SectionLabel>
                <LearnMore term="scales" label="what's this?" />
              </View>
              <View style={styles.scaleRow}>
                {SCALE_DEFS.map((def) => {
                  const s = scales ? def.pick(scales) : { scale: 0, text: '—' };
                  const color = noaaScaleColor(s.scale);
                  return (
                    <View key={def.key} style={styles.scaleBlock}>
                      <Text style={[styles.scaleVal, { color }]}>
                        {def.key}
                        {s.scale}
                      </Text>
                      <Text style={styles.scaleName}>{def.name}</Text>
                      <Text style={[styles.scaleText, { color }]} numberOfLines={1}>
                        {s.text === 'none' ? 'Quiet' : s.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Glass>

            {/* Solar flares */}
            <Glass>
              <View style={styles.cardHead}>
                <SectionLabel>Solar flares</SectionLabel>
                <LearnMore term="flares" label="flare classes" />
              </View>
              <View style={styles.flareRow}>
                <Text style={[styles.flareClass, { color: flareColor(flare?.maxClass ?? '') }]}>
                  {flare?.maxClass ?? '—'}
                </Text>
                <Text style={styles.flareSub}>largest in 24h</Text>
              </View>
              <Text style={styles.dim}>
                Current background: {flare?.currentClass ?? '—'}
                {flare?.maxTime ? ` · peak ${relativeTime(flare.maxTime)}` : ''}
              </Text>
            </Glass>

            {/* Live alerts */}
            <View style={styles.cardHead}>
              <Text style={styles.sectionHeader}>Live alerts & warnings</Text>
              <LearnMore term="radiation" label="why it matters" />
            </View>
            {alerts.length === 0 ? (
              <Glass>
                <Text style={styles.dim}>No active alerts right now — space weather is calm.</Text>
              </Glass>
            ) : (
              alerts.map((a, i) => (
                <Glass key={i} style={styles.alertCard}>
                  <Text style={styles.alertTitle}>{a.title}</Text>
                  <Text style={styles.dim}>{relativeTime(a.issued)}</Text>
                </Glass>
              ))
            )}

            <Tappable onPress={() => router.push('/learn')} feedback="none">
              <Glass style={styles.learnCard}>
                <Ionicons name="book-outline" size={iconSize.xl} color={colors.accent} />
                <View style={styles.flex}>
                  <Text style={styles.learnTitle}>New to space weather?</Text>
                  <Text style={styles.dim}>Start with the basics — a 2-minute primer.</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.lg} color={colors.textFaint} />
              </Glass>
            </Tappable>

            <Text style={styles.note}>Source: NOAA SWPC · NASA SDO/SOHO · pull to refresh</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Day-chip outline and the width of the Kp bar: hairline-plus lines that have no token. */
const DAY_BORDER = 1;
const KP_BAR_WIDTH = 6;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: layout.screenPadding, gap: space[3], paddingTop: space[2], paddingBottom: layout.tabBarClearance },
  center: { paddingVertical: layout.emptyStatePadding, alignItems: 'center' },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space[3.5] },
  statusTitle: { ...textStyles.sectionTitle },
  statusDetail: { ...textStyles.subtitle, color: colors.textMuted, marginTop: space[0.5], lineHeight: lineHeight.snug },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] },
  sectionHeader: { ...textStyles.sectionTitle, color: colors.text },
  outlookScroll: { marginTop: space[3], marginBottom: space[2] },
  day: { width: 46, alignItems: 'center', gap: space[1], marginRight: space[2], paddingVertical: space[1.5], borderRadius: radii.sm, borderColor: 'transparent', borderWidth: DAY_BORDER },
  dayLabel: { color: colors.textMuted, fontSize: fontSize.micro, fontFamily: fonts.medium },
  dayKp: { ...textStyles.sectionTitle },
  dayBarTrack: { width: KP_BAR_WIDTH, height: 40, backgroundColor: colors.fill, borderRadius: radii.pill, justifyContent: 'flex-end', overflow: 'hidden' },
  dayBar: { width: KP_BAR_WIDTH, borderRadius: radii.pill },
  scaleRow: { flexDirection: 'row', gap: space[2.5] },
  scaleBlock: { flex: 1, alignItems: 'center', gap: space[1] },
  scaleVal: { fontSize: fontSize.display, fontFamily: fonts.bold, letterSpacing: tracking.tight },
  scaleName: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fonts.medium },
  scaleText: { fontSize: fontSize.caption, fontFamily: fonts.semibold },
  flareRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2.5] },
  flareClass: { fontSize: fontSize.hero2, fontFamily: fonts.bold, letterSpacing: tracking.displaySmall },
  flareSub: { color: colors.textFaint, fontSize: fontSize.subhead, fontFamily: fonts.medium },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: space[3.5] },
  learnTitle: { color: colors.text, fontSize: fontSize.callout, fontFamily: fonts.bold },
  alertCard: { paddingVertical: space[3.5] },
  alertTitle: { color: colors.text, fontSize: fontSize.subhead, fontFamily: fonts.medium, lineHeight: lineHeight.snug, marginBottom: space[1] },
  dim: { ...textStyles.footnote, color: colors.textMuted },
  note: { ...textStyles.caption, color: colors.textFaint, textAlign: 'center', marginTop: space[1] },
});
