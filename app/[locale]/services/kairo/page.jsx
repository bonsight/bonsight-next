import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<div class="svc-hero">
<div class="svc-hero-inner">
<div>
<button class="back-btn" data-route="/">← ${en ? 'Back' : 'Volver'}</button>
<div class="svc-hero-badge" data-animate>
<svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
<span>Kairo</span>
</div>
<h1 data-animate data-animate-delay="1">${en ? 'When the business grows, so does the chaos' : 'Cuando el negocio crece, el desorden también'}</h1>
<div class="svc-hero-actions" data-animate data-animate-delay="2">
<button class="btn-primary" data-route="/consulta">${en ? "Let's talk" : 'Conversemos'}</button>
<button class="btn-outline" data-scroll="#kairo-how">${en ? 'See how it works' : 'Ver cómo funciona'}</button>
</div>
</div>
<p class="svc-hero-desc" data-animate data-animate-delay="1">${en ? "The problem is rarely a lack of talent. It's usually a lack of focus, structure, and clear decisions. Kairo is the strategic accompaniment that gets inside the business, orders priorities, and walks alongside decisions until progress becomes visible." : 'El problema no suele ser falta de talento. Suele ser falta de foco, orden y decisiones claras. Kairo es el acompañamiento estratégico que se mete en el negocio, ordena las prioridades y acompaña las decisiones hasta que el avance se vuelve visible.'}</p>
</div>
</div>

<!-- PROBLEM + WHAT IS KAIRO -->
<div class="svc-body">
<div class="svc-grid">
<div>
<div class="eyebrow">${en ? 'The problem' : 'El problema'}</div>
<h2 class="case-section-title">${en ? 'Does any of this sound familiar?' : '¿Te suena alguno de estos?'}</h2>
<div class="bullet-list" style="margin-top:1.5rem">
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Strategy that\'s unclear or invisible to the team' : 'Estrategia poco clara o invisible para el equipo'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Everyone busy, but the business moves slowly' : 'Todos ocupados, pero el negocio avanza lento'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Weak prioritization — everything feels urgent' : 'Priorización débil — todo parece urgente'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Decisions that get blocked or made too late' : 'Decisiones que se bloquean o se toman tarde'}</p></div>
<div class="bullet-item"><div class="bullet-dot"></div><p>${en ? 'Fatigue from consultancies that don\'t generate real impact' : 'Cansancio frente a consultorías que no generan impacto real'}</p></div>
</div>
<div class="section-callout">${en ? 'When there\'s no strategic clarity, the team works harder, but the business moves less.' : 'Cuando no hay claridad estratégica, el equipo trabaja más, pero el negocio avanza menos.'}</div>
</div>
<div>
<div class="eyebrow">${en ? 'What is Kairo' : 'Qué es Kairo'}</div>
<h2 class="case-section-title">${en ? 'Kairo is not traditional consulting' : 'Kairo no es consultoría tradicional'}</h2>
<p class="case-body-text">${en ? "Kairo is a strategic accompaniment that integrates into the real business. We don't deliver a PowerPoint and leave. We get into the decisions, order the focus, and accompany execution without replacing your team." : 'Kairo es un acompañamiento estratégico que se integra al negocio real. No entregamos un PowerPoint y nos vamos. Nos metemos en las decisiones, ordenamos el foco y acompañamos la ejecución sin reemplazar a tu equipo.'}</p>
<table class="compare-table">
<thead>
<tr>
<th>${en ? 'Traditional consulting' : 'Consultoría tradicional'}</th>
<th>Kairo</th>
</tr>
</thead>
<tbody>
<tr><td>${en ? 'Sells hours or profiles' : 'Vende horas o perfiles'}</td><td>${en ? 'Sells visible progress' : 'Vende avance visible'}</td></tr>
<tr><td>${en ? 'Delivers generic recipes' : 'Entrega recetas genéricas'}</td><td>${en ? 'Adapts to the real business' : 'Se adapta al negocio real'}</td></tr>
<tr><td>${en ? 'Stays in the document' : 'Se queda en el documento'}</td><td>${en ? 'Brings strategy to decisions' : 'Baja la estrategia a decisiones'}</td></tr>
<tr><td>${en ? 'Accompanies little change' : 'Acompaña poco el cambio'}</td><td>${en ? 'Accompanies execution' : 'Acompaña la ejecución'}</td></tr>
</tbody>
</table>
</div>
</div>
</div>

<!-- WHO IT'S FOR -->
<div class="about-wrap">
<div class="about-inner">
<div class="about-text-block" data-animate>
<div class="eyebrow">${en ? 'Who it\'s for' : 'Para quién es'}</div>
<h2>${en ? 'Kairo is for you if...' : 'Kairo es para ti si...'}</h2>
<p>${en ? "Kairo is not for those who need extra hands. It's for those who need clarity, focus, and direction to move the business." : 'Kairo no es para quien necesita manos extra. Es para quien necesita claridad, foco y dirección para mover el negocio.'}</p>
</div>
<div class="about-pills">
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="pill-text"><h4>${en ? 'Scaling startup' : 'Startup en expansión'}</h4><p>${en ? 'Starting to feel disorder and reactive decisions.' : 'Que empieza a sentir desorden y decisiones reactivas.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div class="pill-text"><h4>${en ? 'Mid-size company' : 'Empresa mediana'}</h4><p>${en ? 'Growth depends on too few people.' : 'El crecimiento depende de muy pocas personas.'}</p></div></div>
<div class="about-pill"><div class="pill-icon"><svg viewbox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg></div><div class="pill-text"><h4>${en ? 'Busy but misaligned team' : 'Equipo ocupado y desalineado'}</h4><p>${en ? "Everyone's very busy but priorities aren't clear or aligned." : 'Todos muy ocupados pero las prioridades no están claras ni alineadas.'}</p></div></div>
</div>
</div>
</div>

<!-- HOW IT WORKS -->
<div id="kairo-how" class="svc-process">
<div class="svc-process-inner">
<div style="padding:4rem 0 0">
<div class="jc-eyebrow">${en ? 'How it works' : 'Cómo funciona'}</div>
<div style="font-family:var(--serif);font-size:clamp(1.8rem,3vw,2.6rem);font-weight:400;letter-spacing:-0.025em;color:var(--white);margin-bottom:3rem">${en ? 'How it works in 3 months' : 'Cómo funciona en 3 meses'}</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:rgba(255,255,255,0.07)">
<div class="proc-step" data-animate style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">01</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'We understand the business' : 'Entendemos el negocio'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'We immerse ourselves in your operation, team, and objectives. No assumptions, no pre-made recipes.' : 'Nos sumergimos en tu operación, tu equipo y tus objetivos. Sin asumir, sin recetas previas.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">02</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'We define focus and priorities' : 'Definimos foco y prioridades'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? "We order what matters and what doesn't, and why. The team leaves aligned around the same things." : 'Ordenamos qué importa, qué no, y por qué. El equipo sale alineado alrededor de lo mismo.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="2" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">03</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'We build an actionable plan' : 'Bajamos un plan accionable'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? 'Strategy becomes concrete decisions, with clear owners and criteria.' : 'La estrategia se convierte en decisiones concretas, con responsables y criterios claros.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="3" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">04</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'We accompany key decisions' : 'Acompañamos decisiones clave'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative">${en ? "We're present when the business needs it — in the meetings that matter, in moments of doubt." : 'Estamos presentes cuando el negocio lo necesita — en las reuniones que importan, en los momentos de duda.'}</p></div>
<div class="proc-step" data-animate data-animate-delay="1" style="background:var(--dark2);padding:2.5rem 2rem;position:relative;overflow:hidden;grid-column:1/-1"><div style="position:absolute;top:1rem;right:1.25rem;font-family:var(--mono);font-size:5rem;font-weight:700;color:rgba(29,158,117,0.07);line-height:1">05</div><h4 style="font-family:var(--serif);font-size:1.2rem;font-weight:400;color:var(--white);margin-bottom:0.75rem;position:relative">${en ? 'We measure, adjust, and close' : 'Medimos, ajustamos y cerramos'}</h4><p style="font-size:0.875rem;color:rgba(255,255,255,0.55);line-height:1.82;position:relative;max-width:640px">${en ? "We validate impact with evidence. If something doesn't work, we change it. If it works, we scale it. From the first month, you should already see clearer conversations, sharper priorities, and better-supported decisions." : 'Validamos el impacto con evidencia. Si algo no funciona, lo cambiamos. Si funciona, lo escalamos. Desde el primer mes ya deberían verse conversaciones más claras, prioridades más nítidas y decisiones mejor sustentadas.'}</p></div>
</div>
</div>
</div>

<!-- WHAT CHANGES -->
<div class="benefits-wrap">
<div class="benefits-inner">
<div class="eyebrow">${en ? 'After Kairo' : 'Después de Kairo'}</div>
<h2>${en ? 'What changes after Kairo' : 'Qué cambia después de Kairo'}</h2>
<div class="benefits-grid" style="margin-top:2.5rem">
<div class="benefit-card" data-animate><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg></div><h4>${en ? 'More clarity on what to do and what not to' : 'Más claridad sobre qué hacer y qué no'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="1"><div class="benefit-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg></div><h4>${en ? 'Faster, better-supported decisions' : 'Decisiones más rápidas y mejor sustentadas'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="2"><div class="benefit-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div><h4>${en ? 'Team aligned around the same focus' : 'Equipo alineado alrededor del mismo foco'}</h4><p></p></div>
<div class="benefit-card" data-animate data-animate-delay="3"><div class="benefit-icon"><svg viewbox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><h4>${en ? 'Leaders who lead instead of fighting fires' : 'Líderes que dirigen en lugar de apagar fuegos'}</h4><p></p></div>
</div>
</div>
</div>

<!-- QUOTE -->
<div class="svc-quote">
<div class="svc-quote-inner">
<p>"${en ? "We don't promise magic. We promise clarity, focus, and better decisions. Done well, that moves the business." : 'No prometemos magia. Prometemos claridad, foco y mejores decisiones. Eso, bien hecho, mueve el negocio.'}"</p>
</div>
</div>

<!-- CTA -->
<div class="cta-band">
<h2>${en ? 'Does your business need strategic clarity?' : '¿Tu negocio necesita claridad estratégica?'}</h2>
<p>${en ? "Let's talk. The first session is free." : 'Conversemos. La primera sesión es sin costo.'}</p>
<button class="btn-white" data-route="/consulta">${en ? 'Schedule a conversation' : 'Agendar conversación'}</button>
</div>

${footer}
`;
}

export default async function KairoPage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const en = locale === 'en';
  return {
    title: en ? 'Kairo | Strategic clarity for growing companies' : 'Kairo | Acompañamiento estratégico para empresas que crecen',
    description: en
      ? "Kairo is Bonsight's strategic accompaniment for companies growing with disorder. We clarify focus, align teams, and turn strategy into real decisions."
      : 'Kairo es el servicio de Bonsight para empresas que crecen con desorden. Ordenamos el foco, alineamos al equipo y bajamos la estrategia a decisiones reales.',
  };
}
