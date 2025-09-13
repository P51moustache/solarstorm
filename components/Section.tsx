import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../lib/util/colors';

interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Section({ title, subtitle, children, style }: SectionProps) {
  return (
    <View style={[styles.container, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
  },
});
