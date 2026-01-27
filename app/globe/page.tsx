'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, RotateCcw, Layers } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { getOvation } from '@/lib/api/swpc';
import { DynamicGlobe } from '@/components/globe';
import type { AuroraCell } from '@/components/globe/types';

export default function GlobePage() {
  const [auroraData, setAuroraData] = useState<AuroraCell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState({
    aurora: true,
    grid: true,
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const ovation = await getOvation();
      const cells: AuroraCell[] = ovation.cells.map(c => ({
        lat: c.lat,
        lng: c.lon,
        probability: c.prob,
      }));
      setAuroraData(cells);
    } catch (error) {
      console.error('Failed to fetch aurora data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <AppLayout>
      <TopBar
        title="Aurora Globe"
        subtitle="Real-time 3D aurora visualization"
        onRefresh={fetchData}
      />

      <div className="p-6 h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-4 gap-6 h-full">
          {/* Globe container */}
          <div className={`${isFullscreen ? 'col-span-4' : 'col-span-3'} bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden relative`}>
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
                  <p className="text-solar-muted text-sm">Loading 3D Globe...</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full">
                <DynamicGlobe
                  width={isFullscreen ? 1200 : 900}
                  height={isFullscreen ? 700 : 600}
                  auroraData={auroraData}
                />
              </div>
            )}

            {/* Globe controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-[#0a0f1a]/80 border border-solar-border rounded-lg text-solar-muted hover:text-solar-text transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button
                className="p-2 bg-[#0a0f1a]/80 border border-solar-border rounded-lg text-solar-muted hover:text-solar-text transition-colors"
                title="Reset view"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-[#0a0f1a]/80 border border-solar-border rounded-lg p-3">
              <h4 className="text-xs font-semibold text-solar-text mb-2">Aurora Intensity</h4>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded bg-gradient-to-r from-blue-900 via-green-500 via-yellow-500 to-red-500" />
              </div>
              <div className="flex justify-between text-[10px] text-solar-muted mt-1">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          </div>

          {/* Control panel */}
          {!isFullscreen && (
            <div className="space-y-4">
              {/* Layer controls */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Layers
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-solar-muted">Aurora Oval</span>
                    <input
                      type="checkbox"
                      checked={showLayers.aurora}
                      onChange={(e) => setShowLayers({ ...showLayers, aurora: e.target.checked })}
                      className="w-4 h-4 accent-solar-emerald"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-solar-muted">Grid Lines</span>
                    <input
                      type="checkbox"
                      checked={showLayers.grid}
                      onChange={(e) => setShowLayers({ ...showLayers, grid: e.target.checked })}
                      className="w-4 h-4 accent-solar-emerald"
                    />
                  </label>
                </div>
              </div>

              {/* Current conditions */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4">Current Conditions</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-solar-muted">Data Points</span>
                    <span className="text-solar-text font-mono">{auroraData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-solar-muted">Visibility</span>
                    <span className="text-green-400">Good</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-solar-muted shrink-0">Coverage</span>
                    <span className="text-solar-text text-right">Northern Hemisphere</span>
                  </div>
                </div>
              </div>

              {/* Keyboard shortcuts */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4">Controls</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-solar-muted">Rotate</span>
                    <kbd className="px-2 py-0.5 bg-[#0a0f1a] rounded text-solar-text">Drag</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-solar-muted">Zoom</span>
                    <kbd className="px-2 py-0.5 bg-[#0a0f1a] rounded text-solar-text">Scroll</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-solar-muted">Pan</span>
                    <kbd className="px-2 py-0.5 bg-[#0a0f1a] rounded text-solar-text">Right-drag</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
