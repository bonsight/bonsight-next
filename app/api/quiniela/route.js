import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { PHASES, PHASE_ORDER, isMatchFinal, evaluatePick, buildHistory, calcularPuntajes } from '@/lib/quiniela'

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
  const participantId = searchParams.get('participantId')

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
      const phasesWithMatches = PHASE_ORDER.filter(ph => (PHASES[ph]?.matches?.length ?? 0) > 0)
      const [groups, globalAdmin, ...confResults] = await Promise.all([
        kv.get('quiniela:groups'),
        kv.get('quiniela:global:admin'),
        ...phasesWithMatches.map(ph => kv.get(`quiniela:global:confidence:${ph}`)),
      ])
      const groupList = groups ?? []
      const confidenceByPhase = Object.fromEntries(
        phasesWithMatches.map((ph, i) => [ph, Array.isArray(confResults[i]) && confResults[i].length > 0])
      )
      const nowMsForPhase = Date.now()
      const activePhase = [...phasesWithMatches].reverse().find(ph =>
        PHASES[ph].matches.some(m => m.kickoff && new Date(m.kickoff).getTime() <= nowMsForPhase)
      ) ?? 'grupos'
      const globalConfidenceGenerated = confidenceByPhase[activePhase] ?? false
      const admin = { results: {}, realCampeon: '', realGoleador: '', ...(globalAdmin ?? {}) }

      // Count matches that have elapsed but have no confirmed result (all phases)
      const nowMs = Date.now()
      const MATCH_DURATION_MS = 2 * 60 * 60 * 1000
      const pendingMatchesCount = PHASE_ORDER.reduce((acc, ph) => {
        return acc + PHASES[ph].matches.filter((m, i) => {
          const result = admin.results?.[ph]?.[i]
          const elapsed = nowMs - new Date(m.kickoff).getTime()
          return !isMatchFinal(result) && elapsed >= MATCH_DURATION_MS
        }).length
      }, 0)

      const data = await Promise.all(
        groupList.map(async ({ id }) => {
          const [group, participants, jornada, quinielas] = await Promise.all([
            kv.get(`quiniela:group:${id}`),
            kv.get(`quiniela:${id}:participants`),
            kv.get(`quiniela:${id}:ai:jornada:grupos`),
            kv.get(`quiniela:${id}:quinielas`),
          ])

          const rawParticipants = participants ?? []
          const rawQuinielas = quinielas ?? {}
          const scores = calcularPuntajes(rawParticipants, rawQuinielas, admin)
          const scoreMap = Object.fromEntries(scores.map(s => [s.participantId, s]))
          const totalPts = scores.reduce((a, s) => a + s.pts, 0)
          const avgPts = scores.length > 0 ? Math.round((totalPts / scores.length) * 10) / 10 : 0

          return {
            id,
            nombre: group?.nombre ?? '—',
            adminNombre: group?.adminNombre ?? '—',
            adminTel: group?.adminTel ?? '—',
            createdAt: group?.createdAt ?? null,
            fases: group?.fases ?? [],
            participants: rawParticipants.map(p => ({
              nombre: p.nombre, email: p.email, tel: p.tel, pais: p.pais, createdAt: p.createdAt,
              pts: scoreMap[p.id]?.pts ?? 0,
              breakdown: scoreMap[p.id]?.breakdown ?? { exacto: 0, ganador: 0, campeon: 0, goleador: 0 },
            })),
            picksCount: Object.keys(rawQuinielas).length,
            avgPts,
            kai: {
              confidence: globalConfidenceGenerated,
              jornada: !!jornada,
              jornadaPreview: typeof jornada === 'string' ? jornada.slice(0, 100) : null,
            },
          }
        })
      )

      // Build platform-wide leaders
      const allWithScores = data.flatMap(q =>
        q.participants.map(p => ({ ...p, quinielaNombre: q.nombre, quinielaId: q.id }))
      )
      const byPts    = [...allWithScores].sort((a, b) => b.pts - a.pts)
      const byExacto = [...allWithScores].sort((a, b) => (b.breakdown?.exacto ?? 0) - (a.breakdown?.exacto ?? 0))
      const byAvg    = [...data].sort((a, b) => b.avgPts - a.avgPts)
      const byPart   = [...data].sort((a, b) => b.participants.length - a.participants.length)

      const lideres = {
        mejorParticipante: byPts[0]    ? { nombre: byPts[0].nombre,    pts: byPts[0].pts,              quiniela: byPts[0].quinielaNombre }    : null,
        mejorQuiniela:     byAvg[0]    ? { nombre: byAvg[0].nombre,    avgPts: byAvg[0].avgPts,        id: byAvg[0].id }                      : null,
        masExactos:        byExacto[0] ? { nombre: byExacto[0].nombre, exactos: byExacto[0].breakdown?.exacto ?? 0, quiniela: byExacto[0].quinielaNombre } : null,
        masActiva:         byPart[0]   ? { nombre: byPart[0].nombre,   participantes: byPart[0].participants.length, id: byPart[0].id }        : null,
      }

      return NextResponse.json({ quinielas: data, total: data.length, globalConfidenceGenerated, confidenceByPhase, activePhase, pendingMatchesCount, lideres })
    }

    if (action === 'globalTop') {
      const cached = await kv.get('quiniela:global:top:grupos')
      if (cached) return NextResponse.json({ top: cached, cached: true })

      const [groups, globalAdmin] = await Promise.all([
        kv.get('quiniela:groups'),
        kv.get('quiniela:global:admin'),
      ])
      const gruposResults = globalAdmin?.results?.grupos ?? []
      const adminForGrupos = { unlockedPhases: ['grupos'], results: { grupos: gruposResults }, realCampeon: '', realGoleador: '' }

      const EXCLUDED_GROUP_IDS = ['P2-JAY3']
      const allEntries = (await Promise.all(
        (groups ?? []).filter(g => !EXCLUDED_GROUP_IDS.includes(g.id)).map(async ({ id, nombre: gNombre }) => {
          const [participants, quinielas, groupData] = await Promise.all([
            kv.get(`quiniela:${id}:participants`),
            kv.get(`quiniela:${id}:quinielas`),
            kv.get(`quiniela:group:${id}`),
          ])
          if (groupData?.isDemo) return []
          const filteredParticipants = (participants ?? []).filter(p => !p.excludeFromGlobal)
          const scores = calcularPuntajes(filteredParticipants, quinielas ?? {}, adminForGrupos)
          return filteredParticipants.map(p => {
            const s = scores.find(x => x.participantId === p.id)
            return {
              nombre: p.nombre,
              pais: p.pais ?? null,
              quinielaNombre: gNombre,
              quinielaId: id,
              pts: s?.pts ?? 0,
              exactos: s?.breakdown?.exacto ?? 0,
              ganadores: s?.breakdown?.ganador ?? 0,
            }
          })
        })
      )).flat()

      const top = allEntries
        .sort((a, b) => b.pts - a.pts || b.exactos - a.exactos || b.ganadores - a.ganadores)
        .slice(0, 10)

      await kv.set('quiniela:global:top:grupos', top, { ex: 600 })
      return NextResponse.json({ top })
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

      let quinielas = quinielasRaw ?? {}

      // Si el cliente se identifica con su token, ocultamos los picks de los
      // DEMÁS participantes para partidos que aún no son finales — el
      // solicitante conserva su propia quiniela completa (la necesita para editar).
      if (token) {
        const tokenData = await kv.get(`quiniela:token:${token}`)
        const requesterId = tokenData?.groupId === groupId ? tokenData.participantId : null
        if (requesterId) {
          quinielas = Object.fromEntries(Object.entries(quinielas).map(([pid, q]) => {
            if (pid === requesterId) return [pid, q]
            const phases = {}
            PHASE_ORDER.forEach((ph) => {
              const picks = q.phases?.[ph]
              if (!picks) return
              phases[ph] = picks.map((pick, i) =>
                isMatchFinal(mergedAdmin.results?.[ph]?.[i]) ? pick : { l: '', v: '', w: '' }
              )
            })
            return [pid, { ...q, phases }]
          }))
        }
      }

      return NextResponse.json({
        participants: participants ?? [],
        quinielas,
        admin: mergedAdmin,
        group: group ?? null,
      })
    }

    if (action === 'participantDetail' && groupId && participantId) {
      const tokenData = token ? await kv.get(`quiniela:token:${token}`) : null
      if (!tokenData || tokenData.groupId !== groupId) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }

      const [participants, quinielasRaw, adminRaw, globalAdmin] = await Promise.all([
        kv.get(`quiniela:${groupId}:participants`),
        kv.get(`quiniela:${groupId}:quinielas`),
        kv.get(`quiniela:${groupId}:admin`),
        kv.get('quiniela:global:admin'),
      ])

      const participant = (participants ?? []).find((p) => p.id === participantId)
      if (!participant) return NextResponse.json({ error: 'not_found' }, { status: 404 })

      const perAdmin = adminRaw ?? {}
      const admin = {
        unlockedPhases: perAdmin.unlockedPhases ?? ['grupos'],
        results: globalAdmin?.results ?? perAdmin.results ?? {},
        realCampeon: globalAdmin?.realCampeon ?? perAdmin.realCampeon ?? '',
        realGoleador: globalAdmin?.realGoleador ?? perAdmin.realGoleador ?? '',
      }

      const quinielas = quinielasRaw ?? {}
      const q = quinielas[participantId]
      const myQ = quinielas[tokenData.participantId]

      // ── Posición en la tabla oficial ──
      const sortedScores = [...calcularPuntajes(participants ?? [], quinielas, admin)].sort((a, b) => b.pts - a.pts)
      const position = sortedScores.findIndex((s) => s.participantId === participantId) + 1
      const myPts = sortedScores.find((s) => s.participantId === tokenData.participantId)?.pts ?? 0

      let pts = 0, exactos = 0, aciertos = 0, fallos = 0, totalCerrados = 0, picksDiferentes = 0
      PHASE_ORDER.forEach((ph) => {
        if (!admin.unlockedPhases.includes(ph)) return
        const picks = q?.phases?.[ph] ?? []
        const myPicks = myQ?.phases?.[ph] ?? []
        const reals = admin.results?.[ph] ?? []
        PHASES[ph].matches.forEach((m, i) => {
          const real = reals[i]
          if (!isMatchFinal(real)) return
          totalCerrados++
          const { status, pts: matchPts } = evaluatePick(picks[i], real, m)
          pts += matchPts
          if (status === 'exacto') exactos++
          else if (status === 'acierto') aciertos++
          else if (status === 'fallo') fallos++

          const targetW = picks[i]?.w
          const myW = myPicks[i]?.w
          if (targetW && myW && targetW !== myW) picksDiferentes++
        })
      })
      if (admin.realCampeon && q?.campeon === admin.realCampeon) pts += 5
      if (admin.realGoleador && q?.goleador === admin.realGoleador) pts += 3

      const efectividad = totalCerrados > 0 ? Math.round(((exactos + aciertos) / totalCerrados) * 100) : 0

      const history = buildHistory(q, admin, admin.unlockedPhases)
        .map((group) => ({ ...group, matches: group.matches.filter((e) => e.status !== 'pendiente') }))
        .filter((group) => group.matches.length > 0)

      const totalSlots = admin.unlockedPhases.reduce((acc, ph) => acc + PHASES[ph].matches.length, 0)
      const pendingPicks = totalSlots - totalCerrados

      const vsMe = { ptsDiff: pts - myPts, picksDiferentes }

      // ── Insights heurísticos (máx. 2, sin IA) ──
      const insights = []

      // 1. Partido clave: su mejor resultado "exacto" (+3)
      let partidoClave = null
      for (const group of history) {
        partidoClave = group.matches.find((e) => e.status === 'exacto')
        if (partidoClave) break
      }
      if (partidoClave) {
        insights.push({
          icon: '🎯', label: 'Partido clave',
          text: `Su pronóstico de ${partidoClave.local} ${partidoClave.pick.l}-${partidoClave.pick.v} ${partidoClave.visitante} fue exacto — le dio +3 puntos.`,
        })
      }

      // 2. Golpe de la jornada: pick correcto y minoritario vs. consenso (solo partidos finalizados)
      if (insights.length < 2) {
        const matchConsensus = {}
        admin.unlockedPhases.forEach((ph) => {
          const reals = admin.results?.[ph] ?? []
          PHASES[ph].matches.forEach((m, i) => {
            if (!isMatchFinal(reals[i])) return
            const votes = {}
            let total = 0
            Object.values(quinielas).forEach((qq) => {
              const w = qq.phases?.[ph]?.[i]?.w
              if (w) { votes[w] = (votes[w] ?? 0) + 1; total++ }
            })
            if (total >= 2) {
              const leader = Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0]
              matchConsensus[`${ph}-${i}`] = { leader, total, votes, match: m, real: reals[i] }
            }
          })
        })

        let golpe = null
        let minPct = 100
        Object.entries(matchConsensus).forEach(([key, cs]) => {
          const [ph, idxStr] = key.split('-')
          const i = parseInt(idxStr)
          const myPick = q?.phases?.[ph]?.[i]
          if (!myPick?.w || myPick.w === cs.leader) return
          const { status } = evaluatePick(myPick, cs.real, cs.match)
          if (status !== 'exacto' && status !== 'acierto') return
          const count = cs.votes[myPick.w] ?? 0
          const pct = Math.round((count / cs.total) * 100)
          if (pct < minPct) {
            minPct = pct
            golpe = { match: cs.match, option: myPick.w, count, total: cs.total }
          }
        })
        if (golpe) {
          insights.push({
            icon: '🎲', label: 'Golpe de la jornada',
            text: `Fue de los pocos en acertar ${golpe.option === 'Empate' ? 'el empate' : golpe.option} en ${golpe.match.local} vs ${golpe.match.visitante} — solo ${golpe.count} de ${golpe.total} eligieron eso.`,
          })
        }
      }

      return NextResponse.json({
        participant: { nombre: participant.nombre, pais: participant.pais },
        position,
        stats: { pts, exactos, aciertos, fallos, totalCerrados, efectividad },
        vsMe,
        pendingPicks,
        insights,
        history,
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

    // One-time migration: swap grupos picks[2] ↔ picks[3] for all quinielas.
    // Needed because commit a1b15b2 reordered Group A matchday-2 pairs (índices 2 y 3).
    // Admin results were entered under the new order so they are NOT swapped.
    if (action === 'migrateSwapGruposIdx2y3') {
      const { secret } = payload
      if (secret !== 'bonsight-migrate-2026-grp-a') {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
      const groups = (await kv.get('quiniela:groups')) ?? []
      const report = []
      for (const { id: gid } of groups) {
        const quinielas = (await kv.get(`quiniela:${gid}:quinielas`)) ?? {}
        let changed = 0
        for (const pid of Object.keys(quinielas)) {
          const q = quinielas[pid]
          const gr = q.phases?.grupos
          if (!Array.isArray(gr)) continue
          const tmp = gr[2]
          gr[2] = gr[3] ?? { l: '', v: '', w: '' }
          gr[3] = tmp ?? { l: '', v: '', w: '' }
          quinielas[pid] = { ...q, phases: { ...q.phases, grupos: gr } }
          changed++
        }
        if (changed > 0) await kv.set(`quiniela:${gid}:quinielas`, quinielas)
        report.push({ groupId: gid, participantsMigrated: changed })
      }
      return NextResponse.json({ ok: true, report })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'KV error', detail: String(e) }, { status: 500 })
  }
}
