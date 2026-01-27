'use client';

import Link from 'next/link';
import { ArrowRight, Globe, Zap, Bell, BarChart3 } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen gradient-bg">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-solar-emerald" />
          <span className="text-xl font-bold text-solar-text">SolarStorm</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-solar-muted hover:text-solar-text transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-solar-emerald text-solar-bg px-4 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-solar-text mb-6">
          Track Aurora & Space Weather
          <span className="text-solar-emerald block mt-2">In Real-Time</span>
        </h1>
        <p className="text-xl text-solar-muted max-w-2xl mx-auto mb-10">
          Get live Kp index updates, solar wind data, and aurora probability maps.
          Never miss the northern lights again.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-solar-emerald text-solar-bg px-8 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/pricing"
            className="border border-solar-border text-solar-text px-8 py-4 rounded-xl font-semibold text-lg hover:bg-solar-card transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-solar-text text-center mb-16">
          Everything You Need to Chase Aurora
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={<BarChart3 className="w-8 h-8" />}
            title="Real-Time Kp Index"
            description="Live Kp index tracking with historical trends and forecasts."
          />
          <FeatureCard
            icon={<Globe className="w-8 h-8" />}
            title="3D Aurora Globe"
            description="Interactive 3D visualization of aurora coverage worldwide."
          />
          <FeatureCard
            icon={<Bell className="w-8 h-8" />}
            title="Smart Alerts"
            description="Get notified when aurora conditions are optimal for your location."
          />
          <FeatureCard
            icon={<Zap className="w-8 h-8" />}
            title="Solar Wind Data"
            description="Track solar wind speed, Bz component, and plasma density."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-solar-card">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-solar-text mb-4">
            Ready to Start Tracking?
          </h2>
          <p className="text-solar-muted mb-8">
            Join thousands of aurora enthusiasts and space weather watchers.
          </p>
          <Link
            href="/signup"
            className="bg-solar-emerald text-solar-bg px-8 py-4 rounded-xl font-semibold text-lg hover:bg-opacity-90 transition-colors inline-flex items-center gap-2"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-solar-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-solar-emerald" />
            <span className="font-semibold text-solar-text">SolarStorm</span>
          </div>
          <p className="text-solar-muted text-sm">
            Data from NOAA Space Weather Prediction Center
          </p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6">
      <div className="text-solar-emerald mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-solar-text mb-2">{title}</h3>
      <p className="text-solar-muted text-sm">{description}</p>
    </div>
  );
}
