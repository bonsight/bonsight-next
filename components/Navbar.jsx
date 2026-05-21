'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { normalize } from '@/utils/analytics';

const dl = (obj) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(obj);
};

const IconData = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);
const IconGrowth = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconCRO = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
    <path d="M11 8v6M8 11h6"/>
  </svg>
);
const IconMentoring = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconProcess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
);
const IconLeadership = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
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

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const closeAndTrack = (linkText, destination, menuName = 'mobile') => {
    close();
    dl({ event: 'nav_link_click', link_text: normalize(linkText), destination, menu_name: normalize(menuName) });
  };

  return (
    <>
      <nav>
        <Link className="nav-logo" href="/" onClick={close}>
          <Image src="/logo.svg" alt="Bonsight" width={100} height={50} />
        </Link>

        <div className="nav-links">
          <Link href="/" onClick={() => dl({ event: 'nav_link_click', link_text: 'inicio', destination: '/' })}>
            Inicio
          </Link>

          <div
            className="nav-dropdown"
            onMouseEnter={() => dl({ event: 'nav_dropdown_open', menu_name: 'growth' })}
          >
            <a>Growth ▾</a>
            <div className="nav-dropdown-menu">
              <Link href="/services/data-strategy" onClick={() => dl({ event: 'nav_link_click', link_text: 'data_strategy', destination: '/services/data-strategy', menu_name: 'growth' })}>
                <span className="menu-icon-svg"><IconData /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Data Strategy</span>
                  <span className="menu-item-desc">Arquitectura de datos y KPIs</span>
                </span>
              </Link>
              <Link href="/services/growth" onClick={() => dl({ event: 'nav_link_click', link_text: 'growth_digital', destination: '/services/growth', menu_name: 'growth' })}>
                <span className="menu-icon-svg"><IconGrowth /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Growth Digital</span>
                  <span className="menu-item-desc">Adquisición, SEO y performance</span>
                </span>
              </Link>
              <Link href="/services/cro" onClick={() => dl({ event: 'nav_link_click', link_text: 'cro', destination: '/services/cro', menu_name: 'growth' })}>
                <span className="menu-icon-svg"><IconCRO /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">CRO</span>
                  <span className="menu-item-desc">Experimentación y conversión</span>
                </span>
              </Link>
            </div>
          </div>

          <div
            className="nav-dropdown"
            onMouseEnter={() => dl({ event: 'nav_dropdown_open', menu_name: 'boost' })}
          >
            <a>Boost ▾</a>
            <div className="nav-dropdown-menu">
              <Link href="/services/mentoring" onClick={() => dl({ event: 'nav_link_click', link_text: 'mentoring_de_equipos', destination: '/services/mentoring', menu_name: 'boost' })}>
                <span className="menu-icon-svg"><IconMentoring /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Mentoring de Equipos</span>
                  <span className="menu-item-desc">Desarrollo de equipos y feedback</span>
                </span>
              </Link>
              <Link href="/services/procesos" onClick={() => dl({ event: 'nav_link_click', link_text: 'mejora_de_procesos', destination: '/services/procesos', menu_name: 'boost' })}>
                <span className="menu-icon-svg"><IconProcess /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Mejora de Procesos</span>
                  <span className="menu-item-desc">Flujos ágiles y metodologías</span>
                </span>
              </Link>
              <Link href="/services/liderazgo" onClick={() => dl({ event: 'nav_link_click', link_text: 'soporte_a_lideres', destination: '/services/liderazgo', menu_name: 'boost' })}>
                <span className="menu-icon-svg"><IconLeadership /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Soporte a Líderes</span>
                  <span className="menu-item-desc">Coaching y alineación ejecutiva</span>
                </span>
              </Link>
            </div>
          </div>

          <Link
            className="nav-cta"
            href="/#contacto"
            onClick={() => dl({ event: 'cta_click', cta_text: 'conversemos', cta_location: 'nav' })}
          >
            Conversemos
          </Link>
        </div>

        <button
          className="nav-hamburger"
          onClick={() => {
            dl({ event: open ? 'mobile_menu_close' : 'mobile_menu_open' });
            setOpen(o => !o);
          }}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </nav>

      {open && (
        <div className="nav-mobile">
          <Link className="nav-mobile-item" href="/" onClick={() => closeAndTrack('Inicio', '/')}>Inicio</Link>

          <div className="nav-mobile-group-title">Bonsight Growth</div>
          <Link className="nav-mobile-subitem" href="/services/data-strategy" onClick={() => closeAndTrack('Data Strategy', '/services/data-strategy', 'growth')}>
            <IconData /> Data Strategy
          </Link>
          <Link className="nav-mobile-subitem" href="/services/growth" onClick={() => closeAndTrack('Growth Digital', '/services/growth', 'growth')}>
            <IconGrowth /> Growth Digital
          </Link>
          <Link className="nav-mobile-subitem" href="/services/cro" onClick={() => closeAndTrack('CRO', '/services/cro', 'growth')}>
            <IconCRO /> CRO — Optimización de conversión
          </Link>

          <div className="nav-mobile-group-title">Bonsight Boost</div>
          <Link className="nav-mobile-subitem" href="/services/mentoring" onClick={() => closeAndTrack('Mentoring de Equipos', '/services/mentoring', 'boost')}>
            <IconMentoring /> Mentoring de equipos
          </Link>
          <Link className="nav-mobile-subitem" href="/services/procesos" onClick={() => closeAndTrack('Mejora de Procesos', '/services/procesos', 'boost')}>
            <IconProcess /> Mejora de procesos
          </Link>
          <Link className="nav-mobile-subitem" href="/services/liderazgo" onClick={() => closeAndTrack('Soporte a Líderes', '/services/liderazgo', 'boost')}>
            <IconLeadership /> Soporte a líderes
          </Link>

          <Link
            className="nav-mobile-cta"
            href="/#contacto"
            onClick={() => { close(); dl({ event: 'cta_click', cta_text: 'conversemos', cta_location: 'mobile_nav' }); }}
          >
            Conversemos →
          </Link>
        </div>
      )}
    </>
  );
}
