import RawHtml from '@/components/RawHtml';

const html = `

<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/">← Volver al inicio</button>
<div class="svc-hero-badge">
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><rect height="7" width="7" x="3" y="3"></rect><rect height="7" width="7" x="14" y="3"></rect><rect height="7" width="7" x="3" y="14"></rect><rect height="7" width="7" x="14" y="14"></rect></svg>
<span>Bonsight Growth</span>
</div>
<h1>Data Strategy</h1>
<button class="btn-primary" data-route="/">Conversemos</button>
</div>
<p class="svc-hero-desc">Creamos estrategias de datos que impulsan decisiones inteligentes. Garantizamos calidad y consistencia para optimizar procesos, reducir riesgos y habilitar un crecimiento sostenible.</p>
</div>
</div>
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">Qué incluye</div>
<h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">Servicios incluidos</h2>
<div class="svc-items-list">
<div class="svc-item"><div class="svc-item-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div><div><h4>Auditoría y diagnóstico de datos</h4><p>Evaluamos fuentes, calidad, consistencia y gaps críticos que limitan la toma de decisiones.</p></div></div>
<div class="svc-item"><div class="svc-item-icon"><svg viewbox="0 0 24 24"><rect height="14" rx="2" width="20" x="2" y="3"></rect><line x1="8" x2="16" y1="21" y2="21"></line><line x1="12" x2="12" y1="17" y2="21"></line></svg></div><div><h4>Arquitectura de datos</h4><p>Infraestructura técnica adecuada para tu madurez actual y tus objetivos de escala futura.</p></div></div>
<div class="svc-item"><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div><h4>Definición de KPIs y métricas</h4><p>Sistema de métricas alineado a los objetivos del negocio para que cada equipo hable el mismo idioma.</p></div></div>
<div class="svc-item"><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg></div><div><h4>Gobierno de datos</h4><p>Políticas y procesos para garantizar calidad, privacidad y accesibilidad de los datos en la organización.</p></div></div>
</div>
</div>
<div class="outcomes-panel">
<h3>Lo que lograrás</h3>
<div class="outcome-item"><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Decisiones más rápidas</h4><p>Datos confiables y accesibles para todo el equipo en tiempo real.</p></div></div>
<div class="outcome-item"><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Reducción de riesgos</h4><p>Menor incertidumbre operativa gracias a información de calidad contrastada.</p></div></div>
<div class="outcome-item"><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Escalabilidad técnica</h4><p>Infraestructura que crece con tu negocio sin fricciones ni deuda técnica.</p></div></div>
<div class="outcome-item"><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Equipos alineados</h4><p>Métricas compartidas y foco colectivo en lo que realmente importa al negocio.</p></div></div>
</div>
</div>
</div>
<div class="svc-process">
<div class="svc-process-inner" style="max-width:1200px;margin:0 auto">
<div class="eyebrow" style="color:var(--accent-mid)"><span style="display:inline-block;width:16px;height:1px;background:var(--accent-mid)"></span> Proceso</div>
<h2 style="font-family:var(--serif);font-size:1.8rem;font-weight:400;letter-spacing:-0.02em;color:white;margin-bottom:2rem">Cómo trabajamos</h2>
<div class="process-steps" style="background:transparent">
<div class="proc-step"><div class="proc-num-wrap" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15)"><div class="proc-num" style="color:rgba(255,255,255,0.4)">01</div></div><h4 style="color:white">Diagnóstico</h4><p style="color:rgba(255,255,255,0.45)">Mapeamos fuentes de datos actuales y evaluamos madurez analítica.</p></div>
<div class="proc-step"><div class="proc-num-wrap" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15)"><div class="proc-num" style="color:rgba(255,255,255,0.4)">02</div></div><h4 style="color:white">Estrategia</h4><p style="color:rgba(255,255,255,0.45)">Diseñamos el roadmap de datos con prioridades y criterios de éxito claros.</p></div>
<div class="proc-step"><div class="proc-num-wrap" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15)"><div class="proc-num" style="color:rgba(255,255,255,0.4)">03</div></div><h4 style="color:white">Implementación</h4><p style="color:rgba(255,255,255,0.45)">Acompañamos la ejecución técnica e integramos con equipos existentes.</p></div>
<div class="proc-step"><div class="proc-num-wrap" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15)"><div class="proc-num" style="color:rgba(255,255,255,0.4)">04</div></div><h4 style="color:white">Medición</h4><p style="color:rgba(255,255,255,0.45)">Validamos resultados y ajustamos la estrategia de forma continua.</p></div>
</div>
</div>
</div>
<div class="cta-band"><h2>¿Quieres ordenar tus datos?</h2><p>Conversemos sobre cómo una estrategia de datos puede transformar tu negocio.</p><button class="btn-white" data-route="/">Agendar conversación →</button></div>
<footer><div class="footer-logo">BON<span>sight</span> LLC</div><p>© 2025 Bonsight LLC</p></footer>

`;

export default function DataStrategyPage() {
  return <RawHtml html={html} />;
}
