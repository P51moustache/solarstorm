import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnMore } from '@/components/explainer';
import { Button, Glass, ListRow, Metric, Pill, SectionLabel, Tappable } from '@/components/ui';
import { kpScale, relativeTime } from '@/constants/solar';
import { auroraProbability } from '@/lib/aurora';
import { DeviceLocation, getDeviceLocation, hasLocationPermission } from '@/lib/location';
import { useSky } from '@/lib/sky';
import { Forecast, getForecast } from '@/lib/spaceWeather';
import { getViewingConditions, ViewingConditions, viewingVerdict } from '@/lib/viewing';
import { colors, fontSize, fonts, iconSize, layout, lineHeight, motion, space, textStyles, tracking } from '@/theme';

function probabilityColor(p: number): string {
  if (p >= 70) return colors.severity.strong;
  if (p >= 50) return colors.severity.moderate;
  if (p >= 30) return colors.severity.minor;
  if (p >= 15) return colors.severity.active;
  return colors.textMuted;
}

function verdictColor(tone: 'good' | 'mixed' | 'poor'): string {
  return tone === 'good' ? colors.good : tone === 'mixed' ? colors.warn : colors.danger;
}

function ViewFactor({ icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <View style={styles.factor}>
      <Ionicons name={icon} size={iconSize.lg} color={color} />
      <Text style={styles.factorLabel}>{label}</Text>
      <Text style={[styles.factorValue, { color }]}>{value}</Text>
      <Text style={styles.factorSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

/** Aurora & Sun: live space weather, with Activity and Trends one tap away. */
export default function AuroraSunScreen() {
  const { conditions, mood, loading, refresh } = useSky();
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [location, setLocation] = useState<DeviceLocation | null>(null);
  const [viewing, setViewing] = useState<ViewingConditions | null>(null);
  const [locating, setLocating] = useState(false);
  const [locDenied, setLocDenied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadForecast = useCallback(async () => {
    setForecast(await getForecast().catch(() => null));
  }, []);

  const fetchLocation = useCallback(async () => {
    setLocating(true);
    const loc = await getDeviceLocation();
    setLocating(false);
    if (loc) {
      motion.haptics.select();
      setLocation(loc);
      setLocDenied(false);
      getViewingConditions(loc.lat, loc.lng).then(setViewing);
    } else setLocDenied(true);
  }, []);

  useEffect(() => {
    loadForecast();
    hasLocationPermission().then((granted) => {
      if (granted) fetchLocation();
    });
  }, [loadForecast, fetchLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refresh(),
      loadForecast(),
      location ? getViewingConditions(location.lat, location.lng).then(setViewing) : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [refresh, loadForecast, location]);

  const kp = conditions?.kp ?? null;
  const scale = kpScale(kp);
  const sw = conditions?.solarWind;
  const prediction =
    location && kp !== null
      ? auroraProbability(location.lat, location.lng, kp, sw?.bz ?? null, sw?.speed ?? null)
      : null;
  const verdict = prediction && viewing ? viewingVerdict(prediction.probability, viewing) : null;

  async function onShare() {
    motion.haptics.select();
    const aurora = prediction && location ? ` Aurora ${prediction.probability}% at ${location.label}.` : '';
    await Share.share({
      message: `Space weather right now: ${mood.headline.toLowerCase()} — Kp ${kp?.toFixed(1) ?? '—'}.${aurora} via SolarStorm`,
    }).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
        {/* Hero — overall space-weather state */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>RIGHT NOW</Text>
          <Text style={styles.headline}>{mood.headline}</Text>
          <Text style={styles.heroSub}>{mood.sub}</Text>

          {loading && !conditions ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: space[6] }} />
          ) : (
            <>
              <View style={styles.kpRow}>
                <Text style={[styles.kpValue, { color: scale.color }]}>{kp === null ? '—' : kp.toFixed(1)}</Text>
                <View style={styles.kpMeta}>
                  <Text style={styles.kpUnit}>Kp index</Text>
                  <Pill text={scale.label} color={scale.color} />
                </View>
              </View>
              <View style={styles.heroFoot}>
                <LearnMore term="kp" label="What's Kp?" />
                <Tappable onPress={onShare} style={styles.shareBtn} hitSlop={SHARE_HIT_SLOP}>
                  <Ionicons name="share-outline" size={iconSize.sm} color={colors.accent} />
                  <Text style={styles.shareText}>Share</Text>
                </Tappable>
              </View>
            </>
          )}
        </View>

        {/* Solar wind */}
        <Glass>
          <View style={styles.cardHead}>
            <SectionLabel>Solar wind</SectionLabel>
            <LearnMore term="speed" label="explain" />
          </View>
          <View style={styles.metricRow}>
            <Metric label="Speed" value={sw?.speed != null ? Math.round(sw.speed).toString() : '—'} unit="km/s" />
            <Metric label="Density" value={sw?.density != null ? sw.density.toFixed(1) : '—'} unit="p/cm³" />
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Metric label="Bz" value={sw?.bz != null ? sw.bz.toFixed(1) : '—'} unit="nT" color={sw?.bz != null && sw.bz < 0 ? colors.warn : undefined} />
            <Metric label="Bt" value={sw?.bt != null ? sw.bt.toFixed(1) : '—'} unit="nT" />
          </View>
          <View style={styles.cardFoot}>
            <LearnMore term="bz" label="Why does Bz matter?" />
            <Text style={styles.dim}>{relativeTime(sw?.at ?? null)}</Text>
          </View>
        </Glass>

        {/* Aurora tonight (only relevant to some — demoted to a card) */}
        <Glass style={prediction ? { borderColor: probabilityColor(prediction.probability) } : undefined}>
          <View style={styles.cardHead}>
            <SectionLabel>Aurora tonight</SectionLabel>
            {prediction ? <LearnMore term="aurora" label="how?" /> : null}
          </View>
          {prediction ? (
            <>
              <View style={styles.pctRow}>
                <Text style={[styles.bigPct, { color: probabilityColor(prediction.probability) }]}>{prediction.probability}</Text>
                <Text style={styles.pctMark}>% chance at {location?.label}</Text>
              </View>
              <Text style={styles.desc}>{prediction.description}</Text>
              {verdict ? <Text style={[styles.verdict, { color: verdictColor(verdict.tone) }]}>{verdict.text}</Text> : null}
              {viewing ? (
                <View style={styles.viewRow}>
                  <ViewFactor icon="cloud" label="Cloud" value={`${viewing.cloudCover}%`} sub={viewing.clarity} color={viewing.cloudCover <= 25 ? colors.good : viewing.cloudCover <= 65 ? colors.warn : colors.danger} />
                  <ViewFactor icon="moon" label="Moon" value={`${Math.round(viewing.moonIllum * 100)}%`} sub={viewing.moonName} color={viewing.moonIllum > 0.6 ? colors.warn : colors.good} />
                  <ViewFactor icon="moon-outline" label="Dark" value={viewing.sunset} sub={`to ${viewing.sunrise}`} color={colors.textMuted} />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.dim}>Aurora is mainly visible at high latitudes. Check your local odds and what it would take to see it.</Text>
              <Button label="📍 Check my location" onPress={fetchLocation} loading={locating} style={styles.locBtn} />
              {locDenied ? <Text style={styles.dim}>Enable location in Settings for your local forecast.</Text> : null}
            </>
          )}
        </Glass>

        {/* 3-day forecast */}
        {forecast && forecast.days.length > 0 ? (
          <Glass>
            <SectionLabel>Next 3 nights</SectionLabel>
            <View style={styles.forecastRow}>
              {forecast.days.map((d) => {
                const s = kpScale(d.maxKp);
                return (
                  <View key={d.label} style={styles.forecastDay}>
                    <Text style={styles.forecastLabel}>{d.label}</Text>
                    <Text style={[styles.forecastKp, { color: s.color }]}>{d.maxKp.toFixed(1)}</Text>
                    <Text style={styles.forecastSub}>peak Kp</Text>
                    <Text style={styles.forecastStorm}>{d.minorPct}% storm</Text>
                  </View>
                );
              })}
            </View>
          </Glass>
        ) : null}

        <Glass>
          <ListRow
            title="Solar activity"
            subtitle="Flares, NOAA scales and the next two weeks"
            leading={<Ionicons name="flash" size={iconSize.xl} color={colors.accent} />}
            onPress={() => router.push('/activity')}
            divider={false}
          />
          <ListRow
            title="Trends"
            subtitle="Kp, solar wind and Bz over the last days"
            leading={<Ionicons name="pulse" size={iconSize.xl} color={colors.accent} />}
            onPress={() => router.push('/history')}
          />
        </Glass>

        <Text style={styles.source}>Live data · NOAA Space Weather Prediction Center</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Extra tap area around the small Share link. */
const SHARE_HIT_SLOP = space[2];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: layout.screenPadding, gap: space[3.5], paddingTop: space[2], paddingBottom: layout.tabBarClearance },
  hero: { paddingVertical: space[4.5], paddingHorizontal: space[0.5] },
  eyebrow: { color: colors.textMuted, fontSize: fontSize.footnote, fontFamily: fonts.bold, letterSpacing: tracking.wide },
  headline: { color: colors.text, fontSize: fontSize.hero1, fontFamily: fonts.bold, letterSpacing: tracking.tight, marginTop: space[1.5] },
  heroSub: { color: colors.textMuted, fontSize: fontSize.callout, fontFamily: fonts.regular, marginTop: space[2], lineHeight: lineHeight.body },
  kpRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], marginTop: space[6] },
  kpValue: { fontSize: fontSize.hero4, fontFamily: fonts.bold, letterSpacing: tracking.hero },
  kpMeta: { gap: space[2] },
  kpUnit: { ...textStyles.bodyStrong, color: colors.textFaint },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[4.5] },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  shareText: { color: colors.accent, fontSize: fontSize.subhead, fontFamily: fonts.semibold },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[1.5] },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3.5] },
  pctRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], marginTop: space[1] },
  bigPct: { fontSize: fontSize.hero3, fontFamily: fonts.bold, letterSpacing: tracking.display },
  pctMark: { color: colors.textFaint, fontSize: fontSize.subhead, fontFamily: fonts.medium, flexShrink: 1 },
  desc: { ...textStyles.bodyStrong, color: colors.text, marginTop: space[2], lineHeight: lineHeight.snug },
  verdict: { fontSize: fontSize.subhead, fontFamily: fonts.medium, marginTop: space[2], lineHeight: lineHeight.snug },
  dim: { ...textStyles.footnote, color: colors.textMuted, marginTop: space[1.5], lineHeight: lineHeight.footnote },
  locBtn: { marginTop: space[3] },
  metricRow: { flexDirection: 'row', gap: space[3], marginTop: space[1] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space[4] },
  viewRow: { flexDirection: 'row', gap: space[2.5], marginTop: space[3.5] },
  factor: { flex: 1, alignItems: 'center', gap: space[1] },
  factorLabel: { ...textStyles.metricLabel, fontSize: fontSize.micro, color: colors.textFaint },
  factorValue: { ...textStyles.sectionTitle },
  factorSub: { ...textStyles.micro, color: colors.textMuted },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
  forecastDay: { flex: 1, alignItems: 'center', gap: space[0.5] },
  forecastLabel: { ...textStyles.footnoteStrong, color: colors.textMuted },
  forecastKp: { ...textStyles.metric, marginTop: space[1] },
  forecastSub: { ...textStyles.micro, color: colors.textFaint },
  forecastStorm: { color: colors.textMuted, fontSize: fontSize.caption, fontFamily: fonts.medium, marginTop: space[1] },
  source: { ...textStyles.caption, color: colors.textFaint, textAlign: 'center', marginTop: space[2] },
});
