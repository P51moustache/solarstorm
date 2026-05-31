import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';
import type { AlertRule } from '../lib/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Rules'>;

const COMPARATOR_LABEL: Record<string, string> = { gte: '≥', lte: '≤' };

export function RulesScreen({ navigation }: Props) {
  const [rules, setRules] = useState<AlertRule[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('alert_rules')
      .select('*')
      .order('is_preset', { ascending: false })
      .order('created_at', { ascending: true });
    setRules((data as AlertRule[]) ?? []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (rule: AlertRule) => {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    await supabase.from('alert_rules').update({ enabled: !rule.enabled }).eq('id', rule.id);
  };

  const remove = (rule: AlertRule) => {
    Alert.alert('Delete alert', `Remove "${rule.label ?? rule.metric_key}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('alert_rules').delete().eq('id', rule.id);
          load();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No alerts yet. Tap + to create one.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('RuleEdit', { ruleId: item.id })}
            onLongPress={() => remove(item)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleLabel}>{item.label ?? item.metric_key}</Text>
              <Text style={styles.ruleDetail}>
                {item.metric_key} {COMPARATOR_LABEL[item.comparator]} {item.threshold}
                {item.sustain_min > 0 ? ` for ${item.sustain_min}m` : ''}
                {item.is_preset ? '  · preset' : ''}
              </Text>
            </View>
            <Switch
              value={item.enabled}
              onValueChange={() => toggle(item)}
              trackColor={{ true: theme.emerald, false: theme.border }}
            />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('RuleEdit')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  ruleLabel: { color: theme.text, fontWeight: '700', fontSize: 16 },
  ruleDetail: { color: theme.muted, marginTop: 4 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.emerald,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: theme.bg, fontSize: 30, fontWeight: '700', marginTop: -2 },
});
