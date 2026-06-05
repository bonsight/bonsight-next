'use client'

// KaiAvatar — isotipo de Kai extraído del ChatWidget de Bonsight.
// States: 'thinking' (pulsa) | 'ready' (estático)

export function KaiAvatar({ size = 28, state = 'ready' }) {
  const thinking = state === 'thinking'
  return (
    <>
      <style>{`
        @keyframes kaiPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes kaiDot   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
      `}</style>
      <svg
        width={size} height={size} viewBox="0 0 48 48"
        fill="none" xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, animation: thinking ? 'kaiPulse 1.6s ease-in-out infinite' : 'none' }}
      >
        <circle cx="17" cy="27" r="10" fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.22)" strokeWidth="0.8"/>
        <circle cx="24" cy="21" r="10" fill="rgba(52,211,153,0.09)" stroke="rgba(52,211,153,0.28)" strokeWidth="0.8"/>
        <circle cx="31" cy="27" r="10" fill="rgba(52,211,153,0.07)" stroke="rgba(52,211,153,0.22)" strokeWidth="0.8"/>
        <polyline points="13,30 19,23 25,27 33,18" stroke="rgba(52,211,153,0.85)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="13" cy="30" r="1.5" fill="rgba(52,211,153,0.4)"/>
        <circle cx="19" cy="23" r="1.75" fill="rgba(52,211,153,0.65)"/>
        <circle cx="25" cy="27" r="1.75" fill="rgba(52,211,153,0.65)"/>
        <circle cx="33" cy="18" r="2.5" fill="#34d399"
          style={{ transformOrigin: '33px 18px', animation: thinking ? 'kaiDot 1.6s ease-in-out infinite' : 'none' }}
        />
      </svg>
    </>
  )
}

// KaiCircle — isotipo en círculo oscuro con glow verde (identidad Bonsight Consulta)
export function KaiCircle({ size = 52, state = 'ready' }) {
  const thinking = state === 'thinking'
  return (
    <>
      <style>{`
        @keyframes kaiBreath {
          0%,100%{ box-shadow: 0 8px 24px rgba(0,0,0,0.6); border-color: rgba(52,211,153,0.2); }
          50%{ box-shadow: 0 8px 24px rgba(0,0,0,0.6), 0 0 0 6px rgba(52,211,153,0.07); border-color: rgba(52,211,153,0.38); }
        }
      `}</style>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#0c0f14',
        border: `1px solid rgba(52,211,153,${thinking ? '0.32' : '0.18'})`,
        boxShadow: thinking
          ? '0 0 18px rgba(52,211,153,0.12), 0 8px 28px rgba(0,0,0,0.55)'
          : '0 0 8px rgba(52,211,153,0.06), 0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        animation: thinking ? 'kaiBreath 3s ease-in-out infinite' : 'none',
      }}>
        <KaiAvatar size={Math.round(size * 0.56)} state={state} />
      </div>
    </>
  )
}

// KaiLabel — encabezado con isotipo + título + subtítulo opcional
export function KaiLabel({ title, subtitle, state = 'ready', size = 20 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <KaiAvatar size={size} state={state} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56', letterSpacing: .3 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{subtitle}</div>}
      </div>
    </div>
  )
}
