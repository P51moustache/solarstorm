'use client';

interface KpiCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  delta?: string;
  color?: string;
  subtitle?: string;
}

export function KpiCard({ label, value, unit, delta, color, subtitle }: KpiCardProps) {
  const displayValue = value !== null ? value : '--';

  return (
    <div className="bg-solar-card rounded-2xl p-3 flex-1 shadow-card">
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-solar-muted mb-1 text-center">
          {label}
        </span>
        <div className="flex items-baseline mb-0.5">
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: color || '#E6ECFF' }}
          >
            {displayValue}
          </span>
          {unit && (
            <span className="text-xs font-medium text-solar-muted ml-0.5">
              {unit}
            </span>
          )}
        </div>
        {delta && (
          <span className="text-[10px] text-solar-muted mt-0.5">{delta}</span>
        )}
        {subtitle && (
          <span className="text-[10px] text-solar-muted text-center mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
