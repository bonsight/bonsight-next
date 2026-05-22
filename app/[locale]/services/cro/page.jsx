import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  return `
<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">${en ? 'CRO — Conversion Optimization' : 'CRO — Optimización de Conversión'}</h1><a class="btn-primary" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer" data-animate data-animate-delay="2">${en ? 'Schedule a call' : 'Agendar llamada'}</a></div><p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? 'We optimize conversion and user experience. We apply analytics, experimentation, and design to increase sales and elevate satisfaction at every touchpoint.' : 'Optimizamos la conversión y la experiencia del usuario. Aplicamos analítica, experimentación y diseño para incrementar ventas y elevar la satisfacción en cada punto de contacto.'}</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>${en ? 'What it includes' : 'Qué incluye'}</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem">${en ? 'Included services' : 'Servicios incluidos'}</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div><div><h4>${en ? 'Conversion funnel analysis' : 'Análisis del funnel de conversión'}</h4><p>${en ? 'We identify where you lose users and the economic impact of each friction point.' : 'Identificamos dónde pierdes usuarios y el impacto económico de cada punto de fricción.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline></svg></div><div><h4>${en ? 'Experimentation and A/B testing' : 'Experimentación y A/B testing'}</h4><p>${en ? 'Experiments to validate improvement hypotheses with statistical rigor and solid methodology.' : 'Experimentos para validar hipótesis de mejora con rigor estadístico y metodología sólida.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></div><div><h4>${en ? 'UX Research and usability' : 'UX Research y usabilidad'}</h4><p>${en ? 'We research user behavior to find improvement opportunities.' : 'Investigamos el comportamiento de tus usuarios para encontrar oportunidades de mejora.'}</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div><div><h4>${en ? 'Personalization' : 'Personalización'}</h4><p>${en ? 'Personalized experiences by segment, channel, and funnel stage to maximize relevance.' : 'Experiencias personalizadas por segmento, canal y etapa del funnel para maximizar relevancia.'}</p></div></div></div></div><div class="outcomes-panel"><h3>${en ? "What you'll achieve" : 'Lo que lograrás'}</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Higher conversion rate' : 'Mayor tasa de conversión'}</h4><p>${en ? 'More sales with the same traffic you already have today.' : 'Más ventas con el mismo tráfico que ya tienes hoy en tu sitio.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Lower CAC' : 'Menor CAC'}</h4><p>${en ? 'Reduced acquisition cost by improving funnel efficiency.' : 'Reducción del costo de adquisición al mejorar la eficiencia del funnel.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Better UX' : 'Mejor UX'}</h4><p>${en ? 'Smoother experience that increases user satisfaction and retention.' : 'Experiencia más fluida que incrementa satisfacción y retención de usuarios.'}</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>${en ? 'Experimentation culture' : 'Cultura de experimentación'}</h4><p>${en ? 'Your team learns to decide with validated data, not opinions.' : 'Tu equipo aprende a decidir con datos validados, no con opiniones.'}</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">${en ? 'Process' : 'Proceso'}</div>
<h2 class="jc-heading">${en ? 'How we work' : 'Cómo trabajamos'}</h2>
</div>
<div class="jc-grid">
<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.35-4.35"></path></svg></div>
<h4 class="jc-title">${en ? 'Diagnosis' : 'Diagnóstico'}</h4>
<p class="jc-quote">${en ? 'We identify exactly where you lose conversions.' : 'Identificamos exactamente dónde pierdes conversiones.'}</p>
<p class="jc-desc">${en ? 'We map the funnel and identify bottlenecks with qualitative and quantitative data.' : 'Mapeamos el funnel e identificamos cuellos de botella con datos cualitativos y cuantitativos.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
<h4 class="jc-title">${en ? 'Hypotheses' : 'Hipótesis'}</h4>
<p class="jc-quote">${en ? 'We prioritize the highest-impact opportunities.' : 'Priorizamos las oportunidades de mayor impacto.'}</p>
<p class="jc-desc">${en ? 'We generate hypotheses prioritized by potential impact and confidence level.' : 'Generamos hipótesis priorizadas por impacto potencial y nivel de confianza.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg></div>
<h4 class="jc-title">${en ? 'Experiments' : 'Experimentos'}</h4>
<p class="jc-quote">${en ? 'We validate each change with statistical rigor.' : 'Validamos cada cambio con rigor estadístico.'}</p>
<p class="jc-desc">${en ? 'We design and run tests with rigorous methodology to validate each hypothesis.' : 'Diseñamos y ejecutamos tests con metodología rigurosa para validar cada hipótesis.'}</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-.18-5"></path></svg></div>
<h4 class="jc-title">${en ? 'Learning' : 'Aprendizaje'}</h4>
<p class="jc-quote">${en ? "We scale what works and keep improving." : 'Escalamos lo que funciona y seguimos mejorando.'}</p>
<p class="jc-desc">${en ? 'We consolidate learnings and scale what works to generate sustained impact.' : 'Consolidamos aprendizajes y escalamos lo que funciona para generar impacto sostenido.'}</p>
</div>
</div>
</div>

<div class="cta-band" data-animate><h2>${en ? 'Want to improve your conversion?' : '¿Quieres mejorar tu conversión?'}</h2><p>${en ? "Let's talk about converting more with the users you already have." : 'Hablemos sobre cómo convertir más con los usuarios que ya tienes.'}</p><div class="cta-band-actions"><a class="btn-white" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer">${en ? 'Schedule a call →' : 'Agendar llamada →'}</a><a class="btn-wa-outline" href="${en ? 'https://wa.me/13123509796?text=Hi%2C%20I%20came%20from%20the%20Bonsight%20website%20and%20would%20like%20to%20speak%20with%20the%20team.' : 'https://wa.me/13123509796?text=Hola%2C%20vengo%20del%20sitio%20de%20Bonsight%20y%20quisiera%20hablar%20con%20el%20equipo.'}" target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div>

${getFooter(locale)}
`;
}

export default async function CroPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
