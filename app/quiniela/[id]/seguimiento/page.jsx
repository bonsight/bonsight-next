'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PHASES, PHASE_ORDER, calcularPuntajes } from '@/lib/quiniela'

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
      setAuth('ok')
    }).catch(() => {
      setAuth('denied'); router.replace(`/quiniela/${groupId}`)
    }).finally(() => setLoading(false))
  }, [groupId, router])

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

  const tabStyle = (active) => ({
    padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
    background: 'none', color: active ? '#0F6E56' : '#888',
    borderBottom: active ? '2px solid #1D9E75' : '2px solid transparent',
    fontWeight: active ? 500 : 400, marginBottom: -1,
  })

  return (
    <div style={st.page}>
      {/* header participante */}
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Avatar name={participant?.nombre ?? '?'} size={44} highlight />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{participant?.nombre}</div>
            <div style={{ fontSize: 12, color: '#888' }}>{group?.nombre}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1D9E75', lineHeight: 1 }}>{myScore?.pts ?? 0}</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {(() => {
                const bd = myScore?.breakdown
                const bonus = bd ? (bd.campeon > 0 ? 5 : 0) + (bd.goleador > 0 ? 3 : 0) : 0
                return bonus > 0 ? `pts (incl. +${bonus} bonus)` : 'puntos'
              })()}
            </div>
          </div>
        </div>

        {/* posición */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E1F5EE', color: '#0F6E56', borderRadius: 99, padding: '4px 12px', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
          {posLabel}
        </div>

        {/* 3 métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{myScore?.breakdown.exacto ?? 0}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Exactos acertados</div>
          </div>
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{myScore?.breakdown.ganador ?? 0}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Ganadores acertados</div>
          </div>
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: pendingSlots > 0 ? '#854F0B' : '#888' }}>{pendingSlots}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Picks por llenar</div>
          </div>
        </div>
      </div>

      {/* ── TABLA ── */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5, fontSize: 11 }}>Tabla de posiciones</div>
      {(
        <div>
          {scores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>
              Aún no hay puntos. Los resultados se calculan desde el panel admin.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid #eee' }}>
                  <th style={{ padding: '6px 8px 6px 0', fontWeight: 500, color: '#aaa', textAlign: 'left', fontSize: 11 }}>#</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, color: '#aaa', textAlign: 'left', fontSize: 11 }}>Participante</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, color: '#aaa', textAlign: 'right', fontSize: 11 }}>Partidos</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, color: '#aaa', textAlign: 'right', fontSize: 11 }}>🏆 Bonus</th>
                  <th style={{ padding: '6px 8px', fontWeight: 500, color: '#aaa', textAlign: 'right', fontSize: 11 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((s, idx) => {
                  const p = participants.find(x => x.id === s.participantId)
                  const isMe = s.participantId === participant?.id
                  const bd = s.breakdown
                  const bonus = (bd.campeon > 0 ? 5 : 0) + (bd.goleador > 0 ? 3 : 0)
                  const matchPts = s.pts - bonus
                  return (
                    <tr key={s.participantId}
                      style={{ borderBottom: '0.5px solid #f0f0f0', background: isMe ? '#E1F5EE' : 'transparent' }}>
                      <td style={{ padding: '10px 8px 10px 0', color: '#888', fontWeight: isMe ? 600 : 400 }}>
                        {MEDALS[idx] ?? idx + 1}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={p?.nombre ?? '?'} size={28} highlight={isMe} />
                          <div>
                            <div style={{ fontWeight: isMe ? 600 : 400 }}>{p?.nombre}{isMe ? ' (tú)' : ''}</div>
                            {p?.pais && <div style={{ fontSize: 11, color: '#aaa' }}>{p.pais}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#555' }}>{matchPts}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                        {bonus > 0
                          ? <span style={{ color: '#BA7517', fontWeight: 600 }}>+{bonus}</span>
                          : <span style={{ color: '#ddd' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 16, fontWeight: 700, color: '#0F6E56' }}>{s.pts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── MIS PICKS ── */}
      <div style={{ marginTop: 28, fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>Mis pronósticos</div>
      {(
        <div>
          {!myQ ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: 13 }}>
              Aún no has llenado picks.
              <br />
              <a href={`/quiniela/${groupId}/picks`} style={{ color: '#1D9E75', marginTop: 8, display: 'inline-block' }}>Llenar picks →</a>
            </div>
          ) : (
            <div>
              {unlockedFases.map(ph => {
                const phasePicks = myQ.phases?.[ph] ?? []
                const hasAny = phasePicks.some(p => p.l !== '' || p.v !== '')
                if (!hasAny) return null
                return (
                  <div key={ph} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56', marginBottom: 10 }}>{PHASES[ph].label}</div>
                    {PHASES[ph].matches.map((m, i) => {
                      const pk = phasePicks[i]
                      if (!pk || (pk.l === '' && pk.v === '')) return null
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '0.5px solid #f5f5f3', fontSize: 13 }}>
                          <span style={{ flex: 1, textAlign: 'right', color: '#555' }}>{m.local}</span>
                          <span style={{ background: '#f5f5f3', padding: '2px 10px', borderRadius: 6, fontWeight: 600, fontSize: 14, minWidth: 52, textAlign: 'center' }}>
                            {pk.l !== '' ? pk.l : '?'} - {pk.v !== '' ? pk.v : '?'}
                          </span>
                          <span style={{ flex: 1, color: '#555' }}>{m.visitante}</span>
                          {pk.w && <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>→ {pk.w}</span>}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {/* Premios Mayores en seguimiento */}
              {(() => {
                const specialResolved = !!(admin?.realCampeon && admin?.realGoleador)
                const campeonCorrecto  = specialResolved && myQ?.campeon  === admin.realCampeon
                const goleadorCorrecto = specialResolved && myQ?.goleador === admin.realGoleador
                const items = [
                  { label: 'Campeón del torneo',  pick: myQ?.campeon,  real: admin?.realCampeon,  correcto: campeonCorrecto,  pts: 5  },
                  { label: 'Goleador del torneo', pick: myQ?.goleador, real: admin?.realGoleador, correcto: goleadorCorrecto, pts: 3 },
                ]
                return (
                  <div style={{ background: specialResolved ? '#fafafa' : 'linear-gradient(145deg,#E8F8F1,#F5FCF8)', border: `1px solid ${specialResolved ? '#e0e0de' : '#1D9E75'}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>🏆 Premios Mayores</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {items.map(({ label, pick, real, correcto, pts }) => (
                        <div key={label} style={{
                          background: specialResolved ? (correcto ? '#E1F5EE' : '#fff3f3') : 'rgba(255,255,255,.6)',
                          border: `0.5px solid ${specialResolved ? (correcto ? '#1D9E75' : '#e0a0a0') : 'rgba(29,158,117,.3)'}`,
                          borderRadius: 8, padding: 12,
                        }}>
                          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                            {specialResolved ? (correcto ? `✅ ${label}` : `❌ ${label}`) : label}
                            {!specialResolved && <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 99, marginLeft: 5 }}>{pts} pts</span>}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600 }}>{pick || <span style={{ color: '#ccc', fontWeight: 400 }}>Sin pronóstico</span>}</div>
                          {specialResolved && !correcto && real && (
                            <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>Real: {real}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      )}

      {/* footer */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>BON<span style={{ color: '#1D9E75' }}>sight</span></div>
        <div style={{ fontSize: 11, color: '#bbb' }}>Mundial 2026</div>
      </div>

      <BottomNav groupId={groupId} active="seguimiento" isAdmin={isAdmin} />
    </div>
  )
}
