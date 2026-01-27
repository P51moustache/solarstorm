'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { OrbitType } from '@/lib/supabase/types';

interface AddSatelliteModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (satellite: {
    name: string;
    norad_id: number | null;
    altitude_km: number;
    inclination_deg: number;
    ballistic_coefficient: number | null;
    orbit_type: OrbitType;
    is_orbit_raising: boolean;
    launch_date: string | null;
    notes: string | null;
    org_id: null;
  }) => void;
}

const ORBIT_TYPES: OrbitType[] = ['LEO', 'MEO', 'GEO', 'HEO'];

export function AddSatelliteModal({ visible, onClose, onAdd }: AddSatelliteModalProps) {
  const [name, setName] = useState('');
  const [noradId, setNoradId] = useState('');
  const [altitude, setAltitude] = useState('');
  const [inclination, setInclination] = useState('');
  const [ballisticCoeff, setBallisticCoeff] = useState('');
  const [orbitType, setOrbitType] = useState<OrbitType>('LEO');
  const [isOrbitRaising, setIsOrbitRaising] = useState(false);
  const [notes, setNotes] = useState('');

  const handleAdd = () => {
    if (!name || !altitude || !inclination) return;

    onAdd({
      name,
      norad_id: noradId ? parseInt(noradId) : null,
      altitude_km: parseFloat(altitude),
      inclination_deg: parseFloat(inclination),
      ballistic_coefficient: ballisticCoeff ? parseFloat(ballisticCoeff) : null,
      orbit_type: orbitType,
      is_orbit_raising: isOrbitRaising,
      launch_date: null,
      notes: notes || null,
      org_id: null,
    });

    // Reset form
    setName('');
    setNoradId('');
    setAltitude('');
    setInclination('');
    setBallisticCoeff('');
    setOrbitType('LEO');
    setIsOrbitRaising(false);
    setNotes('');
    onClose();
  };

  if (!visible) return null;

  const isValid = name && altitude && inclination;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-solar-bg rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-solar-border">
          <h2 className="text-lg font-semibold text-solar-text">Add Satellite</h2>
          <button onClick={onClose} className="text-solar-text hover:text-solar-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Starlink-1234"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">NORAD ID (optional)</label>
            <input
              type="number"
              value={noradId}
              onChange={(e) => setNoradId(e.target.value)}
              placeholder="e.g., 48274"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-2">Altitude (km) *</label>
              <input
                type="number"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
                placeholder="550"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-2">Inclination (°) *</label>
              <input
                type="number"
                value={inclination}
                onChange={(e) => setInclination(e.target.value)}
                placeholder="53"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">Ballistic Coefficient (kg/m²)</label>
            <input
              type="number"
              value={ballisticCoeff}
              onChange={(e) => setBallisticCoeff(e.target.value)}
              placeholder="e.g., 50"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
            <p className="text-xs text-solar-muted mt-1">
              Used for drag calculations. Lower = more drag.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">Orbit Type</label>
            <div className="flex gap-2">
              {ORBIT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setOrbitType(type)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                    orbitType === type
                      ? 'bg-solar-emerald/20 border-solar-emerald text-solar-emerald'
                      : 'bg-solar-card border-solar-border text-solar-muted'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-solar-text">Orbit Raising Mode</p>
              <p className="text-xs text-solar-muted">
                Enable for newly launched satellites in orbit-raising phase
              </p>
            </div>
            <button
              onClick={() => setIsOrbitRaising(!isOrbitRaising)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isOrbitRaising ? 'bg-amber-500' : 'bg-solar-border'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isOrbitRaising ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mission notes, configuration, etc."
              rows={3}
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald resize-none"
            />
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full bg-solar-emerald text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Satellite
          </button>
        </div>
      </div>
    </div>
  );
}
