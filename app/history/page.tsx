'use client';

import { useEffect, useState } from 'react';
import { BarChart3, CloudOff, TrendingUp, TrendingDown, Activity, Calendar } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { getHistoricalData } from '@/lib/api/historical';
import type { HistoricalSummary } from '@/lib/api/parsers/historical';

type MetricType = 'kp' | 'bz' | 'speed';

function StatCard({ label, value, color, subtitle }: {
  label: string;
  value: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-[#0a0f1a] rounded-lg p-4">
      <p className="text-xs text-solar-muted mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
      {subtitle && <p className="text-xs text-solar-muted mt-1">{subtitle}</p>}
    </div>
  );
}

export default function HistoryPage() {
  const [data, setData] = useState<HistoricalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('kp');

  useEffect(() => {
    getHistoricalData()
      .then(setData)
      .finally(() => setIsLoading(false));
  }, []);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await getHistoricalData();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  const getKpColor = (kp: number) => {
    if (kp >= 7) return '#ef4444';
    if (kp >= 5) return '#f97316';
    if (kp >= 4) return '#eab308';
    return '#22c55e';
  };

  const getBzColor = (bz: number) => {
    if (bz < -10) return '#ef4444';
    if (bz < -5) return '#f97316';
    if (bz < 0) return '#eab308';
    return '#22c55e';
  };

  const getSpeedColor = (speed: number) => {
    if (speed >= 600) return '#ef4444';
    if (speed >= 500) return '#f97316';
    if (speed >= 400) return '#eab308';
    return '#22c55e';
  };

  const renderChart = () => {
    if (!data) return null;

    const chartData = data.data.filter((d) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp !== null;
        case 'bz':
          return d.bz !== null;
        case 'speed':
          return d.speed !== null;
      }
    });

    const getValue = (d: (typeof chartData)[0]) => {
      switch (selectedMetric) {
        case 'kp':
          return d.kp ?? 0;
        case 'bz':
          return d.bz ?? 0;
        case 'speed':
          return d.speed ?? 0;
      }
    };

    const maxValue = Math.max(...chartData.map(getValue), 1);
    const minValue = Math.min(...chartData.map(getValue), 0);

    return (
      <div>
        <div className="flex items-end h-40 gap-0.5">
          {chartData.map((d, i) => {
            const value = getValue(d);
            const normalizedHeight =
              selectedMetric === 'bz'
                ? (Math.abs(value) / Math.max(Math.abs(minValue), maxValue)) * 100
                : (value / maxValue) * 100;

            let color: string;
            switch (selectedMetric) {
              case 'kp':
                color = getKpColor(value);
                break;
              case 'bz':
                color = getBzColor(value);
                break;
              case 'speed':
                color = getSpeedColor(value);
                break;
            }

            return (
              <div
                key={i}
                className="flex-1 rounded-sm min-h-[4px] transition-all hover:opacity-80"
                style={{
                  height: `${Math.max(4, normalizedHeight)}%`,
                  backgroundColor: color,
                }}
                title={`${new Date(d.timestamp).toLocaleDateString()}: ${value}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-3 text-xs text-solar-muted">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    );
  };

  return (
    <FeatureGate feature="historicalData">
      <AppLayout>
        <TopBar
          title="Historical Data Explorer"
          subtitle="30-day space weather trend analysis"
          onRefresh={handleRefresh}
        />

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Chart */}
              <div className="col-span-2 space-y-6">
                {/* Metric Selector */}
                <div className="flex gap-2">
                  {[
                    { key: 'kp', label: 'Kp Index', icon: Activity },
                    { key: 'bz', label: 'IMF Bz', icon: TrendingDown },
                    { key: 'speed', label: 'Solar Wind', icon: TrendingUp },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMetric(key as MetricType)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedMetric === key
                          ? 'bg-solar-emerald/20 text-solar-emerald border border-solar-emerald/50'
                          : 'bg-[#0d1424] text-solar-muted border border-solar-border hover:text-solar-text'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Main Chart */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-semibold text-solar-text flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      {selectedMetric === 'kp' && '30-Day Kp Index History'}
                      {selectedMetric === 'bz' && '30-Day IMF Bz History'}
                      {selectedMetric === 'speed' && '30-Day Solar Wind Speed History'}
                    </h3>
                    <span className="text-xs text-solar-muted">
                      {data.data.length} data points
                    </span>
                  </div>
                  {renderChart()}
                </div>

                {/* Recent Events */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-solar-border flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-solar-muted" />
                    <h3 className="text-sm font-semibold text-solar-text">Recent Geomagnetic Events</h3>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-solar-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Kp Index</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Conditions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solar-border">
                      {data.data
                        .filter((d) => d.kp !== null && d.kp >= 4)
                        .slice(-10)
                        .reverse()
                        .map((event, i) => {
                          const kp = event.kp!;
                          let category = 'Active';
                          if (kp >= 7) category = 'Severe Storm';
                          else if (kp >= 6) category = 'Strong Storm';
                          else if (kp >= 5) category = 'Minor Storm';

                          return (
                            <tr key={i} className="hover:bg-[#0a0f1a]">
                              <td className="px-4 py-3 text-sm text-solar-text">
                                {new Date(event.timestamp).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="px-2 py-1 rounded text-sm font-bold font-mono"
                                  style={{
                                    backgroundColor: getKpColor(kp) + '30',
                                    color: getKpColor(kp),
                                  }}
                                >
                                  {kp.toFixed(1)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-solar-text">{category}</td>
                              <td className="px-4 py-3 text-sm text-solar-muted">
                                {event.bz !== null && `Bz: ${event.bz.toFixed(1)} nT`}
                                {event.speed !== null && `, ${event.speed.toFixed(0)} km/s`}
                              </td>
                            </tr>
                          );
                        })}
                      {data.data.filter((d) => d.kp !== null && d.kp >= 4).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm text-solar-muted">
                            No significant geomagnetic activity (Kp ≥ 4) in the past 30 days
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column - Stats */}
              <div className="space-y-6">
                {/* 30-Day Summary */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">30-Day Statistics</h3>
                  <div className="space-y-3">
                    <StatCard
                      label="Average Kp"
                      value={data.stats.avgKp.toFixed(1)}
                      color={getKpColor(data.stats.avgKp)}
                    />
                    <StatCard
                      label="Maximum Kp"
                      value={data.stats.maxKp.toFixed(1)}
                      color={getKpColor(data.stats.maxKp)}
                    />
                    <StatCard
                      label="Storm Days"
                      value={String(data.stats.stormDays)}
                      color={data.stats.stormDays > 0 ? '#f97316' : '#22c55e'}
                      subtitle="Days with Kp ≥ 5"
                    />
                  </div>
                </div>

                {/* IMF Stats */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">IMF Statistics</h3>
                  <div className="space-y-3">
                    <StatCard
                      label="Minimum Bz"
                      value={`${data.stats.minBz.toFixed(1)} nT`}
                      color={getBzColor(data.stats.minBz)}
                    />
                  </div>
                </div>

                {/* Solar Wind Stats */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">Solar Wind Statistics</h3>
                  <div className="space-y-3">
                    <StatCard
                      label="Average Speed"
                      value={`${data.stats.avgSpeed.toFixed(0)} km/s`}
                      color={getSpeedColor(data.stats.avgSpeed)}
                    />
                    <StatCard
                      label="Maximum Speed"
                      value={`${data.stats.maxSpeed.toFixed(0)} km/s`}
                      color={getSpeedColor(data.stats.maxSpeed)}
                    />
                  </div>
                </div>

                {/* Reference */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">Kp Index Scale</h3>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-solar-border">
                      <tr>
                        <td className="py-2 text-solar-muted">Quiet</td>
                        <td className="py-2 text-right text-green-400 font-mono">0-3</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-solar-muted">Active</td>
                        <td className="py-2 text-right text-yellow-400 font-mono">4</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-solar-muted">Minor Storm</td>
                        <td className="py-2 text-right text-orange-400 font-mono">5</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-solar-muted">Moderate Storm</td>
                        <td className="py-2 text-right text-orange-500 font-mono">6</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-solar-muted">Strong Storm</td>
                        <td className="py-2 text-right text-red-400 font-mono">7-9</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <CloudOff className="w-16 h-16 text-solar-muted" />
              <p className="text-lg text-solar-muted">Unable to load historical data</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-solar-emerald text-solar-bg rounded-lg text-sm font-medium hover:bg-solar-emerald/90"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    </FeatureGate>
  );
}
