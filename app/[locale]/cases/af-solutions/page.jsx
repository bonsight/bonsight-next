import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/cases">← ${en ? 'All cases' : 'Todos los casos'}</button>
<div class="svc-hero-badge" data-animate>
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
<span>${en ? 'Success story' : 'Caso de éxito'}</span>
</div>
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">AF Solutions · E-commerce · ${en ? 'Tools & Hardware · Chile' : 'Herramientas · Chile'}</div>
<h1 data-animate data-animate-delay="1">${en ? 'From invisible to relevant: digital growth for an e-commerce' : 'De invisible a relevante: crecimiento digital para un e-commerce'}</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">SEO</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Google Ads</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Meta Ads</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">CRO</span>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "AF Solutions sells tools and hardware online in Chile. They had traffic but were converting poorly — and didn't know where to invest. We built a complete digital growth system: SEO, paid media, and web conversion optimization working together." : 'AF Solutions vende herramientas y ferretería online en Chile. Tenían tráfico pero convertían poco — y no sabían dónde invertir. Construimos un sistema de crecimiento digital completo: SEO, paid media y optimización de conversión web trabajando juntos.'}</p>
</div>
</div>

<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The situation' : 'La situación'}</div>
<h2 class="case-section-title">${en ? 'Traffic without direction' : 'Tráfico sin dirección'}</h2>
<p class="case-body-text">${en ? "AF Solutions had been investing in digital for months — Google Ads, social media posts, some SEO — but couldn't see clear results. Revenue wasn't growing. Conversion rate was below 1%. And there was no clarity on which channels actually worked." : 'AF Solutions llevaba meses invirtiendo en digital — Google Ads, posts en redes sociales, algo de SEO — pero no veía resultados claros. La facturación no crecía. La tasa de conversión estaba por debajo del 1%. Y no había claridad sobre qué canales funcionaban realmente.'}</p>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Conversion rate below 1% on the main store' : 'Tasa de conversión por debajo del 1% en la tienda principal'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Ads spend with no attributed ROI' : 'Inversión en ads sin ROI atribuido'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'No organic positioning for high-intent keywords' : 'Sin posicionamiento orgánico para palabras clave de alta intención'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'UX with friction points that abandoned carts' : 'UX con puntos de fricción que abandonaban carritos'}</p></div>
</div>
</div>
<div>
<div class="eyebrow">${en ? 'Our approach' : 'Nuestro enfoque'}</div>
<h2 class="case-section-title">${en ? 'System, not isolated tactics' : 'Sistema, no tácticas aisladas'}</h2>
<p class="case-body-text">${en ? "We didn't start by running more ads. We started by understanding where the real problem was." : 'No empezamos corriendo más ads. Empezamos entendiendo dónde estaba el problema real.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Diagnosis' : 'Diagnóstico'}</div>
<p>${en ? 'Full audit of traffic, conversion, UX, and existing campaigns. We identified where revenue was leaking.' : 'Auditoría completa de tráfico, conversión, UX y campañas existentes. Identificamos dónde se perdía la facturación.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">SEO + CRO</div>
<p>${en ? 'We restructured content for high-intent keywords and fixed the conversion friction points on the main pages.' : 'Reestructuramos el contenido para palabras clave de alta intención y corregimos los puntos de fricción de conversión en las páginas principales.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">${en ? 'Paid Media' : 'Paid Media'}</div>
<p>${en ? 'We rebuilt the Google Ads and Meta Ads campaign structure with real attribution and optimized bidding.' : 'Reconstruimos la estructura de campañas de Google Ads y Meta Ads con atribución real y pujas optimizadas.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- PROCESS -->
<div class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'What we did' : 'Qué hicimos'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'An integrated growth system in 90 days' : 'Un sistema de crecimiento integrado en 90 días'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Data architecture' : 'Arquitectura de datos'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'GA4 + GTM configured for real e-commerce tracking: micro-conversions, abandoned cart attribution, channel ROI.' : 'GA4 + GTM configurados para tracking real de e-commerce: micro-conversiones, atribución de carrito abandonado, ROI por canal.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">SEO ${en ? 'and content' : 'y contenido'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Product pages and categories rewritten for high-intent keywords. Technical SEO audit and fix of critical errors.' : 'Páginas de producto y categorías reescritas para palabras clave de alta intención. Auditoría técnica de SEO y corrección de errores críticos.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">CRO</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'A/B tests on main product pages, cart, and checkout. We fixed the main friction points and increased conversion without spending more on traffic.' : 'Tests A/B en páginas de producto principales, carrito y checkout. Corregimos los principales puntos de fricción y aumentamos la conversión sin gastar más en tráfico.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Paid media restructure' : 'Reestructura de paid media'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'New Google Shopping and Search campaign structure. Meta Ads with retargeting and lookalike audiences from real purchase data.' : 'Nueva estructura de campañas de Google Shopping y Search. Meta Ads con retargeting y audiencias lookalike a partir de datos de compra reales.'}</p></div>
</div>
</div>
</div>

<!-- RESULTS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'Results' : 'Resultados'}</div>
<h2>${en ? 'What changed after 90 days' : 'Qué cambió en 90 días'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><h4>${en ? '2.4× more online revenue' : '2.4× más facturación online'}</h4><p>${en ? 'Without proportionally increasing ad spend.' : 'Sin aumentar proporcionalmente el gasto en ads.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div><h4>${en ? 'Conversion rate above 2.8%' : 'Tasa de conversión por encima del 2.8%'}</h4><p>${en ? 'Starting from below 1% at project launch.' : 'Partiendo de menos del 1% al inicio del proyecto.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><h4>${en ? '+180% organic traffic' : '+180% de tráfico orgánico'}</h4><p>${en ? 'Positioning for high-intent transactional keywords.' : 'Posicionando para palabras clave transaccionales de alta intención.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h4>${en ? 'Real ROI per channel' : 'ROI real por canal'}</h4><p>${en ? 'For the first time, the team knew where every peso invested came back from.' : 'Por primera vez, el equipo sabía de dónde regresaba cada peso invertido.'}</p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? 'More ads was not the answer. Clarity on what to do with the traffic we already had was.' : 'Más ads no era la respuesta. La claridad sobre qué hacer con el tráfico que ya teníamos, sí.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Does your e-commerce need results like this?' : '¿Tu e-commerce necesita resultados como estos?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function AFSolutionsPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'AF Solutions | From invisible to relevant · Bonsight' : 'AF Solutions | De invisible a relevante · Bonsight',
    description: en
      ? 'How Bonsight helped AF Solutions grow their e-commerce revenue 2.4× with SEO, paid media, and conversion optimization working as an integrated system.'
      : 'Cómo Bonsight ayudó a AF Solutions a crecer su e-commerce 2.4× con SEO, paid media y optimización de conversión trabajando como un sistema integrado.',
  };
}
