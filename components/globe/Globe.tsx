import { Canvas } from '@react-three/fiber';
import React, { Suspense } from 'react';
import { StyleSheet, View } from 'react-native';
import { GlobeScene } from './GlobeScene';
import type { GlobeProps } from './types';

export function Globe({ width, height, auroraData }: GlobeProps) {
  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width, height }}
      >
        <Suspense fallback={null}>
          <GlobeScene auroraData={auroraData} />
        </Suspense>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0B1020',
  },
});

// Export for lazy loading
export default Globe;
