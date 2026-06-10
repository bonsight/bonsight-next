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
      { local: 'México',       visitante: 'Sudáfrica',           kickoff: '2026-06-11T16:00:00Z' },
      { local: 'Corea del Sur',visitante: 'Chequia',             kickoff: '2026-06-11T16:00:00Z' },
      { local: 'México',       visitante: 'Corea del Sur',       kickoff: '2026-06-18T16:00:00Z' },
      { local: 'Sudáfrica',    visitante: 'Chequia',             kickoff: '2026-06-18T16:00:00Z' },
      { local: 'México',       visitante: 'Chequia',             kickoff: '2026-06-24T16:00:00Z' },
      { local: 'Sudáfrica',    visitante: 'Corea del Sur',       kickoff: '2026-06-24T16:00:00Z' },
      // Grupo B
      { local: 'Canadá',       visitante: 'Bosnia y Herzegovina',kickoff: '2026-06-12T16:00:00Z' },
      { local: 'Qatar',        visitante: 'Suiza',               kickoff: '2026-06-13T16:00:00Z' },
      { local: 'Canadá',       visitante: 'Qatar',               kickoff: '2026-06-18T16:00:00Z' },
      { local: 'Bosnia y Herzegovina', visitante: 'Suiza',       kickoff: '2026-06-18T16:00:00Z' },
      { local: 'Canadá',       visitante: 'Suiza',               kickoff: '2026-06-24T16:00:00Z' },
      { local: 'Bosnia y Herzegovina', visitante: 'Qatar',       kickoff: '2026-06-24T16:00:00Z' },
      // Grupo C
      { local: 'Brasil',       visitante: 'Marruecos',           kickoff: '2026-06-13T16:00:00Z' },
      { local: 'Haití',        visitante: 'Escocia',             kickoff: '2026-06-13T16:00:00Z' },
      { local: 'Brasil',       visitante: 'Haití',               kickoff: '2026-06-19T16:00:00Z' },
      { local: 'Marruecos',    visitante: 'Escocia',             kickoff: '2026-06-19T16:00:00Z' },
      { local: 'Brasil',       visitante: 'Escocia',             kickoff: '2026-06-24T16:00:00Z' },
      { local: 'Marruecos',    visitante: 'Haití',               kickoff: '2026-06-24T16:00:00Z' },
      // Grupo D
      { local: 'Estados Unidos', visitante: 'Paraguay',          kickoff: '2026-06-12T16:00:00Z' },
      { local: 'Australia',    visitante: 'Turquía',             kickoff: '2026-06-13T16:00:00Z' },
      { local: 'Estados Unidos', visitante: 'Australia',         kickoff: '2026-06-19T16:00:00Z' },
      { local: 'Paraguay',     visitante: 'Turquía',             kickoff: '2026-06-19T16:00:00Z' },
      { local: 'Estados Unidos', visitante: 'Turquía',           kickoff: '2026-06-25T16:00:00Z' },
      { local: 'Paraguay',     visitante: 'Australia',           kickoff: '2026-06-25T16:00:00Z' },
      // Grupo E
      { local: 'Alemania',     visitante: 'Curazao',             kickoff: '2026-06-14T16:00:00Z' },
      { local: 'Costa de Marfil', visitante: 'Ecuador',          kickoff: '2026-06-14T16:00:00Z' },
      { local: 'Alemania',     visitante: 'Costa de Marfil',     kickoff: '2026-06-20T16:00:00Z' },
      { local: 'Curazao',      visitante: 'Ecuador',             kickoff: '2026-06-20T16:00:00Z' },
      { local: 'Alemania',     visitante: 'Ecuador',             kickoff: '2026-06-25T16:00:00Z' },
      { local: 'Curazao',      visitante: 'Costa de Marfil',     kickoff: '2026-06-25T16:00:00Z' },
      // Grupo F
      { local: 'Países Bajos', visitante: 'Japón',               kickoff: '2026-06-14T16:00:00Z' },
      { local: 'Suecia',       visitante: 'Túnez',               kickoff: '2026-06-14T16:00:00Z' },
      { local: 'Países Bajos', visitante: 'Suecia',              kickoff: '2026-06-20T16:00:00Z' },
      { local: 'Japón',        visitante: 'Túnez',               kickoff: '2026-06-20T16:00:00Z' },
      { local: 'Países Bajos', visitante: 'Túnez',               kickoff: '2026-06-25T16:00:00Z' },
      { local: 'Japón',        visitante: 'Suecia',              kickoff: '2026-06-25T16:00:00Z' },
      // Grupo G
      { local: 'Bélgica',      visitante: 'Egipto',              kickoff: '2026-06-15T16:00:00Z' },
      { local: 'Irán',         visitante: 'Nueva Zelanda',       kickoff: '2026-06-15T16:00:00Z' },
      { local: 'Bélgica',      visitante: 'Irán',                kickoff: '2026-06-21T16:00:00Z' },
      { local: 'Egipto',       visitante: 'Nueva Zelanda',       kickoff: '2026-06-21T16:00:00Z' },
      { local: 'Bélgica',      visitante: 'Nueva Zelanda',       kickoff: '2026-06-26T16:00:00Z' },
      { local: 'Egipto',       visitante: 'Irán',                kickoff: '2026-06-26T16:00:00Z' },
      // Grupo H
      { local: 'España',       visitante: 'Cabo Verde',          kickoff: '2026-06-15T16:00:00Z' },
      { local: 'Arabia Saudita', visitante: 'Uruguay',           kickoff: '2026-06-15T16:00:00Z' },
      { local: 'España',       visitante: 'Arabia Saudita',      kickoff: '2026-06-21T16:00:00Z' },
      { local: 'Cabo Verde',   visitante: 'Uruguay',             kickoff: '2026-06-21T16:00:00Z' },
      { local: 'España',       visitante: 'Uruguay',             kickoff: '2026-06-26T16:00:00Z' },
      { local: 'Cabo Verde',   visitante: 'Arabia Saudita',      kickoff: '2026-06-26T16:00:00Z' },
      // Grupo I
      { local: 'Francia',      visitante: 'Senegal',             kickoff: '2026-06-16T16:00:00Z' },
      { local: 'Irak',         visitante: 'Noruega',             kickoff: '2026-06-16T16:00:00Z' },
      { local: 'Francia',      visitante: 'Irak',                kickoff: '2026-06-22T16:00:00Z' },
      { local: 'Senegal',      visitante: 'Noruega',             kickoff: '2026-06-22T16:00:00Z' },
      { local: 'Francia',      visitante: 'Noruega',             kickoff: '2026-06-26T16:00:00Z' },
      { local: 'Senegal',      visitante: 'Irak',                kickoff: '2026-06-26T16:00:00Z' },
      // Grupo J
      { local: 'Argentina',    visitante: 'Argelia',             kickoff: '2026-06-16T16:00:00Z' },
      { local: 'Austria',      visitante: 'Jordania',            kickoff: '2026-06-16T16:00:00Z' },
      { local: 'Argentina',    visitante: 'Austria',             kickoff: '2026-06-22T16:00:00Z' },
      { local: 'Argelia',      visitante: 'Jordania',            kickoff: '2026-06-22T16:00:00Z' },
      { local: 'Argentina',    visitante: 'Jordania',            kickoff: '2026-06-27T16:00:00Z' },
      { local: 'Argelia',      visitante: 'Austria',             kickoff: '2026-06-27T16:00:00Z' },
      // Grupo K
      { local: 'Portugal',     visitante: 'RD Congo',            kickoff: '2026-06-17T16:00:00Z' },
      { local: 'Uzbekistán',   visitante: 'Colombia',            kickoff: '2026-06-17T16:00:00Z' },
      { local: 'Portugal',     visitante: 'Uzbekistán',          kickoff: '2026-06-23T16:00:00Z' },
      { local: 'RD Congo',     visitante: 'Colombia',            kickoff: '2026-06-23T16:00:00Z' },
      { local: 'Portugal',     visitante: 'Colombia',            kickoff: '2026-06-27T16:00:00Z' },
      { local: 'RD Congo',     visitante: 'Uzbekistán',          kickoff: '2026-06-27T16:00:00Z' },
      // Grupo L
      { local: 'Inglaterra',   visitante: 'Croacia',             kickoff: '2026-06-17T16:00:00Z' },
      { local: 'Ghana',        visitante: 'Panamá',              kickoff: '2026-06-17T16:00:00Z' },
      { local: 'Inglaterra',   visitante: 'Ghana',               kickoff: '2026-06-23T16:00:00Z' },
      { local: 'Croacia',      visitante: 'Panamá',              kickoff: '2026-06-23T16:00:00Z' },
      { local: 'Inglaterra',   visitante: 'Panamá',              kickoff: '2026-06-27T16:00:00Z' },
      { local: 'Croacia',      visitante: 'Ghana',               kickoff: '2026-06-27T16:00:00Z' },
    ],
  },
  ronda32: {
    label: 'Ronda de 32',
    matches: [
      { local: '1A', visitante: '2C' },
      { local: '1B', visitante: '2D' },
      { local: '1C', visitante: '2A' },
      { local: '1D', visitante: '2B' },
      { local: '1E', visitante: '2G' },
      { local: '1F', visitante: '2H' },
      { local: '1G', visitante: '2E' },
      { local: '1H', visitante: '2F' },
      { local: '1I', visitante: '2K' },
      { local: '1J', visitante: '2L' },
      { local: '1K', visitante: '2I' },
      { local: '1L', visitante: '2J' },
      { local: '3A/B/C/D', visitante: '3E/F/G/H' },
      { local: '3A/B/C/D', visitante: '3I/J/K/L' },
      { local: '3E/F/G/H', visitante: '3I/J/K/L' },
      { local: '3 mejor', visitante: '3 mejor' },
    ],
  },
  octavos: {
    label: 'Octavos de final',
    matches: [
      { local: 'G1 R32', visitante: 'G2 R32' },
      { local: 'G3 R32', visitante: 'G4 R32' },
      { local: 'G5 R32', visitante: 'G6 R32' },
      { local: 'G7 R32', visitante: 'G8 R32' },
      { local: 'G9 R32', visitante: 'G10 R32' },
      { local: 'G11 R32', visitante: 'G12 R32' },
      { local: 'G13 R32', visitante: 'G14 R32' },
      { local: 'G15 R32', visitante: 'G16 R32' },
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

export function calcularPuntajes(participantes, quinielas, admin) {
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
        const pick = picks[i]
        const real = reals[i]
        if (!pick || !real || real.l === '' || real.v === '') return
        if (pick.l !== '' && pick.v !== '' && pick.l === real.l && pick.v === real.v) {
          pts += 3
          breakdown.exacto++
        } else {
          const realWin =
            Number(real.l) > Number(real.v) ? m.local
            : Number(real.l) < Number(real.v) ? m.visitante
            : 'Empate'
          if (pick.w && pick.w === realWin) {
            pts += 1
            breakdown.ganador++
          }
        }
      })
    })

    if (admin.realCampeon && q.campeon === admin.realCampeon) { pts += 5; breakdown.campeon++ }
    if (admin.realGoleador && q.goleador === admin.realGoleador) { pts += 3; breakdown.goleador++ }

    return { participantId: p.id, pts, breakdown }
  })
}
