import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><span>Bonsight Boost</span></div><h1 data-animate data-animate-delay="1">${en ? 'Team Mentoring' : 'Mentoring de Equipos'}</h1><button class="btn-primary" data-animate data-animate-delay="2" data-route="/#contacto">${en ? "Let's Talk" : 'Conversemos'}</button></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We drive team autonomy and quality. We accompany with continuous feedback and strategic guidance to strengthen capabilities and build high-performance teams.' : 'Impulsamos la autonomía y la calidad de los equipos. Acompañamos con feedback continuo y guía estratégica para fortalecer capacidades y construir equipos de alto rendimiento.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg></div><div><h4>${en ? 'Team maturity diagnosis' : 'Diagnóstico de madurez del equipo'}</h4><p>${en ? 'We evaluate skills, dynamics, and gaps to design a personalized development plan.' : 'Evaluamos habilidades, dinámicas y brechas para diseñar un plan de desarrollo personalizado.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div><div><h4>${en ? 'Individual and group mentoring sessions' : 'Sesiones de mentoring individual y grupal'}</h4><p>${en ? 'Structured feedback, guidance, and key competency development sessions.' : 'Sesiones estructuradas de feedback, orientación y desarrollo de competencias clave.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"></rect><line x1="8" x2="16" y1="21" y2="21"></line></svg></div><div><h4>${en ? 'Technical capability development' : 'Desarrollo de capacidades técnicas'}</h4><p>${en ? 'Training in digital analytics, data tools, and technical best practices.' : 'Formación en analítica digital, herramientas de datos y buenas prácticas técnicas.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="12" x2="12" y1="20" y2="10"></line><line x1="18" x2="18" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="16"></line></svg></div><div><h4>${en ? 'Career and growth plan' : 'Plan de carrera y crecimiento'}</h4><p>${en ? 'Clear trajectories for each member aligned with organizational objectives.' : 'Trayectorias claras para cada miembro alineadas con los objetivos de la organización.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Greater autonomy' : 'Mayor autonomía'}</h4><p>${en ? 'Teams that make better decisions independently and consistently.' : 'Equipos que toman mejores decisiones de forma independiente y consistente.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Better performance' : 'Mejor desempeño'}</h4><p>${en ? 'Measurable improvement in work quality and execution speed.' : 'Elevación medible en calidad del trabajo y velocidad de ejecución.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Talent retention' : 'Retención de talento'}</h4><p>${en ? 'People who develop and choose to stay in the organization.' : 'Personas que se desarrollan y eligen quedarse en la organización.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Learning culture' : 'Cultura de aprendizaje'}</h4><p>${en ? 'Teams that continuously learn and adapt better to change.' : 'Equipos que aprenden continuamente y se adaptan mejor al cambio.'}</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">${en ? 'Process' : 'Proceso'}</div>
<h2 class="jc-heading">${en ? 'How we work' : 'Cómo trabajamos'}</h2>
</div>
<div class="jc-grid">
<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Assessment' : 'Evaluación'}</h4>
<p class="jc-quote">${en ? "We diagnose the team's skills and dynamics." : 'Diagnosticamos habilidades y dinámicas del equipo.'}</p>
<p class="jc-desc">${en ? "Deep diagnosis of skills, internal dynamics, and the team's growth objectives." : 'Diagnóstico profundo de habilidades, dinámicas internas y objetivos de crecimiento del equipo.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
<h4 class="jc-title">${en ? 'Plan' : 'Plan'}</h4>
<p class="jc-quote">${en ? 'We design the program adapted to each context.' : 'Diseñamos el programa adaptado a cada contexto.'}</p>
<p class="jc-desc">${en ? 'Personalized mentoring program adapted to the specific needs of each team.' : 'Programa de mentoring personalizado adaptado a las necesidades específicas de cada equipo.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
<h4 class="jc-title">${en ? 'Accompaniment' : 'Acompañamiento'}</h4>
<p class="jc-quote">${en ? 'Continuous feedback and tracking of real progress.' : 'Feedback continuo y seguimiento del avance real.'}</p>
<p class="jc-desc">${en ? 'Regular sessions with continuous feedback and progress tracking in competencies and results.' : 'Sesiones regulares con feedback continuo y seguimiento de avance en competencias y resultados.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
<h4 class="jc-title">${en ? 'Measurement' : 'Medición'}</h4>
<p class="jc-quote">${en ? 'We evaluate progress and adjust the program.' : 'Evaluamos el progreso y ajustamos el programa.'}</p>
<p class="jc-desc">${en ? 'We evaluate progress with concrete metrics and adjust the program to maximize impact.' : 'Evaluamos el progreso con métricas concretas y ajustamos el programa para maximizar el impacto.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want to empower your team?' : '¿Quieres potenciar a tu equipo?'}</h2><p>${en ? "Let's talk about developing the capabilities your team needs." : 'Conversemos sobre cómo desarrollar las capacidades que tu equipo necesita.'}</p><button class="btn-white" data-route="/#contacto">${en ? 'Schedule a conversation →' : 'Agendar conversación →'}</button></div>

${getFooter(locale)}
`;
}

export default async function MentoringPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
