'use client'

import { useEffect, useState } from 'react'
import { FLAGS } from '@/lib/quiniela'
import { KaiLabel } from '@/components/KaiAvatar'

const MEDALS = ['🥇', '🥈', '🥉']

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function Avatar({ name, size = 38, rank }) {
  const bg = rank === 0 ? '#C9A227' : rank === 1 ? '#9BA3A8' : rank === 2 ? '#A0522D' : '#E1F5EE'
  const color = rank <= 2 ? '#fff' : '#0F6E56'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.33), fontWeight: 600,
    }}>{initials(name)}</div>
  )
}

function BottomNav({ groupId }) {
  const item = (href, label, active) => (
    <a href={href} style={{
      flex: 1, padding: '10px 0 12px', textAlign: 'center', textDecoration: 'none',
      fontSize: 12, fontWeight: active ? 600 : 400,
      color: active ? '#1D9E75' : '#aaa',
      borderTop: `2px solid ${active ? '#1D9E75' : 'transparent'}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    }}>{label}</a>
  )
  const base = groupId ? `/quiniela/${groupId}` : '/quiniela'
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ display: 'flex', width: '100%', maxWidth: 720 }}>
        {item(`${base}/picks`,       '📋 Mis picks',   false)}
        {item(`${base}/seguimiento`, '📊 Seguimiento', false)}
        {item('/quiniela/top',       '🏆 Global',      true)}
      </div>
    </div>
  )
}

function KaiBlock({ top }) {
  const [comentario, setComentario] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/quiniela-ai?action=getGlobalTopComment')
      .then(r => r.json())
      .then(d => {
        if (d.comentario) {
          setComentario(d.comentario)
        } else {
          setGenerating(true)
          fetch('/api/quiniela-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generateGlobalTopComment', payload: {} }),
          })
            .then(r => r.json())
            .then(d2 => { if (d2.comentario) setComentario(d2.comentario) })
            .finally(() => setGenerating(false))
        }
      })
  }, [])

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0faf6 0%, #fff 100%)', border: '0.5px solid #1D9E75', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <KaiLabel
          title="Kai analiza el Top 10"
          subtitle="Cruce de todas las quinielas · Fase de grupos"
          state={generating ? 'thinking' : 'ready'}
          size={20}
        />
      </div>

      {generating && !comentario && (
        <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Kai está analizando el ranking…</div>
      )}

      {comentario && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {comentario.map((c, i) => (
            <div key={i} style={{ background: 'rgba(52,211,153,0.04)', border: '0.5px solid rgba(52,211,153,0.18)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{c.titular}</div>
              <div style={{ fontSize: 14, color: '#333', lineHeight: 1.55 }}>{c.descripcion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function GlobalTopPage() {
  const [top, setTop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastGroup, setLastGroup] = useState(null)

  useEffect(() => {
    setLastGroup(localStorage.getItem('quiniela_last_group'))
    fetch('/api/quiniela?action=globalTop')
      .then(r => r.json())
      .then(d => {
        if (d.top) setTop(d.top)
        else setError('No se pudo cargar el ranking.')
      })
      .catch(() => setError('Error de conexión.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.2rem 5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/quiniela" style={{ color: '#1D9E75', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Inicio</a>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111' }}>Top 10 Global</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>Fase de grupos · Todas las quinielas</p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>Cargando ranking…</div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#c0392b' }}>{error}</div>
      )}

      {top && top.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>Aún no hay datos suficientes.</div>
      )}

      {top && top.length > 0 && (
        <>
          <KaiBlock top={top} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {top.map((entry, i) => (
              <div key={`${entry.quinielaId}-${entry.nombre}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: i < 3 ? '#f0fdf8' : '#fff',
                border: `1.5px solid ${i < 3 ? '#1D9E75' : '#eee'}`,
                borderRadius: 12,
                padding: '12px 16px',
                boxShadow: i === 0 ? '0 2px 8px rgba(29,158,117,0.13)' : 'none',
              }}>
                <div style={{ width: 28, textAlign: 'center', fontSize: i < 3 ? 22 : 15, fontWeight: 600, color: '#888', flexShrink: 0 }}>
                  {i < 3 ? MEDALS[i] : `${i + 1}`}
                </div>

                <Avatar name={entry.nombre} rank={i} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.pais ? `${FLAGS[entry.pais] ?? ''} ` : ''}{entry.nombre}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.quinielaNombre}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: i < 3 ? '#1D9E75' : '#333' }}>{entry.pts}</div>
                  <div style={{ fontSize: 11, color: '#aaa', display: 'flex', gap: 6 }}>
                    <span title="Exactos">✅ {entry.exactos}</span>
                    <span title="Ganadores">🎯 {entry.ganadores}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 12, color: '#ccc' }}>
            Puntuación final de la fase de grupos · Se actualiza cada 10 min
          </div>
        </>
      )}

      <BottomNav groupId={lastGroup} />
    </div>
  )
}
