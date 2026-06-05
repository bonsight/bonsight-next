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
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
<span>Lumen</span>
</div>
<h1 data-animate data-animate-delay="1">${en ? 'Your business generates data every day. The problem is you\'re not using it.' : 'Tu negocio genera datos todos los días. El problema es que no los estás usando.'}</h1>
<div class="svc-hero-actions" data-animate data-animate-delay="2">
<button class="btn-primary" data-route="/consulta">${en ? "Let's talk" : 'Conversemos'}</button>
<button class="btn-outline" data-scroll="#lumen-how">${en ? 'See how it works' : 'Ver cómo funciona'}</button>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "Most businesses have more data than they know what to do with — and yet make decisions based on intuition, spreadsheets, and gut feeling. Lumen turns your data into a real growth system: strategy, measurement, and conversion working together." : 'La mayoría de los negocios tienen más datos de los que saben qué hacer con ellos — y aun así toman decisiones basadas en intuición, hojas de cálculo y corazonadas. Lumen convierte tus datos en un sistema real de crecimiento: estrategia, medición y conversión trabajando juntas.'}</p>
</div>
</div>

<!-- PROBLEM + WHAT IS LUMEN -->
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The problem' : 'El problema'}</div>
<h2 class="case-section-title">${en ? 'Does any of this sound familiar?' : '¿Te suena alguno de estos?'}</h2>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'You have Google Analytics, but decisions don\'t change based on it' : 'Tienes Google Analytics, pero las decisiones no cambian basándose en él'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'You invest in ads without knowing what actually generates revenue' : 'Inviertes en ads sin saber qué genera rentabilidad real'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Reports exist but no one reads them or acts on them' : 'Hay reportes pero nadie los lee ni actúa sobre ellos'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Your website converts poorly and you don\'t know why' : 'Tu web convierte poco y no sabes por qué'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Each team has their own version of the numbers' : 'Cada equipo tiene su propia versión de los números'}</p></div>
</div>
<div class="section-callout">${en ? 'The problem is not a lack of data. It\'s that the data you have isn\'t structured to be useful.' : 'El problema no es falta de datos. Es que los datos que tienes no están estructurados para ser útiles.'}</div>
</div>
<div>
<div class="eyebrow">${en ? 'What is Lumen' : 'Qué es Lumen'}</div>
<h2 class="case-section-title">${en ? 'Lumen is data intelligence applied to growth' : 'Lumen es inteligencia de datos aplicada al crecimiento'}</h2>
<p class="case-body-text">${en ? "Lumen is not a dashboard or a report. It's a complete methodology that unites data strategy, growth analytics, and conversion optimization to make your data actually useful." : 'Lumen no es un dashboard ni un reporte. Es una metodología completa que une estrategia de datos, analítica de crecimiento y optimización de conversión para que tus datos sean realmente útiles.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Data Strategy' : 'Data Strategy'}</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Define what to measure, why, and how. We connect your tools and create a unified data architecture.' : 'Definir qué medir, por qué y cómo. Conectamos tus herramientas y creamos una arquitectura de datos unificada.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">${en ? 'Growth Analytics' : 'Growth Analytics'}</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Read patterns, find growth levers, and produce actionable insights — not just descriptions.' : 'Leer patrones, encontrar palancas de crecimiento y producir insights accionables — no solo descripciones.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">CRO</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Turn the same traffic into more conversions. Structured testing on pages, flows, and messages.' : 'Convertir el mismo tráfico en más conversiones. Tests estructurados sobre páginas, flujos y mensajes.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- WHO IT'S FOR -->
<div class="about-wrap">
<div class="about-inner">
<div class="about-text-block" data-animate>
<div class="eyebrow">${en ? 'Who it\'s for' : 'Para quién es'}</div>
<h2>${en ? 'Lumen is for you if...' : 'Lumen es para ti si...'}</h2>
<p>${en ? "Lumen is for teams that want to stop making guesses and start making decisions based on real evidence." : 'Lumen es para equipos que quieren dejar de hacer suposiciones y empezar a tomar decisiones basadas en evidencia real.'}</p>
</div>
<div class="about-pills">
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><div class="pill-text"><h4>${en ? 'E-commerce or digital product' : 'E-commerce o producto digital'}</h4><p>${en ? 'With traffic but wanting to improve conversion.' : 'Con tráfico pero que quiere mejorar la conversión.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="pill-text"><h4>${en ? 'B2B company with long sales cycles' : 'Empresa B2B con ciclos de venta largos'}</h4><p>${en ? 'Where funnel visibility is critical to optimize sales.' : 'Donde la visibilidad del funnel es crítica para optimizar ventas.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="pill-text"><h4>${en ? 'Marketing team that runs campaigns' : 'Equipo de marketing que maneja campañas'}</h4><p>${en ? 'And needs to prove ROI with real attribution.' : 'Y necesita demostrar ROI con atribución real.'}</p></div></div>
</div>
</div>
</div>

<!-- HOW IT WORKS -->
<div id="lumen-how" class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'How it works' : 'Cómo funciona'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'From zero to visibility in 8 weeks' : 'De cero a visibilidad en 8 semanas'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Weeks 1–2: Audit and diagnosis' : 'Semanas 1–2: Auditoría y diagnóstico'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We review your current tracking, tools, and data flows. We identify gaps, errors, and opportunities.' : 'Revisamos tu tracking actual, herramientas y flujos de datos. Identificamos gaps, errores y oportunidades.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Weeks 3–4: Implementation and connection' : 'Semanas 3–4: Implementación y conexión'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We set up the tracking architecture, connect tools, and create the dashboards that actually get used.' : 'Configuramos la arquitectura de tracking, conectamos herramientas y creamos los dashboards que realmente se usan.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden;grid-column:1/-1"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Weeks 5–8: Analysis, testing, and optimization' : 'Semanas 5–8: Análisis, pruebas y optimización'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative;max-width:640px">${en ? 'We read patterns, identify growth levers, and run structured conversion tests. Each cycle generates learning that compounds.' : 'Leemos patrones, identificamos palancas de crecimiento y corremos pruebas estructuradas de conversión. Cada ciclo genera aprendizaje que se acumula.'}</p></div>
</div>
</div>
</div>

<!-- WHAT CHANGES -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'After Lumen' : 'Después de Lumen'}</div>
<h2>${en ? 'What changes after Lumen' : 'Qué cambia después de Lumen'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div><h4>${en ? 'A single source of truth for your data' : 'Una sola fuente de verdad para tus datos'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><h4>${en ? 'Decisions grounded in real evidence' : 'Decisiones basadas en evidencia real'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg></div><h4>${en ? 'More conversions from the same traffic' : 'Más conversiones del mismo tráfico'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div><h4>${en ? 'Visibility into what actually drives growth' : 'Visibilidad de qué mueve realmente el crecimiento'}</h4><p></p></div>
</div>
</div>
</div>

<!-- REAL CASE -->
<div class="band-dark">
<div class="band-dark-inner">
<div>
<div class="eyebrow" style="color:var(--accent)">${en ? 'Real case' : 'Caso real'}</div>
<h2 style="font-family:var(--serif);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;color:var(--white);margin:1rem 0 1.5rem;letter-spacing:-0.025em">OlaClick</h2>
<p style="color:rgba(255,255,255,0.65);font-size:1rem;line-height:1.82;max-width:540px">${en ? 'A restaurant tech platform with operations across 10 countries. Lumen helped them build a unified data infrastructure, identify the most profitable retention segments, and increase conversion by 34% on their activation funnel.' : 'Una plataforma de tecnología para restaurantes con operaciones en 10 países. Lumen los ayudó a construir una infraestructura de datos unificada, identificar los segmentos de retención más rentables y aumentar la conversión un 34% en su funnel de activación.'}</p>
<button class="btn-outline" style="margin-top:2rem" data-route="/cases/olaclick">${en ? 'See full case' : 'Ver caso completo'}</button>
</div>
<div class="band-dark-right">
<div class="band-stat"><span class="band-stat-num">34%</span><span class="band-stat-label">${en ? 'conversion increase' : 'aumento en conversión'}</span></div>
<div class="band-stat"><span class="band-stat-num">10</span><span class="band-stat-label">${en ? 'countries with unified data' : 'países con datos unificados'}</span></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? "We don't sell dashboards. We sell clarity. Knowing what's working and what isn't is worth more than any technology." : 'No vendemos dashboards. Vendemos claridad. Saber qué funciona y qué no vale más que cualquier tecnología.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Ready to see what your business is telling you?' : '¿Listo para ver lo que tu negocio te está diciendo?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function LumenPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Lumen | Data intelligence for real growth' : 'Lumen | Inteligencia de datos para el crecimiento real',
    description: en
      ? "Lumen turns your data into a real growth system. Data strategy, growth analytics, and CRO working together to make your decisions smarter."
      : 'Lumen convierte tus datos en un sistema real de crecimiento. Estrategia de datos, analítica de crecimiento y CRO trabajando juntos para que tus decisiones sean más inteligentes.',
  };
}
