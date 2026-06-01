'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { normalize } from '@/utils/analytics';

const dl = (obj) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
};

const IconKairo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconLumen = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconArke = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Navbar({ locale = 'es' }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const en = locale === 'en';

  const restPath = pathname.startsWith(`/${locale}`) ? pathname.slice(`/${locale}`.length) : '';
  const esHref = `/es${restPath}` || '/es';
  const enHref = `/en${restPath}` || '/en';

  const close = () => setOpen(false);

  const closeAndTrack = (linkText, destination, menuName = 'mobile') => {
    close();
    dl({ event: 'nav_link_click', link_text: normalize(linkText), destination, menu_name: normalize(menuName) });
  };

  return (
    <>
      <nav>
        <Link className="nav-logo" href={`/${locale}`} onClick={close}>
          <Image src="/logo.svg" alt="Bonsight" width={100} height={50} />
        </Link>

        <div className="nav-links">
          <Link href={`/${locale}`} onClick={() => dl({ event: 'nav_link_click', link_text: en ? 'home' : 'inicio', destination: `/${locale}` })}>
            {en ? 'Home' : 'Inicio'}
          </Link>

          <Link href={`/${locale}/services/kairo`} onClick={() => dl({ event: 'nav_link_click', link_text: 'kairo', destination: `/${locale}/services/kairo` })}>
            Kairo
          </Link>
          <Link href={`/${locale}/services/lumen`} onClick={() => dl({ event: 'nav_link_click', link_text: 'lumen', destination: `/${locale}/services/lumen` })}>
            Lumen
          </Link>
          <Link href={`/${locale}/services/arke`} onClick={() => dl({ event: 'nav_link_click', link_text: 'arke', destination: `/${locale}/services/arke` })}>
            Arke
          </Link>

          <Link
            className="nav-cta"
            href={`/${locale}/consulta`}
            onClick={() => dl({ event: 'cta_click', cta_text: en ? 'lets_talk' : 'conversemos', cta_location: 'nav', destination: 'kai' })}
          >
            {en ? "Let's Talk" : 'Conversemos'}
          </Link>

          <div className="nav-lang-switcher">
            <Link href={esHref} className={locale === 'es' ? 'active' : ''}><span className="nav-lang-flag">🇪🇸</span>ES</Link>
            <span className="nav-lang-divider">|</span>
            <Link href={enHref} className={locale === 'en' ? 'active' : ''}><span className="nav-lang-flag">🇺🇸</span>EN</Link>
          </div>
        </div>

        <button
          className="nav-hamburger"
          onClick={() => {
            dl({ event: open ? 'mobile_menu_close' : 'mobile_menu_open' });
            setOpen(o => !o);
          }}
          aria-label={open ? (en ? 'Close menu' : 'Cerrar menú') : (en ? 'Open menu' : 'Abrir menú')}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </nav>

      {open && (
        <div className="nav-mobile">
          <Link className="nav-mobile-item" href={`/${locale}`} onClick={() => closeAndTrack(en ? 'Home' : 'Inicio', `/${locale}`)}>
            {en ? 'Home' : 'Inicio'}
          </Link>

          <div className="nav-mobile-group-title">{en ? 'Services' : 'Servicios'}</div>
          <Link className="nav-mobile-subitem" href={`/${locale}/services/kairo`} onClick={() => closeAndTrack('Kairo', `/${locale}/services/kairo`, 'services')}>
            <IconKairo /> Kairo
          </Link>
          <Link className="nav-mobile-subitem" href={`/${locale}/services/lumen`} onClick={() => closeAndTrack('Lumen', `/${locale}/services/lumen`, 'services')}>
            <IconLumen /> Lumen
          </Link>
          <Link className="nav-mobile-subitem" href={`/${locale}/services/arke`} onClick={() => closeAndTrack('Arke', `/${locale}/services/arke`, 'services')}>
            <IconArke /> Arke
          </Link>

          <Link
            className="nav-mobile-cta"
            href={`/${locale}/consulta`}
            onClick={() => { close(); dl({ event: 'cta_click', cta_text: en ? 'lets_talk' : 'conversemos', cta_location: 'mobile_nav', destination: 'kai' }); }}
          >
            {en ? "Let's Talk →" : 'Conversemos →'}
          </Link>

          <div className="nav-mobile-lang">
            <Link href={esHref} className={locale === 'es' ? 'active' : ''}><span className="nav-lang-flag">🇪🇸</span>ES</Link>
            <span>|</span>
            <Link href={enHref} className={locale === 'en' ? 'active' : ''}><span className="nav-lang-flag">🇺🇸</span>EN</Link>
          </div>
        </div>
      )}
    </>
  );
}
