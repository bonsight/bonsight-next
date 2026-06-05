'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TEAMS, FLAGS } from '@/lib/quiniela'

const s = {
  page:   { maxWidth: 480, margin: '0 auto', padding: '2.5rem 1.5rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  input:  { padding: '9px 12px', borderRadius: 8, border: '0.5px solid #ccc', background: 'transparent', color: 'inherit', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  label:  { fontSize: 13, color: '#888', marginBottom: 5, display: 'block' },
  field:  { marginBottom: 14 },
  btn:    { background: '#1D9E75', color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%' },
  btnOff: { background: '#9FE1CB', cursor: 'default' },
  err:    { fontSize: 13, color: '#c0392b', marginBottom: 12 },
}

export default function RegistroPage() {
  const { id: groupId } = useParams()
  const router = useRouter()

  const [group, setGroup]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState('')
  const [mode, setMode]           = useState('registro') // 'registro' | 'reacceso'

  const [form, setForm] = useState({ nombre: '', email: '', tel: '', pais: '' })
  const [reaccesoEmail, setReaccesoEmail] = useState('')

  useEffect(() => {
    const token = localStorage.getItem(`quiniela_token_${groupId}`)
    if (token) { router.replace(`/quiniela/${groupId}/picks`); return }

    fetch(`/api/quiniela?action=group&groupId=${groupId}`)
      .then(r => r.json())
      .then(data => setGroup(data.group ?? null))
      .catch(() => setGroup(null))
      .finally(() => setLoading(false))
  }, [groupId, router])

  async function handleRegister() {
    if (!form.nombre.trim() || !form.email.trim() || !form.tel.trim()) {
      setError('Nombre, email y WhatsApp son obligatorios')
      return
    }
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/quiniela', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', payload: { ...form, groupId } }),
      })
      const data = await res.json()
      if (data.ok && data.token) {
        localStorage.setItem(`quiniela_token_${groupId}`, data.token)
        router.push(`/quiniela/${groupId}/picks`)
      } else if (data.error === 'email_exists') {
        setError('Ese email ya está registrado. Usa "Acceder con email" abajo.')
      } else {
        setError('Error al registrar. Intenta de nuevo.')
      }
    } catch { setError('Error de conexión') }
    finally { setSubmitting(false) }
  }

  async function handleReacceso() {
    if (!reaccesoEmail.trim()) { setError('Ingresa tu email'); return }
    setSubmitting(true); setError('')
    try {
      const res = await fetch(`/api/quiniela?action=participanteByEmail&email=${encodeURIComponent(reaccesoEmail)}&groupId=${groupId}`)
      const data = await res.json()
      if (data.token) {
        localStorage.setItem(`quiniela_token_${groupId}`, data.token)
        router.push(`/quiniela/${groupId}/picks`)
      } else {
        setError('No encontramos un participante con ese email en esta quiniela.')
      }
    } catch { setError('Error de conexión') }
    finally { setSubmitting(false) }
  }

  if (loading) return <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>Cargando...</div>

  if (!group) return (
    <div style={{ ...s.page, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
      <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Quiniela no encontrada</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>El código «{groupId}» no existe.</div>
      <a href="/quiniela" style={{ color: '#1D9E75', fontSize: 13 }}>← Volver al inicio</a>
    </div>
  )

  return (
    <div style={s.page}>
      {/* ── header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 40, height: 40, background: '#1D9E75', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚽</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{group.nombre}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Organiza: {group.adminNombre}</div>
          </div>
          <div style={{ background: '#f5f5f3', border: '0.5px solid #e0e0de', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
            {groupId}
          </div>
        </div>
      </div>

      {/* ── registro form ── */}
      {mode === 'registro' && (
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>⚽ Estás a un paso</div>
            <div style={{ fontSize: 14, color: '#888', lineHeight: 1.5 }}>Completa tus datos para comenzar tus pronósticos.</div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Nombre completo *</label>
            <input style={s.input} placeholder="Ej. Carlos Gómez"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Email * (para volver a acceder)</label>
            <input style={s.input} type="email" placeholder="correo@ejemplo.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>WhatsApp * (con código de país)</label>
            <input style={s.input} type="tel" placeholder="+52 55 1234 5678"
              value={form.tel}
              onChange={e => setForm(p => ({ ...p, tel: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>¿A quién le vas? 🏆</label>
            <select style={s.input} value={form.pais}
              onChange={e => setForm(p => ({ ...p, pais: e.target.value }))}>
              <option value="">— Selecciona tu equipo —</option>
              {TEAMS.map(t => (
                <option key={t} value={t}>{FLAGS[t] ? `${FLAGS[t]} ` : ''}{t}</option>
              ))}
            </select>
          </div>

          {error && <div style={s.err}>{error}</div>}

          <button
            style={{ ...s.btn, ...(submitting ? s.btnOff : {}) }}
            onClick={handleRegister}
            disabled={submitting}
          >
            {submitting ? 'Registrando...' : 'Registrarme y llenar mis picks →'}
          </button>

          <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
            ✓ Podrás modificar tus picks hasta el cierre de cada fase.
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button onClick={() => { setMode('reacceso'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              ¿Ya estás registrado? Acceder con email
            </button>
          </div>
        </div>
      )}

      {/* ── reacceso ── */}
      {mode === 'reacceso' && (
        <div style={{ flex: 1 }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', padding: '10px 0 8px', marginBottom: 16, borderBottom: '0.5px solid #f0f0f0' }}>
            <button onClick={() => { setMode('registro'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Volver
            </button>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Acceder con tu email</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Ingresa el email con el que te registraste.</div>

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input style={s.input} type="email" placeholder="correo@ejemplo.com"
              value={reaccesoEmail}
              onChange={e => setReaccesoEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReacceso()} />
          </div>

          {error && <div style={s.err}>{error}</div>}

          <button style={{ ...s.btn, ...(submitting ? s.btnOff : {}) }} onClick={handleReacceso} disabled={submitting}>
            {submitting ? 'Buscando...' : 'Acceder →'}
          </button>
        </div>
      )}

      {/* footer */}
      <div style={{ marginTop: '2.5rem', paddingTop: '1rem', borderTop: '0.5px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>BON<span style={{ color: '#1D9E75' }}>sight</span></div>
        <div style={{ fontSize: 11, color: '#bbb' }}>Mundial 2026</div>
      </div>
    </div>
  )
}
