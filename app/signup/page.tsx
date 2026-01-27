'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Zap, Mail, Lock, ArrowLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/lib/state/useAuthStore';

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, isLoading, error, clearError, isAuthenticated, initialize } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (password !== confirmPassword) {
      return;
    }

    try {
      await signUpWithEmail(email, password);
      setSignupComplete(true);
    } catch {
      // Error is handled by the store
    }
  };

  if (signupComplete) {
    return (
      <main className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-solar-card rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-solar-emerald/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-solar-emerald" />
            </div>
            <h1 className="text-2xl font-bold text-solar-text mb-2">Check your email</h1>
            <p className="text-solar-muted mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account.
            </p>
            <Link
              href="/login"
              className="inline-block bg-solar-emerald text-solar-bg px-6 py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-colors"
            >
              Go to Login
            </Link>
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
            <h1 className="text-2xl font-bold text-solar-text">Create an account</h1>
            <p className="text-solar-muted mt-2">Start tracking aurora for free</p>
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
                  required
                  minLength={8}
                  className="w-full bg-solar-bg border border-solar-border rounded-xl py-3 pl-11 pr-4 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-solar-text mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-solar-muted" />
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-solar-bg border border-solar-border rounded-xl py-3 pl-11 pr-4 text-solar-text placeholder:text-solar-muted focus:outline-none focus:border-solar-emerald transition-colors"
                  placeholder="Confirm your password"
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-bz-negative mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || password !== confirmPassword}
              className="w-full bg-solar-emerald text-solar-bg py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <p className="text-center text-solar-muted mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-solar-emerald hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
