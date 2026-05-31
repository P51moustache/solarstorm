import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../state/useAuth';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { Comparator, EventMetric } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'RuleEdit'>;

export function RuleEditScreen({ navigation, route }: Props) {
  const ruleId = route.params?.ruleId;
  const { session, tier } = useAuth();
  const [metrics, setMetrics] = useState<EventMetric[]>([]);
  const [metricKey, setMetricKey] = useState('kp');
  const [comparator, setComparator] = useState<Comparator>('gte');
  const [threshold, setThreshold] = useState('5');
  const [sustain, setSustain] = useState('0');
  const [cooldown, setCooldown] = useState('90');
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('event_metrics').select('*');
      setMetrics((data as EventMetric[]) ?? []);

      if (ruleId) {
        const { data: rule } = await supabase.from('alert_rules').select('*').eq('id', ruleId).single();
        if (rule) {
          setMetricKey(rule.metric_key);
          setComparator(rule.comparator);
          setThreshold(String(rule.threshold));
          setSustain(String(rule.sustain_min));
          setCooldown(String(rule.cooldown_min));
          setLabel(rule.label ?? '');
          setEnabled(rule.enabled);
        }
      }
    })();
  }, [ruleId]);

  const save = async () => {
    if (!session) return;
    setSaving(true);
    const payload = {
      user_id: session.user.id,
      metric_key: metricKey,
      comparator,
      threshold: Number(threshold) || 0,
      sustain_min: Math.max(0, parseInt(sustain, 10) || 0),
      cooldown_min: Math.max(0, parseInt(cooldown, 10) || 0),
      label: label.trim() || null,
      enabled,
    };
    if (ruleId) {
      await supabase.from('alert_rules').update(payload).eq('id', ruleId);
    } else {
      await supabase.from('alert_rules').insert(payload);
    }
    setSaving(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {tier === 'free' ? (
        <Text style={styles.note}>
          Heads up: on the free plan only preset alerts are delivered. Subscribe to receive custom alerts like this one.
        </Text>
      ) : null}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Aurora watch"
        placeholderTextColor={theme.muted}
        value={label}
        onChangeText={setLabel}
      />

      <Text style={styles.label}>Metric</Text>
      <View style={styles.chips}>
        {metrics.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.chip, metricKey === m.key && styles.chipActive]}
            onPress={() => setMetricKey(m.key)}
          >
            <Text style={[styles.chipText, metricKey === m.key && styles.chipTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Condition</Text>
      <View style={styles.chips}>
        {(['gte', 'lte'] as Comparator[]).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, comparator === c && styles.chipActive]}
            onPress={() => setComparator(c)}
          >
            <Text style={[styles.chipText, comparator === c && styles.chipTextActive]}>
              {c === 'gte' ? 'At or above ≥' : 'At or below ≤'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Threshold</Text>
      <TextInput style={styles.input} keyboardType="numeric" value={threshold} onChangeText={setThreshold} />

      <Text style={styles.label}>Sustain (minutes the condition must hold; 0 = instant)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={sustain} onChangeText={setSustain} />

      <Text style={styles.label}>Cooldown (minutes between repeats)</Text>
      <TextInput style={styles.input} keyboardType="number-pad" value={cooldown} onChangeText={setCooldown} />

      <View style={styles.switchRow}>
        <Text style={styles.label}>Enabled</Text>
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: theme.emerald, false: theme.border }} />
      </View>

      <TouchableOpacity style={styles.button} onPress={save} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save alert'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  note: { color: theme.warn, marginBottom: 16, lineHeight: 18 },
  label: { color: theme.muted, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 12,
    color: theme.text,
    padding: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: theme.emerald, borderColor: theme.emerald },
  chipText: { color: theme.text },
  chipTextActive: { color: theme.bg, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  button: { backgroundColor: theme.emerald, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  buttonText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
});
