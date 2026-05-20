import RawHtml from '@/components/RawHtml';

const html = `

<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/">← Volver al inicio</button>
<div class="svc-hero-badge">
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
<span>Caso de éxito</span>
</div>
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">OlaClick · SaaS / Food Tech</div>
<h1>Medición digital escalable para crecer con datos</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">GA4</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Google Tag Manager</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">BigQuery</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Dashboards</span>
</div>
</div>
<p class="svc-hero-desc">Ayudamos a OlaClick a fortalecer su ecosistema de medición digital mediante una estrategia integral basada en GA4, Google Tag Manager y BigQuery — diseñada para centralizar la información y facilitar el análisis de negocio en tiempo real.</p>
</div>
</div>

<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">El trabajo</div>
<h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">Qué hicimos juntos</h2>
<div class="svc-items-list">
<div class="svc-item">
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
<div><h4>Arquitectura de datos escalable</h4><p>Diseñamos la estructura de datos que soporta el crecimiento regional, con un modelo de colección limpio y consistente entre mercados.</p></div>
</div>
<div class="svc-item">
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg></div>
<div><h4>Eventos clave de ecommerce</h4><p>Estructuramos e implementamos los eventos de ecommerce más relevantes vía Google Tag Manager, alineados con el funnel de producto de OlaClick.</p></div>
</div>
<div class="svc-item">
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></div>
<div><h4>Dashboards conectados a BigQuery</h4><p>Construimos dashboards de negocio conectados directamente a BigQuery para visualizar métricas clave en tiempo real sin depender de exportaciones manuales.</p></div>
</div>
<div class="svc-item">
<div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div>
<div><h4>Estrategia de medición en GA4</h4><p>Configuramos GA4 con una taxonomía de eventos robusta, propiedades personalizadas y audiencias preparadas para análisis y optimización continua.</p></div>
</div>
</div>
</div>

<div class="outcomes-panel">
<h3>El resultado</h3>
<div class="outcome-item">
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>Base analítica ordenada y confiable</h4><p>Un ecosistema de medición estructurado que elimina la ambigüedad en los datos y permite confiar en las métricas para tomar decisiones.</p></div>
</div>
<div class="outcome-item">
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>Visualizaciones accionables</h4><p>Dashboards conectados en tiempo real que transforman datos crudos en insights listos para actuar, sin procesamiento manual intermedio.</p></div>
</div>
<div class="outcome-item">
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>Lista para optimización continua</h4><p>Infraestructura preparada para experimentación, A/B testing y ciclos de mejora sostenida en el funnel de adquisición y producto.</p></div>
</div>
<div class="outcome-item">
<div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
<div><h4>Escalable para crecimiento regional</h4><p>Arquitectura diseñada para replicarse en nuevos mercados sin rehacer la base de medición desde cero.</p></div>
</div>
</div>
</div>
</div>

<div class="cta-band">
<h2>¿Quieres medir mejor y crecer con datos?</h2>
<p>Ayudamos a estructurar tu ecosistema de medición para que cada decisión esté respaldada por información confiable.</p>
<button class="btn-white" data-route="/#contacto">Conversemos →</button>
</div>

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

`;

export default function OlaClickPage() {
  return <RawHtml html={html} />;
}
