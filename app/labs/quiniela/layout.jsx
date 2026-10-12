export const metadata = {
  title: 'Quiniela Mundial 2026 · Bonsight',
  description: 'Kai analiza. Tú decides. Compite con amigos durante todo el Mundial 2026 con inteligencia artificial.',
  openGraph: {
    title: 'Quiniela Mundial 2026 · Bonsight',
    description: 'Kai analiza. Tú decides. Compite con amigos durante todo el Mundial.',
    url: 'https://bonsight.co/quiniela',
    siteName: 'Bonsight',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quiniela Mundial 2026 · Bonsight',
    description: 'Kai analiza. Tú decides.',
  },
}

// Vive bajo app/labs/ (ver proxy.js), lo que la anida dentro de LabsLayout y hereda su
// ".labs-root" (fondo oscuro/texto crema de labs.css) por simple herencia de CSS — nada que
// ver con el diseño de la Quiniela. Este wrapper pisa esos dos valores con los defaults reales
// del sitio (los mismos que ya usa `body` en globals.css) para que tenga su propia identidad,
// no la de Labs.
export default function QuinielaLayout({ children }) {
  return <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh' }}>{children}</div>
}
