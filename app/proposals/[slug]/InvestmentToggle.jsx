'use client'
import { useState } from 'react'

const TERMS = {
  12: {
    fee: '$1.284.000',
    sub: 'Ejecución continua · fee fijo, foco rotativo · compromiso 12 meses',
    note: 'El fee no cambia entre etapas: incluye el desarrollo necesario para construir la capacidad, prorrateado a lo largo del año, y luego se enfoca en operar y reportar.',
  },
  6: {
    fee: '$1.368.000',
    sub: 'Ejecución continua · fee fijo, foco rotativo · compromiso 6 meses',
    note: 'El fee no cambia entre etapas: incluye el desarrollo necesario para construir la capacidad, prorrateado en medio año, y luego se enfoca en operar y reportar. Plazo más corto, cuota mensual algo mayor.',
  },
}

export default function InvestmentToggle() {
  const [months, setMonths] = useState(12)
  const t = TERMS[months]
  return (
    <div className="invest-card">
      <div className="invest-label">Retainer mensual</div>
      <div className="term-toggle">
        {[12, 6].map(m => (
          <button
            key={m}
            className={`term-btn${months === m ? ' active' : ''}`}
            onClick={() => setMonths(m)}
          >
            {m} meses
          </button>
        ))}
      </div>
      <div className="invest-amount">{t.fee} <span>/ mes</span></div>
      <div className="invest-sub">{t.sub}</div>
      <div className="invest-rows">
        <div className="invest-row">Meses 1–2 · desarrollo (portal mayorista, integración WhatsApp) + lanzamiento</div>
        <div className="invest-row">Mes 3 en adelante · optimización continua y reportes mensuales</div>
      </div>
      <div className="phase-note">{t.note}</div>
    </div>
  )
}
