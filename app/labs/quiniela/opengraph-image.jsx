import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(145deg, #0a1f12 0%, #0f3520 45%, #1a5c3a 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '72px 96px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Campo de fútbol — líneas tácticas */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.09 }}
        viewBox="0 0 1200 630"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Perímetro */}
        <rect x="32" y="32" width="1136" height="566" fill="none" stroke="white" strokeWidth="3" />
        {/* Línea central */}
        <line x1="600" y1="32" x2="600" y2="598" stroke="white" strokeWidth="3" />
        {/* Círculo central */}
        <circle cx="600" cy="315" r="110" fill="none" stroke="white" strokeWidth="3" />
        <circle cx="600" cy="315" r="7" fill="white" />
        {/* Área izquierda */}
        <rect x="32" y="178" width="155" height="274" fill="none" stroke="white" strokeWidth="3" />
        <rect x="32" y="237" width="56" height="156" fill="none" stroke="white" strokeWidth="3" />
        {/* Área derecha */}
        <rect x="1013" y="178" width="155" height="274" fill="none" stroke="white" strokeWidth="3" />
        <rect x="1112" y="237" width="56" height="156" fill="none" stroke="white" strokeWidth="3" />
        {/* Córners */}
        <path d="M32 32 Q52 32 52 52" fill="none" stroke="white" strokeWidth="3" />
        <path d="M1168 32 Q1148 32 1148 52" fill="none" stroke="white" strokeWidth="3" />
        <path d="M32 598 Q52 598 52 578" fill="none" stroke="white" strokeWidth="3" />
        <path d="M1168 598 Q1148 598 1148 578" fill="none" stroke="white" strokeWidth="3" />
      </svg>

      {/* Bonsight label */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 40 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em' }}>
          Bonsight
        </span>
        <span style={{ fontSize: 34, color: '#34d399', marginLeft: 2, lineHeight: 1 }}>.</span>
      </div>

      {/* Título */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
        <span style={{ fontSize: 68, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.04em', lineHeight: 1.05, display: 'flex' }}>
          Quiniela Mundial 2026
        </span>
      </div>

      {/* Tagline */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 36 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em', display: 'flex' }}>
          Kai analiza.&nbsp;
        </span>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#34d399', letterSpacing: '-0.02em', display: 'flex' }}>
          Tu decides.
        </span>
      </div>

      {/* Pills */}
      <div style={{ display: 'flex', gap: 12 }}>
        {['Picks por fase', 'Consenso en tiempo real', 'Inteligencia Kai'].map(label => (
          <div key={label} style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 999,
            padding: '8px 18px',
            fontSize: 18,
            color: 'rgba(255,255,255,0.75)',
          }}>
            {label}
          </div>
        ))}
      </div>

      {/* Kai Online indicator */}
      <div style={{
        position: 'absolute',
        bottom: 56, right: 96,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#34d399' }} />
        <span style={{ fontSize: 18, color: '#34d399', fontWeight: 600 }}>Kai Online</span>
      </div>

      {/* Domain */}
      <div style={{
        position: 'absolute',
        bottom: 56, left: 96,
        fontSize: 15, color: 'rgba(255,255,255,0.2)',
        letterSpacing: '0.1em', textTransform: 'uppercase',
        display: 'flex',
      }}>
        bonsight.co/quiniela
      </div>
    </div>,
    { ...size }
  )
}
