import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Features } from '@/components/landing/Features';
import { Hero } from '@/components/landing/Hero';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Hero />
        <Features />
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
  },
});
