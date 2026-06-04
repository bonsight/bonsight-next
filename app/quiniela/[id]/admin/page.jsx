'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { PHASES, PHASE_ORDER, calcularPuntajes } from '@/lib/quiniela'

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
      })
      .catch(() => setGroupError(true))
      .finally(() => setLoading(false))
  }, [groupId])

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

      {/* ── 4 métricas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Participantes</div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>{participants.length}</div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Llenaron picks</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#1D9E75' }}>{withPicks.length}</div>
          <div style={{ marginTop: 10, height: 4, background: '#eee', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${pickPct}%`, height: '100%', background: '#1D9E75', borderRadius: 99, transition: 'width .4s' }} />
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Fase actual</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{PHASES[currentPhase]?.label}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>
            {admin?.unlockedPhases.length} de {activePhaseOrder.length} fases activas
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Código de acceso</div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, color: '#1D9E75', marginBottom: 8 }}>{groupId}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(groupId); showToast('✓ Código copiado') }}
            style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888' }}
          >Copiar</button>
        </div>
      </div>

      {/* ── alerta picks pendientes ── */}
      {pending.length > 0 && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #F5C842', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>⚠️</span>
          <div style={{ flex: 1, fontSize: 13, color: '#854F0B' }}>
            <strong>{pending.length}</strong> participante{pending.length > 1 ? 's' : ''} aún no {pending.length > 1 ? 'llenaron' : 'llenó'} sus picks para <strong>{PHASES[currentPhase]?.label}</strong>.
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hola! Recuerda llenar tus picks para la quiniela "${group?.nombre}" 🏆 Código: ${groupId}`)}`}
            target="_blank" rel="noopener"
            style={{ padding: '6px 14px', background: '#25D366', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >💬 Avisar a todos</a>
        </div>
      )}

      {/* ── dos columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* tabla de posiciones */}
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 14 }}>
            Tabla de posiciones
          </div>
          {sortedScores.length === 0 ? (
            <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '1.5rem 0' }}>
              Sin puntos aún.<br />
              <a href={`/quiniela/${groupId}`} style={{ color: '#1D9E75', fontSize: 12 }}>Ingresar resultados →</a>
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
              {sortedScores.length > 5 && (
                <a href={`/quiniela/${groupId}`} style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#888', marginTop: 12, textDecoration: 'none' }}>
                  Ver tabla completa →
                </a>
              )}
            </>
          )}
        </div>

        {/* columna derecha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

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
                      <a
                        href={`https://wa.me/${p.tel.replace(/\D/g, '')}?text=${waMsg(p.nombre)}`}
                        target="_blank" rel="noopener"
                        style={{ width: 32, height: 32, background: '#25D366', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 15, flexShrink: 0 }}
                        title={`Avisar a ${p.nombre}`}
                      >💬</a>
                    ) : (
                      <div style={{ width: 32, height: 32, background: '#f5f5f3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, opacity: .35, flexShrink: 0 }} title="Sin teléfono registrado">💬</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* fases + desbloquear */}
          <div style={card}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', letterSpacing: .5, textTransform: 'uppercase', marginBottom: 14 }}>
              Tu quiniela
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Código de acceso participantes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#1D9E75' }}>{groupId}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(groupId); showToast('✓ Código copiado') }}
                style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888' }}
              >Copiar</button>
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Tu PIN de admin</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, background: '#f9f9f7', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: 3, fontFamily: 'monospace', color: '#555', flex: 1 }}>
                {pinVisible ? group?.adminPin : '•'.repeat(group?.adminPin?.length ?? 6)}
              </div>
              <button
                onClick={() => setPinVisible(v => !v)}
                style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888' }}
              >{pinVisible ? 'Ocultar' : 'Mostrar'}</button>
            </div>

            <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Fases</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activePhaseOrder.map(ph => {
                const unlocked = admin?.unlockedPhases.includes(ph)
                const isGrupos = ph === 'grupos'
                return (
                  <div key={ph} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: unlocked ? '#E1F5EE' : '#f5f5f3', border: `0.5px solid ${unlocked ? '#1D9E75' : '#e0e0de'}` }}>
                    <span style={{ fontSize: 13, color: unlocked ? '#0F6E56' : '#aaa', fontWeight: unlocked ? 500 : 400 }}>
                      {unlocked ? '✓' : '🔒'} {PHASES[ph].label}
                    </span>
                    {isGrupos ? (
                      <span style={{ fontSize: 11, color: '#aaa' }}>Siempre activa</span>
                    ) : (
                      <button
                        onClick={() => unlocked ? lockLastPhase(ph) : unlockNextPhase(ph)}
                        style={{
                          padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none',
                          background: unlocked ? 'rgba(15,110,86,.12)' : '#1D9E75',
                          color: unlocked ? '#0F6E56' : '#fff',
                          fontWeight: 500,
                        }}
                      >
                        {unlocked ? '🔒 Bloquear' : '🔓 Desbloquear'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
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
