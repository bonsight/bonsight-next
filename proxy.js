import { NextResponse } from 'next/server';

const locales = ['es', 'en'];
const defaultLocale = 'en';

// Login único de admin (lib/team/auth.js) — la cookie "bonsight_team" es un
// "{userId}.{hmacHex}" firmado con TEAM_SESSION_SECRET, la misma verificación que hace el
// server en getCurrentTeamUser, reimplementada acá con Web Crypto porque el proxy no puede
// importar código que dependa de next/headers.
async function isTeamAuthed(request) {
  const token = request.cookies.get('bonsight_team')?.value;
  if (!token || !process.env.TEAM_SESSION_SECRET) return false;
  const [userId, sigHex] = token.split('.');
  if (!userId || !sigHex || !/^[0-9a-f]+$/.test(sigHex)) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(process.env.TEAM_SESSION_SECRET || ''),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g).map((b) => parseInt(b, 16)));
    return await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(userId));
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // ── kai.bonsight.co ───────────────────────────────────────
  if (host.startsWith('kai.')) {
    const url = request.nextUrl.clone();

    // /login (viejo) y /team se sirven como el mismo login único, sin cambiar de dominio —
    // reescritura, no redirect: así funciona igual en cualquier subdominio y en local.
    if (pathname === '/login' || pathname === '/team') {
      url.pathname = '/team';
      return NextResponse.rewrite(url);
    }

    // Admin routes — requieren el login único de Bonsight
    if (pathname === '/' || pathname.startsWith('/admin')) {
      if (!(await isTeamAuthed(request))) {
        url.pathname = '/team';
        return NextResponse.rewrite(url);
      }
      url.pathname = pathname === '/' ? '/kai' : `/kai${pathname}`;
      return NextResponse.rewrite(url);
    }

    // /next/* — Kai Next (MVP): vive bajo kai. sin subdominio nuevo; se pisa /next por
    // /kai-next para mantener el código separado de Kai legacy. Auth por tenant se resuelve a
    // nivel de page (lib/kaiNext/auth.js), no acá.
    if (pathname.startsWith('/next')) {
      url.pathname = `/kai-next${pathname.slice('/next'.length)}`;
      return NextResponse.rewrite(url);
    }

    // Tenant routes (/[slug], /[slug]/*) — per-tenant auth handled at page level
    url.pathname = `/kai${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── aria.bonsight.co ──────────────────────────────────────
  if (host.startsWith('aria.')) {
    const url = request.nextUrl.clone();

    if (pathname === '/login' || pathname === '/team') {
      url.pathname = '/team';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/' || pathname.startsWith('/admin')) {
      if (!(await isTeamAuthed(request))) {
        url.pathname = '/team';
        return NextResponse.rewrite(url);
      }
      url.pathname = pathname === '/' ? '/aria' : `/aria${pathname}`;
      return NextResponse.rewrite(url);
    }

    url.pathname = `/aria${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── labs.bonsight.co ───────────────────────────────────────
  if (host.startsWith('labs.')) {
    const url = request.nextUrl.clone();

    if (pathname === '/login' || pathname === '/team') {
      url.pathname = '/team';
      return NextResponse.rewrite(url);
    }

    if (pathname === '/' || pathname.startsWith('/admin')) {
      if (!(await isTeamAuthed(request))) {
        url.pathname = '/team';
        return NextResponse.rewrite(url);
      }
      url.pathname = pathname === '/' ? '/labs' : `/labs${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Tenant routes — per-tenant auth handled at page level
    url.pathname = `/labs${pathname}`;
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
  matcher: ['/((?!api|aria|kai|labs|quiniela|proposals|team|assets|_next/static|_next/image|favicon\\.svg|logo\\.svg|hero_home\\.png|.*\\.ico|sitemap\\.xml|robots\\.txt).*)'],
};
