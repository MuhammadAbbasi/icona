import { withAuth } from 'next-auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { CORS_HEADERS } from '@/lib/cors';

const authMiddleware = withAuth({
  callbacks: {
    authorized: ({ token }) => !!token && token.invalid !== true && token.status !== 'INACTIVE',
  },
});

// Paths that never require a session cookie.
const PUBLIC_PATHS = [
  '/api/debug',
  '/api/auth/forgot-password',
  '/api/auth/verify-email',
  '/api/boq/template',
  // Pre-login onboarding step (runs after email verification, before signIn).
  // ponytail: authenticated only by orgId knowledge; bind to a signed
  // verification token when the payment provider lands.
  '/api/settings/onboarding',
  '/api/auth/reset-password',
  '/api/mobile/auth/login',
  '/api/mobile/auth/refresh',
];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');

  // CORS preflight — answer immediately so native/web clients can call the API.
  if (isApi && req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const withCors = (res: NextResponse) => {
    if (isApi) for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
    return res;
  };

  // Fully public paths bypass auth.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return withCors(NextResponse.next());
  }

  // Bearer-authenticated API requests (the Android app) skip the cookie middleware;
  // the route handler validates the token via getApiUser and enforces its own role
  // gate. An invalid token simply reaches the route and gets a 401/403 there.
  const authz = req.headers.get('authorization');
  if (isApi && authz?.startsWith('Bearer ')) {
    return withCors(NextResponse.next());
  }

  // Everything else uses the NextAuth cookie middleware (the web app).
  return (authMiddleware as any)(req);
}

export const config = {
  matcher: [
    '/board/:path*',
    '/projects/:path*',
    '/companies/:path*',
    '/ledger/:path*',
    '/finance/:path*',
    '/overheads/:path*',
    '/teams/:path*',
    '/team/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
};
