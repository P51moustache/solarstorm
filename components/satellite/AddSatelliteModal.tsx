import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { OrbitType } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AddSatelliteModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (satellite: {
    name: string;
    norad_id: number | null;
    altitude_km: number;
    inclination_deg: number;
    ballistic_coefficient: number | null;
    orbit_type: OrbitType;
    is_orbit_raising: boolean;
    launch_date: string | null;
    notes: string | null;
    org_id: null;
  }) => void;
}

const ORBIT_TYPES: OrbitType[] = ['LEO', 'MEO', 'GEO', 'HEO'];

export function AddSatelliteModal({ visible, onClose, onAdd }: AddSatelliteModalProps) {
  const [name, setName] = useState('');
  const [noradId, setNoradId] = useState('');
  const [altitude, setAltitude] = useState('');
  const [inclination, setInclination] = useState('');
  const [ballisticCoeff, setBallisticCoeff] = useState('');
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [isOrbitRaising, setIsOrbitRaising] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!name || !altitude || !inclination) return;

    onAdd({
      name,
      norad_id: noradId ? parseInt(noradId) : null,
      altitude_km: parseFloat(altitude),
      inclination_deg: parseFloat(inclination),
      ballistic_coefficient: ballisticCoeff ? parseFloat(ballisticCoeff) : null,
      orbit_type: orbitType,
      is_orbit_raising: isOrbitRaising,
      launch_date: null,
      notes: notes || null,
      org_id: null,
    });

    // Reset form
    setName('');
    setNoradId('');
    setAltitude('');
    setInclination('');
    setBallisticCoeff('');
    setOrbitType('LEO');
    setIsOrbitRaising(false);
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Add Satellite</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Starlink-1234"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>NORAD ID (optional)</Text>
              <TextInput
                style={styles.input}
                value={noradId}
                onChangeText={setNoradId}
                placeholder="e.g., 48274"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Altitude (km) *</Text>
                <TextInput
                  style={styles.input}
                  value={altitude}
                  onChangeText={setAltitude}
                  placeholder="550"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Inclination (°) *</Text>
                <TextInput
                  style={styles.input}
                  value={inclination}
                  onChangeText={setInclination}
                  placeholder="53"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ballistic Coefficient (kg/m²)</Text>
              <TextInput
                style={styles.input}
                value={ballisticCoeff}
                onChangeText={setBallisticCoeff}
                placeholder="e.g., 50"
                placeholderTextColor={COLORS.muted}
                keyboardType="numeric"
              />
              <Text style={styles.hint}>
                Used for drag calculations. Lower = more drag.
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Orbit Type</Text>
              <View style={styles.orbitButtons}>
                {ORBIT_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.orbitButton,
                      orbitType === type && styles.orbitButtonActive,
                    ]}
                    onPress={() => setOrbitType(type)}
                  >
                    <Text
                      style={[
                        styles.orbitButtonText,
                        orbitType === type && styles.orbitButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.switchField}>
              <View>
                <Text style={styles.label}>Orbit Raising Mode</Text>
                <Text style={styles.hint}>
                  Enable for newly launched satellites in orbit-raising phase
                </Text>
              </View>
              <Switch
                value={isOrbitRaising}
                onValueChange={setIsOrbitRaising}
                trackColor={{ false: COLORS.border, true: '#f59e0b40' }}
                thumbColor={isOrbitRaising ? '#f59e0b' : COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Mission notes, configuration, etc."
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <Pressable
            style={[styles.addButton, (!name || !altitude || !inclination) && styles.addButtonDisabled]}
            onPress={handleAdd}
            disabled={!name || !altitude || !inclination}
          >
            <Text style={styles.addButtonText}>Add Satellite</Text>
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
    maxHeight: '90%',
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  orbitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  orbitButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  orbitButtonActive: {
    backgroundColor: COLORS.emerald + '20',
    borderColor: COLORS.emerald,
  },
  orbitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  orbitButtonTextActive: {
    color: COLORS.emerald,
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
