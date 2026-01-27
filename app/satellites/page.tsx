'use client';

import { useState } from 'react';
import { Plus, Search, Filter, Satellite, AlertTriangle, Activity } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';

interface SatelliteData {
  id: string;
  name: string;
  noradId: string;
  altitude: number;
  inclination: number;
  status: 'nominal' | 'warning' | 'critical';
  dragRisk: 'low' | 'moderate' | 'high';
  lastContact: string;
}

const mockSatellites: SatelliteData[] = [
  { id: '1', name: 'SATCOM-1', noradId: '25544', altitude: 408, inclination: 51.6, status: 'nominal', dragRisk: 'low', lastContact: '2 min ago' },
  { id: '2', name: 'SATCOM-2', noradId: '43013', altitude: 550, inclination: 97.4, status: 'nominal', dragRisk: 'low', lastContact: '5 min ago' },
  { id: '3', name: 'LEO-OBSERVER', noradId: '48274', altitude: 320, inclination: 42.0, status: 'warning', dragRisk: 'moderate', lastContact: '12 min ago' },
  { id: '4', name: 'POLAR-SAT', noradId: '51234', altitude: 780, inclination: 98.2, status: 'nominal', dragRisk: 'low', lastContact: '1 min ago' },
];

function StatusBadge({ status }: { status: 'nominal' | 'warning' | 'critical' }) {
  const styles = {
    nominal: 'bg-green-500/20 text-green-400 border-green-500/50',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RiskBadge({ risk }: { risk: 'low' | 'moderate' | 'high' }) {
  const styles = {
    low: 'text-green-400',
    moderate: 'text-yellow-400',
    high: 'text-red-400',
  };

  return (
    <span className={`text-sm font-medium ${styles[risk]}`}>
      {risk.charAt(0).toUpperCase() + risk.slice(1)}
    </span>
  );
}

export default function SatellitesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [satellites] = useState<SatelliteData[]>(mockSatellites);

  const filteredSatellites = satellites.filter(sat =>
    sat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sat.noradId.includes(searchQuery)
  );

  return (
    <AppLayout>
      <TopBar
        title="Satellite Fleet Management"
        subtitle="Monitor and manage your satellite assets"
      />

      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Satellite className="w-4 h-4 text-solar-muted" />
              <span className="text-xs text-solar-muted uppercase tracking-wide">Total Assets</span>
            </div>
            <span className="text-2xl font-bold text-solar-text font-mono">{satellites.length}</span>
          </div>
          <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-xs text-solar-muted uppercase tracking-wide">Nominal</span>
            </div>
            <span className="text-2xl font-bold text-green-400 font-mono">
              {satellites.filter(s => s.status === 'nominal').length}
            </span>
          </div>
          <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-solar-muted uppercase tracking-wide">Warnings</span>
            </div>
            <span className="text-2xl font-bold text-yellow-400 font-mono">
              {satellites.filter(s => s.status === 'warning').length}
            </span>
          </div>
          <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-solar-muted uppercase tracking-wide">Critical</span>
            </div>
            <span className="text-2xl font-bold text-red-400 font-mono">
              {satellites.filter(s => s.status === 'critical').length}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-solar-muted" />
              <input
                type="text"
                placeholder="Search satellites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#0d1424] border border-solar-border rounded-lg text-sm text-solar-text placeholder-solar-muted focus:outline-none focus:border-solar-emerald/50 w-64"
              />
            </div>
            <button className="flex items-center gap-2 px-3 py-2 bg-[#0d1424] border border-solar-border rounded-lg text-sm text-solar-muted hover:text-solar-text transition-colors">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-solar-emerald text-solar-bg rounded-lg text-sm font-medium hover:bg-solar-emerald/90 transition-colors">
            <Plus className="w-4 h-4" />
            Add Satellite
          </button>
        </div>

        {/* Table */}
        <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-solar-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Satellite</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">NORAD ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Altitude</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Inclination</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Drag Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Last Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-solar-border">
              {filteredSatellites.map((sat) => (
                <tr key={sat.id} className="hover:bg-[#0a0f1a] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-solar-card rounded-lg flex items-center justify-center">
                        <Satellite className="w-4 h-4 text-solar-emerald" />
                      </div>
                      <span className="text-sm font-medium text-solar-text">{sat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-solar-muted font-mono">{sat.noradId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-solar-text font-mono">{sat.altitude} km</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-solar-text font-mono">{sat.inclination}°</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sat.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge risk={sat.dragRisk} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-solar-muted">{sat.lastContact}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
