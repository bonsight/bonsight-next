'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PHASE_ORDER, PHASES, TEAMS, FLAGS } from '@/lib/quiniela'
import { KaiAvatar, KaiCircle } from '@/components/KaiAvatar'

// SVG inline del campo táctico (fondo hero)
function PitchLines() {
  return (
    <svg
      viewBox="0 0 300 200"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}
      preserveAspectRatio="xMidYMid slice"
      fill="none" stroke="white" strokeWidth="1"
    >
      <rect x="8" y="8" width="284" height="184" />
      <line x1="150" y1="8" x2="150" y2="192" />
      <circle cx="150" cy="100" r="28" />
      <circle cx="150" cy="100" r="1.5" fill="white" stroke="none" />
      <rect x="8" y="58" width="44" height="84" />
      <rect x="248" y="58" width="44" height="84" />
      <rect x="8" y="78" width="16" height="44" />
      <rect x="276" y="78" width="16" height="44" />
      <path d="M8 8 Q18 8 18 18" /><path d="M292 8 Q282 8 282 18" />
      <path d="M8 192 Q18 192 18 182" /><path d="M292 192 Q282 192 282 182" />
    </svg>
  )
}

const COUNTRY_CODES = [
  { code: '+52',  label: '+52 · México' },
  { code: '+1',   label: '+1 · USA / Canadá' },
  { code: '+54',  label: '+54 · Argentina' },
  { code: '+56',  label: '+56 · Chile' },
  { code: '+57',  label: '+57 · Colombia' },
  { code: '+58',  label: '+58 · Venezuela' },
  { code: '+51',  label: '+51 · Perú' },
  { code: '+55',  label: '+55 · Brasil' },
  { code: '+34',  label: '+34 · España' },
  { code: '+593', label: '+593 · Ecuador' },
  { code: '+591', label: '+591 · Bolivia' },
  { code: '+595', label: '+595 · Paraguay' },
  { code: '+598', label: '+598 · Uruguay' },
  { code: '+506', label: '+506 · Costa Rica' },
  { code: '+507', label: '+507 · Panamá' },
]

export default function QuinielaLanding() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeQuinielas, setActiveQuinielas] = useState([])
  const [adminQuinielas, setAdminQuinielas] = useState(new Set())
  const [stats, setStats]   = useState({ quinielas: 0, participants: 0 })
  const [loaded, setLoaded] = useState(false)
  const [createdGroup, setCreatedGroup] = useState(null)
  const [fasesExpanded, setFasesExpanded] = useState(false)

  const [createForm, setCreateForm] = useState({
    nombre: '', adminNombre: '', adminEmail: '', adminTelCode: '+52', adminTel: '', adminPais: '',
    fases: ['grupos', 'ronda32', 'octavos', 'cuartos', 'semis', 'final'],
  })
  const [joinCode, setJoinCode] = useState('')

  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      Object.keys(localStorage).filter(k => k.startsWith('quiniela_')).forEach(k => localStorage.removeItem(k))
      router.replace('/quiniela')
      return
    }
    if (searchParams.get('accion') === 'crear') setMode('crear')
    // Cargar quinielas activas desde localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiniela_token_'))
    if (keys.length > 0) {
      const ids = keys.map(k => k.replace('quiniela_token_', ''))
      setAdminQuinielas(new Set(ids.filter(id => localStorage.getItem(`quiniela_admin_${id}`))))
      Promise.all(
        ids.map(id =>
          fetch(`/api/quiniela?action=group&groupId=${id}`)
            .then(r => r.json())
            .then(d => d.group ? { groupId: id, group: d.group } : null)
            .catch(() => null)
        )
      ).then(results => setActiveQuinielas(results.filter(Boolean)))
    }
    // Stats globales
    fetch('/api/quiniela?action=stats')
      .then(r => r.json())
      .then(d => setStats({ quinielas: d.quinielas ?? 0, participants: d.participants ?? 0 }))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  function toggleFase(ph) {
    setCreateForm(prev => ({
      ...prev,
      fases: prev.fases.includes(ph) ? prev.fases.filter(f => f !== ph) : [...prev.fases, ph],
    }))
  }

  function normalizeCode(raw) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    return clean.length === 6 ? clean.slice(0, 2) + '-' + clean.slice(2) : raw.toUpperCase().trim()
  }

  async function handleCreate() {
    const { nombre, adminNombre, adminEmail, adminTelCode, adminTel, adminPais, fases } = createForm
    if (!nombre.trim() || !adminNombre.trim() || !adminEmail.trim() || !adminTel.trim()) {
      setError('Todos los campos son obligatorios'); return
    }
    if (fases.length === 0) { setError('Selecciona al menos una fase'); return }
    setLoading(true); setError('')
    try {
      const groupRes = await fetch('/api/quiniela', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createGroup', payload: createForm }),
      })
      const groupData = await groupRes.json()
      if (!groupData.ok) { setError('Error al crear. Intenta de nuevo.'); return }
      const { group } = groupData
      const regRes = await fetch('/api/quiniela', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', payload: { nombre: adminNombre, email: adminEmail, tel: `${adminTelCode}${adminTel}`, pais: adminPais, groupId: group.id } }),
      })
      const regData = await regRes.json()
      if (regData.ok && regData.token) {
        localStorage.setItem(`quiniela_token_${group.id}`, regData.token)
        localStorage.setItem(`quiniela_admin_${group.id}`, '1')
      }
      setCreatedGroup({ id: group.id, nombre: group.nombre })
      setMode('creado')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleJoin() {
    const code = normalizeCode(joinCode)
    if (!code) { setError('Ingresa el código de acceso'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/quiniela?action=group&groupId=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.group) router.push(`/quiniela/${code}`)
      else setError('Código inválido. Verifica e intenta de nuevo.')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const s = {
    input:  { padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
    label:  { fontSize: 14, color: '#888', marginBottom: 6, display: 'block' },
    field:  { marginBottom: 14 },
    btn:    { background: '#1D9E75', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' },
    btnOff: { background: '#9FE1CB', cursor: 'default' },
    err:    { fontSize: 13, color: '#c0392b', marginBottom: 12 },
    page:   { maxWidth: 480, margin: '0 auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  }

  // ── FORMS (crear / unir / creado) ─────────────────────────────────────────

  const BackBtn = ({ onClick }) => (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', padding: '12px 1.5rem 10px', margin: '0 -1.5rem', borderBottom: '0.5px solid #f0f0f0', marginBottom: 16 }}>
      <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Volver
      </button>
    </div>
  )

  if (mode === 'crear') return (
    <div style={{ ...s.page, padding: '1rem 1.5rem' }}>
      <BackBtn onClick={() => { setMode(null); setError('') }} />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🏆 Crear quiniela</div>
        <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>Invita a tus amigos, comparte el código y compitan durante todo el Mundial.</div>
      </div>
      <div style={s.field}><label style={s.label}>Nombre de la quiniela</label>
        <input style={s.input} placeholder="Ej. Quiniela de la Oficina" value={createForm.nombre} onChange={e => setCreateForm(p => ({ ...p, nombre: e.target.value }))} /></div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>Tu información (organizador)</div>
      <div style={s.field}><label style={s.label}>Tu nombre</label>
        <input style={s.input} placeholder="Ej. Rafa" value={createForm.adminNombre} onChange={e => setCreateForm(p => ({ ...p, adminNombre: e.target.value }))} /></div>
      <div style={s.field}><label style={s.label}>Email</label>
        <input style={s.input} type="email" placeholder="correo@ejemplo.com" value={createForm.adminEmail} onChange={e => setCreateForm(p => ({ ...p, adminEmail: e.target.value }))} /></div>
      <div style={s.field}><label style={s.label}>WhatsApp</label>
        <div style={{ display: 'flex', borderRadius: 8, border: '0.5px solid #ccc', overflow: 'hidden' }}>
          <select value={createForm.adminTelCode} onChange={e => setCreateForm(p => ({ ...p, adminTelCode: e.target.value }))}
            style={{ padding: '9px 6px', background: 'transparent', border: 'none', borderRight: '0.5px solid #ccc', fontSize: 13, color: 'inherit', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input style={{ flex: 1, padding: '9px 10px', background: 'transparent', border: 'none', fontSize: 14, fontFamily: 'inherit', color: 'inherit', outline: 'none', minWidth: 0 }}
            type="tel" placeholder="55 1234 5678" value={createForm.adminTel} onChange={e => setCreateForm(p => ({ ...p, adminTel: e.target.value }))} />
        </div>
      </div>
      <div style={s.field}><label style={s.label}>¿A quién le vas? 🏆</label>
        <select style={s.input} value={createForm.adminPais} onChange={e => setCreateForm(p => ({ ...p, adminPais: e.target.value }))}>
          <option value="">— Selecciona tu equipo —</option>
          {TEAMS.map(t => <option key={t} value={t}>{FLAGS[t] ? `${FLAGS[t]} ` : ''}{t}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        {!fasesExpanded ? (
          <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Incluye todas las fases del torneo:</div>
            {[['Fase de grupos'], ['Eliminatorias (R32 → Semis)'], ['Final']].map(([l]) => (
              <div key={l} style={{ fontSize: 13, color: '#0F6E56', marginBottom: 3 }}>✓ {l}</div>
            ))}
            <button onClick={() => setFasesExpanded(true)}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 8, textDecoration: 'underline' }}>
              Personalizar fases →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>Fases a incluir</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
              {PHASE_ORDER.map(ph => {
                const active = createForm.fases.includes(ph)
                return (
                  <button key={ph} onClick={() => toggleFase(ph)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 99, border: `0.5px solid ${active ? '#1D9E75' : '#ccc'}`, background: active ? '#E1F5EE' : 'transparent', color: active ? '#0F6E56' : '#888', cursor: 'pointer' }}>
                    {active ? '✓ ' : ''}{PHASES[ph].label}
                  </button>
                )
              })}
            </div>
            <button onClick={() => { setCreateForm(p => ({ ...p, fases: PHASE_ORDER })); setFasesExpanded(false) }}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
              ↑ Incluir todas las fases
            </button>
          </div>
        )}
      </div>
      {error && <div style={s.err}>{error}</div>}
      <button style={{ ...s.btn, ...(loading ? s.btnOff : {}) }} onClick={handleCreate} disabled={loading}>
        {loading ? 'Creando...' : 'Crear quiniela →'}
      </button>
      <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 10 }}>Quedarás inscrito automáticamente como participante.</div>
    </div>
  )

  if (mode === 'unir') return (
    <div style={{ ...s.page, padding: '1rem 1.5rem' }}>
      <BackBtn onClick={() => { setMode(null); setError('') }} />
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>🎟️ Unirme a una quiniela</div>
        <div style={{ fontSize: 14, color: '#888' }}>Pídele el código de acceso al organizador.</div>
      </div>
      <div style={s.field}><label style={s.label}>Código de acceso</label>
        <input style={{ ...s.input, textTransform: 'uppercase', letterSpacing: 3, fontSize: 20, textAlign: 'center' }}
          placeholder="AB-1234" value={joinCode} onChange={e => setJoinCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleJoin()} maxLength={8} />
      </div>
      {error && <div style={s.err}>{error}</div>}
      <button style={{ ...s.btn, ...(loading ? s.btnOff : {}) }} onClick={handleJoin} disabled={loading}>
        {loading ? 'Verificando...' : 'Entrar →'}
      </button>
    </div>
  )

  if (mode === 'creado' && createdGroup) return (
    <div style={{ ...s.page, padding: '2rem 1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>¡Quiniela creada!</div>
        <div style={{ fontSize: 14, color: '#888' }}>{createdGroup.nombre}</div>
        <div style={{ fontSize: 13, color: '#0F6E56', marginTop: 6 }}>Ya quedaste inscrito como participante.</div>
      </div>
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Código para participantes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: '#1D9E75', flex: 1 }}>{createdGroup.id}</div>
          <button onClick={() => navigator.clipboard.writeText(createdGroup.id)}
            style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888' }}>Copiar código</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/quiniela/${createdGroup.id}`)}
            style={{ flex: 1, background: '#f5f5f3', border: '0.5px solid #ddd', borderRadius: 8, padding: '9px 10px', fontSize: 12, cursor: 'pointer', color: '#555', fontWeight: 500 }}>
            🔗 Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`¡Únete a mi Quiniela del Mundial 2026! 🏆\n\n${createdGroup.nombre}\nCódigo: ${createdGroup.id}\n\n👉 ${typeof window !== 'undefined' ? window.location.origin : ''}/quiniela/${createdGroup.id}`)}`}
            target="_blank" rel="noopener"
            style={{ flex: 1, background: '#25D366', color: '#fff', borderRadius: 8, padding: '9px 10px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            💬 WhatsApp
          </a>
        </div>
      </div>
      <a href={`/quiniela/${createdGroup.id}/picks`}
        style={{ display: 'block', textAlign: 'center', background: '#1D9E75', color: '#fff', padding: '13px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', marginBottom: 10 }}>
        ⚽ Llenar mis picks →
      </a>
      <a href={`/quiniela/${createdGroup.id}/admin`}
        style={{ display: 'block', textAlign: 'center', background: 'transparent', color: '#888', padding: '11px', borderRadius: 8, fontSize: 13, textDecoration: 'none', border: '0.5px solid #ddd' }}>
        Ver panel de admin
      </a>
    </div>
  )

  // ── LANDING PRINCIPAL ──────────────────────────────────────────────────────

  return (
    <div style={{ ...s.page }}>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #0a1f12 0%, #0f3520 45%, #1a5c3a 100%)', padding: '2.5rem 1.5rem 2rem', color: '#fff' }}>
        <PitchLines />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* branding + KaiCircle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <a href="/" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(52,211,153,0.8)', textTransform: 'uppercase' }}>
              BONSIGHT
            </a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <KaiCircle size={44} state="thinking" />
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#34D399', letterSpacing: .5, textTransform: 'uppercase' }}>KAI ONLINE</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>Analizando el Mundial 2026</div>
              </div>
            </div>
          </div>

          {/* título */}
          <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.15, marginBottom: 8 }}>
            🏆 Quiniela<br />Mundial 2026
          </div>
          {/* tagline */}
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6, letterSpacing: -0.3 }}>
            Kai analiza. Tú decides.
          </div>
          {/* subtítulo */}
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 20, maxWidth: 340 }}>
            Compite con amigos, desafía el consenso y deja que Kai analice cada jornada.
          </div>
          {/* pills del torneo (contexto, no métricas de uso) */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {[['🏆', '104 partidos'], ['⚽', '6 fases'], ['🌎', 'USA · Canadá · México']].map(([e, l]) => (
              <span key={l} style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 10px', color: 'rgba(255,255,255,0.8)' }}>
                {e} {l}
              </span>
            ))}
          </div>
          {/* CTAs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <button onClick={() => setMode('crear')} style={{ flex: 1, background: '#34D399', color: '#0a1f12', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Crear quiniela
            </button>
            <button onClick={() => setMode('unir')} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '0.5px solid rgba(255,255,255,0.3)', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Ingresar código
            </button>
          </div>
          <a href="/quiniela/demo" style={{ display: 'block', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecoration: 'none', padding: '4px 0' }}>
            👀 Ver demo con Kai →
          </a>
        </div>
      </div>

      <div style={{ padding: '1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

        {/* ── DEMO CARD ── */}
        <a href="/quiniela/demo" style={{ textDecoration: 'none', display: 'block', background: 'linear-gradient(135deg, #E8F8F1 0%, #f0fdf6 100%)', border: '1.5px solid #1D9E75', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 16px rgba(29,158,117,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F6E56' }}>¿No sabes por dónde empezar?</span>
          </div>
          <div style={{ fontSize: 13, color: '#5a8a74', lineHeight: 1.55, marginBottom: 14 }}>
            Explora una quiniela completa con rankings, picks y análisis de Kai.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {[['🏆','Ranking activo'],['📊','Consensos entre participantes'],['🤖','Análisis de Kai'],['⚽','Picks cargados']].map(([e, l]) => (
              <span key={l} style={{ fontSize: 11, background: '#fff', color: '#0F6E56', border: '0.5px solid rgba(29,158,117,.25)', padding: '3px 10px', borderRadius: 99, fontWeight: 500 }}>
                {e} {l}
              </span>
            ))}
          </div>
          <div style={{ background: '#1D9E75', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
            Ver Demo →
          </div>
        </a>

        {/* ── KAI ONLINE ── */}
        <div style={{ background: '#0c0f14', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <KaiCircle size={56} state="thinking" />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#34D399', letterSpacing: .5, textTransform: 'uppercase' }}>KAI ONLINE</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399' }} />
                  <span style={{ fontSize: 10, color: '#34D399', fontWeight: 500 }}>Activo ahora</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Analizando el Mundial 2026</div>
            </div>
          </div>

          {/* stats de uso real (quinielas + participantes — no del torneo, eso va en el hero) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { val: loaded ? stats.quinielas : '·', label: 'Quinielas' },
              { val: loaded ? stats.participants : '·', label: 'Participantes' },
              { val: loaded ? `${stats.quinielas * 72}+` : '·', label: 'Picks posibles' },
            ].map(({ val, label }) => (
              <div key={label} style={{ background: 'rgba(52,211,153,0.07)', border: '0.5px solid rgba(52,211,153,0.15)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#34D399', lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              'Analizando partidos y favoritos de cada grupo',
              'Detectando posibles sorpresas por fase',
              'Calculando consensos entre participantes',
              'Preparando recomendaciones personalizadas',
            ].map(a => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(52,211,153,0.6)', flexShrink: 0 }} />
                {a}
              </div>
            ))}
          </div>
        </div>

        {/* ── ESTADO VACÍO: Empieza tu Mundial ── */}
        {loaded && activeQuinielas.length === 0 && (
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>⚽ Empieza tu Mundial</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 18 }}>Todo lo que necesitas para competir durante el torneo.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 22 }}>
              {[
                'Crea una quiniela o únete con un código',
                'Completa tus pronósticos antes de cada fase',
                'Kai analiza partidos, consensos y posibles sorpresas',
                'Compite por el liderato y sigue la tabla en tiempo real',
              ].map((text, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 14, color: '#444', lineHeight: 1.55 }}>{text}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMode('crear')} style={{ flex: 1, background: '#1D9E75', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Crear quiniela
              </button>
              <button onClick={() => setMode('unir')} style={{ flex: 1, background: 'transparent', color: '#1D9E75', border: '1px solid #1D9E75', padding: '12px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Ingresar código
              </button>
            </div>
          </div>
        )}

        {/* ── ESTADO CON QUINIELAS ── */}
        {activeQuinielas.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
              Tus quinielas activas
            </div>
            {activeQuinielas.map(({ groupId, group }) => {
              const isAdminHere = adminQuinielas.has(groupId)
              return (
                <div key={groupId} style={{ background: 'linear-gradient(135deg, #E1F5EE, #f0fdf6)', border: '1px solid #1D9E75', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F6E56' }}>{group.nombre}</div>
                        {isAdminHere && (
                          <span style={{ fontSize: 10, background: '#FEF9EC', color: '#854F0B', border: '0.5px solid #F5C842', padding: '2px 8px', borderRadius: 99, fontWeight: 600, whiteSpace: 'nowrap' }}>👑 Admin</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a8a74' }}>
                        Código: <strong style={{ letterSpacing: 1 }}>{groupId}</strong>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, background: 'rgba(52,211,153,0.15)', color: '#0F6E56', padding: '3px 8px', borderRadius: 99, fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                      🤖 Kai activo
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {(group.fases ?? []).slice(0, 3).map(ph => (
                      <span key={ph} style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '2px 8px', borderRadius: 99 }}>
                        {PHASES[ph]?.label}
                      </span>
                    ))}
                    {(group.fases ?? []).length > 3 && (
                      <span style={{ fontSize: 10, color: '#aaa' }}>+{(group.fases ?? []).length - 3} más</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: isAdminHere ? 8 : 0 }}>
                    <a href={`/quiniela/${groupId}/picks`}
                      style={{ flex: 1, display: 'block', textAlign: 'center', background: '#1D9E75', color: '#fff', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      Ir a mis picks →
                    </a>
                    <button
                      onClick={() => {
                        const msg = encodeURIComponent(`¡Únete a la Quiniela del Mundial 2026! 🏆\n\n${group.nombre}\nCódigo: ${groupId}\n\n👉 ${window.location.origin}/quiniela/${groupId}`)
                        window.open(`https://wa.me/?text=${msg}`, '_blank')
                      }}
                      style={{ width: 42, height: 42, background: '#25D366', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      💬
                    </button>
                  </div>
                  {isAdminHere && (
                    <a href={`/quiniela/${groupId}/admin`}
                      style={{ display: 'block', textAlign: 'center', background: 'transparent', color: '#0F6E56', padding: '9px', borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: 'none', border: '0.5px solid #1D9E75' }}>
                      ⚙️ Gestionar quiniela
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── CREAR / UNIRSE (siempre, más compacto si ya hay quinielas) ── */}
        <div>
          {activeQuinielas.length > 0 && (
            <div style={{ fontSize: 12, color: '#888', marginBottom: 10, textAlign: 'center' }}>
              Unirse a otra quiniela
            </div>
          )}

          {/* Crear */}
          <div onClick={() => setMode('crear')} style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '18px 20px', cursor: 'pointer', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>🏆</span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Crear quiniela</div>
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Invita amigos, familia o compañeros y compitan durante todo el torneo.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              {['Ranking automático en tiempo real', 'Análisis de jornada con Kai', 'Consenso entre participantes', 'Panel de admin con código de acceso'].map(f => (
                <div key={f} style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1D9E75', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ background: '#1D9E75', color: '#fff', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: 'center' }}>
              Crear ahora →
            </div>
          </div>

          {/* Unirse */}
          <div onClick={() => setMode('unir')} style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '18px 20px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>🎟️</span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Unirme con código</div>
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Ingresa el código que te dio el organizador y comienza a competir.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              {['Acceso instantáneo', 'Historial de picks guardado', 'Estadísticas e insights de Kai'].map(f => (
                <div key={f} style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#1D9E75', fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ background: 'transparent', color: '#1D9E75', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: 'center', border: '0.5px solid #1D9E75' }}>
              Ingresar código →
            </div>
          </div>
        </div>

        {/* ── FOOTER KAI ── */}
        <div style={{ marginTop: 8, paddingTop: 20, borderTop: '0.5px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <KaiAvatar size={28} state="ready" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', letterSpacing: 1, textTransform: 'uppercase' }}>Powered by Kai</div>
              <div style={{ fontSize: 10, color: '#aaa' }}>BONSIGHT Intelligence Layer</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.65, marginBottom: 14 }}>
            Kai analiza partidos, interpreta consensos, detecta oportunidades y genera insights antes de cada jornada para ayudarte a tomar mejores decisiones durante todo el Mundial.
          </div>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <img src="/logo.svg" style={{ height: 18, width: 'auto', opacity: 0.4 }} alt="Bonsight" />
          </a>
        </div>

      </div>
    </div>
  )
}
