'use client';

import { useEffect, useState } from 'react';
import { MapPin, Compass } from 'lucide-react';
import { useLocationStore } from '@/lib/state/useLocationStore';
import { useSolarStormStore } from '@/lib/state/useStore';
import { calculateAuroraProbability, type AuroraPrediction } from '@/lib/services/auroraProbability';

export function LocationPrediction() {
  const { currentLocation, magneticLatitude, fetchCurrentLocation } = useLocationStore();
  const { kp, bz, speed } = useSolarStormStore();
  const [prediction, setPrediction] = useState<AuroraPrediction | null>(null);

  useEffect(() => {
    if (!currentLocation) {
      fetchCurrentLocation();
    }
  }, [currentLocation, fetchCurrentLocation]);

  useEffect(() => {
    if (currentLocation && kp !== null && bz !== null && speed !== null) {
      const pred = calculateAuroraProbability(
        currentLocation.lat,
        currentLocation.lng,
        kp,
        bz,
        speed
      );
      setPrediction(pred);
    }
  }, [currentLocation, kp, bz, speed]);

  if (!currentLocation) {
    return (
      <div className="bg-solar-card rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <MapPin className="w-5 h-5 text-solar-emerald" />
          <h3 className="text-base font-semibold text-solar-text">Your Location</h3>
        </div>
        <button
          onClick={() => fetchCurrentLocation()}
          className="w-full bg-solar-emerald/20 text-solar-emerald py-2 px-4 rounded-xl text-sm font-medium hover:bg-solar-emerald/30 transition-colors"
        >
          Enable Location
        </button>
        <p className="text-xs text-solar-muted mt-2 text-center">
          Get personalized aurora forecasts
        </p>
      </div>
    );
  }

  const probabilityColor =
    prediction && prediction.probability >= 50 ? 'text-solar-emerald' :
    prediction && prediction.probability >= 25 ? 'text-aurora-high' :
    'text-solar-muted';

  return (
    <div className="bg-solar-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-solar-emerald" />
          <h3 className="text-base font-semibold text-solar-text">Your Forecast</h3>
        </div>
        {magneticLatitude !== null && (
          <div className="flex items-center gap-1 text-xs text-solar-muted">
            <Compass className="w-3 h-3" />
            <span>{Math.abs(magneticLatitude).toFixed(1)}°</span>
          </div>
        )}
      </div>

      {prediction ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-4xl font-bold ${probabilityColor}`}>
              {prediction.probability}%
            </span>
            <span className="text-sm text-solar-muted">chance</span>
          </div>
          <p className="text-sm text-solar-muted mb-3">{prediction.description}</p>
          {prediction.bestViewingTime && (
            <p className="text-xs text-solar-emerald">
              Best viewing: {prediction.bestViewingTime}
            </p>
          )}
        </>
      ) : (
        <div className="h-20 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
