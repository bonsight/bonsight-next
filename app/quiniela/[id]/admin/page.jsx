'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PHASES, PHASE_ORDER, calcularPuntajes } from '@/lib/quiniela'
import { KaiLabel } from '@/components/KaiAvatar'

function hasPicks(quiniela, phase) {
  if (!quiniela?.phases?.[phase]) return false
  return quiniela.phases[phase].some(p => p.l !== '' || p.v !== '' || p.w !== '')
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#E1F5EE', color: '#0F6E56',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.33), fontWeight: 500,
    }}>{initials(name)}</div>
  )
}

const page = { maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh' }
const input = { padding: '8px 12px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
const card = { border: '0.5px solid #e0e0de', borderRadius: 12, padding: 16 }

export default function AdminDashboard() {
  const params = useParams()
  const groupId = params.id

  const [loading, setLoading] = useState(true)
  const [groupError, setGroupError] = useState(false)
  const [group, setGroup] = useState(null)
  const [participants, setParticipants] = useState([])
  const [quinielas, setQuinielas] = useState({})
  const [admin, setAdmin] = useState(null)
  const [scores, setScores] = useState([])
  const [toast, setToast] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinVisible, setPinVisible] = useState(false)
  const [jornadaSummary, setJornadaSummary]         = useState(null)
  const [jornadaStatus, setJornadaStatus]           = useState('idle') // 'idle'|'generating'|'done'
  const [confidenceStatus, setConfidenceStatus]     = useState('idle')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    fetch(`/api/quiniela?action=all&groupId=${groupId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.group) { setGroupError(true); return }
        setGroup(data.group)
        setParticipants(data.participants ?? [])
        setQuinielas(data.quinielas ?? {})
        const a = data.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' }
        setAdmin(a)
        setScores(calcularPuntajes(data.participants ?? [], data.quinielas ?? {}, a))

        // Cargar resumen de jornada si existe
        const phase = a.unlockedPhases[a.unlockedPhases.length - 1] ?? 'grupos'
        fetch(`/api/quiniela-ai?action=getJornada&groupId=${groupId}&phase=${phase}`)
          .then(r => r.json())
          .then(d => { if (d.summary) { setJornadaSummary(d.summary); setJornadaStatus('done') } })
          .catch(() => {})
      })
      .catch(() => setGroupError(true))
      .finally(() => setLoading(false))
  }, [groupId])

  async function generateJornada() {
    setJornadaStatus('generating')
    const phase = admin.unlockedPhases[admin.unlockedPhases.length - 1] ?? 'grupos'
    try {
      const res = await fetch('/api/quiniela-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateJornadaSummary',
          payload: { groupId, phase, participants, scores, quinielas, adminResults },
        }),
      })
      const data = await res.json()
      if (data.summary) { setJornadaSummary(data.summary); setJornadaStatus('done'); showToast('✓ Análisis generado') }
      else { setJornadaStatus('idle'); showToast('Error al generar') }
    } catch { setJornadaStatus('idle'); showToast('Error de conexión') }
  }

  async function generateConfidence() {
    setConfidenceStatus('generating')
    const phase = admin.unlockedPhases[admin.unlockedPhases.length - 1] ?? 'grupos'
    try {
      const res = await fetch('/api/quiniela-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateConfidence', payload: { groupId, phase } }),
      })
      const data = await res.json()
      if (data.ok) { setConfidenceStatus('done'); showToast('✓ Confianza generada') }
      else { setConfidenceStatus('idle'); showToast('Error al generar') }
    } catch { setConfidenceStatus('idle'); showToast('Error de conexión') }
  }

  async function saveAdmin(newAdmin) {
    setAdmin(newAdmin)
    setScores(calcularPuntajes(participants, quinielas, newAdmin))
    await fetch('/api/quiniela', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveAdmin', payload: { ...newAdmin, groupId } }),
    })
  }

  function unlockNextPhase(ph) {
    const fase = ph ?? nextFase
    if (!fase || admin.unlockedPhases.includes(fase)) return
    const next = { ...admin, unlockedPhases: [...admin.unlockedPhases, fase] }
    saveAdmin(next)
    showToast(`✓ ${PHASES[fase].label} desbloqueada`)
  }

  function lockLastPhase(ph) {
    const fase = ph ?? admin.unlockedPhases[admin.unlockedPhases.length - 1]
    if (!fase || fase === 'grupos') return
    const next = { ...admin, unlockedPhases: admin.unlockedPhases.filter(p => p !== fase) }
    saveAdmin(next)
    showToast(`🔒 ${PHASES[fase].label} bloqueada`)
  }

  // Derived
  const activeFases = group?.fases ?? PHASE_ORDER
  const activePhaseOrder = PHASE_ORDER.filter(ph => activeFases.includes(ph))
  const currentPhase = admin ? (admin.unlockedPhases[admin.unlockedPhases.length - 1] ?? 'grupos') : 'grupos'
  const nextFase = activePhaseOrder.filter(ph => !admin?.unlockedPhases.includes(ph))[0] ?? null
  const withPicks = participants.filter(p => hasPicks(quinielas[p.id], currentPhase))
  const pending = participants.filter(p => !hasPicks(quinielas[p.id], currentPhase))
  const pickPct = participants.length > 0 ? (withPicks.length / participants.length) * 100 : 0
  const sortedScores = [...scores].sort((a, b) => b.pts - a.pts)
  const medals = ['🥇', '🥈', '🥉']

  const waMsg = (nombre) =>
    encodeURIComponent(`Hola ${nombre}, recuerda llenar tus picks para la quiniela "${group?.nombre}" antes de que arranque la siguiente jornada 🏆`)

  if (loading) return <div style={{ ...page, textAlign: 'center', paddingTop: '4rem', color: '#888' }}>Cargando dashboard...</div>

  if (groupError) return (
    <div style={{ ...page, textAlign: 'center', paddingTop: '4rem' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Quiniela no encontrada</div>
      <a href="/quiniela" style={{ color: '#1D9E75', fontSize: 13 }}>← Volver al inicio</a>
    </div>
  )

  // PIN gate
  if (!adminUnlocked) return (
    <div style={page}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div style={{ width: 40, height: 40, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{group?.nombre}</div>
          <div style={{ fontSize: 12, color: '#888' }}>Panel del organizador</div>
        </div>
      </div>
      <div style={{ maxWidth: 320, margin: '2rem auto', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Acceso Admin</div>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Solo el organizador puede acceder a este panel.</div>
        <input
          style={{ ...input, textAlign: 'center', letterSpacing: 4, fontSize: 18, marginBottom: 12 }}
          type="password" placeholder="••••••••"
          value={pinInput}
          onChange={e => setPinInput(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter') return
            if (pinInput === group?.adminPin) {
              localStorage.setItem(`quiniela_admin_${groupId}`, '1')
              setAdminUnlocked(true); setPinInput('')
            } else { showToast('PIN incorrecto'); setPinInput('') }
          }}
        />
        <button
          onClick={() => {
            if (pinInput === group?.adminPin) {
              localStorage.setItem(`quiniela_admin_${groupId}`, '1')
              setAdminUnlocked(true); setPinInput('')
            } else { showToast('PIN incorrecto'); setPinInput('') }
          }}
          style={{ background: '#1D9E75', color: '#fff', border: 'none', padding: '10px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%', marginBottom: 14 }}
        >Entrar</button>
        <a href={`/quiniela/${groupId}`} style={{ color: '#aaa', fontSize: 12, textDecoration: 'none' }}>← Ver quiniela como participante</a>
      </div>
      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999 }}>{toast}</div>}
    </div>
  )

  return (
    <div style={page}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div style={{ width: 40, height: 40, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{group?.nombre}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888', marginTop: 2 }}>
            Organiza: {group?.adminNombre}
            <span style={{ background: '#E1F5EE', color: '#0F6E56', padding: '1px 8px', borderRadius: 99, fontSize: 11 }}>Activa</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={`/quiniela/${groupId}/picks`}
            style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #ccc', color: 'inherit', textDecoration: 'none' }}>
            Ver quiniela →
          </a>
          <button
            onClick={() => { localStorage.removeItem(`quiniela_admin_${groupId}`); setAdminUnlocked(false) }}
            style={{ padding: '7px 14px', fontSize: 12, borderRadius: 8, border: '0.5px solid #eee', background: 'none', cursor: 'pointer', color: '#aaa' }}>
            Salir
          </button>
        </div>
      </div>

      {/* ── hero de estado ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
        borderRadius: 16, padding: '20px 24px', marginBottom: 20, color: '#fff',
        boxShadow: '0 4px 20px rgba(15,110,86,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, opacity: .7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Quiniela Activa</div>
            <div style={{ fontSize: 19, fontWeight: 700 }}>{group?.nombre}</div>
            <div style={{ fontSize: 12, opacity: .75, marginTop: 2 }}>
              {PHASES[currentPhase]?.label} · {admin?.unlockedPhases.length} de {activePhaseOrder.length} fases activas
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{participants.length}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>participantes</div>
          </div>
        </div>

        {/* barra de progreso global */}
        <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 99, height: 6, marginBottom: 6 }}>
          <div style={{ width: `${pickPct}%`, height: '100%', background: '#fff', borderRadius: 99, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 12 }}>
          <span style={{ opacity: .85 }}>
            {withPicks.length} de {participants.length} completaron sus picks
          </span>
          <span style={{ fontWeight: 700 }}>{Math.round(pickPct)}%</span>
        </div>

        {/* estado quick */}
        <div style={{ display: 'flex', gap: 8 }}>
          {pending.length > 0 ? (
            <>
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 14px', fontSize: 12, flex: 1 }}>
                ⚠️ <strong>{pending.length}</strong> participante{pending.length > 1 ? 's' : ''} pendiente{pending.length > 1 ? 's' : ''}
              </div>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hola! Recuerda llenar tus picks para la quiniela "${group?.nombre}" 🏆 Código: ${groupId}`)}`}
                target="_blank" rel="noopener"
                style={{ background: '#25D366', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
              >💬 Avisar</a>
            </>
          ) : (
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
              ✅ Todos los participantes completaron sus picks
            </div>
          )}
        </div>
      </div>

      {/* ── contenido en columna única ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* tabla de posiciones */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 14 }}>
            Tabla de posiciones
          </div>
          {sortedScores.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>
              Sin puntos aún — los resultados se ingresan desde la quiniela.
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ fontSize: 11, color: '#aaa' }}>
                    <th style={{ textAlign: 'left', padding: '0 0 8px', fontWeight: 400 }}>#</th>
                    <th style={{ textAlign: 'left', padding: '0 0 8px 8px', fontWeight: 400 }}>Participante</th>
                    <th style={{ textAlign: 'right', padding: '0 0 8px', fontWeight: 400 }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedScores.slice(0, 5).map((s, idx) => {
                    const p = participants.find(x => x.id === s.participantId)
                    return (
                      <tr key={s.participantId} style={{ borderTop: '0.5px solid #f0f0f0' }}>
                        <td style={{ padding: '9px 0', fontSize: 13, color: '#888' }}>{medals[idx] ?? idx + 1}</td>
                        <td style={{ padding: '9px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={p?.nombre ?? '?'} size={28} />
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{p?.nombre}</div>
                          </div>
                        </td>
                        <td style={{ padding: '9px 0', textAlign: 'right', fontSize: 15, fontWeight: 600, color: '#0F6E56' }}>{s.pts}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* pendientes individuales */}
        {pending.length > 0 && (
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 14 }}>
              Pendientes de llenar picks
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={p.nombre} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</div>
                    {p.tel && <div style={{ fontSize: 11, color: '#aaa' }}>{p.tel}</div>}
                  </div>
                  {p.tel ? (
                    <a href={`https://wa.me/${p.tel.replace(/\D/g, '')}?text=${waMsg(p.nombre)}`}
                      target="_blank" rel="noopener"
                      style={{ width: 32, height: 32, background: '#25D366', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15, flexShrink: 0 }}>
                      💬
                    </a>
                  ) : (
                    <div style={{ width: 32, height: 32, background: '#f5f5f3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, opacity: .35, flexShrink: 0 }}>💬</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

          {/* card: Acceso */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 12 }}>
              🔑 Acceso a la quiniela
            </div>
            {[
              {
                label: 'Código participantes',
                value: <span style={{ fontWeight: 700, letterSpacing: 2, color: '#1D9E75', fontSize: 15 }}>{groupId}</span>,
                action: <button onClick={() => { navigator.clipboard.writeText(groupId); showToast('✓ Copiado') }}
                  style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}>
                  Copiar
                </button>,
              },
              {
                label: 'PIN de admin',
                value: <span style={{ fontWeight: 600, letterSpacing: 3, fontFamily: 'monospace', color: '#555', fontSize: 15 }}>
                  {pinVisible ? group?.adminPin : '•'.repeat(group?.adminPin?.length ?? 6)}
                </span>,
                action: <button onClick={() => setPinVisible(v => !v)}
                  style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}>
                  {pinVisible ? 'Ocultar' : 'Ver'}
                </button>,
              },
            ].map(({ label, value, action }, i, arr) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < arr.length - 1 ? '0.5px solid #f0f0f0' : 'none' }}>
                <div style={{ fontSize: 12, color: '#888', width: 140, flexShrink: 0 }}>{label}</div>
                <div style={{ flex: 1 }}>{value}</div>
                {action}
              </div>
            ))}
          </div>

          {/* card: Gestión del torneo */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 12 }}>
              🏆 Gestión del torneo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activePhaseOrder.map((ph, idx) => {
                const unlocked = admin?.unlockedPhases.includes(ph)
                const isGrupos = ph === 'grupos'
                const isLast = idx === activePhaseOrder.length - 1
                return (
                  <div key={ph} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: isLast ? 'none' : '0.5px solid #f0f0f0' }}>
                    <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10 }}>{unlocked ? '🟢' : '⚪'}</span>
                      <span style={{ color: unlocked ? '#0F6E56' : '#aaa', fontWeight: unlocked ? 500 : 400 }}>{PHASES[ph].label}</span>
                      {unlocked && <span style={{ fontSize: 10, background: '#E1F5EE', color: '#0F6E56', padding: '1px 6px', borderRadius: 99 }}>activa</span>}
                    </span>
                    {isGrupos ? (
                      <span style={{ fontSize: 11, color: '#ccc' }}>siempre activa</span>
                    ) : (
                      <button
                        onClick={() => unlocked ? lockLastPhase(ph) : unlockNextPhase(ph)}
                        style={{
                          padding: '4px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                          border: unlocked ? '0.5px solid #ccc' : 'none',
                          background: unlocked ? 'transparent' : '#1D9E75',
                          color: unlocked ? '#888' : '#fff',
                          fontWeight: 500,
                        }}
                      >
                        {unlocked ? 'Cerrar' : 'Abrir'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

      </div>

      {/* ── Bonsight IA ── */}
      <div style={card}>
        <div style={{ marginBottom: 14 }}>
          <KaiLabel
            title="Inteligencia Kai"
            subtitle="Genera análisis y confianza para todos los participantes"
            state={jornadaStatus === 'generating' || confidenceStatus === 'generating' ? 'thinking' : 'ready'}
            size={22}
          />
        </div>

        {/* Confianza por partido */}
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '0.5px solid #f0f0f0' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Confianza por partido</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            Kai evalúa 🟢🟡🔴 la dificultad de cada partido. Se genera una vez y sirve para todos.
          </div>
          <button
            onClick={generateConfidence}
            disabled={confidenceStatus === 'generating'}
            style={{
              padding: '7px 16px', fontSize: 12, borderRadius: 8, cursor: confidenceStatus === 'generating' ? 'default' : 'pointer',
              background: confidenceStatus === 'done' ? '#E1F5EE' : confidenceStatus === 'generating' ? '#f5f5f3' : '#1D9E75',
              color: confidenceStatus === 'done' ? '#0F6E56' : confidenceStatus === 'generating' ? '#aaa' : '#fff',
              border: confidenceStatus === 'done' ? '0.5px solid #1D9E75' : 'none',
              fontWeight: 500,
            }}
          >
            {confidenceStatus === 'generating' ? 'Generando...' : confidenceStatus === 'done' ? '✓ Confianza generada · Regenerar' : 'Generar confianza de partidos'}
          </button>
        </div>

        {/* Análisis de jornada */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Kai analiza la jornada</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            Kai genera una narrativa breve visible en Seguimiento para todos. Solo cuando lo activas.
          </div>
          <button
            onClick={generateJornada}
            disabled={jornadaStatus === 'generating'}
            style={{
              padding: '7px 16px', fontSize: 12, borderRadius: 8, cursor: jornadaStatus === 'generating' ? 'default' : 'pointer',
              background: jornadaStatus === 'generating' ? '#f5f5f3' : '#1D9E75',
              color: jornadaStatus === 'generating' ? '#aaa' : '#fff',
              border: 'none', fontWeight: 500, marginBottom: jornadaSummary ? 12 : 0,
            }}
          >
            {jornadaStatus === 'generating' ? 'Kai está analizando…' : jornadaStatus === 'done' ? 'Regenerar análisis de Kai' : 'Activar análisis de Kai'}
          </button>
          {jornadaSummary && (
            <div style={{ background: '#f9f9f7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#333', lineHeight: 1.6, borderLeft: '3px solid #1D9E75' }}>
              {jornadaSummary}
            </div>
          )}
        </div>
      </div>

      {/* ── footer ── */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: .5 }}>BON<span style={{ color: '#1D9E75' }}>sight</span></div>
        <div style={{ fontSize: 12, color: '#bbb' }}>Quiniela Mundial 2026 · USA, Canadá y México</div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  )
}
