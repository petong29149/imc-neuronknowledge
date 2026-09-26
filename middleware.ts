import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'neuronknowledge_imc_secure_jwt_secret_key_2026_enterprise'
);

const COOKIE_NAME = 'auth_token';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let sessionUser: { id: number; name: string; email: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload && payload.id && payload.role) {
        sessionUser = {
          id: Number(payload.id),
          name: String(payload.name || ''),
          email: String(payload.email || ''),
          role: String(payload.role),
        };
      }
    } catch {
      // Invalid/expired token
      sessionUser = null;
    }
  }

  // 1. Protect Admin routes (/admin and /admin/*)
  if (pathname.startsWith('/admin')) {
    if (!sessionUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (sessionUser.role !== 'admin') {
      const forbiddenUrl = new URL('/forbidden', request.url);
      return NextResponse.redirect(forbiddenUrl);
    }
  }

  // 2. Protect Chat routes (require login)
  if (pathname.startsWith('/chat')) {
    if (!sessionUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Redirect logged-in users away from /login and /register
  if (pathname === '/login' || pathname === '/register') {
    if (sessionUser) {
      if (sessionUser.role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/chat', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/chat/:path*', '/chat', '/login', '/register'],
};
