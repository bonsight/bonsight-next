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
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">Sesuveca · ${en ? 'Automotive · Retail · Venezuela' : 'Automotriz · Retail · Venezuela'}</div>
<h1 data-animate data-animate-delay="1">${en ? 'Digital presence and operational transformation for an automotive leader' : 'Presencia digital y transformación operativa para un líder automotriz'}</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Digital Strategy' : 'Estrategia Digital'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Automation' : 'Automatización'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Web Development' : 'Desarrollo Web'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Arke</span>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "Sesuveca is one of Venezuela's leading automotive and retail companies. They needed to modernize their digital presence, generate qualified leads, and bring order to an operation that had grown without a solid technological foundation." : 'Sesuveca es una de las empresas líderes del sector automotriz y retail en Venezuela. Necesitaban modernizar su presencia digital, generar leads calificados y ordenar una operación que había crecido sin una base tecnológica sólida.'}</p>
</div>
</div>

<!-- SITUATION + APPROACH -->
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The situation' : 'La situación'}</div>
<h2 class="case-section-title">${en ? 'A growing business with an outdated digital presence' : 'Un negocio que crecía con presencia digital desactualizada'}</h2>
<p class="case-body-text">${en ? "Sesuveca had a strong market position built over decades — but their digital presence didn't reflect it. Their website was outdated, they had no lead generation system, and internal processes depended on manual work that slowed the team down." : 'Sesuveca tenía una posición de mercado sólida construida durante décadas — pero su presencia digital no la reflejaba. Su sitio web estaba desactualizado, no tenían sistema de captación de leads y los procesos internos dependían de trabajo manual que frenaba al equipo.'}</p>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Outdated website that didn\'t generate qualified leads' : 'Sitio web desactualizado que no generaba leads calificados'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Existing systems without clear documentation' : 'Sistemas existentes sin documentación clara'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Repetitive manual processes that consumed team time' : 'Procesos manuales repetitivos que consumían tiempo del equipo'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'No digital strategy aligned to business objectives' : 'Sin estrategia digital alineada a objetivos de negocio'}</p></div>
</div>
<div class="section-callout">${en ? 'A strong brand with weak digital infrastructure loses ground to smaller, more agile competitors.' : 'Una marca fuerte con infraestructura digital débil pierde terreno frente a competidores más pequeños y ágiles.'}</div>
</div>
<div>
<div class="eyebrow">${en ? 'Our approach' : 'Nuestro enfoque'}</div>
<h2 class="case-section-title">${en ? 'Digital and operational transformation in parallel' : 'Transformación digital y operativa en paralelo'}</h2>
<p class="case-body-text">${en ? "We worked on two fronts simultaneously: the external one (digital presence and lead generation) and the internal one (process documentation and automation). Both needed each other to generate real impact." : 'Trabajamos en dos frentes simultáneamente: el externo (presencia digital y captación de leads) y el interno (documentación y automatización de procesos). Ambos se necesitaban para generar impacto real.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Diagnosis' : 'Diagnóstico'}</div>
<p>${en ? 'Technical audit of existing systems, workflows, and technology architecture. Identification of gaps and critical opportunities.' : 'Auditoría técnica de sistemas existentes, flujos de trabajo y arquitectura tecnológica. Identificación de brechas y oportunidades críticas.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">${en ? 'Digital presence' : 'Presencia digital'}</div>
<p>${en ? 'New website designed to convert and generate qualified leads. Digital strategy aligned to the sales cycle.' : 'Nuevo sitio web diseñado para convertir y generar leads calificados. Estrategia digital alineada al ciclo de ventas.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">${en ? 'Automation' : 'Automatización'}</div>
<p>${en ? 'Documentation of critical systems and automation of repetitive tasks to free up team time for higher-value work.' : 'Documentación de sistemas críticos y automatización de tareas repetitivas para liberar tiempo del equipo para trabajo de mayor valor.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- WHAT WE DID -->
<div class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'What we did' : 'Qué hicimos'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'From diagnosis to active execution' : 'Del diagnóstico a la ejecución activa'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Technical assessment and diagnosis' : 'Levantamiento técnico y diagnóstico'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We surveyed existing systems, workflows, and technology architecture to identify gaps, critical dependencies, and improvement opportunities.' : 'Relevamos los sistemas existentes, flujos de trabajo y arquitectura tecnológica para identificar brechas, dependencias críticas y oportunidades de mejora.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'System documentation' : 'Documentación de sistemas'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We generated clear technical documentation of systems and processes in use, establishing a knowledge base that reduces dependence on specific key individuals.' : 'Generamos documentación técnica clara de los sistemas y procesos en uso, estableciendo una base de conocimiento que reduce la dependencia de personas clave específicas.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Web and digital strategy' : 'Web y estrategia digital'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'New website designed to generate qualified leads, with digital strategy and content aligned to the automotive sales cycle.' : 'Nuevo sitio web diseñado para generar leads calificados, con estrategia digital y contenido alineado al ciclo de ventas automotriz.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Process automation' : 'Automatización de procesos'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We identified and automated repetitive manual tasks, freeing up team time for higher-value strategic work and reducing operational friction.' : 'Identificamos y automatizamos tareas manuales repetitivas, liberando tiempo del equipo para trabajo estratégico de mayor valor y reduciendo la fricción operativa.'}</p></div>
</div>
</div>
</div>

<!-- RESULTS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'Results' : 'Resultados'}</div>
<h2>${en ? 'What changed for Sesuveca' : 'Qué cambió para Sesuveca'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div><h4>${en ? 'Digital presence that reflects the brand' : 'Presencia digital que refleja la marca'}</h4><p>${en ? 'A website that generates qualified leads and matches the company\'s real market position.' : 'Un sitio web que genera leads calificados y refleja la posición real de la empresa en el mercado.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg></div><h4>${en ? 'Automated processes, less manual work' : 'Procesos automatizados, menos trabajo manual'}</h4><p>${en ? 'Tasks that took hours now run automatically — with less error and more speed.' : 'Tareas que tardaban horas ahora corren automáticamente — con menos error y más velocidad.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h4>${en ? 'Documented systems, less critical dependency' : 'Sistemas documentados, menos dependencia crítica'}</h4><p>${en ? 'A knowledge base that reduces the risk of operations depending on specific individuals.' : 'Una base de conocimiento que reduce el riesgo de que la operación dependa de personas específicas.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><h4>${en ? 'Solid foundation to keep growing' : 'Base sólida para seguir creciendo'}</h4><p>${en ? 'A technological and operational platform ready to evolve: more scalable, more sustainable.' : 'Una plataforma tecnológica y operativa lista para evolucionar: más escalable, más sostenible.'}</p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? "A strong brand deserves a digital presence that matches it. That was what Sesuveca needed — and what we built." : 'Una marca fuerte merece una presencia digital que la iguale. Eso era lo que Sesuveca necesitaba — y lo que construimos.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Does your company need to modernize its digital presence?' : '¿Tu empresa necesita modernizar su presencia digital?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function SesuvecaPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Sesuveca | Digital presence and operational transformation · Bonsight' : 'Sesuveca | Presencia digital y transformación operativa · Bonsight',
    description: en
      ? 'How Bonsight helped Sesuveca modernize their digital presence, generate qualified leads, and automate internal processes — building a foundation for sustainable growth.'
      : 'Cómo Bonsight ayudó a Sesuveca a modernizar su presencia digital, generar leads calificados y automatizar procesos internos — construyendo una base para el crecimiento sostenible.',
  };
}
