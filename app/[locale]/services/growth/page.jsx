import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">Growth Digital</h1><a class="btn-primary" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer" data-animate data-animate-delay="2">${en ? 'Schedule a call' : 'Agendar llamada'}</a></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We drive digital growth with analytics and performance. We connect data, audiences, and channels to optimize investment and accelerate traffic, sales, and positioning.' : 'Impulsamos el crecimiento digital con analítica y performance. Conectamos datos, audiencias y canales para optimizar la inversión y acelerar tráfico, ventas y posicionamiento.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg></div><div><h4>${en ? 'Acquisition strategy' : 'Estrategia de adquisición'}</h4><p>${en ? 'Optimized paid and organic channels to attract high-quality users at the lowest cost.' : 'Canales pagos y orgánicos optimizados para atraer usuarios de alta calidad al menor costo.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"></line><line x1="12" x2="12" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="14"></line></svg></div><div><h4>${en ? 'Marketing analytics' : 'Analítica de marketing'}</h4><p>${en ? 'End-to-end measurement systems to understand which channels and messages generate the greatest impact.' : 'Sistemas de medición end-to-end para entender qué canales y mensajes generan mayor impacto.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><line x1="12" x2="12" y1="1" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div><div><h4>${en ? 'Investment optimization' : 'Optimización de inversión'}</h4><p>${en ? 'Continuous budget reallocation based on real performance data.' : 'Redistribución continua del presupuesto basada en datos de performance real.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg></div><div><h4>${en ? 'SEO and organic positioning' : 'SEO y posicionamiento orgánico'}</h4><p>${en ? 'Content and technical strategies to sustainably improve organic visibility.' : 'Estrategias de contenido y técnicas para mejorar visibilidad orgánica de forma sostenida.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'More qualified traffic' : 'Más tráfico calificado'}</h4><p>${en ? 'Users with greater purchase intent and better fit with your product.' : 'Usuarios con mayor intención de compra y mejor fit con tu producto.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Better ROAS' : 'Mejor ROAS'}</h4><p>${en ? 'Greater return on ad spend with optimized budget.' : 'Mayor retorno sobre inversión publicitaria con presupuesto optimizado.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Sustainable growth' : 'Crecimiento sostenible'}</h4><p>${en ? 'Strategies that work short and long term without depending on a single channel.' : 'Estrategias que funcionan a corto y largo plazo sin depender de un solo canal.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Brand visibility' : 'Visibilidad de marca'}</h4><p>${en ? 'Greater digital presence in the channels where your key audience is.' : 'Mayor presencia digital en los canales donde está tu audiencia clave.'}</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">${en ? 'Process' : 'Proceso'}</div>
<h2 class="jc-heading">${en ? 'How we work' : 'Cómo trabajamos'}</h2>
</div>
<div class="jc-grid">
<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg></div>
<h4 class="jc-title">${en ? 'Audit' : 'Auditoría'}</h4>
<p class="jc-quote">${en ? 'We analyze channels, audiences, and current performance.' : 'Analizamos canales, audiencias y performance actual.'}</p>
<p class="jc-desc">${en ? 'We audit marketing channels, key audiences, and performance metrics to identify opportunities.' : 'Auditamos los canales de marketing, audiencias clave y métricas de performance para identificar oportunidades.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg></div>
<h4 class="jc-title">${en ? 'Strategy' : 'Estrategia'}</h4>
<p class="jc-quote">${en ? 'We define the channel mix and prioritized growth KPIs.' : 'Definimos el mix y KPIs de crecimiento priorizados.'}</p>
<p class="jc-desc">${en ? 'We define channel mix, objectives, and growth KPIs prioritized by impact and feasibility.' : 'Definimos mix de canales, objetivos y KPIs de crecimiento priorizados por impacto y viabilidad.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg></div>
<h4 class="jc-title">${en ? 'Execution' : 'Ejecución'}</h4>
<p class="jc-quote">${en ? 'We implement campaigns focused on real data.' : 'Implementamos campañas con foco en datos reales.'}</p>
<p class="jc-desc">${en ? 'We implement campaigns focused on data and continuous improvement from the first day of activation.' : 'Implementamos campañas con foco en datos y mejora continua desde el primer día de activación.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Optimization' : 'Optimización'}</h4>
<p class="jc-quote">${en ? 'We maximize results with real-time adjustments.' : 'Maximizamos resultados con ajustes en tiempo real.'}</p>
<p class="jc-desc">${en ? 'Real-time adjustments based on performance to maximize the return on each channel.' : 'Ajustes en tiempo real basados en performance para maximizar el retorno de cada canal.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want to accelerate your growth?' : '¿Quieres acelerar tu crecimiento?'}</h2><p>${en ? "Let's talk about scaling your acquisition and improving your marketing investment." : 'Hablemos sobre cómo escalar tu adquisición y mejorar tu inversión en marketing.'}</p><div class="cta-band-actions"><a class="btn-white" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer">${en ? 'Schedule a call →' : 'Agendar llamada →'}</a><a class="btn-wa-outline" href="${en ? 'https://wa.me/13123509796?text=Hi%2C%20I%20came%20from%20the%20Bonsight%20website%20and%20would%20like%20to%20speak%20with%20the%20team.' : 'https://wa.me/13123509796?text=Hola%2C%20vengo%20del%20sitio%20de%20Bonsight%20y%20quisiera%20hablar%20con%20el%20equipo.'}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div>

${getFooter(locale)}
`;
}

export default async function GrowthPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
