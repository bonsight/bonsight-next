'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PHASES, PHASE_ORDER, calcularPuntajes, calcularPuntajesProyectados, buildHistory, isMatchFinal, isMatchLive, evaluatePick, FLAGS } from '@/lib/quiniela'
import { KaiLabel } from '@/components/KaiAvatar'

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function Avatar({ name, size = 36, highlight }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: highlight ? '#1D9E75' : '#E1F5EE',
      color: highlight ? '#fff' : '#0F6E56',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.33), fontWeight: 500,
    }}>{initials(name)}</div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']

function BottomNav({ groupId, active, isAdmin }) {
  const item = (href, label, key) => (
    <a href={href} style={{
      flex: 1, padding: '10px 0 12px', textAlign: 'center', textDecoration: 'none',
      fontSize: 12, fontWeight: active === key ? 600 : 400,
      color: active === key ? '#1D9E75' : '#aaa',
      borderTop: `2px solid ${active === key ? '#1D9E75' : 'transparent'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
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

const st = {
  page: { maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh' },
}

const HISTORY_STATUS = {
  exacto:    { icon: '✅', color: '#1D9E75' },
  acierto:   { icon: '✅', color: '#1D9E75' },
  fallo:     { icon: '❌', color: '#c0392b' },
  pendiente: { icon: '⏳', color: '#bbb' },
  sin_pick:  { icon: '—',  color: '#ccc' },
}

function formatHistoryLabel(group) {
  if (group.label) return group.label
  const today = new Date().toLocaleDateString('en-CA')
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
  if (group.date === today) return 'Hoy'
  if (group.date === yesterday) return 'Ayer'
  const label = new Date(`${group.date}T00:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

// Hora de kickoff en la zona horaria local del navegador (el estado del partido
// se calcula globalmente en UTC vía admin.results — esto es solo display)
function formatKickoffLocal(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short' })
}

function formatMatchCountdown(iso, now) {
  const diff = new Date(iso).getTime() - now
  if (diff <= 0) return null
  const totalMin = Math.round(diff / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `Comienza en ${h}h ${m}m` : `Comienza en ${m}m`
}

// Duración estimada de un partido — separa "🔴 En vivo" de "⏱️ Finalizado (sin confirmar)"
const MATCH_DURATION_MS = 2 * 60 * 60 * 1000

// Día de kickoff relativo al calendario local del navegador: Hoy / Mañana / Ayer / día de la semana
function formatKickoffDayLabel(iso, now) {
  const kickoff = new Date(iso)
  const ref = new Date(now)
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(kickoff) - startOfDay(ref)) / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Mañana'
  if (diffDays === -1) return 'Ayer'
  const label = kickoff.toLocaleDateString(undefined, { weekday: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function getMatchTimeState(kickoff, now, real) {
  const kickoffTime = new Date(kickoff).getTime()
  const elapsed = now - kickoffTime
  const confirmed = isMatchFinal(real)
  const live = !confirmed && elapsed >= 0 && elapsed < MATCH_DURATION_MS
  const unconfirmed = !confirmed && elapsed >= MATCH_DURATION_MS
  const upcoming = !confirmed && elapsed < 0
  return { kickoffTime, elapsed, confirmed, live, unconfirmed, upcoming }
}

function HistoryMatchRow({ entry, isLast, pickLabel = 'Tu pick' }) {
  const { local, visitante, real, pick, status, pts } = entry
  const cfg = HISTORY_STATUS[status]
  const hasPick = pick && (pick.l !== '' || pick.v !== '')
  return (
    <div style={{ padding: '8px 14px', borderBottom: isLast ? 'none' : '0.5px solid #f5f5f3', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <span style={{ flex: 1, color: '#444', fontWeight: pick?.w === local ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {FLAGS[local] || ''} {local}
        </span>
        <span style={{
          background: real.l !== '' ? '#f0f0ee' : '#fafafa', color: '#555', fontWeight: 700, fontSize: 12,
          padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: .5,
        }}>
          {real.l !== '' ? real.l : '–'}–{real.v !== '' ? real.v : '–'}
        </span>
        <span style={{ flex: 1, color: '#444', fontWeight: pick?.w === visitante ? 600 : 400, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {visitante} {FLAGS[visitante] || ''}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
        <div style={{ fontSize: 11, color: '#888' }}>
          {hasPick
            ? <>{pickLabel}: {pick.l}–{pick.v}{pick.w && ` · ${pick.w === 'Empate' ? 'Empate' : `${FLAGS[pick.w] || ''} ${pick.w}`}`}</>
            : <span style={{ color: '#ccc' }}>Sin pick</span>}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{cfg.icon}</span>
          {(status === 'exacto' || status === 'acierto') && <span>+{pts}</span>}
          {status === 'fallo' && <span>0</span>}
        </div>
      </div>
    </div>
  )
}

export default function SeguimientoPage() {
  const { id: groupId } = useParams()
  const router = useRouter()

  const [auth, setAuth]           = useState('checking')
  const [participant, setParticipant] = useState(null)
  const [group, setGroup]         = useState(null)
  const [admin, setAdmin]         = useState(null)
  const [participants, setParticipants] = useState([])
  const [quinielas, setQuinielas] = useState({})
  const [scores, setScores]       = useState([])
  const [myScore, setMyScore]     = useState(null)
  const [myPosition, setMyPosition] = useState(null)
  // sin tabs — ambas secciones visibles en scroll
  const [loading, setLoading]     = useState(true)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [jornadaSummary, setJornadaSummary] = useState(null)
  const [showProjection, setShowProjection] = useState(true)
  const [showKaiCenter, setShowKaiCenter] = useState(false)
  const [showKaiProfile, setShowKaiProfile] = useState(false)
  const [detailParticipant, setDetailParticipant] = useState(null)
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  function openDetail(pid) {
    setDetailParticipant({ loading: true })
    const token = localStorage.getItem(`quiniela_token_${groupId}`)
    fetch(`/api/quiniela?action=participantDetail&groupId=${groupId}&participantId=${pid}&token=${token}`)
      .then(r => r.json())
      .then(d => setDetailParticipant(d.error ? { error: true } : d))
      .catch(() => setDetailParticipant({ error: true }))
  }

  const anyLiveMatch = PHASES.grupos.matches.some((m) => {
    const { live } = getMatchTimeState(m.kickoff, now, null)
    return live
  })

  const anyLiveResult = (admin?.results?.grupos ?? []).some((real) => isMatchLive(real))

  const projectedScores = [...calcularPuntajesProyectados(participants, quinielas, admin)]
    .sort((a, b) => b.pts - a.pts)
  const anyProjectionMovement = projectedScores.some((projection, idx) => {
    const currentIdx = scores.findIndex((s) => s.participantId === projection.participantId)
    return currentIdx !== idx
  })

  useEffect(() => {
    const token = localStorage.getItem(`quiniela_token_${groupId}`)
    if (!token) { setAuth('denied'); router.replace(`/quiniela/${groupId}`); return }
    setIsAdmin(!!localStorage.getItem(`quiniela_admin_${groupId}`))

    Promise.all([
      fetch(`/api/quiniela?action=participante&token=${token}`).then(r => r.json()),
      fetch(`/api/quiniela?action=all&groupId=${groupId}&token=${token}`).then(r => r.json()),
    ]).then(([pData, aData]) => {
      if (pData.error) { setAuth('denied'); router.replace(`/quiniela/${groupId}`); return }

      const p = pData.participant
      const a = aData.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' }
      const allParts = aData.participants ?? []
      const allQ = aData.quinielas ?? {}

      setParticipant(p)
      setGroup(aData.group)
      setAdmin(a)
      setParticipants(allParts)
      setQuinielas(allQ)

      const s = calcularPuntajes(allParts, allQ, a)
      const sorted = [...s].sort((a, b) => b.pts - a.pts)
      setScores(sorted)

      const me = sorted.find(x => x.participantId === p.id)
      const pos = sorted.findIndex(x => x.participantId === p.id)
      setMyScore(me ?? { pts: 0, breakdown: { exacto: 0, ganador: 0, campeon: 0, goleador: 0 } })
      setMyPosition(pos)

      // Cargar resumen de jornada si existe
      const currentPhase = a.unlockedPhases[a.unlockedPhases.length - 1] ?? 'grupos'
      fetch(`/api/quiniela-ai?action=getJornada&groupId=${groupId}&phase=${currentPhase}`)
        .then(r => r.json())
        .then(d => { if (d.summary) setJornadaSummary(d.summary) })
        .catch(() => {})

      setAuth('ok')
    }).catch(() => {
      setAuth('denied'); router.replace(`/quiniela/${groupId}`)
    }).finally(() => setLoading(false))
  }, [groupId, router])

  // ── Auto-refresh mientras haya partidos en vivo ──
  useEffect(() => {
    if (auth !== 'ok' || !anyLiveMatch) return
    const token = localStorage.getItem(`quiniela_token_${groupId}`)
    const interval = setInterval(() => {
      fetch(`/api/quiniela?action=all&groupId=${groupId}&token=${token}`)
        .then(r => r.json())
        .then(aData => {
          const a = aData.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' }
          const allParts = aData.participants ?? []
          const allQ = aData.quinielas ?? {}
          setAdmin(a)
          setParticipants(allParts)
          setQuinielas(allQ)

          const s = calcularPuntajes(allParts, allQ, a)
          const sorted = [...s].sort((x, y) => y.pts - x.pts)
          setScores(sorted)

          const me = sorted.find(x => x.participantId === participant?.id)
          const pos = sorted.findIndex(x => x.participantId === participant?.id)
          setMyScore(me ?? { pts: 0, breakdown: { exacto: 0, ganador: 0, campeon: 0, goleador: 0 } })
          setMyPosition(pos)
        })
        .catch(() => {})
    }, 45000)
    return () => clearInterval(interval)
  }, [auth, groupId, anyLiveMatch, participant?.id])

  // ── Reloj para "Jornada en curso" (hora local / cuenta atrás de kickoff) ──
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  if (auth === 'checking' || loading) return (
    <div style={{ ...st.page, textAlign: 'center', paddingTop: '4rem', color: '#aaa' }}>Cargando...</div>
  )
  if (auth === 'denied') return null

  // Métricas de picks propios
  const activeFases = (group?.fases ?? PHASE_ORDER).filter(ph => PHASE_ORDER.includes(ph))
  const myQ = quinielas[participant?.id]
  const unlockedFases = activeFases.filter(ph => admin?.unlockedPhases.includes(ph))

  const totalMatchSlots = unlockedFases.reduce((acc, ph) => acc + PHASES[ph].matches.length, 0)
  const filledSlots = unlockedFases.reduce((acc, ph) => {
    const phasePicks = myQ?.phases?.[ph] ?? []
    return acc + phasePicks.filter(p => p.l !== '' || p.v !== '' || p.w !== '').length
  }, 0)
  const pendingSlots = totalMatchSlots - filledSlots

  const posLabel = myPosition === 0 ? '🥇 Líder' : myPosition === 1 ? '🥈 2° lugar' : myPosition === 2 ? '🥉 3° lugar' : myPosition !== null ? `${myPosition + 1}° lugar` : '—'

  // ── Jornada en curso (partidos de grupos programados hoy) ──
  const today = new Date(now).toLocaleDateString('en-CA')
  const todayMatches = PHASES.grupos.matches
    .map((m, i) => ({ ...m, idx: i }))
    .filter(m => new Date(m.kickoff).toLocaleDateString('en-CA') === today)

  const activeTodayMatches = todayMatches.filter(({ kickoff, idx }) => {
    const real = admin?.results?.grupos?.[idx]
    const { confirmed, live, upcoming } = getMatchTimeState(kickoff, now, real)
    return live || upcoming || (!confirmed && !!real && (real.l !== '' || real.v !== ''))
  })

  const tabStyle = (active) => ({
    padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
    background: 'none', color: active ? '#0F6E56' : '#888',
    borderBottom: active ? '2px solid #1D9E75' : '2px solid transparent',
    fontWeight: active ? 500 : 400, marginBottom: -1,
  })

  return (
    <div style={st.page}>
      {/* ── Jornada en curso ── */}
      {activeTodayMatches.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>⚡ Jornada en curso</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayMatches.map(({ local, visitante, idx, kickoff }) => {
              const real  = admin?.results?.grupos?.[idx]
              const hasScore = !!real && real.l !== '' && real.v !== ''

              // Estado automático según el horario de kickoff y el resultado disponible.
              const { live, upcoming, kickoffTime } = getMatchTimeState(kickoff, now, real)
              const confirmed = isMatchFinal(real)
              const matchFinished = !upcoming && !live
              const statusFinal = hasScore && matchFinished
              const statusPending = !hasScore && matchFinished

              let statusLabel, statusColor
              if (confirmed)        { statusLabel = '✅ Finalizado'; statusColor = '#1D9E75' }
              else if (live)        { statusLabel = '🔴 En vivo';    statusColor = '#c0392b' }
              else if (statusFinal) { statusLabel = '✅ Finalizado'; statusColor = '#1D9E75' }
              else if (statusPending) { statusLabel = '⏱️ Pendiente de resultado'; statusColor = '#aaa' }
              else                  { statusLabel = '⏳ Por jugar';  statusColor = '#aaa' }

              let pendingNote = null
              if (live && !hasScore) pendingNote = 'Marcador pendiente de actualización'
              else if (live && hasScore) pendingNote = 'Resultado provisional'
              else if (statusPending) pendingNote = 'Resultado pendiente de actualización'
              else if (statusFinal && !confirmed) pendingNote = 'Resultado sin confirmar'

              const countdown = upcoming && kickoffTime - now < 24 * 3600000 ? formatMatchCountdown(kickoff, now) : null

              const pick = myQ?.phases?.grupos?.[idx]
              const hasPick = pick && (pick.l !== '' || pick.v !== '')
              const pickResult = hasScore && hasPick ? evaluatePick(pick, real, { local, visitante }) : null
              const provisional = live || (statusFinal && !confirmed)

              return (
                <div key={idx} style={{ border: '0.5px solid #eee', borderRadius: 12, padding: '10px 14px', background: live ? '#fff8f0' : '#fff' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: statusColor, marginBottom: 6 }}>{statusLabel}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <span style={{ flex: 1, textAlign: 'right', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{FLAGS[local] || ''} {local}</span>
                    <span style={{ background: '#f5f5f3', color: '#333', fontWeight: 700, padding: '3px 10px', borderRadius: 6, fontSize: 15, flexShrink: 0 }}>
                      {hasScore ? `${real.l}–${real.v}` : 'vs'}
                    </span>
                    <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{visitante} {FLAGS[visitante] || ''}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#aaa' }}>
                    {formatKickoffDayLabel(kickoff, now)} · {formatKickoffLocal(kickoff)}
                    {countdown && <span style={{ color: '#888' }}> · {countdown}</span>}
                    {pendingNote && <span style={{ fontStyle: 'italic' }}> · {pendingNote}</span>}
                  </div>
                  {hasPick && (
                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <span style={{ color: '#888' }}>
                        Tu pick: {pick.l}–{pick.v}{pick.w && ` · ${pick.w === 'Empate' ? 'Empate' : pick.w}`}
                      </span>
                      <span style={{ fontWeight: 700, color: pickResult?.status === 'fallo' ? '#c0392b' : '#1D9E75' }}>
                        {pickResult ? (
                          (pickResult.status === 'exacto' || pickResult.status === 'acierto') ? `✅ +${pickResult.pts}` : '❌ 0'
                        ) : provisional ? (
                          statusPending ? '⏳ A la espera de resultado' : '⏳ Resultado provisional'
                        ) : null}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── card posición prominente ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
        borderRadius: 16, padding: '20px 20px 16px', marginBottom: 20, color: '#fff',
        boxShadow: '0 4px 20px rgba(15,110,86,.2)',
      }}>
        <div style={{ fontSize: 11, opacity: .75, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>
          🏅 Tu posición
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{posLabel}</div>
            <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>{participant?.nombre} · {group?.nombre}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{myScore?.pts ?? 0}</div>
            <div style={{ fontSize: 11, opacity: .7 }}>puntos</div>
          </div>
        </div>
        {/* distancia al líder */}
        {(() => {
          const myPts = myScore?.pts ?? 0
          const leaderPts = scores[0]?.pts ?? 0
          const secondPts = scores[1]?.pts ?? 0
          if (scores.length < 2) return null
          if (myPosition === 0) {
            const ventaja = myPts - secondPts
            return (
              <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '6px 12px', fontSize: 12, marginBottom: 10 }}>
                {ventaja > 0 ? `🔥 Llevas ${ventaja} pt${ventaja > 1 ? 's' : ''} de ventaja sobre el 2°` : '⚡ Empatado en el 1° lugar'}
              </div>
            )
          }
          const diff = leaderPts - myPts
          const podioIdx = Math.min(2, scores.length - 1)
          const podioPts = scores[podioIdx]?.pts ?? 0
          const diffPodio = podioPts - myPts
          return (
            <div style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '6px 12px', fontSize: 12, marginBottom: 10 }}>
              {diff === 0
                ? `⚡ Empatado con el líder`
                : diffPodio <= 0 && myPosition <= 2
                ? `🥉 En el podio — a ${diff} pt${diff > 1 ? 's' : ''} del líder`
                : diffPodio > 0
                ? `A ${diff} pt${diff > 1 ? 's' : ''} del líder · a ${diffPodio} del podio`
                : `A ${diff} pt${diff > 1 ? 's' : ''} del líder`
              }
            </div>
          )
        })()}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { val: myScore?.breakdown.exacto ?? 0, label: '🎯 Exactos' },
            { val: myScore?.breakdown.ganador ?? 0, label: '✅ Ganadores' },
            { val: pendingSlots, label: '📋 Pendientes', warn: pendingSlots > 0 },
          ].map(({ val, label, warn }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: warn ? '#FFD580' : '#fff' }}>{val}</div>
              <div style={{ fontSize: 10, opacity: .75, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Kai analiza la jornada ── */}
      {jornadaSummary && (
        <div style={{ background: 'linear-gradient(135deg, #f0faf6 0%, #fff 100%)', border: '0.5px solid #1D9E75', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ marginBottom: 10 }}>
            <KaiLabel title="Kai analiza la jornada" subtitle="Insights generados a partir de resultados reales y pronósticos" state="ready" size={20} />
          </div>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.65 }}>{jornadaSummary}</div>
        </div>
      )}

      {/* ── TABLA ── */}
      <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>Tabla de posiciones</div>
      {(
        <div>
          {scores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>
              Aún no hay puntos. Los resultados se calculan desde el panel admin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scores.map((s, idx) => {
                const p = participants.find(x => x.id === s.participantId)
                const isMe = s.participantId === participant?.id
                const bd = s.breakdown
                const bonus = (bd.campeon > 0 ? 5 : 0) + (bd.goleador > 0 ? 3 : 0)
                const isTop3 = idx < 3
                const nextPts = idx < scores.length - 1 ? scores[idx + 1].pts : null
                const gap = nextPts !== null ? s.pts - nextPts : null

                return (
                  <div key={s.participantId} onClick={!isMe ? () => openDetail(s.participantId) : undefined} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: isTop3 ? '12px 14px' : '9px 12px',
                    borderRadius: isTop3 ? 12 : 8,
                    background: isMe ? '#E1F5EE' : isTop3 ? '#fafafa' : 'transparent',
                    border: isMe ? '1px solid #1D9E75' : isTop3 ? '0.5px solid #eee' : '0.5px solid #f5f5f3',
                    cursor: !isMe ? 'pointer' : 'default',
                  }}>
                    <div style={{ fontSize: isTop3 ? 20 : 14, width: 28, textAlign: 'center', flexShrink: 0 }}>
                      {MEDALS[idx] ?? idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={p?.nombre ?? '?'} size={isTop3 ? 32 : 26} highlight={isMe} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: isTop3 ? 14 : 13, fontWeight: isMe || isTop3 ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p?.nombre}{isMe ? ' 👈' : ''}
                          </div>
                          {p?.pais && <div style={{ fontSize: 10, color: '#aaa' }}>{FLAGS[p.pais] ? `${FLAGS[p.pais]} ` : ''}{p.pais}</div>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: isTop3 ? 20 : 15, fontWeight: 700, color: isMe ? '#0F6E56' : '#333' }}>{s.pts}</div>
                      {bonus > 0 && <div style={{ fontSize: 10, color: '#BA7517' }}>+{bonus} bonus</div>}
                      {gap !== null && gap > 0 && <div style={{ fontSize: 10, color: '#aaa' }}>+{gap} al sig.</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Proyección en vivo ── */}
      {anyLiveResult && anyProjectionMovement && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => setShowProjection(v => !v)}
            style={{
              width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fff8f0', border: '0.5px solid #f0d9b5', borderRadius: 10, padding: '10px 14px',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#b9770e',
            }}
          >
            <span>📈 Proyección en vivo <span style={{ fontWeight: 400, color: '#c79a5b' }}>· si los resultados actuales se mantienen</span></span>
            <span style={{ fontSize: 10 }}>{showProjection ? '▲' : '▼'}</span>
          </button>
          {showProjection && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {[...calcularPuntajesProyectados(participants, quinielas, admin)]
                .sort((a, b) => b.pts - a.pts)
                .map((s, idx) => {
                  const officialIdx = scores.findIndex(x => x.participantId === s.participantId)
                  const diff = officialIdx - idx
                  const p = participants.find(x => x.id === s.participantId)
                  const isMe = s.participantId === participant?.id
                  return (
                    <div key={s.participantId} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                      borderRadius: 8, background: isMe ? '#E1F5EE' : 'transparent',
                      border: isMe ? '1px solid #1D9E75' : '0.5px solid #f5f5f3',
                    }}>
                      <div style={{ fontSize: 14, width: 28, textAlign: 'center', flexShrink: 0 }}>{MEDALS[idx] ?? idx + 1}</div>
                      <div style={{ width: 26, textAlign: 'center', fontSize: 12, fontWeight: 700, color: diff > 0 ? '#1D9E75' : diff < 0 ? '#c0392b' : '#ccc', flexShrink: 0 }}>
                        {diff > 0 ? '▲' : diff < 0 ? '▼' : '='}{diff !== 0 && Math.abs(diff)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar name={p?.nombre ?? '?'} size={26} highlight={isMe} />
                        <div style={{ fontSize: 13, fontWeight: isMe ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p?.nombre}{isMe ? ' 👈' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isMe ? '#0F6E56' : '#333', flexShrink: 0 }}>{s.pts}</div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ── HISTORIAL ── */}
      <div style={{ marginTop: 28, fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: .5 }}>Historial</div>

      {!myQ ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>
          Aún no has llenado picks.
          <br />
          <a href={`/quiniela/${groupId}/picks`} style={{ color: '#1D9E75', marginTop: 8, display: 'inline-block' }}>Llenar picks →</a>
        </div>
      ) : (
        <div>
          {/* Premios Mayores primero */}
          {(() => {
            const specialResolved = !!(admin?.realCampeon && admin?.realGoleador)
            const campeonCorrecto  = specialResolved && myQ.campeon  === admin.realCampeon
            const goleadorCorrecto = specialResolved && myQ.goleador === admin.realGoleador
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Campeón', pick: myQ.campeon,  pts: 5, correcto: campeonCorrecto,  real: admin?.realCampeon  },
                  { label: 'Goleador', pick: myQ.goleador, pts: 3, correcto: goleadorCorrecto, real: admin?.realGoleador },
                ].map(({ label, pick, pts, correcto, real }) => (
                  <div key={label} style={{
                    background: specialResolved ? (correcto ? '#E1F5EE' : '#fff3f3') : 'linear-gradient(145deg,#E8F8F1,#F5FCF8)',
                    border: `1.5px solid ${specialResolved ? (correcto ? '#1D9E75' : '#e0a0a0') : '#1D9E75'}`,
                    borderRadius: 12, padding: 14,
                  }}>
                    <div style={{ fontSize: 11, color: specialResolved ? (correcto ? '#0F6E56' : '#c0392b') : '#0F6E56', fontWeight: 600, marginBottom: 6 }}>
                      {specialResolved ? (correcto ? '✅' : '❌') : '🏆'} {label}
                      {!specialResolved && <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 99, marginLeft: 5 }}>{pts} pts</span>}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>
                      {pick
                        ? <>{FLAGS[pick] ? `${FLAGS[pick]} ` : ''}{pick}</>
                        : <span style={{ color: '#bbb', fontWeight: 400, fontSize: 13 }}>Pronóstico pendiente</span>
                      }
                    </div>
                    {specialResolved && !correcto && real && (
                      <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Real: {FLAGS[real] ? `${FLAGS[real]} ` : ''}{real}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Historial por fecha / fase — últimos 2 días, con "Cargar más fechas" */}
          {(() => {
            const renderGroup = group => (
              <div key={group.key} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  {formatHistoryLabel(group)}
                </div>
                <div style={{ border: '0.5px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
                  {group.matches.map((entry, idx) => (
                    <HistoryMatchRow key={`${entry.phase}-${entry.matchIndex}`} entry={entry} isLast={idx === group.matches.length - 1} />
                  ))}
                </div>
              </div>
            )

            const history = buildHistory(myQ, admin, unlockedFases)
            const dateGroups  = history.filter(g => g.date)
            const otherGroups = history.filter(g => !g.date)
            const todayKey = new Date(now).toISOString().slice(0, 10)
            const visibleDateGroups = showFullHistory
              ? dateGroups
              : dateGroups.filter(g => g.date >= '2026-06-11' && g.date <= todayKey)
            const hiddenCount = dateGroups.length - visibleDateGroups.length

            return (
              <>
                {visibleDateGroups.map(renderGroup)}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => setShowFullHistory(true)}
                    style={{
                      width: '100%', padding: '10px', marginBottom: 16, fontSize: 12, fontWeight: 600,
                      color: '#0F6E56', background: '#f5f5f3', border: '0.5px solid #e0e0de', borderRadius: 10, cursor: 'pointer',
                    }}
                  >
                    Cargar más fechas ({hiddenCount})
                  </button>
                )}
                {otherGroups.map(renderGroup)}
              </>
            )
          })()}
        </div>
      )}

      {/* ── Centro de Inteligencia Kai ── */}
      {(() => {
        if (participants.length === 0) return null

        const sorted = [...scores].sort((a, b) => b.pts - a.pts)

        // ── Consenso por partido (para calcular picks atrevidos) ──
        const matchConsensus = {}
        PHASE_ORDER.forEach(ph => {
          PHASES[ph].matches.forEach((m, i) => {
            const votes = {}
            let total = 0
            Object.values(quinielas).forEach(q => {
              const w = q.phases?.[ph]?.[i]?.w
              if (w) { votes[w] = (votes[w] ?? 0) + 1; total++ }
            })
            if (total >= 2) {
              const leader = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0]
              matchConsensus[`${ph}-${i}`] = { leader, total, votes, match: m }
            }
          })
        })

        // ── Stats por participante ──
        const pStats = {}
        participants.forEach(p => {
          const q = quinielas[p.id]
          if (!q) { pStats[p.id] = { contrarian: 0, total: 0, pct: 0, draws: 0, goals: 0, picks: 0 }; return }
          let contrarian = 0, consensusTotal = 0, draws = 0, goals = 0, picks = 0
          PHASE_ORDER.forEach(ph => {
            ;(q.phases?.[ph] ?? []).forEach((pk, i) => {
              if (!pk.w) return
              if (pk.w === 'Empate') draws++
              if (pk.l !== '' && pk.v !== '') { goals += Number(pk.l) + Number(pk.v); picks++ }
              const cs = matchConsensus[`${ph}-${i}`]
              if (cs) { consensusTotal++; if (pk.w !== cs.leader) contrarian++ }
            })
          })
          pStats[p.id] = {
            contrarian, total: consensusTotal,
            pct: consensusTotal > 0 ? Math.round((contrarian / consensusTotal) * 100) : 0,
            draws, goals, picks,
            avgGoals: picks > 0 ? goals / picks : 0,
          }
        })

        // ── Computar reconocimientos ──

        // 1. Favorito para levantar la copa
        const liderId = sorted[0]?.participantId
        const lider = participants.find(p => p.id === liderId)
        const ptsLead = sorted.length > 1 ? sorted[0].pts - sorted[1].pts : 0
        const hayFavorito = (sorted[0]?.pts ?? 0) > 0 && ptsLead > 0

        // 2. Más atrevido
        const masAtrevido = participants
          .filter(p => pStats[p.id]?.total >= 3)
          .sort((a, b) => (pStats[b.id]?.pct ?? 0) - (pStats[a.id]?.pct ?? 0))[0]

        // 3. Rey de los empates
        const reyEmpates = participants
          .filter(p => pStats[p.id]?.draws > 0)
          .sort((a, b) => (pStats[b.id]?.draws ?? 0) - (pStats[a.id]?.draws ?? 0))[0]

        // 4. Rey de los exactos (solo si hay resultados)
        const sortedByExactos = [...sorted].sort((a, b) => (b.breakdown?.exacto ?? 0) - (a.breakdown?.exacto ?? 0))
        const reyExactos = (sortedByExactos[0]?.breakdown?.exacto ?? 0) > 0
          ? participants.find(p => p.id === sortedByExactos[0]?.participantId)
          : null

        // 5. Golpe de la jornada — pick más minoritario de toda la quiniela
        let golpe = null
        let minPct = 100
        Object.entries(matchConsensus).forEach(([key, cs]) => {
          const [ph, idxStr] = key.split('-')
          const i = parseInt(idxStr)
          Object.entries(cs.votes).forEach(([option, count]) => {
            if (option === cs.leader) return
            const pct = Math.round((count / cs.total) * 100)
            if (pct < minPct) {
              const pickers = participants.filter(p => quinielas[p.id]?.phases?.[ph]?.[i]?.w === option)
              if (pickers.length > 0) {
                minPct = pct
                // Check if correct
                const real = admin?.results?.[ph]?.[i]
                const realWin = real && real.l !== '' ? (Number(real.l) > Number(real.v) ? cs.match.local : Number(real.l) < Number(real.v) ? cs.match.visitante : 'Empate') : null
                golpe = { match: cs.match, option, pickers, count, total: cs.total, isCorrect: realWin === option }
              }
            }
          })
        })

        // ── Construir tarjetas — nombre siempre integrado en el insight ──
        const cards = [
          {
            icon: '🏆', label: 'Favorito para levantar la copa',
            insight: hayFavorito
              ? `Kai considera que ${lider?.nombre} es actualmente el principal candidato al título, con ${ptsLead} punto${ptsLead > 1 ? 's' : ''} de ventaja sobre el segundo.`
              : (sorted[0]?.pts ?? 0) === 0
              ? `Kai aún no detecta un favorito claro. La quiniela está en blanco y todo está por decidirse.`
              : `Kai detecta un empate en la cima — la quiniela todavía está completamente abierta.`,
            metrics: hayFavorito ? [`${sorted[0]?.pts ?? 0} pts totales`, `+${ptsLead} sobre el 2°`] : [],
          },
          masAtrevido && masAtrevido.id !== lider?.id && {
            icon: '🔥', label: 'Más atrevido en sus picks',
            insight: `${masAtrevido.nombre} va contra el consenso en el ${pStats[masAtrevido.id].pct}% de sus picks — más que cualquier otro participante.`,
            metrics: [`${pStats[masAtrevido.id].pct}% contra la mayoría`, `${pStats[masAtrevido.id].contrarian} picks diferenciales`],
          },
          reyEmpates && reyEmpates.id !== masAtrevido?.id && {
            icon: '🧠', label: 'Rey de los empates',
            insight: `${reyEmpates.nombre} ha pronosticado ${pStats[reyEmpates.id].draws} empate${pStats[reyEmpates.id].draws !== 1 ? 's' : ''} — el estilo más conservador de la quiniela.`,
            metrics: [`${pStats[reyEmpates.id].draws} empates pronosticados`, '1° en predicciones conservadoras'],
          },
          reyExactos && {
            icon: '🎯', label: 'Rey de los exactos',
            insight: `Kai detecta que ${reyExactos.nombre} tiene el mayor porcentaje de aciertos exactos de toda la quiniela.`,
            metrics: [`${sortedByExactos[0]?.breakdown?.exacto ?? 0} resultados exactos`, `${(sortedByExactos[0]?.breakdown?.exacto ?? 0) * 3} pts de exactos`],
          },
          golpe && {
            icon: '🎲', label: 'Golpe de la jornada',
            insight: golpe.count === 1
              ? `${golpe.pickers[0]?.nombre} fue el único participante que eligió ${golpe.option === 'Empate' ? 'empate' : golpe.option} en ${golpe.match.local} vs ${golpe.match.visitante}.${golpe.isCorrect ? ' Y acertó.' : ''}`
              : `Solo ${golpe.count} participantes eligieron ${golpe.option === 'Empate' ? 'empate' : golpe.option} en ${golpe.match.local} vs ${golpe.match.visitante}.${golpe.isCorrect ? ' Y acertaron.' : ''}`,
            metrics: [`${golpe.count} de ${golpe.total} eligieron ${golpe.option}`, golpe.isCorrect ? '✅ Resultado correcto' : 'Resultado por verse'],
          },
        ].filter(Boolean)

        if (cards.length === 0) return null

        return (
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, marginBottom: 20, background: '#fafafa', overflow: 'hidden' }}>
            <button
              onClick={() => setShowKaiCenter(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <KaiLabel title="Centro de Inteligencia Kai" subtitle="Lo que Kai está detectando en la quiniela." state="ready" size={20} />
              <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0, marginLeft: 8 }}>{showKaiCenter ? '▲' : '▼'}</span>
            </button>
            {showKaiCenter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px 16px' }}>
                {cards.map(({ icon, label, insight, metrics }) => (
                  <div key={label} style={{ background: 'rgba(52,211,153,0.04)', border: '0.5px solid rgba(52,211,153,0.18)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 15 }}>{icon}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 14, color: "#333", lineHeight: 1.55, marginBottom: metrics.length > 0 ? 8 : 0 }}>{insight}</div>
                    {metrics.length > 0 && (
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                        {metrics.map(m => (
                          <span key={m} style={{ fontSize: 10, background: 'rgba(52,211,153,0.12)', color: '#0F6E56', padding: '2px 8px', borderRadius: 99 }}>{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Perfil del participante según Kai ── */}
      {(() => {
        const myQ = quinielas[participant?.id]
        let totalPicks = 0
        PHASE_ORDER.forEach(ph => {
          totalPicks += (myQ?.phases?.[ph] ?? []).filter(pk => pk.l !== '').length
        })

        const locked = totalPicks < 10

        let profile = null
        if (!locked) {
          let totalGoals = 0, pickCount = 0, drawCount = 0
          PHASE_ORDER.forEach(ph => {
            ;(myQ?.phases?.[ph] ?? []).forEach(pk => {
              if (pk.l !== '' && pk.v !== '') {
                totalGoals += Number(pk.l) + Number(pk.v); pickCount++
                if (pk.w === 'Empate') drawCount++
              }
            })
          })
          const avg = pickCount > 0 ? totalGoals / pickCount : 0
          const drawRatio = pickCount > 0 ? drawCount / pickCount : 0

          if (avg > 3.5) profile = { emoji: '⚡', name: 'Arriesgado', desc: 'Kai detecta que favoreces los marcadores abiertos y apuestas por resultados contundentes. Te gustan los goles.' }
          else if (drawRatio > 0.25) profile = { emoji: '🧠', name: 'Estratégico', desc: 'Kai ve que priorizas la prudencia. Muchos empates y resultados ajustados en tus picks — un estilo táctico y cuidadoso.' }
          else if (avg > 2.3) profile = { emoji: '🎯', name: 'Francotirador', desc: 'Kai identifica un estilo equilibrado. Ni muy conservador ni muy agresivo — confías en tu lectura de cada partido.' }
          else profile = { emoji: '📈', name: 'Analítico', desc: 'Kai detecta un enfoque medido y racional. Priorizas no equivocarte antes que arriesgar en marcadores altos.' }
        }

        const subtitle = locked
          ? `${10 - totalPicks} picks más para desbloquear tu perfil`
          : `Basado en ${totalPicks} picks analizados`

        return (
          <div style={{ border: locked ? '0.5px solid rgba(52,211,153,0.25)' : '1px solid #1D9E75', borderRadius: 12, marginBottom: 20, background: locked ? 'rgba(52,211,153,0.03)' : 'linear-gradient(135deg,#f0faf6,#fff)', overflow: 'hidden' }}>
            <button
              onClick={() => setShowKaiProfile(v => !v)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <KaiLabel title="Tu perfil según Kai" subtitle={subtitle} state={locked ? 'thinking' : 'ready'} size={18} />
              <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0, marginLeft: 8 }}>{showKaiProfile ? '▲' : '▼'}</span>
            </button>
            {showKaiProfile && (
              <div style={{ padding: '0 16px 16px' }}>
                {locked ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 14, color: '#555' }}>
                      Kai necesita al menos 10 picks para entender cómo juegas. Completa más pronósticos para descubrir tu estilo.
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {[['🔥','Arriesgado'],['🧠','Estratégico'],['⚖️','Conservador'],['🎯','Cazador de sorpresas']].map(([e, l]) => (
                        <span key={l} style={{ fontSize: 12, background: '#f5f5f3', border: '0.5px solid #e0e0de', borderRadius: 99, padding: '4px 12px', color: '#888' }}>
                          {e} {l}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 32 }}>{profile.emoji}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0F6E56', marginBottom: 3 }}>{profile.name}</div>
                      <div style={{ fontSize: 14, color: '#555', lineHeight: 1.55 }}>{profile.desc}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* footer */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}><img src="/logo.svg" style={{ height: 22, width: "auto", opacity: 0.72 }} alt="Bonsight" /></a>
        <div style={{ fontSize: 11, color: '#bbb' }}>Mundial 2026</div>
      </div>

      {/* ── Modal: detalle de participante ── */}
      {detailParticipant && (
        <div
          onClick={() => setDetailParticipant(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', maxWidth: 720, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '20px 18px 30px' }}
          >
            {detailParticipant.loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>Cargando...</div>
            ) : detailParticipant.error ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>No se pudo cargar el detalle.</div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 17, fontWeight: 700 }}>{detailParticipant.participant?.nombre}</span>
                      {detailParticipant.position > 0 && (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0F6E56' }}>
                          {MEDALS[detailParticipant.position - 1] ?? `#${detailParticipant.position}`}
                        </span>
                      )}
                    </div>
                    {detailParticipant.participant?.pais && (
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {FLAGS[detailParticipant.participant.pais] ? `${FLAGS[detailParticipant.participant.pais]} ` : ''}{detailParticipant.participant.pais}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setDetailParticipant(null)} style={{ border: 'none', background: 'none', fontSize: 20, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    [detailParticipant.stats.pts, 'Puntos'],
                    [detailParticipant.stats.exactos, 'Exactos'],
                    [detailParticipant.stats.aciertos, 'Aciertos'],
                    [`${detailParticipant.stats.efectividad}%`, 'Efectividad'],
                  ].map(([val, label]) => (
                    <div key={label} style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#0F6E56' }}>{val}</div>
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {detailParticipant.vsMe && (
                  <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#555', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🆚 vs. ti</span>
                    <span style={{ fontWeight: 600, color: detailParticipant.vsMe.ptsDiff > 0 ? '#1D9E75' : detailParticipant.vsMe.ptsDiff < 0 ? '#c0392b' : '#555' }}>
                      {detailParticipant.vsMe.ptsDiff > 0 ? '+' : ''}{detailParticipant.vsMe.ptsDiff} pts · {detailParticipant.vsMe.picksDiferentes} pick{detailParticipant.vsMe.picksDiferentes !== 1 ? 's' : ''} diferente{detailParticipant.vsMe.picksDiferentes !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {detailParticipant.pendingPicks > 0 && (
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 12 }}>
                    🔒 {detailParticipant.pendingPicks} pronóstico{detailParticipant.pendingPicks !== 1 ? 's' : ''} pendiente{detailParticipant.pendingPicks !== 1 ? 's' : ''} por revelar
                  </div>
                )}

                {detailParticipant.insights?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
                    {detailParticipant.insights.map(({ icon, label, text }) => (
                      <div key={label} style={{ background: 'rgba(52,211,153,0.04)', border: '0.5px solid rgba(52,211,153,0.18)', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 15 }}>{icon}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: .5 }}>{label}</span>
                        </div>
                        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.55 }}>{text}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 10, marginTop: detailParticipant.insights?.length > 0 ? 0 : 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                  Partidos finalizados
                </div>
                {detailParticipant.history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>Aún no hay partidos finalizados.</div>
                ) : (
                  detailParticipant.history.map(group => (
                    <div key={group.key} style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>
                        {formatHistoryLabel(group)}
                      </div>
                      <div style={{ border: '0.5px solid #eee', borderRadius: 10, overflow: 'hidden' }}>
                        {group.matches.map((entry, idx) => (
                          <HistoryMatchRow
                            key={`${entry.phase}-${entry.matchIndex}`}
                            entry={entry}
                            isLast={idx === group.matches.length - 1}
                            pickLabel={detailParticipant.participant?.nombre ? `Pick de ${detailParticipant.participant.nombre.split(' ')[0]}` : 'Pronóstico'}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav groupId={groupId} active="seguimiento" isAdmin={isAdmin} />
    </div>
  )
}
