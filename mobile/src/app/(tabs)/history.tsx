import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bar, BarChart, LineChart } from '@/components/charts';
import { LearnMore } from '@/components/explainer';
import { Glass, ScreenTitle } from '@/components/ui-kit';
import { Fonts, kpScale, Palette, relativeTime } from '@/constants/solar';
import {
  Forecast,
  getForecast,
  getKpSeries,
  getSolarWindHistory,
  KpReading,
  Range,
  SolarWindPoint,
} from '@/lib/spaceWeather';

const RANGES: { key: Range; label: string; hours: number }[] = [
  { key: '1d', label: '24H', hours: 24 },
  { key: '3d', label: '3D', hours: 72 },
  { key: '7d', label: '7D', hours: 168 },
];

export default function TrendsScreen() {
  const [range, setRange] = useState<Range>('3d');
  const [kpHist, setKpHist] = useState<KpReading[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [wind, setWind] = useState<SolarWindPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (r: Range) => {
    const [kp, fc, sw] = await Promise.all([
      getKpSeries(),
      getForecast().catch(() => null),
      getSolarWindHistory(r),
    ]);
    setKpHist(kp);
    setForecast(fc);
    setWind(sw);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(range);
  }, [load, range]);

  const hours = RANGES.find((r) => r.key === range)!.hours;
  const now = Date.now();
  const windowStart = now - hours * 3600_000;

  const observed = kpHist.filter((r) => new Date(r.at).getTime() >= windowStart);
  const fcHorizon = Math.min(hours, 72);
  const predicted = (forecast?.series ?? []).filter((r) => {
    const t = new Date(r.at).getTime();
    return t > now && t <= now + fcHorizon * 3600_000;
  });

  const bars: Bar[] = [
    ...observed.map((r) => ({ value: r.kp, color: kpScale(r.kp).color })),
    ...predicted.map((r) => ({ value: r.kp, color: kpScale(r.kp).color, faded: true })),
  ];
  const kpLabels = [
    ...observed.map((r) => fmtTime(r.at)),
    ...predicted.map((r) => `${fmtTime(r.at)} · forecast`),
  ];
  const windLabels = wind.map((p) => fmtTime(p.at));

  const peak = observed.reduce((m, r) => Math.max(m, r.kp), 0);
  const peakAt = observed.find((r) => r.kp === peak)?.at ?? null;
  const trend = computeTrend(observed);
  const outlook = computeOutlook(forecast);

  const latestSpeed = [...wind].reverse().find((p) => p.speed != null)?.speed ?? null;
  const latestBz = [...wind].reverse().find((p) => p.bz != null)?.bz ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.textDim} />
        }>
        <ScreenTitle title="Trends" subtitle="Where the storm has been — and where it's headed" />

        {/* Range selector */}
        <View style={styles.segmented}>
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.segment, range === r.key && styles.segmentActive]}>
              <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>{r.label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.accent} />
          </View>
        ) : (
          <>
            {/* Insight row */}
            <View style={styles.insights}>
              <Insight
                icon={trend.icon}
                color={trend.color}
                value={trend.label}
                caption="trend now"
              />
              <Insight
                icon="flame"
                color={kpScale(peak).color}
                value={`Kp ${peak.toFixed(1)}`}
                caption={peakAt ? `peak · ${relativeTime(peakAt)}` : 'peak'}
              />
              <Insight
                icon="eye"
                color={outlook.color}
                value={outlook.value}
                caption={outlook.caption}
              />
            </View>

            {/* Kp history → forecast */}
            <Glass>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>Kp · history & forecast</Text>
                <LearnMore term="kp" label="What's Kp?" />
              </View>
              <BarChart
                bars={bars}
                domain={[0, 9]}
                threshold={5}
                nowIndex={observed.length}
                height={150}
                labels={kpLabels}
                formatValue={(v) => `Kp ${v.toFixed(2)}`}
              />
              <View style={styles.legendRow}>
                <Legend dotColor={Palette.text} text="observed" />
                <Legend dotColor={Palette.textFaint} text="forecast" />
                <Legend dashColor={Palette.danger} text="storm (Kp 5)" />
                <Text style={styles.scrubHint}>· touch & drag to inspect</Text>
              </View>
            </Glass>

            {/* Solar wind speed */}
            <Glass>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>Solar wind speed</Text>
                <Text style={styles.headValue}>
                  {latestSpeed != null ? Math.round(latestSpeed) : '—'}
                  <Text style={styles.headUnit}> km/s</Text>
                </Text>
              </View>
              <LineChart
                values={wind.map((p) => p.speed)}
                color={Palette.accent}
                height={84}
                labels={windLabels}
                formatValue={(v) => `${Math.round(v)} km/s`}
              />
              <LearnMore term="speed" label="why it matters" />
            </Glass>

            {/* Bz */}
            <Glass>
              <View style={styles.cardHead}>
                <Text style={styles.cardLabel}>IMF Bz</Text>
                <Text style={[styles.headValue, latestBz != null && latestBz < 0 ? { color: Palette.warn } : null]}>
                  {latestBz != null ? latestBz.toFixed(1) : '—'}
                  <Text style={styles.headUnit}> nT</Text>
                </Text>
              </View>
              <LineChart
                values={wind.map((p) => p.bz)}
                color={latestBz != null && latestBz < 0 ? Palette.warn : Palette.good}
                baseline={0}
                height={84}
                labels={windLabels}
                formatValue={(v) => `${v.toFixed(1)} nT`}
              />
              <Text style={styles.dim}>Below the dashed line (Bz &lt; 0) is what powers the aurora.</Text>
            </Glass>

            <Text style={styles.note}>Live data · NOAA SWPC · pull to refresh</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtTime(iso: string): string {
  // NOAA time_tags are naive UTC — append Z so they aren't read as device-local.
  const d = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${hh}:${mm}`;
}

function computeTrend(observed: KpReading[]): { label: string; icon: any; color: string } {
  if (observed.length < 4) return { label: 'Steady', icon: 'remove', color: Palette.text };
  const recent = observed.slice(-3).reduce((s, r) => s + r.kp, 0) / 3;
  const prior = observed.slice(-6, -3).reduce((s, r) => s + r.kp, 0) / 3;
  const diff = recent - prior;
  if (diff > 0.5) return { label: 'Rising', icon: 'trending-up', color: '#FF9F43' };
  if (diff < -0.5) return { label: 'Easing', icon: 'trending-down', color: Palette.good };
  return { label: 'Steady', icon: 'remove', color: Palette.text };
}

function computeOutlook(forecast: Forecast | null): { value: string; caption: string; color: string } {
  if (!forecast || forecast.days.length === 0)
    return { value: '—', caption: 'outlook', color: Palette.textDim };
  let best = forecast.days[0];
  for (const d of forecast.days) if (d.maxKp > best.maxKp) best = d;
  const s = kpScale(best.maxKp);
  if (best.maxKp >= 5) return { value: 'Storm', caption: `likely ${best.label}`, color: s.color };
  if (best.maxKp >= 4) return { value: 'Active', caption: `${best.label}`, color: s.color };
  return { value: 'Quiet', caption: 'next 3 nights', color: s.color };
}

function Insight({ icon, color, value, caption }: { icon: any; color: string; value: string; caption: string }) {
  return (
    <Glass style={styles.insight}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.insightValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.insightCaption} numberOfLines={1}>{caption}</Text>
    </Glass>
  );
}

function Legend({ dotColor, dashColor, text }: { dotColor?: string; dashColor?: string; text: string }) {
  return (
    <View style={styles.legend}>
      {dotColor ? <View style={[styles.legendDot, { backgroundColor: dotColor }]} /> : null}
      {dashColor ? <View style={[styles.legendDash, { backgroundColor: dashColor }]} /> : null}
      <Text style={styles.legendText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 16, gap: 14, paddingTop: 8, paddingBottom: 130 },
  center: { paddingVertical: 60, alignItems: 'center' },
  segmented: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 4 },
  segment: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  segmentActive: { backgroundColor: Palette.accent },
  segmentText: { color: Palette.textDim, fontFamily: Fonts.semibold, fontSize: 14 },
  segmentTextActive: { color: '#fff' },
  insights: { flexDirection: 'row', gap: 10 },
  insight: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6 },
  insightValue: { fontSize: 17, fontFamily: Fonts.bold },
  insightCaption: { color: Palette.textFaint, fontSize: 11, fontFamily: Fonts.regular },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardLabel: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  headValue: { color: Palette.text, fontSize: 19, fontFamily: Fonts.bold },
  headUnit: { color: Palette.textFaint, fontSize: 13, fontFamily: Fonts.medium },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendDash: { width: 12, height: 2 },
  legendText: { color: Palette.textFaint, fontSize: 11, fontFamily: Fonts.regular },
  scrubHint: { color: Palette.textFaint, fontSize: 11, fontFamily: Fonts.regular },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular, marginTop: 10 },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4 },
});
