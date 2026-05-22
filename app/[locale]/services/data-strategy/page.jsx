import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><rect height="7" width="7" x="3" y="3"></rect><rect height="7" width="7" x="14" y="3"></rect><rect height="7" width="7" x="3" y="14"></rect><rect height="7" width="7" x="14" y="14"></rect></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">Data Strategy</h1><a class="btn-primary" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer" data-animate data-animate-delay="2">${en ? 'Schedule a call' : 'Agendar llamada'}</a></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We create data strategies that drive intelligent decisions. We ensure quality and consistency to optimize processes, reduce risks, and enable sustainable growth.' : 'Creamos estrategias de datos que impulsan decisiones inteligentes. Garantizamos calidad y consistencia para optimizar procesos, reducir riesgos y habilitar un crecimiento sostenible.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div><div><h4>${en ? 'Data audit and diagnosis' : 'Auditoría y diagnóstico de datos'}</h4><p>${en ? 'We evaluate sources, quality, consistency, and critical gaps that limit decision-making.' : 'Evaluamos fuentes, calidad, consistencia y gaps críticos que limitan la toma de decisiones.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></div><div><h4>${en ? 'Data architecture' : 'Arquitectura de datos'}</h4><p>${en ? 'Technical infrastructure suited to your current maturity and future scale objectives.' : 'Infraestructura técnica adecuada para tu madurez actual y tus objetivos de escala futura.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div><h4>${en ? 'KPI and metrics definition' : 'Definición de KPIs y métricas'}</h4><p>${en ? 'Metrics system aligned to business objectives so every team speaks the same language.' : 'Sistema de métricas alineado a los objetivos del negocio para que cada equipo hable el mismo idioma.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><div><h4>${en ? 'Data governance' : 'Gobierno de datos'}</h4><p>${en ? 'Policies and processes to ensure quality, privacy, and accessibility of data across the organization.' : 'Políticas y procesos para garantizar calidad, privacidad y accesibilidad de los datos en la organización.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Faster decisions' : 'Decisiones más rápidas'}</h4><p>${en ? 'Reliable, accessible data for the entire team in real time.' : 'Datos confiables y accesibles para todo el equipo en tiempo real.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Risk reduction' : 'Reducción de riesgos'}</h4><p>${en ? 'Less operational uncertainty thanks to verified quality information.' : 'Menor incertidumbre operativa gracias a información de calidad contrastada.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Technical scalability' : 'Escalabilidad técnica'}</h4><p>${en ? 'Infrastructure that grows with your business without friction or technical debt.' : 'Infraestructura que crece con tu negocio sin fricciones ni deuda técnica.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Aligned teams' : 'Equipos alineados'}</h4><p>${en ? 'Shared metrics and collective focus on what truly matters to the business.' : 'Métricas compartidas y foco colectivo en lo que realmente importa al negocio.'}</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">${en ? 'Process' : 'Proceso'}</div>
<h2 class="jc-heading">${en ? 'How we work' : 'Cómo trabajamos'}</h2>
</div>
<div class="jc-grid">
<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg></div>
<h4 class="jc-title">${en ? 'Diagnosis' : 'Diagnóstico'}</h4>
<p class="jc-quote">${en ? 'We map your current data and its critical gaps.' : 'Mapeamos tus datos actuales y sus gaps críticos.'}</p>
<p class="jc-desc">${en ? 'We map current data sources and evaluate analytical maturity to identify opportunities.' : 'Mapeamos fuentes de datos actuales y evaluamos madurez analítica para identificar oportunidades.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg></div>
<h4 class="jc-title">${en ? 'Strategy' : 'Estrategia'}</h4>
<p class="jc-quote">${en ? 'We define the data roadmap with clear criteria.' : 'Definimos el roadmap de datos con criterios claros.'}</p>
<p class="jc-desc">${en ? 'We design the data roadmap with priorities and success criteria aligned to the business.' : 'Diseñamos el roadmap de datos con prioridades y criterios de éxito alineados al negocio.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Implementation' : 'Implementación'}</h4>
<p class="jc-quote">${en ? 'We support technical execution with your team.' : 'Acompañamos la ejecución técnica con tu equipo.'}</p>
<p class="jc-desc">${en ? 'We accompany technical execution and integrate with existing teams at every stage.' : 'Acompañamos la ejecución técnica e integramos con los equipos existentes en cada etapa.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
<h4 class="jc-title">${en ? 'Measurement' : 'Medición'}</h4>
<p class="jc-quote">${en ? 'We validate results and continuously adjust.' : 'Validamos resultados y ajustamos continuamente.'}</p>
<p class="jc-desc">${en ? 'We validate results against success criteria and continuously adjust the strategy.' : 'Validamos resultados contra los criterios de éxito y ajustamos la estrategia de forma continua.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want to organize your data?' : '¿Quieres ordenar tus datos?'}</h2><p>${en ? "Let's talk about how a data strategy can transform your business." : 'Conversemos sobre cómo una estrategia de datos puede transformar tu negocio.'}</p><div class="cta-band-actions"><a class="btn-white" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer">${en ? 'Schedule a call →' : 'Agendar llamada →'}</a><a class="btn-wa-outline" href="${en ? 'https://wa.me/13123509796?text=Hi%2C%20I%20came%20from%20the%20Bonsight%20website%20and%20would%20like%20to%20speak%20with%20the%20team.' : 'https://wa.me/13123509796?text=Hola%2C%20vengo%20del%20sitio%20de%20Bonsight%20y%20quisiera%20hablar%20con%20el%20equipo.'}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div>

${getFooter(locale)}
`;
}

export default async function DataStrategyPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
