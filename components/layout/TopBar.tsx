'use client';

import { RefreshCw, Bell, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopBarProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<void>;
  lastUpdated?: string | null;
}

export function TopBar({ title, subtitle, onRefresh, lastUpdated }: TopBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="h-16 bg-[#0a0f1a] border-b border-solar-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold text-solar-text">{title}</h1>
        {subtitle && <p className="text-sm text-solar-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Live clock */}
        <div className="flex items-center gap-2 text-solar-muted">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono">{currentTime} UTC</span>
        </div>

        {/* Last updated */}
        {lastUpdated && (
          <div className="text-sm text-solar-muted">
            Last sync: <span className="text-solar-text">{lastUpdated}</span>
          </div>
        )}

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 bg-solar-card border border-solar-border rounded-lg text-sm text-solar-muted hover:text-solar-text hover:border-solar-emerald/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-solar-muted hover:text-solar-text transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-solar-emerald rounded-full" />
        </button>
      </div>
    </header>
  );
}
