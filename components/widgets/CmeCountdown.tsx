import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { FeatureGate } from '@/components/FeatureGate';
import { getCmeCountdown } from '@/lib/api/cme';
import type { CmeCountdownData } from '@/lib/api/parsers/cme';
import { COLORS } from '@/lib/util/colors';

export function CmeCountdown() {
  const [data, setData] = useState<CmeCountdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCmeCountdown()
      .then(setData)
      .finally(() => setIsLoading(false));

    // Refresh every 15 minutes
    const interval = setInterval(() => {
      getCmeCountdown().then(setData);
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (hours: number) => {
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const getUrgencyColor = (hours: number | null) => {
    if (hours === null) return COLORS.muted;
    if (hours < 12) return '#ef4444'; // Imminent
    if (hours < 24) return '#f97316'; // Soon
    if (hours < 48) return '#eab308'; // Approaching
    return '#22c55e'; // Distant
  };

  return (
    <FeatureGate feature="locationPredictions">
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="flash" size={20} color="#f97316" />
          <Text style={styles.title}>CME Watch</Text>
          {isLoading && <ActivityIndicator size="small" color={COLORS.emerald} />}
        </View>

        {data?.nextArrival ? (
          <>
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Next storm arrival:</Text>
              <Text style={[styles.countdownValue, { color: getUrgencyColor(data.hoursUntilArrival) }]}>
                {formatCountdown(data.hoursUntilArrival!)}
              </Text>
            </View>

            <View style={styles.details}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Speed</Text>
                <Text style={styles.detailValue}>{data.nextArrival.speed} km/s</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Launched</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.nextArrival.startTime).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>ETA</Text>
                <Text style={styles.detailValue}>
                  {new Date(data.nextArrival.arrivalTime!).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noEvent}>
            <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
            <Text style={styles.noEventText}>No Earth-directed CMEs detected</Text>
            <Text style={styles.noEventSubtext}>Space weather is quiet</Text>
          </View>
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 12,
  },
  countdownLabel: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 4,
  },
  countdownValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  noEvent: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  noEventText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  noEventSubtext: {
    fontSize: 12,
    color: COLORS.muted,
  },
});
