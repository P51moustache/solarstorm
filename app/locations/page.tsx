'use client';

import { useEffect, useState } from 'react';
import { MapPin, Plus, Star, Trash2, Globe, Compass } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { calculateMagneticLatitude } from '@/lib/services/location';
import { AddLocationModal } from '@/components/locations/AddLocationModal';

export default function LocationsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const {
    savedLocations,
    primaryLocation,
    currentLocation,
    fetchSavedLocations,
    fetchCurrentLocation,
    removeLocation,
    setPrimaryLocation,
  } = useLocationStore();

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingLocations(true);
      await fetchSavedLocations();
      setIsLoadingLocations(false);
      // Fetch current location separately (can take time due to permission prompt)
      fetchCurrentLocation();
    };
    loadData();
  }, [fetchSavedLocations, fetchCurrentLocation]);

  const handleDelete = (id: string, label: string) => {
    if (confirm(`Remove "${label}" from saved locations?`)) {
      removeLocation(id);
    }
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryLocation(id);
  };

  const handleRefresh = async () => {
    await fetchSavedLocations();
    await fetchCurrentLocation();
  };

  return (
    <FeatureGate feature="locationPredictions">
      <AppLayout>
        <TopBar
          title="Location Management"
          subtitle="Configure observation sites for aurora predictions"
          onRefresh={handleRefresh}
        />

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Locations List */}
            <div className="col-span-2 space-y-6">
              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-solar-muted">
                    {savedLocations.length} saved location{savedLocations.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-solar-emerald text-solar-bg rounded-lg text-sm font-medium hover:bg-solar-emerald/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Location
                </button>
              </div>

              {/* Locations Table */}
              {isLoadingLocations ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
                </div>
              ) : savedLocations.length === 0 ? (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg p-12 text-center">
                  <MapPin className="w-12 h-12 text-solar-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-solar-text mb-2">No saved locations</h3>
                  <p className="text-sm text-solar-muted mb-6 max-w-md mx-auto">
                    Add your observation sites to receive personalized aurora visibility predictions based on your geographic and magnetic latitude.
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-6 py-2.5 bg-solar-emerald text-solar-bg rounded-lg text-sm font-semibold hover:bg-solar-emerald/90"
                  >
                    Add Your First Location
                  </button>
                </div>
              ) : (
                <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-solar-border">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Coordinates</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Magnetic Lat</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-solar-muted uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-solar-muted uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-solar-border">
                      {savedLocations.map((location) => {
                        const magLat = calculateMagneticLatitude(location.lat, location.lng);
                        const isPrimary = location.id === primaryLocation?.id;

                        return (
                          <tr key={location.id} className="hover:bg-[#0a0f1a] transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isPrimary ? 'bg-solar-emerald/20' : 'bg-solar-card'
                                }`}>
                                  <MapPin className={`w-4 h-4 ${isPrimary ? 'text-solar-emerald' : 'text-solar-muted'}`} />
                                </div>
                                <span className="text-sm font-medium text-solar-text">{location.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-solar-muted font-mono">
                                {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-mono ${
                                Math.abs(magLat) >= 60 ? 'text-green-400' :
                                Math.abs(magLat) >= 50 ? 'text-yellow-400' :
                                'text-orange-400'
                              }`}>
                                {magLat.toFixed(1)}°
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {isPrimary ? (
                                <span className="px-2 py-0.5 bg-solar-emerald/20 text-solar-emerald text-xs font-medium rounded border border-solar-emerald/50">
                                  Primary
                                </span>
                              ) : (
                                <span className="text-xs text-solar-muted">Secondary</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!isPrimary && (
                                  <button
                                    onClick={() => handleSetPrimary(location.id)}
                                    className="p-1.5 text-solar-muted hover:text-solar-emerald transition-colors"
                                    title="Set as primary"
                                  >
                                    <Star className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(location.id, location.label)}
                                  className="p-1.5 text-solar-muted hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column - Info Cards */}
            <div className="space-y-6">
              {/* Current Location */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Compass className="w-4 h-4" />
                  Current Location
                </h3>
                {currentLocation ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Latitude</span>
                      <span className="text-solar-text font-mono">{currentLocation.lat.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Longitude</span>
                      <span className="text-solar-text font-mono">{currentLocation.lng.toFixed(4)}°</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-solar-muted">Magnetic Lat</span>
                      <span className="text-solar-text font-mono">
                        {calculateMagneticLatitude(currentLocation.lat, currentLocation.lng).toFixed(1)}°
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-solar-muted text-center py-4">
                    Location not available
                  </p>
                )}
              </div>

              {/* Magnetic Latitude Guide */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Magnetic Latitude Guide
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded">
                    <span className="text-solar-muted">Auroral Zone</span>
                    <span className="text-green-400 font-mono">65-72°</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded">
                    <span className="text-solar-muted">High Probability</span>
                    <span className="text-green-400 font-mono">60-65°</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded">
                    <span className="text-solar-muted">Moderate (Kp 5+)</span>
                    <span className="text-yellow-400 font-mono">50-60°</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded">
                    <span className="text-solar-muted">Low (Kp 7+)</span>
                    <span className="text-orange-400 font-mono">40-50°</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded">
                    <span className="text-solar-muted">Rare Events Only</span>
                    <span className="text-red-400 font-mono">&lt; 40°</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-solar-text mb-3">Tips</h3>
                <ul className="space-y-2 text-xs text-solar-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-solar-emerald">•</span>
                    <span>Set your primary observation site for dashboard predictions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solar-emerald">•</span>
                    <span>Higher magnetic latitude = higher aurora probability</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-solar-emerald">•</span>
                    <span>Add multiple locations to compare visibility conditions</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <AddLocationModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
          />
        </div>
      </AppLayout>
    </FeatureGate>
  );
}
