import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchasesPackage } from 'react-native-purchases';
import { useAuth } from '../state/useAuth';
import { theme } from '../lib/theme';
import { getOfferingPackages, purchasePackage, restorePurchases } from '../lib/purchases';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

const BENEFITS = [
  'Unlimited custom event alerts',
  'Push notifications the moment conditions hit',
  'Full trend history',
  'Data export',
];

type Plan = 'annual' | 'monthly';

export function PaywallScreen({ navigation }: Props) {
  const { setTier } = useAuth();
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [selected, setSelected] = useState<Plan>('annual');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const pkgs = await getOfferingPackages();
      setMonthly(pkgs.monthly);
      setAnnual(pkgs.annual);
      // Default to whichever plan is actually available, preferring annual.
      setSelected(pkgs.annual ? 'annual' : 'monthly');
      setLoading(false);
    })();
  }, []);

  const selectedPackage = selected === 'annual' ? annual : monthly;

  const grantAndClose = (active: boolean) => {
    if (active) {
      setTier('subscribed');
      navigation.goBack();
    }
  };

  const onSubscribe = async () => {
    if (!selectedPackage) {
      Alert.alert('Subscription', 'This plan is not available right now.');
      return;
    }
    setBusy(true);
    try {
      grantAndClose(await purchasePackage(selectedPackage));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed.';
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
      if (active) grantAndClose(true);
      else Alert.alert('Restore', 'No active subscription found for this Apple ID.');
    } finally {
      setBusy(false);
    }
  };

  const monthlyPrice = monthly?.product.priceString ?? '$4.99';
  const annualPrice = annual?.product.priceString ?? '$39.99';

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

      <PlanOption
        label="Annual"
        price={`${annualPrice}/year`}
        hint="Best value"
        active={selected === 'annual'}
        disabled={loading}
        onPress={() => setSelected('annual')}
      />
      <PlanOption
        label="Monthly"
        price={`${monthlyPrice}/month`}
        active={selected === 'monthly'}
        disabled={loading}
        onPress={() => setSelected('monthly')}
      />

      <Text style={styles.fine}>
        7-day free trial, then your selected plan. Auto-renews until cancelled; manage or cancel anytime in the
        App Store.
      </Text>

      <TouchableOpacity style={styles.button} onPress={onSubscribe} disabled={busy || loading}>
        {busy ? <ActivityIndicator color={theme.bg} /> : <Text style={styles.buttonText}>Start free trial</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={onRestore} disabled={busy}>
        <Text style={styles.restore}>Restore purchases</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PlanOption({
  label,
  price,
  hint,
  active,
  disabled,
  onPress,
}: {
  label: string;
  price: string;
  hint?: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.plan, active && styles.planActive]}
      onPress={onPress}
      disabled={disabled}
    >
      <View>
        <Text style={styles.planLabel}>{label}</Text>
        {hint ? <Text style={styles.planHint}>{hint}</Text> : null}
      </View>
      <Text style={[styles.planPrice, active && styles.planPriceActive]}>{price}</Text>
    </TouchableOpacity>
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
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  planActive: { borderColor: theme.emerald, borderWidth: 2 },
  planLabel: { color: theme.text, fontSize: 16, fontWeight: '700' },
  planHint: { color: theme.emerald, fontSize: 12, marginTop: 2 },
  planPrice: { color: theme.muted, fontSize: 16, fontWeight: '600' },
  planPriceActive: { color: theme.text },
  fine: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 16, lineHeight: 16 },
  button: { backgroundColor: theme.emerald, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  buttonText: { color: theme.bg, fontWeight: '700', fontSize: 16 },
  restore: { color: theme.emerald, textAlign: 'center', marginTop: 18 },
});
