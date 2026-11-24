import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Bar, BarChart, LineChart } from '@/components/charts';
import { LearnMore } from '@/components/explainer';
import { Glass, ScreenTitle, SectionLabel, Tappable } from '@/components/ui';
import { kpScale, relativeTime } from '@/constants/solar';
import {
  Forecast,
  getForecast,
  getKpSeries,
  getSolarWindHistory,
  KpReading,
  Range,
  SolarWindPoint,
} from '@/lib/spaceWeather';
import { colors, fontSize, fonts, iconSize, layout, radii, space, textStyles } from '@/theme';

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

  // Every series covers its full published window; the range only filters what is drawn.
  const load = useCallback(async () => {
    const [kp, fc, sw] = await Promise.all([
      getKpSeries(),
      getForecast().catch(() => null),
      getSolarWindHistory(),
    ]);
    setKpHist(kp);
    setForecast(fc);
    setWind(sw);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />
        }>
        <ScreenTitle title="Trends" subtitle="Where the storm has been — and where it's headed" />

        {/* Range selector */}
        <View style={styles.segmented}>
          {RANGES.map((r) => (
            <Tappable
              key={r.key}
              onPress={() => setRange(r.key)}
              feedback="none"
              style={[styles.segment, range === r.key && styles.segmentActive]}>
              <Text style={[styles.segmentText, range === r.key && styles.segmentTextActive]}>{r.label}</Text>
            </Tappable>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} />
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
                <SectionLabel>Kp · history & forecast</SectionLabel>
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
                <Legend dotColor={colors.text} text="observed" />
                <Legend dotColor={colors.textFaint} text="forecast" />
                <Legend dashColor={colors.danger} text="storm (Kp 5)" />
                <Text style={styles.scrubHint}>· touch & drag to inspect</Text>
              </View>
            </Glass>

            {/* Solar wind speed */}
            <Glass>
              <View style={styles.cardHead}>
                <SectionLabel>Solar wind · 24h</SectionLabel>
                <Text style={styles.headValue}>
                  {latestSpeed != null ? Math.round(latestSpeed) : '—'}
                  <Text style={styles.headUnit}> km/s</Text>
                </Text>
              </View>
              <LineChart
                values={wind.map((p) => p.speed)}
                color={colors.accent}
                height={84}
                labels={windLabels}
                formatValue={(v) => `${Math.round(v)} km/s`}
              />
              <LearnMore term="speed" label="why it matters" />
            </Glass>

            {/* Bz */}
            <Glass>
              <View style={styles.cardHead}>
                <SectionLabel>IMF Bz · 24h</SectionLabel>
                <Text style={[styles.headValue, latestBz != null && latestBz < 0 ? { color: colors.warn } : null]}>
                  {latestBz != null ? latestBz.toFixed(1) : '—'}
                  <Text style={styles.headUnit}> nT</Text>
                </Text>
              </View>
              <LineChart
                values={wind.map((p) => p.bz)}
                color={latestBz != null && latestBz < 0 ? colors.warn : colors.good}
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
  if (observed.length < 4) return { label: 'Steady', icon: 'remove', color: colors.text };
  const recent = observed.slice(-3).reduce((s, r) => s + r.kp, 0) / 3;
  const prior = observed.slice(-6, -3).reduce((s, r) => s + r.kp, 0) / 3;
  const diff = recent - prior;
  if (diff > 0.5) return { label: 'Rising', icon: 'trending-up', color: colors.severity.moderate };
  if (diff < -0.5) return { label: 'Easing', icon: 'trending-down', color: colors.good };
  return { label: 'Steady', icon: 'remove', color: colors.text };
}

function computeOutlook(forecast: Forecast | null): { value: string; caption: string; color: string } {
  if (!forecast || forecast.days.length === 0)
    return { value: '—', caption: 'outlook', color: colors.textMuted };
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
      <Ionicons name={icon} size={iconSize.lg} color={color} />
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

/** Legend dash length: a mark that mirrors the dashed threshold line in the chart. */
const LEGEND_DASH_WIDTH = space[3];
const LEGEND_DASH_HEIGHT = space[0.5];
const LEGEND_DOT_SIZE = 9;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: layout.screenPadding, paddingTop: space[2], paddingBottom: layout.tabBarClearance, gap: space[3.5] },
  center: { paddingVertical: layout.emptyStatePadding, alignItems: 'center' },
  segmented: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: radii.md, padding: space[1] },
  segment: { flex: 1, paddingVertical: space[2], alignItems: 'center', borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.accent },
  segmentText: { color: colors.textMuted, fontFamily: fonts.semibold, fontSize: fontSize.subhead },
  segmentTextActive: { color: colors.onAccent },
  insights: { flexDirection: 'row', gap: space[2.5] },
  insight: { flex: 1, alignItems: 'center', gap: space[1], paddingVertical: space[3.5], paddingHorizontal: space[1.5] },
  insightValue: { ...textStyles.cardTitle },
  insightCaption: { ...textStyles.micro, color: colors.textFaint },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2.5] },
  headValue: { color: colors.text, fontSize: fontSize.title4, fontFamily: fonts.bold },
  headUnit: { ...textStyles.footnoteStrong, color: colors.textFaint },
  legendRow: { flexDirection: 'row', gap: space[4], marginTop: space[3], flexWrap: 'wrap' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  legendDot: { width: LEGEND_DOT_SIZE, height: LEGEND_DOT_SIZE, borderRadius: radii.pill },
  legendDash: { width: LEGEND_DASH_WIDTH, height: LEGEND_DASH_HEIGHT },
  legendText: { ...textStyles.micro, color: colors.textFaint },
  scrubHint: { ...textStyles.micro, color: colors.textFaint },
  dim: { ...textStyles.footnote, color: colors.textMuted, marginTop: space[2.5] },
  note: { ...textStyles.caption, color: colors.textFaint, textAlign: 'center', marginTop: space[1] },
});
