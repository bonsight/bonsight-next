'use client'

import { useEffect, useState } from 'react'
import { FLAGS, PHASE_ORDER } from '@/lib/quiniela'
import { KaiLabel } from '@/components/KaiAvatar'

const MEDALS = ['🥇', '🥈', '🥉']
const PHASE_LABEL = { grupos: 'Grupos', ronda32: 'R32', octavos: 'Octavos', cuartos: 'Cuartos', semis: 'Semis', final: 'Final' }


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

function KaiBlock({ tableData }) {
  const [comentario, setComentario] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetch('/api/quiniela-ai?action=getGlobalTopComment')
      .then(r => r.json())
      .then(d => {
        if (d.comentario) {
          setComentario(d.comentario)
        } else if (tableData?.length > 0) {
          setGenerating(true)
          fetch('/api/quiniela-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generateGlobalTopComment', payload: { top: tableData } }),
          })
            .then(r => r.json())
            .then(d2 => { if (d2.comentario) setComentario(d2.comentario) })
            .finally(() => setGenerating(false))
        }
      })
  }, [tableData])

  return (
    <div style={{ background: 'linear-gradient(135deg, #f0faf6 0%, #fff 100%)', border: '0.5px solid #1D9E75', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <KaiLabel
          title="Kai analiza el Top 10"
          subtitle="Cruce de todas las quinielas · Mundial 2026"
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

function TablaView({ tableData, loading }) {
  const [filter, setFilter] = useState('__global__')

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem 0', color: '#aaa' }}>Cargando tabla…</div>
  if (!tableData) return <div style={{ textAlign: 'center', padding: '3rem 0', color: '#c0392b' }}>Error al cargar.</div>

  // Phases with at least 1 point scored
  const activePhases = PHASE_ORDER.filter(ph => tableData.some(e => (e.byPhase?.[ph] ?? 0) > 0))

  // Unique quinielas
  const quinielasMap = {}
  tableData.forEach(e => { quinielasMap[e.quinielaId] = e.quinielaNombre })
  const quinielaList = Object.entries(quinielasMap).map(([id, nombre]) => ({ id, nombre }))

  const filtered = filter === '__global__' ? tableData : tableData.filter(e => e.quinielaId === filter)
  const ranked   = [...filtered].sort((a, b) => b.pts - a.pts || b.exactos - a.exactos)

  const isGlobal = filter === '__global__'
  const cellSty = { padding: '9px 10px', textAlign: 'center', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }
  const headSty = { padding: '7px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: .5, borderBottom: '1.5px solid #eee' }

  return (
    <div>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {[{ id: '__global__', nombre: '🌍 Global' }, ...quinielaList].map(q => (
          <button key={q.id} onClick={() => setFilter(q.id)}
            style={{ padding: '5px 12px', fontSize: 12, borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600,
              background: filter === q.id ? '#1D9E75' : '#f0f0f0',
              color: filter === q.id ? '#fff' : '#555',
            }}>
            {q.nombre}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '0.5px solid #eee' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isGlobal ? 420 + activePhases.length * 70 : 320 + activePhases.length * 70 }}>
          <thead style={{ background: '#fafaf8' }}>
            <tr>
              <th style={{ ...headSty, width: 32 }}>#</th>
              <th style={{ ...headSty, textAlign: 'left', paddingLeft: 12 }}>Nombre</th>
              {isGlobal && <th style={{ ...headSty, textAlign: 'left' }}>Quiniela</th>}
              {activePhases.map(ph => (
                <th key={ph} style={headSty}>{PHASE_LABEL[ph] ?? ph}</th>
              ))}
              <th style={{ ...headSty, color: '#1D9E75' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((entry, i) => {
              const rowBg = i < 3 ? (i === 0 ? '#fffdf0' : '#fafafa') : '#fff'
              return (
                <tr key={`${entry.quinielaId}-${entry.nombre}-${i}`} style={{ background: rowBg }}>
                  <td style={{ ...cellSty, fontWeight: 600, color: '#aaa', fontSize: 12 }}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </td>
                  <td style={{ ...cellSty, textAlign: 'left', paddingLeft: 12, fontWeight: 600, color: '#111', whiteSpace: 'nowrap' }}>
                    {entry.pais ? `${FLAGS[entry.pais] ?? ''} ` : ''}{entry.nombre}
                  </td>
                  {isGlobal && (
                    <td style={{ ...cellSty, textAlign: 'left', fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                      {entry.quinielaNombre}
                    </td>
                  )}
                  {activePhases.map(ph => {
                    const v = entry.byPhase?.[ph] ?? 0
                    return (
                      <td key={ph} style={{ ...cellSty, color: v > 0 ? '#222' : '#ccc', fontWeight: v > 0 ? 600 : 400 }}>
                        {v > 0 ? v : '—'}
                      </td>
                    )
                  })}
                  <td style={{ ...cellSty, fontWeight: 800, fontSize: 16, color: i < 3 ? '#1D9E75' : '#111' }}>
                    {entry.pts}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 11, color: '#ccc' }}>
        Se actualiza cada 5 min
      </div>
    </div>
  )
}

export default function GlobalTopPage() {
  const [lastGroup, setLastGroup]   = useState(null)
  const [tableData, setTableData]   = useState(null)
  const [tableLoading, setTableLoading] = useState(true)

  useEffect(() => {
    setLastGroup(localStorage.getItem('quiniela_last_group'))
    fetch('/api/quiniela?action=globalTable')
      .then(r => r.json())
      .then(d => { if (d.table) setTableData(d.table) })
      .finally(() => setTableLoading(false))
  }, [])

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.2rem 5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <a href="/quiniela" style={{ color: '#1D9E75', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>← Inicio</a>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111' }}>Ranking Global</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888' }}>Todas las quinielas · Mundial 2026</p>
      </div>

      <KaiBlock tableData={tableData} />
      <TablaView tableData={tableData} loading={tableLoading} />

      <BottomNav groupId={lastGroup} />
    </div>
  )
}
