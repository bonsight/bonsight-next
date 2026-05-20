'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NavigationBehavior() {
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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
