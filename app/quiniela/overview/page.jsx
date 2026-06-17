'use client'

import { useEffect, useState } from 'react'
import { PHASES, PHASE_ORDER, FLAGS, TEAMS, SCORERS, isMatchFinal } from '@/lib/quiniela'

const KEY = '1234'
const GRUPO_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']
const f = (team) => FLAGS[team] ? `${FLAGS[team]} ` : ''

function emptyResults() {
  return Object.fromEntries(PHASE_ORDER.map(ph => [ph, PHASES[ph].matches.map(() => ({ l: '', v: '', final: false }))]))
}

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000

function getMatchTimeState(kickoff, now, real) {
  const kickoffTime = new Date(kickoff).getTime()
  const elapsed = now - kickoffTime
  const confirmed = isMatchFinal(real)
  const live = !confirmed && elapsed >= 0 && elapsed < MATCH_DURATION_MS
  const unconfirmed = !confirmed && elapsed >= MATCH_DURATION_MS
  const upcoming = !confirmed && elapsed < 0
  return { kickoffTime, elapsed, confirmed, live, unconfirmed, upcoming }
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

const stepBtnSty = { width: 28, height: 28, borderRadius: 8, border: '0.5px solid #ddd', background: '#fafafa', fontSize: 16, fontWeight: 700, cursor: 'pointer', color: '#555', flexShrink: 0 }

function ScoreStepper({ value, onChange }) {
  const n = value === '' ? 0 : Number(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button onClick={() => onChange(String(Math.max(0, n - 1)))} style={stepBtnSty}>−</button>
      <div style={{ width: 28, textAlign: 'center', fontSize: 18, fontWeight: 700 }}>{value === '' ? '—' : value}</div>
      <button onClick={() => onChange(String(n + 1))} style={stepBtnSty}>+</button>
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

function SpinnerIcon() {
  return (
    <span style={{ display: 'inline-block', width: 12, height: 12, border: '1.5px solid rgba(52,211,153,0.3)', borderTopColor: '#34D399', borderRadius: '50%', animation: 'kaiSpin 0.7s linear infinite' }} />
  )
}

function KaiTools({ phase, globalConfidenceGenerated, quinielas, onRefresh }) {
  const [confStatus, setConfStatus]       = useState('idle')
  const [jornadaStatus, setJornadaStatus] = useState('idle')
  const [jornadaGroupStatus, setJornadaGroupStatus] = useState({}) // id → 'pending'|'active'|'done'|'error'|'skipped'
  const [jornadaDone, setJornadaDone]     = useState(0)
  const [jornadaTotal, setJornadaTotal]   = useState(0)
  // Default: only quinielas with participants selected
  const [selectedIds, setSelectedIds] = useState(() =>
    new Set(quinielas.filter(q => (q.participants?.length ?? 0) > 0).map(q => q.id))
  )
  const [toast, setToast] = useState('')
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const toggleId = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const allSelected = quinielas.every(q => selectedIds.has(q.id))
  const toggleAll = () => setSelectedIds(
    allSelected ? new Set() : new Set(quinielas.map(q => q.id))
  )

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

  async function generateJornadas() {
    if (selectedIds.size === 0) return
    setJornadaStatus('generating')
    setJornadaGroupStatus({})
    setJornadaDone(0)
    setJornadaTotal(0)

    try {
      const res = await fetch('/api/quiniela-ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateAllJornadas', payload: { phase, groupIds: [...selectedIds] } }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'start') {
              setJornadaTotal(ev.total)
              setJornadaGroupStatus(Object.fromEntries(ev.groups.map(g => [g.id, 'pending'])))
            } else if (ev.type === 'active') {
              setJornadaGroupStatus(prev => ({ ...prev, [ev.id]: 'active' }))
            } else if (ev.type === 'progress') {
              setJornadaDone(ev.count)
              setJornadaGroupStatus(prev => ({ ...prev, [ev.id]: ev.status }))
            } else if (ev.type === 'complete') {
              setJornadaStatus('done')
              setJornadaDone(ev.generated)
              onRefresh()
            }
          } catch {}
        }
      }
    } catch {
      setJornadaStatus('idle')
      showToast('Error de conexión')
    }
  }

  const quinielasWithJornada = quinielas.filter(q => q.kai.jornada).length
  const isGenerating = jornadaStatus === 'generating'
  const nSelected = selectedIds.size

  const btnLabel = isGenerating
    ? 'Generando...'
    : nSelected === 0
      ? 'Selecciona quinielas'
      : nSelected === quinielas.length
        ? '⚡ Generar para todas'
        : `⚡ Generar para ${nSelected}`

  return (
    <div style={{ background: 'linear-gradient(135deg, #0c0f14, #0f1a10)', borderRadius: 14, padding: '18px 20px', marginBottom: 16 }}>
      <style>{`@keyframes kaiSpin{to{transform:rotate(360deg)}}`}</style>
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

      {/* Análisis de jornada con selección */}
      <div style={{
        background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px',
        border: isGenerating ? '1px solid rgba(52,211,153,0.35)' : '1px solid transparent',
        transition: 'border-color 0.3s',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>Análisis de jornada</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {isGenerating
                ? `Generando análisis... ${jornadaDone} de ${jornadaTotal} quinielas`
                : `${quinielasWithJornada}/${quinielas.length} con análisis · ${nSelected} seleccionadas`}
            </div>
          </div>
          <button onClick={generateJornadas} disabled={isGenerating || nSelected === 0}
            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', flexShrink: 0, marginLeft: 12, fontWeight: 600,
              cursor: isGenerating || nSelected === 0 ? 'default' : 'pointer',
              background: isGenerating ? '#333' : nSelected === 0 ? '#222' : '#34D399',
              color: isGenerating ? '#666' : nSelected === 0 ? '#444' : '#0a1f12',
            }}>
            {btnLabel}
          </button>
        </div>

        {/* Barra de progreso */}
        {isGenerating && jornadaTotal > 0 && (
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#34D399', borderRadius: 2, width: `${(jornadaDone / jornadaTotal) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        )}

        {/* Seleccionar todas / link */}
        {!isGenerating && (
          <div style={{ marginBottom: 6 }}>
            <button onClick={toggleAll} style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, color: 'rgba(52,211,153,0.7)', cursor: 'pointer', textDecoration: 'underline' }}>
              {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
            </button>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 280, overflowY: 'auto' }}>
          {quinielas.map(q => {
            const status = jornadaGroupStatus[q.id]
            const isSelected = selectedIds.has(q.id)
            const inRun = isGenerating && isSelected
            return (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 2px', borderRadius: 6,
                opacity: isGenerating && !isSelected ? 0.3 : 1 }}>
                {/* Left icon: checkbox or status */}
                <span style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isGenerating
                    ? (status === 'done' || status === 'skipped'
                        ? <span style={{ color: '#34D399', fontSize: 11 }}>✓</span>
                        : status === 'active'
                          ? <SpinnerIcon />
                          : status === 'error'
                            ? <span style={{ color: '#f87171', fontSize: 11 }}>✗</span>
                            : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>○</span>)
                    : <input type="checkbox" checked={isSelected} onChange={() => toggleId(q.id)}
                        style={{ width: 13, height: 13, accentColor: '#34D399', cursor: 'pointer' }} />}
                </span>

                {/* Name */}
                <span style={{ fontSize: 12, flex: 1,
                  color: inRun
                    ? (status === 'done' || status === 'skipped' ? '#34D399' : status === 'active' ? '#fff' : status === 'error' ? '#f87171' : 'rgba(255,255,255,0.3)')
                    : isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                }}>
                  {q.nombre}
                </span>

                {/* Right label */}
                <span style={{ fontSize: 11, flexShrink: 0,
                  color: inRun
                    ? (status === 'done' ? '#34D399' : status === 'active' ? 'rgba(52,211,153,0.65)' : status === 'error' ? '#f87171' : 'rgba(255,255,255,0.18)')
                    : q.kai.jornada ? 'rgba(52,211,153,0.55)' : 'rgba(255,255,255,0.18)',
                }}>
                  {inRun
                    ? (status === 'done' ? 'listo' : status === 'active' ? 'generando...' : status === 'error' ? 'error' : status === 'skipped' ? 'sin datos' : 'pendiente')
                    : q.kai.jornada ? 'con análisis' : '—'}
                </span>
              </div>
            )
          })}
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

// ── Results Section (por fase) ────────────────────────────────────────────────

function ResultsSection() {
  const [results, setResults]           = useState(emptyResults)
  const [realCampeon, setRealCampeon]   = useState('')
  const [realGoleador, setRealGoleador] = useState('')
  const [phase, setPhase]               = useState('grupos')
  const [grupo, setGrupo]               = useState('A')
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState('')

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
                d.admin.results[ph].forEach((r, i) => {
                  if (r) next[ph][i] = { l: r.l, v: r.v, final: r.final ?? (r.l !== '' && r.v !== '') }
                })
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
      {/* Premios especiales */}
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 12 }}>🏆 Premios Especiales</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Campeón real</div>
            <select value={realCampeon} onChange={e => setRealCampeon(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `0.5px solid ${realCampeon ? '#4ade80' : '#ccc'}`, background: realCampeon ? '#E1F5EE' : '#fff', fontSize: 13, color: 'inherit' }}>
              <option value="">— Seleccionar —</option>
              {TEAMS.map((t, idx) => <option key={`${t}-${idx}`} value={t}>{f(t)}{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Goleador real</div>
            <select value={realGoleador} onChange={e => setRealGoleador(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `0.5px solid ${realGoleador ? '#4ade80' : '#ccc'}`, background: realGoleador ? '#E1F5EE' : '#fff', fontSize: 13, color: 'inherit' }}>
              <option value="">— Seleccionar —</option>
              {SCORERS.filter(s => s !== 'Otro').map((s, idx) => <option key={`${s}-${idx}`} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

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
              <button onClick={() => updateScore(phase, idx, 'final', !r.final)}
                title={r.final ? 'Resultado confirmado — clic para marcar como no confirmado' : 'Confirmar como resultado oficial'}
                style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 99, cursor: 'pointer',
                  border: `0.5px solid ${r.final ? '#1D9E75' : '#ddd'}`,
                  background: r.final ? '#1D9E75' : '#fff',
                  color: r.final ? '#fff' : '#aaa',
                }}>
                {r.final ? '✓ Confirmado' : '⏳ Sin confirmar'}
              </button>
            </div>
          )
        })}
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

// ── Partidos de hoy (operativo) ──────────────────────────────────────────────

function PartidosHoyOperativo({ now }) {
  const [results, setResults]           = useState(emptyResults)
  const [realCampeon, setRealCampeon]   = useState('')
  const [realGoleador, setRealGoleador] = useState('')
  const [expanded, setExpanded]         = useState(null)
  const [saving, setSaving]             = useState(false)
  const [toast, setToast]               = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetch('/api/quiniela?action=globalAdmin')
      .then(r => r.json())
      .then(d => {
        if (d.admin?.results) {
          setResults(() => {
            const next = emptyResults()
            PHASE_ORDER.forEach(ph => {
              if (d.admin.results[ph]) {
                d.admin.results[ph].forEach((r, i) => {
                  if (r) next[ph][i] = { l: r.l, v: r.v, final: r.final ?? (r.l !== '' && r.v !== '') }
                })
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
      const d = await res.json()
      if (d.ok) { showToast('✓ Guardado'); setExpanded(null) }
      else showToast('Error al guardar')
    } catch { showToast('Error de conexión') }
    finally { setSaving(false) }
  }

  const today = new Date(now).toLocaleDateString('en-CA')
  const todayMatches = PHASES.grupos.matches
    .map((m, i) => ({ ...m, idx: i }))
    .filter(m => new Date(m.kickoff).toLocaleDateString('en-CA') === today)
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))

  const confirmedCount = todayMatches.filter(m => (results.grupos[m.idx] ?? {}).final).length
  const liveList = todayMatches.filter(m => {
    const elapsed = now - new Date(m.kickoff).getTime()
    return elapsed >= 0 && elapsed < MATCH_DURATION_MS
  })
  const pendingCount = todayMatches.length - confirmedCount
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  if (todayMatches.length === 0) return (
    <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '14px 16px', marginBottom: 20, background: '#fafaf8' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>⚽ Partidos de hoy</div>
      <div style={{ fontSize: 13, color: '#aaa' }}>Sin partidos programados para hoy</div>
    </div>
  )

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Header + resumen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5 }}>
          ⚽ Partidos de hoy ({todayMatches.length})
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#888', alignItems: 'center' }}>
          {liveList.length > 0 && <span style={{ color: '#c0392b', fontWeight: 700 }}>🔴 {liveList.length} en vivo</span>}
          <span>✅ {confirmedCount} confirmado{confirmedCount !== 1 ? 's' : ''}</span>
          <span>⏳ {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {todayMatches.map((m) => {
        const r = results.grupos[m.idx] ?? { l: '', v: '', final: false }
        const { live, confirmed } = getMatchTimeState(m.kickoff, now, r)
        const isExpanded = expanded === m.idx
        const borderColor = live ? '#c0392b44' : confirmed ? '#4ade8066' : '#e0e0de'
        const bgColor     = live ? '#fef9f9'    : confirmed ? '#f0fdf6'   : '#fff'

        return (
          <div key={m.idx} style={{ border: `0.5px solid ${borderColor}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden', background: bgColor }}>
            <div onClick={() => setExpanded(isExpanded ? null : m.idx)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {f(m.local)}{m.local} <span style={{ color: '#aaa', fontWeight: 400 }}>vs</span> {f(m.visitante)}{m.visitante}
                </div>
                {m.ciudad && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>📍 {m.ciudad} · {formatTime(m.kickoff)}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {confirmed && r.l !== '' && (
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#1D9E75' }}>{r.l} – {r.v}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: 700, color: live ? '#c0392b' : confirmed ? '#1D9E75' : '#888' }}>
                  {live ? '🔴 En vivo' : confirmed ? '✅ Conf.' : '⏳ Por jugar'}
                </span>
                <span style={{ fontSize: 10, color: '#bbb' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '14px 16px', borderTop: '0.5px solid #f0f0f0', background: '#fafaf8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f(m.local)}{m.local}
                  </div>
                  <ScoreStepper value={r.l} onChange={v => updateScore('grupos', m.idx, 'l', v)} />
                  <span style={{ color: '#ccc' }}>–</span>
                  <ScoreStepper value={r.v} onChange={v => updateScore('grupos', m.idx, 'v', v)} />
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f(m.visitante)}{m.visitante}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateScore('grupos', m.idx, 'final', !r.final)}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: r.final ? '#fff3f3' : '#E1F5EE', color: r.final ? '#c0392b' : '#0F6E56' }}>
                    {r.final ? 'Desconfirmar' : '✅ Marcar confirmado'}
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
                      background: saving ? '#9FE1CB' : '#1D9E75', color: '#fff' }}>
                    {saving ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  )
}

// ── Atención requerida ────────────────────────────────────────────────────────

function AtenciónSección({ quinielas, pendingMatchesCount, onOpenResultados }) {
  const { sinPicks, kaiPendiente } = buildGroupedSignals(quinielas)
  const total = (pendingMatchesCount ?? 0) + sinPicks.length + kaiPendiente.length

  if (total === 0) return (
    <div style={{ border: '0.5px solid #4ade8066', borderRadius: 12, padding: '14px 16px', background: '#E1F5EE', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20 }}>✅</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F6E56' }}>Todo al día</div>
        <div style={{ fontSize: 12, color: '#0F6E56', opacity: .7 }}>Sin acciones pendientes en la plataforma</div>
      </div>
    </div>
  )

  return (
    <div style={{ border: '0.5px solid #c0392b44', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', background: '#fdecea', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#c0392b', flex: 1 }}>Atención requerida</span>
        <span style={{ fontSize: 10, background: '#c0392b', color: '#fff', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>{total}</span>
      </div>
      <div style={{ background: '#fff' }}>
        {pendingMatchesCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: sinPicks.length + kaiPendiente.length > 0 ? '0.5px solid #f5f5f3' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>⏱️ Resultados pendientes</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{pendingMatchesCount} partido{pendingMatchesCount !== 1 ? 's' : ''} sin confirmar</div>
            </div>
            <button onClick={onOpenResultados} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #c0392b', background: '#fff', color: '#c0392b', cursor: 'pointer', fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
              → Resultados
            </button>
          </div>
        )}
        {sinPicks.length > 0 && (
          <div style={{ padding: '12px 16px', borderBottom: kaiPendiente.length > 0 ? '0.5px solid #f5f5f3' : 'none' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>⏳ Picks incompletos</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{sinPicks.length} quiniela{sinPicks.length !== 1 ? 's' : ''} con participantes sin completar</div>
          </div>
        )}
        {kaiPendiente.length > 0 && (
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>🤖 Análisis Kai pendiente</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{kaiPendiente.length} quiniela{kaiPendiente.length !== 1 ? 's' : ''} sin análisis de jornada</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Líderes de la plataforma ──────────────────────────────────────────────────

function LideresSección({ lideres }) {
  if (!lideres) return null
  const anyData = (lideres.mejorParticipante?.pts ?? 0) > 0

  const cards = [
    {
      icon: '🥇', title: 'Mejor participante',
      value: lideres.mejorParticipante?.nombre ?? '—',
      sub: lideres.mejorParticipante?.pts > 0
        ? `${lideres.mejorParticipante.pts} pts · ${lideres.mejorParticipante.quiniela}`
        : 'Sin puntos aún',
    },
    {
      icon: '🏆', title: 'Mejor quiniela',
      value: lideres.mejorQuiniela?.nombre ?? '—',
      sub: (lideres.mejorQuiniela?.avgPts ?? 0) > 0
        ? `Promedio ${lideres.mejorQuiniela.avgPts} pts`
        : 'Sin puntos aún',
    },
    {
      icon: '🎯', title: 'Más exactos',
      value: lideres.masExactos?.nombre ?? '—',
      sub: (lideres.masExactos?.exactos ?? 0) > 0
        ? `${lideres.masExactos.exactos} resultado${lideres.masExactos.exactos !== 1 ? 's' : ''} exacto${lideres.masExactos.exactos !== 1 ? 's' : ''} · ${lideres.masExactos.quiniela}`
        : 'Sin resultados exactos aún',
    },
    {
      icon: '👥', title: 'Quiniela más activa',
      value: lideres.masActiva?.nombre ?? '—',
      sub: lideres.masActiva ? `${lideres.masActiva.participantes} participante${lideres.masActiva.participantes !== 1 ? 's' : ''}` : '—',
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
        Líderes de la plataforma
        {!anyData && <span style={{ fontWeight: 400, fontSize: 10, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>— visibles cuando haya resultados confirmados</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: '14px 16px', background: '#fafaf8' }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Admin accordion ───────────────────────────────────────────────────────────

function AdminAcordeon({ quinielas, globalConfidenceGenerated, onRefresh, openSection, onSectionChange }) {
  const [localOpen, setLocalOpen] = useState(null)
  const open = openSection !== undefined ? openSection : localOpen

  function setOpen(val) {
    const next = open === val ? null : val
    onSectionChange?.(next)
    setLocalOpen(next)
  }

  const adminTabs = [
    { key: 'quinielas',     label: 'Quinielas',    count: quinielas.length },
    { key: 'participantes', label: 'Participantes', count: quinielas.reduce((a, q) => a + q.participants.length, 0) },
    { key: 'alertas',       label: 'Alertas' },
    { key: 'resultados',    label: 'Resultados' },
  ]

  return (
    <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ padding: '12px 16px', background: '#fafaf8' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#555' }}>⚙️ Administración</span>
      </div>
      <div style={{ display: 'flex', borderTop: '0.5px solid #eee' }}>
        {adminTabs.map((t, i) => (
          <button key={t.key} onClick={() => setOpen(t.key)}
            style={{ flex: 1, padding: '9px 6px', fontSize: 12, background: open === t.key ? '#E1F5EE' : '#fff', border: 'none', borderRight: i < adminTabs.length - 1 ? '0.5px solid #eee' : 'none', cursor: 'pointer', fontWeight: open === t.key ? 700 : 400, color: open === t.key ? '#0F6E56' : '#888', transition: 'all .15s', lineHeight: 1.3 }}>
            {t.label}
            {t.count != null && <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: open === t.key ? '#0F6E56' : '#1D9E75' }}>{t.count}</span>}
          </button>
        ))}
      </div>
      {open && (
        <div style={{ padding: '16px', borderTop: '0.5px solid #eee' }}>
          {open === 'quinielas'     && <QuinielasSection quinielas={quinielas} />}
          {open === 'participantes' && <ParticipantesSection quinielas={quinielas} />}
          {open === 'alertas'       && <AlertasSection quinielas={quinielas} />}
          {open === 'resultados'    && <ResultsSection />}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [authed, setAuthed]           = useState(false)
  const [pin, setPin]                 = useState('')
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [now, setNow]                 = useState(Date.now())
  const [adminSection, setAdminSection] = useState(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

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
  const today = new Date(now).toLocaleDateString('en-CA')
  const todayMatches = PHASES.grupos.matches.filter(m => new Date(m.kickoff).toLocaleDateString('en-CA') === today)
  const liveCount = todayMatches.filter(m => {
    const elapsed = now - new Date(m.kickoff).getTime()
    return elapsed >= 0 && elapsed < MATCH_DURATION_MS
  }).length
  const pendingMatchesCount = data.pendingMatchesCount ?? 0

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

      {/* Ops metrics */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <Metric value={todayMatches.length} label="hoy" />
        <Metric value={liveCount} label="en vivo" highlight={liveCount > 0} />
        <Metric value={pendingMatchesCount} label="pendientes" highlight={pendingMatchesCount > 0} onClick={() => setAdminSection('resultados')} />
        <Metric value={quinielas.length} label="quinielas" onClick={() => setAdminSection('quinielas')} />
        <Metric value={totalParticipants} label="participantes" onClick={() => setAdminSection('participantes')} />
      </div>

      {/* Partidos de hoy — centro operativo */}
      <PartidosHoyOperativo now={now} />

      {/* Kai */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>Kai · Herramientas globales</div>
        <KaiTools phase="grupos" globalConfidenceGenerated={data.globalConfidenceGenerated} quinielas={quinielas} onRefresh={loadData} />
      </div>

      {/* Líderes */}
      <LideresSección lideres={data.lideres} />

      {/* Atención requerida */}
      <AtenciónSección
        quinielas={quinielas}
        pendingMatchesCount={pendingMatchesCount}
        onOpenResultados={() => setAdminSection('resultados')}
      />

      {/* Administración */}
      <AdminAcordeon
        quinielas={quinielas}
        globalConfidenceGenerated={data.globalConfidenceGenerated}
        onRefresh={loadData}
        openSection={adminSection}
        onSectionChange={setAdminSection}
      />

      <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', fontSize: 12, color: '#ccc', textAlign: 'center' }}>
        Bonsight · Uso interno
      </div>
    </div>
  )
}
