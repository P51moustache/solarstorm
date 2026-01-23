import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { calculateAuroraProbability } from '@/lib/services/auroraProbability';
import { getPhotoConditions, getWeatherData, type WeatherData } from '@/lib/services/weather';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';

export function PhotoPlanning() {
  const { currentLocation } = useLocationStore();
  const { kp, bz, speed } = useSolarStormStore();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentLocation) return;

    setIsLoading(true);
    getWeatherData(currentLocation.lat, currentLocation.lng)
      .then(setWeather)
      .finally(() => setIsLoading(false));
  }, [currentLocation]);

  const auroraProbability = React.useMemo(() => {
    if (!currentLocation || kp === null || bz === null || speed === null) return 0;

    const prediction = calculateAuroraProbability(
      currentLocation.lat,
      currentLocation.lng,
      kp,
      bz,
      speed
    );
    return prediction.probability;
  }, [currentLocation, kp, bz, speed]);

  const conditions = React.useMemo(() => {
    if (!weather) return null;
    return getPhotoConditions(weather, auroraProbability);
  }, [weather, auroraProbability]);

  const getStatusColor = (status: 'good' | 'fair' | 'poor') => {
    switch (status) {
      case 'good': return '#22c55e';
      case 'fair': return '#eab308';
      case 'poor': return '#ef4444';
    }
  };

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'fair': return '#eab308';
      default: return '#ef4444';
    }
  };

  return (
    <FeatureGate feature="photoPlanning">
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="camera-outline" size={20} color={COLORS.emerald} />
            <Text style={styles.title}>Photo Planning</Text>
          </View>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {!currentLocation && (
          <Text style={styles.noLocation}>Enable location for photo planning</Text>
        )}

        {conditions && (
          <>
            <View style={[styles.overallBadge, { backgroundColor: getOverallColor(conditions.overall) + '20' }]}>
              <Text style={[styles.overallText, { color: getOverallColor(conditions.overall) }]}>
                {conditions.overall.charAt(0).toUpperCase() + conditions.overall.slice(1)} Conditions
              </Text>
            </View>

            <View style={styles.factors}>
              {conditions.factors.map((factor) => (
                <View key={factor.label} style={styles.factor}>
                  <View style={[styles.factorDot, { backgroundColor: getStatusColor(factor.status) }]} />
                  <View style={styles.factorContent}>
                    <Text style={styles.factorLabel}>{factor.label}</Text>
                    <Text style={styles.factorNote}>{factor.note}</Text>
                  </View>
                </View>
              ))}
            </View>

            {weather && (
              <View style={styles.timing}>
                <Text style={styles.timingLabel}>Best shooting window:</Text>
                <Text style={styles.timingValue}>
                  {weather.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {weather.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  noLocation: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  overallBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
  },
  overallText: {
    fontSize: 14,
    fontWeight: '600',
  },
  factors: {
    gap: 12,
  },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  factorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  factorContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  factorNote: {
    fontSize: 13,
    color: COLORS.muted,
  },
  timing: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timingLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  timingValue: {
    fontSize: 13,
    color: COLORS.emerald,
    fontWeight: '500',
  },
});
