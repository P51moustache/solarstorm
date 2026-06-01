import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui-kit';
import { Palette } from '@/constants/solar';
import { useAuth } from '@/lib/auth';
import { purchasePackage, purchasesAvailable, restorePurchases } from '@/lib/purchases';

interface Tier {
  id: string; // RevenueCat package identifier (configured in the dashboard)
  name: string;
  price: string;
  highlight?: boolean;
  features: string[];
}

const TIERS: Tier[] = [
  {
    id: 'plus_monthly',
    name: 'Plus',
    price: '$4.99 / mo',
    features: ['Push storm alerts', 'Unlimited saved locations', 'Full history & trends'],
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: '$9.99 / mo',
    highlight: true,
    features: ['Everything in Plus', 'Bz-confirmed precision alerts', 'Public API access', 'Priority data refresh'],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { refreshTier } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function buy(tier: Tier) {
    setBusy(tier.id);
    setMessage(null);
    const { entitled, error } = await purchasePackage(tier.id);
    setBusy(null);
    if (error) setMessage(error);
    else if (entitled) {
      await refreshTier();
      router.back();
    }
  }

  async function restore() {
    setBusy('restore');
    setMessage(null);
    const { entitled, error } = await restorePurchases();
    setBusy(null);
    if (error) setMessage(error);
    else if (entitled) {
      await refreshTier();
      router.back();
    } else setMessage('No previous purchases found.');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={28} color={Palette.textDim} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Unlock SolarStorm</Text>
        <Text style={styles.subtitle}>
          Never miss an aurora. Push alerts, precision forecasting, and more.
        </Text>

        {TIERS.map((tier) => (
          <Card key={tier.id} style={tier.highlight ? { borderColor: Palette.accent } : undefined}>
            <View style={styles.tierHead}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>{tier.price}</Text>
            </View>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={Palette.good} />
                <Text style={styles.feature}>{f}</Text>
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [
                styles.buyBtn,
                tier.highlight && { backgroundColor: Palette.accent },
                pressed && styles.pressed,
              ]}
              onPress={() => buy(tier)}
              disabled={busy !== null}>
              <Text style={[styles.buyText, tier.highlight && { color: '#fff' }]}>
                {busy === tier.id ? 'Processing…' : `Choose ${tier.name}`}
              </Text>
            </Pressable>
          </Card>
        ))}

        {!purchasesAvailable && (
          <View style={styles.devNotice}>
            <Ionicons name="information-circle" size={18} color={Palette.warn} />
            <Text style={styles.devNoticeText}>
              Purchasing runs through Apple In-App Purchase, which needs a custom dev build —
              it&apos;s disabled in Expo Go. The flow is fully wired and will activate once you
              build with a RevenueCat key.
            </Text>
          </View>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Pressable onPress={restore} style={styles.restore} disabled={busy !== null}>
          <Text style={styles.restoreText}>
            {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          Subscriptions renew automatically until cancelled in your App Store settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Palette.bg },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  content: { padding: 16, gap: 14, paddingBottom: 60 },
  title: { color: Palette.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: Palette.textDim, fontSize: 15, marginBottom: 6 },
  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  tierName: { color: Palette.text, fontSize: 22, fontWeight: '800' },
  tierPrice: { color: Palette.text, fontSize: 17, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  feature: { color: Palette.textDim, fontSize: 15, flexShrink: 1 },
  buyBtn: {
    marginTop: 8,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buyText: { color: Palette.text, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  devNotice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.warn,
    borderRadius: 12,
    padding: 14,
  },
  devNoticeText: { color: Palette.textDim, fontSize: 13, flexShrink: 1, lineHeight: 18 },
  message: { color: Palette.danger, fontSize: 14, textAlign: 'center' },
  restore: { paddingVertical: 14, alignItems: 'center' },
  restoreText: { color: Palette.accent, fontSize: 15, fontWeight: '600' },
  legal: { color: Palette.textFaint, fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
