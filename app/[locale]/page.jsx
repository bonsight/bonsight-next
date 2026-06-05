import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

function getHtml(locale) {
  const en = locale === 'en';
  const footer = getFooter(locale);
  return `
<!-- HERO -->
<div class="hero">
<div class="hero-left">
<div class="hero-eyebrow">Bonsight</div>
<h1>${en ? 'We turn data, technology, and strategy into <em>real growth</em>' : 'Convertimos datos, tecnología y estrategia en <em>crecimiento real</em>'}</h1>
<p class="hero-sub">${en ? 'We accompany companies that want to grow and scale digital products with intelligence and focus. No fluff, no generic consultancies, no PowerPoints nobody executes.' : 'Acompañamos a empresas que quieren crecer y escalar productos digitales con inteligencia y foco. Sin humo, sin consultoras genéricas, sin PowerPoints que nadie ejecuta.'}</p>
<div class="hero-actions">
<button class="btn-primary" data-scroll="#products-anchor">${en ? 'See how we work' : 'Conoce cómo trabajamos'}</button>
<button class="btn-outline" data-route="/consulta">${en ? "Let's talk" : 'Conversemos'}</button>
</div>
</div>
<div class="hero-right">
<img class="hero-photo" src="/hero_home.png" alt="Equipo Bonsight" />
</div>
</div>

<!-- HERO / BAND SEPARATOR -->
<div style="height:2px;background:var(--accent);opacity:0.7"></div>

<!-- PROBLEM BAND -->
<div class="band-dark">
<div class="band-dark-inner">
<div>
<h2>${en ? 'Growth without structure is expensive' : 'El crecimiento sin estructura cuesta caro'}</h2>
<p>${en ? 'When a business grows fast, so does the disorder. Overloaded teams, unused data, strategies that never reach real decisions. The result: lots of effort, little progress.' : 'Cuando un negocio crece rápido, el desorden crece con él. Equipos sobrecargados, datos sin usar, estrategias que no bajan a decisiones reales. El resultado: mucho esfuerzo, poco avance.'}</p>
<p style="margin-top:1.25rem">${en ? 'Bonsight steps in where the business needs clarity, visibility, and structure — and doesn\'t leave until progress is visible.' : 'Bonsight entra donde el negocio necesita claridad, visibilidad y estructura — y no se va hasta que el avance sea visible.'}</p>
</div>
<div class="band-dark-right">
<div class="band-stat" data-animate>
<h4>${en ? 'Overloaded teams' : 'Equipos sobrecargados'}</h4>
<p>${en ? 'Everyone busy, but the business moves slowly.' : 'Todos ocupados, pero el negocio avanza lento.'}</p>
</div>
<div class="band-stat" data-animate data-animate-delay="1">
<h4>${en ? 'Unused data' : 'Datos sin usar'}</h4>
<p>${en ? 'Tools installed, decisions still made on intuition.' : 'Herramientas instaladas, decisiones por intuición.'}</p>
</div>
<div class="band-stat" data-animate data-animate-delay="2">
<h4>${en ? 'Strategy without execution' : 'Estrategia sin ejecución'}</h4>
<p>${en ? 'Plans that look good on paper but never land.' : 'Planes que se ven bien en papel pero nunca bajan.'}</p>
</div>
</div>
</div>
</div>

<!-- THREE PRODUCTS -->
<div class="section" id="products-anchor">
<div class="eyebrow">${en ? 'Services' : 'Servicios'}</div>
<h2>${en ? 'Three products. Three real problems.' : 'Tres productos. Tres problemas reales.'}</h2>
<p class="section-sub">${en ? 'Each Bonsight product is built to solve a specific problem. Choose the one that fits your situation, or combine them.' : 'Cada producto de Bonsight está construido para resolver un problema específico. Elige el que se ajusta a tu situación, o combínalos.'}</p>
<div class="product-grid">

<div class="product-card" data-animate data-route="/services/kairo">
<div class="product-card-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
<h3>Kairo</h3>
<div class="product-card-tag">${en ? 'Strategic clarity' : 'Claridad estratégica'}</div>
<div class="product-card-tagline">${en ? 'For companies growing with disorder' : 'Para empresas que crecen con desorden'}</div>
<p class="product-card-desc">${en ? 'We order focus, align the team, and bring strategy down to real decisions and execution.' : 'Ordenamos el foco, alineamos al equipo y bajamos la estrategia a decisiones y ejecución real.'}</p>
<div class="product-card-ideal"><strong>${en ? 'Right for you if' : 'Ideal si'}</strong>${en ? 'your business moves but without clear direction, or your leaders are fighting fires instead of leading.' : 'tu negocio avanza pero sin dirección clara, o tus líderes están apagando fuegos en lugar de dirigir.'}</div>
<div class="product-card-link">Kairo <svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
</div>

<div class="product-card" data-animate data-animate-delay="1" data-route="/services/lumen">
<div class="product-card-icon"><svg viewbox="0 0 24 24"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
<h3>Lumen</h3>
<div class="product-card-tag">${en ? 'Data and growth' : 'Datos y crecimiento'}</div>
<div class="product-card-tagline">${en ? 'For companies with activity but no visibility' : 'Para empresas con actividad pero sin visibilidad'}</div>
<p class="product-card-desc">${en ? 'We turn your data into decisions and use that visibility to grow: Data Strategy, Growth and CRO as a continuous cycle.' : 'Convertimos tus datos en decisiones y usamos esa visibilidad para crecer: Data Strategy, Growth y CRO como un ciclo continuo.'}</p>
<div class="product-card-ideal"><strong>${en ? 'Right for you if' : 'Ideal si'}</strong>${en ? 'you have traffic that doesn\'t convert, campaigns without clear ROI, or data nobody is using well.' : 'tienes tráfico que no convierte, campañas sin retorno claro, o datos que nadie está usando bien.'}</div>
<div class="product-card-link">Lumen <svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
</div>

<div class="product-card" data-animate data-animate-delay="2" data-route="/services/arke">
<div class="product-card-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
<h3>Arke</h3>
<div class="product-card-tag">${en ? 'Teams and operations' : 'Equipos y operación'}</div>
<div class="product-card-tagline">${en ? 'For teams that grew but structure didn\'t' : 'Para equipos que crecieron pero la estructura no'}</div>
<p class="product-card-desc">${en ? 'We build the processes, leadership, and ways of working that allow scaling without breaking.' : 'Construimos los procesos, el liderazgo y la forma de trabajar que permiten escalar sin romperse.'}</p>
<div class="product-card-ideal"><strong>${en ? 'Right for you if' : 'Ideal si'}</strong>${en ? 'critical knowledge lives in people, not systems, or your team works hard but moves slowly.' : 'el conocimiento clave vive en personas, no en sistemas, o tu equipo trabaja mucho pero avanza poco.'}</div>
<div class="product-card-link">Arke <svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
</div>

</div>
</div>

<!-- CLIENTS -->
<div class="clients-wrap">
<div class="clients-inner">
<div class="clients-label" data-animate>${en ? 'Clients' : 'Clientes'}</div>
<h2 class="clients-heading">${en ? 'Companies that trust Bonsight' : 'Empresas que confían en Bonsight'}</h2>
<div class="clients-row">

<div class="client-logo client-logo--link" data-animate data-route="/cases/olaclick">
<svg fill="none" height="36" viewbox="0 0 120 36" width="120">
<text fill="#0066FF" font-family="Arial,sans-serif" font-size="24" font-weight="700" x="0" y="27">OlaClick</text>
<circle cx="113" cy="8" fill="none" r="4" stroke="#00E5C3" stroke-dasharray="6 3" stroke-width="2"/>
</svg>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>

<div class="client-logo client-logo--link" data-animate data-animate-delay="1" data-route="/cases/sesuveca">
<svg fill="none" height="36" viewbox="0 0 160 36" width="160">
<polygon fill="#1B3A6B" points="18,2 32,10 32,26 18,34 4,26 4,10"/>
<polygon fill="none" points="18,7 27,12 27,24 18,29 9,24 9,12" stroke="white" stroke-width="1.5"/>
<polygon fill="#1B3A6B" points="18,12 23,15 23,21 18,24 13,21 13,15" stroke="white" stroke-width="1"/>
<text fill="#1B3A6B" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1" x="40" y="20">SESUVECA</text>
<text fill="#5577AA" font-family="Arial,sans-serif" font-size="8" letter-spacing="2" x="40" y="32">DEL PERÚ</text>
</svg>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>

<div class="client-logo client-logo--link" data-animate data-animate-delay="2" data-route="/cases/af-solutions">
<svg fill="none" height="36" viewbox="0 0 150 36" width="150">
<text fill="#1D4ED8" font-family="Arial,sans-serif" font-size="22" font-weight="700" x="0" y="26">AF</text>
<text fill="#3B82F6" font-family="Arial,sans-serif" font-size="15" font-weight="600" letter-spacing="0.5" x="38" y="26">Solutions</text>
<line x1="0" y1="31" x2="146" y2="31" stroke="#BFDBFE" stroke-width="1"/>
</svg>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>

<div class="client-logo client-logo--link" data-animate data-animate-delay="3" data-route="/cases/activo-100x100">
<div style="background:#111110;padding:0.45rem 1rem;display:inline-flex;align-items:center">
<img src="https://activos100x100.com/wp-content/uploads/2026/01/Logo-web-activos100x100-blanco.png" alt="Activos 100x100" style="height:30px;width:auto;object-fit:contain" />
</div>
<span class="client-logo-hint">${en ? 'View case →' : 'Ver caso →'}</span>
</div>

</div>
<div style="text-align:center;margin-top:3rem">
<button class="btn-outline-dark" data-route="/cases">${en ? '→ See all cases' : '→ Ver todos los casos'}</button>
</div>
</div>
</div>

<!-- WHY BONSIGHT -->
<div class="why-wrap">
<div class="why-inner">
<div class="why-text">
<div class="eyebrow">${en ? 'Why Bonsight' : 'Por qué Bonsight'}</div>
<h2>${en ? "We're not a traditional consultancy" : 'No somos una consultora tradicional'}</h2>
<p>${en ? "We don't sell hours or profiles. We don't deliver documents and leave. We get inside the real business, accompany execution, and don't leave until progress is visible." : 'No vendemos horas ni perfiles. No entregamos documentos y nos vamos. Nos metemos en el negocio real, acompañamos la ejecución y no salimos hasta que el avance es visible.'}</p>
<p style="margin-top:0.75rem">${en ? 'We work with companies in Peru, Chile, Spain and Venezuela — and keep growing across Latin America and the USA.' : 'Trabajamos con empresas en Perú, Chile, España y Venezuela — y seguimos creciendo en Latinoamérica y USA.'}</p>
</div>
<div>
<div class="why-pills">
<div class="why-pill" data-animate>
<h4>${en ? 'Focus on execution, not recommendations' : 'Foco en ejecución, no en recomendaciones'}</h4>
<p>${en ? 'We commit to visible results, not billed hours.' : 'Nos comprometemos con resultados visibles, no con horas facturadas.'}</p>
</div>
<div class="why-pill" data-animate data-animate-delay="1">
<h4>${en ? 'We adapt to the real business' : 'Adaptamos al negocio real'}</h4>
<p>${en ? 'No generic recipes. Every engagement starts by understanding the business from the inside.' : 'No usamos recetas genéricas. Cada acompañamiento parte de entender el negocio desde adentro.'}</p>
</div>
<div class="why-pill" data-animate data-animate-delay="2">
<h4>${en ? 'We leave installed capabilities' : 'Dejamos capacidades instaladas'}</h4>
<p>${en ? "When we finish, the team can continue on its own. We don't create dependency." : 'Cuando terminamos, el equipo puede seguir solo. No creamos dependencia.'}</p>
</div>
</div>
</div>
</div>
</div>

<!-- CONTACT -->
<section class="contact-section" id="contacto">
<div class="contact-section-inner">
<div class="contact-copy">
<div class="contact-eyebrow">${en ? 'Contact' : 'Contacto'}</div>
<h2 class="contact-title">${en ? 'Tell us what you need' : 'Cuéntanos qué necesitas'}</h2>
<p class="contact-desc">${en ? "We'll analyze your situation and get back to you within 24 hours with a clear recommendation — no strings attached." : 'Analizamos tu situación y te respondemos en menos de 24 horas con una recomendación clara — sin compromiso.'}</p>
<div class="contact-reasons">
<div class="contact-reason">
<div class="contact-reason-icon"><svg viewbox="0 0 24 24"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z"/></svg></div>
<div>
<div class="contact-reason-title">${en ? 'Free diagnosis' : 'Diagnóstico gratuito'}</div>
<div class="contact-reason-text">${en ? 'First conversation to understand your current situation.' : 'Primera conversación para entender tu situación actual.'}</div>
</div>
</div>
<div class="contact-reason">
<div class="contact-reason-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
<div>
<div class="contact-reason-title">${en ? 'Response within 24 hours' : 'Respuesta en 24 horas'}</div>
<div class="contact-reason-text">${en ? "We don't leave you waiting. We reply within the next business day." : 'No te dejamos esperando. Respondemos al siguiente día hábil.'}</div>
</div>
</div>
<div class="contact-reason">
<div class="contact-reason-icon"><svg viewbox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
<div>
<div class="contact-reason-title">${en ? 'Direct contact with the team' : 'Contacto directo con el equipo'}</div>
<div class="contact-reason-text">${en ? 'You speak directly with whoever will work on your project.' : 'Hablas directamente con quien va a trabajar en tu proyecto.'}</div>
</div>
</div>
</div>
<a href="https://wa.me/13123509796" target="_blank" rel="noopener" class="contact-whatsapp">
<svg width="16" height="16" viewbox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
WhatsApp
</a>
</div>
<div class="contact-form-wrap">
<form class="contact-form" data-contact-form novalidate>
<div class="form-row">
<div class="form-field">
<label>${en ? 'Name *' : 'Nombre *'}</label>
<input type="text" name="name" required placeholder="${en ? 'Your name' : 'Tu nombre'}" />
</div>
<div class="form-field">
<label>Email *</label>
<input type="email" name="email" required placeholder="email@empresa.com" />
</div>
</div>
<div class="form-row">
<div class="form-field">
<label>${en ? 'Company' : 'Empresa'}</label>
<input type="text" name="company" placeholder="${en ? 'Your company' : 'Tu empresa'}" />
</div>
<div class="form-field">
<label>${en ? 'Service of interest' : 'Servicio de interés'}</label>
<select name="service">
<option value="">${en ? 'Select a service' : 'Selecciona un servicio'}</option>
<option value="kairo">Kairo — ${en ? 'Strategic clarity' : 'Claridad estratégica'}</option>
<option value="lumen">Lumen — ${en ? 'Data and growth' : 'Datos y crecimiento'}</option>
<option value="arke">Arke — ${en ? 'Teams and operations' : 'Equipos y operación'}</option>
<option value="varios">${en ? "I'm not sure yet" : 'No estoy seguro aún'}</option>
</select>
</div>
</div>
<div class="form-field">
<label>${en ? 'What do you need? *' : '¿Qué necesitas? *'}</label>
<textarea name="message" rows="5" required placeholder="${en ? 'Tell us about your situation...' : 'Cuéntanos sobre tu situación...'}"></textarea>
</div>
<div class="form-footer">
<button type="submit" class="btn-submit" data-label="${en ? 'Send message' : 'Enviar mensaje'}" data-sending="${en ? 'Sending...' : 'Enviando...'}">
${en ? 'Send message' : 'Enviar mensaje'}
<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
</button>
<p class="form-note">${en ? 'We respond within 24 business hours.' : 'Respondemos en 24 horas hábiles.'}</p>
</div>
<div class="fcf-msg success" data-fcf-success>${en ? '✓ Message sent. We\'ll be in touch soon.' : '✓ Mensaje enviado. Te contactamos pronto.'}</div>
<div class="fcf-msg error" data-fcf-error>${en ? 'Something went wrong. Please try again.' : 'Algo salió mal. Por favor intenta de nuevo.'}</div>
</form>
</div>
</div>
</section>

${footer}
`;
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  return <RawHtml html={getHtml(locale)} />;
}
