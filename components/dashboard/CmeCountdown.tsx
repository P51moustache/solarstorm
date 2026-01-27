'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { getCmeCountdown } from '@/lib/api/cme';
import type { CmeCountdownData } from '@/lib/api/parsers/cme';

export function CmeCountdown() {
  const [data, setData] = useState<CmeCountdownData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getCmeCountdown();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch CME data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-solar-card rounded-2xl p-4">
        <div className="flex items-center justify-center h-20">
          <div className="w-6 h-6 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data?.nextArrival) {
    return (
      <div className="bg-solar-card rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-solar-emerald" />
          <h3 className="text-base font-semibold text-solar-text">CME Watch</h3>
        </div>
        <p className="text-sm text-solar-muted">
          No Earth-directed CMEs currently expected
        </p>
        {data?.recentCmes && data.recentCmes.length > 0 && (
          <p className="text-xs text-solar-muted mt-2">
            {data.recentCmes.length} CME{data.recentCmes.length > 1 ? 's' : ''} observed in last 30 days
          </p>
        )}
      </div>
    );
  }

  const hours = data.hoursUntilArrival ?? 0;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);

  return (
    <div className="bg-solar-card rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <Zap className="w-5 h-5 text-aurora-high" />
        <h3 className="text-base font-semibold text-solar-text">CME Incoming</h3>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {days > 0 && (
          <>
            <span className="text-3xl font-bold text-aurora-high">{days}</span>
            <span className="text-sm text-solar-muted">day{days > 1 ? 's' : ''}</span>
          </>
        )}
        <span className="text-3xl font-bold text-aurora-high">{remainingHours}</span>
        <span className="text-sm text-solar-muted">hour{remainingHours !== 1 ? 's' : ''}</span>
      </div>

      <p className="text-xs text-solar-muted">
        Expected arrival: {data.nextArrival.arrivalTime ? new Date(data.nextArrival.arrivalTime).toLocaleString() : 'Unknown'}
      </p>
    </div>
  );
}
