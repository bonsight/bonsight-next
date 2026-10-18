'use client';

import { useState } from 'react';
import BookingPanel from '../../[locale]/consulta/BookingPanel';

const WA_NUMBER = '13123509796';

// Copy comercial por fuente — preguntas de ejemplo para "qué vas a poder preguntarle a Kai" y
// qué necesitamos de acceso. `database` acá es la fachada de lib/aria/databases.js (ver
// KaiNextFuentes.jsx), no un conector propio.
const SOURCE_COPY = {
  ga4: {
    questions: ['¿Qué canal trae más conversiones?', '¿Dónde se cae el funnel?'],
    needs: 'Acceso de lectura (Viewer) a la propiedad de GA4.',
  },
  search_console: {
    questions: ['¿Qué keywords traen más clics?', '¿Dónde perdemos posiciones en Google?'],
    needs: 'Acceso de lectura a la propiedad de Search Console.',
  },
  google_ads: {
    questions: ['¿Qué campaña tiene mejor ROAS?', '¿Dónde conviene mover presupuesto?'],
    needs: 'La cuenta vinculada como cliente al Manager Account de Bonsight.',
  },
  database: {
    questions: ['¿Cómo viene la venta de este mes vs el anterior?', '¿Qué productos se están quedando sin stock?'],
    needs: 'Acceso de lectura (read-only) a la base — lo vemos juntos en la llamada.',
  },
  drive: {
    questions: ['¿Qué dice este documento?', '¿Qué cambió en la última versión del contrato?'],
    needs: 'Compartir la carpeta de Drive (solo lectura) con nuestra cuenta de servicio.',
  },
};

// Dos modos: fuente única (`source`) o bundle del banner (`sources`, con checklist marcable).
// El paso "booking" reusa el mismo BookingPanel del Advisor (ver app/[locale]/consulta/) con
// duración de 15 min y un resumen fijo en vez de resumir una conversación que no existe acá.
export default function KaiNextSourceConnectModal({ tenant, tenantName, userName, userEmail, source, sources, onClose }) {
  const isBundle = Array.isArray(sources);
  const list = isBundle ? sources : [source];
  const [checked, setChecked] = useState(() => Object.fromEntries(list.map((s) => [s.id, true])));
  const [step, setStep] = useState('info');

  const selected = list.filter((s) => !isBundle || checked[s.id]);
  const label = isBundle ? null : source.label;

  const title = isBundle ? 'Completar tus fuentes con Bonsight' : `Conectar ${label}`;
  const waText = encodeURIComponent(
    isBundle
      ? `Hola, quiero conectar ${selected.map((s) => s.label).join(', ')} en Kai para ${tenantName}.`
      : `Hola, quiero conectar ${label} en Kai para ${tenantName}.`
  );
  const purpose = isBundle ? 'Completar fuentes de datos' : `Conectar ${label}`;
  const fixedSummary = isBundle
    ? `Quiere conectar ${selected.map((s) => s.label).join(', ')} para ${tenantName}.`
    : `Quiere conectar ${label} para ${tenantName}.`;

  const toggle = (id) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const questions = [...new Set(selected.flatMap((s) => SOURCE_COPY[s.id]?.questions ?? []))].slice(0, 4);

  if (step === 'booking') {
    return (
      <div className="knx-meetings-modal-backdrop" onClick={onClose}>
        <div className="knx-source-modal knx-source-modal--booking" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="knx-side-panel-close knx-source-modal-close" aria-label="Cerrar" onClick={onClose}>×</button>
          <BookingPanel
            messages={[]}
            locale="es"
            duration={15}
            purpose={purpose}
            prefill={{ name: userName || '', email: userEmail || '', company: tenantName }}
            fixedSummary={fixedSummary}
            title="Agenda tu llamada con Bonsight"
            lead="15 minutos para dejar esto conectado."
            hostNote="15 min · Google Meet"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="knx-meetings-modal-backdrop" onClick={onClose}>
      <div className="knx-source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="knx-source-modal-head">
          <h2>{title}</h2>
          <button type="button" className="knx-side-panel-close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <p className="knx-source-modal-sub">
          {isBundle ? 'Las cotizamos juntas en una sola llamada.' : 'Lo configura el equipo de Bonsight.'}
        </p>

        {isBundle && (
          <div className="knx-source-modal-checklist">
            {list.map((s) => (
              <label key={s.id} className="knx-source-modal-check-row">
                <input type="checkbox" checked={!!checked[s.id]} onChange={() => toggle(s.id)} />
                {s.label}
              </label>
            ))}
          </div>
        )}

        <div className="knx-source-modal-block">
          <h3>Qué vas a poder preguntarle a Kai</h3>
          <div className="knx-source-modal-pills">
            {questions.map((q) => <span key={q} className="knx-source-modal-pill">{q}</span>)}
          </div>
        </div>

        <div className="knx-source-modal-block">
          <h3>Qué necesitamos de ti</h3>
          <ul className="knx-source-modal-needs">
            {selected.map((s) => <li key={s.id}>{SOURCE_COPY[s.id]?.needs ?? ''}</li>)}
          </ul>
        </div>

        <p className="knx-source-modal-cost">
          Tiene un costo según el alcance. Te lo explicamos en una llamada corta, sin compromiso. Nada se cobra hasta que lo apruebes.
        </p>

        <div className="knx-source-modal-actions">
          <a className="knx-source-modal-btn knx-source-modal-btn--line" href={`https://wa.me/${WA_NUMBER}?text=${waText}`} target="_blank" rel="noopener noreferrer">
            Escribir por WhatsApp
          </a>
          <button type="button" className="knx-source-modal-btn knx-source-modal-btn--ghost" onClick={onClose}>Ahora no</button>
          <button type="button" className="knx-source-modal-btn knx-source-modal-btn--green" disabled={isBundle && selected.length === 0} onClick={() => setStep('booking')}>
            Agendar llamada de 15 min
          </button>
        </div>
      </div>
    </div>
  );
}
