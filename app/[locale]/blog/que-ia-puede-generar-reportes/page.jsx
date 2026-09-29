import { notFound } from 'next/navigation';
import RawHtml from '@/components/RawHtml';
import { getFooter } from '@/utils/footer';

const BASE = 'https://bonsight.co';
const PATH = '/blog/que-ia-puede-generar-reportes';

const TITLE = '¿Qué IA puede generar reportes?';
const DESCRIPTION = 'Qué pueden y no pueden hacer los distintos tipos de IA al generar reportes, y la diferencia real entre pedirle un resumen a un chat y una automatización conectada a tus datos.';

export async function generateMetadata() {
  const url = `${BASE}/es${PATH}`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    openGraph: {
      title: `${TITLE} | Bonsight`,
      description: DESCRIPTION,
      url,
      type: 'article',
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
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE}/es/blog` },
          { '@type': 'ListItem', position: 3, name: TITLE, item: url },
        ],
      },
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: TITLE,
        description: DESCRIPTION,
        url,
        author: { '@id': `${BASE}/#organization` },
        publisher: { '@id': `${BASE}/#organization` },
        inLanguage: 'es',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: '¿Alguna IA puede conectarse sola a mis fuentes de datos y armar el reporte?',
            acceptedAnswer: { '@type': 'Answer', text: 'Un modelo de lenguaje por sí solo no se conecta a tus sistemas — necesita algo que le entregue los datos ya extraídos. Eso lo resuelve la capa de orquestación (n8n, un script propio, etc.), no el modelo de IA.' },
          },
          {
            '@type': 'Question',
            name: '¿La IA puede equivocarse al calcular una métrica?',
            acceptedAnswer: { '@type': 'Answer', text: 'Sí, si le pedís que haga la aritmética. Por eso en una automatización real los cálculos se hacen antes, de forma determinística, y la IA solo interpreta y redacta el resultado ya calculado.' },
          },
          {
            '@type': 'Question',
            name: '¿Cuál es la diferencia entre esto y usar directamente ChatGPT o Claude?',
            acceptedAnswer: { '@type': 'Answer', text: 'Ninguna en la parte de redacción — la diferencia está en todo lo anterior: la conexión a las fuentes, la validación de los datos y el disparo automático. Un chat no hace nada de eso solo.' },
          },
        ],
      },
    ],
  };
}

function getHtml() {
  return `
<div class="crumb-bar"><div class="crumb-bar-inner"><a data-route="/">Inicio</a><span>／</span><span>Blog</span><span>／</span><span>¿Qué IA puede generar reportes?</span></div></div>

<div class="article-hero"><div class="article-hero-inner"><div class="article-meta">IA · Automatización de datos</div><h1>¿Qué IA puede generar reportes (y qué no)?</h1><p class="article-hero-desc">Casi cualquier modelo de lenguaje puede redactar un reporte si le pegás los datos a mano. La pregunta que importa es otra: qué parte del trabajo sigue siendo tuya después de eso.</p></div></div>

<div class="article-body">

<p>Si le pedís a ChatGPT, Claude o Gemini que "arme un reporte de ventas", los tres van a poder hacerlo — siempre que vos les pegues los números. Eso no es automatización de reportes, es redacción asistida. La diferencia importa porque define cuánto trabajo manual te sigue quedando cada semana.</p>

<p>Este artículo cubre qué puede y qué no puede hacer una IA en este proceso, y en qué punto exacto empieza a valer la pena construir algo más que un prompt. No es sobre atribución publicitaria ni tracking — es específicamente sobre reportes internos: ventas, operaciones, finanzas, marketing.</p>

<h2>El enfoque ingenuo vs. el pipeline real</h2>
<p>Hay dos formas muy distintas de usar IA para esto, y se confunden seguido:</p>

<div class="cmp-table-wrap"><table class="cmp-table"><thead><tr><th>Criterio</th><th>Chat + copiar datos a mano</th><th>Pipeline de automatización</th></tr></thead><tbody><tr><th scope="row">Quién trae los datos</th><td>Vos, exportando de cada fuente</td><td class="cmp-good">Un conector u orquestador, automático</td></tr><tr><th scope="row">Quién calcula las métricas</th><td>El chat, si se lo pedís (riesgo de error)</td><td class="cmp-good">Lógica determinística, antes de la IA</td></tr><tr><th scope="row">Frecuencia</th><td>Cuando alguien se acuerde de hacerlo</td><td class="cmp-good">Programada — diaria, semanal, etc.</td></tr><tr><th scope="row">Entrega</th><td>Copiar y pegar el resultado</td><td class="cmp-good">Directo a Slack, email o PDF</td></tr></tbody></table></div>

<p class="article-callout">La IA no debería ser responsable de calcular una métrica que se puede calcular de forma determinística antes. Pedirle a un modelo que sume, promedie o compare cifras agrega un punto de falla evitable — el cálculo va en el paso anterior, la IA interpreta el resultado.</p>

<h2>Arquitectura de una automatización real</h2>
<p>Un pipeline de reportes con IA tiene cuatro capas, y entender dónde termina cada una es lo que evita que la IA termine haciendo trabajo que no le corresponde:</p>

<div class="pipeline-diagram"><span>Fuentes</span><em>→</em><span>Orquestador</span><em>→</em><span>IA</span><em>→</em><span>Entrega</span></div>

<h3>1. Fuentes e ingesta</h3>
<p>El punto de partida son los sistemas donde ya vive la información — CRM, base de datos, planillas, GA4. Acá el trabajo es de saneamiento: validar que los datos que van a entrar al reporte sean confiables, no darlos por buenos sin revisar.</p>

<h3>2. Orquestación</h3>
<p>Una herramienta como n8n (o un script propio en Python) conecta las fuentes, define cuándo se dispara el reporte y pasa los datos ya estructurados al siguiente paso. Esta capa es la que reemplaza el "acordarse de hacerlo" — corre sola, en el horario que definiste.</p>

<h3>3. Inferencia con IA</h3>
<p>Acá es donde entra el modelo de lenguaje — pero con un rol acotado: interpretar valores que ya fueron calculados y redactar el resumen. No se le pide que sume una columna ni que calcule un porcentaje; se le entrega el número y se le pide que explique qué significa.</p>

<h3>4. Entrega</h3>
<p>El resultado final sale por el canal donde tu equipo ya trabaja — un mensaje de Slack, un email, un PDF ejecutivo. El formato de salida se define según quién lo va a leer y qué necesita decidir con eso.</p>

<h2>Un ejemplo acotado: alertas por umbral</h2>
<p>Una automatización simple pero real es una alerta condicional — el pipeline calcula la variación de una métrica y solo genera contenido (y notifica) cuando cruza un límite definido:</p>

<div class="code-snippet"><pre><span class="cs-comment"># calculado antes, fuera de la IA</span>
variacion = (valor_actual - valor_anterior) / valor_anterior

<span class="cs-key">if</span> variacion &gt; UMBRAL_ALERTA:
    <span class="cs-comment"># acá recién entra la IA — a redactar el aviso,</span>
    <span class="cs-comment"># no a calcular "variacion"</span>
    generar_alerta(metrica, variacion)</pre></div>

<p>El umbral (<code>UMBRAL_ALERTA</code>) lo define el negocio, no la IA. Este patrón es la base de la mayoría de los reportes de excepción: no reportar todo, solo lo que se salió de rango.</p>

<h2>Cuándo esto deja de ser un experimento de fin de semana</h2>
<p>Armar un flujo simple en n8n o un script propio para un solo reporte es perfectamente viable de hacerlo uno mismo. La automatización casera empieza a mostrar grietas cuando aparece alguna de estas señales:</p>
<ul>
<li>Más de una fuente de datos que hay que cruzar, y cada una cambia de formato sin avisar.</li>
<li>Nadie más en el equipo entiende cómo está armado el flujo si la persona que lo hizo no está.</li>
<li>Los reportes empiezan a fallar silenciosamente — nadie nota que dejaron de llegar hasta que alguien pregunta.</li>
</ul>
<p>En ese punto, lo que hace falta no es más IA — es arquitectura: fuentes bien conectadas, cálculos confiables y un proceso que no dependa de una sola persona. Es exactamente lo que armamos en <a data-route="/servicios/automatizacion-reportes-ai">automatización de reportes con IA</a>.</p>

<div class="faq-section" style="padding-left:0;padding-right:0;max-width:none"><h2 style="margin-top:0">Preguntas frecuentes</h2><div class="faq-list">
<details class="faq-item"><summary>¿Alguna IA puede conectarse sola a mis fuentes de datos y armar el reporte?</summary><p>Un modelo de lenguaje por sí solo no se conecta a tus sistemas — necesita algo que le entregue los datos ya extraídos. Eso lo resuelve la capa de orquestación (n8n, un script propio, etc.), no el modelo de IA.</p></details>
<details class="faq-item"><summary>¿La IA puede equivocarse al calcular una métrica?</summary><p>Sí, si le pedís que haga la aritmética. Por eso en una automatización real los cálculos se hacen antes, de forma determinística, y la IA solo interpreta y redacta el resultado ya calculado.</p></details>
<details class="faq-item"><summary>¿Cuál es la diferencia entre esto y usar directamente ChatGPT o Claude?</summary><p>Ninguna en la parte de redacción — la diferencia está en todo lo anterior: la conexión a las fuentes, la validación de los datos y el disparo automático. Un chat no hace nada de eso solo.</p></details>
</div></div>

</div>

<div class="related-section"><div class="related-inner"><div class="eyebrow" data-animate>Seguir leyendo</div><h2 style="font-family:var(--serif);font-size:1.6rem;font-weight:400;color:var(--text)">Contenido relacionado</h2><div class="related-grid">
<div class="svc-card" data-route="/servicios/automatizacion-reportes-ai"><div class="svc-card-tag">Servicio</div><h3>Automatización de Reportes con IA</h3><p>Cómo diseñamos e implementamos el pipeline completo, de las fuentes a la entrega.</p><div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div></div>
<div class="svc-card" data-route="/services/data-strategy"><div class="svc-card-tag">Servicio</div><h3>Data Strategy</h3><p>Auditoría, arquitectura y gobierno de datos — la base sobre la que se construye cualquier automatización.</p><div class="svc-card-link"><svg fill="none" height="14" stroke="currentColor" stroke-width="2" viewbox="0 0 24 24" width="14"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>Ver servicio</div></div>
</div></div></div>

${getFooter('es')}
`;
}

export default async function QueIAPuedeGenerarReportesPage({ params }) {
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
