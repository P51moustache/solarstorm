import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../state/useAuth';
import { theme } from '../lib/theme';
import { getMonthlyPackage, purchaseMonthly, restorePurchases } from '../lib/purchases';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const BENEFITS = [
  'Unlimited custom event alerts',
  'Push notifications the moment conditions hit',
  'Full trend history',
  'Data export',
];

export function PaywallScreen({ navigation }: Props) {
  const { setTier } = useAuth();
  const [priceString, setPriceString] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const pkg = await getMonthlyPackage();
      setPriceString(pkg?.product.priceString ?? null);
      setLoading(false);
    })();
  }, []);

  const onSubscribe = async () => {
    setBusy(true);
    try {
      const active = await purchaseMonthly();
      if (active) {
        setTier('subscribed');
        navigation.goBack();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed.';
      // RevenueCat throws userCancelled with a flag; treat generic failures only.
      if (!String(message).toLowerCase().includes('cancel')) {
        Alert.alert('Subscription', message);
      }
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setBusy(true);
    try {
      const active = await restorePurchases();
      if (active) {
        setTier('subscribed');
        navigation.goBack();
      } else {
        Alert.alert('Restore', 'No active subscription found for this Apple ID.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>SolarStorm Premium</Text>
      <Text style={styles.subtitle}>Never miss a space-weather event.</Text>

      <View style={styles.card}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.benefit}>{b}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.priceLine}>
        {loading ? 'Loading price…' : `7-day free trial, then ${priceString ?? '$6.99'}/month`}
      </Text>
      <Text style={styles.fine}>Auto-renews monthly until cancelled. Cancel anytime in the App Store.</Text>

      <TouchableOpacity style={styles.button} onPress={onSubscribe} disabled={busy || loading}>
        {busy ? <ActivityIndicator color={theme.bg} /> : <Text style={styles.buttonText}>Start free trial</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={onRestore} disabled={busy}>
        <Text style={styles.restore}>Restore purchases</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  title: { color: theme.text, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: theme.muted, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 16, padding: 20 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  check: { color: theme.emerald, fontWeight: '800', fontSize: 16, marginRight: 12 },
  benefit: { color: theme.text, fontSize: 16, flex: 1 },
  priceLine: { color: theme.text, fontWeight: '700', textAlign: 'center', marginTop: 24, fontSize: 16 },
  fine: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  button: { backgroundColor: theme.emerald, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
  restore: { color: theme.emerald, textAlign: 'center', marginTop: 18 },
});
