import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { COLORS } from '@/lib/util/colors';

interface AddRegionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (region: {
    label: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    is_primary: boolean;
  }) => void;
}

export function AddRegionModal({ visible, onClose, onAdd }: AddRegionModalProps) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('500');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleAdd = () => {
    if (!label || !lat || !lng) return;

    onAdd({
      label,
      center_lat: parseFloat(lat),
      center_lng: parseFloat(lng),
      radius_km: parseFloat(radius) || 500,
      is_primary: isPrimary,
    });

    setLabel('');
    setLat('');
    setLng('');
    setRadius('500');
    setIsPrimary(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add GNSS Region</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Region Name *</Text>
              <TextInput
                style={styles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="e.g., Denver Metro"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Latitude *</Text>
                <TextInput
                  style={styles.input}
                  value={lat}
                  onChangeText={setLat}
                  placeholder="39.7392"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Longitude *</Text>
                <TextInput
                  style={styles.input}
                  value={lng}
                  onChangeText={setLng}
                  placeholder="-104.9903"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Radius (km)</Text>
              <TextInput
                style={styles.input}
                value={radius}
                onChangeText={setRadius}
                placeholder="500"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Area to monitor for localized TEC and scintillation
              </Text>
            </View>

            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Primary Region</Text>
                <Text style={styles.hint}>
                  Used for scintillation forecasts
                </Text>
              </View>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: COLORS.border, true: COLORS.emerald + '40' }}
                thumbColor={isPrimary ? COLORS.emerald : COLORS.muted}
              />
            </View>
          </View>

          <Pressable
            style={[styles.addButton, (!label || !lat || !lng) && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!label || !lat || !lng}
          >
            <Text style={styles.addButtonText}>Add Region</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: COLORS.emerald,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
