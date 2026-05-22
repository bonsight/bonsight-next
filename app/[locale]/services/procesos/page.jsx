import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path></svg><span>Bonsight Boost</span></div><h1 data-animate data-animate-delay="1">${en ? 'Process Improvement' : 'Mejora de Procesos'}</h1><a class="btn-primary" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer" data-animate data-animate-delay="2">${en ? 'Schedule a call' : 'Agendar llamada'}</a></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We make teams work better. We optimize methodologies and workflows to achieve greater agility, focus, and sustained operational efficiency.' : 'Hacemos que los equipos trabajen mejor. Optimizamos metodologías y flujos de trabajo para lograr mayor agilidad, foco y eficiencia operativa sostenida en el tiempo.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div><div><h4>${en ? 'Current process mapping' : 'Mapeo de procesos actuales'}</h4><p>${en ? 'We document and analyze workflows to identify inefficiencies and bottlenecks.' : 'Documentamos y analizamos flujos de trabajo para identificar ineficiencias y cuellos de botella.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div><div><h4>${en ? 'Methodology redesign' : 'Rediseño de metodologías'}</h4><p>${en ? 'Agile frameworks and best practices adapted to the context and maturity of each team.' : 'Frameworks ágiles y mejores prácticas adaptadas al contexto y madurez de cada equipo.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="8" rx="2" width="20" x="2" y="2"></rect><rect height="8" rx="2" width="20" x="2" y="14"></rect><line x1="6" x2="6.01" y1="6" y2="6"></line><line x1="6" x2="6.01" y1="18" y2="18"></line></svg></div><div><h4>${en ? 'Automation and tools' : 'Automatización y herramientas'}</h4><p>${en ? 'Automation opportunities and selection of the right tools for each process.' : 'Oportunidades de automatización y selección de herramientas adecuadas para cada proceso.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><div><h4>${en ? 'Change management' : 'Gestión del cambio'}</h4><p>${en ? 'We accompany the adoption of new processes for effective and lasting integration.' : 'Acompañamos la adopción de nuevos procesos para una incorporación efectiva y duradera.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Greater efficiency' : 'Mayor eficiencia'}</h4><p>${en ? 'Less time on tasks that add no value, more focus on what matters.' : 'Menos tiempo en tareas que no agregan valor, más foco en lo importante.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Faster deliveries' : 'Entregas más rápidas'}</h4><p>${en ? 'Agile and predictable cycles with less wait time between stages.' : 'Ciclos ágiles y predecibles con menor tiempo de espera entre etapas.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Less internal friction' : 'Menor fricción interna'}</h4><p>${en ? 'Clear processes that reduce confusion, rework, and team conflicts.' : 'Procesos claros que reducen confusión, reprocesos y conflictos de equipo.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Operational scalability' : 'Escalabilidad operativa'}</h4><p>${en ? 'Processes that work the same when the team or business grows.' : 'Procesos que funcionan igual cuando el equipo o el negocio crece.'}</p></div></div></div></div></div>

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
<p class="jc-quote">${en ? 'We understand how your business operates today.' : 'Entendemos cómo opera tu negocio hoy.'}</p>
<p class="jc-desc">${en ? 'We observe processes, tools, data, and critical points to detect real improvement opportunities.' : 'Observamos procesos, herramientas, datos y puntos críticos para detectar oportunidades reales de mejora.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Design' : 'Diseño'}</h4>
<p class="jc-quote">${en ? 'We design a scalable strategy.' : 'Diseñamos una estrategia escalable.'}</p>
<p class="jc-desc">${en ? 'We transform findings into operational and technological models aligned with business objectives.' : 'Transformamos hallazgos en modelos operativos y tecnológicos alineados con los objetivos de negocio.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Implementation' : 'Implementación'}</h4>
<p class="jc-quote">${en ? 'We execute alongside your team.' : 'Ejecutamos junto a tu equipo.'}</p>
<p class="jc-desc">${en ? 'We accompany technical and operational implementation ensuring adoption, continuity, and quality at every stage.' : 'Acompañamos la implementación técnica y operativa asegurando adopción, continuidad y calidad en cada etapa.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Continuous evolution' : 'Evolución continua'}</h4>
<p class="jc-quote">${en ? 'We measure, refine, and optimize.' : 'Medimos, refinamos y optimizamos.'}</p>
<p class="jc-desc">${en ? "The work doesn't end at delivery. We measure real impact and continuously evolve processes with your team." : 'El trabajo no termina en la entrega. Medimos impacto real y evolucionamos continuamente los procesos con tu equipo.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want your team to work better?' : '¿Quieres que tu equipo trabaje mejor?'}</h2><p>${en ? "Let's talk about optimizing the processes that are slowing down growth." : 'Conversemos sobre cómo optimizar los procesos que frenan el crecimiento.'}</p><div class="cta-band-actions"><a class="btn-white" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer">${en ? 'Schedule a call →' : 'Agendar llamada →'}</a><a class="btn-wa-outline" href="${en ? 'https://wa.me/13123509796?text=Hi%2C%20I%20came%20from%20the%20Bonsight%20website%20and%20would%20like%20to%20speak%20with%20the%20team.' : 'https://wa.me/13123509796?text=Hola%2C%20vengo%20del%20sitio%20de%20Bonsight%20y%20quisiera%20hablar%20con%20el%20equipo.'}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div>

${getFooter(locale)}
`;
}

export default async function ProcesosPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
