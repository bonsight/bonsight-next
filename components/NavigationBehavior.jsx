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
        router.push(routeTarget.getAttribute('data-route'));
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
