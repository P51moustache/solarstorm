'use client';

import { useState } from 'react';
import { X, MapPin, Check, Square } from 'lucide-react';
import { useLocationStore } from '@/lib/state/useLocationStore';

interface AddLocationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddLocationModal({ visible, onClose }: AddLocationModalProps) {
  const [label, setLabel] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addLocation, currentLocation } = useLocationStore();

  const resetForm = () => {
    setLabel('');
    setLat('');
    setLng('');
    setIsPrimary(false);
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setLat(currentLocation.lat.toFixed(6));
      setLng(currentLocation.lng.toFixed(6));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (!label.trim() || isNaN(latNum) || isNaN(lngNum)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addLocation(label.trim(), latNum, lngNum, isPrimary);
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isValid =
    label.trim().length > 0 &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lng)) &&
    parseFloat(lat) >= -90 &&
    parseFloat(lat) <= 90 &&
    parseFloat(lng) >= -180 &&
    parseFloat(lng) <= 180;

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-solar-bg rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-solar-border">
          <h2 className="text-xl font-semibold text-solar-text">Add Location</h2>
          <button onClick={handleClose} className="p-1 text-solar-text hover:text-solar-muted">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-solar-text mb-1.5">
              Location Name
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Home, Cabin, Favorite Spot"
              className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-1.5">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="-90 to 90"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-solar-text mb-1.5">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-180 to 180"
                className="w-full bg-solar-card border border-solar-border rounded-lg px-3 py-2.5 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald"
              />
            </div>
          </div>

          {currentLocation && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex items-center gap-2 text-solar-emerald hover:underline"
            >
              <MapPin className="w-4 h-4" />
              Use Current Location
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsPrimary(!isPrimary)}
            className="flex items-center gap-3 py-2"
          >
            {isPrimary ? (
              <Check className="w-6 h-6 text-solar-emerald" />
            ) : (
              <Square className="w-6 h-6 text-solar-muted" />
            )}
            <span className="text-sm text-solar-text">Set as primary location</span>
          </button>

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full bg-solar-emerald text-solar-bg py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Location'}
          </button>
        </form>
      </div>
    </div>
  );
}
