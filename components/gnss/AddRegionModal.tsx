'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddRegionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (region: {
    label: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    is_primary: boolean;
  }) => void;
}

export function AddRegionModal({ visible, onClose, onAdd }: AddRegionModalProps) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState('500');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleAdd = () => {
    if (!label || !lat || !lng) return;

    onAdd({
      label,
      center_lat: parseFloat(lat),
      center_lng: parseFloat(lng),
      radius_km: parseFloat(radius) || 500,
      is_primary: isPrimary,
    });

    setLabel('');
    setLat('');
    setLng('');
    setRadius('500');
    setIsPrimary(false);
    onClose();
  };

  if (!visible) return null;

  const isValid = label && lat && lng;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
      <div className="bg-solar-bg rounded-t-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-solar-border">
          <h2 className="text-lg font-semibold text-solar-text">Add GNSS Region</h2>
          <button onClick={onClose} className="text-solar-text hover:text-solar-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">
              Region Name *
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Denver Metro"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-2">
                Latitude *
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="39.7392"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-2">
                Longitude *
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-104.9903"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-solar-text mb-2">
              Radius (km)
            </label>
            <input
              type="number"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="500"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
            <p className="text-xs text-solar-muted mt-1">
              Area to monitor for localized TEC and scintillation
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-solar-text">Primary Region</p>
              <p className="text-xs text-solar-muted">Used for scintillation forecasts</p>
            </div>
            <button
              onClick={() => setIsPrimary(!isPrimary)}
              className={`w-12 h-6 rounded-full transition-colors ${
                isPrimary ? 'bg-solar-emerald' : 'bg-solar-border'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  isPrimary ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full bg-solar-emerald text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Region
          </button>
        </div>
      </div>
    </div>
  );
}
