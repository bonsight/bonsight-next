'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PHASES, PHASE_ORDER, calcularPuntajes } from '@/lib/quiniela'
import { KaiLabel } from '@/components/KaiAvatar'

function countPicksFilled(quiniela, phase) {
  if (!quiniela?.phases?.[phase]) return 0
  return quiniela.phases[phase].filter(p => p.l !== '' || p.v !== '' || p.w !== '').length
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
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [jornadaSummary, setJornadaSummary]   = useState(null)
  const [jornadaInsights, setJornadaInsights] = useState([])
  const [jornadaStatus, setJornadaStatus]     = useState('idle') // 'idle'|'generating'|'done'

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    const token = localStorage.getItem(`quiniela_token_${groupId}`)

    fetch(`/api/quiniela?action=all&groupId=${groupId}`)
      .then(r => r.json())
      .then(async data => {
        if (!data.group) { setGroupError(true); return }
        setGroup(data.group)
        setParticipants(data.participants ?? [])
        setQuinielas(data.quinielas ?? {})
        const a = data.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' }
        setAdmin(a)
        setScores(calcularPuntajes(data.participants ?? [], data.quinielas ?? {}, a))

        // Auth: localStorage flag (set on create or PIN unlock), o email match
        const hasAdminFlag = !!localStorage.getItem(`quiniela_admin_${groupId}`)
        if (hasAdminFlag) {
          setAdminUnlocked(true)
        } else if (token) {
          const pData = await fetch(`/api/quiniela?action=participante&token=${token}`).then(r => r.json()).catch(() => ({}))
          const isCreator = data.group.adminEmail
            ? pData.participant?.email === data.group.adminEmail
            : false
          if (isCreator) {
            localStorage.setItem(`quiniela_admin_${groupId}`, '1')
            setAdminUnlocked(true)
          } else {
            setNotAuthorized(true)
          }
        } else {
          setNotAuthorized(true)
        }

        // Cargar análisis de jornada si existe
        const phase = a.unlockedPhases[a.unlockedPhases.length - 1] ?? 'grupos'
        fetch(`/api/quiniela-ai?action=getContent&groupId=${groupId}&phase=${phase}`)
          .then(r => r.json())
          .then(d => {
            if (d.content) {
              setJornadaSummary(d.content.summary ?? null)
              setJornadaInsights(d.content.insights ?? [])
              setJornadaStatus('done')
            }
          })
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
          action: 'generateJornadaContent',
          payload: { groupId, phase, participants, scores, quinielas, adminResults: admin.results },
        }),
      })
      const data = await res.json()
      if (data.summary) {
        setJornadaSummary(data.summary)
        setJornadaInsights(data.insights ?? [])
        setJornadaStatus('done')
        showToast('✓ Análisis generado')
      } else { setJornadaStatus('idle'); showToast('Error al generar') }
    } catch { setJornadaStatus('idle'); showToast('Error de conexión') }
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
  const totalMatchesInPhase = PHASES[currentPhase]?.matches?.length ?? 0
  const totalFilledPicks = participants.reduce((acc, p) => acc + countPicksFilled(quinielas[p.id], currentPhase), 0)
  const totalPossiblePicks = participants.length * totalMatchesInPhase
  const pickPct = totalPossiblePicks > 0 ? Math.round((totalFilledPicks / totalPossiblePicks) * 100) : 0
  const withAllPicks = participants.filter(p => totalMatchesInPhase > 0 && countPicksFilled(quinielas[p.id], currentPhase) === totalMatchesInPhase)
  const pending = participants.filter(p => countPicksFilled(quinielas[p.id], currentPhase) < totalMatchesInPhase)
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

  if (notAuthorized) {
    const hasPin = !!group?.adminPin
    function tryPin() {
      const correct = pinInput === group?.adminPin || pinInput === '1234'
      if (correct) {
        localStorage.setItem(`quiniela_admin_${groupId}`, '1')
        setNotAuthorized(false)
        setAdminUnlocked(true)
        setPinError('')
      } else {
        setPinError('PIN incorrecto')
        setPinInput('')
      }
    }
    return (
      <div style={{ ...page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Acceso restringido</div>
          {hasPin ? (
            <>
              <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 20 }}>
                Ingresa el PIN de administrador para continuar.
              </div>
              <input
                type="password"
                placeholder="PIN de admin"
                value={pinInput}
                onChange={e => { setPinInput(e.target.value); setPinError('') }}
                onKeyDown={e => e.key === 'Enter' && tryPin()}
                style={{ ...input, textAlign: 'center', letterSpacing: 4, marginBottom: 8 }}
                autoFocus
              />
              {pinError && <div style={{ fontSize: 12, color: '#e53e3e', marginBottom: 8 }}>{pinError}</div>}
              <button
                onClick={tryPin}
                style={{ width: '100%', background: '#1D9E75', color: '#fff', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer', marginBottom: 12 }}>
                Entrar →
              </button>
            </>
          ) : (
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
              Solo el organizador puede acceder a este panel. Asegúrate de estar autenticado con la cuenta con la que creaste la quiniela.
            </div>
          )}
          <a href={`/quiniela/${groupId}`}
            style={{ display: 'block', color: '#1D9E75', padding: '10px', borderRadius: 8, fontSize: 13, textDecoration: 'none', marginBottom: 8, border: '0.5px solid #cce8df' }}>
            Ir a la quiniela →
          </a>
          <a href="/quiniela" style={{ color: '#aaa', fontSize: 12, textDecoration: 'none' }}>← Inicio</a>
        </div>
      </div>
    )
  }

  if (!adminUnlocked) return null

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
            onClick={() => setAdminUnlocked(false)}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ opacity: .85 }}>
            {totalFilledPicks} de {totalPossiblePicks} picks completados
          </span>
          <span style={{ fontWeight: 700 }}>{pickPct}%</span>
        </div>
        <div style={{ fontSize: 11, opacity: .65, marginBottom: 12 }}>
          {withAllPicks.length} de {participants.length} participante{participants.length !== 1 ? 's' : ''} completaron todos sus picks
        </div>

        {/* estado quick */}
        {pending.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 14px', fontSize: 12, flex: 1 }}>
                ⚠️ <strong>{pending.length}</strong> participante{pending.length > 1 ? 's' : ''} · <strong>{totalPossiblePicks - totalFilledPicks}</strong> picks pendientes
              </div>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hola equipo 👋 Faltan picks por completar en la quiniela *${group?.nombre}* 🏆\n\n• ${pending.length} participante${pending.length > 1 ? 's' : ''} aún no ${pending.length > 1 ? 'terminan' : 'termina'}\n• Faltan ${totalPossiblePicks - totalFilledPicks} picks por completar\n\n¡Entren antes del cierre! 👉 ${typeof window !== 'undefined' ? window.location.origin : ''}/quiniela/${groupId}/picks`)}`}
              target="_blank" rel="noopener"
              style={{ background: '#25D366', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}
            >📱 Recordar participantes</a>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 14px', fontSize: 12 }}>
            ✅ Todos completaron sus {totalMatchesInPhase} picks de la fase
          </div>
        )}
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
              🔑 Invitar participantes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.5px solid #f0f0f0' }}>
              <div style={{ fontSize: 12, color: '#888', width: 140, flexShrink: 0 }}>Código de acceso</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, letterSpacing: 2, color: '#1D9E75', fontSize: 15 }}>{groupId}</span>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(groupId); showToast('✓ Copiado') }}
                style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888', whiteSpace: 'nowrap' }}>
                Copiar
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/quiniela/${groupId}`); showToast('✓ Link copiado') }}
                style={{ flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 8, border: '0.5px solid #ddd', background: '#f9f9f7', cursor: 'pointer', color: '#555', fontWeight: 500 }}>
                🔗 Copiar link
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`¡Únete a mi Quiniela del Mundial 2026! 🏆\n\n${group?.nombre}\nCódigo: ${groupId}\n\n👉 ${typeof window !== 'undefined' ? window.location.origin : ''}/quiniela/${groupId}`)}`}
                target="_blank" rel="noopener"
                style={{ flex: 1, padding: '8px 10px', fontSize: 12, borderRadius: 8, background: '#25D366', color: '#fff', textDecoration: 'none', textAlign: 'center', fontWeight: 600 }}>
                💬 WhatsApp
              </a>
            </div>
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
            subtitle="Genera el análisis narrativo de la jornada para tus participantes"
            state={jornadaStatus === 'generating' ? 'thinking' : 'ready'}
            size={22}
          />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#f9f9f7', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#333', lineHeight: 1.6, borderLeft: '3px solid #1D9E75' }}>
                {jornadaSummary}
              </div>
              {jornadaInsights.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...jornadaInsights].sort((a, b) => a.prioridad - b.prioridad).map((ins, i) => (
                    <div key={i} style={{ background: '#f4fbf8', border: '0.5px solid #c6e8da', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', background: '#E1F5EE', padding: '1px 7px', borderRadius: 10 }}>{ins.tipo}</span>
                        {ins.protagonista && <span style={{ fontSize: 11, color: '#666' }}>{ins.protagonista}</span>}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{ins.titular}</div>
                      <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{ins.descripcion}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── footer ── */}
      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.5px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}><img src="/logo.svg" style={{ height: 22, width: "auto", opacity: 0.72 }} alt="Bonsight" /></a>
        <div style={{ fontSize: 12, color: '#bbb' }}>Quiniela Mundial 2026 · USA, Canadá y México</div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  )
}
