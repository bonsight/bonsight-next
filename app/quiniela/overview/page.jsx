'use client'

import { useEffect, useState } from 'react'

const KEY = 'bonsight2026'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OverviewPage() {
  const [authed, setAuthed]   = useState(false)
  const [pin, setPin]         = useState('')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [expanded, setExpanded] = useState(null)

  function login() {
    if (pin === KEY) { setAuthed(true); setPin('') }
    else { setError('PIN incorrecto'); setPin('') }
  }

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetch('/api/quiniela?action=overview')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setError('Error al cargar'))
      .finally(() => setLoading(false))
  }, [authed])

  const s = {
    page: { maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
    card: { border: '0.5px solid #e0e0de', borderRadius: 12, padding: '16px 20px', marginBottom: 12, background: '#fff' },
    badge: (color) => ({ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: color === 'green' ? '#E1F5EE' : color === 'gray' ? '#f1efe8' : '#fdecea', color: color === 'green' ? '#0F6E56' : color === 'gray' ? '#888' : '#c0392b' }),
  }

  if (!authed) return (
    <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔐</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Overview · Bonsight</div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>Solo para uso interno.</div>
        <input
          type="password" placeholder="PIN"
          value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '0.5px solid #ccc', fontSize: 16, textAlign: 'center', letterSpacing: 4, marginBottom: 10, boxSizing: 'border-box' }}
        />
        {error && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 10 }}>{error}</div>}
        <button onClick={login} style={{ width: '100%', background: '#1D9E75', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Entrar
        </button>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '0.5px solid #eee' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>Quiniela Overview</div>
          <div style={{ fontSize: 13, color: '#888' }}>Bonsight · uso interno</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#888' }}>
          {data && <span><strong style={{ color: '#1D9E75' }}>{data.total}</strong> quinielas</span>}
          {data && <span><strong style={{ color: '#1D9E75' }}>{data.quinielas.reduce((a, q) => a + q.participants.length, 0)}</strong> participantes</span>}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>Cargando...</div>}

      {data?.quinielas.map(q => (
        <div key={q.id} style={s.card}>
          {/* Row principal */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, cursor: 'pointer' }} onClick={() => setExpanded(expanded === q.id ? null : q.id)}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{q.nombre}</div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75', letterSpacing: 1, background: '#E1F5EE', padding: '2px 8px', borderRadius: 99 }}>{q.id}</span>
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Crea: <strong>{q.adminNombre}</strong> · {q.adminEmail} · {q.adminTel}
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{fmt(q.createdAt)}</div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1D9E75' }}>{q.participants.length}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>participantes</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: q.kai.confidence ? '#1D9E75' : '#ddd' }}>
                  {q.kai.confidence ? '✓' : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>Kai conf.</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: q.kai.jornada ? '#1D9E75' : '#ddd' }}>
                  {q.kai.jornada ? '✓' : '—'}
                </div>
                <div style={{ fontSize: 11, color: '#aaa' }}>Kai jornada</div>
              </div>
              <div style={{ fontSize: 11, color: '#aaa' }}>{expanded === q.id ? '▲' : '▼'}</div>
            </div>
          </div>

          {/* Expandido */}
          {expanded === q.id && (
            <div style={{ borderTop: '0.5px solid #f0f0f0', marginTop: 14, paddingTop: 14 }}>
              {/* Fases */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Fases activas</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {q.fases.map(f => <span key={f} style={s.badge('green')}>{f}</span>)}
                </div>
              </div>

              {/* Kai */}
              {(q.kai.confidence || q.kai.jornada) && (
                <div style={{ background: 'rgba(52,211,153,0.04)', border: '0.5px solid rgba(52,211,153,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>Kai</div>
                  {q.kai.confidence && <div style={{ fontSize: 13, color: '#555', marginBottom: 3 }}>✓ Confianza generada — {q.kai.confidenceCount} partidos analizados</div>}
                  {q.kai.jornada && (
                    <div style={{ fontSize: 13, color: '#555' }}>
                      ✓ Análisis de jornada — <span style={{ color: '#888', fontStyle: 'italic' }}>"{q.kai.jornadaPreview}..."</span>
                    </div>
                  )}
                </div>
              )}

              {/* Participantes */}
              <div>
                <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 8 }}>Participantes ({q.participants.length})</div>
                {q.participants.length === 0
                  ? <div style={{ fontSize: 13, color: '#aaa' }}>Sin participantes aún.</div>
                  : q.participants.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: i < q.participants.length - 1 ? '0.5px solid #f5f5f3' : 'none' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#E1F5EE', color: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                        {(p.nombre ?? '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{p.nombre}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{p.email} · {p.tel}</div>
                      </div>
                      {p.pais && <span style={s.badge('gray')}>{p.pais}</span>}
                      <div style={{ fontSize: 11, color: '#aaa' }}>{fmt(p.createdAt)}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', fontSize: 12, color: '#ccc', textAlign: 'center' }}>
        Bonsight · Uso interno
      </div>
    </div>
  )
}
