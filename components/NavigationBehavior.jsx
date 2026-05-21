'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NavigationBehavior() {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event) => {
      const routeTarget = event.target.closest('[data-route]');
      if (routeTarget) {
        event.preventDefault();
        const route = routeTarget.getAttribute('data-route');
        const hashIdx = route.indexOf('#');

        if (hashIdx !== -1) {
          const path = route.slice(0, hashIdx) || '/';
          const hash = route.slice(hashIdx + 1);

          if (path === window.location.pathname) {
            // Same page — scroll directly
            document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
          } else {
            // Different page — navigate then poll for element and scroll
            router.push(path);
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
          router.push(route);
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
