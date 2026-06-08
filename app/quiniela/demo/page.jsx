'use client'

import { useEffect, useState } from 'react'
import { PHASES, PHASE_ORDER, calcularPuntajes, FLAGS } from '@/lib/quiniela'
import { KaiAvatar, KaiLabel } from '@/components/KaiAvatar'

const DEMO_ID = 'P2-JAY3'

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣']
const PERSONA_DESC = {
  '🤖 Kai':           'Sigue datos y tendencias',
  '📊 Lumen':         'Racional, alineado al consenso',
  '🧭 Kairo':         'Conservador, apuesta al favorito',
  '⚽ El Hincha':     'Juega con el corazón',
  '🎯 El Arriesgado': 'Busca sorpresas y upsets',
  '🏆 El Campeón':    'Equilibrado y competitivo',
}

function f(team) { return FLAGS[team] ? `${FLAGS[team]} ` : '' }

function initials(name) {
  return (name ?? '?').replace(/[🤖📊🧭⚽🎯🏆]/gu, '').trim().split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase() || '?'
}

function Avatar({ name, size = 36, highlight }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: highlight ? '#1D9E75' : '#E1F5EE', color: highlight ? '#fff' : '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.34), fontWeight: 600 }}>
      {initials(name)}
    </div>
  )
}

export default function DemoPage() {
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [scores, setScores] = useState([])
  const [participants, setParticipants] = useState([])
  const [quinielas, setQuinielas] = useState({})
  const [admin, setAdmin] = useState(null)
  const [jornadaSummary, setJornadaSummary] = useState(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/quiniela?action=all&groupId=${DEMO_ID}`).then(r => r.json()),
      fetch(`/api/quiniela-ai?action=getJornada&groupId=${DEMO_ID}&phase=grupos`).then(r => r.json()).catch(() => ({})),
    ]).then(([d, ai]) => {
      if (!d.group) return
      setGroup(d.group)
      setParticipants(d.participants ?? [])
      setQuinielas(d.quinielas ?? {})
      setAdmin(d.admin)
      const s = calcularPuntajes(d.participants ?? [], d.quinielas ?? {}, d.admin)
      setScores([...s].sort((a, b) => b.pts - a.pts))
      if (ai?.summary) setJornadaSummary(ai.summary)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center', color: '#aaa', fontFamily: 'var(--font-sans, system-ui)' }}>
      Cargando demo...
    </div>
  )

  if (!group) return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center', fontFamily: 'var(--font-sans, system-ui)' }}>
      <div style={{ fontSize: 14, color: '#aaa' }}>Demo no disponible.</div>
      <a href="/quiniela" style={{ color: '#1D9E75', fontSize: 13, marginTop: 12, display: 'block' }}>← Volver</a>
    </div>
  )

  const currentPhase = admin?.unlockedPhases?.[admin.unlockedPhases.length - 1] ?? 'grupos'
  const phaseMatches = PHASES[currentPhase]?.matches ?? []

  // Consenso por partido (primeros 3 del grupo A para la vista preview)
  function getConsensus(matchIdx) {
    const m = phaseMatches[matchIdx]
    if (!m) return null
    const votes = {}
    let total = 0
    Object.values(quinielas).forEach(q => {
      const w = q.phases?.[currentPhase]?.[matchIdx]?.w
      if (w) { votes[w] = (votes[w] ?? 0) + 1; total++ }
    })
    if (total < 1) return null
    const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1])
    return { match: m, votes, total, leader: sorted[0][0], leaderPct: Math.round(sorted[0][1] / total * 100) }
  }

  const previewMatches = [0, 1, 2].map(i => getConsensus(i)).filter(Boolean)
  const topScore = scores[0]
  const topParticipant = participants.find(p => p.id === topScore?.participantId)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh', paddingBottom: '2rem' }}>

      {/* ── Header ── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #0a1f12 0%, #0f3520 45%, #1a5c3a 100%)', padding: '1.5rem 1.5rem 1.75rem', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <a href="/quiniela" style={{ textDecoration: 'none', fontSize: 11, fontWeight: 800, letterSpacing: 2, color: 'rgba(52,211,153,0.8)', textTransform: 'uppercase' }}>
            ← BONSIGHT
          </a>
          <span style={{ fontSize: 10, background: 'rgba(52,211,153,0.15)', border: '0.5px solid rgba(52,211,153,0.3)', color: '#34D399', padding: '3px 10px', borderRadius: 99, fontWeight: 700, letterSpacing: .5, textTransform: 'uppercase' }}>
            Demo
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
          🏆 {group.nombre}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, maxWidth: 340 }}>
          Una quiniela real con personajes ficticios. Así se ve la experiencia completa con Kai.
        </div>
      </div>

      <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Leaderboard ── */}
        <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ background: '#fff', padding: '14px 16px 10px', borderBottom: '0.5px solid #f0f0f0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5 }}>
              Tabla de posiciones · {PHASES[currentPhase]?.label}
            </div>
          </div>
          {scores.map((s, idx) => {
            const p = participants.find(x => x.id === s.participantId)
            if (!p) return null
            const isKai = p.nombre.includes('Kai')
            const desc = PERSONA_DESC[p.nombre.trim()]
            return (
              <div key={s.participantId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: idx < scores.length - 1 ? '0.5px solid #f5f5f3' : 'none', background: isKai ? 'rgba(29,158,117,0.04)' : '#fff' }}>
                <div style={{ fontSize: idx < 3 ? 18 : 13, width: 28, textAlign: 'center', flexShrink: 0, color: '#888' }}>
                  {MEDALS[idx]}
                </div>
                <Avatar name={p.nombre} size={36} highlight={isKai} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: isKai ? 700 : 500, color: isKai ? '#0F6E56' : '#222' }}>{p.nombre}</span>
                    {isKai && <span style={{ fontSize: 9, background: '#1D9E75', color: '#fff', padding: '1px 6px', borderRadius: 99, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .3 }}>IA</span>}
                  </div>
                  {desc && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{desc}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isKai ? '#0F6E56' : '#333', lineHeight: 1 }}>{s.pts}</div>
                  <div style={{ fontSize: 10, color: '#aaa' }}>pts</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Kai lidera banner ── */}
        {topParticipant?.nombre?.includes('Kai') && (
          <div style={{ background: '#0c0f14', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <KaiAvatar size={36} state="ready" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#34D399', marginBottom: 2 }}>Kai lidera la quiniela</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                Sus picks siguen datos y tendencias del Mundial 2026 — no el corazón.
              </div>
            </div>
          </div>
        )}

        {/* ── Análisis Kai ── */}
        {jornadaSummary && (
          <div>
            <KaiLabel title="Análisis de Kai · Fase de Grupos" subtitle="Generado automáticamente al cerrar la jornada" state="ready" size={18} />
            <div style={{ marginTop: 10, background: '#f9f9f7', borderRadius: 10, padding: '12px 14px', borderLeft: '3px solid #1D9E75', fontSize: 13, color: '#333', lineHeight: 1.7 }}>
              {jornadaSummary}
            </div>
          </div>
        )}

        {/* ── Consenso preview ── */}
        {previewMatches.length > 0 && (
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ background: '#fff', padding: '14px 16px 10px', borderBottom: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KaiAvatar size={14} state="ready" />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: .5 }}>
                Consenso · Grupo A
              </div>
            </div>
            {previewMatches.map((cs, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < previewMatches.length - 1 ? '0.5px solid #f5f5f3' : 'none', background: '#fff' }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  {f(cs.match.local)}{cs.match.local} <span style={{ color: '#ccc', fontWeight: 300 }}>vs</span> {f(cs.match.visitante)}{cs.match.visitante}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(cs.votes).sort((a, b) => b[1] - a[1]).map(([winner, count]) => {
                    const pct = Math.round(count / cs.total * 100)
                    const isLeader = winner === cs.leader
                    return (
                      <span key={winner} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, background: isLeader ? '#E1F5EE' : '#f5f5f3', color: isLeader ? '#0F6E56' : '#888', fontWeight: isLeader ? 600 : 400 }}>
                        {winner === 'Empate' ? 'Empate' : (f(winner) + winner.split(' ')[0])} {pct}%
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ¿Qué hace Kai? ── */}
        <div style={{ background: '#0c0f14', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <KaiAvatar size={28} state="thinking" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#34D399', letterSpacing: .5, textTransform: 'uppercase' }}>¿Qué hace Kai?</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Motor de análisis de Bonsight</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['🔍', 'Analiza partidos y tendencias del torneo'],
              ['⚡', 'Detecta posibles sorpresas y resultados difíciles'],
              ['👥', 'Calcula consensos entre todos los participantes'],
              ['📝', 'Genera el análisis narrativo de cada jornada'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background: 'linear-gradient(135deg, #E1F5EE 0%, #f0fdf6 100%)', border: '1.5px solid #1D9E75', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F6E56', marginBottom: 6 }}>¿Listo para crear la tuya?</div>
          <div style={{ fontSize: 13, color: '#5a8a74', marginBottom: 16, lineHeight: 1.55 }}>
            Invita a tus amigos, llena tus picks y deja que Kai analice cada jornada.
          </div>
          <a href="/quiniela?accion=crear" style={{ display: 'block', background: '#1D9E75', color: '#fff', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
            🏆 Crear mi quiniela →
          </a>
          <a href="/quiniela" style={{ display: 'block', color: '#888', fontSize: 12, textDecoration: 'none' }}>
            ← Volver al inicio
          </a>
        </div>

      </div>
    </div>
  )
}
