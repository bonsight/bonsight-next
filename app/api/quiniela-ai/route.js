import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { PHASES } from '@/lib/quiniela'

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})

async function callClaude(system, userMessage, maxTokens = 1500) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? ''
}

function parseJSON(text) {
  try {
    // Strip markdown code blocks (```json ... ``` or ``` ... ```)
    const clean = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')
    const match = clean.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch { return [] }
}

// ── GET: leer datos IA cacheados ─────────────────────────────────────────────
export async function GET(req) {
  const { searchParams } = req.nextUrl
  const action        = searchParams.get('action')
  const groupId       = searchParams.get('groupId')
  const phase         = searchParams.get('phase')
  const participantId = searchParams.get('participantId')

  try {
    if (action === 'getConfidence' && groupId && phase) {
      const data = await kv.get(`quiniela:${groupId}:ai:confidence:${phase}`)
      return NextResponse.json({ confidence: data ?? null })
    }
    if (action === 'getJornada' && groupId && phase) {
      const data = await kv.get(`quiniela:${groupId}:ai:jornada:${phase}`)
      return NextResponse.json({ summary: data ?? null })
    }
    if (action === 'getSuggestion' && groupId && phase && participantId) {
      const data = await kv.get(`quiniela:${groupId}:ai:suggestion:${participantId}:${phase}`)
      return NextResponse.json({ suggestion: data ?? null })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// ── POST: generar con IA ─────────────────────────────────────────────────────
export async function POST(req) {
  const { action, payload } = await req.json()

  try {
    // ── 1. Nivel de confianza por partido ────────────────────────────────────
    if (action === 'generateConfidence') {
      const { groupId, phase } = payload
      const matches = PHASES[phase]?.matches ?? []
      const phaseLabel = PHASES[phase]?.label ?? phase

      const KAI_SYSTEM = `Eres Kai, el analista deportivo de Bonsight. Analizas partidos del Mundial 2026 con criterio propio.
Siempre tomás postura. NUNCA describís datos, siempre interpretás e opinás.
Respondés ÚNICAMENTE con un array JSON válido. Sin texto adicional, sin markdown, sin bloques de código.`

      function buildPrompt(matchList, groupLabel) {
        return `Analiza estos partidos de ${groupLabel} del Mundial 2026 como analista con criterio propio.

Responde con exactamente este formato JSON (un objeto por partido, sin texto extra):
[{"matchIndex":0,"confidence":"alta","confidencePct":93,"headline":"Alemania favorita clara ante Curazao","insight":"Kai considera este uno de los cruces más desbalanceados de la fase."}]

CAMPOS REQUERIDOS:
- matchIndex: número del partido (el que aparece al inicio de cada línea)
- confidence: "alta" | "media" | "baja"
- confidencePct: entero entre 40 y 95
- headline: máx 7 palabras, formato nominal, con los nombres de los equipos
- insight: 1 línea con voz de Kai, tomando postura

VOCABULARIO POR NIVEL DE CONFIANZA:

confidencePct > 85 (muy favorable):
- headline: "X favorita clara ante Y" / "Uno de los cruces más desbalanceados de la fase"
- insight: "Kai considera este uno de los cruces más desbalanceados de la fase." / "Kai no ve argumentos sólidos para una derrota de X aquí." / "Kai espera que X controle el partido con autoridad." / "Kai considera poco probable una sorpresa en este cruce."

confidencePct 70-85 (favorable):
- headline: "X favorita con ventaja importante" / "X con ventaja clara ante Y"
- insight: "Kai ve a X como favorita, aunque espera que Y no lo ponga fácil." / "Kai detecta una diferencia importante entre ambos equipos." / "Kai espera una victoria de X, sin que sea un partido sin historia."

confidencePct 55-70 (partido abierto):
- headline: "Partido abierto con leve ventaja para X" / "X puede sorprender a Y"
- insight: "Kai ve una ligera ventaja para X, aunque espera un partido disputado." / "Kai cree que este partido se definirá por pequeños detalles." / "Kai detecta fortalezas similares entre ambos equipos."

confidencePct < 55 (muy incierto):
- headline: "Duelo muy abierto entre X e Y" / "Partido difícil de anticipar"
- insight: "Kai considera este uno de los partidos más difíciles de leer de la jornada." / "Kai detecta condiciones propicias para una sorpresa." / "Kai no identifica ventaja clara para ninguno de los dos equipos."

IMPORTANTE:
- NUNCA incluir marcadores exactos ni predicciones numéricas
- Varía el vocabulario entre partidos — nunca el mismo insight exacto dos veces
- Menciona los equipos por nombre
- Español neutro, seguro pero no arrogante
- NO incluir el campo "projection" ni ningún marcador

Partidos:
${matchList}`
      }

      let allConfidence = []

      if (phase === 'grupos') {
        // 12 llamadas de 6 partidos (A-L)
        // Usamos índice LOCAL (0-5) en el prompt y remapeamos a global después
        const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']
        for (let g = 0; g < 12; g++) {
          const groupMatches = matches.slice(g * 6, (g + 1) * 6)
          const matchList = groupMatches
            .map((m, i) => `${i}. ${m.local} vs ${m.visitante}`) // índice local 0-5
            .join('\n')
          const text = await callClaude(KAI_SYSTEM, buildPrompt(matchList, `Grupo ${GROUPS[g]}`), 800)
          const parsed = parseJSON(text)
          // Remapar índice local → global: grupo G × 6 + índice local
          const remapped = parsed.map(item => ({
            ...item,
            matchIndex: g * 6 + (typeof item.matchIndex === 'number' ? item.matchIndex % 6 : 0),
          }))
          allConfidence = [...allConfidence, ...remapped]
          if (g < 11) await new Promise(r => setTimeout(r, 200))
        }
      } else {
        const matchList = matches.map((m, i) => `${i}. ${m.local} vs ${m.visitante}`).join('\n')
        const text = await callClaude(KAI_SYSTEM, buildPrompt(matchList, phaseLabel), 1500)
        allConfidence = parseJSON(text)
      }

      await kv.set(`quiniela:${groupId}:ai:confidence:${phase}`, allConfidence)
      return NextResponse.json({ ok: true, confidence: allConfidence, count: allConfidence.length })
    }

    // ── 2. Resumen narrativo de jornada ──────────────────────────────────────
    if (action === 'generateJornadaSummary') {
      const { groupId, phase, participants, scores, quinielas, adminResults } = payload
      const phaseLabel = PHASES[phase]?.label ?? phase

      const sortedScores = [...scores].sort((a, b) => b.pts - a.pts)

      // Calcular delta de puntos por jornada (exactos + ganadores de esta fase)
      const rankingCtx = sortedScores.map((s, i) => {
        const p = participants.find(x => x.id === s.participantId)
        const bd = s.breakdown
        return `${i + 1}. ${p?.nombre ?? '?'} — ${s.pts} pts total (exactos: ${bd.exacto}, ganadores: ${bd.ganador})`
      }).join('\n')

      // Detectar pick audaz: alguien que acertó yendo contra la mayoría
      let pickAudaz = null
      if (adminResults && quinielas) {
        const phaseResults = adminResults[phase] ?? []
        const phaseMatches = PHASES[phase]?.matches ?? []
        phaseMatches.forEach((m, i) => {
          const real = phaseResults[i]
          if (!real || real.l === '' || real.v === '') return
          const realWin = Number(real.l) > Number(real.v) ? m.local : Number(real.l) < Number(real.v) ? m.visitante : 'Empate'
          let correctPickers = [], incorrectPickers = 0
          participants.forEach(p => {
            const w = quinielas[p.id]?.phases?.[phase]?.[i]?.w
            if (w === realWin) correctPickers.push(p.nombre)
            else if (w) incorrectPickers++
          })
          if (correctPickers.length === 1 && incorrectPickers >= 2) {
            pickAudaz = { nombre: correctPickers[0], partido: `${m.local} vs ${m.visitante}`, resultado: realWin }
          }
        })
      }

      const system = `Eres Kai, el narrador de una quiniela del Mundial 2026 entre amigos.
Tono: humano, entusiasta, competitivo, ligero. Como un amigo comentando el partido, no un locutor.
Responde SOLO con el texto narrativo. Sin etiquetas, sin markdown, sin nada más.`

      const userMessage = `Escribe el análisis de la ${phaseLabel} para esta quiniela. Máximo 4 líneas de texto corrido.

Ranking actual:
${rankingCtx}

${pickAudaz ? `Pick más audaz de la jornada: ${pickAudaz.nombre} acertó ${pickAudaz.resultado} en ${pickAudaz.partido} cuando la mayoría eligió lo contrario.` : ''}

DEBE incluir (cuando hay datos para ello):
1. Quién tuvo la mejor jornada y cuántos puntos sumó
2. El pick más audaz o sorpresivo si lo hay
3. Quién está remontando o acercándose a la punta
4. Una lectura entretenida del estado de la competencia

Que suene natural y entretenido. Nada de "según los datos" ni frases corporativas.`

      const summary = await callClaude(system, userMessage, 400)
      const text = summary.trim()

      await kv.set(`quiniela:${groupId}:ai:jornada:${phase}`, text)
      return NextResponse.json({ ok: true, summary: text })
    }

    // ── 3. Sugerencia personalizada por participante ──────────────────────────
    if (action === 'generateSuggestion') {
      const { groupId, phase, participantId, participantName, existingPicks, matches } = payload
      const phaseLabel = PHASES[phase]?.label ?? phase

      const picksCtx = matches.map((m, i) => {
        const pk = existingPicks[i]
        if (pk?.l !== '' && pk?.v !== '') {
          return `${i}. ${m.local} vs ${m.visitante}: ya tiene pick ${pk.l}-${pk.v}`
        }
        return `${i}. ${m.local} vs ${m.visitante}: SIN PICK`
      }).join('\n')

      const system = `Eres un asesor de quiniela personalizado del Mundial 2026. Das sugerencias de picks.
Responde ÚNICAMENTE con un array JSON. Sin texto adicional, sin markdown.`

      const userMessage = `Participante: ${participantName}

Estado de sus picks en ${phaseLabel}:
${picksCtx}

Solo sugiere los partidos marcados "SIN PICK". Ignora los que ya tienen pick.
Basa tus sugerencias en el nivel de los equipos y contexto del Mundial 2026.
Sé conciso y personalizado en la razón.

Formato exacto:
[{
  "matchIndex": 0,
  "local": "Nombre local",
  "visitante": "Nombre visitante",
  "suggestedL": "2",
  "suggestedV": "1",
  "suggestedW": "Nombre ganador o Empate",
  "reason": "Razón breve y personal (max 15 palabras)"
}]

Si todos ya tienen pick, devuelve: []`

      const text = await callClaude(system, userMessage, 3000)
      const suggestion = parseJSON(text)

      await kv.set(`quiniela:${groupId}:ai:suggestion:${participantId}:${phase}`, suggestion)
      return NextResponse.json({ ok: true, suggestion })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
