import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Tappable } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { purchasePackage, purchasesAvailable, restorePurchases } from '@/lib/purchases';
import { colors, iconSize, layout, lineHeight, radii, space, textStyles } from '@/theme';

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
        <Tappable onPress={() => router.back()} hitSlop={space[3]} feedback="none">
          <Ionicons name="close" size={iconSize.xxxl} color={colors.textMuted} />
        </Tappable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Unlock SolarStorm</Text>
        <Text style={styles.subtitle}>
          Never miss an aurora. Push alerts, precision forecasting, and more.
        </Text>

        {TIERS.map((tier) => (
          <Card key={tier.id} style={tier.highlight ? { borderColor: colors.accent } : undefined}>
            <View style={styles.tierHead}>
              <Text style={styles.tierName}>{tier.name}</Text>
              <Text style={styles.tierPrice}>{tier.price}</Text>
            </View>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={iconSize.md} color={colors.good} />
                <Text style={styles.feature}>{f}</Text>
              </View>
            ))}
            <Button
              variant={tier.highlight ? 'primary' : 'secondary'}
              style={styles.buyBtn}
              label={busy === tier.id ? 'Processing…' : `Choose ${tier.name}`}
              onPress={() => buy(tier)}
              disabled={busy !== null}
            />
          </Card>
        ))}

        {!purchasesAvailable && (
          <View style={styles.devNotice}>
            <Ionicons name="information-circle" size={iconSize.md} color={colors.warn} />
            <Text style={styles.devNoticeText}>
              Purchasing runs through Apple In-App Purchase, which needs a custom dev build —
              it&apos;s disabled in Expo Go. The flow is fully wired and will activate once you
              build with a RevenueCat key.
            </Text>
          </View>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button
          variant="link"
          size="compact"
          label={busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
          onPress={restore}
          disabled={busy !== null}
        />

        <Text style={styles.legal}>
          Subscriptions renew automatically until cancelled in your App Store settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: layout.screenPadding, paddingTop: space[2] },
  content: { padding: layout.screenPadding, gap: space[3.5], paddingBottom: layout.modalClearance },
  title: { ...textStyles.screenTitle, color: colors.text },
  subtitle: { ...textStyles.body, color: colors.textMuted, marginBottom: space[1.5] },
  tierHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: space[3] },
  tierName: { ...textStyles.sheetTitle, color: colors.text },
  tierPrice: { ...textStyles.cardTitle, color: colors.text },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[2] },
  feature: { ...textStyles.body, color: colors.textMuted, flexShrink: 1 },
  buyBtn: { marginTop: space[2] },
  devNotice: {
    flexDirection: 'row',
    gap: space[2.5],
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.warn,
    borderRadius: radii.md,
    padding: space[3.5],
  },
  devNoticeText: { ...textStyles.footnote, color: colors.textMuted, flexShrink: 1, lineHeight: lineHeight.footnote },
  message: { ...textStyles.subtitle, color: colors.danger, textAlign: 'center' },
  legal: { ...textStyles.micro, color: colors.textFaint, textAlign: 'center', lineHeight: lineHeight.caption },
});
