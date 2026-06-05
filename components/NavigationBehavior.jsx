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
    const handleSubmit = async (event) => {
      const form = event.target.closest('[data-contact-form]');
      if (!form) return;
      event.preventDefault();

      const btn = form.querySelector('.fcf-submit');
      const msgOk = form.querySelector('[data-fcf-success]');
      const msgErr = form.querySelector('[data-fcf-error]');

      if (btn) { btn.disabled = true; btn.textContent = btn.dataset.sending || '...'; }
      if (msgOk) msgOk.style.display = 'none';
      if (msgErr) msgErr.style.display = 'none';

      try {
        const data = Object.fromEntries(new FormData(form));
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          form.reset();
          if (msgOk) msgOk.classList.add('is-shown');
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Enviar mensaje'; }
        } else {
          throw new Error('server');
        }
      } catch {
        if (msgErr) msgErr.classList.add('is-shown');
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Enviar mensaje'; }
      }
    };

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

      const prevBtn = event.target.closest('[data-carousel-prev]');
      if (prevBtn) {
        const carousel = document.getElementById(prevBtn.getAttribute('data-carousel-prev'));
        if (carousel) {
          const cardW = carousel.querySelector('.case-card')?.offsetWidth || carousel.offsetWidth / 2;
          carousel.scrollBy({ left: -cardW - 2, behavior: 'smooth' });
        }
      }

      const nextBtn = event.target.closest('[data-carousel-next]');
      if (nextBtn) {
        const carousel = document.getElementById(nextBtn.getAttribute('data-carousel-next'));
        if (carousel) {
          const cardW = carousel.querySelector('.case-card')?.offsetWidth || carousel.offsetWidth / 2;
          carousel.scrollBy({ left: cardW + 2, behavior: 'smooth' });
        }
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('submit', handleSubmit);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('submit', handleSubmit);
    };
  }, [router]);

  return null;
}
