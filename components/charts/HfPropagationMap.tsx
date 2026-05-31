'use client';

import { useEffect, useState } from 'react';
import { Radio, Sun, Moon, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { getKpNow } from '@/lib/api/swpc';
import { getSfiTrend } from '@/lib/api/solarFlux';
import {
  calculateHfPropagation,
  calculatePropagationZones,
  getBandStatusColor,
  getConditionColor,
  type HfPropagationData,
  type PropagationZone,
} from '@/lib/services/hfPropagation';

interface HfPropagationMapProps {
  className?: string;
}

export function HfPropagationMap({ className = '' }: HfPropagationMapProps) {
  const [data, setData] = useState<HfPropagationData | null>(null);
  const [zones, setZones] = useState<PropagationZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [kpData, sfiData] = await Promise.all([
          getKpNow(),
          getSfiTrend(),
        ]);

        const sfi = sfiData?.current ?? 100;
        const kp = kpData?.kp ?? 2;

        const propagation = calculateHfPropagation(sfi, kp);
        const propagationZones = calculatePropagationZones(sfi, kp);

        setData(propagation);
        setZones(propagationZones);
      } catch (err) {
        console.error('Failed to fetch HF propagation data:', err);
        setError('Failed to load propagation data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-solar-card rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-solar-card rounded-2xl p-6 ${className}`}>
        <div className="flex flex-col items-center justify-center h-64 text-solar-muted">
          <AlertTriangle className="w-8 h-8 mb-2" />
          <p>{error || 'Unable to load propagation data'}</p>
        </div>
      </div>
    );
  }

  const openCount = data.bands.filter(b => b.status === 'open').length;
  const marginalCount = data.bands.filter(b => b.status === 'marginal').length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with conditions summary */}
      <div className="bg-solar-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-solar-emerald/20 rounded-xl flex items-center justify-center">
              <Radio className="w-6 h-6 text-solar-emerald" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-solar-text">HF Propagation</h2>
              <p className="text-sm text-solar-muted">Amateur Radio Band Conditions</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-2xl font-bold capitalize"
              style={{ color: getConditionColor(data.overallCondition) }}
            >
              {data.overallCondition}
            </div>
            <p className="text-xs text-solar-muted">Overall Conditions</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0a0f1a] rounded-xl p-4">
            <p className="text-xs text-solar-muted mb-1">Solar Flux (SFI)</p>
            <p className="text-2xl font-bold text-solar-text">{data.sfi}</p>
            <p className="text-xs text-solar-muted">SFU</p>
          </div>
          <div className="bg-[#0a0f1a] rounded-xl p-4">
            <p className="text-xs text-solar-muted mb-1">Kp Index</p>
            <p className="text-2xl font-bold text-solar-text">{data.kp}</p>
            <p className="text-xs text-solar-muted">0-9 scale</p>
          </div>
          <div className="bg-[#0a0f1a] rounded-xl p-4">
            <p className="text-xs text-solar-muted mb-1">A Index</p>
            <p className="text-2xl font-bold text-solar-text">{data.aIndex}</p>
            <p className="text-xs text-solar-muted">Geomagnetic</p>
          </div>
          <div className="bg-[#0a0f1a] rounded-xl p-4">
            <p className="text-xs text-solar-muted mb-1">Noise Level</p>
            <p className="text-2xl font-bold text-solar-text capitalize">{data.noiseLevel}</p>
            <p className="text-xs text-solar-muted">QRN</p>
          </div>
        </div>

        {/* Daylight indicator */}
        <div className="flex items-center gap-4 p-3 bg-[#0a0f1a] rounded-xl">
          {data.daylight.isDaytime ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-blue-400" />
          )}
          <div className="flex-1">
            <p className="text-sm text-solar-text">
              {data.daylight.isDaytime ? 'Daytime Propagation' : 'Nighttime Propagation'}
            </p>
            <p className="text-xs text-solar-muted">
              Sunrise: {data.daylight.sunrise} | Sunset: {data.daylight.sunset}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-solar-text">
              {openCount} open, {marginalCount} marginal
            </p>
            <p className="text-xs text-solar-muted">of {data.bands.length} bands</p>
          </div>
        </div>
      </div>

      {/* Band status grid */}
      <div className="bg-solar-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-solar-text mb-4">Band Conditions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.bands.map((band) => (
            <div
              key={band.name}
              className="bg-[#0a0f1a] rounded-xl p-4 border-l-4"
              style={{ borderLeftColor: getBandStatusColor(band.status) }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {band.status === 'open' ? (
                    <Wifi className="w-4 h-4" style={{ color: getBandStatusColor(band.status) }} />
                  ) : band.status === 'marginal' ? (
                    <Wifi className="w-4 h-4" style={{ color: getBandStatusColor(band.status) }} />
                  ) : (
                    <WifiOff className="w-4 h-4" style={{ color: getBandStatusColor(band.status) }} />
                  )}
                  <span className="text-lg font-bold text-solar-text">{band.name}</span>
                </div>
                <span
                  className="text-sm font-medium uppercase px-2 py-0.5 rounded"
                  style={{
                    color: getBandStatusColor(band.status),
                    backgroundColor: `${getBandStatusColor(band.status)}20`,
                  }}
                >
                  {band.status}
                </span>
              </div>
              <p className="text-xs text-solar-muted mb-1">{band.frequency} MHz</p>
              <p className="text-xs text-solar-muted">{band.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regional MUF table */}
      <div className="bg-solar-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-solar-text mb-4">Regional MUF Values</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-solar-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-solar-muted">Region</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-solar-muted">MUF</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-solar-muted">foF2</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-solar-muted">Condition</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.region} className="border-b border-solar-border/50">
                  <td className="py-2 px-3 text-sm text-solar-text">{zone.region}</td>
                  <td className="py-2 px-3 text-sm text-solar-text text-center">{zone.muf} MHz</td>
                  <td className="py-2 px-3 text-sm text-solar-muted text-center">{zone.fof2} MHz</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className="text-xs font-medium uppercase px-2 py-0.5 rounded"
                      style={{
                        color: getBandStatusColor(zone.condition),
                        backgroundColor: `${getBandStatusColor(zone.condition)}20`,
                      }}
                    >
                      {zone.condition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-solar-muted mt-4">
          MUF = Maximum Usable Frequency | foF2 = Critical Frequency of F2 Layer
        </p>
      </div>

      {/* Propagation tips */}
      <div className="bg-solar-card rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-solar-text mb-4">Operating Tips</h3>
        <div className="space-y-3 text-sm text-solar-muted">
          {data.overallCondition === 'excellent' && (
            <p>
              Excellent conditions for DX on all bands. Higher bands (10m, 12m, 15m) are wide open.
              Great time for working rare DX and contests.
            </p>
          )}
          {data.overallCondition === 'good' && (
            <p>
              Good conditions for HF operation. Focus on 20m and 17m for reliable DX.
              Higher bands may have sporadic openings.
            </p>
          )}
          {data.overallCondition === 'fair' && (
            <p>
              Fair conditions. Best DX on 40m and 20m. Higher bands limited to short skip.
              Consider NVIS on 80m/40m for regional contacts.
            </p>
          )}
          {data.overallCondition === 'poor' && (
            <p>
              Poor conditions due to geomagnetic disturbance or low solar activity.
              Focus on lower bands (160m, 80m, 40m) and local/regional contacts.
            </p>
          )}
          {data.noiseLevel === 'high' && (
            <p className="text-amber-400">
              High noise levels expected. Use narrow filters and consider directional antennas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
