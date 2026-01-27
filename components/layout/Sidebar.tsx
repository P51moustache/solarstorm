'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  MapPin,
  BarChart3,
  Satellite,
  Radio,
  Settings,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/lib/state/useAuthStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Aurora Globe', href: '/globe', icon: Globe },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Historical Data', href: '/history', icon: BarChart3 },
  { name: 'Satellite Fleet', href: '/satellites', icon: Satellite },
  { name: 'Satellite Ops', href: '/satellite-dashboard', icon: Radio },
  { name: 'GNSS Monitor', href: '/gnss-dashboard', icon: Radio },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user, tier } = useAuthStore();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0a0f1a] border-r border-solar-border flex flex-col transition-all duration-200 z-50 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-solar-border">
        <Zap className="w-8 h-8 text-solar-emerald flex-shrink-0" />
        {!collapsed && (
          <span className="ml-3 text-xl font-bold text-solar-text">SolarStorm</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-solar-emerald/20 text-solar-emerald'
                      : 'text-solar-muted hover:bg-solar-card hover:text-solar-text'
                  }`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-solar-border p-4">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-solar-text truncate">
              {user?.email || 'User'}
            </p>
            <p className="text-xs text-solar-muted capitalize">{tier} Plan</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-solar-muted hover:bg-solar-card hover:text-solar-text transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Settings</span>}
          </Link>
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-solar-muted hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-solar-card border border-solar-border rounded-full flex items-center justify-center text-solar-muted hover:text-solar-text transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
