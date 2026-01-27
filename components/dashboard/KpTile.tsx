'use client';

import { useEffect, useState } from 'react';
import { getKpColor } from '@/lib/util/colors';
import { formatTimeAgo } from '@/lib/util/time';

interface KpTileProps {
  kp: number | null;
  updatedAt: string | null;
  bz: number | null;
  speed: number | null;
}

export function KpTile({ kp, updatedAt, bz, speed }: KpTileProps) {
  const [isShimmering, setIsShimmering] = useState(false);

  // Trigger shimmer animation when conditions are met
  useEffect(() => {
    if (bz !== null && speed !== null && bz < 0 && speed > 500) {
      setIsShimmering(true);
    } else {
      setIsShimmering(false);
    }
  }, [bz, speed]);

  const kpValue = kp ?? 0;
  const backgroundColor = getKpColor(kpValue);
  const timeAgo = updatedAt ? formatTimeAgo(updatedAt) : 'No data';

  return (
    <div
      className={`rounded-3xl shadow-tile transition-transform duration-1000 ${
        isShimmering ? 'animate-pulse scale-[1.02]' : ''
      }`}
      role="region"
      aria-label={`Kp index ${kp?.toFixed(1) ?? 'unknown'}, updated ${timeAgo}`}
    >
      <div
        className="rounded-3xl p-6 min-h-[120px]"
        style={{
          background: `linear-gradient(135deg, ${backgroundColor}, ${backgroundColor}80)`,
        }}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <span className="text-base font-medium text-solar-text opacity-90 mb-1">
            Kp Now
          </span>
          <span className="text-5xl font-bold text-solar-text mb-1 tabular-nums">
            {kp !== null ? kp.toFixed(1) : '--'}
          </span>
          <span className="text-xs text-solar-text opacity-70 text-center">
            Updated {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
}
