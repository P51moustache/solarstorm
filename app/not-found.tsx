import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-solar-card rounded-2xl p-8">
          <Search className="w-16 h-16 text-solar-muted mx-auto mb-4" />
          <h1 className="text-6xl font-bold text-solar-text mb-2">404</h1>
          <h2 className="text-xl font-semibold text-solar-text mb-2">
            Page Not Found
          </h2>
          <p className="text-solar-muted mb-6">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-solar-emerald text-solar-bg px-6 py-3 rounded-xl font-semibold hover:bg-opacity-90 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
