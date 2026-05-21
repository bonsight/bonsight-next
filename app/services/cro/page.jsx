import RawHtml from '@/components/RawHtml';

const html = `

<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← Volver</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">CRO — Optimización de Conversión</h1><button class="btn-primary" data-animate data-animate-delay="2" data-route="/#contacto">Conversemos</button></div><p class="svc-hero-desc" data-animate data-animate-delay="1">Optimizamos la conversión y la experiencia del usuario. Aplicamos analítica, experimentación y diseño para incrementar ventas y elevar la satisfacción en cada punto de contacto.</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>Qué incluye</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">Servicios incluidos</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div><div><h4>Análisis del funnel de conversión</h4><p>Identificamos dónde pierdes usuarios y el impacto económico de cada punto de fricción.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg></div><div><h4>Experimentación y A/B testing</h4><p>Experimentos para validar hipótesis de mejora con rigor estadístico y metodología sólida.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></div><div><h4>UX Research y usabilidad</h4><p>Investigamos el comportamiento de tus usuarios para encontrar oportunidades de mejora.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div><div><h4>Personalización</h4><p>Experiencias personalizadas por segmento, canal y etapa del funnel para maximizar relevancia.</p></div></div></div></div><div class="outcomes-panel"><h3>Lo que lograrás</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Mayor tasa de conversión</h4><p>Más ventas con el mismo tráfico que ya tienes hoy en tu sitio.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Menor CAC</h4><p>Reducción del costo de adquisición al mejorar la eficiencia del funnel.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Mejor UX</h4><p>Experiencia más fluida que incrementa satisfacción y retención de usuarios.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Cultura de experimentación</h4><p>Tu equipo aprende a decidir con datos validados, no con opiniones.</p></div></div></div></div></div>

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
<p class="jc-quote">Identificamos exactamente dónde pierdes conversiones.</p>
<p class="jc-desc">Mapeamos el funnel e identificamos cuellos de botella con datos cualitativos y cuantitativos.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
<h4 class="jc-title">Hipótesis</h4>
<p class="jc-quote">Priorizamos las oportunidades de mayor impacto.</p>
<p class="jc-desc">Generamos hipótesis priorizadas por impacto potencial y nivel de confianza.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
<h4 class="jc-title">Experimentos</h4>
<p class="jc-quote">Validamos cada cambio con rigor estadístico.</p>
<p class="jc-desc">Diseñamos y ejecutamos tests con metodología rigurosa para validar cada hipótesis.</p>
</div>

<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-.18-5"></path></svg></div>
<h4 class="jc-title">Aprendizaje</h4>
<p class="jc-quote">Escalamos lo que funciona y seguimos mejorando.</p>
<p class="jc-desc">Consolidamos aprendizajes y escalamos lo que funciona para generar impacto sostenido.</p>
</div>

</div>
</div>

<div class="cta-band" data-animate><h2>¿Quieres mejorar tu conversión?</h2><p>Hablemos sobre cómo convertir más con los usuarios que ya tienes.</p><button class="btn-white" data-route="/#contacto">Agendar conversación →</button></div>
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

export default function CroPage() {
  return <RawHtml html={html} />;
}
