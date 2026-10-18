import { Source_Serif_4, IBM_Plex_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { kaiNextBasePath } from '@/lib/kaiNext/paths';
import { mainSiteUrl } from '@/lib/shared/crossProductLinks';
import { getFooter } from '@/utils/footer';
import RawHtml from '@/components/RawHtml';
import KaiLandingNav from './KaiLandingNav';

const sourceSerif = Source_Serif_4({ subsets: ['latin'], variable: '--font-source-serif' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-ibm-plex-mono' });

export const metadata = {
  title: 'Kai · La inteligencia de tu empresa | Bonsight',
  description: 'Kai conecta lo que tu empresa sabe con lo que ocurre en sus datos, para ayudarte a entender, decidir y actuar.',
  robots: { index: false, follow: false },
};

// Raíz pública de kai.bonsight.co (ver proxy.js) — landing de marketing con el nav y el footer
// reales del sitio (KaiLandingNav mira a components/Navbar.jsx; getFooter es el mismo que usa
// bonsight.co), para que se sienta parte del sitio y no una página aparte. El resto del
// contenido/estilo es propio de esta página (ver sección "Landing de Kai" en kai-next.css,
// clases knxl-*, escopadas bajo .knxl-page para no pisar nada global).
export default async function KaiNextLandingPage() {
  const host = (await headers()).get('host') ?? 'localhost:3000';
  const basePath = kaiNextBasePath(host);
  const footerHtml = getFooter('es', { host });
  const mainSiteBase = mainSiteUrl(host, '');
  const consultaUrl = mainSiteUrl(host, '/es/consulta?src=kai');

  return (
    <div className={`knxl-page ${sourceSerif.variable} ${ibmPlexMono.variable}`}>
      <KaiLandingNav entrarHref={`${basePath}/entrar`} mainSiteBase={mainSiteBase} />

      <main>
        <section className="knxl-hero" aria-labelledby="knxl-t">
          <div className="knxl-wrap">
            <div>
              <span className="knxl-tagbox"><i /> Bonsight · Kai</span>
              <h1 id="knxl-t">La inteligencia de tu empresa, <em>en una conversación.</em></h1>
              <p className="knxl-lead">Kai es la inteligencia que construimos en Bonsight. Conecta lo que tu empresa sabe con lo que ocurre en tus datos, y ayuda a tu equipo a entender, decidir y actuar.</p>

              <div className="knxl-hero-items">
                <div className="knxl-hero-item">
                  <span className="knxl-hero-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg></span>
                  <div><h3>Pregúntale en tus palabras</h3><p>Sobre tus datos, documentos y reuniones.</p></div>
                </div>
                <div className="knxl-hero-item">
                  <span className="knxl-hero-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span>
                  <div><h3>Respuestas con evidencia</h3><p>Cada hallazgo llega con su gráfico y su fuente.</p></div>
                </div>
                <div className="knxl-hero-item">
                  <span className="knxl-hero-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11" /></svg></span>
                  <div><h3>Del hallazgo a la acción</h3><p>Proyectos, tareas y reuniones en el mismo lugar.</p></div>
                </div>
              </div>

              <div className="knxl-ctas">
                <a className="knxl-btn knxl-btn-green" href={consultaUrl}>Conocer Kai →</a>
                <a className="knxl-ctas-link" href={`${basePath}/entrar`}>¿Ya usas Kai? Inicia sesión</a>
              </div>
            </div>
            <figure style={{ margin: 0 }} aria-label="Ejemplo de una conversación con Kai">
              <div className="knxl-product">
                <div className="knxl-q">¿Por qué bajó la producción este mes?</div>
                <div className="knxl-who"><span className="knxl-k">K</span>Kai</div>
                <div className="knxl-trace">Consultó datos operativos · reunión de operaciones</div>
                <p className="knxl-answer">No es demanda, es capacidad. Las unidades de reemplazo cargan <b>un tercio menos</b> por viaje.</p>
                <div className="knxl-bars">
                  <div className="knxl-bar"><span>Flota propia</span><span className="knxl-bar-track"><i style={{ width: '100%', background: '#A8D7BB' }} /></span><b>10 t</b></div>
                  <div className="knxl-bar"><span>Reemplazo</span><span className="knxl-bar-track"><i style={{ width: '67%', background: '#1D5C45' }} /></span><b>6,7 t</b></div>
                </div>
                <div className="knxl-product-foot">
                  <span className="knxl-chip">Datos operativos</span>
                  <span className="knxl-chip">Reunión de operaciones</span>
                  <span className="knxl-act">Crear tarea</span>
                </div>
              </div>
              <figcaption className="knxl-disclaimer">Ejemplo ilustrativo</figcaption>
            </figure>
          </div>
        </section>

        <section className="knxl-light" aria-labelledby="knxl-problema">
          <div className="knxl-wrap">
            <p className="knxl-label">El problema</p>
            <h2 id="knxl-problema">Tu empresa sabe más de lo que puede aprovechar.</h2>
            <p className="knxl-sub">Los datos viven en plataformas. El conocimiento, en documentos. Las decisiones, en reuniones. Los compromisos, en tareas. Y parte del contexto, en la cabeza de las personas.</p>

            <div className="knxl-flow" role="img" aria-label="Datos, documentos, reuniones y tareas entran a Kai, que las conecta con el contexto del negocio y entrega respuestas, evidencia y acciones.">
              <div className="knxl-flow-col">
                <div className="knxl-node"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></i>Datos y métricas</div>
                <div className="knxl-node"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" /><path d="M14 3v5h5" /></svg></i>Documentos y conocimiento</div>
                <div className="knxl-node"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M21 20v-2a4 4 0 0 0-3-3.9" /></svg></i>Reuniones y decisiones</div>
                <div className="knxl-node"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11" /></svg></i>Proyectos y tareas</div>
              </div>
              <svg className="knxl-wires" viewBox="0 0 110 320" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 28 C55 28 55 160 110 160" /><path d="M0 116 C55 116 55 160 110 160" /><path d="M0 204 C55 204 55 160 110 160" /><path d="M0 292 C55 292 55 160 110 160" />
              </svg>
              <span className="knxl-down" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
              <div className="knxl-core"><strong>Kai</strong><span>Contexto de tu negocio</span></div>
              <span className="knxl-down" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M6 13l6 6 6-6" /></svg></span>
              <svg className="knxl-wires" viewBox="0 0 110 320" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 160 C55 160 55 28 110 28" /><path d="M0 160 L110 160" /><path d="M0 160 C55 160 55 292 110 292" />
              </svg>
              <div className="knxl-flow-col">
                <div className="knxl-node knxl-node--out"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i>Respuestas</div>
                <div className="knxl-node knxl-node--out"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i>Evidencia</div>
                <div className="knxl-node knxl-node--out"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></i>Acciones</div>
              </div>
            </div>
            <p className="knxl-flow-caption">Kai no es otra fuente. <span className="knxl-it">Es la capa que las conecta.</span></p>
          </div>
        </section>

        <section className="knxl-light" aria-labelledby="knxl-que" style={{ paddingTop: 0 }}>
          <div className="knxl-wrap">
            <p className="knxl-label">Qué es Kai</p>
            <h2 id="knxl-que">Entiende, cruza y te lleva a actuar.</h2>
            <p className="knxl-sub">No solo encuentra información. Entiende qué significa para tu negocio y la convierte en respuestas con evidencia y siguientes pasos.</p>
            <div className="knxl-split">
              <div className="knxl-list">
                <div className="knxl-item"><span className="knxl-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg></span><div><h3>Pregúntale</h3><p>En tus palabras, sobre tus datos, documentos y reuniones.</p></div></div>
                <div className="knxl-item"><span className="knxl-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" /></svg></span><div><h3>Conoce tu negocio</h3><p>Tus objetivos, tu equipo y tu contexto. Cada conversación parte de ahí.</p></div></div>
                <div className="knxl-item"><span className="knxl-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span><div><h3>Muestra la evidencia</h3><p>Cada hallazgo llega con su gráfico y su fuente.</p></div></div>
                <div className="knxl-item"><span className="knxl-item-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3 8-8" /><path d="M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11" /></svg></span><div><h3>Lleva a la acción</h3><p>Proyectos, tareas y reuniones en el mismo lugar.</p></div></div>
              </div>
              <aside className="knxl-panel" aria-labelledby="knxl-logras">
                <h3 id="knxl-logras">Lo que cambia en tu equipo</h3>
                <div className="knxl-res"><span className="knxl-res-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span><div><b>Respuestas cuando las necesitas</b><span>Sin esperar un reporte ni buscar entre herramientas.</span></div></div>
                <div className="knxl-res"><span className="knxl-res-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span><div><b>Decisiones con evidencia</b><span>Cada conclusión muestra de dónde sale.</span></div></div>
                <div className="knxl-res"><span className="knxl-res-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span><div><b>Contexto que no se pierde</b><span>Lo que se decide en una reunión sigue disponible para todos.</span></div></div>
                <div className="knxl-res"><span className="knxl-res-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span><div><b>Del hallazgo a la acción</b><span>Lo que Kai encuentra se convierte en tareas con responsable.</span></div></div>
              </aside>
            </div>
          </div>
        </section>

        <section className="knxl-light" aria-labelledby="knxl-trabajando" style={{ paddingTop: 0 }}>
          <div className="knxl-wrap">
            <p className="knxl-label">Kai trabajando</p>
            <h2 id="knxl-trabajando">Distintas áreas. El mismo contexto.</h2>
            <div className="knxl-cases">
              <article className="knxl-case"><span className="knxl-case-area">Operaciones</span><h3>¿Por qué bajó la producción este mes?</h3><p>Cruza datos operativos con lo que se decidió en reuniones para explicar qué cambió.</p></article>
              <article className="knxl-case"><span className="knxl-case-area">Marketing</span><h3>¿Qué está frenando la conversión?</h3><p>Analiza las métricas, detecta las señales y las conecta con el contexto del negocio.</p></article>
              <article className="knxl-case"><span className="knxl-case-area">Dirección</span><h3>¿Qué compromisos siguen pendientes?</h3><p>Recupera decisiones de reuniones y las une a proyectos, responsables y siguientes pasos.</p></article>
            </div>
          </div>
        </section>

        <section className="knxl-process" aria-labelledby="knxl-como">
          <div className="knxl-wrap">
            <p className="knxl-label">Cómo empieza</p>
            <h2 id="knxl-como">No llegas solo. Te acompañamos.</h2>
            <p className="knxl-sub">Kai se pone en marcha junto al equipo de Bonsight, de la estrategia a la operación.</p>
            <div className="knxl-steps">
              <div className="knxl-step">
                <div className="knxl-step-num"><b>01</b></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
                <h3>Conexión</h3><p className="knxl-it">Conectamos tus fuentes.</p><p>Datos, documentos y herramientas que ya usas, sin cambiar cómo trabaja tu equipo.</p>
              </div>
              <div className="knxl-step">
                <div className="knxl-step-num"><b>02</b></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /></svg>
                <h3>Aprendizaje</h3><p className="knxl-it">Kai aprende tu negocio.</p><p>Objetivos, prioridades y la forma en que trabaja tu equipo, junto a nosotros.</p>
              </div>
              <div className="knxl-step">
                <div className="knxl-step-num"><b>03</b></div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>
                <h3>Trabajo diario</h3><p className="knxl-it">Kai trabaja con tu equipo.</p><p>Analiza, encuentra oportunidades y convierte respuestas en acciones.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="knxl-cta" aria-labelledby="knxl-cta-h">
          <div className="knxl-wrap">
            <h2 id="knxl-cta-h">¿Quieres ver qué entendería Kai de tu empresa?</h2>
            <p>Tecnología acompañada de criterio. Nuestro equipo conecta tus fuentes, entiende contigo el negocio y acompaña la implementación.</p>
            <div className="knxl-ctas">
              <a className="knxl-btn knxl-btn-white" href={consultaUrl}>Ver Kai con mi empresa →</a>
              <a className="knxl-btn knxl-btn-line" href="https://wa.me/13123509796">WhatsApp</a>
            </div>
            <p className="knxl-cta-small">¿Ya trabajas con Kai? <a href={`${basePath}/entrar`}>Inicia sesión</a></p>
          </div>
        </section>
      </main>

      <RawHtml html={footerHtml} />
    </div>
  );
}
