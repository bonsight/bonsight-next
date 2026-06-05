import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button>
<div class="svc-hero-badge" data-animate>
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
<span>${en ? 'Cases' : 'Casos'}</span>
</div>
<h1 data-animate data-animate-delay="1">${en ? 'Real results with real companies' : 'Resultados reales con empresas reales'}</h1>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We work alongside the business, not from the outside. Each case is the result of deep collaboration — strategy, data, and execution moving together.' : 'Trabajamos junto al negocio, no desde afuera. Cada caso es el resultado de colaboración profunda — estrategia, datos y ejecución moviéndose juntos.'}</p>
</div>
</div>

<div class="svc-body">
<div style="max-width:1100px;margin:0 auto;padding:4rem 2rem">

<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(0,0,0,0.08)" class="cases-index-grid">

<!-- OlaClick -->
<div class="case-index-card" data-animate data-route="/cases/olaclick" style="cursor:pointer;background:var(--white);padding:2.5rem 2rem;position:relative;overflow:hidden;transition:box-shadow 0.2s">
<div style="font-family:var(--mono);font-size:0.62rem;color:rgba(0,0,0,0.35);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem">SaaS · Food Tech · 10 países</div>
<div class="case-card-logo" style="margin-bottom:1.25rem;filter:none">
<svg width="110" height="28" viewbox="0 0 110 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="22" font-family="var(--mono)" font-size="20" font-weight="700" fill="var(--dark2)">OlaClick</text>
</svg>
</div>
<h3 style="font-family:var(--serif);font-size:1.3rem;font-weight:400;color:var(--dark2);margin-bottom:0.75rem;letter-spacing:-0.02em">${en ? 'Scalable digital measurement to grow with data' : 'Medición digital escalable para crecer con datos'}</h3>
<p style="font-size:0.875rem;color:rgba(0,0,0,0.55);line-height:1.75;margin-bottom:1.5rem">${en ? 'GA4, BigQuery, and dashboards that centralize information across 10 countries in real time.' : 'GA4, BigQuery y dashboards que centralizan la información de 10 países en tiempo real.'}</p>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Lumen</span>
</div>
<span style="font-family:var(--mono);font-size:0.7rem;color:var(--accent);letter-spacing:0.08em">${en ? 'Read case →' : 'Ver caso →'}</span>
</div>

<!-- Sesuveca -->
<div class="case-index-card" data-animate data-animate-delay="1" data-route="/cases/sesuveca" style="cursor:pointer;background:var(--white);padding:2.5rem 2rem;position:relative;overflow:hidden;transition:box-shadow 0.2s">
<div style="font-family:var(--mono);font-size:0.62rem;color:rgba(0,0,0,0.35);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem">${en ? 'Automotive · Retail · Venezuela' : 'Automotriz · Retail · Venezuela'}</div>
<div class="case-card-logo" style="margin-bottom:1.25rem;filter:none">
<svg width="120" height="28" viewbox="0 0 120 28" fill="none" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="22" font-family="var(--mono)" font-size="18" font-weight="700" fill="var(--dark2)">Sesuveca</text>
</svg>
</div>
<h3 style="font-family:var(--serif);font-size:1.3rem;font-weight:400;color:var(--dark2);margin-bottom:0.75rem;letter-spacing:-0.02em">${en ? 'Digital presence and conversion for an automotive leader' : 'Presencia digital y conversión para un líder automotriz'}</h3>
<p style="font-size:0.875rem;color:rgba(0,0,0,0.55);line-height:1.75;margin-bottom:1.5rem">${en ? 'Digital strategy and web development to generate qualified leads in a highly competitive market.' : 'Estrategia digital y desarrollo web para generar leads calificados en un mercado altamente competitivo.'}</p>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Arke</span>
</div>
<span style="font-family:var(--mono);font-size:0.7rem;color:var(--accent);letter-spacing:0.08em">${en ? 'Read case →' : 'Ver caso →'}</span>
</div>

<!-- AF Solutions -->
<div class="case-index-card" data-animate data-animate-delay="2" data-route="/cases/af-solutions" style="cursor:pointer;background:var(--white);padding:2.5rem 2rem;position:relative;overflow:hidden;transition:box-shadow 0.2s">
<div style="font-family:var(--mono);font-size:0.62rem;color:rgba(0,0,0,0.35);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem">E-commerce · ${en ? 'Tools & Hardware · Chile' : 'Herramientas · Chile'}</div>
<div class="case-card-logo" style="margin-bottom:1.25rem;filter:none">
<div style="font-family:var(--mono);font-size:1.1rem;font-weight:700;color:var(--dark2);letter-spacing:-0.01em">AF Solutions</div>
</div>
<h3 style="font-family:var(--serif);font-size:1.3rem;font-weight:400;color:var(--dark2);margin-bottom:0.75rem;letter-spacing:-0.02em">${en ? 'From invisible to relevant: digital growth for an e-commerce' : 'De invisible a relevante: crecimiento digital para un e-commerce'}</h3>
<p style="font-size:0.875rem;color:rgba(0,0,0,0.55);line-height:1.75;margin-bottom:1.5rem">${en ? 'SEO, paid media, and web optimization to capture organic demand and improve online conversion.' : 'SEO, paid media y optimización web para capturar demanda orgánica y mejorar la conversión online.'}</p>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Arke</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Lumen</span>
</div>
<span style="font-family:var(--mono);font-size:0.7rem;color:var(--accent);letter-spacing:0.08em">${en ? 'Read case →' : 'Ver caso →'}</span>
</div>

<!-- Activo 100x100 -->
<div class="case-index-card" data-animate data-animate-delay="3" data-route="/cases/activo-100x100" style="cursor:pointer;background:var(--white);padding:2.5rem 2rem;position:relative;overflow:hidden;transition:box-shadow 0.2s">
<div style="font-family:var(--mono);font-size:0.62rem;color:rgba(0,0,0,0.35);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem">${en ? 'Real Estate · Investment · Venezuela' : 'Inmobiliaria · Inversión · Venezuela'}</div>
<div class="case-card-logo" style="margin-bottom:1.25rem;filter:none">
<div style="font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--dark2);letter-spacing:-0.01em">Activo 100×100</div>
</div>
<h3 style="font-family:var(--serif);font-size:1.3rem;font-weight:400;color:var(--dark2);margin-bottom:0.75rem;letter-spacing:-0.02em">${en ? 'Brand building and digital sales for real estate investments' : 'Construcción de marca y ventas digitales para inversiones inmobiliarias'}</h3>
<p style="font-size:0.875rem;color:rgba(0,0,0,0.55);line-height:1.75;margin-bottom:1.5rem">${en ? 'Digital strategy, content, and paid media to position a new real estate investment brand.' : 'Estrategia digital, contenido y paid media para posicionar una nueva marca de inversión inmobiliaria.'}</p>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.5rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Arke</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.2);padding:0.25rem 0.6rem">Kairo</span>
</div>
<span style="font-family:var(--mono);font-size:0.7rem;color:var(--accent);letter-spacing:0.08em">${en ? 'Read case →' : 'Ver caso →'}</span>
</div>

</div>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Does your business need this kind of results?' : '¿Tu negocio necesita este tipo de resultados?'}</h2>
<p>${en ? "Let's talk about what we can build together." : 'Conversemos sobre lo que podemos construir juntos.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function CasesPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Cases | Real results with real companies · Bonsight' : 'Casos | Resultados reales con empresas reales · Bonsight',
    description: en
      ? 'Explore how Bonsight has helped companies like OlaClick, Sesuveca, AF Solutions, and Activo 100x100 grow with strategy, data, and integrated execution.'
      : 'Conoce cómo Bonsight ha ayudado a empresas como OlaClick, Sesuveca, AF Solutions y Activo 100x100 a crecer con estrategia, datos y ejecución integrada.',
  };
}
