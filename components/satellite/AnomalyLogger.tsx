import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { AnomalyType, AnomalySeverity } from '@/lib/supabase/types';
import { COLORS } from '@/lib/util/colors';

interface AnomalyLoggerProps {
  visible: boolean;
  satelliteId: string;
  satelliteName: string;
  onClose: () => void;
  onLog: (anomaly: {
    satellite_id: string;
    anomaly_type: AnomalyType;
    severity: AnomalySeverity;
    description: string | null;
    occurred_at: string;
  }) => void;
}

const ANOMALY_TYPES: { value: AnomalyType; label: string; icon: string }[] = [
  { value: 'safe_mode', label: 'Safe Mode', icon: 'shield-checkmark' },
  { value: 'reboot', label: 'Reboot', icon: 'refresh' },
  { value: 'sensor_error', label: 'Sensor Error', icon: 'thermometer' },
  { value: 'comm_loss', label: 'Comm Loss', icon: 'radio' },
  { value: 'attitude_error', label: 'Attitude Error', icon: 'compass' },
  { value: 'power_anomaly', label: 'Power Anomaly', icon: 'battery-half' },
  { value: 'other', label: 'Other', icon: 'alert-circle' },
];

const SEVERITIES: { value: AnomalySeverity; label: string; color: string }[] = [
  { value: 'minor', label: 'Minor', color: '#22c55e' },
  { value: 'moderate', label: 'Moderate', color: '#fbbf24' },
  { value: 'severe', label: 'Severe', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

export function AnomalyLogger({
  visible,
  satelliteId,
  satelliteName,
  onClose,
  onLog,
}: AnomalyLoggerProps) {
  const [type, setType] = useState<AnomalyType>('safe_mode');
  const [severity, setSeverity] = useState<AnomalySeverity>('moderate');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));

  const handleLog = () => {
    onLog({
      satellite_id: satelliteId,
      anomaly_type: type,
      severity,
      description: description || null,
      occurred_at: new Date(occurredAt).toISOString(),
    });

    // Reset
    setType('safe_mode');
    setSeverity('moderate');
    setDescription('');
    setOccurredAt(new Date().toISOString().slice(0, 16));
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Log Anomaly</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>

          <Text style={styles.satelliteName}>{satelliteName}</Text>

          <ScrollView style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Anomaly Type</Text>
              <View style={styles.typeGrid}>
                {ANOMALY_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    style={[styles.typeButton, type === t.value && styles.typeButtonActive]}
                    onPress={() => setType(t.value)}
                  >
                    <Ionicons
                      name={t.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={type === t.value ? COLORS.emerald : COLORS.muted}
                    />
                    <Text
                      style={[styles.typeText, type === t.value && styles.typeTextActive]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Severity</Text>
              <View style={styles.severityRow}>
                {SEVERITIES.map((s) => (
                  <Pressable
                    key={s.value}
                    style={[
                      styles.severityButton,
                      severity === s.value && { backgroundColor: s.color + '20', borderColor: s.color },
                    ]}
                    onPress={() => setSeverity(s.value)}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        severity === s.value && { color: s.color },
                      ]}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>When did this occur?</Text>
              <TextInput
                style={styles.input}
                value={occurredAt}
                onChangeText={setOccurredAt}
                placeholder="YYYY-MM-DDTHH:MM"
                placeholderTextColor={COLORS.muted}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What happened? Any telemetry notes?"
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={COLORS.emerald} />
              <Text style={styles.infoText}>
                Space weather conditions at the time of the anomaly will be automatically recorded for correlation analysis.
              </Text>
            </View>
          </ScrollView>

          <Pressable style={styles.logButton} onPress={handleLog}>
            <Text style={styles.logButtonText}>Log Anomaly</Text>
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
  satelliteName: {
    fontSize: 14,
    color: COLORS.muted,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  form: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.emerald + '20',
    borderColor: COLORS.emerald,
  },
  typeText: {
    fontSize: 13,
    color: COLORS.muted,
  },
  typeTextActive: {
    color: COLORS.emerald,
    fontWeight: '500',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  severityText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.muted,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: COLORS.emerald + '10',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.emerald,
    lineHeight: 18,
  },
  logButton: {
    backgroundColor: COLORS.emerald,
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
