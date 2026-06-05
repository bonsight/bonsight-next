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
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
<span>Arke</span>
</div>
<h1 data-animate data-animate-delay="1">${en ? 'Great ideas don\'t fail for lack of vision. They fail for lack of execution.' : 'Las buenas ideas no fracasan por falta de visión. Fracasan por falta de ejecución.'}</h1>
<div class="svc-hero-actions" data-animate data-animate-delay="2">
<button class="btn-primary" data-route="/consulta">${en ? "Let's talk" : 'Conversemos'}</button>
<button class="btn-outline" data-scroll="#arke-how">${en ? 'See how it works' : 'Ver cómo funciona'}</button>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "Arke is Bonsight's digital growth service. We design, build, and activate digital channels — websites, campaigns, content, and paid media — as an integrated system. Not isolated tactics. Not agencies working in silos." : 'Arke es el servicio de crecimiento digital de Bonsight. Diseñamos, construimos y activamos canales digitales — sitios web, campañas, contenido y paid media — como un sistema integrado. No tácticas aisladas. No agencias en silos.'}</p>
</div>
</div>

<!-- PROBLEM + WHAT IS ARKE -->
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The problem' : 'El problema'}</div>
<h2 class="case-section-title">${en ? 'Does any of this sound familiar?' : '¿Te suena alguno de estos?'}</h2>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'You invest in ads but don\'t see ROI' : 'Inviertes en ads pero no ves ROI'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Your website generates traffic but very few conversions' : 'Tu sitio web genera tráfico pero muy pocas conversiones'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'You work with several vendors who don\'t coordinate with each other' : 'Trabajas con varios proveedores que no se coordinan entre sí'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Content exists but doesn\'t connect to any growth goal' : 'Hay contenido pero no conecta con ningún objetivo de crecimiento'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Campaigns change, but results stay the same' : 'Las campañas cambian, pero los resultados son iguales'}</p></div>
</div>
<div class="section-callout">${en ? 'The problem is not a lack of tactics. It\'s that tactics without an integrated system don\'t compound.' : 'El problema no es falta de tácticas. Es que las tácticas sin un sistema integrado no se acumulan.'}</div>
</div>
<div>
<div class="eyebrow">${en ? 'What is Arke' : 'Qué es Arke'}</div>
<h2 class="case-section-title">${en ? 'Arke is digital execution as a system' : 'Arke es ejecución digital como sistema'}</h2>
<p class="case-body-text">${en ? "Arke is not an agency. It's an integrated growth team that covers design, development, content, and paid media — all connected to the same business objective." : 'Arke no es una agencia. Es un equipo de crecimiento integrado que cubre diseño, desarrollo, contenido y paid media — todo conectado al mismo objetivo de negocio.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Design & Web' : 'Diseño & Web'}</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Digital presence built to convert. Landing pages, websites, and UX flows optimized from day one.' : 'Presencia digital construida para convertir. Landing pages, sitios web y flujos UX optimizados desde el primer día.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">${en ? 'Content & SEO' : 'Contenido & SEO'}</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Content with a growth purpose: positioning, authority, and organic demand capture.' : 'Contenido con propósito de crecimiento: posicionamiento, autoridad y captura de demanda orgánica.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">${en ? 'Paid Media' : 'Paid Media'}</div>
<p style="font-size:0.85rem;color:rgba(255,255,255,0.55);line-height:1.7;margin:0">${en ? 'Campaigns on Google, Meta, and LinkedIn managed with real attribution — not vanity metrics.' : 'Campañas en Google, Meta y LinkedIn gestionadas con atribución real — no métricas de vanidad.'}</p>
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
<h2>${en ? 'Arke is for you if...' : 'Arke es para ti si...'}</h2>
<p>${en ? "Arke is for businesses that need to grow their digital presence and revenue — and need it to work as a system, not as disconnected pieces." : 'Arke es para negocios que necesitan crecer su presencia digital y sus ingresos — y necesitan que funcione como un sistema, no como piezas desconectadas.'}</p>
</div>
<div class="about-pills">
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><div class="pill-text"><h4>${en ? 'Brand with digital presence to build' : 'Marca con presencia digital por construir'}</h4><p>${en ? 'Or that needs to rebuild what already exists.' : 'O que necesita reconstruir lo que ya existe.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><div class="pill-text"><h4>${en ? 'Business with budget to invest in growth' : 'Negocio con presupuesto para invertir en crecimiento'}</h4><p>${en ? 'And that wants it executed with discipline and attribution.' : 'Y que quiere que se ejecute con disciplina y atribución.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="pill-text"><h4>${en ? 'Team tired of fragmented vendors' : 'Equipo cansado de proveedores fragmentados'}</h4><p>${en ? 'That want a single team aligned to their goals.' : 'Que quiere un solo equipo alineado a sus objetivos.'}</p></div></div>
</div>
</div>
</div>

<!-- HOW IT WORKS -->
<div id="arke-how" class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'How it works' : 'Cómo funciona'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'From strategy to active execution' : 'De la estrategia a la ejecución activa'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Diagnosis and strategy' : 'Diagnóstico y estrategia'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We audit your current digital presence, identify opportunities, and design an integrated strategy with clear objectives.' : 'Auditamos tu presencia digital actual, identificamos oportunidades y diseñamos una estrategia integrada con objetivos claros.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Build and activation' : 'Construcción y activación'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We build or rebuild the digital assets you need — and activate the campaigns and content from day one.' : 'Construimos o reconstruimos los activos digitales que necesitas — y activamos las campañas y el contenido desde el primer día.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Continuous optimization' : 'Optimización continua'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Every cycle we analyze results, adjust the mix, and improve conversion. The system learns and compounds.' : 'Cada ciclo analizamos resultados, ajustamos el mix y mejoramos la conversión. El sistema aprende y se acumula.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Reporting and decisions' : 'Reporte y decisiones'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? "Every action has a metric. We don't report to report — we report to improve and invest better." : 'Cada acción tiene una métrica. No reportamos para reportar — reportamos para mejorar e invertir mejor.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden;grid-column:1/-1"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">05</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Scale what works' : 'Escalamos lo que funciona'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative;max-width:640px">${en ? "We don't keep doing what doesn't generate results. When something works, we scale it — in budget, channels, and volume. Growth becomes systematic, not accidental." : 'No seguimos haciendo lo que no genera resultados. Cuando algo funciona, lo escalamos — en presupuesto, canales y volumen. El crecimiento se vuelve sistemático, no accidental.'}</p></div>
</div>
</div>
</div>

<!-- WHAT CHANGES -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'After Arke' : 'Después de Arke'}</div>
<h2>${en ? 'What changes after Arke' : 'Qué cambia después de Arke'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><h4>${en ? 'A single integrated growth team' : 'Un solo equipo de crecimiento integrado'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><h4>${en ? 'Digital channels that convert and compound' : 'Canales digitales que convierten y se acumulan'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg></div><h4>${en ? 'Attribution to know what actually generates ROI' : 'Atribución para saber qué genera ROI real'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><h4>${en ? 'Scalable execution, not constant firefighting' : 'Ejecución escalable, no apagar fuegos constantemente'}</h4><p></p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? "Digital growth is not about being everywhere. It's about being in the right place with the right message — and scaling what works." : 'El crecimiento digital no es estar en todos lados. Es estar en el lugar correcto con el mensaje correcto — y escalar lo que funciona.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Ready to make your digital channels grow?' : '¿Listo para que tus canales digitales crezcan?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function ArkePage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Arke | Integrated digital growth for real results' : 'Arke | Crecimiento digital integrado para resultados reales',
    description: en
      ? "Arke is Bonsight's digital execution service. Design, web, content, and paid media working as one system — not isolated tactics."
      : 'Arke es el servicio de ejecución digital de Bonsight. Diseño, web, contenido y paid media trabajando como un sistema — no tácticas aisladas.',
  };
}
