import { notFound } from 'next/navigation'
import { getProposal } from '@/lib/proposals'
import InvestmentToggle from './InvestmentToggle'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const p = getProposal(slug)
  if (!p) return {}
  return {
    title: `Propuesta · ${p.client} · Bonsight`,
    robots: { index: false, follow: false },
  }
}

const CSS = `
.pr {
  --bg: #0B1020;
  --bg-raise: #10182B;
  --bg-card: #131C33;
  --line: rgba(168,215,187,0.14);
  --deep: #085041;
  --mid: #3F9461;
  --light: #A8D7BB;
  --pale: #9FDBC8;
  --cream: #F4F1EA;
  --cream-dim: rgba(244,241,234,0.62);
  --cream-faint: rgba(244,241,234,0.38);
  position: fixed;
  inset: 0;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg);
  color: var(--cream);
  font-family: 'DM Sans', sans-serif;
  scroll-snap-type: y proximity;
  scroll-behavior: smooth;
}
.pr *, .pr *::before, .pr *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* NAV */
.pr nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 8vw;
  background: rgba(11,16,32,0.72);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--line);
}
.pr .logo { display: flex; align-items: center; gap: 10px; }
.pr .logo span {
  font-family: 'Playfair Display', serif; font-weight: 600; font-size: 1.05rem;
  letter-spacing: 0.06em; color: var(--cream); text-transform: uppercase;
}
.pr nav ul { list-style: none; display: flex; gap: 30px; }
.pr nav a {
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--cream-faint); text-decoration: none;
  transition: color .2s ease;
}
.pr nav a:hover { color: var(--pale); }

/* SECTIONS */
.pr section {
  min-height: 100vh; width: 100%;
  scroll-snap-align: start; scroll-margin-top: 76px;
  position: relative; display: flex; flex-direction: column;
  justify-content: center; padding: 8vh 8vw;
}

/* TYPOGRAPHY */
.pr .eyebrow {
  font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--pale);
  display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
}
.pr .eyebrow::before { content: ''; width: 22px; height: 1px; background: var(--pale); display: inline-block; }
.pr h1, .pr h2, .pr h3 {
  font-family: 'Playfair Display', serif; font-weight: 600;
  line-height: 1.08; letter-spacing: -0.01em;
}
.pr h1 { font-size: clamp(2.4rem, 5.6vw, 4.8rem); }
.pr h2 { font-size: clamp(2rem, 4.2vw, 3.4rem); margin-bottom: 0.6em; }
.pr p { font-size: 1.05rem; line-height: 1.65; color: var(--cream-dim); max-width: 640px; }
.pr .lede { font-size: clamp(1.1rem, 1.6vw, 1.35rem); color: var(--cream-dim); max-width: 680px; }

/* COVER */
.pr #cover {
  background:
    radial-gradient(ellipse 900px 600px at 82% 12%, rgba(63,148,97,0.30), transparent 60%),
    radial-gradient(ellipse 700px 500px at 10% 90%, rgba(8,80,65,0.35), transparent 60%),
    var(--bg);
}
.pr .path-mark {
  position: absolute; right: 6vw; top: 50%; transform: translateY(-50%);
  width: min(38vw, 420px); opacity: 0.9;
}
.pr .cover-foot {
  position: absolute; bottom: 6vh; left: 8vw; right: 8vw;
  display: flex; justify-content: space-between; align-items: flex-end;
  font-family: 'DM Mono', monospace; font-size: 12px; color: var(--cream-faint);
  letter-spacing: 0.05em; border-top: 1px solid var(--line); padding-top: 18px;
}
.pr .brand-tag { display: flex; align-items: center; gap: 8px; color: var(--light); }

/* DESAFÍO */
.pr #desafio { background: var(--bg-raise); }
.pr .stat-row { display: flex; gap: 48px; margin-top: 36px; flex-wrap: wrap; }
.pr .stat { display: flex; flex-direction: column; gap: 4px; }
.pr .stat b { font-family: 'Playfair Display', serif; font-size: 1.7rem; color: var(--pale); font-weight: 700; }
.pr .stat span { font-size: 0.8rem; color: var(--cream-faint); max-width: 200px; }

/* CAPACIDADES */
.pr #capacidades { background: var(--bg); }
.pr .cap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 48px; }
.pr .cap-card {
  background: var(--bg-card); border: 1px solid var(--line); border-radius: 4px;
  padding: 30px 26px; display: flex; flex-direction: column; gap: 12px;
  transition: border-color .25s ease, transform .25s ease;
}
.pr .cap-card:hover { border-color: var(--mid); transform: translateY(-3px); }
.pr .cap-icon { width: 34px; height: 34px; margin-bottom: 4px; }
.pr .cap-card h3 { font-size: 1.4rem; font-weight: 600; color: var(--cream); }
.pr .cap-card p { font-size: 0.94rem; }
.pr .cap-outcome {
  margin-top: auto; padding-top: 14px; border-top: 1px solid var(--line);
  font-size: 0.82rem; color: var(--pale); font-style: italic;
}

/* CAMBIO */
.pr #cambio { background: var(--bg-raise); }
.pr .flow-wrap { margin-top: 44px; display: flex; flex-direction: column; gap: 38px; }
.pr .flow-row { display: flex; flex-direction: column; gap: 14px; }
.pr .flow-label {
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--cream-faint);
}
.pr .flow-row.future .flow-label { color: var(--pale); }
.pr .flow-steps { display: flex; align-items: center; flex-wrap: wrap; gap: 0; }
.pr .flow-step {
  font-size: 0.82rem; padding: 12px 18px; border-radius: 2px;
  white-space: nowrap; font-family: 'DM Sans', sans-serif;
}
.pr .flow-row.now .flow-step {
  background: rgba(244,241,234,0.05); color: var(--cream-faint); border: 1px dashed var(--line);
}
.pr .flow-row.future .flow-step {
  background: rgba(63,148,97,0.14); color: var(--cream); border: 1px solid rgba(63,148,97,0.4);
}
.pr .flow-arrow { color: var(--cream-faint); padding: 0 10px; font-size: 0.9rem; }
.pr .flow-row.future .flow-arrow { color: var(--pale); }
.pr .flow-loop {
  font-family: 'DM Mono', monospace; font-size: 0.72rem; color: var(--pale);
  margin-left: 10px; opacity: 0.85;
}

/* INVERSIÓN */
.pr #inversion { background: var(--bg); }
.pr .invest-grid {
  display: grid; grid-template-columns: 1.1fr 0.9fr;
  gap: 32px; margin-top: 44px; align-items: stretch;
}
.pr .invest-card {
  background: var(--bg-card); border: 1px solid var(--line); border-radius: 4px;
  padding: 36px; display: flex; flex-direction: column;
}
.pr .invest-card.highlight {
  border-color: var(--mid);
  background: linear-gradient(160deg, rgba(63,148,97,0.10), var(--bg-card) 55%);
}
.pr .invest-label {
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--pale); margin-bottom: 10px;
}
.pr .invest-amount {
  font-family: 'Playfair Display', serif; font-weight: 700;
  font-size: clamp(2.1rem, 3vw, 2.8rem); color: var(--cream); margin-bottom: 4px;
}
.pr .invest-amount span { font-size: 0.4em; color: var(--cream-faint); }
.pr .invest-sub { font-size: 0.85rem; color: var(--cream-faint); margin-bottom: 22px; }
.pr .term-toggle { display: flex; gap: 8px; margin-bottom: 18px; }
.pr .term-btn {
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.05em;
  background: transparent; border: 1px solid var(--line); color: var(--cream-faint);
  padding: 8px 14px; border-radius: 20px; cursor: pointer; transition: all .2s ease;
}
.pr .term-btn.active { border-color: var(--mid); color: var(--pale); background: rgba(63,148,97,0.12); }
.pr .term-btn:hover { color: var(--cream); }
.pr .invest-rows { display: flex; flex-direction: column; gap: 0; margin-top: 6px; }
.pr .invest-row {
  padding: 13px 0; border-top: 1px solid var(--line);
  font-size: 0.88rem; color: var(--cream-dim);
}
.pr .invest-row:last-child { border-bottom: 1px solid var(--line); }
.pr .phase-note {
  margin-top: 24px; padding: 16px 18px; background: rgba(159,219,200,0.06);
  border-left: 2px solid var(--pale); font-size: 0.84rem; color: var(--cream-dim);
}

/* SECUNDARIO */
.pr #secundario { background: var(--bg-raise); }
.pr .sec-wrap { display: flex; align-items: stretch; gap: 40px; margin-top: 36px; flex-wrap: wrap; }
.pr .sec-box {
  border: 1px dashed var(--line); border-radius: 4px; padding: 30px 32px;
  max-width: 620px; flex: 1 1 420px; background: var(--bg-card);
}
.pr .sec-box h3 { font-size: 1.3rem; margin-bottom: 10px; color: var(--cream); }
.pr .sec-box ul { margin-top: 16px; padding-left: 18px; }
.pr .sec-box ul li { font-size: 0.9rem; color: var(--cream-dim); margin-bottom: 8px; }
.pr .tag-quote {
  font-family: 'DM Mono', monospace; font-size: 11px; color: var(--pale);
  letter-spacing: 0.08em; text-transform: uppercase; margin-top: 16px; display: inline-block;
}
.pr .sec-illus {
  flex: 0 1 260px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); border-radius: 4px; background: var(--bg-card);
  min-height: 200px; padding: 20px;
}

/* CIERRE */
.pr #cierre {
  background: linear-gradient(160deg, var(--deep) 0%, var(--bg) 65%);
  justify-content: center; align-items: flex-start;
}
.pr .closing-line {
  font-family: 'Playfair Display', serif; font-style: italic; font-weight: 500;
  font-size: clamp(1.5rem, 2.6vw, 2.1rem); color: var(--pale);
  max-width: 760px; margin-top: 22px; line-height: 1.4;
}
.pr .cta-row { display: flex; gap: 18px; margin-top: 40px; flex-wrap: wrap; }
.pr .btn {
  font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 0.92rem;
  padding: 14px 26px; border-radius: 2px; text-decoration: none; letter-spacing: 0.02em;
}
.pr .btn-primary { background: var(--pale); color: var(--deep); }
.pr .btn-ghost { border: 1px solid var(--line); color: var(--cream); }

@media (max-width: 860px) {
  .pr .cap-grid { grid-template-columns: 1fr; }
  .pr .invest-grid { grid-template-columns: 1fr; }
  .pr .path-mark { display: none; }
  .pr section { padding: 10vh 6vw; }
  .pr .flow-step { font-size: 0.72rem; padding: 9px 12px; }
}
@media (max-width: 760px) {
  .pr nav ul { display: none; }
  .pr .sec-illus { display: none; }
}
`

const BonsightLogo = () => (
  <svg width="26" height="21" viewBox="0 0 72 58" fill="none">
    <circle cx="22" cy="38" r="20" fill="#9FDBC8" />
    <circle cx="36" cy="22" r="20" fill="#085041" />
    <circle cx="50" cy="38" r="20" fill="#2EBF8E" />
  </svg>
)

export default async function ProposalPage({ params }) {
  const { slug } = await params
  const proposal = getProposal(slug)
  if (!proposal) notFound()

  const { client, date, contact } = proposal

  return (
    <div className="pr">
      <style>{CSS}</style>

      {/* NAV */}
      <nav>
        <div className="logo">
          <BonsightLogo />
          <span>bonsight</span>
        </div>
        <ul>
          <li><a href="#desafio">Desafío</a></li>
          <li><a href="#capacidades">Capacidades</a></li>
          <li><a href="#cambio">El cambio</a></li>
          <li><a href="#inversion">Inversión</a></li>
          <li><a href="#secundario">Adicional</a></li>
          <li><a href="#cierre">Contacto</a></li>
        </ul>
      </nav>

      {/* COVER */}
      <section id="cover">
        <svg className="path-mark" viewBox="0 0 420 420" fill="none">
          <path d="M40 360 C 120 360, 100 220, 190 210 C 280 200, 260 90, 360 60"
            stroke="#3F9461" strokeWidth="1.5" strokeDasharray="2 10" strokeLinecap="round" />
          <circle cx="40" cy="360" r="4" fill="#9FDBC8" />
          <circle cx="190" cy="210" r="3" fill="#A8D7BB" opacity="0.8" />
          <circle cx="360" cy="60" r="5" fill="#9FDBC8" />
          <circle cx="360" cy="60" r="11" stroke="#3F9461" strokeWidth="1" />
        </svg>
        <div className="eyebrow" style={{ '--before': 'none' }}>
          <BonsightLogo />
          Bonsight · Propuesta estratégica
        </div>
        <h1>Construyendo una<br />capacidad de crecimiento<br />para TopK9.</h1>
        <p className="lede" style={{ marginTop: 28 }}>
          TopK9 tiene una trayectoria sólida y marcas propias. Lo que construimos con esta propuesta
          es la capacidad de generar oportunidades comerciales de forma predecible, medible y escalable.
        </p>
        <div className="cover-foot">
          <span className="brand-tag">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 3c-1 2-3 3-3 6a3 3 0 0 0 6 0c0-3-2-4-3-6z" stroke="#A8D7BB" strokeWidth="1.3" />
              <path d="M6 21c0-4 2.5-7 6-7s6 3 6 7" stroke="#A8D7BB" strokeWidth="1.3" />
            </svg>
            {client}
          </span>
          <span>{date}</span>
        </div>
      </section>

      {/* DESAFÍO */}
      <section id="desafio">
        <div className="eyebrow">01 · El punto de partida</div>
        <h2>El crecimiento depende<br />de cuánto pueda cubrir<br />el equipo en terreno.</h2>
        <p className="lede">
          Cada distribuidor y clínica veterinaria nueva llega porque alguien de tu equipo la visitó, la llamó
          o la conoció en una feria. Es un modelo que funciona, pero tiene un techo: crece al ritmo de las
          personas, no al ritmo del mercado — y hoy es difícil saber en qué punto exacto se enfría
          un distribuidor interesado antes de llegar a una conversación comercial.
        </p>
        <div className="stat-row">
          <div className="stat"><b>Parcial</b><span>visibilidad del embudo de captación mayorista</span></div>
          <div className="stat"><b>Alta</b><span>dependencia del crecimiento en el esfuerzo comercial directo</span></div>
          <div className="stat"><b>Difícil</b><span>identificar en qué paso se pierde un distribuidor interesado</span></div>
        </div>
      </section>

      {/* CAPACIDADES */}
      <section id="capacidades">
        <div className="eyebrow">02 · Qué construimos</div>
        <h2>Tres capacidades,<br />un mismo sistema.</h2>
        <div className="cap-grid">
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="13" stroke="#3F9461" strokeWidth="1.3" />
              <path d="M17 9v8l6 3" stroke="#9FDBC8" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <h3>Motor Comercial Digital</h3>
            <p>Un canal que atrae, filtra y entrega distribuidores calificados a tu equipo comercial, sin que dependa solo de su capacidad de cobertura en terreno.</p>
            <div className="cap-outcome">Más oportunidades entrando, sin más horas de terreno.</div>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 34 34" fill="none">
              <path d="M4 26 L12 16 L18 20 L30 8" stroke="#9FDBC8" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="30" cy="8" r="2.2" fill="#A8D7BB" />
            </svg>
            <h3>Inteligencia Comercial</h3>
            <p>Visibilidad completa de cómo se comportan tus potenciales distribuidores en el sitio: qué revisan, dónde dudan y en qué punto exacto se pierden antes de contactarte.</p>
            <div className="cap-outcome">Saber dónde se pierden las oportunidades, no adivinarlo.</div>
          </div>
          <div className="cap-card">
            <svg className="cap-icon" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="12" stroke="#3F9461" strokeWidth="1.3" />
              <circle cx="17" cy="17" r="6.5" stroke="#9FDBC8" strokeWidth="1.3" />
              <circle cx="17" cy="17" r="1.8" fill="#A8D7BB" />
            </svg>
            <h3>Experiencia que Convierte</h3>
            <p>Rediseño de las pantallas clave del sitio contra referentes del mercado, para que quien llega con intención real de compra no se vaya sin dejar sus datos.</p>
            <div className="cap-outcome">El mismo tráfico, convirtiendo más.</div>
          </div>
        </div>
      </section>

      {/* CAMBIO */}
      <section id="cambio">
        <div className="eyebrow">03 · El cambio</div>
        <h2>De un canal lineal<br />a un sistema que aprende.</h2>
        <div className="flow-wrap">
          <div className="flow-row now">
            <div className="flow-label">Hoy</div>
            <div className="flow-steps">
              <span className="flow-step">Publicidad</span><span className="flow-arrow">→</span>
              <span className="flow-step">Web</span><span className="flow-arrow">→</span>
              <span className="flow-step">Venta manual en terreno</span>
            </div>
          </div>
          <div className="flow-row future">
            <div className="flow-label">Con Bonsight</div>
            <div className="flow-steps">
              <span className="flow-step">Publicidad</span><span className="flow-arrow">→</span>
              <span className="flow-step">Web</span><span className="flow-arrow">→</span>
              <span className="flow-step">Automatización</span><span className="flow-arrow">→</span>
              <span className="flow-step">Lead Scoring</span><span className="flow-arrow">→</span>
              <span className="flow-step">Ventas</span><span className="flow-arrow">→</span>
              <span className="flow-step">CRM</span><span className="flow-arrow">→</span>
              <span className="flow-step">Insights</span>
              <span className="flow-loop">↺ retroalimenta Publicidad y Web</span>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 40, maxWidth: 640 }}>
          Cada ciclo deja información que mejora el siguiente: qué mensajes atraen mejores distribuidores,
          qué contenido los convence y en qué momento el equipo comercial debe intervenir.
        </p>
      </section>

      {/* INVERSIÓN */}
      <section id="inversion">
        <div className="eyebrow">04 · La inversión</div>
        <h2>Setup inicial<br />+ acompañamiento continuo.</h2>
        <div className="invest-grid">
          <div className="invest-card highlight">
            <div className="invest-label">Setup inicial · pago único</div>
            <div className="invest-amount">$3.143.000 CLP</div>
            <div className="invest-sub">Base técnica y estratégica — se ejecuta una vez</div>
            <div className="invest-rows">
              <div className="invest-row">Inteligencia Comercial — medición avanzada del embudo</div>
              <div className="invest-row">Experiencia que Convierte — diagnóstico + rediseño</div>
              <div className="invest-row">Motor Comercial — auditoría y plan estratégico</div>
            </div>
            <div className="phase-note">
              Los tres quick wins de mayor impacto primero: saber qué está pasando, arreglar dónde se pierde
              la conversión, y trazar el plan que ordena todo lo que sigue.
            </div>
          </div>
          <InvestmentToggle />
        </div>
      </section>

      {/* SECUNDARIO */}
      <section id="secundario">
        <div className="eyebrow">05 · Adicional</div>
        <h2>CRM + gestión<br />de MercadoLibre.</h2>
        <div className="sec-wrap">
          <div className="sec-box">
            <h3>Vía partner especializado</h3>
            <p>
              Como complemento al Motor Comercial Digital, podemos coordinar la implementación de un CRM
              para tu equipo comercial y la gestión operativa de tu canal en MercadoLibre, a través de un
              partner especializado de Bonsight.
            </p>
            <ul>
              <li>¿Qué tan estructurado está hoy el seguimiento comercial de los distribuidores?</li>
              <li>¿MercadoLibre es hoy un canal activo de venta o recién se está evaluando?</li>
              <li>¿Buscan que el partner gestione el canal día a día, o solo la puesta en marcha?</li>
            </ul>
            <span className="tag-quote">Alcance y cotización a definir en detalle</span>
          </div>
          <div className="sec-illus">
            <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
              <rect x="10" y="20" width="70" height="90" rx="4" stroke="#3F9461" strokeWidth="1.3" />
              <circle cx="45" cy="45" r="10" stroke="#9FDBC8" strokeWidth="1.3" />
              <path d="M28 90 c4-14 30-14 34 0" stroke="#9FDBC8" strokeWidth="1.3" />
              <line x1="10" y1="20" x2="80" y2="20" stroke="#3F9461" strokeWidth="1.3" />
              <path d="M100 100 L130 60 L160 100 L145 100 L145 130 L115 130 L115 100 Z"
                stroke="#A8D7BB" strokeWidth="1.3" strokeLinejoin="round" />
              <line x1="90" y1="140" x2="170" y2="140" stroke="#3F9461" strokeWidth="1" strokeDasharray="2 6" />
            </svg>
          </div>
        </div>
      </section>

      {/* CIERRE */}
      <section id="cierre">
        <div className="eyebrow" style={{ '--before': 'none' }}>
          <BonsightLogo />
          Bonsight · wearebonsight.co
        </div>
        <h2>Entender.<br />Analizar. Decidir.</h2>
        <p className="closing-line">
          "No buscamos hacer más marketing. Buscamos construir una capacidad de crecimiento para TopK9."
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href={`mailto:${contact.email}`}>Escribir a {contact.email}</a>
          <a className="btn btn-ghost" href={`https://wa.me/${contact.whatsapp}`}>Coordinar por WhatsApp</a>
        </div>
      </section>
    </div>
  )
}
