import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-animate data-route="/">← ${en ? 'Back' : 'Volver al inicio'}</button>
<div class="svc-hero-badge" data-animate>
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
<span>${en ? 'Success story' : 'Caso de éxito'}</span>
</div>
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">SESUVECA DEL PERÚ · ${en ? 'Mining' : 'Minería'}</div>
<h1 data-animate data-animate-delay="1">${en ? 'Technological transformation for a more efficient operation' : 'Transformación tecnológica para una operación más eficiente'}</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Technical assessment' : 'Levantamiento técnico'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Automation' : 'Automatización'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Specialized development' : 'Desarrollo especializado'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'IT Strategy' : 'Estrategia TI'}</span>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We accompanied Sesuveca through a technological and operational transformation process focused on efficiency, scalability, and sustainability — from initial diagnosis to the implementation of new digital capabilities.' : 'Acompañamos a Sesuveca en un proceso de transformación tecnológica y operativa enfocado en eficiencia, escalabilidad y sostenibilidad — desde el diagnóstico inicial hasta la implementación de nuevas capacidades digitales.'}</p>
</div>
</div>

<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The work' : 'El trabajo'}</div>
<h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">${en ? 'What we did together' : 'Qué hicimos juntos'}</h2>
<div class="svc-items-list">
<div class="svc-item" data-animate>
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div>
<div><h4>${en ? 'Technical assessment and diagnosis' : 'Levantamiento técnico y diagnóstico'}</h4><p>${en ? 'We surveyed existing systems, workflows, and technology architecture to identify gaps, critical dependencies, and improvement opportunities.' : 'Relevamos los sistemas existentes, flujos de trabajo y arquitectura tecnológica para identificar brechas, dependencias críticas y oportunidades de mejora.'}</p></div>
</div>
<div class="svc-item" data-animate>
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg></div>
<div><h4>${en ? 'Documentation of existing systems' : 'Documentación de sistemas existentes'}</h4><p>${en ? 'We generated clear technical documentation of systems and processes in use, establishing a knowledge base that reduces dependence on key individuals.' : 'Generamos documentación técnica clara de los sistemas y procesos en uso, estableciendo una base de conocimiento que reduce la dependencia de personas clave.'}</p></div>
</div>
<div class="svc-item" data-animate>
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
<div><h4>${en ? 'Specialized development integration' : 'Incorporación de desarrollo especializado'}</h4><p>${en ? 'We added specialized technical capacity to implement concrete improvements in platforms and internal systems, aligned with the business technology vision.' : 'Sumamos capacidad técnica especializada para implementar mejoras concretas en plataformas y sistemas internos, alineadas con la visión tecnológica del negocio.'}</p></div>
</div>
<div class="svc-item" data-animate>
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div>
<div><h4>${en ? 'Internal process automation' : 'Automatización de procesos internos'}</h4><p>${en ? 'We identified and automated repetitive and manual tasks, freeing up team time for higher-value strategic work.' : 'Identificamos y automatizamos tareas repetitivas y manuales, liberando tiempo del equipo para trabajo de mayor valor estratégico.'}</p></div>
</div>
</div>
</div>

<div class="outcomes-panel">
<h3>${en ? 'The result' : 'El resultado'}</h3>
<div class="outcome-item" data-animate>
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>${en ? 'More organized operation' : 'Operación más organizada'}</h4><p>${en ? 'Documented systems, standardized processes, and defined workflows that reduce day-to-day operational friction.' : 'Sistemas documentados, procesos estandarizados y flujos de trabajo definidos que reducen la fricción operativa del día a día.'}</p></div>
</div>
<div class="outcome-item" data-animate>
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>${en ? 'More efficient processes' : 'Procesos más eficientes'}</h4><p>${en ? 'Tasks that previously required hours of manual work are now executed automatically, with greater speed and fewer errors.' : 'Tareas que antes demandaban horas de trabajo manual ahora se ejecutan automáticamente, con mayor velocidad y menos errores.'}</p></div>
</div>
<div class="outcome-item" data-animate>
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>${en ? 'Less manual dependency' : 'Menor dependencia manual'}</h4><p>${en ? 'Automation and documentation reduced dependence on specific individuals to sustain critical operations.' : 'La automatización y documentación redujeron la dependencia de personas específicas para sostener operaciones críticas.'}</p></div>
</div>
<div class="outcome-item" data-animate>
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>${en ? 'Solid foundation to grow' : 'Base sólida para crecer'}</h4><p>${en ? 'A technological and operational platform ready to evolve: more scalable, more sustainable, and aligned with business growth.' : 'Una plataforma tecnológica y operativa lista para evolucionar: más escalable, más sostenible y alineada con el crecimiento del negocio.'}</p></div>
</div>
</div>
</div>
</div>

<div class="cta-band" data-animate>
<h2>${en ? 'Does your company need to organize its operation?' : '¿Tu empresa necesita ordenar su operación?'}</h2>
<p>${en ? 'We accompany technological transformation processes with a focus on real efficiency and sustainable results.' : 'Acompañamos procesos de transformación tecnológica con foco en eficiencia real y resultados sostenibles.'}</p>
<button class="btn-white" data-route="/#contacto">${en ? "Let's talk →" : 'Conversemos →'}</button>
</div>

${getFooter(locale)}
`;
}

export default async function SesuvecaPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
