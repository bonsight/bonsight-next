'use client';

import { useState } from 'react';

// Mismo nav de bonsight.co (ver components/Navbar.jsx) — mismas clases globales (app/globals.css,
// cargado site-wide), así que se ve idéntico sin CSS propio. La diferencia es que esta página
// vive en kai.bonsight.co (otro subdominio/origen), así que los links a la web van con <a href>
// absoluto (mainSiteUrl, calculado en el server component padre para respetar localhost) en
// vez de <Link>/router.push relativo (eso caería bajo el proxy de kai. como si fuera un
// tenant). Se suma "Iniciar sesión", propio de Kai, al login genérico.

const IconData = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);
const IconGrowth = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
  </svg>
);
const IconCRO = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6M8 11h6" />
  </svg>
);
const IconMentoring = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconProcess = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const IconLeadership = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconMenu = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function KaiLandingNav({ entrarHref, mainSiteBase }) {
  const b = mainSiteBase;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <nav>
        <a className="nav-logo" href={b}>
          <img src="/logo.svg" alt="Bonsight" width={100} height={50} />
        </a>

        <div className="nav-links">
          <a href={`${b}/es`}>Inicio</a>

          <div className="nav-dropdown">
            <a>Growth ▾</a>
            <div className="nav-dropdown-menu">
              <a href={`${b}/es/services/data-strategy`}>
                <span className="menu-icon-svg"><IconData /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Data Strategy</span>
                  <span className="menu-item-desc">Arquitectura de datos y KPIs</span>
                </span>
              </a>
              <a href={`${b}/es/services/growth`}>
                <span className="menu-icon-svg"><IconGrowth /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Growth Digital</span>
                  <span className="menu-item-desc">Adquisición, SEO y performance</span>
                </span>
              </a>
              <a href={`${b}/es/services/cro`}>
                <span className="menu-icon-svg"><IconCRO /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">CRO</span>
                  <span className="menu-item-desc">Experimentación y conversión</span>
                </span>
              </a>
            </div>
          </div>

          <div className="nav-dropdown">
            <a>Boost ▾</a>
            <div className="nav-dropdown-menu">
              <a href={`${b}/es/services/mentoring`}>
                <span className="menu-icon-svg"><IconMentoring /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Mentoring de Equipos</span>
                  <span className="menu-item-desc">Desarrollo de equipos y feedback</span>
                </span>
              </a>
              <a href={`${b}/es/services/procesos`}>
                <span className="menu-icon-svg"><IconProcess /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Mejora de Procesos</span>
                  <span className="menu-item-desc">Flujos ágiles y metodologías</span>
                </span>
              </a>
              <a href={`${b}/es/services/liderazgo`}>
                <span className="menu-icon-svg"><IconLeadership /></span>
                <span className="menu-item-text">
                  <span className="menu-item-name">Soporte a Líderes</span>
                  <span className="menu-item-desc">Coaching y alineación ejecutiva</span>
                </span>
              </a>
            </div>
          </div>

          <a href={entrarHref}>Iniciar sesión</a>
          <a className="nav-cta" href={`${b}/es/consulta`}>Conversemos</a>

          <div className="nav-lang-switcher">
            <a href={`${b}/es`} className="active"><span className="nav-lang-flag">🇪🇸</span>ES</a>
            <span className="nav-lang-divider">|</span>
            <a href={`${b}/en`}><span className="nav-lang-flag">🇺🇸</span>EN</a>
          </div>
        </div>

        <button className="nav-hamburger" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar menú' : 'Abrir menú'}>
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </nav>

      {open && (
        <div className="nav-mobile">
          <a className="nav-mobile-item" href={`${b}/es`} onClick={close}>Inicio</a>

          <div className="nav-mobile-group-title">Bonsight Growth</div>
          <a className="nav-mobile-subitem" href={`${b}/es/services/data-strategy`} onClick={close}><IconData /> Data Strategy</a>
          <a className="nav-mobile-subitem" href={`${b}/es/services/growth`} onClick={close}><IconGrowth /> Growth Digital</a>
          <a className="nav-mobile-subitem" href={`${b}/es/services/cro`} onClick={close}><IconCRO /> CRO — Optimización de conversión</a>

          <div className="nav-mobile-group-title">Bonsight Boost</div>
          <a className="nav-mobile-subitem" href={`${b}/es/services/mentoring`} onClick={close}><IconMentoring /> Mentoring de equipos</a>
          <a className="nav-mobile-subitem" href={`${b}/es/services/procesos`} onClick={close}><IconProcess /> Mejora de procesos</a>
          <a className="nav-mobile-subitem" href={`${b}/es/services/liderazgo`} onClick={close}><IconLeadership /> Soporte a líderes</a>

          <a className="nav-mobile-item" href={entrarHref} onClick={close}>Iniciar sesión</a>
          <a className="nav-mobile-cta" href={`${b}/es/consulta`} onClick={close}>Conversemos →</a>

          <div className="nav-mobile-lang">
            <a href={`${b}/es`} className="active"><span className="nav-lang-flag">🇪🇸</span>ES</a>
            <span>|</span>
            <a href={`${b}/en`}><span className="nav-lang-flag">🇺🇸</span>EN</a>
          </div>
        </div>
      )}
    </>
  );
}
