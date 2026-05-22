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
    const res = NextResponse.next();
    res.headers.set('x-locale', locale);
    return res;
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.svg|logo\\.svg|hero_home\\.png|.*\\.ico).*)'],
};
