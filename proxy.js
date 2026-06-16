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

  if (host.startsWith('aria.')) {
    const { pathname } = request.nextUrl;
    const expected = await sha256Hex(process.env.ARIA_ACCESS_CODE || '');
    const isAuthed = request.cookies.get('aria_auth')?.value === expected;
    const isLogin = pathname === '/login';

    const url = request.nextUrl.clone();
    url.pathname = (isAuthed || isLogin)
      ? `/aria${pathname === '/' ? '' : pathname}`
      : '/aria/login';
    return NextResponse.rewrite(url);
  }

  const { pathname } = request.nextUrl;

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
  matcher: ['/((?!api|quiniela|_next/static|_next/image|favicon\\.svg|logo\\.svg|hero_home\\.png|.*\\.ico|sitemap\\.xml|robots\\.txt).*)'],
};
