import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuroraOval } from '@/components/aurora-oval';
import { LearnMore } from '@/components/explainer';
import { Glass, Metric, Pill } from '@/components/ui-kit';
import { Fonts, kpScale, Palette, relativeTime } from '@/constants/solar';
import { auroraProbability, auroraViewingLatitude, magneticLatitude } from '@/lib/aurora';
import { DeviceLocation, getDeviceLocation, hasLocationPermission } from '@/lib/location';
import { useSky } from '@/lib/sky';
import { Forecast, getForecast } from '@/lib/spaceWeather';
import { getViewingConditions, ViewingConditions, viewingVerdict } from '@/lib/viewing';

function probabilityColor(p: number): string {
  if (p >= 70) return '#FF6B5B';
  if (p >= 50) return '#FF9F43';
  if (p >= 30) return '#F1C40F';
  if (p >= 15) return '#7FD17F';
  return Palette.textDim;
}

function verdictColor(tone: 'good' | 'mixed' | 'poor'): string {
  return tone === 'good' ? Palette.good : tone === 'mixed' ? Palette.warn : Palette.danger;
}

function ViewFactor({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <View style={styles.factor}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.factorLabel}>{label}</Text>
      <Text style={[styles.factorValue, { color }]}>{value}</Text>
      <Text style={styles.factorSub} numberOfLines={1}>{sub}</Text>
    </View>
  );
}

export default function DashboardScreen() {
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
      Haptics.selectionAsync();
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
    if (!prediction) return;
    Haptics.selectionAsync();
    const where = location?.label ? ` at ${location.label}` : '';
    await Share.share({
      message:
        `Aurora tonight${where}: ${prediction.probability}% chance (Kp ${kp?.toFixed(1)}). ` +
        `${verdict?.text ?? prediction.description} — via SolarStorm`,
    }).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.textDim} />
        }>
        {/* Hero — the living sky reads itself to you */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>TONIGHT</Text>
          <Text style={styles.headline}>{mood.headline}</Text>
          <Text style={styles.heroSub}>{mood.sub}</Text>

          {loading && !conditions ? (
            <ActivityIndicator color={Palette.accent} style={{ marginTop: 20 }} />
          ) : prediction ? (
            <View style={styles.predict}>
              <View style={styles.pctRow}>
                <Text style={[styles.bigPct, { color: probabilityColor(prediction.probability) }]}>
                  {prediction.probability}
                </Text>
                <Text style={styles.pctMark}>% chance you'll see it</Text>
              </View>
              <Text style={styles.desc}>{prediction.description}</Text>
              <View style={styles.locRow}>
                <Text style={styles.dim}>
                  📍 {location?.label}
                  {prediction.bestViewingTime ? ` · best ${prediction.bestViewingTime}` : ''}
                </Text>
                <Pressable onPress={onShare} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]} hitSlop={8}>
                  <Ionicons name="share-outline" size={16} color={Palette.accent} />
                  <Text style={styles.shareText}>Share</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.predict}>
              <Pressable
                style={({ pressed }) => [styles.locBtn, pressed && styles.pressed]}
                onPress={fetchLocation}
                disabled={locating}>
                {locating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.locBtnText}>📍 See your chance tonight</Text>
                )}
              </Pressable>
              {locDenied ? (
                <Text style={styles.dim}>Enable location in Settings for your local forecast.</Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Aurora oval viz */}
        {prediction && location && kp !== null ? (
          <Glass>
            <View style={styles.cardHead}>
              <Text style={styles.cardLabel}>Where you stand</Text>
              <LearnMore term="oval" label="the oval" />
            </View>
            <AuroraOval
              userMagLat={magneticLatitude(location.lat, location.lng)}
              boundaryLat={auroraViewingLatitude(kp)}
              inside={Math.abs(magneticLatitude(location.lat, location.lng)) >= auroraViewingLatitude(kp)}
            />
          </Glass>
        ) : null}

        {/* Tonight's viewing conditions */}
        {prediction && viewing ? (
          <Glass style={verdict ? { borderColor: verdictColor(verdict.tone) } : undefined}>
            <Text style={styles.cardLabel}>Tonight&apos;s viewing</Text>
            {verdict ? (
              <Text style={[styles.verdict, { color: verdictColor(verdict.tone) }]}>{verdict.text}</Text>
            ) : null}
            <View style={styles.viewRow}>
              <ViewFactor
                icon="cloud"
                label="Cloud"
                value={`${viewing.cloudCover}%`}
                sub={viewing.clarity}
                color={viewing.cloudCover <= 25 ? Palette.good : viewing.cloudCover <= 65 ? Palette.warn : Palette.danger}
              />
              <ViewFactor
                icon="moon"
                label="Moon"
                value={`${Math.round(viewing.moonIllum * 100)}%`}
                sub={viewing.moonName}
                color={viewing.moonIllum > 0.6 ? Palette.warn : Palette.good}
              />
              <ViewFactor
                icon="moon-outline"
                label="Dark"
                value={viewing.sunset}
                sub={`to ${viewing.sunrise}`}
                color={Palette.textDim}
              />
            </View>
          </Glass>
        ) : null}

        {/* Kp */}
        <Glass style={{ borderColor: scale.color }}>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>Geomagnetic activity</Text>
            <Pill text={scale.label} color={scale.color} />
          </View>
          <View style={styles.kpRow}>
            <Text style={[styles.kpValue, { color: scale.color }]}>{kp === null ? '—' : kp.toFixed(2)}</Text>
            <Text style={styles.kpMax}>Kp / 9</Text>
          </View>
          <View style={styles.cardFoot}>
            <LearnMore term="kp" label="What's Kp?" />
            <Text style={styles.dim}>{relativeTime(conditions?.kpAt ?? null)}</Text>
          </View>
        </Glass>

        {/* Solar wind */}
        <Glass>
          <View style={styles.cardHead}>
            <Text style={styles.cardLabel}>Solar wind</Text>
            <LearnMore term="speed" label="explain" />
          </View>
          <View style={styles.metricRow}>
            <Metric label="Speed" value={sw?.speed != null ? Math.round(sw.speed).toString() : '—'} unit="km/s" />
            <Metric label="Density" value={sw?.density != null ? sw.density.toFixed(1) : '—'} unit="p/cm³" />
          </View>
          <View style={styles.divider} />
          <View style={styles.metricRow}>
            <Metric
              label="Bz"
              value={sw?.bz != null ? sw.bz.toFixed(1) : '—'}
              unit="nT"
              color={sw?.bz != null && sw.bz < 0 ? Palette.warn : undefined}
            />
            <Metric label="Bt" value={sw?.bt != null ? sw.bt.toFixed(1) : '—'} unit="nT" />
          </View>
          <View style={styles.cardFoot}>
            <LearnMore term="bz" label="Why does Bz matter?" />
            <Text style={styles.dim}>{relativeTime(sw?.at ?? null)}</Text>
          </View>
        </Glass>

        {/* 3-day forecast */}
        {forecast && forecast.days.length > 0 ? (
          <Glass>
            <Text style={styles.cardLabel}>Next 3 nights</Text>
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

        <Text style={styles.source}>Live data · NOAA Space Weather Prediction Center</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14, paddingTop: 8, paddingBottom: 130 },
  hero: { paddingVertical: 18, paddingHorizontal: 2 },
  eyebrow: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.bold, letterSpacing: 3 },
  headline: { color: Palette.text, fontSize: 40, fontFamily: Fonts.bold, letterSpacing: -1, marginTop: 6 },
  heroSub: { color: Palette.textDim, fontSize: 16, fontFamily: Fonts.regular, marginTop: 8, lineHeight: 22 },
  predict: { marginTop: 22 },
  pctRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  bigPct: { fontSize: 72, fontFamily: Fonts.bold, letterSpacing: -3 },
  pctMark: { color: Palette.textFaint, fontSize: 15, fontFamily: Fonts.medium, flexShrink: 1 },
  desc: { color: Palette.text, fontSize: 16, fontFamily: Fonts.medium, marginTop: 8, lineHeight: 22 },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular, marginTop: 6 },
  locBtn: {
    backgroundColor: Palette.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  locBtnText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
  pressed: { opacity: 0.7 },
  locRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shareText: { color: Palette.accent, fontSize: 14, fontFamily: Fonts.semibold },
  verdict: { fontSize: 16, fontFamily: Fonts.medium, marginTop: 8, marginBottom: 4, lineHeight: 22 },
  viewRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  factor: { flex: 1, alignItems: 'center', gap: 3 },
  factorLabel: { color: Palette.textFaint, fontSize: 11, fontFamily: Fonts.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  factorValue: { fontSize: 18, fontFamily: Fonts.bold },
  factorSub: { color: Palette.textDim, fontSize: 11, fontFamily: Fonts.regular },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  cardLabel: {
    color: Palette.textDim,
    fontSize: 12,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  kpRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  kpValue: { fontSize: 60, fontFamily: Fonts.bold, letterSpacing: -2 },
  kpMax: { color: Palette.textFaint, fontSize: 18, fontFamily: Fonts.medium },
  metricRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Palette.border, marginVertical: 16 },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  forecastDay: { flex: 1, alignItems: 'center', gap: 2 },
  forecastLabel: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.medium },
  forecastKp: { fontSize: 26, fontFamily: Fonts.bold, marginTop: 4 },
  forecastSub: { color: Palette.textFaint, fontSize: 11, fontFamily: Fonts.regular },
  forecastStorm: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.medium, marginTop: 4 },
  source: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 8 },
});
