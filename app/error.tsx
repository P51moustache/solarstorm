'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-solar-card rounded-2xl p-8">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-solar-text mb-2">
            Something went wrong
          </h1>
          <p className="text-solar-muted mb-6">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          {error.digest && (
            <p className="text-xs text-solar-muted mb-4 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-solar-emerald text-solar-bg px-6 py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
