import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { calculateAuroraProbability } from '@/lib/services/auroraProbability';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { COLORS } from '@/lib/util/colors';
import { PredictionCard } from './PredictionCard';

export function LocationPrediction() {
  const { kp, bz, speed } = useSolarStormStore();
  const {
    currentLocation,
    savedLocations,
    primaryLocation,
    isLoading,
    fetchCurrentLocation,
    fetchSavedLocations,
  } = useLocationStore();

  useEffect(() => {
    fetchCurrentLocation();
    fetchSavedLocations();
  }, [fetchCurrentLocation, fetchSavedLocations]);

  // Calculate prediction for current location
  const currentPrediction = useMemo(() => {
    if (!currentLocation || kp === null || bz === null || speed === null) return null;

    return calculateAuroraProbability(
      currentLocation.lat,
      currentLocation.lng,
      kp,
      bz,
      speed
    );
  }, [currentLocation, kp, bz, speed]);

  // Calculate predictions for saved locations
  const savedPredictions = useMemo(() => {
    if (kp === null || bz === null || speed === null) return [];

    return savedLocations.slice(0, 5).map((loc) => ({
      location: loc,
      prediction: calculateAuroraProbability(loc.lat, loc.lng, kp, bz, speed),
    }));
  }, [savedLocations, kp, bz, speed]);

  // Find primary location prediction
  const primaryPrediction = useMemo(() => {
    if (!primaryLocation) return null;
    return savedPredictions.find((p) => p.location.id === primaryLocation.id);
  }, [primaryLocation, savedPredictions]);

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Location Predictions</Text>
          <Pressable onPress={fetchCurrentLocation} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.emerald} />
            ) : (
              <Ionicons name="refresh" size={20} color={COLORS.emerald} />
            )}
          </Pressable>
        </View>

        {/* Current location */}
        {currentPrediction && (
          <PredictionCard
            label="Current Location"
            probability={currentPrediction.probability}
            description={currentPrediction.description}
            bestTime={currentPrediction.bestViewingTime}
          />
        )}

        {/* Primary saved location */}
        {primaryPrediction && (
          <PredictionCard
            label={primaryLocation!.label}
            probability={primaryPrediction.prediction.probability}
            description={primaryPrediction.prediction.description}
            bestTime={primaryPrediction.prediction.bestViewingTime}
          />
        )}

        {/* Other saved locations */}
        {savedPredictions
          .filter((p) => p.location.id !== primaryLocation?.id)
          .slice(0, 3)
          .map((item) => (
            <PredictionCard
              key={item.location.id}
              label={item.location.label}
              probability={item.prediction.probability}
              description={item.prediction.description}
              bestTime={item.prediction.bestViewingTime}
            />
          ))}

        {!currentLocation && !isLoading && savedLocations.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={32} color={COLORS.muted} />
            <Text style={styles.emptyText}>
              Enable location access or add saved locations to see predictions
            </Text>
          </View>
        )}
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  empty: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
});
