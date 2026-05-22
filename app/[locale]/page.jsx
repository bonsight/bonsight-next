import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<!-- HERO -->
<div class="hero">
<div class="hero-left">
<div class="hero-eyebrow">${en ? 'Data Strategy · Digital Growth' : 'Estrategia de datos · Crecimiento digital'}</div>
<h1>${en ? 'Data that <em>drives</em> real decisions' : 'Datos que <em>impulsan</em> decisiones reales'}</h1>
<p class="hero-sub">${en ? 'We help companies organize their data, improve their measurement, and optimize their digital experience to grow with strength and focus.' : 'Ayudamos a empresas a ordenar sus datos, mejorar su medición y optimizar su experiencia digital para crecer con solidez y foco.'}</p>
<div class="hero-actions">
<button class="btn-primary" data-route="/consulta">${en ? "Let's Talk" : 'Conversemos'}</button>
<button class="btn-outline" data-scroll="#svc-anchor">${en ? 'View services →' : 'Ver servicios →'}</button>
</div>
</div>
<div class="hero-right">
<img class="hero-photo" src="/hero_home.png" alt="Equipo Bonsight" />
</div>
</div>

<!-- DIFFERENTIATORS -->
<div class="stats-strip">
<div class="stat-cell" data-animate>
  <div class="diff-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>
  <div class="diff-title">${en ? 'Strategy + Execution' : 'Estrategia + Ejecución'}</div>
  <div class="diff-desc">${en ? 'We join your team, not just advise from the outside.' : 'Nos sumamos al equipo, no solo asesoramos desde afuera.'}</div>
</div>
<div class="stat-cell" data-animate data-animate-delay="1">
  <div class="diff-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
  <div class="diff-title">${en ? 'No intermediaries' : 'Sin intermediarios'}</div>
  <div class="diff-desc">${en ? 'Direct contact with the specialists who do the work.' : 'Trato directo con los especialistas que hacen el trabajo.'}</div>
</div>
<div class="stat-cell" data-animate data-animate-delay="2">
  <div class="diff-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div>
  <div class="diff-title">${en ? 'Measurable results' : 'Resultados medibles'}</div>
  <div class="diff-desc">${en ? 'Clear KPIs and metrics from day one.' : 'KPIs y métricas claras desde el primer día.'}</div>
</div>
<div class="stat-cell" data-animate data-animate-delay="3">
  <div class="diff-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
  <div class="diff-title">${en ? 'Data as foundation' : 'Datos como base'}</div>
  <div class="diff-desc">${en ? 'Every decision backed by real analytics.' : 'Cada decisión respaldada por analítica real.'}</div>
</div>
</div>

<!-- SERVICES -->
<div class="section" id="svc-anchor">
<div class="eyebrow">${en ? 'Services' : 'Servicios'}</div>
<h2>${en ? 'Two lines. One goal: grow.' : 'Dos líneas. Un solo objetivo: crecer.'}</h2>
<p class="section-sub">${en ? 'We combine data strategy and team development to drive real, sustainable results in digital products.' : 'Combinamos estrategia de datos y desarrollo de equipos para impulsar resultados reales y sostenibles en productos digitales.'}</p>
<div class="line-head">
<div class="line-head-icon"><svg viewbox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"></path></svg></div>
<div class="line-head-label">Bonsight Growth</div>
<div class="line-head-desc">${en ? 'Strategy, analytics and digital growth' : 'Estrategia, analítica y crecimiento digital'}</div>
</div>
<div class="services-grid">
<div class="svc-card" data-animate data-route="/services/data-strategy">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
<div class="svc-card-tag">Data Strategy</div>
<h3>${en ? 'Data Strategy' : 'Estrategia de datos'}</h3>
<p>${en ? 'Data architecture that drives intelligent decisions with quality, consistency, and long-term scale vision.' : 'Arquitectura de datos que impulsa decisiones inteligentes con calidad, consistencia y visión de escala a largo plazo.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
<div class="svc-card" data-animate data-animate-delay="1" data-route="/services/growth">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div>
<div class="svc-card-tag">Growth</div>
<h3>${en ? 'Digital Growth' : 'Crecimiento digital'}</h3>
<p>${en ? 'Data, audiences, and channels connected to optimize investment and accelerate sales, traffic, and brand positioning.' : 'Datos, audiencias y canales conectados para optimizar inversión y acelerar ventas, tráfico y posicionamiento de marca.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
<div class="svc-card" data-animate data-animate-delay="2" data-route="/services/cro">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path><path d="M11 8v6M8 11h6"></path></svg></div>
<div class="svc-card-tag">CRO</div>
<h3>${en ? 'Conversion Optimization' : 'Optimización de conversión'}</h3>
<p>${en ? 'Analytics, experimentation, and design to increase sales and reduce costs at every funnel touchpoint.' : 'Analítica, experimentación y diseño para incrementar ventas y reducir costos en cada punto de contacto del funnel.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
</div>
<div class="line-head">
<div class="line-head-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
<div class="line-head-label">Bonsight Boost</div>
<div class="line-head-desc">${en ? 'High-performance teams and leadership' : 'Equipos y liderazgo de alto rendimiento'}</div>
</div>
<div class="services-grid">
<div class="svc-card" data-animate data-route="/services/mentoring">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
<div class="svc-card-tag">Mentoring</div>
<h3>${en ? 'Team Mentoring' : 'Mentoring de equipos'}</h3>
<p>${en ? 'Continuous feedback and strategic guidance to strengthen capabilities and elevate team technical performance.' : 'Feedback continuo y guía estratégica para fortalecer capacidades y elevar el desempeño técnico del equipo.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
<div class="svc-card" data-animate data-animate-delay="1" data-route="/services/procesos">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div>
<div class="svc-card-tag">${en ? 'Processes' : 'Procesos'}</div>
<h3>${en ? 'Process Improvement' : 'Mejora de procesos'}</h3>
<p>${en ? 'Optimized methodologies and workflows for greater agility, focus, and sustained operational efficiency.' : 'Metodologías y flujos optimizados para mayor agilidad, foco y eficiencia operativa sostenida en la organización.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
<div class="svc-card" data-animate data-animate-delay="2" data-route="/services/liderazgo">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
<div class="svc-card-tag">${en ? 'Leadership' : 'Liderazgo'}</div>
<h3>${en ? 'Leadership Support' : 'Soporte a líderes'}</h3>
<p>${en ? 'Strategic support for those making key decisions and coordinating high-impact teams.' : 'Acompañamiento estratégico para quienes toman decisiones clave y coordinan equipos de alto impacto.'}</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>${en ? 'View service' : 'Ver servicio'}</div>
</div>
</div>
</div>

<!-- ABOUT -->
<div class="about-wrap">
<div class="about-inner">
<div class="about-text-block" data-animate>
<div class="eyebrow">${en ? 'About Us' : 'Quiénes somos'}</div>
<h2>${en ? 'Specialists in analytics, strategy, and technology' : 'Especialistas en analítica, estrategia y tecnología'}</h2>
<p>${en ? 'We are a team passionate about supporting companies that want to grow and scale digital products with intelligence and focus. We turn data, technology, and strategy into real growth.' : 'Somos un equipo apasionado por acompañar a empresas que quieren crecer y escalar productos digitales con inteligencia y foco. Convertimos datos, tecnología y estrategia en crecimiento real.'}</p>
<button class="btn-outline-dark" data-route="/#contacto">${en ? 'Learn more →' : 'Conocer más →'}</button>
</div>
<div class="about-pills" data-animate data-animate-delay="1">
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg></div><div class="pill-text"><h4>${en ? 'Tools that scale' : 'Herramientas que escalan'}</h4><p>${en ? 'We facilitate solutions that help achieve objectives in a scalable and sustainable way in the long term.' : 'Facilitamos soluciones que ayudan a alcanzar objetivos de forma escalable y sustentable a largo plazo.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div class="pill-text"><h4>${en ? 'Data-driven decisions' : 'Decisiones basadas en datos'}</h4><p>${en ? 'Solid data strategy to support objectives with certainty, precision, and focus on results.' : 'Estrategia de datos sólida para apoyar objetivos con certeza, precisión y foco en resultados.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div class="pill-text"><h4>${en ? 'Integration with your team' : 'Integración con tu equipo'}</h4><p>${en ? 'We actively join the execution, as part of the team, not just as external consultants.' : 'Nos sumamos activamente a la ejecución, como parte del equipo y no solo como consultores externos.'}</p></div></div>
</div>
</div>
</div>

<!-- PROCESS -->
<div class="process-wrap">
<div class="process-inner">
<div class="eyebrow">${en ? 'Process' : 'Proceso'}</div>
<h2 style="font-family:var(--serif);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;letter-spacing:-0.02em;color:var(--text)">${en ? 'The right person in the right place' : 'La persona ideal en el lugar indicado'}</h2>
<div class="process-steps">
<div class="proc-step" data-animate><div class="proc-num-wrap active"><div class="proc-num">01</div><div class="proc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div></div><h4>${en ? 'Analysis' : 'Análisis'}</h4><p>${en ? 'We gather and analyze data, processes, and dynamics to identify key opportunities.' : 'Recopilamos y analizamos datos, procesos y dinámicas para identificar oportunidades clave.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1"><div class="proc-num-wrap"><div class="proc-num">02</div><div class="proc-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div></div><h4>${en ? 'Definition' : 'Definición'}</h4><p>${en ? 'We design strategy with objectives, KPIs, and growth hypotheses prioritized by impact.' : 'Diseñamos estrategia con objetivos, KPIs e hipótesis de crecimiento priorizadas por impacto.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2"><div class="proc-num-wrap"><div class="proc-num">03</div><div class="proc-icon"><svg viewbox="0 0 24 24"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg></div></div><h4>${en ? 'Planning' : 'Planificación'}</h4><p>${en ? 'Clear, prioritized roadmap with owners, timelines, and measurable success criteria.' : 'Roadmap claro y priorizado con responsables, plazos y criterios de éxito medibles.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3"><div class="proc-num-wrap"><div class="proc-num">04</div><div class="proc-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg></div></div><h4>${en ? 'Implementation' : 'Implementación'}</h4><p>${en ? 'We integrate with the team to support execution with presence and focus on results.' : 'Nos integramos al equipo para acompañar la ejecución con presencia y foco en resultados.'}</p></div>
</div>
</div>
</div>

<!-- BENEFITS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'Benefits' : 'Beneficios'}</div>
<h2 style="font-family:var(--serif);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;letter-spacing:-0.02em;color:var(--text)">${en ? "What you'll achieve working with Bonsight" : 'Lo que lograrás trabajando con Bonsight'}</h2>
<div class="benefits-grid">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div><h4>${en ? 'Sustainable and profitable growth' : 'Crecimiento sostenible y rentable'}</h4><p>${en ? "Strategies that generate real results without compromising the business's financial health." : 'Estrategias que generan resultados reales sin comprometer la salud financiera del negocio.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path></svg></div><h4>${en ? 'Greater acquisition and retention' : 'Mayor adquisición y retención'}</h4><p>${en ? 'More new customers and greater loyalty from existing ones with data-driven strategies.' : 'Más clientes nuevos y mayor fidelidad de los existentes con estrategias basadas en datos.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><h4>${en ? 'Better budget allocation' : 'Mejor uso del presupuesto'}</h4><p>${en ? 'Optimized marketing investment to maximize return on every channel and campaign.' : 'Inversión de marketing optimizada para maximizar el retorno en cada canal y campaña.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div><h4>${en ? 'Informed decisions' : 'Decisiones informadas'}</h4><p>${en ? 'Decision-making backed by quality data, clear metrics, and rigorous analysis.' : 'Toma de decisiones respaldada por datos de calidad, métricas claras y análisis riguroso.'}</p></div>
</div>
</div>
</div>

<!-- CLIENTS -->
<div class="clients-wrap">
<div class="clients-inner">
<div class="clients-label" data-animate>${en ? 'Clients' : 'Clientes'}</div>
<h2 class="clients-heading" data-animate data-animate-delay="1">${en ? 'Companies that trust Bonsight' : 'Empresas que confían en Bonsight'}</h2>
<div class="clients-row">
<div class="client-logo client-logo--link" data-animate data-route="/cases/sesuveca">
<svg fill="none" height="36" viewbox="0 0 160 36" width="160" xmlns="http://www.w3.org/2000/svg">
<polygon fill="#1B3A6B" points="18,2 32,10 32,26 18,34 4,26 4,10"></polygon>
<polygon fill="none" points="18,7 27,12 27,24 18,29 9,24 9,12" stroke="white" stroke-width="1.5"></polygon>
<polygon fill="#1B3A6B" points="18,12 23,15 23,21 18,24 13,21 13,15" stroke="white" stroke-width="1"></polygon>
<text fill="#1B3A6B" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1" x="40" y="20">SESUVECA</text>
<text fill="#5577AA" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" x="40" y="32">DEL PERÚ</text>
</svg>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>
<div class="client-logo client-logo--link" data-animate data-animate-delay="2" data-route="/cases/olaclick">
<svg fill="none" height="36" viewbox="0 0 120 36" width="120" xmlns="http://www.w3.org/2000/svg">
<text fill="#0066FF" font-family="Arial,sans-serif" font-size="24" font-weight="700" x="0" y="27">OlaClick</text>
<circle cx="113" cy="8" fill="none" r="4" stroke="#00E5C3" stroke-dasharray="6 3" stroke-width="2"></circle>
</svg>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>
</div>
</div>
</div>

<!-- CONTACT SECTION -->
<section class="contact-section" id="contacto">
  <div class="contact-section-inner">
    <div class="contact-copy">
      <div class="contact-eyebrow">${en ? 'Contact' : 'Contacto'}</div>
      <h2 class="contact-title">${en ? 'Tell us what you need' : 'Cuéntanos qué necesitas'}</h2>
      <p class="contact-desc">${en ? "We'll get back to you to understand the context and define the best next step together." : 'Te responderemos para entender el contexto y definir el mejor siguiente paso juntos.'}</p>
      <div class="contact-reasons">
        <div class="contact-reason">
          <div class="contact-reason-icon"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg></div>
          <div>
            <div class="contact-reason-title">${en ? 'Free diagnosis' : 'Diagnóstico sin costo'}</div>
            <div class="contact-reason-text">${en ? 'First conversation to understand your current situation.' : 'Primera conversación para entender tu situación actual.'}</div>
          </div>
        </div>
        <div class="contact-reason">
          <div class="contact-reason-icon"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>
          <div>
            <div class="contact-reason-title">${en ? 'Response within 24 hours' : 'Respuesta en 24 horas'}</div>
            <div class="contact-reason-text">${en ? 'We commit to responding quickly with clear next steps.' : 'Nos comprometemos a responder rápido con próximos pasos claros.'}</div>
          </div>
        </div>
        <div class="contact-reason">
          <div class="contact-reason-icon"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div>
            <div class="contact-reason-title">${en ? 'Direct contact with the team' : 'Trato directo con el equipo'}</div>
            <div class="contact-reason-text">${en ? 'No intermediaries or complicated sales processes.' : 'Sin intermediarios ni procesos de ventas complicados.'}</div>
          </div>
        </div>
      </div>
      <a href="https://wa.me/13123509796" target="_blank" class="contact-whatsapp">
        <svg viewbox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        ${en ? 'Message on WhatsApp' : 'Escribir por WhatsApp'}
      </a>
    </div>
    <div class="contact-form-wrap">
      <form action="https://formspree.io/f/xkoejwqn" method="POST" class="contact-form" id="contact-form" onsubmit="handleContactSubmit(event)">
        <div class="form-row">
          <div class="form-field">
            <label for="cf-name">${en ? 'Name *' : 'Nombre *'}</label>
            <input id="cf-name" type="text" name="name" placeholder="${en ? 'Your name' : 'Tu nombre'}" required />
          </div>
          <div class="form-field">
            <label for="cf-email">${en ? 'Email *' : 'Correo *'}</label>
            <input id="cf-email" type="email" name="email" placeholder="tu@empresa.com" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label for="cf-company">${en ? 'Company' : 'Empresa'}</label>
            <input id="cf-company" type="text" name="company" placeholder="${en ? 'Your company name' : 'Nombre de tu empresa'}" />
          </div>
          <div class="form-field">
            <label for="cf-service">${en ? 'Service of interest' : 'Servicio de interés'}</label>
            <select id="cf-service" name="service">
              <option value="" disabled selected>${en ? 'Select a service' : 'Selecciona un servicio'}</option>
              <optgroup label="Bonsight Growth">
                <option value="data-strategy">Data Strategy</option>
                <option value="growth">${en ? 'Digital Growth' : 'Growth Digital'}</option>
                <option value="cro">${en ? 'CRO — Conversion Optimization' : 'CRO — Optimización de conversión'}</option>
              </optgroup>
              <optgroup label="Bonsight Boost">
                <option value="mentoring">${en ? 'Team Mentoring' : 'Mentoring de equipos'}</option>
                <option value="procesos">${en ? 'Process Improvement' : 'Mejora de procesos'}</option>
                <option value="liderazgo">${en ? 'Leadership Support' : 'Soporte a líderes'}</option>
              </optgroup>
              <option value="no-se">${en ? "I'm not sure yet" : 'No estoy seguro aún'}</option>
            </select>
          </div>
        </div>
        <div class="form-field">
          <label for="cf-message">${en ? 'What do you need? *' : '¿Qué necesitas? *'}</label>
          <textarea id="cf-message" name="message" placeholder="${en ? 'Tell us your current situation, the challenge you face, or what you want to achieve...' : 'Cuéntanos tu situación actual, el reto que enfrentas o lo que quieres lograr...'}" rows="5" required></textarea>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn-submit" id="btn-submit">
            <span class="btn-submit-text">${en ? 'Send message' : 'Enviar mensaje'}</span>
            <span class="btn-submit-loading" style="display:none">${en ? 'Sending...' : 'Enviando...'}</span>
            <svg class="btn-submit-arrow" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p class="form-note">${en ? 'We respond within 24 business hours.' : 'Respondemos en menos de 24 horas hábiles.'}</p>
        </div>
        <div class="form-success" id="form-success" style="display:none">
          <div class="form-success-icon"><svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <h4>${en ? 'Message sent!' : '¡Mensaje enviado!'}</h4>
          <p>${en ? "Thank you for reaching out. We'll respond within the next 24 business hours." : 'Gracias por escribirnos. Te responderemos en las próximas 24 horas hábiles.'}</p>
        </div>
      </form>
    </div>
  </div>
</section>

${footer}

<script>
async function handleContactSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contact-form');
  const btn = document.getElementById('btn-submit');
  const btnText = btn.querySelector('.btn-submit-text');
  const btnLoading = btn.querySelector('.btn-submit-loading');
  const btnArrow = btn.querySelector('.btn-submit-arrow');
  const successEl = document.getElementById('form-success');
  btn.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';
  btnArrow.style.display = 'none';
  try {
    const data = new FormData(form);
    const res = await fetch(form.action, { method: 'POST', body: data, headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'form_submit', form_id: 'contact', service_selected: data.get('service') || 'not_specified' });
      form.querySelectorAll('.form-row, .form-field, .form-footer').forEach(el => el.style.display = 'none');
      successEl.style.display = 'flex';
    } else {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      btnArrow.style.display = 'inline';
      btn.disabled = false;
      alert('${en ? 'There was an error sending. Please try again.' : 'Hubo un error al enviar. Por favor intenta de nuevo.'}');
    }
  } catch(err) {
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    btnArrow.style.display = 'inline';
    btn.disabled = false;
  }
}
</script>
`;
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
