'use client'
import { useState } from 'react'

const BonsightLogo = () => (
  <svg width="26" height="21" viewBox="0 0 72 58" fill="none">
    <circle cx="22" cy="38" r="20" fill="#9FDBC8" />
    <circle cx="36" cy="22" r="20" fill="#085041" />
    <circle cx="50" cy="38" r="20" fill="#2EBF8E" />
  </svg>
)

const LINKS = [
  ['#desafio',     'Desafío'],
  ['#capacidades', 'Capacidades'],
  ['#cambio',      'El cambio'],
  ['#inversion',   'Inversión'],
  ['#secundario',  'Adicional'],
  ['#cierre',      'Contacto'],
]

export default function ProposalNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav>
      <div className="logo">
        <BonsightLogo />
        <span>bonsight</span>
      </div>

      {/* Desktop */}
      <ul>
        {LINKS.map(([href, label]) => (
          <li key={href}><a href={href}>{label}</a></li>
        ))}
      </ul>

      {/* Hamburger button */}
      <button
        className={`hamburger${open ? ' open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="Menú"
      >
        <span /><span /><span />
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="mobile-menu">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}
        </div>
      )}
    </nav>
  )
}
