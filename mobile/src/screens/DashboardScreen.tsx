import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/useAuth';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { AlertLogEntry, KpReading, SolarWindReading } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function kpScale(kp: number): { label: string; color: string } {
  if (kp >= 7) return { label: 'Severe storm', color: theme.danger };
  if (kp >= 5) return { label: 'Storm', color: theme.warn };
  if (kp >= 4) return { label: 'Active', color: theme.warn };
  return { label: 'Quiet', color: theme.emerald };
}

export function DashboardScreen({ navigation }: Props) {
  const { signOut, tier } = useAuth();
  const [kp, setKp] = useState<KpReading | null>(null);
  const [sw, setSw] = useState<SolarWindReading | null>(null);
  const [log, setLog] = useState<AlertLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [kpRes, swRes, logRes] = await Promise.all([
      supabase.from('kp_history').select('timestamp, value').order('timestamp', { ascending: false }).limit(1),
      supabase
        .from('solar_wind_history')
        .select('timestamp, bz, speed, density')
        .order('timestamp', { ascending: false })
        .limit(1),
      supabase
        .from('alert_log')
        .select('id, rule_id, alert_type, payload, sent_at')
        .order('sent_at', { ascending: false })
        .limit(20),
    ]);
    setKp((kpRes.data?.[0] as KpReading) ?? null);
    setSw((swRes.data?.[0] as SolarWindReading) ?? null);
    setLog((logRes.data as AlertLogEntry[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const scale = kp ? kpScale(kp.value) : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.muted} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>Current conditions</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={styles.link}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.metricLabel}>Kp index</Text>
        <Text style={[styles.metricValue, scale ? { color: scale.color } : null]}>
          {kp ? kp.value.toFixed(1) : '—'}
        </Text>
        {scale ? <Text style={[styles.badge, { color: scale.color }]}>{scale.label}</Text> : null}
      </View>

      <View style={styles.row}>
        <View style={[styles.card, styles.half]}>
          <Text style={styles.metricLabel}>Bz (nT)</Text>
          <Text style={styles.metricValue}>{sw?.bz != null ? sw.bz.toFixed(1) : '—'}</Text>
        </View>
        <View style={[styles.card, styles.half]}>
          <Text style={styles.metricLabel}>Wind (km/s)</Text>
          <Text style={styles.metricValue}>{sw?.speed != null ? Math.round(sw.speed) : '—'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('Rules')}>
        <Text style={styles.ctaText}>Manage my alerts</Text>
      </TouchableOpacity>

      {tier === 'free' ? (
        <Text style={styles.tierNote}>
          Free plan: preset alerts only. Subscribe to create custom alerts, see full trends, and export data.
        </Text>
      ) : null}

      <Text style={[styles.title, { marginTop: 24 }]}>Recent alerts</Text>
      {log.length === 0 ? (
        <Text style={styles.empty}>No alerts yet. When conditions match your rules, they show up here.</Text>
      ) : (
        log.map((entry) => (
          <View key={entry.id} style={styles.logRow}>
            <Text style={styles.logTitle}>
              {(entry.payload?.label as string) ?? entry.alert_type}
            </Text>
            <Text style={styles.logMeta}>{new Date(entry.sent_at).toLocaleString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { color: theme.text, fontSize: 20, fontWeight: '700' },
  link: { color: theme.emerald },
  card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  metricLabel: { color: theme.muted, fontSize: 13 },
  metricValue: { color: theme.text, fontSize: 32, fontWeight: '800', marginTop: 4 },
  badge: { marginTop: 4, fontWeight: '600' },
  cta: { backgroundColor: theme.emerald, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  ctaText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
  tierNote: { color: theme.muted, fontSize: 13, marginTop: 12, lineHeight: 18 },
  empty: { color: theme.muted, marginTop: 8 },
  logRow: { borderBottomColor: theme.border, borderBottomWidth: 1, paddingVertical: 12 },
  logTitle: { color: theme.text, fontWeight: '600' },
  logMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
});
