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
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">OlaClick · SaaS · Food Tech · 10 ${en ? 'countries' : 'países'}</div>
<h1 data-animate data-animate-delay="1">${en ? 'Scalable data infrastructure to grow across 10 countries' : 'Infraestructura de datos escalable para crecer en 10 países'}</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">GA4</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Google Tag Manager</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">BigQuery</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Dashboards</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Lumen</span>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "OlaClick is a restaurant technology platform operating across 10 countries. They had data everywhere — but no unified system to read it. We built their measurement infrastructure from scratch: GA4, Google Tag Manager, and BigQuery working as one source of truth." : 'OlaClick es una plataforma de tecnología para restaurantes con operaciones en 10 países. Tenían datos en todos lados — pero sin un sistema unificado para leerlos. Construimos su infraestructura de medición desde cero: GA4, Google Tag Manager y BigQuery funcionando como una sola fuente de verdad.'}</p>
</div>
</div>

<!-- SITUATION + APPROACH -->
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The situation' : 'La situación'}</div>
<h2 class="case-section-title">${en ? 'Data in silos, decisions by intuition' : 'Datos en silos, decisiones por intuición'}</h2>
<p class="case-body-text">${en ? "OlaClick was scaling fast — new countries, new products, new teams. But their data infrastructure wasn't keeping up. Each market tracked things differently. Reports were manual and slow. Leadership couldn't get a reliable picture of what was actually driving growth." : 'OlaClick estaba escalando rápido — nuevos países, nuevos productos, nuevos equipos. Pero su infraestructura de datos no iba al mismo ritmo. Cada mercado medía las cosas distinto. Los reportes eran manuales y lentos. El liderazgo no podía obtener una imagen confiable de qué estaba impulsando el crecimiento.'}</p>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Inconsistent tracking across markets — no shared event taxonomy' : 'Tracking inconsistente por mercado — sin taxonomía de eventos compartida'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Manual exports to produce each report' : 'Exportaciones manuales para producir cada reporte'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'No clear attribution for acquisition or activation' : 'Sin atribución clara para adquisición ni activación'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Decisions based on incomplete or misaligned data' : 'Decisiones basadas en datos incompletos o desalineados'}</p></div>
</div>
<div class="section-callout">${en ? 'At 10 countries, a measurement problem isn\'t a technical problem — it\'s a strategy problem.' : 'Con 10 países, un problema de medición no es un problema técnico — es un problema de estrategia.'}</div>
</div>
<div>
<div class="eyebrow">${en ? 'Our approach' : 'Nuestro enfoque'}</div>
<h2 class="case-section-title">${en ? 'One source of truth for all markets' : 'Una sola fuente de verdad para todos los mercados'}</h2>
<p class="case-body-text">${en ? "We didn't start by configuring tools. We started by defining what needed to be measured — and why. Then we built the architecture that made that measurement reliable, scalable, and connected." : 'No empezamos configurando herramientas. Empezamos definiendo qué necesitaba medirse — y por qué. Luego construimos la arquitectura que hizo esa medición confiable, escalable y conectada.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Strategy' : 'Estrategia'}</div>
<p>${en ? 'Definition of the event taxonomy and measurement KPIs aligned to OlaClick\'s business objectives across all markets.' : 'Definición de la taxonomía de eventos y los KPIs de medición alineados a los objetivos de negocio de OlaClick en todos los mercados.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">${en ? 'Architecture' : 'Arquitectura'}</div>
<p>${en ? 'GA4 + GTM implementation with unified event structure. BigQuery as the data warehouse. Replication-ready for each new market.' : 'Implementación de GA4 + GTM con estructura de eventos unificada. BigQuery como warehouse de datos. Lista para replicarse en cada nuevo mercado.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">${en ? 'Dashboards' : 'Dashboards'}</div>
<p>${en ? 'Real-time business dashboards connected directly to BigQuery. No manual processing. Ready-to-act insights.' : 'Dashboards de negocio en tiempo real conectados directamente a BigQuery. Sin procesamiento manual. Insights listos para actuar.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- WHAT WE DID -->
<div class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'What we built' : 'Qué construimos'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'A measurement system that scales with the business' : 'Un sistema de medición que escala con el negocio'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Scalable data architecture' : 'Arquitectura de datos escalable'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We designed the data structure that supports regional growth — a clean, consistent collection model that replicates across markets without rebuilding from scratch.' : 'Diseñamos la estructura de datos que soporta el crecimiento regional — un modelo de colección limpio y consistente que se replica entre mercados sin rehacer desde cero.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Key e-commerce events via GTM' : 'Eventos clave de e-commerce vía GTM'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? "We structured and implemented the most relevant e-commerce events via Google Tag Manager, aligned with OlaClick's product funnel — from activation to retention." : "Estructuramos e implementamos los eventos de e-commerce más relevantes vía Google Tag Manager, alineados con el funnel de producto de OlaClick — desde la activación hasta la retención."}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'BigQuery + live dashboards' : 'BigQuery + dashboards en vivo'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We built business dashboards connected directly to BigQuery to visualize key metrics in real time — without manual exports, without data delays.' : 'Construimos dashboards de negocio conectados directamente a BigQuery para visualizar métricas clave en tiempo real — sin exportaciones manuales, sin retrasos en los datos.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'GA4 measurement strategy' : 'Estrategia de medición en GA4'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'GA4 configured with a robust event taxonomy, custom dimensions, and audiences prepared for continuous analysis, A/B testing, and sustained optimization cycles.' : 'GA4 configurado con una taxonomía de eventos robusta, dimensiones personalizadas y audiencias preparadas para análisis continuo, A/B testing y ciclos de optimización sostenida.'}</p></div>
</div>
</div>
</div>

<!-- RESULTS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'Results' : 'Resultados'}</div>
<h2>${en ? 'What changed for OlaClick' : 'Qué cambió para OlaClick'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg></div><h4>${en ? 'Organized and reliable analytical base' : 'Base analítica ordenada y confiable'}</h4><p>${en ? 'Consistent measurement across all markets. One taxonomy. One source of truth.' : 'Medición consistente en todos los mercados. Una taxonomía. Una sola fuente de verdad.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg></div><h4>${en ? 'Real-time dashboards, no manual work' : 'Dashboards en tiempo real, sin trabajo manual'}</h4><p>${en ? 'Data that was previously compiled by hand now updates live, automatically.' : 'Los datos que antes se compilaban a mano ahora se actualizan en vivo, automáticamente.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div><h4>+34% ${en ? 'conversion on activation funnel' : 'de conversión en funnel de activación'}</h4><p>${en ? 'After identifying the highest-value retention segments from real data.' : 'Tras identificar los segmentos de retención de mayor valor a partir de datos reales.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><h4>${en ? 'Architecture ready to scale' : 'Arquitectura lista para escalar'}</h4><p>${en ? 'Each new country joins the same system — no rebuilding, no rework.' : 'Cada nuevo país entra al mismo sistema — sin reconstruir, sin rehacer.'}</p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? "At 10 countries, a data problem stops being a technical problem. It becomes a growth problem. That's what we solved." : 'Con 10 países, un problema de datos deja de ser un problema técnico. Se convierte en un problema de crecimiento. Eso fue lo que resolvimos.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Want to measure better and grow with data?' : '¿Quieres medir mejor y crecer con datos?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function OlaClickPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'OlaClick | Scalable data infrastructure across 10 countries · Bonsight' : 'OlaClick | Infraestructura de datos escalable en 10 países · Bonsight',
    description: en
      ? 'How Bonsight helped OlaClick unify their data measurement across 10 countries with GA4, GTM, and BigQuery — increasing activation conversion by 34%.'
      : 'Cómo Bonsight ayudó a OlaClick a unificar su medición de datos en 10 países con GA4, GTM y BigQuery — aumentando la conversión de activación un 34%.',
  };
}
