import { NextResponse } from 'next/server';

const locales = ['es', 'en'];
const defaultLocale = 'en';

export function middleware(request) {
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
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.svg|logo\\.svg|hero_home\\.png|.*\\.ico|sitemap\\.xml|robots\\.txt).*)'],
};
