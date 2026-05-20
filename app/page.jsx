import RawHtml from '@/components/RawHtml';

const html = `

<!-- HERO -->
<div class="hero">
<div class="hero-left">
<div class="hero-eyebrow">Estrategia de datos · Crecimiento digital</div>
<h1>Datos que <em>impulsan</em> decisiones reales</h1>
<p class="hero-sub">Ayudamos a empresas a ordenar sus datos, mejorar su medición y optimizar su experiencia digital para crecer con solidez y foco.</p>
<div class="hero-actions">
<button class="btn-primary" data-route="/">Conversemos</button>
<button class="btn-outline" data-scroll="#svc-anchor">Ver servicios →</button>
</div>
</div>
<div class="hero-right">
<img class="hero-photo" src="/team.svg" alt="Equipo Bonsight" />
</div>
</div>

<!-- STATS -->
<div class="stats-strip">
<div class="stat-cell" data-animate><div class="stat-num">02</div><div class="stat-label">Líneas de servicio especializadas</div></div>
<div class="stat-cell" data-animate data-animate-delay="1"><div class="stat-num">06</div><div class="stat-label">Servicios concretos y medibles</div></div>
<div class="stat-cell" data-animate data-animate-delay="2"><div class="stat-num">100%</div><div class="stat-label">Foco en resultados sostenibles</div></div>
<div class="stat-cell" data-animate data-animate-delay="3"><div class="stat-num">04</div><div class="stat-label">Etapas de proceso estructurado</div></div>
</div>

<!-- SERVICES -->
<div class="section" id="svc-anchor">
<div class="eyebrow">Servicios</div>
<h2>Dos líneas. Un solo objetivo: crecer.</h2>
<p class="section-sub">Combinamos estrategia de datos y desarrollo de equipos para impulsar resultados reales y sostenibles en productos digitales.</p>
<div class="line-head">
<div class="line-head-icon"><svg viewbox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"></path></svg></div>
<div class="line-head-label">Bonsight Growth</div>
<div class="line-head-desc">Estrategia, analítica y crecimiento digital</div>
</div>
<div class="services-grid">
<div class="svc-card" data-animate data-route="/services/data-strategy">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
<div class="svc-card-tag">Data Strategy</div>
<h3>Estrategia de datos</h3>
<p>Arquitectura de datos que impulsa decisiones inteligentes con calidad, consistencia y visión de escala a largo plazo.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
<div class="svc-card" data-animate data-animate-delay="1" data-route="/services/growth">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div>
<div class="svc-card-tag">Growth</div>
<h3>Crecimiento digital</h3>
<p>Datos, audiencias y canales conectados para optimizar inversión y acelerar ventas, tráfico y posicionamiento de marca.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
<div class="svc-card" data-animate data-animate-delay="2" data-route="/services/cro">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path><path d="M11 8v6M8 11h6"></path></svg></div>
<div class="svc-card-tag">CRO</div>
<h3>Optimización de conversión</h3>
<p>Analítica, experimentación y diseño para incrementar ventas y reducir costos en cada punto de contacto del funnel.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
</div>
<div class="line-head">
<div class="line-head-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>
<div class="line-head-label">Bonsight Boost</div>
<div class="line-head-desc">Equipos y liderazgo de alto rendimiento</div>
</div>
<div class="services-grid">
<div class="svc-card" data-animate data-route="/services/mentoring">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>
<div class="svc-card-tag">Mentoring</div>
<h3>Mentoring de equipos</h3>
<p>Feedback continuo y guía estratégica para fortalecer capacidades y elevar el desempeño técnico del equipo.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
<div class="svc-card" data-animate data-animate-delay="1" data-route="/services/procesos">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div>
<div class="svc-card-tag">Procesos</div>
<h3>Mejora de procesos</h3>
<p>Metodologías y flujos optimizados para mayor agilidad, foco y eficiencia operativa sostenida en la organización.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
<div class="svc-card" data-animate data-animate-delay="2" data-route="/services/liderazgo">
<div class="svc-card-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
<div class="svc-card-tag">Liderazgo</div>
<h3>Soporte a líderes</h3>
<p>Acompañamiento estratégico para quienes toman decisiones clave y coordinan equipos de alto impacto.</p>
<div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div>
</div>
</div>
</div>

<!-- ABOUT -->
<div class="about-wrap">
<div class="about-inner">
<div class="about-text-block" data-animate>
<div class="eyebrow">Quiénes somos</div>
<h2>Especialistas en analítica, estrategia y tecnología</h2>
<p>Somos un equipo apasionado por acompañar a empresas que quieren crecer y escalar productos digitales con inteligencia y foco. Convertimos datos, tecnología y estrategia en crecimiento real.</p>
<button class="btn-outline-dark">Conocer más →</button>
</div>
<div class="about-pills" data-animate data-animate-delay="1">
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg></div><div class="pill-text"><h4>Herramientas que escalan</h4><p>Facilitamos soluciones que ayudan a alcanzar objetivos de forma escalable y sustentable a largo plazo.</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div class="pill-text"><h4>Decisiones basadas en datos</h4><p>Estrategia de datos sólida para apoyar objetivos con certeza, precisión y foco en resultados.</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div><div class="pill-text"><h4>Integración con tu equipo</h4><p>Nos sumamos activamente a la ejecución, como parte del equipo y no solo como consultores externos.</p></div></div>
</div>
</div>
</div>

<!-- PROCESS -->
<div class="process-wrap">
<div class="process-inner">
<div class="eyebrow">Proceso</div>
<h2 style="font-family:var(--serif);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;letter-spacing:-0.02em;color:var(--text)">La persona ideal en el lugar indicado</h2>
<div class="process-steps">
<div class="proc-step" data-animate><div class="proc-num-wrap active"><div class="proc-num">01</div><div class="proc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div></div><h4>Análisis</h4><p>Recopilamos y analizamos datos, procesos y dinámicas para identificar oportunidades clave.</p></div>
<div class="proc-step" data-animate data-animate-delay="1"><div class="proc-num-wrap"><div class="proc-num">02</div><div class="proc-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div></div><h4>Definición</h4><p>Diseñamos estrategia con objetivos, KPIs e hipótesis de crecimiento priorizadas por impacto.</p></div>
<div class="proc-step" data-animate data-animate-delay="2"><div class="proc-num-wrap"><div class="proc-num">03</div><div class="proc-icon"><svg viewbox="0 0 24 24"><line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line></svg></div></div><h4>Planificación</h4><p>Roadmap claro y priorizado con responsables, plazos y criterios de éxito medibles.</p></div>
<div class="proc-step" data-animate data-animate-delay="3"><div class="proc-num-wrap"><div class="proc-num">04</div><div class="proc-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg></div></div><h4>Implementación</h4><p>Nos integramos al equipo para acompañar la ejecución con presencia y foco en resultados.</p></div>
</div>
</div>
</div>

<!-- BENEFITS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">Beneficios</div>
<h2 style="font-family:var(--serif);font-size:clamp(1.6rem,3vw,2.4rem);font-weight:400;letter-spacing:-0.02em;color:var(--text)">Lo que lograrás trabajando con Bonsight</h2>
<div class="benefits-grid">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div><h4>Crecimiento sostenible y rentable</h4><p>Estrategias que generan resultados reales sin comprometer la salud financiera del negocio.</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path></svg></div><h4>Mayor adquisición y retención</h4><p>Más clientes nuevos y mayor fidelidad de los existentes con estrategias basadas en datos.</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><h4>Mejor uso del presupuesto</h4><p>Inversión de marketing optimizada para maximizar el retorno en cada canal y campaña.</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div><h4>Decisiones informadas</h4><p>Toma de decisiones respaldada por datos de calidad, métricas claras y análisis riguroso.</p></div>
</div>
</div>
</div>

<!-- CLIENTS -->
<div class="clients-wrap">
<div class="clients-inner">
<div class="clients-label">Empresas que confían en Bonsight</div>
<div class="clients-row">
<div class="client-logo client-logo--link" data-animate data-route="/cases/sesuveca">
<svg fill="none" height="36" viewbox="0 0 160 36" width="160" xmlns="http://www.w3.org/2000/svg">
<polygon fill="#1B3A6B" points="18,2 32,10 32,26 18,34 4,26 4,10"></polygon>
<polygon fill="none" points="18,7 27,12 27,24 18,29 9,24 9,12" stroke="white" stroke-width="1.5"></polygon>
<polygon fill="#1B3A6B" points="18,12 23,15 23,21 18,24 13,21 13,15" stroke="white" stroke-width="1"></polygon>
<text fill="#1B3A6B" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1" x="40" y="20">SESUVECA</text>
<text fill="#5577AA" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" x="40" y="32">DEL PERÚ</text>
</svg>
<span class="client-logo-hint">Ver caso →</span>
</div>
<div class="client-logo client-logo--link" data-animate data-animate-delay="2" data-route="/cases/olaclick">
<svg fill="none" height="36" viewbox="0 0 120 36" width="120" xmlns="http://www.w3.org/2000/svg">
<text fill="#0066FF" font-family="Arial,sans-serif" font-size="24" font-weight="700" x="0" y="27">OlaClick</text>
<circle cx="113" cy="8" fill="none" r="4" stroke="#00E5C3" stroke-dasharray="6 3" stroke-width="2"></circle>
</svg>
<span class="client-logo-hint">Ver caso →</span>
</div>
</div>
</div>
</div>

<!-- CONTACT SECTION -->
<section class="contact-section" id="contacto">
  <div class="contact-section-inner">

    <!-- Left: copy -->
    <div class="contact-copy">
      <div class="contact-eyebrow">Contacto</div>
      <h2 class="contact-title">Cuéntanos qué necesitas</h2>
      <p class="contact-desc">Te responderemos para entender el contexto y definir el mejor siguiente paso juntos.</p>

      <div class="contact-reasons">
        <div class="contact-reason">
          <div class="contact-reason-icon">
            <svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg>
          </div>
          <div>
            <div class="contact-reason-title">Diagnóstico sin costo</div>
            <div class="contact-reason-text">Primera conversación para entender tu situación actual.</div>
          </div>
        </div>
        <div class="contact-reason">
          <div class="contact-reason-icon">
            <svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div>
            <div class="contact-reason-title">Respuesta en 24 horas</div>
            <div class="contact-reason-text">Nos comprometemos a responder rápido con próximos pasos claros.</div>
          </div>
        </div>
        <div class="contact-reason">
          <div class="contact-reason-icon">
            <svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div>
            <div class="contact-reason-title">Trato directo con el equipo</div>
            <div class="contact-reason-text">Sin intermediarios ni procesos de ventas complicados.</div>
          </div>
        </div>
      </div>

      <a href="https://wa.me/13123509796" target="_blank" class="contact-whatsapp">
        <svg viewbox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        Escribir por WhatsApp
      </a>
    </div>

    <!-- Right: form -->
    <div class="contact-form-wrap">
      <form
        action="https://formspree.io/f/xkoejwqn"
        method="POST"
        class="contact-form"
        id="contact-form"
        onsubmit="handleContactSubmit(event)"
      >
        <div class="form-row">
          <div class="form-field">
            <label for="cf-name">Nombre *</label>
            <input id="cf-name" type="text" name="name" placeholder="Tu nombre" required />
          </div>
          <div class="form-field">
            <label for="cf-email">Correo *</label>
            <input id="cf-email" type="email" name="email" placeholder="tu@empresa.com" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="cf-company">Empresa</label>
            <input id="cf-company" type="text" name="company" placeholder="Nombre de tu empresa" />
          </div>
          <div class="form-field">
            <label for="cf-service">Servicio de interés</label>
            <select id="cf-service" name="service">
              <option value="" disabled selected>Selecciona un servicio</option>
              <optgroup label="Bonsight Growth">
                <option value="data-strategy">Data Strategy</option>
                <option value="growth">Growth Digital</option>
                <option value="cro">CRO — Optimización de conversión</option>
              </optgroup>
              <optgroup label="Bonsight Boost">
                <option value="mentoring">Mentoring de equipos</option>
                <option value="procesos">Mejora de procesos</option>
                <option value="liderazgo">Soporte a líderes</option>
              </optgroup>
              <option value="no-se">No estoy seguro aún</option>
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="cf-message">¿Qué necesitas? *</label>
          <textarea id="cf-message" name="message" placeholder="Cuéntanos tu situación actual, el reto que enfrentas o lo que quieres lograr..." rows="5" required></textarea>
        </div>

        <div class="form-footer">
          <button type="submit" class="btn-submit" id="btn-submit">
            <span class="btn-submit-text">Enviar mensaje</span>
            <span class="btn-submit-loading" style="display:none">Enviando...</span>
            <svg class="btn-submit-arrow" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <p class="form-note">Respondemos en menos de 24 horas hábiles.</p>
        </div>

        <!-- Success state -->
        <div class="form-success" id="form-success" style="display:none">
          <div class="form-success-icon">
            <svg viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h4>¡Mensaje enviado!</h4>
          <p>Gracias por escribirnos. Te responderemos en las próximas 24 horas hábiles.</p>
        </div>
      </form>
    </div>

  </div>
</section>

<footer>
<div class="footer-logo">BON<span>sight</span> LLC</div>
<div class="footer-links">
<a data-route="/services/data-strategy">Data Strategy</a>
<a data-route="/services/growth">Growth</a>
<a data-route="/services/cro">CRO</a>
<a data-route="/services/mentoring">Mentoring</a>
</div>
<p>© 2025 Bonsight LLC</p>
</footer>

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
    const res = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      form.querySelectorAll('.form-row, .form-field, .form-footer').forEach(el => el.style.display = 'none');
      successEl.style.display = 'flex';
    } else {
      btnText.style.display = 'inline';
      btnLoading.style.display = 'none';
      btnArrow.style.display = 'inline';
      btn.disabled = false;
      alert('Hubo un error al enviar. Por favor intenta de nuevo.');
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

export default function HomePage() {
  return <RawHtml html={html} />;
}
