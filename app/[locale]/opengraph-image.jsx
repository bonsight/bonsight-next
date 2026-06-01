import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }) {
  const { locale } = await params;
  const en = locale === 'en';

  return new ImageResponse(
    <div
      style={{
        background: '#0d0d0f',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 96px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: 'absolute', right: -140, top: -140, width: 580, height: 580, borderRadius: '50%', border: '1px solid rgba(52,211,153,0.07)', display: 'flex' }} />
      <div style={{ position: 'absolute', right: -60, top: -60, width: 380, height: 380, borderRadius: '50%', border: '1px solid rgba(52,211,153,0.04)', display: 'flex' }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 52 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.03em' }}>
          Bonsight
        </span>
        <span style={{ fontSize: 48, color: '#34d399', marginLeft: 2, lineHeight: 1 }}>.</span>
      </div>

      {/* Tagline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 56, fontWeight: 600, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.03em', lineHeight: 1.1, display: 'flex' }}>
          {en ? 'From strategy to execution.' : 'De la estrategia a la ejecución.'}
        </span>
        <span style={{ fontSize: 56, fontWeight: 400, color: 'rgba(52,211,153,0.85)', letterSpacing: '-0.03em', lineHeight: 1.1, display: 'flex' }}>
          {en ? 'With you every step.' : 'Contigo en cada paso.'}
        </span>
      </div>

      {/* Domain */}
      <div style={{ position: 'absolute', bottom: 72, left: 96, fontSize: 15, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex' }}>
        bonsight.co
      </div>
    </div>,
    { ...size }
  );
}
