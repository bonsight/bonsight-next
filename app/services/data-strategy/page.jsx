import RawHtml from '@/components/RawHtml';

const html = `

<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← Volver</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><rect height="7" width="7" x="3" y="3"></rect><rect height="7" width="7" x="14" y="3"></rect><rect height="7" width="7" x="3" y="14"></rect><rect height="7" width="7" x="14" y="14"></rect></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">Data Strategy</h1><button class="btn-primary" data-animate data-animate-delay="2" data-route="/#contacto">Conversemos</button></div><p class="svc-hero-desc" data-animate data-animate-delay="1">Creamos estrategias de datos que impulsan decisiones inteligentes. Garantizamos calidad y consistencia para optimizar procesos, reducir riesgos y habilitar un crecimiento sostenible.</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>Qué incluye</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">Servicios incluidos</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div><div><h4>Auditoría y diagnóstico de datos</h4><p>Evaluamos fuentes, calidad, consistencia y gaps críticos que limitan la toma de decisiones.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></div><div><h4>Arquitectura de datos</h4><p>Infraestructura técnica adecuada para tu madurez actual y tus objetivos de escala futura.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div><h4>Definición de KPIs y métricas</h4><p>Sistema de métricas alineado a los objetivos del negocio para que cada equipo hable el mismo idioma.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><div><h4>Gobierno de datos</h4><p>Políticas y procesos para garantizar calidad, privacidad y accesibilidad de los datos en la organización.</p></div></div></div></div><div class="outcomes-panel"><h3>Lo que lograrás</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Decisiones más rápidas</h4><p>Datos confiables y accesibles para todo el equipo en tiempo real.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Reducción de riesgos</h4><p>Menor incertidumbre operativa gracias a información de calidad contrastada.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Escalabilidad técnica</h4><p>Infraestructura que crece con tu negocio sin fricciones ni deuda técnica.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Equipos alineados</h4><p>Métricas compartidas y foco colectivo en lo que realmente importa al negocio.</p></div></div></div></div></div>

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
<p class="jc-quote">Mapeamos tus datos actuales y sus gaps críticos.</p>
<p class="jc-desc">Mapeamos fuentes de datos actuales y evaluamos madurez analítica para identificar oportunidades.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg></div>
<h4 class="jc-title">Estrategia</h4>
<p class="jc-quote">Definimos el roadmap de datos con criterios claros.</p>
<p class="jc-desc">Diseñamos el roadmap de datos con prioridades y criterios de éxito alineados al negocio.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
<h4 class="jc-title">Implementación</h4>
<p class="jc-quote">Acompañamos la ejecución técnica con tu equipo.</p>
<p class="jc-desc">Acompañamos la ejecución técnica e integramos con los equipos existentes en cada etapa.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg></div>
<h4 class="jc-title">Medición</h4>
<p class="jc-quote">Validamos resultados y ajustamos continuamente.</p>
<p class="jc-desc">Validamos resultados contra los criterios de éxito y ajustamos la estrategia de forma continua.</p>
</div>

</div>
</div>

<div class="cta-band" data-animate><h2>¿Quieres ordenar tus datos?</h2><p>Conversemos sobre cómo una estrategia de datos puede transformar tu negocio.</p><button class="btn-white" data-route="/#contacto">Agendar conversación →</button></div>
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
<a href="tel:+13123509796" class="footer-contact-link"><svg width="14" height="14" viewbox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12 19.79 19.79 0 0 1 1.92 3.38 2 2 0 0 1 3.89 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>+1 312 350 9796</a><a href="https://wa.me/13123509796" target="_blank" rel="noopener" class="footer-contact-link"><svg width="14" height="14" viewbox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>WhatsApp</a>
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

export default function DataStrategyPage() {
  return <RawHtml html={html} />;
}
