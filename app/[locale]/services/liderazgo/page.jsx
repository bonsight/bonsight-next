import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg><span>Bonsight Boost</span></div><h1 data-animate data-animate-delay="1">${en ? 'Leadership Support' : 'Soporte a Líderes'}</h1><button class="btn-primary" data-animate data-animate-delay="2" data-route="/#contacto">${en ? "Let's Talk" : 'Conversemos'}</button></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We enhance leadership with vision and strategy. We provide support to decision-makers so they lead with greater clarity, effectiveness, and real impact.' : 'Potenciamos el liderazgo con visión y estrategia. Brindamos acompañamiento a quienes toman decisiones clave para que lideren con mayor claridad, efectividad e impacto real.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div><div><h4>${en ? 'Strategic coaching for leaders' : 'Coaching estratégico para líderes'}</h4><p>${en ? '1:1 sessions to develop strategic vision, decision-making, and leadership style.' : 'Sesiones 1:1 para desarrollar visión estratégica, toma de decisiones y estilo de liderazgo.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div><h4>${en ? 'Executive alignment facilitation' : 'Facilitación de alineación ejecutiva'}</h4><p>${en ? 'We align vision, priorities, and ways of working at the executive team level.' : 'Alineamos visión, prioridades y forma de trabajo a nivel de equipos directivos.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg></div><div><h4>${en ? 'High-performance team management' : 'Gestión de equipos de alto rendimiento'}</h4><p>${en ? 'Building and motivating high-performance teams with sustained autonomy.' : 'Construcción y motivación de equipos de alto desempeño y autonomía sostenida.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div><h4>${en ? 'Data-driven leadership' : 'Liderazgo basado en datos'}</h4><p>${en ? 'We train leaders to use data in decision-making and team management.' : 'Formamos a líderes para utilizar datos en la toma de decisión y gestión de equipos.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Strategic clarity' : 'Claridad estratégica'}</h4><p>${en ? 'Faster decisions aligned with business objectives.' : 'Decisiones más rápidas y alineadas con los objetivos del negocio.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Engaged teams' : 'Equipos comprometidos'}</h4><p>${en ? 'Leaders who inspire and retain key organizational talent.' : 'Líderes que inspiran y retienen al talento clave de la organización.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Better execution' : 'Mejor ejecución'}</h4><p>${en ? 'Ability to transform strategy into concrete, measurable results.' : 'Capacidad de transformar la estrategia en resultados concretos y medibles.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Organizational resilience' : 'Resiliencia organizacional'}</h4><p>${en ? 'Leadership that navigates uncertainty with focus and real adaptability.' : 'Liderazgo que navega la incertidumbre con foco y adaptabilidad real.'}</p></div></div></div></div></div>

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
<p class="jc-quote">${en ? "We understand the leader's context and challenges." : 'Entendemos el contexto y desafíos del líder.'}</p>
<p class="jc-desc">${en ? "We understand the context, current challenges, and development objectives of each leader before beginning." : 'Entendemos el contexto, desafíos actuales y objetivos de desarrollo de cada líder antes de comenzar.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg></div>
<h4 class="jc-title">${en ? 'Work plan' : 'Plan de trabajo'}</h4>
<p class="jc-quote">${en ? 'We design the tailored support program.' : 'Diseñamos el programa de acompañamiento a medida.'}</p>
<p class="jc-desc">${en ? 'We design the personalized support program for each specific situation and objective.' : 'Diseñamos el programa de acompañamiento personalizado para cada situación y objetivo específico.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
<h4 class="jc-title">${en ? 'Accompaniment' : 'Acompañamiento'}</h4>
<p class="jc-quote">${en ? 'Sessions focused on real leadership situations.' : 'Sesiones con foco en situaciones reales de liderazgo.'}</p>
<p class="jc-desc">${en ? 'Structured sessions focused on real day-to-day situations and applied learning.' : 'Sesiones estructuradas con foco en situaciones reales del día a día y aprendizaje aplicado.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Evolution' : 'Evolución'}</h4>
<p class="jc-quote">${en ? 'We review progress and adapt the focus.' : 'Revisamos el progreso y adaptamos el foco.'}</p>
<p class="jc-desc">${en ? 'We review progress periodically and adapt the program focus based on achievements.' : 'Revisamos el progreso periódicamente y adaptamos el foco del programa según los avances logrados.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want to lead with more impact?' : '¿Quieres liderar con más impacto?'}</h2><p>${en ? "Let's talk about how to strengthen your leadership and your executive team's." : 'Conversemos sobre cómo potenciar tu liderazgo y el de tu equipo directivo.'}</p><button class="btn-white" data-route="/#contacto">${en ? 'Schedule a conversation →' : 'Agendar conversación →'}</button></div>

${getFooter(locale)}
`;
}

export default async function LiderazgoPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
