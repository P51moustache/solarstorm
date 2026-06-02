import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnMore } from '@/components/explainer';
import { SunCam } from '@/components/SunCam';
import { Glass, ScreenTitle } from '@/components/ui-kit';
import { flareColor, Fonts, kpScale, noaaScaleColor, Palette, relativeTime } from '@/constants/solar';
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
  return tone === 'good' ? Palette.good : tone === 'mixed' ? Palette.warn : Palette.danger;
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.textDim} />
        }>
        <ScreenTitle title="Activity" subtitle="Big events — now and the next two weeks" />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.accent} />
          </View>
        ) : (
          <>
            {/* Headline status */}
            <Glass style={{ borderColor: toneColor(status.tone) }}>
              <View style={styles.statusRow}>
                <Ionicons name={status.icon} size={28} color={toneColor(status.tone)} />
                <View style={styles.flex}>
                  <Text style={[styles.statusTitle, { color: toneColor(status.tone) }]}>{status.title}</Text>
                  <Text style={styles.statusDetail}>{status.detail}</Text>
                </View>
              </View>
            </Glass>

            {/* Live Sun imagery */}
            <Glass>
              <Text style={styles.cardLabel}>The Sun right now</Text>
              <View style={{ marginTop: 12 }}>
                <SunCam bust={bust} />
              </View>
            </Glass>

            {/* 2-week outlook */}
            {outlook.length > 0 ? (
              <Glass>
                <Text style={styles.cardLabel}>Next 2 weeks · predicted Kp</Text>
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
                <Text style={styles.cardLabel}>NOAA scales · now</Text>
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
                <Text style={styles.cardLabel}>Solar flares</Text>
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

            <Pressable onPress={() => router.push('/learn')}>
              <Glass style={styles.learnCard}>
                <Ionicons name="book-outline" size={22} color={Palette.accent} />
                <View style={styles.flex}>
                  <Text style={styles.learnTitle}>New to space weather?</Text>
                  <Text style={styles.dim}>Start with the basics — a 2-minute primer.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Palette.textFaint} />
              </Glass>
            </Pressable>

            <Text style={styles.note}>Source: NOAA SWPC · NASA SDO/SOHO · pull to refresh</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 12, paddingTop: 8, paddingBottom: 130 },
  center: { paddingVertical: 60, alignItems: 'center' },
  flex: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusTitle: { fontSize: 18, fontFamily: Fonts.bold },
  statusDetail: { color: Palette.textDim, fontSize: 14, fontFamily: Fonts.regular, marginTop: 2, lineHeight: 19 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeader: { color: Palette.text, fontSize: 18, fontFamily: Fonts.bold },
  outlookScroll: { marginTop: 12, marginBottom: 8 },
  day: { width: 46, alignItems: 'center', gap: 4, marginRight: 8, paddingVertical: 6, borderRadius: 10, borderColor: 'transparent', borderWidth: 1 },
  dayLabel: { color: Palette.textDim, fontSize: 11, fontFamily: Fonts.medium },
  dayKp: { fontSize: 18, fontFamily: Fonts.bold },
  dayBarTrack: { width: 6, height: 40, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  dayBar: { width: 6, borderRadius: 3 },
  scaleRow: { flexDirection: 'row', gap: 10 },
  scaleBlock: { flex: 1, alignItems: 'center', gap: 3 },
  scaleVal: { fontSize: 34, fontFamily: Fonts.bold, letterSpacing: -1 },
  scaleName: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.medium },
  scaleText: { fontSize: 12, fontFamily: Fonts.semibold },
  flareRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  flareClass: { fontSize: 44, fontFamily: Fonts.bold, letterSpacing: -1.5 },
  flareSub: { color: Palette.textFaint, fontSize: 14, fontFamily: Fonts.medium },
  learnCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  learnTitle: { color: Palette.text, fontSize: 16, fontFamily: Fonts.bold },
  alertCard: { paddingVertical: 14 },
  alertTitle: { color: Palette.text, fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20, marginBottom: 4 },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4 },
});
