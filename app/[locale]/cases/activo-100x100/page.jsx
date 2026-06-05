import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/cases">← ${en ? 'All cases' : 'Todos los casos'}</button>
<div class="svc-hero-badge" data-animate>
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
<span>${en ? 'Success story' : 'Caso de éxito'}</span>
</div>
<div style="font-family:var(--mono);font-size:0.68rem;color:rgba(255,255,255,0.35);letter-spacing:0.14em;text-transform:uppercase;margin-bottom:0.75rem">Activo 100×100 · ${en ? 'Real Estate · Investment · Venezuela' : 'Inmobiliaria · Inversión · Venezuela'}</div>
<h1 data-animate data-animate-delay="1">${en ? 'Brand building and digital sales for a new real estate investment model' : 'Construcción de marca y ventas digitales para un nuevo modelo de inversión inmobiliaria'}</h1>
<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1.75rem">
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Brand Strategy' : 'Estrategia de marca'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">Meta Ads</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Content' : 'Contenido'}</span>
<span style="font-family:var(--mono);font-size:0.6rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent-mid);background:rgba(29,158,117,0.12);border:1px solid rgba(29,158,117,0.2);padding:0.3rem 0.7rem">${en ? 'Lead Generation' : 'Generación de leads'}</span>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "Activo 100×100 launched with an innovative real estate investment model — but no digital presence and a market that didn't know them. We built the brand, the content, and the digital sales system from scratch." : 'Activo 100×100 lanzó con un modelo innovador de inversión inmobiliaria — pero sin presencia digital y un mercado que no los conocía. Construimos la marca, el contenido y el sistema de ventas digital desde cero.'}</p>
</div>
</div>

<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The situation' : 'La situación'}</div>
<h2 class="case-section-title">${en ? 'Building credibility in a trust-dependent market' : 'Construir credibilidad en un mercado que depende de la confianza'}</h2>
<p class="case-body-text">${en ? "Real estate investments require trust. Activo 100×100 had a compelling product — fractional property investment with guaranteed returns — but no track record online. Their potential investors searched for them and found nothing." : 'Las inversiones inmobiliarias requieren confianza. Activo 100×100 tenía un producto atractivo — inversión fraccionada en propiedades con rentabilidad garantizada — pero sin historial online. Sus potenciales inversores los buscaban y no encontraban nada.'}</p>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'New brand with zero digital presence' : 'Marca nueva con cero presencia digital'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Complex product that required education to convert' : 'Producto complejo que requería educación para convertir'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Market with high distrust toward new investments' : 'Mercado con alta desconfianza hacia inversiones nuevas'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'No existing marketing infrastructure' : 'Sin infraestructura de marketing existente'}</p></div>
</div>
</div>
<div>
<div class="eyebrow">${en ? 'Our approach' : 'Nuestro enfoque'}</div>
<h2 class="case-section-title">${en ? 'Trust before conversion' : 'Confianza antes de conversión'}</h2>
<p class="case-body-text">${en ? "Before running any ad, we built the brand's voice and content narrative. The investment in education came first — then qualified leads." : 'Antes de correr cualquier ad, construimos la voz de la marca y la narrativa de contenido. La inversión en educación primero — luego los leads calificados.'}</p>
<div class="phase-grid" style="margin-top:2rem">
<div class="phase-card" data-animate>
<div class="phase-num">01</div>
<div class="phase-label">${en ? 'Brand & Voice' : 'Marca & Voz'}</div>
<p>${en ? 'Brand strategy, tone of voice, key messages, and visual guidelines for all digital channels.' : 'Estrategia de marca, tono de voz, mensajes clave y lineamientos visuales para todos los canales digitales.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="1">
<div class="phase-num">02</div>
<div class="phase-label">${en ? 'Education & Content' : 'Educación & Contenido'}</div>
<p>${en ? 'Content plan focused on explaining the investment model, building authority, and generating organic trust.' : 'Plan de contenido centrado en explicar el modelo de inversión, generar autoridad y construir confianza orgánica.'}</p>
</div>
<div class="phase-card" data-animate data-animate-delay="2">
<div class="phase-num">03</div>
<div class="phase-label">${en ? 'Paid Acquisition' : 'Adquisición Pagada'}</div>
<p>${en ? 'Meta Ads campaigns for lead generation with warm audiences built from content. Longer cycle, higher quality leads.' : 'Campañas de Meta Ads para generación de leads con audiencias templadas construidas desde el contenido. Ciclo más largo, leads de mayor calidad.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- PROCESS -->
<div class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'What we did' : 'Qué hicimos'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'From zero presence to active sales in 4 months' : 'De cero presencia a ventas activas en 4 meses'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Brand strategy' : 'Estrategia de marca'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? "Brand positioning, investor persona definition, key messages, and the brand's narrative arc for each stage of the investment journey." : 'Posicionamiento de marca, definición del perfil de inversor, mensajes clave y el arco narrativo de la marca para cada etapa del viaje de inversión.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Website and landing pages' : 'Sitio web y landing pages'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Main site optimized to convert visitors into leads. Specific landing pages per investment type with content that builds trust step by step.' : 'Sitio principal optimizado para convertir visitantes en leads. Landing pages específicas por tipo de inversión con contenido que construye confianza paso a paso.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Social content plan' : 'Plan de contenido social'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Weekly content on Instagram and LinkedIn to educate, build authority, and stay top of mind with potential investors.' : 'Contenido semanal en Instagram y LinkedIn para educar, generar autoridad y mantenerse top of mind con inversores potenciales.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'Meta Ads with warm audiences' : 'Meta Ads con audiencias templadas'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Campaigns that first targeted content audiences — people who already knew the brand — before targeting cold audiences. Shorter funnel, better cost per qualified lead.' : 'Campañas que primero apuntaron a audiencias de contenido — personas que ya conocían la marca — antes de atacar audiencias frías. Funnel más corto, mejor costo por lead calificado.'}</p></div>
</div>
</div>
</div>

<!-- RESULTS -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'Results' : 'Resultados'}</div>
<h2>${en ? 'What we built in 4 months' : 'Lo que construimos en 4 meses'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div><h4>${en ? 'Brand launched from scratch with credibility' : 'Marca lanzada desde cero con credibilidad'}</h4><p>${en ? 'An active community of engaged investors.' : 'Una comunidad activa de inversores comprometidos.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h4>${en ? 'Qualified leads in the first 60 days' : 'Leads calificados en los primeros 60 días'}</h4><p>${en ? 'With average ticket above $5,000 USD.' : 'Con ticket promedio por encima de $5,000 USD.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div><h4>${en ? 'Active sales funnel from month 4' : 'Funnel de ventas activo desde el mes 4'}</h4><p>${en ? 'First closings within the projected timeline.' : 'Primeros cierres dentro del timeline proyectado.'}</p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div><h4>${en ? 'Cost per qualified lead 40% below goal' : 'Costo por lead calificado 40% por debajo del objetivo'}</h4><p>${en ? 'Thanks to the warm audience strategy before cold campaigns.' : 'Gracias a la estrategia de audiencias templadas antes de campañas frías.'}</p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? 'In a market of distrust, trust is the product. We built that first — and sales followed.' : 'En un mercado de desconfianza, la confianza es el producto. Eso construimos primero — y las ventas llegaron después.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Building a new brand and need to grow digitally?' : '¿Construyendo una nueva marca y necesitas crecer digitalmente?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function Activo100x100Page({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Activo 100×100 | Brand building and digital sales · Bonsight' : 'Activo 100×100 | Construcción de marca y ventas digitales · Bonsight',
    description: en
      ? 'How Bonsight helped Activo 100×100 launch a new real estate investment brand from scratch — building credibility and generating qualified leads in 4 months.'
      : 'Cómo Bonsight ayudó a Activo 100×100 a lanzar una nueva marca de inversión inmobiliaria desde cero — construyendo credibilidad y generando leads calificados en 4 meses.',
  };
}
