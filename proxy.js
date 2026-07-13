import { NextResponse } from 'next/server';

const locales = ['es', 'en'];
const defaultLocale = 'en';

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(request) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // ── kai.bonsight.co ───────────────────────────────────────
  if (host.startsWith('kai.')) {
    const url = request.nextUrl.clone();

    // Login page — always accessible
    if (pathname === '/login') {
      url.pathname = '/kai/login';
      return NextResponse.rewrite(url);
    }

    // Admin routes — require global KAI_ACCESS_CODE
    if (pathname === '/' || pathname.startsWith('/admin')) {
      const expected = await sha256Hex(process.env.KAI_ACCESS_CODE || '');
      const isAuthed = request.cookies.get('kai_auth')?.value === expected;
      if (!isAuthed) {
        url.pathname = '/kai/login';
        return NextResponse.rewrite(url);
      }
      url.pathname = pathname === '/' ? '/kai' : `/kai${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Tenant routes (/[slug], /[slug]/*) — per-tenant auth handled at page level
    url.pathname = `/kai${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── aria.bonsight.co ──────────────────────────────────────
  if (host.startsWith('aria.')) {
    const url = request.nextUrl.clone();

    // Login page — always accessible
    if (pathname === '/login') {
      url.pathname = '/aria/login';
      return NextResponse.rewrite(url);
    }

    // Root and admin — require global ARIA_ACCESS_CODE
    if (pathname === '/' || pathname.startsWith('/admin')) {
      const expected = await sha256Hex(process.env.ARIA_ACCESS_CODE || '');
      const isAuthed = request.cookies.get('aria_auth')?.value === expected;
      if (!isAuthed) {
        url.pathname = '/aria/login';
        return NextResponse.rewrite(url);
      }
      url.pathname = pathname === '/' ? '/aria' : `/aria${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Tenant routes — per-tenant auth handled at page level
    url.pathname = `/aria${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── Main site — locale routing ────────────────────────────
  const hasLocale = locales.some(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  );

  if (hasLocale) {
    const locale = locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`);
    const basePath = pathname.slice(`/${locale}`.length) || '';
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-locale', locale);
    requestHeaders.set('x-pathname', basePath);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|aria|kai|quiniela|proposals|assets|_next/static|_next/image|favicon\\.svg|logo\\.svg|hero_home\\.png|.*\\.ico|sitemap\\.xml|robots\\.txt).*)'],
};
