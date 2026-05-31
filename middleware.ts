import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Dev mode bypass for testing (only in development)
const DEV_BYPASS_AUTH = process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === 'true';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/globe',
  '/locations',
  '/history',
  '/satellites',
  '/satellite-dashboard',
  '/gnss-dashboard',
  '/settings',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // In dev bypass mode, allow access to protected routes but don't redirect from auth routes
  // This lets developers test all pages without real Supabase auth
  if (DEV_BYPASS_AUTH) {
    return res;
  }

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
