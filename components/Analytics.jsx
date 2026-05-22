'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { normalize } from '@/utils/analytics';

const dl = (obj) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
};

export default function Analytics() {
  const pathname = usePathname();

  // Virtual page view on client-side route change
  useEffect(() => {
    dl({ event: 'virtual_page_view', page_path: pathname });
  }, [pathname]);

  // Scroll depth — resets per page
  useEffect(() => {
    const thresholds = [25, 50, 75, 90];
    const fired = new Set();

    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (!total) return;
      const pct = Math.floor((window.scrollY / total) * 100);
      thresholds.forEach(t => {
        if (pct >= t && !fired.has(t)) {
          fired.add(t);
          dl({ event: 'scroll_depth', percent_scrolled: t, page_path: pathname });
        }
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Section visibility — fire once per section per page
  useEffect(() => {
    const sections = [
      { selector: '#svc-anchor',    name: 'servicios'     },
      { selector: '.about-wrap',    name: 'quienes_somos' },
      { selector: '.process-wrap',  name: 'proceso'       },
      { selector: '.benefits-wrap', name: 'beneficios'    },
      { selector: '.clients-wrap',  name: 'clientes'      },
      { selector: '#contacto',      name: 'contacto'      },
      { selector: '.svc-hero',      name: 'servicio_hero' },
      { selector: '.cta-band',      name: 'cta_band'      },
    ];

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        dl({ event: 'section_view', section_name: entry.target.dataset.analyticsSection, page_path: pathname });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.3 });

    sections.forEach(({ selector, name }) => {
      const el = document.querySelector(selector);
      if (el) {
        el.dataset.analyticsSection = name;
        obs.observe(el);
      }
    });

    return () => obs.disconnect();
  }, [pathname]);

  // Click delegation — service cards, CTAs, WhatsApp, footer, back button
  useEffect(() => {
    const onClick = (e) => {
      const t = e.target;

      if (t.closest('.contact-whatsapp')) {
        dl({ event: 'cta_click', cta_location: 'contact', destination: 'whatsapp', page_path: pathname });
        return;
      }

      if (t.closest('.back-btn')) {
        dl({ event: 'back_button_click', page_path: pathname });
        return;
      }

      const card = t.closest('.svc-card');
      if (card) {
        dl({
          event: 'service_card_click',
          service_name: normalize(card.querySelector('h3')?.textContent ?? card.dataset.route),
          destination: card.dataset.route,
          page_path: pathname,
        });
        return;
      }

      if (t.closest('.hero-actions')) {
        const el = t.closest('button, a');
        if (el) dl({ event: 'cta_click', cta_text: normalize(el.textContent), cta_location: 'hero', destination: 'kai', page_path: pathname });
        return;
      }

      if (t.closest('.svc-hero') && t.closest('.btn-primary')) {
        const el = t.closest('.btn-primary');
        dl({ event: 'cta_click', cta_text: normalize(el.textContent), cta_location: 'service_hero', destination: 'calendly', page_path: pathname });
        return;
      }

      if (t.closest('.cta-band')) {
        const el = t.closest('.btn-white, .btn-wa-outline, button');
        if (el) {
          const isWA = el.classList.contains('btn-wa-outline');
          dl({ event: 'cta_click', cta_text: normalize(el.textContent), cta_location: 'cta_band', destination: isWA ? 'whatsapp' : 'calendly', page_path: pathname });
        }
        return;
      }

      const footerLink = t.closest('.footer-nav [data-route]');
      if (footerLink) {
        dl({ event: 'footer_link_click', destination: footerLink.dataset.route, page_path: pathname });
        return;
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname]);

  return null;
}
