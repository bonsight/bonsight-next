'use client';

import { useEffect } from 'react';

export default function RawHtml({ html }) {
  useEffect(() => {
    const addInView = () => {
      document.querySelectorAll('[data-animate]:not(.in-view)').forEach(el => {
        const { top, bottom } = el.getBoundingClientRect();
        if (top < window.innerHeight * 0.9 && bottom > 0) {
          el.classList.add('in-view');
        }
      });
    };

    addInView();
    const timer = setTimeout(addInView, 120);
    window.addEventListener('scroll', addInView, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', addInView);
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
