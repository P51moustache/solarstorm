import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { calculateMagneticLatitude } from '@/lib/services/location';
import { COLORS } from '@/lib/util/colors';
import { AddLocationModal } from './AddLocationModal';

export function LocationManager() {
  const [showAddModal, setShowAddModal] = useState(false);
  const {
    savedLocations,
    primaryLocation,
    isLoading,
    fetchSavedLocations,
    fetchCurrentLocation,
    removeLocation,
    setPrimaryLocation,
  } = useLocationStore();

  useEffect(() => {
    fetchSavedLocations();
    fetchCurrentLocation();
  }, [fetchSavedLocations, fetchCurrentLocation]);

  const handleDelete = (id: string, label: string) => {
    Alert.alert(
      'Remove Location',
      `Are you sure you want to remove "${label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeLocation(id),
        },
      ]
    );
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryLocation(id);
  };

  const renderLocation = ({ item }: { item: typeof savedLocations[0] }) => {
    const magLat = calculateMagneticLatitude(item.lat, item.lng);
    const isPrimary = item.id === primaryLocation?.id;

    return (
      <View style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <View style={styles.locationInfo}>
            <View style={styles.labelRow}>
              <Text style={styles.locationLabel}>{item.label}</Text>
              {isPrimary && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
            </View>
            <Text style={styles.coordinates}>
              {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
            </Text>
            <Text style={styles.magneticLat}>
              Magnetic Lat: {magLat.toFixed(1)}°
            </Text>
          </View>
          <View style={styles.actions}>
            {!isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleSetPrimary(item.id)}
              >
                <Ionicons name="star-outline" size={20} color={COLORS.muted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDelete(item.id, item.label)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Saved Locations</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={24} color={COLORS.emerald} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.emerald} />
          </View>
        ) : savedLocations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyText}>No saved locations</Text>
            <Text style={styles.emptySubtext}>
              Add locations to get personalized aurora predictions
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyAddText}>Add Your First Location</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={savedLocations}
            renderItem={renderLocation}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}

        <AddLocationModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      </View>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  emptyAddButton: {
    backgroundColor: COLORS.emerald,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.bg,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  locationCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  primaryBadge: {
    backgroundColor: COLORS.emerald + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.emerald,
  },
  coordinates: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 2,
  },
  magneticLat: {
    fontSize: 12,
    color: COLORS.muted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
});
