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
      { local: 'México',       visitante: 'Sudáfrica' },
      { local: 'Corea del Sur',visitante: 'Chequia' },
      { local: 'México',       visitante: 'Corea del Sur' },
      { local: 'Sudáfrica',    visitante: 'Chequia' },
      { local: 'México',       visitante: 'Chequia' },
      { local: 'Sudáfrica',    visitante: 'Corea del Sur' },
      // Grupo B
      { local: 'Canadá',       visitante: 'Bosnia y Herzegovina' },
      { local: 'Qatar',        visitante: 'Suiza' },
      { local: 'Canadá',       visitante: 'Qatar' },
      { local: 'Bosnia y Herzegovina', visitante: 'Suiza' },
      { local: 'Canadá',       visitante: 'Suiza' },
      { local: 'Bosnia y Herzegovina', visitante: 'Qatar' },
      // Grupo C
      { local: 'Brasil',       visitante: 'Marruecos' },
      { local: 'Haití',        visitante: 'Escocia' },
      { local: 'Brasil',       visitante: 'Haití' },
      { local: 'Marruecos',    visitante: 'Escocia' },
      { local: 'Brasil',       visitante: 'Escocia' },
      { local: 'Marruecos',    visitante: 'Haití' },
      // Grupo D
      { local: 'Estados Unidos', visitante: 'Paraguay' },
      { local: 'Australia',    visitante: 'Turquía' },
      { local: 'Estados Unidos', visitante: 'Australia' },
      { local: 'Paraguay',     visitante: 'Turquía' },
      { local: 'Estados Unidos', visitante: 'Turquía' },
      { local: 'Paraguay',     visitante: 'Australia' },
      // Grupo E
      { local: 'Alemania',     visitante: 'Curazao' },
      { local: 'Costa de Marfil', visitante: 'Ecuador' },
      { local: 'Alemania',     visitante: 'Costa de Marfil' },
      { local: 'Curazao',      visitante: 'Ecuador' },
      { local: 'Alemania',     visitante: 'Ecuador' },
      { local: 'Curazao',      visitante: 'Costa de Marfil' },
      // Grupo F
      { local: 'Países Bajos', visitante: 'Japón' },
      { local: 'Suecia',       visitante: 'Túnez' },
      { local: 'Países Bajos', visitante: 'Suecia' },
      { local: 'Japón',        visitante: 'Túnez' },
      { local: 'Países Bajos', visitante: 'Túnez' },
      { local: 'Japón',        visitante: 'Suecia' },
      // Grupo G
      { local: 'Bélgica',      visitante: 'Egipto' },
      { local: 'Irán',         visitante: 'Nueva Zelanda' },
      { local: 'Bélgica',      visitante: 'Irán' },
      { local: 'Egipto',       visitante: 'Nueva Zelanda' },
      { local: 'Bélgica',      visitante: 'Nueva Zelanda' },
      { local: 'Egipto',       visitante: 'Irán' },
      // Grupo H
      { local: 'España',       visitante: 'Cabo Verde' },
      { local: 'Arabia Saudita', visitante: 'Uruguay' },
      { local: 'España',       visitante: 'Arabia Saudita' },
      { local: 'Cabo Verde',   visitante: 'Uruguay' },
      { local: 'España',       visitante: 'Uruguay' },
      { local: 'Cabo Verde',   visitante: 'Arabia Saudita' },
      // Grupo I
      { local: 'Francia',      visitante: 'Senegal' },
      { local: 'Irak',         visitante: 'Noruega' },
      { local: 'Francia',      visitante: 'Irak' },
      { local: 'Senegal',      visitante: 'Noruega' },
      { local: 'Francia',      visitante: 'Noruega' },
      { local: 'Senegal',      visitante: 'Irak' },
      // Grupo J
      { local: 'Argentina',    visitante: 'Argelia' },
      { local: 'Austria',      visitante: 'Jordania' },
      { local: 'Argentina',    visitante: 'Austria' },
      { local: 'Argelia',      visitante: 'Jordania' },
      { local: 'Argentina',    visitante: 'Jordania' },
      { local: 'Argelia',      visitante: 'Austria' },
      // Grupo K
      { local: 'Portugal',     visitante: 'RD Congo' },
      { local: 'Uzbekistán',   visitante: 'Colombia' },
      { local: 'Portugal',     visitante: 'Uzbekistán' },
      { local: 'RD Congo',     visitante: 'Colombia' },
      { local: 'Portugal',     visitante: 'Colombia' },
      { local: 'RD Congo',     visitante: 'Uzbekistán' },
      // Grupo L
      { local: 'Inglaterra',   visitante: 'Croacia' },
      { local: 'Ghana',        visitante: 'Panamá' },
      { local: 'Inglaterra',   visitante: 'Ghana' },
      { local: 'Croacia',      visitante: 'Panamá' },
      { local: 'Inglaterra',   visitante: 'Panamá' },
      { local: 'Croacia',      visitante: 'Ghana' },
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
