'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { PHASES, PHASE_ORDER, TEAMS, SCORERS } from '@/lib/quiniela'

const GRUPO_LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// Bloqueo de especiales y partidos de jornada 1 = inicio del torneo
const TORNEO_INICIO = new Date('2026-06-12T14:00:00Z')

function getMatchCutoff(phase, globalIndex) {
  if (phase === 'grupos') {
    const withinGroup = globalIndex % 6
    if (withinGroup < 2) return TORNEO_INICIO
    if (withinGroup < 4) return new Date('2026-06-17T13:00:00Z')
    return new Date('2026-06-23T13:00:00Z')
  }
  const c = {
    ronda32: new Date('2026-06-28T13:00:00Z'),
    octavos: new Date('2026-07-04T13:00:00Z'),
    cuartos: new Date('2026-07-09T13:00:00Z'),
    semis:   new Date('2026-07-14T13:00:00Z'),
    final:   new Date('2026-07-19T15:00:00Z'),
  }
  return c[phase] ?? new Date('2099-01-01')
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

// ── Premios Mayores ──────────────────────────────────────────────────────────

function PremiosMayores({ campeon, goleador, setCampeon, setGoleador, admin, countdown }) {
  const now = Date.now()
  const specialLocked = now >= TORNEO_INICIO.getTime()
  const specialResolved = specialLocked && !!(admin?.realCampeon && admin?.realGoleador)

  const campeonCorrecto  = specialResolved && !!campeon  && campeon  === admin.realCampeon
  const goleadorCorrecto = specialResolved && !!goleador && goleador === admin.realGoleador

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: '0.5px solid rgba(15,110,86,.35)',
    background: 'rgba(255,255,255,.7)', color: 'inherit', fontSize: 14,
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  }

  // ── Estado 3: Resuelto ───────────────────────────────────────────────────
  if (specialResolved) {
    const bonusPts = (campeonCorrecto ? 5 : 0) + (goleadorCorrecto ? 3 : 0)
    return (
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, padding: 20, marginBottom: 24, background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>🏆 Premios Mayores</div>
          {bonusPts > 0
            ? <span style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>+{bonusPts} pts obtenidos</span>
            : <span style={{ background: '#f1efe8', color: '#888', fontSize: 12, padding: '4px 12px', borderRadius: 99 }}>0 pts</span>
          }
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Campeón', pick: campeon, correcto: campeonCorrecto, real: admin.realCampeon },
            { label: 'Goleador', pick: goleador, correcto: goleadorCorrecto, real: admin.realGoleador },
          ].map(({ label, pick, correcto, real }) => (
            <div key={label} style={{ background: correcto ? '#E1F5EE' : '#fff3f3', borderRadius: 10, padding: 14, border: `0.5px solid ${correcto ? '#1D9E75' : '#e0a0a0'}` }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                {correcto ? '✅' : '❌'} {label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{pick || 'Sin pronóstico'}</div>
              {!correcto && real && (
                <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Real: {real}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Estado 2: Bloqueado ──────────────────────────────────────────────────
  if (specialLocked) {
    return (
      <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, padding: 20, marginBottom: 24, background: '#f9f9f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>🏆 Premios Mayores</div>
          <span style={{ background: '#e8e6e0', color: '#666', fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 99 }}>🔒 Confirmado</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Campeón del torneo</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{campeon || <span style={{ color: '#ccc', fontWeight: 400, fontStyle: 'italic' }}>Sin pronóstico</span>}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#aaa', marginBottom: 6 }}>Goleador del torneo</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{goleador || <span style={{ color: '#ccc', fontWeight: 400, fontStyle: 'italic' }}>Sin pronóstico</span>}</div>
          </div>
        </div>
      </div>
    )
  }

  // ── Estado 1: Abierto ────────────────────────────────────────────────────
  const cdText = formatCountdown(countdown)
  return (
    <div style={{
      background: 'linear-gradient(145deg, #E8F8F1 0%, #F5FCF8 100%)',
      border: '1.5px solid #1D9E75',
      borderRadius: 14,
      padding: 20,
      marginBottom: 24,
      boxShadow: '0 2px 16px rgba(29,158,117,.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>🏆 Premios Mayores</div>
        {cdText && (
          <span style={{ background: '#fff', border: '0.5px solid #1D9E75', color: '#0F6E56', fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 99 }}>
            ⏳ Cierre en {cdText}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56' }}>Campeón del torneo</span>
            <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>5 pts</span>
          </div>
          <select style={inputStyle} value={campeon} onChange={e => setCampeon(e.target.value)}>
            <option value="">Seleccionar...</option>
            {TEAMS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56' }}>Goleador del torneo</span>
            <span style={{ background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99 }}>3 pts</span>
          </div>
          <select style={inputStyle} value={goleador} onChange={e => setGoleador(e.target.value)}>
            <option value="">Seleccionar...</option>
            {SCORERS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#5a8a74', borderTop: '0.5px solid rgba(29,158,117,.2)', paddingTop: 10 }}>
        Los pronósticos se bloquean automáticamente al iniciar el torneo el 12 de junio.
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

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
  page:    { maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)' },
  input:   { padding: '8px 12px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  scoreIn: { width: 36, height: 32, textAlign: 'center', border: '0.5px solid #ccc', borderRadius: 6, background: 'transparent', fontSize: 14, fontWeight: 500, color: 'inherit' },
  disIn:   { background: '#f5f5f3', color: '#bbb', border: '0.5px solid #eee' },
}

export default function PicksPage() {
  const { id: groupId } = useParams()
  const router = useRouter()

  const [auth, setAuth]           = useState('checking')
  const [participant, setParticipant] = useState(null)
  const [group, setGroup]         = useState(null)
  const [admin, setAdmin]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState('')
  const [isAdmin, setIsAdmin]     = useState(false)

  const [currentPhase, setCurrentPhase] = useState('grupos')
  const [selectedGrupo, setSelectedGrupo] = useState('A')
  const [picks, setPicks] = useState(
    Object.fromEntries(PHASE_ORDER.map(ph => [ph, PHASES[ph].matches.map(() => ({ l: '', v: '', w: '' }))]))
  )
  const [campeon, setCampeon]   = useState('')
  const [goleador, setGoleador] = useState('')

  // Countdown al cierre de especiales = inicio del torneo
  const [countdown, setCountdown] = useState(TORNEO_INICIO - Date.now())

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

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
      setParticipant(pData.participant)
      setGroup(aData.group)
      setAdmin(aData.admin ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' })

      const q = aData.quinielas?.[pData.participant.id]
      if (q) {
        setPicks(prev => {
          const next = { ...prev }
          PHASE_ORDER.forEach(ph => { if (q.phases?.[ph]) next[ph] = q.phases[ph] })
          return next
        })
        setCampeon(q.campeon ?? '')
        setGoleador(q.goleador ?? '')
      }

      const aAdmin = aData.admin ?? { unlockedPhases: ['grupos'] }
      const activeFases = (aData.group?.fases ?? PHASE_ORDER).filter(ph => PHASE_ORDER.includes(ph))
      const lastUnlocked = [...activeFases].reverse().find(ph => aAdmin.unlockedPhases.includes(ph)) ?? 'grupos'
      setCurrentPhase(lastUnlocked)
      setAuth('ok')
    }).catch(() => {
      setAuth('denied'); router.replace(`/quiniela/${groupId}`)
    }).finally(() => setLoading(false))
  }, [groupId, router])

  function updatePick(phase, globalIndex, field, val) {
    setPicks(prev => {
      const next = { ...prev }
      next[phase] = [...next[phase]]
      const updated = { ...next[phase][globalIndex], [field]: val }

      // Auto-derivar ganador cuando cambia el marcador
      if ((field === 'l' || field === 'v') && updated.l !== '' && updated.v !== '') {
        const lN = Number(updated.l)
        const vN = Number(updated.v)
        const match = PHASES[phase].matches[globalIndex]
        if (!isNaN(lN) && !isNaN(vN) && match) {
          if (lN > vN) updated.w = match.local
          else if (lN < vN) updated.w = match.visitante
          else updated.w = 'Empate'
        }
      }

      next[phase][globalIndex] = updated
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/quiniela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveQuiniela',
          payload: { participantId: participant.id, phases: picks, campeon, goleador, groupId },
        }),
      })
      if ((await res.json()).ok) showToast('✓ Picks guardados')
      else showToast('Error al guardar')
    } catch { showToast('Error de conexión') }
    finally { setSaving(false) }
  }

  if (auth === 'checking' || loading) return (
    <div style={{ ...st.page, textAlign: 'center', paddingTop: '4rem', color: '#aaa' }}>Cargando...</div>
  )
  if (auth === 'denied') return null

  const activeFases = (group?.fases ?? PHASE_ORDER).filter(ph => PHASE_ORDER.includes(ph))
  const now = Date.now()

  const visibleMatches = currentPhase === 'grupos'
    ? (() => {
        const gi = GRUPO_LETTERS.indexOf(selectedGrupo)
        return PHASES.grupos.matches.slice(gi * 6, gi * 6 + 6).map((m, i) => ({
          ...m, globalIndex: gi * 6 + i,
        }))
      })()
    : PHASES[currentPhase].matches.map((m, i) => ({ ...m, globalIndex: i }))

  const phaseTab = (ph) => {
    const unlocked = admin?.unlockedPhases.includes(ph)
    const active = currentPhase === ph
    return {
      padding: '5px 13px', fontSize: 12, borderRadius: 99,
      border: '0.5px solid #ccc', cursor: unlocked ? 'pointer' : 'not-allowed',
      background: active ? '#1D9E75' : 'transparent',
      color: active ? '#fff' : unlocked ? 'inherit' : '#bbb',
      opacity: unlocked ? 1 : .5,
    }
  }

  // Countdown display para el header pill
  const cdHeader = formatCountdown(countdown)
  const headerPill = now >= TORNEO_INICIO.getTime()
    ? 'Torneo en curso ⚽'
    : cdHeader ? `🕐 ${cdHeader} para el primer partido` : ''

  return (
    <div style={st.page}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div style={{ width: 38, height: 38, background: '#1D9E75', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚽</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{participant?.nombre}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{group?.nombre}</div>
        </div>
        {headerPill && (
          <div style={{ background: '#E1F5EE', color: '#0F6E56', fontSize: 12, padding: '4px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
            {headerPill}
          </div>
        )}
      </div>

      {/* ── Premios Mayores ── */}
      <PremiosMayores
        campeon={campeon} goleador={goleador}
        setCampeon={setCampeon} setGoleador={setGoleador}
        admin={admin} countdown={countdown}
      />

      {/* scoring bar (solo partidos) */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f5f5f3', borderRadius: 8, padding: '9px 14px', marginBottom: 16, fontSize: 12 }}>
        {[['3 pts','Resultado exacto'],['1 pt','Ganador correcto']].map(([pts, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 11, padding: '1px 7px', borderRadius: 99 }}>{pts}</span>
            {label}
          </span>
        ))}
      </div>

      {/* phase tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {activeFases.map(ph => (
          <button key={ph} style={phaseTab(ph)}
            onClick={() => { if (admin?.unlockedPhases.includes(ph)) setCurrentPhase(ph) }}>
            {PHASES[ph].label}{!admin?.unlockedPhases.includes(ph) ? ' 🔒' : ''}
          </button>
        ))}
      </div>

      {/* sub-nav grupos A–L */}
      {currentPhase === 'grupos' && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
          {GRUPO_LETTERS.map(g => (
            <button key={g} onClick={() => setSelectedGrupo(g)} style={{
              width: 30, height: 30, borderRadius: 6, border: '0.5px solid #ccc', fontSize: 12,
              background: selectedGrupo === g ? '#1D9E75' : 'transparent',
              color: selectedGrupo === g ? '#fff' : 'inherit', cursor: 'pointer',
            }}>{g}</button>
          ))}
        </div>
      )}

      {/* partidos */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr 80px 76px', gap: 6, fontSize: 11, color: '#aaa', paddingBottom: 6, borderBottom: '0.5px solid #eee', textAlign: 'center' }}>
          <div>Local</div><div></div><div>Visitante</div><div>Marcador</div><div>Resultado</div>
        </div>

        {visibleMatches.map(({ local, visitante, globalIndex }) => {
          const cutoff = getMatchCutoff(currentPhase, globalIndex)
          const locked = now >= cutoff.getTime()
          const pick = picks[currentPhase][globalIndex] ?? { l: '', v: '', w: '' }
          const inSty = { ...st.scoreIn, ...(locked ? st.disIn : {}) }
          const selSty = { ...inSty, width: 76, fontSize: 11 }

          return (
            <div key={globalIndex}>
              {locked && (
                <div style={{ fontSize: 11, color: '#bbb', padding: '4px 0 2px', textAlign: 'center', background: '#fafafa' }}>
                  🔒 picks bloqueados — partido ya comenzó
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr 80px 76px', gap: 6, alignItems: 'center', padding: '8px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                <div style={{ fontSize: 13, textAlign: 'center' }}>{local}</div>
                <div style={{ fontSize: 11, textAlign: 'center', opacity: .4 }}>vs</div>
                <div style={{ fontSize: 13, textAlign: 'center' }}>{visitante}</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', justifyContent: 'center' }}>
                  <input style={inSty} type="number" min={0} max={20} disabled={locked}
                    value={pick.l} onChange={e => !locked && updatePick(currentPhase, globalIndex, 'l', e.target.value)} />
                  <span style={{ opacity: .35, fontSize: 12 }}>-</span>
                  <input style={inSty} type="number" min={0} max={20} disabled={locked}
                    value={pick.v} onChange={e => !locked && updatePick(currentPhase, globalIndex, 'v', e.target.value)} />
                </div>
                <div style={{
                  width: 76, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 500, borderRadius: 6, textAlign: 'center', padding: '0 4px',
                  background: pick.w ? '#E1F5EE' : '#f5f5f3',
                  color: pick.w ? '#0F6E56' : '#ccc',
                  border: `0.5px solid ${pick.w ? '#1D9E75' : '#eee'}`,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {pick.w || '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* guardar */}
      <button
        onClick={handleSave} disabled={saving}
        style={{ background: saving ? '#9FE1CB' : '#1D9E75', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? 'default' : 'pointer', width: '100%' }}
      >
        {saving ? 'Guardando...' : '💾 Guardar mis picks'}
      </button>

      {/* footer */}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>BON<span style={{ color: '#1D9E75' }}>sight</span></div>
        <div style={{ fontSize: 11, color: '#bbb' }}>Mundial 2026</div>
      </div>

      <BottomNav groupId={groupId} active="picks" isAdmin={isAdmin} />

      {toast && (
        <div style={{ position: 'fixed', bottom: 60, left: '50%', transform: 'translateX(-50%)', background: '#1D9E75', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 13, zIndex: 999, pointerEvents: 'none', whiteSpace: 'nowrap' }}>{toast}</div>
      )}
    </div>
  )
}
