import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LearnMore } from '@/components/explainer';
import { Glass, ScreenTitle } from '@/components/ui-kit';
import { flareColor, Fonts, noaaScaleColor, Palette, relativeTime } from '@/constants/solar';
import {
  Flare,
  getLatestFlare,
  getScales,
  getSpaceAlerts,
  Scales,
  SpaceAlert,
} from '@/lib/spaceWeather';

const SCALE_DEFS = [
  { key: 'R', name: 'Radio Blackout', pick: (s: Scales) => s.R },
  { key: 'S', name: 'Radiation', pick: (s: Scales) => s.S },
  { key: 'G', name: 'Geomagnetic', pick: (s: Scales) => s.G },
] as const;

export default function ActivityScreen() {
  const [scales, setScales] = useState<Scales | null>(null);
  const [flare, setFlare] = useState<Flare | null>(null);
  const [alerts, setAlerts] = useState<SpaceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [s, f, a] = await Promise.all([getScales(), getLatestFlare(), getSpaceAlerts()]);
    setScales(s);
    setFlare(f);
    setAlerts(a);
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Palette.textDim} />
        }>
        <ScreenTitle title="Activity" subtitle="Flares, radiation & operational hazards" />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Palette.accent} />
          </View>
        ) : (
          <>
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

            <Text style={styles.note}>Source: NOAA SWPC · GOES X-ray · pull to refresh</Text>
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
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardLabel: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeader: { color: Palette.text, fontSize: 18, fontFamily: Fonts.bold },
  scaleRow: { flexDirection: 'row', gap: 10 },
  scaleBlock: { flex: 1, alignItems: 'center', gap: 3 },
  scaleVal: { fontSize: 34, fontFamily: Fonts.bold, letterSpacing: -1 },
  scaleName: { color: Palette.textDim, fontSize: 12, fontFamily: Fonts.medium },
  scaleText: { fontSize: 12, fontFamily: Fonts.semibold },
  flareRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  flareClass: { fontSize: 44, fontFamily: Fonts.bold, letterSpacing: -1.5 },
  flareSub: { color: Palette.textFaint, fontSize: 14, fontFamily: Fonts.medium },
  alertCard: { paddingVertical: 14 },
  alertTitle: { color: Palette.text, fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20, marginBottom: 4 },
  dim: { color: Palette.textDim, fontSize: 13, fontFamily: Fonts.regular },
  note: { color: Palette.textFaint, fontSize: 12, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 4 },
});
