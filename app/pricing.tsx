import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pricing } from '@/components/landing/Pricing';

export default function PricingPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Pricing />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  content: {
    flex: 1,
    paddingTop: 40,
  },
});
