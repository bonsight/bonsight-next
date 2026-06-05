import { NextResponse } from 'next/server'

export async function POST(req) {
  const { messages, participantNames } = await req.json()

  const systemPrompt = `Eres un experto en estadísticas de fútbol y pronósticos del Mundial 2026 (sede: USA, Canadá y México, junio-julio 2026, 48 equipos).
Ayudas a jugadores de una quiniela a hacer pronósticos estratégicos.
Sistema de puntos: resultado exacto = 3pts, ganador correcto = 1pt, campeón del torneo = 5pts, goleador = 3pts.
Da respuestas concisas con estadísticas históricas, forma reciente y factores clave. Tono amigable y entusiasta.
Responde siempre en español.
${participantNames?.length ? 'Participantes en esta quiniela: ' + participantNames.join(', ') : ''}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    })

    const data = await response.json()
    const text = data.content?.find(b => b.type === 'text')?.text ?? 'Sin respuesta.'
    return NextResponse.json({ text })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
