'use client';

import { useEffect, useState } from 'react';
import { Activity, Wind, Gauge, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { getKpNow, getKpHistory, getSolarWindRecent, getAlerts } from '@/lib/api/swpc';
import { getSfiTrend } from '@/lib/api/solarFlux';
import { getCmeCountdown } from '@/lib/api/cme';
import { AuroraHeatmap, KpTrendLine } from '@/components/charts';
import { COLORS } from '@/lib/util/colors';
import { type SwpcAlert, getAlertLevel } from '@/lib/api/parsers/alerts';
import type { SfiTrend } from '@/lib/api/parsers/solarFlux';
import type { CmeCountdownData } from '@/lib/api/parsers/cme';

interface SolarData {
  kp: number | null;
  kpUpdatedAt: string | null;
  bz: number | null;
  speed: number | null;
  density: number | null;
  bt: number | null;
  kpHistory: Array<{ kp: number; at: string }>;
  alerts: SwpcAlert[];
  sfiTrend: SfiTrend | null;
  cmeData: CmeCountdownData | null;
}

function StatusIndicator({ status }: { status: 'nominal' | 'elevated' | 'warning' | 'critical' }) {
  const colors = {
    nominal: 'bg-green-500',
    elevated: 'bg-yellow-500',
    warning: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} animate-pulse`} />
  );
}

function DataCard({
  title,
  value,
  unit,
  subtitle,
  trend,
  status,
  icon: Icon,
}: {
  title: string;
  value: string | number | null;
  unit?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'nominal' | 'elevated' | 'warning' | 'critical';
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-red-400' : trend === 'down' ? 'text-green-400' : 'text-solar-muted';

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-solar-muted" />}
          <span className="text-xs font-medium text-solar-muted uppercase tracking-wide">{title}</span>
        </div>
        {status && <StatusIndicator status={status} />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-solar-text font-mono">
          {value ?? '--'}
        </span>
        {unit && <span className="text-sm text-solar-muted">{unit}</span>}
        {trend && <TrendIcon className={`w-4 h-4 ${trendColor}`} />}
      </div>
      {subtitle && <p className="text-xs text-solar-muted mt-1">{subtitle}</p>}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getAlertSummary(alert: SwpcAlert): { level: string; description: string; color: string } {
  const level = getAlertLevel(alert.message);
  const message = alert.message.toUpperCase();

  if (level === 'G5') return { level: 'G5', description: 'Extreme Storm', color: 'text-red-500' };
  if (level === 'G4') return { level: 'G4', description: 'Severe Storm', color: 'text-red-400' };
  if (level === 'G3') return { level: 'G3', description: 'Strong Storm', color: 'text-orange-400' };
  if (level === 'G2') return { level: 'G2', description: 'Moderate Storm', color: 'text-yellow-400' };
  if (level === 'G1') return { level: 'G1', description: 'Minor Storm', color: 'text-yellow-300' };
  if (level === 'K4') return { level: 'K4', description: 'Active Conditions', color: 'text-green-400' };

  if (message.includes('WARNING')) return { level: 'WARN', description: 'Warning Issued', color: 'text-orange-400' };
  if (message.includes('WATCH')) return { level: 'WATCH', description: 'Watch Active', color: 'text-yellow-400' };
  if (message.includes('ALERT')) return { level: 'ALERT', description: 'Alert Active', color: 'text-orange-400' };

  return { level: 'INFO', description: 'Geomagnetic Activity', color: 'text-solar-muted' };
}

function AlertsPanel({ alerts }: { alerts: SwpcAlert[] }) {
  const recentAlerts = alerts.slice(0, 5);

  if (recentAlerts.length === 0) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-solar-text mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Active Alerts
        </h3>
        <p className="text-sm text-solar-muted">No active alerts</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-solar-text mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        Active Alerts ({recentAlerts.length})
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {recentAlerts.map((alert, i) => {
          const summary = getAlertSummary(alert);
          return (
            <div
              key={i}
              className="p-2 bg-[#0a0f1a] rounded border border-solar-border text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${summary.color}`}>
                    {summary.level}
                  </span>
                  <span className="text-solar-text">
                    {summary.description}
                  </span>
                </div>
                <span className="text-solar-muted whitespace-nowrap">
                  {formatRelativeTime(alert.issue_datetime)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KpGauge({ kp }: { kp: number | null }) {
  const value = kp ?? 0;
  const percentage = (value / 9) * 100;

  const getColor = (kp: number) => {
    if (kp >= 7) return '#CC3232';
    if (kp >= 5) return '#DB7B2B';
    if (kp >= 4) return '#E7B416';
    if (kp >= 3) return '#99C140';
    return '#2DC937';
  };

  const getStatus = (kp: number): 'nominal' | 'elevated' | 'warning' | 'critical' => {
    if (kp >= 7) return 'critical';
    if (kp >= 5) return 'warning';
    if (kp >= 4) return 'elevated';
    return 'nominal';
  };

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-solar-text flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Planetary Kp Index
        </h3>
        <StatusIndicator status={getStatus(value)} />
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#1E2347"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={getColor(value)}
              strokeWidth="8"
              strokeDasharray={`${percentage * 2.51} 251`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold font-mono" style={{ color: getColor(value) }}>
              {kp?.toFixed(1) ?? '--'}
            </span>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-[#0a0f1a] rounded">
              <div className="text-green-400 font-semibold">0-3</div>
              <div className="text-solar-muted">Quiet</div>
            </div>
            <div className="text-center p-2 bg-[#0a0f1a] rounded">
              <div className="text-yellow-400 font-semibold">4-5</div>
              <div className="text-solar-muted">Active</div>
            </div>
            <div className="text-center p-2 bg-[#0a0f1a] rounded">
              <div className="text-red-400 font-semibold">6-9</div>
              <div className="text-solar-muted">Storm</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CmePanel({ data }: { data: CmeCountdownData | null }) {
  if (!data?.nextArrival) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-solar-text mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          CME Watch
        </h3>
        <p className="text-sm text-solar-muted">No Earth-directed CMEs expected</p>
        {data?.recentCmes && data.recentCmes.length > 0 && (
          <p className="text-xs text-solar-muted mt-2">
            {data.recentCmes.length} CME(s) observed in last 30 days
          </p>
        )}
      </div>
    );
  }

  const hours = data.hoursUntilArrival ?? 0;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);

  return (
    <div className="bg-[#0d1424] border border-orange-500/50 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        CME Incoming
      </h3>
      <div className="flex items-baseline gap-2 mb-2">
        {days > 0 && (
          <>
            <span className="text-2xl font-bold text-orange-400 font-mono">{days}</span>
            <span className="text-sm text-solar-muted">d</span>
          </>
        )}
        <span className="text-2xl font-bold text-orange-400 font-mono">{remainingHours}</span>
        <span className="text-sm text-solar-muted">h</span>
      </div>
      <p className="text-xs text-solar-muted">
        ETA: {data.nextArrival.arrivalTime
          ? new Date(data.nextArrival.arrivalTime).toLocaleString()
          : 'Unknown'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<SolarData>({
    kp: null,
    kpUpdatedAt: null,
    bz: null,
    speed: null,
    density: null,
    bt: null,
    kpHistory: [],
    alerts: [],
    sfiTrend: null,
    cmeData: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      const [kpData, solarWind, history, alerts, sfiTrend, cmeData] = await Promise.all([
        getKpNow(),
        getSolarWindRecent(),
        getKpHistory(),
        getAlerts(),
        getSfiTrend(),
        getCmeCountdown(),
      ]);

      // Get latest non-null solar wind values (mag and plasma may have different timestamps)
      let latestBz: number | null = null;
      let latestBt: number | null = null;
      let latestSpeed: number | null = null;
      let latestDensity: number | null = null;

      // Search from end to find the latest non-null value for each metric
      for (let i = solarWind.points.length - 1; i >= 0; i--) {
        const point = solarWind.points[i];
        if (latestBz === null && point.bz !== null) latestBz = point.bz;
        if (latestBt === null && point.bt !== null) latestBt = point.bt;
        if (latestSpeed === null && point.speed !== null) latestSpeed = point.speed;
        if (latestDensity === null && point.density !== null) latestDensity = point.density;
        if (latestBz !== null && latestBt !== null && latestSpeed !== null && latestDensity !== null) break;
      }

      setData({
        kp: kpData.kp,
        kpUpdatedAt: kpData.at,
        bz: latestBz,
        speed: latestSpeed,
        density: latestDensity,
        bt: latestBt,
        kpHistory: history.slice(-288),
        alerts,
        sfiTrend,
        cmeData,
      });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const getBzStatus = (): 'nominal' | 'elevated' | 'warning' | 'critical' => {
    if (data.bz === null) return 'nominal';
    if (data.bz <= -10) return 'critical';
    if (data.bz <= -5) return 'warning';
    if (data.bz < 0) return 'elevated';
    return 'nominal';
  };

  const getSpeedStatus = (): 'nominal' | 'elevated' | 'warning' | 'critical' => {
    if (data.speed === null) return 'nominal';
    if (data.speed >= 700) return 'critical';
    if (data.speed >= 500) return 'warning';
    if (data.speed >= 400) return 'elevated';
    return 'nominal';
  };

  return (
    <AppLayout>
      <TopBar
        title="Space Weather Dashboard"
        subtitle="Real-time solar and geomagnetic monitoring"
        onRefresh={fetchAllData}
        lastUpdated={lastUpdated}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top metrics row */}
            <div className="grid grid-cols-5 gap-4">
              <DataCard
                title="Solar Wind Speed"
                value={data.speed != null ? Math.round(data.speed) : null}
                unit="km/s"
                icon={Wind}
                status={getSpeedStatus()}
                subtitle={data.speed != null && data.speed > 500 ? 'Enhanced' : 'Normal'}
              />
              <DataCard
                title="Bz Component"
                value={data.bz != null ? data.bz.toFixed(1) : null}
                unit="nT"
                icon={Gauge}
                status={getBzStatus()}
                subtitle={data.bz != null ? (data.bz < 0 ? 'Southward' : 'Northward') : undefined}
              />
              <DataCard
                title="Bt Total Field"
                value={data.bt != null ? data.bt.toFixed(1) : null}
                unit="nT"
                icon={Activity}
              />
              <DataCard
                title="Proton Density"
                value={data.density != null ? data.density.toFixed(1) : null}
                unit="p/cm³"
                icon={Activity}
              />
              <DataCard
                title="Solar Flux Index"
                value={data.sfiTrend?.current ?? null}
                unit="SFU"
                icon={Activity}
                subtitle={data.sfiTrend ? `30d avg: ${data.sfiTrend.average30day}` : undefined}
              />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left column - Kp and chart */}
              <div className="col-span-2 space-y-6">
                <KpGauge kp={data.kp} />

                {data.kpHistory.length > 0 && (
                  <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-solar-text mb-4">
                      Kp Index History (24h)
                    </h3>
                    <KpTrendLine data={data.kpHistory} width={700} height={200} />
                  </div>
                )}

                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-4">
                    Aurora Probability Map
                  </h3>
                  <AuroraHeatmap width={700} height={400} />
                </div>
              </div>

              {/* Right column - Alerts and status */}
              <div className="space-y-6">
                <CmePanel data={data.cmeData} />
                <AlertsPanel alerts={data.alerts} />

                {/* Quick status table */}
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-solar-text mb-3">
                    System Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-solar-border">
                      <span className="text-sm text-solar-muted">NOAA SWPC</span>
                      <span className="inline-flex items-center gap-2 text-sm text-green-400">
                        <StatusIndicator status="nominal" />
                        <span>Online</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-solar-border">
                      <span className="text-sm text-solar-muted">ACE Satellite</span>
                      <span className="inline-flex items-center gap-2 text-sm text-green-400">
                        <StatusIndicator status="nominal" />
                        <span>Nominal</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-solar-border">
                      <span className="text-sm text-solar-muted">DSCOVR</span>
                      <span className="inline-flex items-center gap-2 text-sm text-green-400">
                        <StatusIndicator status="nominal" />
                        <span>Nominal</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-solar-muted">Data Feed</span>
                      <span className="inline-flex items-center gap-2 text-sm text-green-400">
                        <StatusIndicator status="nominal" />
                        <span>Live</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
