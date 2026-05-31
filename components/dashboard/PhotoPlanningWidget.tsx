'use client';

import { useEffect, useState } from 'react';
import { Camera, Cloud, Moon, Sun, Sparkles, MapPin } from 'lucide-react';
import { getWeatherData, getPhotoConditions, type WeatherData } from '@/lib/services/weather';
import { useLocationStore } from '@/lib/state/useLocationStore';

interface PhotoConditions {
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  factors: Array<{ label: string; status: 'good' | 'fair' | 'poor'; note: string }>;
}

export function PhotoPlanningWidget() {
  const { savedLocations, primaryLocation } = useLocationStore();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [conditions, setConditions] = useState<PhotoConditions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auroraProbability, setAuroraProbability] = useState(30);

  const location = primaryLocation || savedLocations[0];

  useEffect(() => {
    async function fetchData() {
      if (!location) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const weatherData = await getWeatherData(location.lat, location.lng);
        if (weatherData) {
          setWeather(weatherData);
          const photoConditions = getPhotoConditions(weatherData, auroraProbability);
          setConditions(photoConditions);
        }
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [location, auroraProbability]);

  const getOverallColor = (overall: string) => {
    switch (overall) {
      case 'excellent':
        return 'text-green-400';
      case 'good':
        return 'text-emerald-400';
      case 'fair':
        return 'text-yellow-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-solar-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'fair':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-solar-border text-solar-muted';
    }
  };

  const getFactorIcon = (label: string) => {
    switch (label) {
      case 'Sky':
        return Cloud;
      case 'Moon':
        return Moon;
      case 'Aurora':
        return Sparkles;
      default:
        return Sun;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="text-sm font-semibold text-solar-text">Photo Planning</h3>
        </div>
        <div className="text-center py-4">
          <MapPin className="w-8 h-8 text-solar-muted mx-auto mb-2" />
          <p className="text-sm text-solar-muted">Add a location to see photo conditions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <Camera className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-solar-text">Photo Planning</h3>
            <p className="text-xs text-solar-muted">{location.label}</p>
          </div>
        </div>
        {conditions && (
          <span className={`text-sm font-semibold capitalize ${getOverallColor(conditions.overall)}`}>
            {conditions.overall}
          </span>
        )}
      </div>

      {/* Conditions factors */}
      {conditions && (
        <div className="space-y-3 mb-4">
          {conditions.factors.map((factor) => {
            const Icon = getFactorIcon(factor.label);
            return (
              <div
                key={factor.label}
                className="flex items-center justify-between p-2 bg-[#0a0f1a] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-solar-muted" />
                  <span className="text-sm text-solar-text">{factor.label}</span>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(factor.status)}`}
                >
                  {factor.note}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Timing info */}
      {weather && (
        <div className="pt-3 border-t border-solar-border">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs text-solar-muted">Sunset</p>
                <p className="text-solar-text font-mono">
                  {weather.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-xs text-solar-muted">Sunrise</p>
                <p className="text-solar-text font-mono">
                  {weather.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Best viewing window */}
      {conditions?.overall !== 'poor' && (
        <div className="mt-3 p-2 bg-solar-emerald/10 border border-solar-emerald/30 rounded-lg">
          <p className="text-xs text-solar-emerald text-center">
            Best viewing: 2-3 hours after sunset
          </p>
        </div>
      )}
    </div>
  );
}
