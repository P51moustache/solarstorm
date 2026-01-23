import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Hero() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Ionicons name="flash" size={14} color="#00D084" />
        <Text style={styles.badgeText}>Space Weather Intelligence</Text>
      </View>

      <Text style={styles.title}>
        Know Before{'\n'}the Storm Hits
      </Text>

      <Text style={styles.subtitle}>
        Protect million-dollar satellites, power grids, and critical infrastructure
        with real-time space weather forecasting and decision-ready alerts.
      </Text>

      <View style={styles.buttons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.primaryButtonText}>Start Free</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/pricing')}
        >
          <Text style={styles.secondaryButtonText}>View Pricing</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>40+</Text>
          <Text style={styles.statLabel}>Satellites lost in 2022 storm</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>$5-10M</Text>
          <Text style={styles.statLabel}>Per satellite replacement</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>30 min</Text>
          <Text style={styles.statLabel}>Advance warning time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
    gap: 6,
  },
  badgeText: {
    color: '#00D084',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 48,
    fontWeight: '700',
    color: '#E6ECFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 56,
  },
  subtitle: {
    fontSize: 18,
    color: '#9AA4C2',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 28,
    marginBottom: 32,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 48,
  },
  primaryButton: {
    backgroundColor: '#00D084',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#0B1020',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1E2347',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#E6ECFF',
    fontSize: 16,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    gap: 48,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00D084',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#9AA4C2',
    textAlign: 'center',
  },
});
