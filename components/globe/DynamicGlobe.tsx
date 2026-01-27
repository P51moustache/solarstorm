'use client';

import dynamic from 'next/dynamic';
import type { GlobeProps } from './types';

// Dynamic import with SSR disabled for 3D components
const Globe = dynamic(() => import('./Globe').then(mod => mod.Globe), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl overflow-hidden bg-solar-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export function DynamicGlobe(props: GlobeProps) {
  return <Globe {...props} />;
}

export default DynamicGlobe;
