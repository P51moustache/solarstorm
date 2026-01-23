import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const FEATURES = [
  {
    icon: 'planet-outline' as const,
    title: 'Satellite Protection',
    description: 'Real-time drag risk assessment, safe mode recommendations, and maneuver window planning for LEO/MEO/GEO operations.',
  },
  {
    icon: 'flash-outline' as const,
    title: 'Power Grid Alerts',
    description: 'GIC risk maps and transformer protection alerts to prevent cascading blackouts during geomagnetic storms.',
  },
  {
    icon: 'airplane-outline' as const,
    title: 'Aviation Safety',
    description: 'Polar route HF blackout forecasts and radiation dose estimates for flight operations.',
  },
  {
    icon: 'location-outline' as const,
    title: 'Location Predictions',
    description: 'Personalized aurora forecasts based on your coordinates, magnetic latitude, and current conditions.',
  },
  {
    icon: 'radio-outline' as const,
    title: 'HF Propagation',
    description: 'Band-by-band usability forecasts for amateur radio operators and emergency communications.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Smart Alerts',
    description: 'Customizable thresholds, quiet hours, and multi-channel notifications (email, push, webhook).',
  },
];

export function Features() {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Built for Mission-Critical Operations</Text>
      <Text style={styles.sectionSubtitle}>
        From hobbyist aurora chasers to satellite fleet operators, SolarStorm delivers
        decision-ready intelligence tailored to your needs.
      </Text>

      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <View key={feature.title} style={styles.card}>
            <View style={styles.iconContainer}>
              <Ionicons name={feature.icon} size={24} color="#00D084" />
            </View>
            <Text style={styles.cardTitle}>{feature.title}</Text>
            <Text style={styles.cardDescription}>{feature.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 64,
    backgroundColor: '#111833',
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
    maxWidth: 600,
    alignSelf: 'center',
    marginBottom: 48,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#0B1020',
    borderRadius: 12,
    padding: 24,
    width: 350,
    borderWidth: 1,
    borderColor: '#1E2347',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 208, 132, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E6ECFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9AA4C2',
    lineHeight: 22,
  },
});
