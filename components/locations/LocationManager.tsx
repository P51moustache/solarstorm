'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { calculateMagneticLatitude } from '@/lib/services/location';
import { AddLocationModal } from './AddLocationModal';

export function LocationManager() {
  const [showAddModal, setShowAddModal] = useState(false);
  const {
    savedLocations,
    primaryLocation,
    isLoading,
    fetchSavedLocations,
    fetchCurrentLocation,
    removeLocation,
    setPrimaryLocation,
  } = useLocationStore();

  useEffect(() => {
    fetchSavedLocations();
    fetchCurrentLocation();
  }, [fetchSavedLocations, fetchCurrentLocation]);

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Are you sure you want to remove "${label}"?`)) {
      removeLocation(id);
    }
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryLocation(id);
  };

  return (
    <FeatureGate feature="locationPredictions">
      <div className="min-h-screen gradient-bg">
        <div className="flex items-center justify-between p-4 border-b border-solar-border">
          <h1 className="text-xl font-semibold text-solar-text">Saved Locations</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 text-solar-emerald hover:text-solar-text"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedLocations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-3">
            <MapPin className="w-12 h-12 text-solar-muted" />
            <p className="text-lg font-medium text-solar-text">No saved locations</p>
            <p className="text-sm text-solar-muted text-center">
              Add locations to get personalized aurora predictions
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 bg-solar-emerald text-solar-bg px-5 py-2.5 rounded-lg font-semibold hover:bg-opacity-90"
            >
              Add Your First Location
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {savedLocations.map((item) => {
              const magLat = calculateMagneticLatitude(item.lat, item.lng);
              const isPrimary = item.id === primaryLocation?.id;

              return (
                <div key={item.id} className="bg-solar-card rounded-xl p-4">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-semibold text-solar-text">
                          {item.label}
                        </span>
                        {isPrimary && (
                          <span className="bg-solar-emerald/30 text-solar-emerald text-xs font-semibold px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-solar-muted">
                        {item.lat.toFixed(4)}°, {item.lng.toFixed(4)}°
                      </p>
                      <p className="text-xs text-solar-muted">
                        Magnetic Lat: {magLat.toFixed(1)}°
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      {!isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(item.id)}
                          className="p-2 text-solar-muted hover:text-solar-text"
                        >
                          <Star className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id, item.label)}
                        className="p-2 text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AddLocationModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      </div>
    </FeatureGate>
  );
}
