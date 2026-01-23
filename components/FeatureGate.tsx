import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTier } from '@/hooks/useAuth';
import { type FeatureKey, getUpgradeTier, hasFeature } from '@/lib/features/tiers';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const tier = useTier();
  const router = useRouter();
  const hasAccess = hasFeature(tier, feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  const upgradeTier = getUpgradeTier(tier, feature);

  return (
    <View style={styles.container}>
      <View style={styles.blur}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.title}>
          {upgradeTier ? `Unlock with ${upgradeTier.charAt(0).toUpperCase() + upgradeTier.slice(1)}` : 'Premium Feature'}
        </Text>
        {upgradeTier && (
          <Pressable
            style={styles.button}
            onPress={() => router.push('/pricing')}
          >
            <Text style={styles.buttonText}>View Plans</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 16, 32, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  title: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#00D084',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#0B1020',
    fontSize: 14,
    fontWeight: '600',
  },
});
