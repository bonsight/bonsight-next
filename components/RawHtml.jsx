'use client';

import { useEffect } from 'react';

export default function RawHtml({ html }) {
  useEffect(() => {
    const addInView = () => {
      document.querySelectorAll('[data-animate]:not(.in-view)').forEach(el => {
        const { top, bottom } = el.getBoundingClientRect();
        if (top < window.innerHeight * 0.9 && bottom > 0) el.classList.add('in-view');
      });
    };

    addInView();
    const timer = setTimeout(addInView, 120);
    window.addEventListener('scroll', addInView, { passive: true });

    // Journey sticky-scroll observer
    const panels = document.querySelectorAll('.journey-panel[data-jstep]');
    const navItems = document.querySelectorAll('.journey-nav-item[data-jstep]');
    let journeyObs;
    if (panels.length) {
      journeyObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const step = entry.target.dataset.jstep;
            navItems.forEach(n => n.classList.toggle('jn-active', n.dataset.jstep === step));
            entry.target.classList.add('jp-visible');
          }
        });
      }, { threshold: 0.45 });
      panels.forEach(p => journeyObs.observe(p));
      // Mark first panel visible immediately
      if (panels[0]) panels[0].classList.add('jp-visible');
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', addInView);
      journeyObs?.disconnect();
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
