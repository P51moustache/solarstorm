import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { STRIPE_CONFIG } from '@/lib/stripe/config';

export function Pricing() {
  const router = useRouter();
  const [annual, setAnnual] = useState(true);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
      <Text style={styles.sectionSubtitle}>
        Start free, upgrade when you need more. No hidden fees.
      </Text>

      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleOption, !annual && styles.toggleActive]}
          onPress={() => setAnnual(false)}
        >
          <Text style={[styles.toggleText, !annual && styles.toggleTextActive]}>Monthly</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleOption, annual && styles.toggleActive]}
          onPress={() => setAnnual(true)}
        >
          <Text style={[styles.toggleText, annual && styles.toggleTextActive]}>
            Annual <Text style={styles.discount}>Save 17%</Text>
          </Text>
        </Pressable>
      </View>

      <View style={styles.cards}>
        {/* Free Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Free</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>$0</Text>
            <Text style={styles.period}>/forever</Text>
          </View>
          <Text style={styles.tierDescription}>For curious hobbyists</Text>

          <View style={styles.features}>
            <Feature text="Real-time Kp & solar wind" />
            <Feature text="2D aurora map" />
            <Feature text="1 alert per day" />
            <Feature text="7-day history" />
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.buttonSecondaryText}>Get Started</Text>
          </Pressable>
        </View>

        {/* Plus Tier */}
        <View style={[styles.card, styles.cardHighlighted]}>
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
          <Text style={styles.tierName}>Plus</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${annual ? Math.round(STRIPE_CONFIG.tiers.plus.yearlyPrice / 12) : STRIPE_CONFIG.tiers.plus.monthlyPrice}
            </Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.plus.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.plus.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonPrimary}
            onPress={() => router.push('/signup?plan=plus')}
          >
            <Text style={styles.buttonPrimaryText}>Start Free Trial</Text>
          </Pressable>
        </View>

        {/* Pro Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Pro</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ${annual ? Math.round(STRIPE_CONFIG.tiers.pro.yearlyPrice / 12) : STRIPE_CONFIG.tiers.pro.monthlyPrice}
            </Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.pro.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.pro.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/signup?plan=pro')}
          >
            <Text style={styles.buttonSecondaryText}>Start Free Trial</Text>
          </Pressable>
        </View>

        {/* Enterprise Tier */}
        <View style={styles.card}>
          <Text style={styles.tierName}>Enterprise</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>Custom</Text>
          </View>
          <Text style={styles.tierDescription}>{STRIPE_CONFIG.tiers.enterprise.description}</Text>

          <View style={styles.features}>
            {STRIPE_CONFIG.tiers.enterprise.features.map((f) => (
              <Feature key={f} text={f} />
            ))}
          </View>

          <Pressable
            style={styles.buttonSecondary}
            onPress={() => router.push('/contact')}
          >
            <Text style={styles.buttonSecondaryText}>Contact Sales</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={styles.feature}>
      <Ionicons name="checkmark-circle" size={18} color="#00D084" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#9AA4C2',
    textAlign: 'center',
    marginBottom: 32,
  },
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#111833',
    borderRadius: 8,
    padding: 4,
    marginBottom: 48,
  },
  toggleOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#00D084',
  },
  toggleText: {
    color: '#9AA4C2',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#0B1020',
  },
  discount: {
    color: '#0B1020',
    fontWeight: '700',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#111833',
    borderRadius: 12,
    padding: 24,
    width: 280,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  cardHighlighted: {
    borderColor: '#00D084',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#00D084',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#0B1020',
    fontSize: 12,
    fontWeight: '600',
  },
  tierName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E6ECFF',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '700',
    color: '#E6ECFF',
  },
  period: {
    fontSize: 16,
    color: '#9AA4C2',
    marginLeft: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#9AA4C2',
    marginBottom: 24,
  },
  features: {
    gap: 12,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#E6ECFF',
  },
  buttonPrimary: {
    backgroundColor: '#00D084',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
