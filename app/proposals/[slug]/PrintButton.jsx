'use client'

export default function PrintButton() {
  return (
    <button className="print-btn" onClick={() => window.print()} aria-label="Exportar propuesta">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M6 9V2h12v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="2" y="9" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 14h12v8H6z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
      Exportar PDF
    </button>
  )
}
