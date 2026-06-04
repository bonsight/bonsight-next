import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

function generateGroupId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let raw = ''
  for (let i = 0; i < 6; i++) raw += chars[Math.floor(Math.random() * chars.length)]
  return raw.slice(0, 2) + '-' + raw.slice(2)
}

function generateToken(participantId, email) {
  return createHash('sha256')
    .update(participantId + email + randomBytes(8).toString('hex'))
    .digest('hex')
    .slice(0, 40)
}

export async function GET(req) {
  const { searchParams } = req.nextUrl
  const action   = searchParams.get('action')
  const groupId  = searchParams.get('groupId')
  const token    = searchParams.get('token')
  const email    = searchParams.get('email')

  try {
    if (action === 'groups') {
      const groups = await kv.get('quiniela:groups')
      return NextResponse.json({ groups: groups ?? [] })
    }

    if (action === 'group' && groupId) {
      const group = await kv.get(`quiniela:group:${groupId}`)
      if (!group) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json({ group })
    }

    if (action === 'all' && groupId) {
      const [participants, quinielasRaw, adminRaw, group] = await Promise.all([
        kv.get(`quiniela:${groupId}:participants`),
        kv.get(`quiniela:${groupId}:quinielas`),
        kv.get(`quiniela:${groupId}:admin`),
        kv.get(`quiniela:group:${groupId}`),
      ])
      return NextResponse.json({
        participants: participants ?? [],
        quinielas: quinielasRaw ?? {},
        admin: adminRaw ?? { unlockedPhases: ['grupos'], results: {}, realCampeon: '', realGoleador: '' },
        group: group ?? null,
      })
    }

    // Buscar participante por token
    if (action === 'participante' && token) {
      const tokenData = await kv.get(`quiniela:token:${token}`)
      if (!tokenData) return NextResponse.json({ error: 'token_invalid' }, { status: 401 })
      const { participantId, groupId: gid } = tokenData
      const participants = (await kv.get(`quiniela:${gid}:participants`)) ?? []
      const participant = participants.find(p => p.id === participantId)
      if (!participant) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json({ participant, groupId: gid })
    }

    // Buscar participante por email (re-acceso)
    if (action === 'participanteByEmail' && email && groupId) {
      const [participants, tokensMap] = await Promise.all([
        kv.get(`quiniela:${groupId}:participants`),
        kv.get(`quiniela:${groupId}:tokens`),
      ])
      const participant = (participants ?? []).find(p => p.email.toLowerCase() === email.toLowerCase())
      if (!participant) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      const tok = tokensMap?.[participant.id]
      if (!tok) return NextResponse.json({ error: 'no_token' }, { status: 404 })
      return NextResponse.json({ participant, token: tok })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'KV error', detail: String(e) }, { status: 500 })
  }
}

export async function POST(req) {
  const { action, payload } = await req.json()

  try {
    if (action === 'createGroup') {
      const id = generateGroupId()
      const group = {
        id,
        nombre: payload.nombre,
        adminPin: payload.adminPin,
        adminNombre: payload.adminNombre,
        adminTel: payload.adminTel,
        fases: payload.fases ?? ['grupos', 'ronda32', 'octavos', 'cuartos', 'semis', 'final'],
        createdAt: new Date().toISOString(),
      }
      await Promise.all([
        kv.set(`quiniela:group:${id}`, group),
        kv.set(`quiniela:${id}:admin`, {
          unlockedPhases: ['grupos'],
          results: {},
          realCampeon: '',
          realGoleador: '',
        }),
      ])
      const existing = (await kv.get('quiniela:groups')) ?? []
      await kv.set('quiniela:groups', [
        ...existing,
        { id, nombre: group.nombre, createdAt: group.createdAt },
      ])
      return NextResponse.json({ ok: true, group })
    }

    if (action === 'register') {
      const { groupId, ...participantData } = payload
      if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

      // Verificar duplicado por email
      const existing = (await kv.get(`quiniela:${groupId}:participants`)) ?? []
      const dup = existing.find(p => p.email.toLowerCase() === participantData.email.toLowerCase())
      if (dup) return NextResponse.json({ error: 'email_exists' }, { status: 409 })

      const participant = {
        ...participantData,
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
      }
      const token = generateToken(participant.id, participant.email)

      // Guardar participante, token global y mapa inverso por grupo
      const tokensMap = (await kv.get(`quiniela:${groupId}:tokens`)) ?? {}
      tokensMap[participant.id] = token

      await Promise.all([
        kv.set(`quiniela:${groupId}:participants`, [...existing, participant]),
        kv.set(`quiniela:token:${token}`, { participantId: participant.id, groupId }),
        kv.set(`quiniela:${groupId}:tokens`, tokensMap),
      ])
      return NextResponse.json({ ok: true, participant, token })
    }

    if (action === 'saveQuiniela') {
      const { groupId, ...quinielaData } = payload
      if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })
      const quiniela = { ...quinielaData, updatedAt: new Date().toISOString() }
      const existing = (await kv.get(`quiniela:${groupId}:quinielas`)) ?? {}
      existing[quiniela.participantId] = quiniela
      await kv.set(`quiniela:${groupId}:quinielas`, existing)
      return NextResponse.json({ ok: true })
    }

    if (action === 'saveAdmin') {
      const { groupId, ...adminData } = payload
      if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })
      await kv.set(`quiniela:${groupId}:admin`, adminData)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'KV error', detail: String(e) }, { status: 500 })
  }
}
