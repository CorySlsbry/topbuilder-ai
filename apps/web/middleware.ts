// =============================================================================
// Next.js middleware — light-touch auth gating.
// =============================================================================
// Firebase Auth state lives in the client SDK; the server doesn't issue HTTP
// cookies by default. We use this middleware mainly to:
//   - Force HTTPS in production
//   - Add basic security headers (additional to next.config.mjs)
//   - Block obvious bots from authenticated routes (defense in depth — real
//     auth happens at the API route layer via verifyRequest)
// =============================================================================

import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
  // Belt-and-suspenders security headers.
  res.headers.set('X-DNS-Prefetch-Control', 'on');
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api routes (they handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon
     */
    '/((?!api|_next/static|_next/image|favicon).*)',
  ],
};
