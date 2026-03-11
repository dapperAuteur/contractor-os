// File: middleware.ts
// Protects dashboard/admin routes, refreshes auth tokens

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars in middleware');
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    console.error('Middleware: failed to get user session');
    return response;
  }
  const { pathname } = request.nextUrl;

  // Admin guard — must be authenticated AND match ADMIN_EMAIL
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/dashboard/contractor', request.url));
    }
    return response;
  }

  // Blog dashboard — admin only (locked for now, can unlock later)
  if (pathname.startsWith('/dashboard/blog')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/dashboard/contractor', request.url));
    }
    return response;
  }

  // Dashboard routes require auth
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/signup'],
};
