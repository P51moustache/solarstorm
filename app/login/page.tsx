'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Zap, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/state/useAuthStore';

// Check if dev bypass is enabled (don't redirect in this case)
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithMagicLink, isLoading, error, clearError, isAuthenticated, initialize } = useAuthStore();
  const hasRedirected = useRef(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Don't redirect in dev bypass mode - let developers test the login UI
    if (DEV_BYPASS_AUTH) return;

    if (isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (useMagicLink) {
        await signInWithMagicLink(email);
        setMagicLinkSent(true);
      } else {
        await signInWithEmail(email, password);
        router.push('/dashboard');
      }
    } catch {
      // Error is handled by the store
    }
  };

  if (magicLinkSent) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-solar-card rounded-2xl p-8 text-center">
            <Mail className="w-12 h-12 text-solar-emerald mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-solar-text mb-2">Check your email</h1>
            <p className="text-solar-muted mb-6">
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
            <button
              onClick={() => setMagicLinkSent(false)}
              className="text-solar-emerald hover:underline"
            >
              Try a different email
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-solar-muted hover:text-solar-text mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-solar-card rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Zap className="w-8 h-8 text-solar-emerald" />
              <span className="text-xl font-bold text-solar-text">SolarStorm</span>
            </div>
            <h1 className="text-2xl font-bold text-solar-text">Welcome back</h1>
            <p className="text-solar-muted mt-2">Sign in to your account</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-bz-negative/20 border border-bz-negative rounded-xl p-3 mb-6">
              <p className="text-sm text-bz-negative">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-solar-text mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-solar-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-solar-bg border border-solar-border rounded-xl py-3 pl-11 pr-4 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!useMagicLink && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-solar-text mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-solar-muted" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!useMagicLink}
                    className="w-full bg-solar-bg border border-solar-border rounded-xl py-3 pl-11 pr-4 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald transition-colors"
                    placeholder="Your password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-solar-emerald text-solar-bg py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : useMagicLink ? 'Send Magic Link' : 'Sign In'}
            </button>
          </form>

          {/* Toggle magic link */}
          <button
            onClick={() => setUseMagicLink(!useMagicLink)}
            className="w-full text-center text-sm text-solar-muted hover:text-solar-emerald mt-4 transition-colors"
          >
            {useMagicLink ? 'Sign in with password instead' : 'Sign in with magic link'}
          </button>

          {/* Sign up link */}
          <p className="text-center text-solar-muted mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-solar-emerald hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
