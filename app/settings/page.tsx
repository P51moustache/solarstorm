'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Bell, Shield, Moon, Sun, CreditCard, ExternalLink, Settings2, Database, HelpCircle } from 'lucide-react';
import { AppLayout, TopBar } from '@/components/layout';
import { FeatureGate } from '@/components/dashboard/FeatureGate';
import { AlertThresholdSettings } from '@/components/settings/AlertThresholdSettings';
import { ApiKeySettings } from '@/components/settings/ApiKeySettings';
import { useAuthStore } from '@/lib/state/useAuthStore';

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1424] border border-solar-border rounded-lg overflow-hidden">
      {children}
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, action, border = true }: {
  icon: React.ElementType;
  label: string;
  description?: string;
  action: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-4 ${border ? 'border-b border-solar-border' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0a0f1a] rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-solar-muted" />
        </div>
        <div>
          <p className="text-sm font-medium text-solar-text">{label}</p>
          {description && <p className="text-xs text-solar-muted">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors relative ${
        enabled ? 'bg-solar-emerald' : 'bg-solar-border'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
          enabled ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, initialize, signOut, user, tier } = useAuthStore();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleNotificationToggle = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        setNotificationsEnabled(permission === 'granted');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060910] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-solar-emerald border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const tierLabels: Record<string, { name: string; color: string }> = {
    free: { name: 'Free', color: 'text-solar-muted' },
    plus: { name: 'Plus', color: 'text-blue-400' },
    pro: { name: 'Pro', color: 'text-purple-400' },
  };

  const currentTier = tierLabels[tier || 'free'];

  return (
    <AppLayout>
      <TopBar
        title="Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Account Section */}
          <SettingCard>
            <div className="p-4 border-b border-solar-border">
              <h3 className="text-sm font-semibold text-solar-text">Account</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-solar-emerald/20 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-solar-emerald" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-solar-text">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-sm text-solar-muted">
                    <span className={currentTier.color}>{currentTier.name}</span> plan
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 px-4 py-2 bg-solar-emerald/20 text-solar-emerald rounded-lg text-sm font-medium hover:bg-solar-emerald/30 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  {tier === 'free' ? 'Upgrade' : 'Manage Plan'}
                </Link>
              </div>
            </div>
          </SettingCard>

          {/* Preferences */}
          <SettingCard>
            <div className="p-4 border-b border-solar-border">
              <h3 className="text-sm font-semibold text-solar-text">Preferences</h3>
            </div>
            <SettingRow
              icon={Bell}
              label="Push Notifications"
              description="Receive alerts for severe space weather"
              action={<Toggle enabled={notificationsEnabled} onChange={handleNotificationToggle} />}
            />
            <SettingRow
              icon={isDarkMode ? Moon : Sun}
              label="Dark Mode"
              description="Use dark theme (recommended for space weather monitoring)"
              action={<Toggle enabled={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)} />}
              border={false}
            />
          </SettingCard>

          {/* Alert Thresholds - Plus+ feature */}
          <FeatureGate feature="alertConfig" showUpgrade>
            <AlertThresholdSettings />
          </FeatureGate>

          {/* API Access - Pro+ feature */}
          <FeatureGate feature="apiAccess" showUpgrade>
            <ApiKeySettings />
          </FeatureGate>

          {/* Data & Privacy */}
          <SettingCard>
            <div className="p-4 border-b border-solar-border">
              <h3 className="text-sm font-semibold text-solar-text">Data & Privacy</h3>
            </div>
            <SettingRow
              icon={Shield}
              label="Privacy Settings"
              description="Manage data collection preferences"
              action={
                <button className="text-solar-muted hover:text-solar-text transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              }
            />
            <SettingRow
              icon={Database}
              label="Data Sources"
              description="View space weather data providers"
              action={
                <span className="text-xs text-solar-muted">NOAA SWPC, NASA</span>
              }
              border={false}
            />
          </SettingCard>

          {/* Help & Support */}
          <SettingCard>
            <div className="p-4 border-b border-solar-border">
              <h3 className="text-sm font-semibold text-solar-text">Help & Support</h3>
            </div>
            <SettingRow
              icon={HelpCircle}
              label="Documentation"
              description="Learn how to use SolarStorm"
              action={
                <button className="text-solar-muted hover:text-solar-text transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              }
            />
            <SettingRow
              icon={Settings2}
              label="About SolarStorm"
              description="Version and license information"
              action={
                <span className="text-xs text-solar-muted font-mono">v1.0.0</span>
              }
              border={false}
            />
          </SettingCard>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/50 text-red-400 py-3 rounded-lg font-semibold hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
