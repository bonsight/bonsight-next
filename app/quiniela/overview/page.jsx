'use client'

import { useEffect, useState } from 'react'
import { PHASES, PHASE_ORDER, FLAGS, TEAMS, SCORERS } from '@/lib/quiniela'

const KEY = 'bonsight2026'
const GRUPO_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const f = (team) => FLAGS[team] ? `${FLAGS[team]} ` : ''

function emptyResults() {
  return Object.fromEntries(PHASE_ORDER.map(ph => [ph, PHASES[ph].matches.map(() => ({ l: '', v: '' }))]))
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name) {
  return (name ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Avatar({ name, size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.34), fontWeight: 600, flexShrink: 0 }}>
      {initials(name)}
    </div>
  )
}

// ── Signal computation ─────────────────────────────────────────────────────────

function getBase() {
  return typeof window !== 'undefined' ? window.location.origin : 'https://www.bonsight.co'
}

function buildGroupedSignals(quinielas) {
  const sinPicks = [], kaiPendiente = [], bajaPart = []

  quinielas.forEach(q => {
    const pending = q.participants.length - q.picksCount
    if (q.participants.length > 0 && pending > 0) {
      sinPicks.push({
        quiniela: q.nombre, id: q.id, adminTel: q.adminTel, adminNombre: q.adminNombre,
        detail: `${pending} participante${pending > 1 ? 's' : ''} sin completar · ${pending} picks pendientes`,
        msg: `Hola equipo 👋 Faltan picks por completar en la quiniela *${q.nombre}* 🏆\n\n• ${pending} participante${pending > 1 ? 's' : ''} aún no ${pending > 1 ? 'terminan' : 'termina'}\n\n¡Entren antes del cierre! 👉 ${getBase()}/quiniela/${q.id}/picks`,
      })
    }
    if (q.participants.length > 0 && !q.kai.jornada) {
      kaiPendiente.push({
        quiniela: q.nombre, id: q.id, adminTel: q.adminTel, adminNombre: q.adminNombre,
        detail: 'Falta el análisis narrativo de jornada',
        msg: `Hola ${q.adminNombre} 👋 Ya podés activar el análisis narrativo de Kai para *${q.nombre}*.\n\nEntra al panel admin y genera el análisis de jornada 🤖\n\n👉 ${getBase()}/quiniela/${q.id}/admin`,
      })
    }
    if (q.participants.length > 0 && q.participants.length < 3) {
      bajaPart.push({
        quiniela: q.nombre, id: q.id, adminTel: q.adminTel, adminNombre: q.adminNombre,
        detail: `${q.participants.length} participante${q.participants.length > 1 ? 's' : ''} — poco volumen para el consenso`,
        msg: `¡Únete a la Quiniela del Mundial 2026! 🏆\n\n*${q.nombre}*\nCódigo: *${q.id}*\n\n👉 ${getBase()}/quiniela/${q.id}`,
      })
    }
  })

  return { sinPicks, kaiPendiente, bajaPart }
}

// ── Shared action buttons ──────────────────────────────────────────────────────

function ActionRow({ msg, adminTel }) {
  const [copied, setCopied] = useState(false)
  const digits = (adminTel ?? '').replace(/\D/g, '')

  function copy() {
    navigator.clipboard.writeText(msg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <button onClick={copy}
        style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #ddd', background: copied ? '#E1F5EE' : '#fff', color: copied ? '#0F6E56' : '#555', cursor: 'pointer', fontWeight: copied ? 600 : 400, transition: 'all .15s' }}>
        {copied ? '✓ Copiado' : '📋 Copiar mensaje'}
      </button>
      {digits.length >= 8 && (
        <a href={`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener"
          style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, background: '#25D366', color: '#fff', textDecoration: 'none', textAlign: 'center', fontWeight: 600 }}>
          📱 WhatsApp
        </a>
      )}
    </div>
  )
}

// ── Metric card ────────────────────────────────────────────────────────────────

function Metric({ value, label, highlight, onClick }) {
  return (
    <div onClick={onClick} style={{ flex: 1, minWidth: 80, background: highlight ? '#1D9E75' : '#f5f5f3', borderRadius: 10, padding: '10px 12px', textAlign: 'center', cursor: onClick ? 'pointer' : 'default', border: highlight ? 'none' : '0.5px solid #e8e6e0' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? '#fff' : '#1D9E75', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: highlight ? 'rgba(255,255,255,0.8)' : '#888', marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}

// ── Alert group ────────────────────────────────────────────────────────────────

function AlertGroup({ icon, title, items, emptyMsg }) {
  const [open, setOpen] = useState(true)
  if (items.length === 0) return (
    <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '14px 16px', marginBottom: 12, background: '#fafaf8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#aaa' }}>{title}</span>
        <span style={{ fontSize: 11, background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>✓ Todo en orden</span>
      </div>
    </div>
  )

  return (
    <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', background: '#fff' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 11, background: '#fdecea', color: '#c0392b', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>{items.length}</span>
        <span style={{ fontSize: 10, color: '#aaa', marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ borderTop: '0.5px solid #f0f0f0' }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: i < items.length - 1 ? '0.5px solid #f5f5f3' : 'none', background: '#fafaf8' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{item.quiniela}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{item.detail}</div>
                </div>
                <code style={{ fontSize: 11, color: '#1D9E75', background: '#E1F5EE', padding: '2px 7px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{item.id}</code>
              </div>
              <ActionRow msg={item.msg} adminTel={item.adminTel} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sections ──────────────────────────────────────────────────────────────────

function AlertasSection({ quinielas }) {
  const { sinPicks, kaiPendiente, bajaPart } = buildGroupedSignals(quinielas)
  const total = sinPicks.length + kaiPendiente.length + bajaPart.length
  return (
    <div>
      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Sin alertas activas</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Todas las quinielas están en orden.</div>
        </div>
      )}
      <AlertGroup icon="⏳" title="Sin picks completos" items={sinPicks} />
      <AlertGroup icon="🤖" title="Análisis Kai pendientes" items={kaiPendiente} />
      <AlertGroup icon="👥" title="Baja participación" items={bajaPart} />
    </div>
  )
}

function QuinielasSection({ quinielas }) {
  const [expanded, setExpanded] = useState(null)
  return (
    <div>
      {quinielas.map(q => {
        const pending = q.participants.length - q.picksCount
        const pickPct = q.participants.length > 0 ? Math.round((q.picksCount / q.participants.length) * 100) : 0
        const isOpen = expanded === q.id
        return (
          <div key={q.id} style={{ border: '0.5px solid #e0e0de', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : q.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: '#fff' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{q.nombre}</div>
                  <code style={{ fontSize: 11, color: '#1D9E75', background: '#E1F5EE', padding: '1px 7px', borderRadius: 6 }}>{q.id}</code>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Admin: {q.adminNombre} · {fmt(q.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{q.participants.length}</div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>partic.</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: pending > 0 ? '#c0392b' : '#1D9E75' }}>{q.picksCount}/{q.participants.length}</div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>picks</div>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                  <span style={{ color: q.kai.confidence ? '#1D9E75' : '#ddd', fontWeight: 600 }}>{q.kai.confidence ? '✓' : '—'} conf.</span>
                  <span style={{ color: q.kai.jornada ? '#1D9E75' : '#ddd', fontWeight: 600 }}>{q.kai.jornada ? '✓' : '—'} jornada</span>
                </div>
                <span style={{ fontSize: 10, color: '#aaa' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: '0.5px solid #f0f0f0', padding: '12px 16px', background: '#fafaf8' }}>
                {/* pick progress bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#888', marginBottom: 4 }}>
                    <span>{q.picksCount} de {q.participants.length} completaron todos sus picks</span>
                    <span style={{ fontWeight: 700 }}>{pickPct}%</span>
                  </div>
                  <div style={{ height: 5, background: '#e8e6e0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pickPct}%`, height: '100%', background: pickPct === 100 ? '#1D9E75' : '#F5C842', borderRadius: 99, transition: 'width .3s' }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Fases: {q.fases.join(' · ')}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`/quiniela/${q.id}/admin`} target="_blank" rel="noopener"
                    style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, background: '#1D9E75', color: '#fff', textDecoration: 'none', textAlign: 'center', fontWeight: 600 }}>
                    ⚙️ Ir al admin
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${getBase()}/quiniela/${q.id}`) }}
                    style={{ flex: 1, padding: '7px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #ddd', background: '#fff', color: '#555', cursor: 'pointer' }}>
                    🔗 Copiar link
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ParticipantesSection({ quinielas }) {
  const all = quinielas.flatMap(q =>
    q.participants.map(p => ({ ...p, quinielaNombre: q.nombre, quinielaId: q.id }))
  ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return (
    <div>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>{all.length} participantes en total</div>
      {all.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #f5f5f3' }}>
          <Avatar name={p.nombre} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</div>
            <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email} · {p.tel}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>{p.quinielaNombre}</div>
            {p.pais && <div style={{ fontSize: 11, color: '#888' }}>{p.pais}</div>}
            <div style={{ fontSize: 10, color: '#aaa' }}>{fmt(p.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function KaiTools({ phase, globalConfidenceGenerated, quinielas, onRefresh }) {
  const [confStatus, setConfStatus]     = useState('idle')
  const [jornadaStatus, setJornadaStatus] = useState('idle')
  const [toast, setToast] = useState('')
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function generateConfidence() {
    setConfStatus('generating')
    try {
      const res = await fetch('/api/quiniela-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateConfidence', payload: { phase } }),
      })
      const d = await res.json()
      if (d.ok) { setConfStatus('done'); showToast(`✓ Confianza generada — ${d.count} partidos`); onRefresh() }
      else { setConfStatus('idle'); showToast('Error al generar confianza') }
    } catch { setConfStatus('idle'); showToast('Error de conexión') }
  }

  async function generateAllJornadas() {
    setJornadaStatus('generating')
    try {
      const res = await fetch('/api/quiniela-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateAllJornadas', payload: { phase } }),
      })
      const d = await res.json()
      if (d.ok) { setJornadaStatus('done'); showToast(`✓ Análisis generado para ${d.generated} quinielas`); onRefresh() }
      else { setJornadaStatus('idle'); showToast('Error al generar análisis') }
    } catch { setJornadaStatus('idle'); showToast('Error de conexión') }
  }

  const quinielasWithJornada = quinielas.filter(q => q.kai.jornada).length

  return (
    <div style={{ background: 'linear-gradient(135deg, #0c0f14, #0f1a10)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399', letterSpacing: .5, textTransform: 'uppercase' }}>Kai · Herramientas globales</span>
      </div>

      {/* Confianza global */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Confianza por partido</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {globalConfidenceGenerated || confStatus === 'done'
                ? '✓ Generada — todas las quinielas la consumen automáticamente'
                : 'Sin generar — ninguna quiniela tiene análisis de dificultad'}
            </div>
          </div>
          <button onClick={generateConfidence} disabled={confStatus === 'generating'}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', cursor: confStatus === 'generating' ? 'default' : 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 12,
              background: confStatus === 'generating' ? '#555' : globalConfidenceGenerated || confStatus === 'done' ? 'rgba(52,211,153,0.2)' : '#34D399',
              color: confStatus === 'generating' ? '#aaa' : globalConfidenceGenerated || confStatus === 'done' ? '#34D399' : '#0a1f12',
            }}>
            {confStatus === 'generating' ? 'Generando…' : globalConfidenceGenerated || confStatus === 'done' ? '↻ Regenerar' : '⚡ Generar'}
          </button>
        </div>
      </div>

      {/* Análisis de jornada para todas */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Análisis de jornada</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {quinielasWithJornada}/{quinielas.length} quinielas con análisis generado
            </div>
          </div>
          <button onClick={generateAllJornadas} disabled={jornadaStatus === 'generating'}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', cursor: jornadaStatus === 'generating' ? 'default' : 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 12,
              background: jornadaStatus === 'generating' ? '#555' : jornadaStatus === 'done' ? 'rgba(52,211,153,0.2)' : '#34D399',
              color: jornadaStatus === 'generating' ? '#aaa' : jornadaStatus === 'done' ? '#34D399' : '#0a1f12',
            }}>
            {jornadaStatus === 'generating' ? `Generando…` : jornadaStatus === 'done' ? '✓ Listo' : '⚡ Generar para todas'}
          </button>
        </div>
      </div>

      {toast && <div style={{ marginTop: 12, fontSize: 12, color: '#34D399', textAlign: 'center' }}>{toast}</div>}
    </div>
  )
}

function KaiSection({ quinielas, globalConfidenceGenerated, onRefresh }) {
  const { sinPicks, kaiPendiente, bajaPart } = buildGroupedSignals(quinielas)
  const all = [
    ...sinPicks.map(s => ({ ...s, priority: 'high', icon: '⏳', rec: 'Recordar al grupo completar picks' })),
    ...kaiPendiente.map(s => ({ ...s, priority: 'medium', icon: '🤖', rec: 'Activar análisis de jornada desde el admin' })),
    ...bajaPart.map(s => ({ ...s, priority: 'low', icon: '👥', rec: 'Invitar más participantes' })),
  ]

  const PRIORITY_LABEL = { high: 'Urgente', medium: 'Pendiente', low: 'Informativo' }
  const PRIORITY_BG    = { high: '#fdecea', medium: '#FEF9EC', low: '#f5f5f3' }
  const PRIORITY_COLOR = { high: '#c0392b', medium: '#854F0B', low: '#555' }

  return (
    <div>
      <KaiTools phase="grupos" globalConfidenceGenerated={globalConfidenceGenerated} quinielas={quinielas} onRefresh={onRefresh} />
      {all.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Sin acciones pendientes de los admins</div>
        </div>
      ) : (
        <div>
          <div style={{ background: 'linear-gradient(135deg, #0c0f14, #0f1a10)', borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#34D399', letterSpacing: .5, textTransform: 'uppercase' }}>Kai · Copiloto</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>Kai recomienda · tú decides</span>
          </div>
          {all.map((item, i) => (
            <div key={i} style={{ border: `0.5px solid ${PRIORITY_COLOR[item.priority]}33`, borderRadius: 12, padding: '14px 16px', marginBottom: 10, background: PRIORITY_BG[item.priority] }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 20, lineHeight: 1.2, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{item.quiniela}</span>
                    <span style={{ fontSize: 10, background: PRIORITY_COLOR[item.priority], color: '#fff', padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>
                      {PRIORITY_LABEL[item.priority]}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 2 }}>{item.detail}</div>
                  <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>→ {item.rec}</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#444', lineHeight: 1.55, marginBottom: 8, whiteSpace: 'pre-line' }}>
                {item.msg}
              </div>
              <ActionRow msg={item.msg} adminTel={item.adminTel} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Results Section ───────────────────────────────────────────────────────────

function ResultsSection() {
  const [results, setResults]         = useState(emptyResults)
  const [realCampeon, setRealCampeon] = useState('')
  const [realGoleador, setRealGoleador] = useState('')
  const [phase, setPhase]             = useState('grupos')
  const [grupo, setGrupo]             = useState('A')
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetch('/api/quiniela?action=globalAdmin')
      .then(r => r.json())
      .then(d => {
        if (d.admin?.results) {
          setResults(prev => {
            const next = emptyResults()
            PHASE_ORDER.forEach(ph => {
              if (d.admin.results[ph]) {
                d.admin.results[ph].forEach((r, i) => { if (r) next[ph][i] = r })
              }
            })
            return next
          })
        }
        if (d.admin?.realCampeon)  setRealCampeon(d.admin.realCampeon)
        if (d.admin?.realGoleador) setRealGoleador(d.admin.realGoleador)
      })
      .catch(() => {})
  }, [])

  function updateScore(ph, idx, field, val) {
    setResults(prev => {
      const next = { ...prev, [ph]: [...prev[ph]] }
      next[ph][idx] = { ...next[ph][idx], [field]: val }
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/quiniela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveGlobalResults', payload: { results, realCampeon, realGoleador } }),
      })
      const data = await res.json()
      if (data.ok) showToast('✓ Resultados guardados para todas las quinielas')
      else showToast('Error al guardar')
    } catch { showToast('Error de conexión') }
    finally { setSaving(false) }
  }

  const totalMatches  = PHASE_ORDER.reduce((a, ph) => a + PHASES[ph].matches.length, 0)
  const filledResults = PHASE_ORDER.reduce((a, ph) => a + results[ph].filter(r => r.l !== '' && r.v !== '').length, 0)
  const phasePct = Math.round((filledResults / totalMatches) * 100)

  const visibleMatches = phase === 'grupos'
    ? (() => { const gi = GRUPO_LETTERS.indexOf(grupo); return PHASES.grupos.matches.slice(gi * 6, gi * 6 + 6).map((m, i) => ({ ...m, idx: gi * 6 + i })) })()
    : PHASES[phase].matches.map((m, i) => ({ ...m, idx: i }))

  const inpSty = { width: 44, height: 40, textAlign: 'center', border: '0.5px solid #ddd', borderRadius: 8, fontSize: 18, fontWeight: 600, background: '#fafafa', outline: 'none', WebkitAppearance: 'none', MozAppearance: 'textfield' }
  const filledInp = { ...inpSty, background: '#E1F5EE', borderColor: '#1D9E75' }

  return (
    <div>
      {/* Progress summary */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: '#f5f5f3', borderRadius: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 6, background: '#e0e0de', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
            <div style={{ width: `${phasePct}%`, height: '100%', background: phasePct === 100 ? '#1D9E75' : '#F5C842', borderRadius: 99, transition: 'width .3s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#888' }}>{filledResults} de {totalMatches} resultados ingresados</div>
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: phasePct === 100 ? '#1D9E75' : '#854F0B' }}>{phasePct}%</div>
      </div>

      {/* Phase tabs */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
        {PHASE_ORDER.map(ph => {
          const phFilled = results[ph].filter(r => r.l !== '' && r.v !== '').length
          const phTotal  = PHASES[ph].matches.length
          const active   = phase === ph
          return (
            <button key={ph} onClick={() => setPhase(ph)} style={{ padding: '5px 12px', fontSize: 12, borderRadius: 99, border: `0.5px solid ${active ? '#1D9E75' : '#ccc'}`, background: active ? '#1D9E75' : '#fff', color: active ? '#fff' : '#555', cursor: 'pointer', fontWeight: active ? 600 : 400 }}>
              {PHASES[ph].label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: .8 }}>{phFilled}/{phTotal}</span>
            </button>
          )
        })}
      </div>

      {/* Group tabs (grupos only) */}
      {phase === 'grupos' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {GRUPO_LETTERS.map(g => {
            const gi = GRUPO_LETTERS.indexOf(g)
            const groupFilled = results.grupos.slice(gi * 6, gi * 6 + 6).filter(r => r.l !== '' && r.v !== '').length
            const isActive = grupo === g
            return (
              <button key={g} onClick={() => setGrupo(g)} style={{ minWidth: 34, height: 34, borderRadius: 8, border: `${isActive ? '1.5px' : '0.5px'} solid ${isActive ? '#1D9E75' : groupFilled === 6 ? '#4ade80' : '#ddd'}`, fontSize: 13, fontWeight: isActive ? 700 : 400, background: isActive ? '#1D9E75' : groupFilled === 6 ? '#E1F5EE' : '#fafafa', color: isActive ? '#fff' : '#555', cursor: 'pointer', position: 'relative' }}>
                {g}
                {groupFilled === 6 && !isActive && <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 8, background: '#1D9E75', color: '#fff', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Match rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {visibleMatches.map(({ local, visitante, idx }) => {
          const r = results[phase][idx] ?? { l: '', v: '' }
          const filled = r.l !== '' && r.v !== ''
          return (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: filled ? '#f0fdf6' : '#fff', border: `0.5px solid ${filled ? '#4ade80' : '#e8e6e0'}`, borderRadius: 10 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f(local)}{local}
              </div>
              <input style={filled ? filledInp : inpSty} type="number" min={0} max={20} placeholder="—"
                value={r.l}
                onChange={e => updateScore(phase, idx, 'l', e.target.value)} />
              <span style={{ fontSize: 14, color: '#ccc', fontWeight: 300 }}>–</span>
              <input style={filled ? filledInp : inpSty} type="number" min={0} max={20} placeholder="—"
                value={r.v}
                onChange={e => updateScore(phase, idx, 'v', e.target.value)} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f(visitante)}{visitante}
              </div>
            </div>
          )
        })}
      </div>

      {/* Premios especiales */}
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>🏆 Premios Especiales</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Campeón real</div>
            <select value={realCampeon} onChange={e => setRealCampeon(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `0.5px solid ${realCampeon ? '#4ade80' : '#ccc'}`, background: realCampeon ? '#E1F5EE' : '#fff', fontSize: 13, color: 'inherit' }}>
              <option value="">— Seleccionar —</option>
              {TEAMS.map(t => <option key={t} value={t}>{f(t)}{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Goleador real</div>
            <select value={realGoleador} onChange={e => setRealGoleador(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `0.5px solid ${realGoleador ? '#4ade80' : '#ccc'}`, background: realGoleador ? '#E1F5EE' : '#fff', fontSize: 13, color: 'inherit' }}>
              <option value="">— Seleccionar —</option>
              {SCORERS.filter(s => s !== 'Otro').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        style={{ width: '100%', padding: '12px', background: saving ? '#9FE1CB' : '#1D9E75', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer' }}>
        {saving ? 'Guardando...' : '💾 Guardar resultados globales'}
      </button>
      <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 6 }}>Los resultados se aplican a todas las quinielas simultáneamente.</div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'alertas',       label: 'Alertas' },
  { key: 'quinielas',     label: 'Quinielas' },
  { key: 'participantes', label: 'Participantes' },
  { key: 'kai',           label: 'Kai' },
  { key: 'resultados',    label: 'Resultados' },
]

export default function OverviewPage() {
  const [authed, setAuthed]   = useState(false)
  const [pin, setPin]         = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('alertas')

  function login() {
    if (pin === KEY) { setAuthed(true); setPin('') }
    else { setError('PIN incorrecto'); setPin('') }
  }

  function loadData() {
    setLoading(true)
    fetch('/api/quiniela?action=overview')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (authed) loadData() }, [authed])

  const s = {
    page: { maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  }

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Overview · Bonsight</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Solo para uso interno.</div>
        <input type="password" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #ccc', fontSize: 16, textAlign: 'center', letterSpacing: 4, marginBottom: 10, boxSizing: 'border-box' }} />
        {error && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', background: '#1D9E75', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Entrar
        </button>
      </div>
    </div>
  )

  if (loading) return <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>Cargando...</div>

  if (!data) return null

  const quinielas = data.quinielas ?? []
  const totalParticipants = quinielas.reduce((a, q) => a + q.participants.length, 0)
  const { sinPicks, kaiPendiente, bajaPart } = buildGroupedSignals(quinielas)
  const affectedIds = new Set([...sinPicks, ...kaiPendiente, ...bajaPart].map(s => s.id))
  const totalSignals = affectedIds.size
  const totalSinPicks = sinPicks.reduce((a, s) => {
    const q = quinielas.find(q => q.id === s.id)
    return a + (q ? q.participants.length - q.picksCount : 0)
  }, 0)

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Centro de operaciones</div>
          <div style={{ fontSize: 13, color: '#888' }}>Bonsight · Quiniela Mundial 2026</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadData} disabled={loading}
            style={{ background: 'none', border: '0.5px solid #1D9E75', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: loading ? 'default' : 'pointer', color: loading ? '#aaa' : '#1D9E75', fontWeight: 500 }}>
            {loading ? '...' : '↻ Actualizar'}
          </button>
          <button onClick={() => setAuthed(false)}
            style={{ background: 'none', border: '0.5px solid #ddd', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#aaa' }}>
            Salir
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Metric value={totalSignals} label="con alertas" highlight={totalSignals > 0} onClick={() => setTab('alertas')} />
        <Metric value={totalSinPicks} label="sin picks" onClick={() => setTab('alertas')} />
        <Metric value={kaiPendiente.length} label="Kai pendiente" onClick={() => setTab('kai')} />
        <Metric value={quinielas.length} label="quinielas" onClick={() => setTab('quinielas')} />
        <Metric value={totalParticipants} label="participantes" onClick={() => setTab('participantes')} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1.5rem', borderBottom: '0.5px solid #eee', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: tab === t.key ? 700 : 400, background: 'none', border: 'none', cursor: 'pointer', color: tab === t.key ? '#1D9E75' : '#888', borderBottom: `2px solid ${tab === t.key ? '#1D9E75' : 'transparent'}`, marginBottom: -1, transition: 'all .15s' }}>
            {t.label}
            {t.key === 'alertas' && totalSignals > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, background: '#c0392b', color: '#fff', borderRadius: 99, padding: '1px 5px', fontWeight: 700 }}>{totalSignals}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'alertas'       && <AlertasSection quinielas={quinielas} />}
      {tab === 'quinielas'     && <QuinielasSection quinielas={quinielas} />}
      {tab === 'participantes' && <ParticipantesSection quinielas={quinielas} />}
      {tab === 'kai'           && <KaiSection quinielas={quinielas} globalConfidenceGenerated={data.globalConfidenceGenerated} onRefresh={loadData} />}
      {tab === 'resultados'    && <ResultsSection />}

      <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', fontSize: 12, color: '#ccc', textAlign: 'center' }}>
        Bonsight · Uso interno
      </div>
    </div>
  )
}
