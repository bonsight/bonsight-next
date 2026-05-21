'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LOCALES = ['es', 'en'];

function getLocale(pathname) {
  for (const l of LOCALES) {
    if (pathname.startsWith(`/${l}/`) || pathname === `/${l}`) return l;
  }
  return 'es';
}

export default function NavigationBehavior() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event) => {
      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) {
        event.preventDefault();
        const route = routeTarget.getAttribute('data-route');
        const locale = getLocale(window.location.pathname);
        const hashIdx = route.indexOf('#');

        if (hashIdx !== -1) {
          const rawPath = route.slice(0, hashIdx) || '/';
          const hash = route.slice(hashIdx + 1);
          const localePath = rawPath === '/' ? `/${locale}` : `/${locale}${rawPath}`;

          if (localePath === window.location.pathname) {
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
          } else {
            router.push(localePath);
            let tries = 0;
            const tryScroll = () => {
              const el = document.getElementById(hash);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else if (tries++ < 20) {
                setTimeout(tryScroll, 100);
              }
            };
            setTimeout(tryScroll, 150);
          }
        } else {
          const localePath = route === '/' ? `/${locale}` : `/${locale}${route}`;
          router.push(localePath);
        }
        return;
      }

      const scrollTarget = event.target.closest('[data-scroll]');
      if (scrollTarget) {
        event.preventDefault();
        const selector = scrollTarget.getAttribute('data-scroll');
        document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [router]);

  return null;
}
