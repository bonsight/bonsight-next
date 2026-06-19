import { NextResponse } from 'next/server';

export function middleware(request) {
  const hostname = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // kai.bonsight.co/acme  →  internal /kai/acme
  // kai.bonsight.co/admin →  internal /kai/admin
  if (hostname.startsWith('kai.') && !pathname.startsWith('/kai')) {
    const url = request.nextUrl.clone();
    url.pathname = `/kai${pathname}`;
    return NextResponse.rewrite(url);
  }

  // aria.bonsight.co/acme  →  internal /aria/acme
  if (hostname.startsWith('aria.') && !pathname.startsWith('/aria')) {
    const url = request.nextUrl.clone();
    url.pathname = `/aria${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Exclude _next assets, static files, and API routes (API calls work as-is)
  matcher: ['/((?!_next|favicon\\.ico|api/).*)'],
};
