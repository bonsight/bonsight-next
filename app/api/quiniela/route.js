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

    if (action === 'stats') {
      const [quinielas, participants] = await Promise.all([
        kv.get('quiniela:stats:quinielas'),
        kv.get('quiniela:stats:participants'),
      ])
      return NextResponse.json({
        quinielas: quinielas ?? 0,
        participants: participants ?? 0,
      })
    }

    if (action === 'overview') {
      const [groups, globalConfidence] = await Promise.all([
        kv.get('quiniela:groups'),
        kv.get('quiniela:global:confidence:grupos'),
      ])
      const groupList = groups ?? []
      const globalConfidenceGenerated = Array.isArray(globalConfidence) && globalConfidence.length > 0

      const data = await Promise.all(
        groupList.map(async ({ id }) => {
          const [group, participants, jornada, quinielas] = await Promise.all([
            kv.get(`quiniela:group:${id}`),
            kv.get(`quiniela:${id}:participants`),
            kv.get(`quiniela:${id}:ai:jornada:grupos`),
            kv.get(`quiniela:${id}:quinielas`),
          ])
          return {
            id,
            nombre: group?.nombre ?? '—',
            adminNombre: group?.adminNombre ?? '—',
            adminTel: group?.adminTel ?? '—',
            createdAt: group?.createdAt ?? null,
            fases: group?.fases ?? [],
            participants: (participants ?? []).map(p => ({
              nombre: p.nombre, email: p.email, tel: p.tel, pais: p.pais, createdAt: p.createdAt,
            })),
            picksCount: Object.keys(quinielas ?? {}).length,
            kai: {
              confidence: globalConfidenceGenerated,
              jornada: !!jornada,
              jornadaPreview: typeof jornada === 'string' ? jornada.slice(0, 100) : null,
            },
          }
        })
      )
      return NextResponse.json({ quinielas: data, total: data.length, globalConfidenceGenerated })
    }

    if (action === 'group' && groupId) {
      const group = await kv.get(`quiniela:group:${groupId}`)
      if (!group) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json({ group })
    }

    if (action === 'globalAdmin') {
      const admin = (await kv.get('quiniela:global:admin')) ?? { results: {}, realCampeon: '', realGoleador: '' }
      return NextResponse.json({ admin })
    }

    if (action === 'all' && groupId) {
      const [participants, quinielasRaw, adminRaw, group, globalAdmin] = await Promise.all([
        kv.get(`quiniela:${groupId}:participants`),
        kv.get(`quiniela:${groupId}:quinielas`),
        kv.get(`quiniela:${groupId}:admin`),
        kv.get(`quiniela:group:${groupId}`),
        kv.get('quiniela:global:admin'),
      ])
      const perAdmin = adminRaw ?? {}
      const mergedAdmin = {
        unlockedPhases: perAdmin.unlockedPhases ?? ['grupos'],
        results: globalAdmin?.results ?? perAdmin.results ?? {},
        realCampeon: globalAdmin?.realCampeon ?? perAdmin.realCampeon ?? '',
        realGoleador: globalAdmin?.realGoleador ?? perAdmin.realGoleador ?? '',
      }
      return NextResponse.json({
        participants: participants ?? [],
        quinielas: quinielasRaw ?? {},
        admin: mergedAdmin,
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
        adminNombre: payload.adminNombre,
        adminEmail: payload.adminEmail,
        adminTel: payload.adminTel,
        fases: payload.fases ?? ['grupos', 'ronda32', 'octavos', 'cuartos', 'semis', 'final'],
        createdAt: new Date().toISOString(),
      }
      await Promise.all([
        kv.set(`quiniela:group:${id}`, group),
        kv.incr('quiniela:stats:quinielas'),
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
        kv.incr('quiniela:stats:participants'),
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

    if (action === 'saveGlobalResults') {
      const { results, realCampeon, realGoleador } = payload
      await kv.set('quiniela:global:admin', { results, realCampeon, realGoleador })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'KV error', detail: String(e) }, { status: 500 })
  }
}
