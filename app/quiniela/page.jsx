'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PHASE_ORDER, PHASES } from '@/lib/quiniela'

export default function QuinielaLanding() {
  const router = useRouter()
  const [mode, setMode] = useState(null) // 'crear' | 'unir' | 'creado'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeQuinielas, setActiveQuinielas] = useState([])
  const [createdGroup, setCreatedGroup] = useState(null) // { id, nombre, adminPin }
  const [pinVisible, setPinVisible] = useState(false) // [{ groupId, groupName }]

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('quiniela_token_'))
    if (keys.length === 0) return
    const ids = keys.map(k => k.replace('quiniela_token_', ''))
    Promise.all(
      ids.map(id =>
        fetch(`/api/quiniela?action=group&groupId=${id}`)
          .then(r => r.json())
          .then(d => d.group ? { groupId: id, nombre: d.group.nombre } : null)
          .catch(() => null)
      )
    ).then(results => setActiveQuinielas(results.filter(Boolean)))
  }, [])

  const [createForm, setCreateForm] = useState({
    nombre: '',
    adminNombre: '',
    adminTel: '',
    adminPin: '',
    fases: ['grupos', 'ronda32', 'octavos', 'cuartos', 'semis', 'final'],
  })
  const [joinCode, setJoinCode] = useState('')

  function toggleFase(ph) {
    setCreateForm(prev => ({
      ...prev,
      fases: prev.fases.includes(ph)
        ? prev.fases.filter(f => f !== ph)
        : [...prev.fases, ph],
    }))
  }

  function normalizeCode(raw) {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length === 6) return clean.slice(0, 2) + '-' + clean.slice(2)
    return raw.toUpperCase().trim()
  }

  async function handleCreate() {
    const { nombre, adminNombre, adminTel, adminPin, fases } = createForm
    if (!nombre.trim() || !adminNombre.trim() || !adminTel.trim() || !adminPin.trim()) {
      setError('Todos los campos son requeridos')
      return
    }
    if (adminPin.length < 4) { setError('El PIN debe tener al menos 4 caracteres'); return }
    if (fases.length === 0) { setError('Selecciona al menos una fase'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/quiniela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createGroup', payload: createForm }),
      })
      const data = await res.json()
      if (data.ok) {
        setCreatedGroup({ id: data.group.id, nombre: data.group.nombre, adminPin: data.group.adminPin })
        setMode('creado')
      } else {
        setError('Error al crear la quiniela. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    const code = normalizeCode(joinCode)
    if (!code) { setError('Ingresa el código de acceso'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/quiniela?action=group&groupId=${encodeURIComponent(code)}`)
      const data = await res.json()
      if (data.group) {
        router.push(`/quiniela/${code}`)
      } else {
        setError('Código inválido. Verifica e intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    page: {
      maxWidth: 480, margin: '0 auto', padding: '3rem 1.5rem',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
    },
    input: {
      padding: '8px 12px', borderRadius: 8, border: '0.5px solid #ccc',
      background: 'transparent', color: 'inherit', fontSize: 14,
      fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
    },
    label: { fontSize: 13, color: '#888', marginBottom: 5, display: 'block' },
    field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
    btn: {
      background: '#1D9E75', color: '#fff', border: 'none',
      padding: '10px 20px', borderRadius: 8, fontSize: 14,
      fontWeight: 500, cursor: 'pointer', width: '100%',
    },
    btnDisabled: { background: '#9FE1CB', cursor: 'default' },
    card: {
      border: '0.5px solid #e0e0de', borderRadius: 12, padding: 20,
      cursor: 'pointer', transition: 'border-color .15s',
    },
    cardActive: { borderColor: '#1D9E75', background: '#f9fdf9' },
  }

  return (
    <div style={s.page}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
        <div style={{
          width: 44, height: 44, background: '#1D9E75', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>⚽</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Quiniela Mundial 2026</div>
          <div style={{ fontSize: 13, color: '#888' }}>Bonsight · USA, Canadá y México</div>
        </div>
      </div>

      {/* quinielas activas detectadas en localStorage */}
      {activeQuinielas.length > 0 && !mode && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>Tus quinielas activas</div>
          {activeQuinielas.map(({ groupId, nombre }) => (
            <div key={groupId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#E1F5EE', border: '1px solid #1D9E75', borderRadius: 10, padding: '12px 16px', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#0F6E56' }}>{nombre}</div>
                <div style={{ fontSize: 12, color: '#5a8a74', marginTop: 2 }}>Código: <strong style={{ letterSpacing: 1 }}>{groupId}</strong></div>
              </div>
              <a href={`/quiniela/${groupId}/picks`}
                style={{ background: '#1D9E75', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Ir a mis picks →
              </a>
            </div>
          ))}
          <div style={{ height: 1, background: '#eee', margin: '16px 0' }} />
        </div>
      )}

      {/* mode selector */}
      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            {activeQuinielas.length > 0 ? 'Unirme a otra quiniela' : '¿Qué quieres hacer?'}
          </div>
          <div
            style={{ ...s.card }}
            onClick={() => setMode('crear')}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🏆</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Crear quiniela</div>
            <div style={{ fontSize: 13, color: '#888' }}>Organiza una quiniela para tu grupo. Recibirás un código para invitar participantes.</div>
          </div>
          <div
            style={{ ...s.card }}
            onClick={() => setMode('unir')}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🎟️</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Unirme con código</div>
            <div style={{ fontSize: 13, color: '#888' }}>Ingresa el código de acceso que te dio el organizador.</div>
          </div>
        </div>
      )}

      {/* crear form */}
      {mode === 'crear' && (
        <div>
          <button
            onClick={() => { setMode(null); setError('') }}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}
          >
            ← Volver
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>Crear quiniela</div>

          <div style={s.field}>
            <label style={s.label}>Nombre de la quiniela</label>
            <input style={s.input} placeholder="Ej. Quiniela de la Oficina"
              value={createForm.nombre}
              onChange={e => setCreateForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Tu nombre (organizador)</label>
            <input style={s.input} placeholder="Ej. Rafa"
              value={createForm.adminNombre}
              onChange={e => setCreateForm(p => ({ ...p, adminNombre: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Tu WhatsApp (con código de país)</label>
            <input style={s.input} placeholder="Ej. +52 55 1234 5678" type="tel"
              value={createForm.adminTel}
              onChange={e => setCreateForm(p => ({ ...p, adminTel: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>PIN de administrador (mínimo 4 caracteres)</label>
            <input style={s.input} placeholder="PIN para acceder al panel admin" type="password"
              value={createForm.adminPin}
              onChange={e => setCreateForm(p => ({ ...p, adminPin: e.target.value }))} />
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>Fases a incluir</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PHASE_ORDER.map(ph => {
                const active = createForm.fases.includes(ph)
                return (
                  <button key={ph} onClick={() => toggleFase(ph)} style={{
                    padding: '5px 12px', fontSize: 12, borderRadius: 99,
                    border: `0.5px solid ${active ? '#1D9E75' : '#ccc'}`,
                    background: active ? '#E1F5EE' : 'transparent',
                    color: active ? '#0F6E56' : '#888',
                    cursor: 'pointer',
                  }}>
                    {active ? '✓ ' : ''}{PHASES[ph].label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</div>}

          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear quiniela →'}
          </button>
        </div>
      )}

      {/* unir form */}
      {mode === 'unir' && (
        <div>
          <button
            onClick={() => { setMode(null); setError('') }}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}
          >
            ← Volver
          </button>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Unirme a una quiniela</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>Pídele el código de acceso al organizador.</div>

          <div style={s.field}>
            <label style={s.label}>Código de acceso</label>
            <input
              style={{ ...s.input, textTransform: 'uppercase', letterSpacing: 3, fontSize: 18, textAlign: 'center' }}
              placeholder="AB-1234"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={8}
            />
          </div>

          {error && <div style={{ fontSize: 13, color: '#c0392b', marginBottom: 12 }}>{error}</div>}

          <button
            style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
            onClick={handleJoin}
            disabled={loading}
          >
            {loading ? 'Verificando...' : 'Entrar →'}
          </button>
        </div>
      )}

      {/* ── CONFIRMACIÓN POST-CREACIÓN ── */}
      {mode === 'creado' && createdGroup && (
        <div style={{ flex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>¡Quiniela creada!</div>
            <div style={{ fontSize: 13, color: '#888' }}>{createdGroup.nombre}</div>
          </div>

          {/* código de acceso */}
          <div style={{ border: '0.5px solid #e0e0de', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Código para participantes</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, color: '#1D9E75' }}>{createdGroup.id}</div>
              <button
                onClick={() => navigator.clipboard.writeText(createdGroup.id)}
                style={{ background: 'none', border: '0.5px solid #ccc', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#888' }}
              >Copiar</button>
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Comparte este código con los participantes.</div>
          </div>

          {/* PIN */}
          <div style={{ background: '#FAEEDA', border: '0.5px solid #F5C842', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>🔐</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#854F0B' }}>Tu PIN de administrador</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, color: '#854F0B', fontFamily: 'monospace' }}>
                {pinVisible ? createdGroup.adminPin : '•'.repeat(createdGroup.adminPin.length)}
              </div>
              <button
                onClick={() => setPinVisible(v => !v)}
                style={{ background: 'none', border: '0.5px solid #F5C842', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer', color: '#854F0B' }}
              >{pinVisible ? 'Ocultar' : 'Mostrar'}</button>
            </div>
            <div style={{ fontSize: 12, color: '#9a6010' }}>
              Guárdalo — lo necesitarás para acceder al panel de administración.
            </div>
          </div>

          <a
            href={`/quiniela/${createdGroup.id}/admin`}
            style={{ display: 'block', textAlign: 'center', background: '#1D9E75', color: '#fff', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}
          >
            Ir al panel de admin →
          </a>
        </div>
      )}

      {/* footer */}
      {mode !== 'creado' && (
        <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: 12, color: '#bbb' }}>
          Bonsight · Mundial 2026 · USA, Canadá y México
        </div>
      )}
    </div>
  )
}
