import RawHtml from '@/components/RawHtml';

const html = `

<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← Volver</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path></svg><span>Bonsight Boost</span></div><h1 data-animate data-animate-delay="1">Mejora de Procesos</h1><button class="btn-primary" data-animate data-animate-delay="2" data-route="/#contacto">Conversemos</button></div><p class="svc-hero-desc" data-animate data-animate-delay="1">Hacemos que los equipos trabajen mejor. Optimizamos metodologías y flujos de trabajo para lograr mayor agilidad, foco y eficiencia operativa sostenida en el tiempo.</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>Qué incluye</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">Servicios incluidos</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div><div><h4>Mapeo de procesos actuales</h4><p>Documentamos y analizamos flujos de trabajo para identificar ineficiencias y cuellos de botella.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg></div><div><h4>Rediseño de metodologías</h4><p>Frameworks ágiles y mejores prácticas adaptadas al contexto y madurez de cada equipo.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="8" rx="2" width="20" x="2" y="2"></rect><rect height="8" rx="2" width="20" x="2" y="14"></rect><line x1="6" x2="6.01" y1="6" y2="6"></line><line x1="6" x2="6.01" y1="18" y2="18"></line></svg></div><div><h4>Automatización y herramientas</h4><p>Oportunidades de automatización y selección de herramientas adecuadas para cada proceso.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><div><h4>Gestión del cambio</h4><p>Acompañamos la adopción de nuevos procesos para una incorporación efectiva y duradera.</p></div></div></div></div><div class="outcomes-panel"><h3>Lo que lograrás</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Mayor eficiencia</h4><p>Menos tiempo en tareas que no agregan valor, más foco en lo importante.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Entregas más rápidas</h4><p>Ciclos ágiles y predecibles con menor tiempo de espera entre etapas.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Menor fricción interna</h4><p>Procesos claros que reducen confusión, reprocesos y conflictos de equipo.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Escalabilidad operativa</h4><p>Procesos que funcionan igual cuando el equipo o el negocio crece.</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">Proceso</div>
<h2 class="jc-heading">Cómo trabajamos</h2>
</div>
<div class="jc-grid">

<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg></div>
<h4 class="jc-title">Diagnóstico</h4>
<p class="jc-quote">Entendemos cómo opera tu negocio hoy.</p>
<p class="jc-desc">Observamos procesos, herramientas, datos y puntos críticos para detectar oportunidades reales de mejora.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg></div>
<h4 class="jc-title">Diseño</h4>
<p class="jc-quote">Diseñamos una estrategia escalable.</p>
<p class="jc-desc">Transformamos hallazgos en modelos operativos y tecnológicos alineados con los objetivos de negocio.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
<h4 class="jc-title">Implementación</h4>
<p class="jc-quote">Ejecutamos junto a tu equipo.</p>
<p class="jc-desc">Acompañamos la implementación técnica y operativa asegurando adopción, continuidad y calidad en cada etapa.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
<h4 class="jc-title">Evolución continua</h4>
<p class="jc-quote">Medimos, refinamos y optimizamos.</p>
<p class="jc-desc">El trabajo no termina en la entrega. Medimos impacto real y evolucionamos continuamente los procesos con tu equipo.</p>
</div>

</div>
</div>

<div class="cta-band" data-animate><h2>¿Quieres que tu equipo trabaje mejor?</h2><p>Conversemos sobre cómo optimizar los procesos que frenan el crecimiento.</p><button class="btn-white" data-route="/#contacto">Agendar conversación →</button></div>
<footer class="footer-main">
<div class="footer-main-inner">
<div class="footer-col footer-col-brand">
<div class="footer-logo">BON<span>sight</span> LLC</div>
<p class="footer-tagline">Estrategia de datos y crecimiento digital para empresas que quieren crecer con foco.</p>
<div class="footer-social">
<a class="footer-social-icon" href="https://www.instagram.com/wearebonsight" target="_blank" rel="noopener" aria-label="Instagram"><svg width="16" height="16" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
<a class="footer-social-icon" href="https://www.linkedin.com/company/wearebonsight/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="16" height="16" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg></a>
<a class="footer-social-icon" href="https://x.com/WeAreBonsight" target="_blank" rel="noopener" aria-label="X"><svg width="15" height="15" viewbox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>
<a class="footer-social-icon" href="https://www.tiktok.com/@wearebonsigth" target="_blank" rel="noopener" aria-label="TikTok"><svg width="15" height="15" viewbox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.19a8.14 8.14 0 0 0 4.77 1.52V6.27a4.85 4.85 0 0 1-1-.58z"/></svg></a>
</div>
</div>
<div class="footer-col">
<div class="footer-col-label">Bonsight Growth</div>
<nav class="footer-nav">
<a data-route="/services/data-strategy">Data Strategy</a>
<a data-route="/services/growth">Growth Digital</a>
<a data-route="/services/cro">CRO</a>
</nav>
</div>
<div class="footer-col">
<div class="footer-col-label">Bonsight Boost</div>
<nav class="footer-nav">
<a data-route="/services/mentoring">Mentoring de Equipos</a>
<a data-route="/services/procesos">Mejora de Procesos</a>
<a data-route="/services/liderazgo">Soporte a Líderes</a>
</nav>
</div>
<div class="footer-col">
<div class="footer-col-label">Contacto</div>
<div class="footer-contact-items">
<a href="mailto:sales@bonsight.co" class="footer-contact-link"><svg width="14" height="14" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>sales@bonsight.co</a>
<a href="tel:+13123509796" class="footer-contact-link"><svg width="14" height="14" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.92 3.38 2 2 0 0 1 3.89 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>+1 312 350 9796</a>
<div class="footer-contact-addr"><svg width="14" height="14" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Orlando, Florida<br>United States</span></div>
</div>
</div>
</div>
<div class="footer-bottom">
<span class="footer-bottom-logo">BON<span>sight</span> LLC</span>
<span>© 2025 Bonsight LLC · Todos los derechos reservados</span>
</div>
</footer>

`;

export default function ProcesosPage() {
  return <RawHtml html={html} />;
}
