'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { GlobeScene } from './GlobeScene';
import type { GlobeProps } from './types';

export function Globe({ width, height, auroraData }: GlobeProps) {
  return (
    <div
      className="rounded-xl overflow-hidden bg-solar-bg"
      style={{ width, height }}
    >
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 45 }}
        style={{ width, height }}
      >
        <Suspense fallback={null}>
          <GlobeScene auroraData={auroraData} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Globe;
