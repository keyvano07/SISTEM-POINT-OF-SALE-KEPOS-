import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('pos_token')?.value;
  const { pathname } = request.nextUrl;

  // Define public paths that don't need auth (auth routes & landing page)
  const isPublicPath = pathname === '/login' || pathname === '/register-tenant' || pathname === '/' || pathname.startsWith('/kiosk');

  // If user has no token and is trying to access a protected path, redirect to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user has a token and is trying to access login, redirect to dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
