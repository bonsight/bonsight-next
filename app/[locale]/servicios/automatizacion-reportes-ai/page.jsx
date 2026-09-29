import { notFound } from 'next/navigation';
import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

const BASE = 'https://bonsight.co';
const PATH = '/servicios/automatizacion-reportes-ai';

const TITLE = 'Automatización de Reportes con IA';
const DESCRIPTION = 'Diseñamos pipelines que conectan tus fuentes de datos, procesan la información y entregan reportes automáticos — sin depender de pedirle un resumen a un chat cada semana.';

export async function generateMetadata() {
  const url = `${BASE}/es${PATH}`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: `${TITLE} | Bonsight`,
      description: DESCRIPTION,
      url,
      type: 'website',
    },
    // Solo existe en español por ahora — se pisa el alternates genérico del layout
    // (que asume es+en siempre) para no publicar un hreflang="en" que da 404.
    alternates: {
      canonical: url,
      languages: { es: url, 'x-default': url },
    },
  };
}

function jsonLd() {
  const url = `${BASE}/es${PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${BASE}/#organization`,
        name: 'Bonsight',
        url: BASE,
        logo: `${BASE}/logo.svg`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${BASE}/es` },
          { '@type': 'ListItem', position: 2, name: 'Data Strategy', item: `${BASE}/es/services/data-strategy` },
          { '@type': 'ListItem', position: 3, name: TITLE, item: url },
        ],
      },
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: TITLE,
        provider: { '@id': `${BASE}/#organization` },
        description: DESCRIPTION,
        areaServed: ['CL', 'US'],
        serviceType: 'Automatización de reportes con inteligencia artificial',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Cuánto cuesta operar esto en tokens y APIs?',
            acceptedAnswer: { '@type': 'Answer', text: 'Depende del volumen de datos, la frecuencia de los reportes y cuántos canales de entrega se necesiten. Lo dimensionamos en la auditoría inicial junto con el resto de la arquitectura, antes de construir nada.' },
          },
          {
            '@type': 'Question',
            name: '¿Qué margen de error tiene un reporte generado con IA?',
            acceptedAnswer: { '@type': 'Answer', text: 'Los cálculos y agregaciones se hacen antes de que la IA participe, con lógica determinística (SQL, Python o el orquestador). La IA se usa para interpretar y redactar esos valores ya calculados, no para calcularlos — así se reduce el riesgo de que invente un número.' },
          },
          {
            '@type': 'Question',
            name: '¿Por qué no simplemente pedirle el reporte a ChatGPT o Claude cada semana?',
            acceptedAnswer: { '@type': 'Answer', text: 'Un chat responde bien cuando vos le pegás los datos a mano. El problema es lo que pasa antes: conectarse a las fuentes, limpiar y validar la información, y decidir cuándo disparar el reporte y a quién enviarlo. Eso es justamente lo que resuelve la automatización — el chat es el último paso, no la solución completa.' },
          },
          {
            '@type': 'Question',
            name: '¿Sirve si mis datos están repartidos en varias herramientas?',
            acceptedAnswer: { '@type': 'Answer', text: 'Sí — ese es habitualmente el punto de partida: CRM, planillas, GA4, bases de datos internas. El rol del orquestador es justamente traer esas fuentes a un mismo lugar antes de que la IA entre a interpretar nada.' },
          },
        ],
      },
    ],
  };
}

function getHtml() {
  return `
<div class="crumb-bar"><div class="crumb-bar-inner"><a data-route="/">Inicio</a><span>／</span><a data-route="/services/data-strategy">Data Strategy</a><span>／</span><span>Automatización de Reportes con IA</span></div></div>

<div class="svc-hero"><div class="svc-hero-inner"><div><button class="back-btn" data-route="/services/data-strategy">← Volver a Data Strategy</button><div class="svc-hero-badge" data-animate><svg fill="none" height="12" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="12"><rect height="7" width="7" x="3" y="3"></rect><rect height="7" width="7" x="14" y="3"></rect><rect height="7" width="7" x="3" y="14"></rect><rect height="7" width="7" x="14" y="14"></rect></svg><span>Bonsight Growth</span></div><h1 data-animate data-animate-delay="1">Reportes automáticos con IA, conectados a tus datos reales</h1><a class="btn-primary" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer" data-animate data-animate-delay="2">Agendar llamada</a></div><p class="svc-hero-desc" data-animate data-animate-delay="1">Diseñamos e implementamos pipelines que conectan tus fuentes de datos, las procesan y entregan reportes automáticos por el canal que uses todos los días — sin que nadie tenga que armarlos a mano ni pedírselo a un chat cada semana.</p></div></div>

<div class="svc-body"><div class="svc-grid"><div><div class="eyebrow" data-animate>El problema</div><h2 style="font-family:var(--serif);font-size:1.5rem;font-weight:400;margin-bottom:1.5rem;color:var(--text)">Por qué el reporte semanal sigue costando horas</h2><div class="svc-items-list"><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><polyline points="12 7 12 12 15 15"></polyline></svg></div><div><h4>Armarlo a mano toma horas</h4><p>Exportar de cada fuente, pegar en una planilla, revisar que cuadre y recién ahí escribir el resumen — cada semana, desde cero.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg></div><div><h4>Depende de una sola persona</h4><p>Si esa persona no está, el reporte no sale — o sale distinto, según quién lo arme y qué criterio use ese día.</p></div></div><div class="svc-item" data-animate><div class="svc-item-icon"><svg viewbox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg></div><div><h4>Pedirle un resumen a un chat no alcanza</h4><p>Copiar y pegar datos en ChatGPT o Claude ahorra tiempo de redacción, pero no resuelve la conexión a las fuentes ni el envío automático — sigue siendo trabajo manual con un paso menos.</p></div></div></div></div><div class="outcomes-panel"><h3>Lo que cambia con un pipeline real</h3><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Se arma solo</h4><p>El reporte se genera y se envía en el horario que definas, sin que nadie tenga que acordarse de hacerlo.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Mismo criterio siempre</h4><p>Las reglas de cálculo y las alertas quedan definidas una vez — no dependen de quién esté armando el reporte ese día.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Los números no los inventa la IA</h4><p>Las cifras se calculan antes, de forma determinística — la IA interpreta y redacta, no hace la aritmética.</p></div></div><div class="outcome-item" data-animate><div class="outcome-dot"><svg viewbox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div><h4>Llega donde ya trabajas</h4><p>Slack, email, un PDF ejecutivo — el canal de entrega se adapta a cómo tu equipo consume la información hoy.</p></div></div></div></div></div>

<div class="jc-section">
<div class="jc-header">
<div class="jc-eyebrow">Arquitectura</div>
<h2 class="jc-heading">Cómo se arma el pipeline</h2>
</div>
<div class="jc-grid">
<div class="jc-step" data-animate>
<div class="jc-num-row"><div class="jc-bubble">01</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg></div>
<h4 class="jc-title">Fuentes</h4>
<p class="jc-quote">Conectamos donde ya viven tus datos.</p>
<p class="jc-desc">CRM, planillas, bases de datos, GA4 u otras herramientas — sin migrar nada, sin duplicar procesos existentes.</p>
</div>
<div class="jc-step" data-animate data-animate-delay="1">
<div class="jc-num-row"><div class="jc-bubble">02</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg></div>
<h4 class="jc-title">Orquestación</h4>
<p class="jc-quote">Un flujo decide cuándo y con qué datos.</p>
<p class="jc-desc">El pipeline valida y calcula los valores antes de que la IA participe — acá se define el disparador y la frecuencia.</p>
</div>
<div class="jc-step" data-animate data-animate-delay="2">
<div class="jc-num-row"><div class="jc-bubble">03</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.5-1.5 3.5S13 12 13 13v1"></path><path d="M9 13v-1c0-1-.7-1.5-1.5-2.5S6 7.5 6 6a4 4 0 0 1 4-4"></path><line x1="9" y1="18" x2="15" y2="18"></line><line x1="10" y1="22" x2="14" y2="22"></line></svg></div>
<h4 class="jc-title">Interpretación IA</h4>
<p class="jc-quote">La IA redacta, no calcula.</p>
<p class="jc-desc">Con los valores ya resueltos, el modelo interpreta variaciones y redacta el resumen ejecutivo dentro de un alcance acotado.</p>
</div>
<div class="jc-step" data-animate data-animate-delay="3">
<div class="jc-num-row"><div class="jc-bubble">04</div><div class="jc-trail"></div></div>
<div class="jc-icon"><svg viewbox="0 0 24 24"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg></div>
<h4 class="jc-title">Entrega</h4>
<p class="jc-quote">Llega solo, por el canal correcto.</p>
<p class="jc-desc">Slack, email o un PDF ejecutivo — sin que nadie tenga que acordarse de generarlo ni enviarlo.</p>
</div>
</div>
</div>

<div class="cmp-section"><div class="eyebrow" data-animate>Comparación</div><h2 style="font-family:var(--serif);font-size:1.8rem;font-weight:400;margin-bottom:2rem;color:var(--text)">Reporte manual vs. pipeline automatizado</h2><div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>Criterio</th><th>Armado manual (incluido "pedirle a un chat")</th><th>Pipeline automatizado</th></tr></thead><tbody><tr><th scope="row">Tiempo semanal</th><td>Horas de exportar, pegar y revisar cada vez</td><td class="cmp-good">Minutos de supervisión, una vez configurado</td></tr><tr><th scope="row">Dependencia de una persona</th><td>Alta — si no está, no sale</td><td class="cmp-good">Baja — corre solo, en el horario definido</td></tr><tr><th scope="row">Cálculo de cifras</th><td>Manual o copiado a un chat sin validar</td><td class="cmp-good">Determinístico, antes de que la IA participe</td></tr><tr><th scope="row">Consistencia entre reportes</th><td>Varía según quién lo arme</td><td class="cmp-good">Misma lógica siempre</td></tr><tr><th scope="row">Conexión a las fuentes</th><td>Copiar y pegar a mano</td><td class="cmp-good">Directa, vía orquestador</td></tr></tbody></table></div></div>

<div class="cta-band" data-animate><h2>¿Quieres dejar de armar el reporte a mano?</h2><p>Conversemos sobre qué fuentes tenés hoy y qué pipeline tiene sentido para tu equipo.</p><div class="cta-band-actions"><a class="btn-white" href="https://calendly.com/rafa-bonsight/30min" target="_blank" rel="noopener noreferrer">Agendar llamada →</a><a class="btn-wa-outline" href="https://wa.me/13123509796?text=Hola%2C%20vengo%20del%20sitio%20de%20Bonsight%20y%20quisiera%20hablar%20sobre%20automatizaci%C3%B3n%20de%20reportes%20con%20IA." target="_blank" rel="noopener noreferrer">WhatsApp</a></div></div>

<div class="faq-section"><div class="eyebrow" data-animate>Preguntas frecuentes</div><h2 style="font-family:var(--serif);font-size:1.8rem;font-weight:400;margin-bottom:2rem;color:var(--text)">Dudas antes de empezar</h2><div class="faq-list">
<details class="faq-item"><summary>¿Cuánto cuesta operar esto en tokens y APIs?</summary><p>Depende del volumen de datos, la frecuencia de los reportes y cuántos canales de entrega se necesiten. Lo dimensionamos en la auditoría inicial junto con el resto de la arquitectura, antes de construir nada.</p></details>
<details class="faq-item"><summary>¿Qué margen de error tiene un reporte generado con IA?</summary><p>Los cálculos y agregaciones se hacen antes de que la IA participe, con lógica determinística (SQL, Python o el orquestador). La IA se usa para interpretar y redactar esos valores ya calculados, no para calcularlos — así se reduce el riesgo de que invente un número.</p></details>
<details class="faq-item"><summary>¿Por qué no simplemente pedirle el reporte a ChatGPT o Claude cada semana?</summary><p>Un chat responde bien cuando vos le pegás los datos a mano. El problema es lo que pasa antes: conectarse a las fuentes, limpiar y validar la información, y decidir cuándo disparar el reporte y a quién enviarlo. Eso es justamente lo que resuelve la automatización.</p></details>
<details class="faq-item"><summary>¿Sirve si mis datos están repartidos en varias herramientas?</summary><p>Sí — ese es habitualmente el punto de partida: CRM, planillas, GA4, bases de datos internas. El rol del orquestador es justamente traer esas fuentes a un mismo lugar antes de que la IA entre a interpretar nada.</p></details>
</div></div>

${getFooter('es')}
`;
}

export default async function AutomatizacionReportesAIPage({ params }) {
  const { locale } = await params;
  if (locale !== 'es') notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <RawHtml html={getHtml()} />
    </>
  );
}
