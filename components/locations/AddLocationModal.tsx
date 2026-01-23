import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { COLORS } from '@/lib/util/colors';

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddLocationModal({ visible, onClose }: AddLocationModalProps) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addLocation, currentLocation } = useLocationStore();

  const resetForm = () => {
    setLabel('');
    setLat('');
    setLng('');
    setIsPrimary(false);
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setLat(currentLocation.lat.toFixed(6));
      setLng(currentLocation.lng.toFixed(6));
    }
  };

  const handleSubmit = async () => {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!label.trim() || isNaN(latNum) || isNaN(lngNum)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addLocation(label.trim(), latNum, lngNum, isPrimary);
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid =
    label.trim().length > 0 &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lng)) &&
    parseFloat(lat) >= -90 &&
    parseFloat(lat) <= 90 &&
    parseFloat(lng) >= -180 &&
    parseFloat(lng) <= 180;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Location</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Location Name</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g., Home, Cabin, Favorite Spot"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                placeholder="-90 to 90"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={lng}
                onChangeText={setLng}
                placeholder="-180 to 180"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {currentLocation && (
            <TouchableOpacity
              style={styles.useCurrentButton}
              onPress={handleUseCurrentLocation}
            >
              <Ionicons name="locate" size={18} color={COLORS.emerald} />
              <Text style={styles.useCurrentText}>Use Current Location</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.primaryToggle}
            onPress={() => setIsPrimary(!isPrimary)}
          >
            <Ionicons
              name={isPrimary ? 'checkbox' : 'square-outline'}
              size={24}
              color={isPrimary ? COLORS.emerald : COLORS.muted}
            />
            <Text style={styles.primaryText}>Set as primary location</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.bg} />
            ) : (
              <Text style={styles.submitText}>Save Location</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  form: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: 'row',
  },
  useCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  useCurrentText: {
    fontSize: 14,
    color: COLORS.emerald,
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  primaryText: {
    fontSize: 14,
    color: COLORS.text,
  },
  submitButton: {
    backgroundColor: COLORS.emerald,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.bg,
  },
});
