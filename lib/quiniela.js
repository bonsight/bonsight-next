export const FLAGS = {
  'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷', 'Chequia': '🇨🇿',
  'Canadá': '🇨🇦', 'Bosnia y Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭',
  'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Estados Unidos': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
  'Alemania': '🇩🇪', 'Curazao': '🇨🇼', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
  'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
  'Bélgica': '🇧🇪', 'Egipto': '🇪🇬', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
  'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
  'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴',
  'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
  'Portugal': '🇵🇹', 'RD Congo': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦',
}

export const PHASE_ORDER = ['grupos', 'ronda32', 'octavos', 'cuartos', 'semis', 'final']

export const PHASES = {
  grupos: {
    label: 'Fase de grupos',
    matches: [
      // Grupo A
      { local: 'México',       visitante: 'Sudáfrica',            kickoff: '2026-06-11T19:00:00Z', ciudad: 'Ciudad de México' },
      { local: 'Corea del Sur',visitante: 'Chequia',              kickoff: '2026-06-12T02:00:00Z', ciudad: 'Guadalajara' },
      { local: 'Sudáfrica',    visitante: 'Chequia',              kickoff: '2026-06-18T16:00:00Z', ciudad: 'Atlanta' },
      { local: 'México',       visitante: 'Corea del Sur',        kickoff: '2026-06-19T01:00:00Z', ciudad: 'Guadalajara' },
      { local: 'México',       visitante: 'Chequia',              kickoff: '2026-06-25T01:00:00Z', ciudad: 'Ciudad de México' },
      { local: 'Sudáfrica',    visitante: 'Corea del Sur',        kickoff: '2026-06-25T01:00:00Z', ciudad: 'Guadalajara' },
      // Grupo B
      { local: 'Canadá',       visitante: 'Bosnia y Herzegovina', kickoff: '2026-06-12T19:00:00Z', ciudad: 'Toronto' },
      { local: 'Qatar',        visitante: 'Suiza',                kickoff: '2026-06-13T19:00:00Z', ciudad: 'San Francisco' },
      { local: 'Canadá',       visitante: 'Qatar',                kickoff: '2026-06-18T22:00:00Z', ciudad: 'Vancouver' },
      { local: 'Bosnia y Herzegovina', visitante: 'Suiza',        kickoff: '2026-06-18T19:00:00Z', ciudad: 'Seattle' },
      { local: 'Canadá',       visitante: 'Suiza',                kickoff: '2026-06-24T19:00:00Z', ciudad: 'Vancouver' },
      { local: 'Bosnia y Herzegovina', visitante: 'Qatar',        kickoff: '2026-06-24T19:00:00Z', ciudad: 'Seattle' },
      // Grupo C
      { local: 'Brasil',       visitante: 'Marruecos',            kickoff: '2026-06-13T19:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'Haití',        visitante: 'Escocia',              kickoff: '2026-06-13T22:00:00Z', ciudad: 'Boston' },
      { local: 'Brasil',       visitante: 'Haití',                kickoff: '2026-06-20T00:30:00Z', ciudad: 'Filadelfia' },
      { local: 'Marruecos',    visitante: 'Escocia',              kickoff: '2026-06-19T22:00:00Z', ciudad: 'Boston' },
      { local: 'Brasil',       visitante: 'Escocia',              kickoff: '2026-06-24T22:00:00Z', ciudad: 'Miami' },
      { local: 'Marruecos',    visitante: 'Haití',                kickoff: '2026-06-24T22:00:00Z', ciudad: 'Atlanta' },
      // Grupo D
      { local: 'Estados Unidos', visitante: 'Paraguay',           kickoff: '2026-06-13T01:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Australia',    visitante: 'Turquía',              kickoff: '2026-06-13T04:00:00Z', ciudad: 'Vancouver' },
      { local: 'Estados Unidos', visitante: 'Australia',          kickoff: '2026-06-19T19:00:00Z', ciudad: 'Seattle' },
      { local: 'Paraguay',     visitante: 'Turquía',              kickoff: '2026-06-20T04:00:00Z', ciudad: 'San Francisco' },
      { local: 'Estados Unidos', visitante: 'Turquía',            kickoff: '2026-06-26T02:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Paraguay',     visitante: 'Australia',            kickoff: '2026-06-26T02:00:00Z', ciudad: 'San Francisco' },
      // Grupo E
      { local: 'Alemania',     visitante: 'Curazao',              kickoff: '2026-06-14T17:00:00Z', ciudad: 'Houston' },
      { local: 'Costa de Marfil', visitante: 'Ecuador',           kickoff: '2026-06-14T23:00:00Z', ciudad: 'Filadelfia' },
      { local: 'Alemania',     visitante: 'Costa de Marfil',      kickoff: '2026-06-20T20:00:00Z', ciudad: 'Toronto' },
      { local: 'Curazao',      visitante: 'Ecuador',              kickoff: '2026-06-21T00:00:00Z', ciudad: 'Kansas City' },
      { local: 'Alemania',     visitante: 'Ecuador',              kickoff: '2026-06-25T20:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'Curazao',      visitante: 'Costa de Marfil',      kickoff: '2026-06-25T20:00:00Z', ciudad: 'Filadelfia' },
      // Grupo F
      { local: 'Países Bajos', visitante: 'Japón',                kickoff: '2026-06-14T20:00:00Z', ciudad: 'Dallas' },
      { local: 'Suecia',       visitante: 'Túnez',                kickoff: '2026-06-15T02:00:00Z', ciudad: 'Guadalajara' },
      { local: 'Países Bajos', visitante: 'Suecia',               kickoff: '2026-06-20T17:00:00Z', ciudad: 'Houston' },
      { local: 'Japón',        visitante: 'Túnez',                kickoff: '2026-06-21T04:00:00Z', ciudad: 'Guadalajara' },
      { local: 'Países Bajos', visitante: 'Túnez',                kickoff: '2026-06-25T23:00:00Z', ciudad: 'Kansas City' },
      { local: 'Japón',        visitante: 'Suecia',               kickoff: '2026-06-25T23:00:00Z', ciudad: 'Dallas' },
      // Grupo G
      { local: 'Bélgica',      visitante: 'Egipto',               kickoff: '2026-06-15T19:00:00Z', ciudad: 'Seattle' },
      { local: 'Irán',         visitante: 'Nueva Zelanda',        kickoff: '2026-06-16T01:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Bélgica',      visitante: 'Irán',                 kickoff: '2026-06-21T19:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Egipto',       visitante: 'Nueva Zelanda',        kickoff: '2026-06-22T01:00:00Z', ciudad: 'Vancouver' },
      { local: 'Bélgica',      visitante: 'Nueva Zelanda',        kickoff: '2026-06-27T03:00:00Z', ciudad: 'Vancouver' },
      { local: 'Egipto',       visitante: 'Irán',                 kickoff: '2026-06-27T03:00:00Z', ciudad: 'Seattle' },
      // Grupo H
      { local: 'España',       visitante: 'Cabo Verde',           kickoff: '2026-06-15T16:00:00Z', ciudad: 'Atlanta' },
      { local: 'Arabia Saudita', visitante: 'Uruguay',            kickoff: '2026-06-15T22:00:00Z', ciudad: 'Miami' },
      { local: 'España',       visitante: 'Arabia Saudita',       kickoff: '2026-06-21T16:00:00Z', ciudad: 'Atlanta' },
      { local: 'Cabo Verde',   visitante: 'Uruguay',              kickoff: '2026-06-21T22:00:00Z', ciudad: 'Miami' },
      { local: 'España',       visitante: 'Uruguay',              kickoff: '2026-06-27T00:00:00Z', ciudad: 'Guadalajara' },
      { local: 'Cabo Verde',   visitante: 'Arabia Saudita',       kickoff: '2026-06-27T00:00:00Z', ciudad: 'Houston' },
      // Grupo I
      { local: 'Francia',      visitante: 'Senegal',              kickoff: '2026-06-16T19:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'Irak',         visitante: 'Noruega',              kickoff: '2026-06-16T22:00:00Z', ciudad: 'Boston' },
      { local: 'Francia',      visitante: 'Irak',                 kickoff: '2026-06-22T21:00:00Z', ciudad: 'Filadelfia' },
      { local: 'Senegal',      visitante: 'Noruega',              kickoff: '2026-06-23T00:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'Francia',      visitante: 'Noruega',              kickoff: '2026-06-26T19:00:00Z', ciudad: 'Boston' },
      { local: 'Senegal',      visitante: 'Irak',                 kickoff: '2026-06-26T19:00:00Z', ciudad: 'Toronto' },
      // Grupo J
      { local: 'Argentina',    visitante: 'Argelia',              kickoff: '2026-06-17T01:00:00Z', ciudad: 'Kansas City' },
      { local: 'Austria',      visitante: 'Jordania',             kickoff: '2026-06-17T04:00:00Z', ciudad: 'San Francisco' },
      { local: 'Argentina',    visitante: 'Austria',              kickoff: '2026-06-22T17:00:00Z', ciudad: 'Dallas' },
      { local: 'Argelia',      visitante: 'Jordania',             kickoff: '2026-06-23T03:00:00Z', ciudad: 'San Francisco' },
      { local: 'Argentina',    visitante: 'Jordania',             kickoff: '2026-06-28T02:00:00Z', ciudad: 'Dallas' },
      { local: 'Argelia',      visitante: 'Austria',              kickoff: '2026-06-28T02:00:00Z', ciudad: 'Kansas City' },
      // Grupo K
      { local: 'Portugal',     visitante: 'RD Congo',             kickoff: '2026-06-17T17:00:00Z', ciudad: 'Houston' },
      { local: 'Uzbekistán',   visitante: 'Colombia',             kickoff: '2026-06-18T02:00:00Z', ciudad: 'Ciudad de México' },
      { local: 'Portugal',     visitante: 'Uzbekistán',           kickoff: '2026-06-23T17:00:00Z', ciudad: 'Houston' },
      { local: 'RD Congo',     visitante: 'Colombia',             kickoff: '2026-06-24T02:00:00Z', ciudad: 'Guadalajara' },
      { local: 'Portugal',     visitante: 'Colombia',             kickoff: '2026-06-27T23:30:00Z', ciudad: 'Miami' },
      { local: 'RD Congo',     visitante: 'Uzbekistán',           kickoff: '2026-06-27T23:30:00Z', ciudad: 'Atlanta' },
      // Grupo L
      { local: 'Inglaterra',   visitante: 'Croacia',              kickoff: '2026-06-17T20:00:00Z', ciudad: 'Dallas' },
      { local: 'Ghana',        visitante: 'Panamá',               kickoff: '2026-06-17T23:00:00Z', ciudad: 'Toronto' },
      { local: 'Inglaterra',   visitante: 'Ghana',                kickoff: '2026-06-23T20:00:00Z', ciudad: 'Boston' },
      { local: 'Croacia',      visitante: 'Panamá',               kickoff: '2026-06-23T23:00:00Z', ciudad: 'Toronto' },
      { local: 'Inglaterra',   visitante: 'Panamá',               kickoff: '2026-06-27T21:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'Croacia',      visitante: 'Ghana',                kickoff: '2026-06-27T21:00:00Z', ciudad: 'Filadelfia' },
    ],
  },
  ronda32: {
    label: 'Ronda de 32',
    matches: [
      { local: 'Sudáfrica',          visitante: 'Canadá',                kickoff: '2026-06-28T19:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Brasil',             visitante: 'Japón',                 kickoff: '2026-06-29T17:00:00Z', ciudad: 'Houston' },
      { local: 'Alemania',           visitante: 'Paraguay',              kickoff: '2026-06-29T20:30:00Z', ciudad: 'Boston' },
      { local: 'Países Bajos',       visitante: 'Marruecos',             kickoff: '2026-06-30T01:00:00Z', ciudad: 'Monterrey' },
      { local: 'Costa de Marfil',    visitante: 'Noruega',               kickoff: '2026-06-30T17:00:00Z', ciudad: 'Dallas' },
      { local: 'Francia',            visitante: 'Suecia',                kickoff: '2026-06-30T21:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'México',             visitante: 'Ecuador',               kickoff: '2026-07-01T01:00:00Z', ciudad: 'Ciudad de México' },
      { local: 'Inglaterra',         visitante: 'RD Congo',              kickoff: '2026-07-01T16:00:00Z', ciudad: 'Atlanta' },
      { local: 'Bélgica',            visitante: 'Senegal',               kickoff: '2026-07-01T20:00:00Z', ciudad: 'Seattle' },
      { local: 'Estados Unidos',     visitante: 'Bosnia y Herzegovina',  kickoff: '2026-07-02T00:00:00Z', ciudad: 'San Francisco' },
      { local: 'España',             visitante: 'Austria',               kickoff: '2026-07-02T19:00:00Z', ciudad: 'Los Ángeles' },
      { local: 'Portugal',           visitante: 'Croacia',               kickoff: '2026-07-02T23:00:00Z', ciudad: 'Toronto' },
      { local: 'Suiza',              visitante: 'Argelia',               kickoff: '2026-07-03T03:00:00Z', ciudad: 'Vancouver' },
      { local: 'Australia',          visitante: 'Egipto',                kickoff: '2026-07-03T18:00:00Z', ciudad: 'Dallas' },
      { local: 'Argentina',          visitante: 'Cabo Verde',            kickoff: '2026-07-03T22:00:00Z', ciudad: 'Miami' },
      { local: 'Colombia',           visitante: 'Ghana',                 kickoff: '2026-07-04T01:30:00Z', ciudad: 'Kansas City' },
    ],
  },
  octavos: {
    label: 'Octavos de final',
    matches: [
      { local: 'Canadá',        visitante: 'Marruecos',      kickoff: '2026-07-04T17:00:00Z', ciudad: 'Houston' },
      { local: 'Paraguay',      visitante: 'Francia',        kickoff: '2026-07-04T21:00:00Z', ciudad: 'Philadelphia' },
      { local: 'Brasil',        visitante: 'Noruega',        kickoff: '2026-07-05T20:00:00Z', ciudad: 'Nueva York / NJ' },
      { local: 'México',        visitante: 'Inglaterra',     kickoff: '2026-07-06T00:00:00Z', ciudad: 'Ciudad de México' },
      { local: 'Portugal',      visitante: 'España',         kickoff: '2026-07-06T19:00:00Z', ciudad: 'Dallas' },
      { local: 'Estados Unidos',visitante: 'Bélgica',        kickoff: '2026-07-07T00:00:00Z', ciudad: 'Seattle' },
      { local: 'Argentina',     visitante: 'Egipto',         kickoff: '2026-07-07T16:00:00Z', ciudad: 'Atlanta' },
      { local: 'Suiza',         visitante: 'Colombia',       kickoff: '2026-07-07T20:00:00Z', ciudad: 'Vancouver' },
    ],
  },
  cuartos: {
    label: 'Cuartos de final',
    matches: [
      { local: 'G1 Oct.', visitante: 'G2 Oct.' },
      { local: 'G3 Oct.', visitante: 'G4 Oct.' },
      { local: 'G5 Oct.', visitante: 'G6 Oct.' },
      { local: 'G7 Oct.', visitante: 'G8 Oct.' },
    ],
  },
  semis: {
    label: 'Semifinales',
    matches: [
      { local: 'G1 Cuar.', visitante: 'G2 Cuar.' },
      { local: 'G3 Cuar.', visitante: 'G4 Cuar.' },
    ],
  },
  final: {
    label: 'Final',
    matches: [{ local: 'G1 Semi', visitante: 'G2 Semi' }],
  },
}

export const TEAMS = [
  'Argentina', 'Brasil', 'Francia', 'España', 'Inglaterra',
  'Alemania', 'Portugal', 'Países Bajos', 'Bélgica', 'Uruguay',
  'México', 'Estados Unidos', 'Canadá', 'Colombia', 'Marruecos',
  'Senegal', 'Japón', 'Corea del Sur', 'Croacia', 'Suiza',
  'Ecuador', 'Turquía', 'Austria', 'Noruega', 'Dinamarca',
  'Polonia', 'Suecia', 'Australia', 'Irán', 'Egipto',
  'Arabia Saudita', 'Qatar', 'Costa de Marfil', 'RD Congo', 'Ghana',
  'Túnez', 'Argelia', 'Sudáfrica', 'Marruecos', 'Uzbekistán',
  'Jordania', 'Irak', 'Paraguay', 'Haití', 'Escocia',
  'Bosnia y Herzegovina', 'Cabo Verde', 'Curazao', 'Nueva Zelanda', 'Panamá',
]

export const SCORERS = [
  'Kylian Mbappé',
  'Harry Kane',
  'Erling Haaland',
  'Vinicius Jr.',
  'Lamine Yamal',
  'Jude Bellingham',
  'Lionel Messi',
  'Lautaro Martínez',
  'Julián Álvarez',
  'Phil Foden',
  'Florian Wirtz',
  'Luis Díaz',
  'Ousmane Dembélé',
  'Neymar Jr.',
  'Son Heung-min',
  'Bruno Fernandes',
  'Raphinha',
  'Otro',
]

export function isMatchFinal(real) {
  return !!real && real.l !== '' && real.v !== '' && real.final !== false
}

export function isMatchLive(real) {
  return !!real && real.l !== '' && real.v !== '' && real.final === false
}

// Evalúa un pick contra un resultado dado (final o en vivo — el caller decide cuál pasar)
export function evaluatePick(pick, real, match) {
  if (!real || real.l === '' || real.v === '') return { status: 'pendiente', pts: 0 }
  if (!pick || pick.l === '' || pick.v === '') return { status: 'sin_pick', pts: 0 }
  if (pick.l === real.l && pick.v === real.v) return { status: 'exacto', pts: 3 }
  const realWin =
    Number(real.l) > Number(real.v) ? match.local
    : Number(real.l) < Number(real.v) ? match.visitante
    : 'Empate'
  if (pick.w && pick.w === realWin) return { status: 'acierto', pts: 1 }
  return { status: 'fallo', pts: 0 }
}

export function calcularPuntajes(participantes, quinielas, admin, { live = false } = {}) {
  return participantes.map((p) => {
    const q = quinielas[p.id]
    const breakdown = { exacto: 0, ganador: 0, campeon: 0, goleador: 0 }
    let pts = 0

    if (!q) return { participantId: p.id, pts, breakdown }

    PHASE_ORDER.forEach((ph) => {
      const picks = q.phases[ph]
      const reals = admin.results[ph]
      if (!picks || !reals) return
      const matches = PHASES[ph].matches
      matches.forEach((m, i) => {
        const real = reals[i]
        const effectiveReal = live ? (real ?? { l: '', v: '' }) : (isMatchFinal(real) ? real : { l: '', v: '' })
        const { status, pts: matchPts } = evaluatePick(picks[i], effectiveReal, m)
        pts += matchPts
        if (status === 'exacto') breakdown.exacto++
        else if (status === 'acierto') breakdown.ganador++
      })
    })

    if (admin.realCampeon && q.campeon === admin.realCampeon) { pts += 5; breakdown.campeon++ }
    if (admin.realGoleador && q.goleador === admin.realGoleador) { pts += 3; breakdown.goleador++ }

    return { participantId: p.id, pts, breakdown }
  })
}

// Alias legible: tabla proyectada (incluye partidos en vivo, no solo finales)
export const calcularPuntajesProyectados = (participantes, quinielas, admin) =>
  calcularPuntajes(participantes, quinielas, admin, { live: true })

// Construye el historial de partidos del participante, agrupado por fecha (fase de grupos)
// o por fase (knockout, sin fecha definida). Solo incluye fases desbloqueadas.
export function buildHistory(quiniela, admin, unlockedPhases) {
  const dateGroups = {}
  const phaseGroups = {}

  PHASE_ORDER.forEach((ph) => {
    if (!unlockedPhases?.includes(ph)) return
    const matches = PHASES[ph].matches
    const picks = quiniela?.phases?.[ph] ?? []
    const reals = admin?.results?.[ph] ?? []

    matches.forEach((m, i) => {
      const pick = picks[i] ?? { l: '', v: '', w: '' }
      const real = reals[i] ?? { l: '', v: '' }
      const effectiveReal = isMatchFinal(real) ? real : { l: '', v: '' }
      const { status, pts } = evaluatePick(pick, effectiveReal, m)
      const entry = { phase: ph, matchIndex: i, local: m.local, visitante: m.visitante, real: effectiveReal, pick, status, pts }

      if (m.kickoff) {
        const dateKey = m.kickoff.slice(0, 10)
        ;(dateGroups[dateKey] ??= []).push(entry)
      } else {
        ;(phaseGroups[ph] ??= []).push(entry)
      }
    })
  })

  const dateEntries = Object.keys(dateGroups)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({ key: date, date, label: null, matches: dateGroups[date] }))

  const phaseEntries = PHASE_ORDER
    .filter((ph) => phaseGroups[ph])
    .map((ph) => ({ key: `fase:${ph}`, date: null, label: PHASES[ph].label, matches: phaseGroups[ph] }))

  return [...dateEntries, ...phaseEntries]
}
