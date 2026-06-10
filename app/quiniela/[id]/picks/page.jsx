'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PHASES, PHASE_ORDER, TEAMS, SCORERS, FLAGS, calcularPuntajes } from '@/lib/quiniela'
import { KaiLabel, KaiAvatar } from '@/components/KaiAvatar'

const GRUPO_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const TORNEO_INICIO = new Date('2026-06-11T16:00:00Z')

function getMatchCutoff(phase, globalIndex) {
  if (phase === 'grupos') {
    const match = PHASES.grupos.matches[globalIndex]
    return match?.kickoff ? new Date(match.kickoff) : TORNEO_INICIO
  }
  return {
    ronda32: new Date('2026-06-28T13:00:00Z'),
    octavos: new Date('2026-07-04T13:00:00Z'),
    cuartos: new Date('2026-07-09T13:00:00Z'),
    semis:   new Date('2026-07-14T13:00:00Z'),
    final:   new Date('2026-07-19T15:00:00Z'),
  }[phase] ?? new Date('2099-01-01')
}

function formatCountdown(ms) {
  if (ms <= 0) return null
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatSaved(ts) {
  if (!ts) return null
  const diff = Math.floor((Date.now() - ts) / 60000)
  if (diff < 1) return 'Guardado hace un momento'
  if (diff === 1) return 'Guardado hace 1 min'
  return `Guardado hace ${diff} min`
}

function f(team) { return FLAGS[team] ? `${FLAGS[team]} ` : '' }

// ── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({ groupId, active, isAdmin }) {
  const item = (href, label, key) => (
    <a href={href} style={{
      flex: 1, padding: '10px 0 12px', textAlign: 'center', textDecoration: 'none',
      fontSize: 14, fontWeight: active === key ? 600 : 400,
      color: active === key ? '#1D9E75' : '#aaa',
      borderTop: `2px solid ${active === key ? '#1D9E75' : 'transparent'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>{label}</a>
  )
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 720 }}>
        {item(`/quiniela/${groupId}/picks`,       '📋 Mis picks',   'picks')}
        {item(`/quiniela/${groupId}/seguimiento`, '📊 Seguimiento', 'seguimiento')}
        {isAdmin && item(`/quiniela/${groupId}/admin`, '⚙️ Admin', 'admin')}
      </div>
    </div>
  )
}

// ── Premios Mayores ───────────────────────────────────────────────────────────

function PremiosMayores({ campeon, goleador, customGoleador, onCampeon, onGoleador, onCustomGoleador, admin, countdown }) {
  const now = Date.now()
  const specialLocked   = now >= TORNEO_INICIO.getTime()
  const specialResolved = specialLocked && !!(admin?.realCampeon && admin?.realGoleador)
  const effectiveGoleador = goleador === 'Otro' ? (customGoleador.trim() || '') : goleador
  const campeonCorrecto  = specialResolved && !!campeon          && campeon          === admin.realCampeon
  const goleadorCorrecto = specialResolved && !!effectiveGoleador && effectiveGoleador === admin.realGoleador

  const sel = { padding: '9px 12px', borderRadius: 8, border: '0.5px solid rgba(15,110,86,.35)', background: 'rgba(255,255,255,.7)', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const inp = { padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(15,110,86,.35)', background: 'rgba(255,255,255,.7)', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', marginTop: 6 }

  if (specialResolved) {
    const bonusPts = (campeonCorrecto ? 5 : 0) + (goleadorCorrecto ? 3 : 0)
    return (
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, padding: 18, marginBottom: 16, background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 Premios Mayores</div>
          {bonusPts > 0
            ? <span style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>+{bonusPts} pts</span>
            : <span style={{ background: '#f1efe8', color: '#888', fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>0 pts</span>}
        </div>
        <div style={{ fontSize: 15, color: "#888", marginBottom: 14 }}>Los pronósticos que pueden definir la quiniela.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Campeón', pick: campeon, correcto: campeonCorrecto, real: admin.realCampeon },
            { label: 'Goleador', pick: effectiveGoleador, correcto: goleadorCorrecto, real: admin.realGoleador },
          ].map(({ label, pick, correcto, real }) => (
            <div key={label} style={{ background: correcto ? '#E1F5EE' : '#fff3f3', borderRadius: 10, padding: 12, border: `0.5px solid ${correcto ? '#1D9E75' : '#e0a0a0'}` }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 5 }}>{correcto ? '✅' : '❌'} {label}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{f(pick)}{pick || <span style={{ color: '#ccc', fontWeight: 400, fontSize: 13 }}>Pronóstico pendiente</span>}</div>
              {!correcto && real && <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Real: {f(real)}{real}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (specialLocked) {
    return (
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, padding: 18, marginBottom: 16, background: '#f9f9f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 Premios Mayores</div>
          <span style={{ background: '#e8e6e0', color: '#666', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99 }}>🔒 Confirmado</span>
        </div>
        <div style={{ fontSize: 15, color: "#aaa", marginBottom: 14 }}>Los pronósticos que pueden definir la quiniela.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[{ label: 'Campeón', pick: campeon }, { label: 'Goleador', pick: effectiveGoleador }].map(({ label, pick }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, padding: 12, border: '0.5px solid #eee' }}>
              <div style={{ fontSize: 11, color: '#aaa', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>
                {pick ? <>{f(pick)}{pick}</> : <span style={{ color: '#ccc', fontWeight: 400, fontStyle: 'italic', fontSize: 13 }}>Pronóstico pendiente</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Abierto
  const cdText = formatCountdown(countdown)
  return (
    <div style={{ background: 'linear-gradient(145deg, #E8F8F1 0%, #F5FCF8 100%)', border: '1.5px solid #1D9E75', borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: '0 2px 16px rgba(29,158,117,.08)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 Premios Mayores</div>
        {cdText && <span style={{ background: '#fff', border: '0.5px solid #1D9E75', color: '#0F6E56', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 99 }}>⏳ Cierre en {cdText}</span>}
      </div>
      <div style={{ fontSize: 15, color: "#5a8a74", marginBottom: 14 }}>Los pronósticos que pueden definir la quiniela.</div>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {/* Campeón */}
        <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: 12, border: '0.5px solid rgba(29,158,117,.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56' }}>Campeón</span>
            <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>5 pts</span>
          </div>
          {campeon && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{f(campeon)}{campeon}</div>}
          <select style={sel} value={campeon} onChange={e => onCampeon(e.target.value)}>
            <option value="">{campeon ? 'Cambiar...' : 'Seleccionar...'}</option>
            {TEAMS.map(t => <option key={t} value={t}>{f(t)}{t}</option>)}
          </select>
        </div>

        {/* Goleador */}
        <div style={{ background: 'rgba(255,255,255,.6)', borderRadius: 10, padding: 12, border: '0.5px solid rgba(29,158,117,.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56' }}>Goleador</span>
            <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99 }}>3 pts</span>
          </div>
          {goleador && goleador !== 'Otro' && <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{goleador}</div>}
          <select style={sel} value={goleador} onChange={e => onGoleador(e.target.value)}>
            <option value="">{goleador ? 'Cambiar...' : 'Seleccionar...'}</option>
            {SCORERS.map(s => <option key={s} value={s}>{s === 'Otro' ? '✏️ Jugador no listado' : s}</option>)}
          </select>
          {goleador === 'Otro' && (
            <input
              style={inp}
              placeholder="Nombre del jugador"
              value={customGoleador}
              onChange={e => onCustomGoleador(e.target.value)}
            />
          )}
        </div>
      </div>

      <div style={{ fontSize: 14, color: '#5a8a74', borderTop: '0.5px solid rgba(29,158,117,.2)', paddingTop: 10 }}>
        Los pronósticos se bloquean automáticamente al inicio de cada partido.
      </div>
    </div>
  )
}

// ── OnboardingModal ──────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  {
    icon: '🏆',
    title: 'Bienvenido a la Quiniela',
    desc: 'Cada pick que haces acumula puntos. Exacto = 3 pts, ganador correcto = 1 pt. Kai te ayuda a decidir mejor.',
  },
  {
    icon: '🤖',
    title: '¿Qué es Kai?',
    desc: 'Kai analiza cada partido y te dice qué tan predecible es el resultado.',
    items: [
      { e: '🔥', label: 'Muy favorable', desc: 'El partido tiene un claro favorito (85%+)' },
      { e: '🟢', label: 'Favorable', desc: 'Un equipo lleva ventaja real (70–84%)' },
      { e: '🟡', label: 'Partido abierto', desc: 'Equilibrado — cualquier resultado es posible' },
      { e: '🔴', label: 'Muy incierto', desc: 'Pick de alto riesgo, muy difícil de acertar' },
    ],
  },
  {
    icon: '👥',
    title: '¿Qué es "Vs. consenso"?',
    desc: 'Kai compara tu pick con el del resto de tu quiniela.',
    items: [
      { e: '⚠️', label: 'Vs. consenso', desc: 'Vas contra la mayoría — si acertás, adelantás en la tabla' },
      { e: '✅', label: 'Con la mayoría', desc: 'Pick más seguro, menor diferencial frente al grupo' },
    ],
  },
  {
    icon: '✅',
    title: '¡Listo!',
    desc: 'Llena tus picks, guárdalos y sigue la tabla en Seguimiento. El botón ⓘ de Kai está siempre disponible.',
  },
]

function OnboardingModal({ step, total, onNext, onSkip }) {
  const s = ONBOARDING_STEPS[step]
  const isLast = step === total - 1
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 480, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {ONBOARDING_STEPS.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 99, background: i === step ? '#1D9E75' : '#e0e0de', transition: 'width .25s' }} />
          ))}
        </div>
        <div style={{ fontSize: 36, marginBottom: 10 }}>{s.icon}</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, lineHeight: 1.25 }}>{s.title}</div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: s.items ? 16 : 28 }}>{s.desc}</div>
        {s.items && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {s.items.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f9f9f7', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{item.e}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#222', marginBottom: 1 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <button onClick={onNext} style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '13px', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%', marginBottom: 10 }}>
          {isLast ? '¡Entendido, a mis picks! →' : 'Siguiente →'}
        </button>
        {!isLast && (
          <button onClick={onSkip} style={{ background: 'none', border: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer', width: '100%' }}>
            Saltar
          </button>
        )}
      </div>
    </div>
  )
}

// ── KaiHelpModal ─────────────────────────────────────────────────────────────

function KaiHelpModal({ onClose }) {
  const sections = [
    {
      title: 'Nivel de certeza del resultado',
      items: [
        { e: '🔥', label: 'Muy favorable', desc: 'El partido tiene un claro favorito. Pick confiable (85%+).' },
        { e: '🟢', label: 'Favorable', desc: 'Un equipo lleva ventaja real. Bastante predecible (70–84%).' },
        { e: '🟡', label: 'Partido abierto', desc: 'Equilibrado. Cualquier resultado es posible. Riesgo medio (55–69%).' },
        { e: '🔴', label: 'Muy incierto', desc: 'Pick difícil, alto riesgo. Si acertás, más diferencial en la tabla.' },
      ],
    },
    {
      title: 'Consenso de la quiniela',
      items: [
        { e: '⚠️', label: 'Vs. consenso', desc: 'Tu pick va contra la mayoría. Si acertás, adelantás a varios en la tabla.' },
        { e: '✅', label: 'Con la mayoría', desc: 'Tu pick coincide con el del grupo. Más seguro, menor diferencial.' },
        { e: '💡', label: 'Oportunidad estratégica', desc: 'Kai detecta que según tu posición en la tabla, ir contra el consenso puede convenir o no.' },
      ],
    },
  ]
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', width: '100%', maxWidth: 480, boxSizing: 'border-box', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🤖 Indicadores de Kai</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#aaa', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.55, marginBottom: 18 }}>
          Kai analiza estadísticas, forma reciente y contexto del torneo para evaluar cada partido.
        </div>
        {sections.map(sec => (
          <div key={sec.title} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>{sec.title}</div>
            {sec.items.map((item, i, arr) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{item.e}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <button onClick={onClose} style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' }}>
          Entendido
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const st = {
  page:    { maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)' },
  scoreIn: { width: 30, height: 30, textAlign: 'center', border: '0.5px solid #ccc', borderRadius: 6, background: 'transparent', fontSize: 16, fontWeight: 500, color: 'inherit' },
  disIn:   { background: '#f5f5f3', color: '#bbb', border: '0.5px solid #eee' },
}

export default function PicksPage() {
  const { id: groupId } = useParams()
  const router = useRouter()

  const [auth, setAuth]           = useState('checking')
  const [participant, setParticipant] = useState(null)
  const [group, setGroup]         = useState(null)
  const [admin, setAdmin]         = useState(null)
  const [myRank, setMyRank]       = useState(null)
  const [totalParts, setTotalParts] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]         = useState(false)
  const [lastSaved, setLastSaved]     = useState(null)
  const [toast, setToast]             = useState('')
  const [isAdmin, setIsAdmin]         = useState(false)
  const [expandedMatches, setExpandedMatches] = useState(new Set())
  const [kaiHelpOpen, setKaiHelpOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)

  function toggleMatch(idx) {
    setExpandedMatches(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const [currentPhase, setCurrentPhase] = useState('grupos')
  const [selectedGrupo, setSelectedGrupo] = useState('A')
  const [picks, setPicks] = useState(
    Object.fromEntries(PHASE_ORDER.map(ph => [ph, PHASES[ph].matches.map(() => ({ l: '', v: '', w: '' }))]))
  )
  // IA features
  const [confidence, setConfidence]         = useState([])
  const [suggestion, setSuggestion]         = useState([])
  const [suggestionOpen, setSuggestionOpen] = useState(false)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [allQuinielas, setAllQuinielas]     = useState({})

  const [campeon, setCampeon]           = useState('')
  const [goleador, setGoleador]         = useState('')
  const [customGoleador, setCustomGoleador] = useState('')
  const [countdown, setCountdown]       = useState(TORNEO_INICIO - Date.now())

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // handlers que marcan dirty
  const onCampeon  = (v) => { setCampeon(v);       setIsDirty(true) }
  const onGoleador = (v) => { setGoleador(v);      setIsDirty(true) }
  const onCustomG  = (v) => { setCustomGoleador(v); setIsDirty(true) }

  useEffect(() => {
    const id = setInterval(() => setCountdown(TORNEO_INICIO - Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(`quiniela_token_${groupId}`)
    if (!token) { setAuth('denied'); router.replace(`/quiniela/${groupId}`); return }
    setIsAdmin(!!localStorage.getItem(`quiniela_admin_${groupId}`))

    Promise.all([
      fetch(`/api/quiniela?action=participante&token=${token}`).then(r => r.json()),
      fetch(`/api/quiniela?action=all&groupId=${groupId}`).then(r => r.json()),
    ]).then(([pData, aData]) => {
      if (pData.error) { setAuth('denied'); router.replace(`/quiniela/${groupId}`); return }

      const p = pData.participant
      const a = aData.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' }
      const parts = aData.participants ?? []
      const quins = aData.quinielas ?? {}

      setParticipant(p)
      setGroup(aData.group)
      setAdmin(a)
      setTotalParts(parts.length)
      setAllQuinielas(quins)

      const scores = calcularPuntajes(parts, quins, a)
      const sorted = [...scores].sort((x, y) => y.pts - x.pts)
      const rank = sorted.findIndex(s => s.participantId === p.id)
      setMyRank(rank >= 0 ? rank + 1 : null)

      const q = quins[p.id]
      if (q) {
        setPicks(prev => {
          const next = { ...prev }
          PHASE_ORDER.forEach(ph => { if (q.phases?.[ph]) next[ph] = q.phases[ph] })
          return next
        })
        // Goleador: detectar si es custom
        if (q.campeon) setCampeon(q.campeon)
        if (q.goleador) {
          if (SCORERS.includes(q.goleador)) {
            setGoleador(q.goleador)
          } else {
            setGoleador('Otro')
            setCustomGoleador(q.goleador)
          }
        }
      }

      const activeFases = (aData.group?.fases ?? PHASE_ORDER).filter(ph => PHASE_ORDER.includes(ph))
      const lastUnlocked = [...activeFases].reverse().find(ph => a.unlockedPhases.includes(ph)) ?? 'grupos'
      setCurrentPhase(lastUnlocked)

      // Cargar confidence para la fase activa
      fetch(`/api/quiniela-ai?action=getConfidence&groupId=${groupId}&phase=${lastUnlocked}`)
        .then(r => r.json())
        .then(d => { if (d.confidence) setConfidence(d.confidence) })
        .catch(() => {})

      // Cargar o generar suggestion para el participante
      const pid = p.id
      fetch(`/api/quiniela-ai?action=getSuggestion&groupId=${groupId}&phase=${lastUnlocked}&participantId=${pid}`)
        .then(r => r.json())
        .then(async (d) => {
          if (d.suggestion !== null) {
            setSuggestion(d.suggestion)
            setSuggestionOpen(d.suggestion.length > 0)
          } else {
            // Primera apertura: generar
            setSuggestionLoading(true)
            const matchList = PHASES[lastUnlocked]?.matches ?? []
            const existingQ = quins[pid]
            const existingPicks = matchList.map((_, i) => existingQ?.phases?.[lastUnlocked]?.[i] ?? { l: '', v: '', w: '' })
            try {
              const res = await fetch('/api/quiniela-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'generateSuggestion',
                  payload: {
                    groupId,
                    phase: lastUnlocked,
                    participantId: pid,
                    participantName: p.nombre,
                    existingPicks,
                    matches: matchList,
                  },
                }),
              })
              const data = await res.json()
              if (data.suggestion?.length > 0) {
                setSuggestion(data.suggestion)
                setSuggestionOpen(true)
              }
            } catch {} finally { setSuggestionLoading(false) }
          }
        })
        .catch(() => {})

      setAuth('ok')
      if (!localStorage.getItem('quiniela_onboarding_done')) setShowOnboarding(true)
    }).catch(() => {
      setAuth('denied'); router.replace(`/quiniela/${groupId}`)
    }).finally(() => setLoading(false))
  }, [groupId, router])

  // Recargar confidence cuando cambia la fase
  useEffect(() => {
    if (auth !== 'ok' || !groupId) return
    fetch(`/api/quiniela-ai?action=getConfidence&groupId=${groupId}&phase=${currentPhase}`)
      .then(r => r.json())
      .then(d => setConfidence(d.confidence ?? []))
      .catch(() => {})
  }, [currentPhase, auth, groupId])

  function updatePick(phase, globalIndex, field, val) {
    setIsDirty(true)
    setPicks(prev => {
      const next = { ...prev }
      next[phase] = [...next[phase]]
      const updated = { ...next[phase][globalIndex], [field]: val }
      if ((field === 'l' || field === 'v') && updated.l !== '' && updated.v !== '') {
        const lN = Number(updated.l), vN = Number(updated.v)
        const match = PHASES[phase].matches[globalIndex]
        if (!isNaN(lN) && !isNaN(vN) && match)
          updated.w = lN > vN ? match.local : lN < vN ? match.visitante : 'Empate'
      }
      next[phase][globalIndex] = updated
      return next
    })
  }

  async function handleSave() {
    if (!isDirty) return
    setSaving(true)
    const effectiveGoleador = goleador === 'Otro' ? (customGoleador.trim() || 'Otro') : goleador
    try {
      const res = await fetch('/api/quiniela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveQuiniela',
          payload: { participantId: participant.id, phases: picks, campeon, goleador: effectiveGoleador, groupId },
        }),
      })
      if ((await res.json()).ok) {
        setLastSaved(Date.now())
        setIsDirty(false)
      } else showToast('Error al guardar. Intenta de nuevo.')
    } catch { showToast('Error de conexión') }
    finally { setSaving(false) }
  }

  if (auth === 'checking' || loading) return (
    <div style={{ ...st.page, textAlign: 'center', paddingTop: '4rem', color: '#aaa' }}>Cargando...</div>
  )
  if (auth === 'denied') return null

  const activeFases = (group?.fases ?? PHASE_ORDER).filter(ph => PHASE_ORDER.includes(ph))
  const now = Date.now()
  const isLive = now >= TORNEO_INICIO.getTime()

  // Categoría visual de Kai basada en confidencePct
  function getCategory(pct) {
    if (!pct) return { emoji: '⚪', label: 'Analizando', color: '#aaa', barColor: '#ccc', bg: 'rgba(52,211,153,0.03)' }
    if (pct >= 85) return { emoji: '🔥', label: 'Muy favorable',   color: '#15803d', barColor: '#22c55e', bg: 'rgba(34,197,94,0.06)'  }
    if (pct >= 70) return { emoji: '🟢', label: 'Favorable',       color: '#166534', barColor: '#4ade80', bg: 'rgba(52,211,153,0.05)'  }
    if (pct >= 55) return { emoji: '🟡', label: 'Partido abierto', color: '#92400e', barColor: '#fbbf24', bg: 'rgba(251,191,36,0.06)'  }
    return               { emoji: '🔴', label: 'Muy incierto',    color: '#991b1b', barColor: '#f87171', bg: 'rgba(248,113,113,0.06)' }
  }

  // Consenso: agrega picks de todos los participantes por partido
  function getConsensus(phase, globalIndex, local, visitante) {
    const votes = {}
    let total = 0
    Object.values(allQuinielas).forEach(q => {
      const w = q.phases?.[phase]?.[globalIndex]?.w
      if (w && (w === local || w === visitante || w === 'Empate')) {
        votes[w] = (votes[w] ?? 0) + 1
        total++
      }
    })
    if (total < 1) return null
    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1])
    const [leader, topVotes] = sorted[0]
    return { leader, pct: Math.round((topVotes / total) * 100), total, votes }
  }

  // Oportunidad estratégica — solo cuando hay algo accionable que decir
  function getOpportunity(cs, myPick) {
    if (!cs || !myPick) return null // sin pick propio: el consenso habla por sí solo
    const { leader, pct } = cs
    const goingAgainst = myPick !== leader
    const isNearLast   = myRank !== null && totalParts > 3 && myRank >= totalParts - 1
    const isLeading    = myRank === 1

    // Solo mostrar oportunidad en casos accionables
    if (goingAgainst) {
      if (pct >= 75) {
        if (isNearLast) return { icon: '⚡', text: `Vas abajo — ir contra el ${pct}% puede ser el diferencial que necesitás.` }
        if (isLeading)  return { icon: '⚠️', text: `Vas primero — alejarte del ${pct}% en este partido tiene riesgo real.` }
        return { icon: '💡', text: `Un acierto aquí descuenta puntos a gran parte de la quiniela.` }
      }
      if (pct >= 56) {
        if (isNearLast) return { icon: '⚡', text: `Ir contra la mayoría puede ser el diferencial para remontar.` }
        return { icon: '💡', text: `Vas contra el consenso — si acertás, ganás terreno en la tabla.` }
      }
    }

    if (!goingAgainst && isLeading && pct >= 70) {
      return { icon: '✅', text: `Con la mayoría — pick que protege tu ventaja en la tabla.` }
    }

    if (pct >= 45 && pct <= 55) {
      return { icon: '💡', text: `Comunidad dividida — tu elección puede marcar la diferencia.` }
    }

    return null // alineado con mayoría sin nada especial → sin texto extra
  }

  const unlockedFases = activeFases.filter(ph => admin?.unlockedPhases.includes(ph))
  const totalSlots = unlockedFases.reduce((acc, ph) => acc + PHASES[ph].matches.length, 0)
  const filledSlots = unlockedFases.reduce((acc, ph) =>
    acc + (picks[ph] ?? []).filter(p => p.l !== '' || p.v !== '').length, 0)
  const progressPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0

  const visibleMatches = currentPhase === 'grupos'
    ? (() => {
        const gi = GRUPO_LETTERS.indexOf(selectedGrupo)
        return PHASES.grupos.matches.slice(gi * 6, gi * 6 + 6).map((m, i) => ({ ...m, globalIndex: gi * 6 + i }))
      })()
    : PHASES[currentPhase].matches.map((m, i) => ({ ...m, globalIndex: i }))

  const firstPendingIndex = visibleMatches.find(({ globalIndex }) => {
    const p = picks[currentPhase][globalIndex] ?? { l: '', v: '', w: '' }
    return p.l === '' && p.v === '' && now < getMatchCutoff(currentPhase, globalIndex).getTime()
  })?.globalIndex ?? -1

  const phaseTab = (ph) => {
    const unlocked = admin?.unlockedPhases.includes(ph)
    const active = currentPhase === ph
    return {
      padding: '5px 13px', fontSize: 14, fontWeight: 500, borderRadius: 99, border: '0.5px solid #ccc',
      cursor: unlocked ? 'pointer' : 'not-allowed',
      background: active ? '#1D9E75' : 'transparent',
      color: active ? '#fff' : unlocked ? 'inherit' : '#bbb',
      opacity: unlocked ? 1 : .5,
    }
  }

  const cdHeader = formatCountdown(countdown)
  const rankLabel = myRank ? `${myRank}° de ${totalParts}` : null

  return (
    <div style={st.page}>

      {/* ── header ── */}
      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚽</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{participant?.nombre}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{group?.nombre}</div>
          </div>
          {isLive && <div style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 12, padding: '4px 10px', borderRadius: 99 }}>Torneo en curso ⚽</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {rankLabel && (
            <span style={{ fontSize: 12, color: '#0F6E56', fontWeight: 600, whiteSpace: 'nowrap' }}>
              {myRank === 1 ? '🥇' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : '📍'} {rankLabel}
            </span>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ height: 5, background: '#f0f0ee', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: progressPct === 100 ? '#1D9E75' : '#4DC9A0', borderRadius: 99, transition: 'width .4s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>
              {progressPct === 100 ? '🔥 ¡Picks completos!' : `${filledSlots}/${totalSlots} picks · ${progressPct}%`}
            </div>
          </div>
          {totalParts > 0 && <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>{totalParts} jugadores</span>}
        </div>
      </div>

      {/* ── banner de cierre ── */}
      {!isLive && cdHeader && (
        <div style={{ background: '#FEF9EC', border: '1px solid #F5C842', borderRadius: 10, padding: '10px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: '#9a6010', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Cierre de picks · {PHASES[currentPhase]?.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#854F0B' }}>⏳ {cdHeader}</div>
          </div>
          <div style={{ fontSize: 11, color: '#9a6010', textAlign: 'right' }}>
            {TORNEO_INICIO.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}<br/>
            {TORNEO_INICIO.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
          </div>
        </div>
      )}

      {/* ── Premios Mayores ── */}
      <PremiosMayores
        campeon={campeon} goleador={goleador} customGoleador={customGoleador}
        onCampeon={onCampeon} onGoleador={onGoleador} onCustomGoleador={onCustomG}
        admin={admin} countdown={countdown}
      />

      {/* ── scoring bar ── */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f5f5f3', borderRadius: 8, padding: '7px 12px', marginBottom: 10, fontSize: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#888' }}>Puntos:</span>
        {[['🎯','3 pts','Exacto'],['✅','1 pt','Ganador']].map(([emoji, pts, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{emoji}</span>
            <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 11, padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>{pts}</span>
            <span style={{ color: '#888' }}>{label}</span>
          </span>
        ))}
      </div>

      {/* ── phase tabs ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {activeFases.map(ph => (
          <button key={ph} style={phaseTab(ph)} onClick={() => { if (admin?.unlockedPhases.includes(ph)) setCurrentPhase(ph) }}>
            {PHASES[ph].label}{!admin?.unlockedPhases.includes(ph) ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      {/* ── sub-nav grupos A–L ── */}
      {currentPhase === 'grupos' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
          {GRUPO_LETTERS.map(g => (
            <button key={g} onClick={() => setSelectedGrupo(g)} style={{
              minWidth: 36, height: 36, borderRadius: 8,
              border: selectedGrupo === g ? '1.5px solid #1D9E75' : '0.5px solid #ddd',
              fontSize: 14, fontWeight: selectedGrupo === g ? 700 : 400,
              background: selectedGrupo === g ? '#1D9E75' : '#fafafa',
              color: selectedGrupo === g ? '#fff' : '#555', cursor: 'pointer',
            }}>{g}</button>
          ))}
        </div>
      )}

      {/* ── sugerencia IA ── */}
      {(suggestionLoading || suggestion.length > 0) && (() => {
        const filteredSuggestions = currentPhase === 'grupos'
          ? suggestion.filter(s => {
              const gi = GRUPO_LETTERS.indexOf(selectedGrupo)
              return s.matchIndex >= gi * 6 && s.matchIndex < (gi + 1) * 6
            })
          : suggestion
        return (
          <div style={{ background: '#f5f5f3', borderRadius: 10, marginBottom: 12, overflow: 'hidden', border: '0.5px solid #e8e6e0' }}>
            <button
              onClick={() => setSuggestionOpen(o => !o)}
              style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KaiLabel
                  title="Recomendación de Kai"
                  subtitle={suggestionLoading ? 'Kai está analizando tus picks…' : 'Basado en tu historial de pronósticos'}
                  state={suggestionLoading ? 'thinking' : 'ready'}
                  size={20}
                />
              </span>
              <span style={{ color: '#aaa', fontSize: 11 }}>{suggestionOpen ? '▲' : '▼'}</span>
            </button>
            {suggestionOpen && !suggestionLoading && filteredSuggestions.length > 0 && (
              <div style={{ borderTop: '0.5px solid #e0e0de', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredSuggestions.map(s => {
                  const match = PHASES[currentPhase].matches[s.matchIndex]
                  if (!match) return null
                  return (
                    <div key={s.matchIndex} style={{ fontSize: 14 }}>
                      <div style={{ fontWeight: 500, marginBottom: 2 }}>
                        {f(s.local)}{s.local} vs {f(s.visitante)}{s.visitante}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 6 }}>
                          {s.suggestedL}–{s.suggestedV}
                        </span>
                        <span style={{ fontSize: 11, color: '#0F6E56' }}>→ {s.suggestedW}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>{s.reason}</div>
                    </div>
                  )
                })}
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 4, borderTop: '0.5px solid #eee', paddingTop: 8 }}>
                  Solo orientativo — tú decides tus picks.
                </div>
              </div>
            )}
            {suggestionOpen && !suggestionLoading && filteredSuggestions.length === 0 && (
              <div style={{ borderTop: '0.5px solid #e0e0de', padding: '10px 14px', fontSize: 13, color: '#aaa' }}>
                Todos los picks de este grupo ya están completados 🎉
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Radar Kai por grupo ── */}
      {currentPhase === 'grupos' && confidence.length > 0 && (() => {
        const gi = GRUPO_LETTERS.indexOf(selectedGrupo)
        const groupConf = confidence.filter(c => c.matchIndex >= gi * 6 && c.matchIndex < (gi + 1) * 6 && c.confidencePct)
        if (groupConf.length < 2) return null
        const sorted = [...groupConf].sort((a, b) => (b.confidencePct ?? 0) - (a.confidencePct ?? 0))
        const top    = sorted[0]
        const even   = groupConf.reduce((best, c) => Math.abs((c.confidencePct ?? 50) - 50) < Math.abs((best.confidencePct ?? 50) - 50) ? c : best)
        const bottom = sorted[sorted.length - 1]
        const nm = (c) => { const m = PHASES.grupos.matches[c.matchIndex]; return m ? `${f(m.local)}${m.local} vs ${f(m.visitante)}${m.visitante}` : '' }
        return (
          <div style={{ background: 'rgba(52,211,153,0.04)', border: '0.5px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <KaiAvatar size={14} state="ready" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', letterSpacing: 1, textTransform: 'uppercase' }}>Radar Kai — Grupo {selectedGrupo}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: '#444' }}>🔥 {nm(top)} <span style={{ color: '#15803d', fontWeight: 600 }}>{top.confidencePct}%</span></span>
              {even.matchIndex !== top.matchIndex && <span style={{ fontSize: 14, color: '#444' }}>⚔️ {nm(even)} <span style={{ color: '#92400e', fontWeight: 600 }}>{even.confidencePct}%</span></span>}
              {bottom.matchIndex !== top.matchIndex && <span style={{ fontSize: 14, color: '#444' }}>🎲 {nm(bottom)}</span>}
            </div>
          </div>
        )
      })()}

      {/* ── partidos — layout vertical estilo Google/SofaScore ── */}
      <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {visibleMatches.map(({ local, visitante, globalIndex }) => {
          const cutoff = getMatchCutoff(currentPhase, globalIndex)
          const locked = now >= cutoff.getTime()
          const pick   = picks[currentPhase][globalIndex] ?? { l: '', v: '', w: '' }

          const localWins     = pick.w === local
          const visitanteWins = pick.w === visitante
          const isEmpate      = pick.w === 'Empate'
          const isPending     = pick.l === '' && pick.v === '' && !locked

          // Colores exclusivamente para Kai — partidos siempre neutros
          const rowBg  = locked ? '#fafafa' : '#fff'
          const cardBorder = locked
            ? '0.5px solid #eee'
            : isPending
            ? '0.5px solid rgba(245,200,66,0.35)'
            : '0.5px solid #e0e0de'

          const inputSty = {
            width: 48, height: 44, textAlign: 'center',
            border: '0.5px solid #ddd', borderRadius: 8,
            fontSize: 20, fontWeight: 600, color: 'inherit',
            background: locked ? '#f0f0f0' : '#fff',
            outline: 'none', flexShrink: 0,
            WebkitAppearance: 'none', MozAppearance: 'textfield',
          }

          // Kai module
          const conf = confidence.find(c => c.matchIndex === globalIndex)
          const cs   = getConsensus(currentPhase, globalIndex, local, visitante)
          const cat  = getCategory(conf?.confidencePct)
          const hasPick  = !!pick.w
          const aligned  = hasPick && cs && pick.w === cs.leader
          const against  = hasPick && cs && pick.w !== cs.leader
          const leaderLbl = cs ? (cs.leader === 'Empate' ? 'empate' : `${f(cs.leader)}${cs.leader}`) : null
          const opp      = getOpportunity(cs, pick.w)
          const expanded = expandedMatches.has(globalIndex)

          return (
            <div key={globalIndex}>
              {/* ── Card vertical del partido ── */}
              <div style={{ border: cardBorder, borderRadius: 12, overflow: 'hidden' }}>
                {locked && (
                  <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center', padding: '4px 0', background: '#f9f9f7' }}>
                    🔒 picks bloqueados
                  </div>
                )}
                {isPending && (
                  <div style={{ background: 'rgba(245,200,66,0.1)', borderBottom: '0.5px solid rgba(245,200,66,0.2)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', padding: '5px 12px 3px' }}>
                      ⚽ Completa tu pronóstico
                    </div>
                    {globalIndex === firstPendingIndex && (
                      <div style={{ fontSize: 11, color: '#9a6010', padding: '0 12px 5px', lineHeight: 1.4 }}>
                        Ingresa los goles que crees que marcará cada equipo.
                      </div>
                    )}
                  </div>
                )}

                {/* Fila local */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: rowBg, borderBottom: '0.5px solid #f0f0f0' }}>
                  <div style={{ flex: 1, fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{f(local)}</span><span>{local}</span>
                  </div>
                  <input
                    style={inputSty} type="number" min={0} max={20} disabled={locked}
                    placeholder="?" value={pick.l}
                    onChange={e => !locked && updatePick(currentPhase, globalIndex, 'l', e.target.value)}
                  />
                  <div style={{ width: 28, textAlign: 'center', fontSize: 22 }}>
                    {localWins ? (FLAGS[local] ?? '') : isEmpate ? '🤝' : ''}
                  </div>
                </div>

                {/* Fila visitante */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: rowBg }}>
                  <div style={{ flex: 1, fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{f(visitante)}</span><span>{visitante}</span>
                  </div>
                  <input
                    style={inputSty} type="number" min={0} max={20} disabled={locked}
                    placeholder="?" value={pick.v}
                    onChange={e => !locked && updatePick(currentPhase, globalIndex, 'v', e.target.value)}
                  />
                  <div style={{ width: 28, textAlign: 'center', fontSize: 22 }}>
                    {visitanteWins ? (FLAGS[visitante] ?? '') : isEmpate ? '🤝' : ''}
                  </div>
                </div>
              </div>

              {/* ── Módulo Kai (colapsable) ── */}
              {(conf || cs) && (
                <div style={{ background: cat.bg, border: '0.5px solid rgba(52,211,153,0.18)', borderRadius: '0 0 10px 10px', marginTop: -4, overflow: 'hidden' }}>
                  <div onClick={() => toggleMatch(globalIndex)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    {conf?.confidencePct && (
                      <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                        <div style={{ width: `${conf.confidencePct}%`, height: '100%', background: cat.barColor }} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px' }}>
                      <KaiAvatar size={12} state="ready" />
                      {conf?.confidencePct
                        ? <>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399' }}>Kai</span>
                            <span style={{ fontSize: 14 }}>{cat.emoji}</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: cat.color, flex: 1 }}>{cat.label}</span>
                          </>
                        : <span style={{ fontSize: 13, color: '#aaa', flex: 1 }}>Kai · análisis disponible</span>
                      }
                      <button
                        onClick={e => { e.stopPropagation(); setKaiHelpOpen(true) }}
                        style={{ background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', color: '#bbb', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}
                        title="¿Qué significan estos indicadores?">
                        ⓘ
                      </button>
                      <span style={{ fontSize: 9, color: '#aaa' }}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {cs && (
                    <div style={{ paddingLeft: 12, paddingRight: 12, paddingBottom: 7 }}>
                      <div style={{ fontSize: 15, color: against ? '#854F0B' : aligned ? '#166534' : '#888' }}>
                        {against ? `⚠️ Vs. consenso — ${cs.pct}% eligió ${leaderLbl}`
                          : aligned ? `✅ ${cs.pct}% eligió ${leaderLbl}`
                          : `👥 ${cs.pct}% eligió ${leaderLbl}`}
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div style={{ borderTop: '0.5px solid rgba(52,211,153,0.15)', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {conf?.headline && <div style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{conf.headline}</div>}
                      {conf?.insight  && <div style={{ fontSize: 14, color: '#555' }}>{conf.insight}</div>}
                      {opp && <div style={{ fontSize: 15, color: '#444' }}>{opp.icon} {opp.text}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── guardar ── */}
      <button
        onClick={handleSave}
        disabled={!isDirty || saving}
        style={{
          background: saving ? '#9FE1CB' : isDirty ? '#1D9E75' : '#f0f0ee',
          color: isDirty || saving ? '#fff' : '#aaa',
          border: 'none', padding: '12px', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
          cursor: isDirty && !saving ? 'pointer' : 'default',
          width: '100%', transition: 'background .2s',
        }}
      >
        {saving ? 'Guardando...' : isDirty ? '💾 Guardar cambios' : '✓ Todo guardado'}
      </button>
      {lastSaved && !isDirty && (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 6 }}>
          {formatSaved(lastSaved)}
        </div>
      )}

      {/* ── footer ── */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}><img src="/logo.svg" style={{ height: 22, width: "auto", opacity: 0.72 }} alt="Bonsight" /></a>
        <div style={{ fontSize: 11, color: '#bbb' }}>Mundial 2026</div>
      </div>

      <BottomNav groupId={groupId} active="picks" isAdmin={isAdmin} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{toast}</div>
      )}
      {kaiHelpOpen && <KaiHelpModal onClose={() => setKaiHelpOpen(false)} />}
      {showOnboarding && (
        <OnboardingModal
          step={onboardingStep}
          total={ONBOARDING_STEPS.length}
          onNext={() => {
            if (onboardingStep < ONBOARDING_STEPS.length - 1) {
              setOnboardingStep(n => n + 1)
            } else {
              localStorage.setItem('quiniela_onboarding_done', '1')
              setShowOnboarding(false)
            }
          }}
          onSkip={() => {
            localStorage.setItem('quiniela_onboarding_done', '1')
            setShowOnboarding(false)
          }}
        />
      )}
    </div>
  )
}
